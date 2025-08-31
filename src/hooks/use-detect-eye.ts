import { FaceMesh } from "@mediapipe/face_mesh";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

// ===== Types và Helper Functions =====
type Vec3 = { x: number; y: number; z?: number };

function ema(prev: number, next: number, alpha = 0.3) {
    return prev + alpha * (next - prev);
}

function norm(val: number, center: number, halfSpan: number) {
    if (halfSpan <= 1e-6) return 0;
    return (val - center) / halfSpan; // ~ [-1, 1]
}

function eyeGaze(iris: Vec3, inner: Vec3, outer: Vec3, upper: Vec3, lower: Vec3) {
    const cx = (inner.x + outer.x) / 2;
    const cy = (upper.y + lower.y) / 2;
    const halfW = Math.abs(inner.x - outer.x) / 2;
    const halfH = Math.abs(upper.y - lower.y) / 2;
    const gx = norm(iris.x, cx, halfW); // trái âm / phải dương
    const gy = norm(iris.y, cy, halfH); // lên âm / xuống dương
    return { gx, gy };
}

function deg(rad: number) {
    return (rad * 180) / Math.PI;
}

export default function useDetectEye(isExamMode = false) {
    const [isLookingAtScreen, setIsLookingAtScreen] = useState(true);
    const [lastDetectionResult, setLastDetectionResult] = useState(true);
    const canvas = useRef<HTMLCanvasElement>(document.createElement("canvas"));
    const requestRef = useRef<number>();
    const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isDetecting = useRef(false);
    const lostFrames = useRef(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const currentExamMode = useRef(isExamMode); // Track current mode
    const localVideoRef = useSelector((state: any) => state.video.localVideoRef);
    const faceMeshDetectorRef = useRef<FaceMesh | null>(null);

    useEffect(() => {
        if (!localVideoRef) {
            return;
        }

        const video = localVideoRef;
        if (!video.srcObject) {
            return;
        }

        const videoTracks = (video.srcObject as MediaStream)?.getVideoTracks()[0];
        if (!videoTracks) {
            setHasCamera(false);
            return;
        }

        setHasCamera(true);

        setIsInitialized(true);

        try {
            const faceMeshDetector = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
            });

            faceMeshDetector.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            faceMeshDetectorRef.current = faceMeshDetector;

            // ===== Smoothing state =====
            const smooth = {
                gazeX: 0,
                gazeY: 0,
                yaw: 0,
                pitch: 0,
                violationFrames: 0,
            };

            faceMeshDetector.onResults((results) => {
                if (!isDetecting.current) return;

                const lm = results.multiFaceLandmarks?.[0];
                if (!lm) {
                    lostFrames.current++;
                    if (lostFrames.current > 5) {
                        setLastDetectionResult(false);
                        setIsLookingAtScreen(false);
                    }
                    return;
                }

                // Landmarks dùng:
                const L_IN = lm[133],
                    L_OUT = lm[33],
                    L_UP = lm[159],
                    L_DN = lm[145];
                const R_IN = lm[362],
                    R_OUT = lm[263],
                    R_UP = lm[386],
                    R_DN = lm[374];
                const L_IRIS = lm[468],
                    R_IRIS = lm[473];
                const NOSE = lm[1],
                    CHIN = lm[152];
                const EYES_MID = {
                    x: (L_IN.x + R_IN.x + L_OUT.x + R_OUT.x) / 4,
                    y: (L_IN.y + R_IN.y + L_OUT.y + R_OUT.y) / 4,
                };

                // Gaze per-eye
                const gL = eyeGaze(L_IRIS, L_IN, L_OUT, L_UP, L_DN);
                const gR = eyeGaze(R_IRIS, R_IN, R_OUT, R_UP, R_DN);
                const gazeX = (gL.gx + gR.gx) / 2; // [-1..1]
                const gazeY = (gL.gy + gR.gy) / 2; // [-1..1]

                // Head pose cải thiện: tính toán chính xác hơn
                const faceW = Math.max(1e-6, Math.abs(R_OUT.x - L_OUT.x));
                const faceH = Math.max(1e-6, Math.abs(CHIN.y - EYES_MID.y));
                const yawRad = Math.atan2(NOSE.x - EYES_MID.x, faceW * 0.5); // Normalize by face width
                const pitchRad = Math.atan2(NOSE.y - EYES_MID.y, faceH * 0.5); // Nose relative to eyes
                const yaw = deg(yawRad);
                const pitch = deg(pitchRad);

                // Smoothing
                smooth.gazeX = ema(smooth.gazeX, gazeX, 0.25);
                smooth.gazeY = ema(smooth.gazeY, gazeY, 0.25);
                smooth.yaw = ema(smooth.yaw, yaw, 0.25);
                smooth.pitch = ema(smooth.pitch, pitch, 0.25);

                // Ngưỡng chống gian lận (tùy camera, hãy tinh chỉnh):
                const OFF_X = 0.65; // lệch mắt sang ngang
                const DOWN_Y = 0.6; // mắt nhìn xuống
                const YAW_DEG = 18; // quay đầu mạnh
                const PITCH_DEG = 12; // cúi đầu

                const offScreen = Math.abs(smooth.gazeX) > OFF_X || Math.abs(smooth.yaw) > YAW_DEG;

                const lookingDown = smooth.gazeY > DOWN_Y || smooth.pitch > PITCH_DEG;

                const violation = offScreen || lookingDown;

                if (violation) {
                    smooth.violationFrames++;
                } else {
                    smooth.violationFrames = Math.max(0, smooth.violationFrames - 1); // hysteresis
                }

                // Yêu cầu vi phạm liên tục ~0.8s @15fps ~ 12 frames
                if (smooth.violationFrames >= 12) {
                    lostFrames.current = 0;
                    setLastDetectionResult(false); // không nhìn màn hình
                    setIsLookingAtScreen(false); // Update real-time
                } else {
                    // nếu không vi phạm liên tục, coi như OK
                    lostFrames.current = 0;
                    setLastDetectionResult(true);
                    setIsLookingAtScreen(true); // Update real-time
                }
            });

            // Function detection loop
            async function detectLoop() {
                if (!video || video.readyState !== 4 || !isDetecting.current) {
                    if (isDetecting.current) {
                        requestRef.current = requestAnimationFrame(detectLoop);
                    }
                    return;
                }

                const canvasEl = canvas.current;
                canvasEl.width = video.videoWidth;
                canvasEl.height = video.videoHeight;
                const ctx = canvasEl.getContext("2d");
                if (ctx && faceMeshDetectorRef.current) {
                    ctx.drawImage(video, 0, 0, canvasEl.width, canvasEl.height);
                    await faceMeshDetectorRef.current.send({ image: canvasEl });
                }

                if (isDetecting.current) {
                    requestRef.current = requestAnimationFrame(detectLoop);
                }
            }

            // Function to start detection - simplified for continuous mode
            const startDetection = () => {
                if (isDetecting.current) {
                    // đã chạy rồi, khỏi start lại
                    return;
                }
                isDetecting.current = true;
                lostFrames.current = 0;
                detectLoop();

                // No timeout - let the new detection logic handle everything
                console.log("Eye detection started with advanced gaze tracking");
            };

            // Function to update detection interval based on mode
            const updateDetectionInterval = (examMode: boolean) => {
                // Clear existing interval
                if (detectionIntervalRef.current) {
                    clearInterval(detectionIntervalRef.current);
                    detectionIntervalRef.current = null;
                }

                // Set new interval based on mode
                const detectionInterval = examMode ? 6000 : 18000;
                console.log(`[EyeDetection] Switching to ${examMode ? "EXAM" : "NORMAL"} mode (${detectionInterval}ms interval)`);

                detectionIntervalRef.current = setInterval(() => {
                    console.log(`Starting eye detection cycle... (${examMode ? "EXAM" : "NORMAL"} mode)`);
                    startDetection();
                }, detectionInterval);

                currentExamMode.current = examMode;
            };

            // Initial setup
            updateDetectionInterval(isExamMode);

            // Run detection immediately on init
            startDetection();

            // Return cleanup and update function
            const cleanup = () => {
                // Clean up intervals và timeouts
                if (detectionIntervalRef.current) {
                    clearInterval(detectionIntervalRef.current);
                    detectionIntervalRef.current = null;
                }

                if (detectionTimeoutRef.current) {
                    clearTimeout(detectionTimeoutRef.current);
                    detectionTimeoutRef.current = null;
                }

                // Dừng detection loop
                isDetecting.current = false;
                if (requestRef.current) {
                    cancelAnimationFrame(requestRef.current);
                    requestRef.current = undefined;
                }

                // Clean up FaceMesh detector
                if (faceMeshDetectorRef.current) {
                    // @ts-ignore
                    if (typeof faceMeshDetectorRef.current.close === "function") {
                        // mediapipe có close() để giải phóng worker/wasm
                        (faceMeshDetectorRef.current as any).close();
                    }
                    faceMeshDetectorRef.current = null;
                }
            };

            // Expose update function for external mode changes
            (window as any).__updateEyeDetectionMode = updateDetectionInterval;

            return cleanup;
        } catch (error) {
            console.error("Error initializing FaceMesh:", error);
            setHasCamera(false);
            setIsInitialized(false);
        }

        return () => {
            // Clean up intervals và timeouts
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }

            if (detectionTimeoutRef.current) {
                clearTimeout(detectionTimeoutRef.current);
                detectionTimeoutRef.current = null;
            }

            // Dừng detection loop
            isDetecting.current = false;
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = undefined;
            }

            // Clean up FaceMesh detector
            if (faceMeshDetectorRef.current) {
                faceMeshDetectorRef.current = null;
            }
        };
    }, [localVideoRef]); // Remove isExamMode from dependency

    // Separate effect to handle exam mode changes without reinitializing
    useEffect(() => {
        if (isInitialized && currentExamMode.current !== isExamMode) {
            console.log(`[EyeDetection] Mode change detected: ${currentExamMode.current} → ${isExamMode}`);

            // Use the exposed global function to update mode
            if ((window as any).__updateEyeDetectionMode) {
                (window as any).__updateEyeDetectionMode(isExamMode);
            }
        }
    }, [isExamMode, isInitialized]);

    return {
        isLookingAtScreen,
        isInitialized,
        hasCamera,
    };
}
