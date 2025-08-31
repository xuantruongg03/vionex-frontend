import { FaceMesh } from "@mediapipe/face_mesh";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

export default function useDetectEye(isExamMode = false) {
    const [isLookingAtScreen, setIsLookingAtScreen] = useState(true);
    const [lastDetectionResult, setLastDetectionResult] = useState(true);
    const canvas = useRef<HTMLCanvasElement>(document.createElement("canvas"));
    const requestRef = useRef<number>();
    const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isDetecting = useRef(false);
    const lostFrames = useRef(0);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const currentExamMode = useRef(isExamMode); // Track current mode
    const localVideoRef = useSelector(
        (state: any) => state.video.localVideoRef
    );
    const faceMeshDetectorRef = useRef<FaceMesh | null>(null);

    useEffect(() => {
        if (!localVideoRef) {
            return;
        }

        const video = localVideoRef;
        if (!video.srcObject) {
            return;
        }

        const videoTracks = (
            video.srcObject as MediaStream
        )?.getVideoTracks()[0];
        if (!videoTracks) {
            setHasCamera(false);
            return;
        }

        setHasCamera(true);

        setIsInitialized(true);

        try {
            const faceMeshDetector = new FaceMesh({
                locateFile: (file) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
            });

            faceMeshDetector.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            faceMeshDetectorRef.current = faceMeshDetector;

            faceMeshDetector.onResults((results) => {
                // Just update the result if we are detecting
                if (!isDetecting.current) return;

                if (results.multiFaceLandmarks?.[0]) {
                    const landmarks = results.multiFaceLandmarks[0];

                    const leftEye = landmarks[159];
                    const rightEye = landmarks[386];
                    const nose = landmarks[1];

                    const avgEyeY = (leftEye.y + rightEye.y) / 2;
                    const avgEyeX = (leftEye.x + rightEye.x) / 2;

                    const isVerticallyCentered =
                        Math.abs(avgEyeY - nose.y) < 0.03;
                    const isHorizontallyCentered =
                        Math.abs(avgEyeX - nose.x) < 0.03;
                    const isCentered =
                        isVerticallyCentered && isHorizontallyCentered;

                    if (isCentered) {
                        lostFrames.current = 0;
                        setLastDetectionResult(true);
                    } else {
                        lostFrames.current++;
                        if (lostFrames.current > 3)
                            setLastDetectionResult(false);
                    }
                } else {
                    lostFrames.current++;
                    if (lostFrames.current > 3) setLastDetectionResult(false);
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

            // Function to start detection in 3 seconds
            const startDetection = () => {
                isDetecting.current = true;
                lostFrames.current = 0;
                detectLoop();

                // Stop detection after 3 seconds and save the result
                detectionTimeoutRef.current = setTimeout(() => {
                    isDetecting.current = false;
                    if (requestRef.current) {
                        cancelAnimationFrame(requestRef.current);
                        requestRef.current = undefined;
                    }

                    // Update the result
                    setIsLookingAtScreen(lastDetectionResult);
                    console.log(
                        "Eye detection completed, result:",
                        lastDetectionResult
                    );
                }, 3000);
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
                console.log(
                    `[EyeDetection] Switching to ${
                        examMode ? "EXAM" : "NORMAL"
                    } mode (${detectionInterval}ms interval)`
                );

                detectionIntervalRef.current = setInterval(() => {
                    console.log(
                        `Starting eye detection cycle... (${
                            examMode ? "EXAM" : "NORMAL"
                        } mode)`
                    );
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
            console.log(
                `[EyeDetection] Mode change detected: ${currentExamMode.current} → ${isExamMode}`
            );

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
