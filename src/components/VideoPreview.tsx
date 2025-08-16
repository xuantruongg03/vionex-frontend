import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const VideoPreview = memo(
    ({
        userName,
        localStream: externalStream,
        toggleVideo: externalToggleVideo,
        toggleAudio: externalToggleAudio,
    }: {
        userName: string;
        localStream?: MediaStream | null;
        toggleVideo?: () => Promise<boolean>;
        toggleAudio?: () => Promise<boolean>;
    }) => {
        const [localStream, setLocalStream] = useState<MediaStream | null>(
            null
        );
        const [isVideoEnabled, setIsVideoEnabled] = useState(false);
        const [isAudioEnabled, setIsAudioEnabled] = useState(false);
        const [isSpeaking, setIsSpeaking] = useState(false);
        const [audioLevel, setAudioLevel] = useState(0);
        const [isLoadingVideo, setIsLoadingVideo] = useState(false);
        const [isLoadingAudio, setIsLoadingAudio] = useState(false);
        const [isInitializing, setIsInitializing] = useState(true);
        const audioContextRef = useRef<AudioContext | null>(null);
        const videoRef = useRef<HTMLVideoElement>(null);
        const analyserRef = useRef<AnalyserNode | null>(null);
        const animationFrameRef = useRef<number | null>(null);
        const location = useLocation();

        const cleanupMediaResources = useCallback(() => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (
                audioContextRef.current &&
                audioContextRef.current.state !== "closed"
            ) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            if (localStream) {
                localStream.getTracks().forEach((track) => {
                    track.stop();
                });
                setLocalStream(null);
            }

            setIsSpeaking(false);
            setAudioLevel(0);
            analyserRef.current = null;
        }, [localStream]);

        const setupAudioAnalyser = useCallback((stream: MediaStream) => {
            try {
                audioContextRef.current = new AudioContext();
                const source =
                    audioContextRef.current.createMediaStreamSource(stream);
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;

                source.connect(analyserRef.current);

                const dataArray = new Uint8Array(
                    analyserRef.current.frequencyBinCount
                );
                const updateAudioLevel = () => {
                    if (analyserRef.current) {
                        analyserRef.current.getByteFrequencyData(dataArray);
                        const average =
                            dataArray.reduce((a, b) => a + b) /
                            dataArray.length;
                        const normalizedLevel = Math.min(average / 128, 1);
                        setAudioLevel(normalizedLevel);
                        setIsSpeaking(normalizedLevel > 0.1);
                    }
                    if (analyserRef.current) {
                        animationFrameRef.current =
                            requestAnimationFrame(updateAudioLevel);
                    }
                };

                updateAudioLevel();
            } catch (error) {
                console.error("Error setting up audio analyser:", error);
            }
        }, []);
        const cleanupAudioAnalyser = useCallback(() => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            if (
                audioContextRef.current &&
                audioContextRef.current.state !== "closed"
            ) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            setIsSpeaking(false);
            setAudioLevel(0);
            analyserRef.current = null;
        }, []);
        
        const toggleCamera = useCallback(async () => {
            if (externalToggleVideo) {
                // Use external toggle function from hook
                setIsLoadingVideo(true);
                try {
                    const enabled = await externalToggleVideo();
                    setIsVideoEnabled(enabled);
                } catch (error) {
                    console.error("Error toggling video:", error);
                    toast.error("Failed to toggle camera");
                } finally {
                    setIsLoadingVideo(false);
                }
                return;
            }

            // Fallback to local logic
            if (!localStream) {
                toast.error("Camera not initialized. Please refresh the page.");
                return;
            }

            setIsLoadingVideo(true);
            const videoTracks = localStream.getVideoTracks();
            if (videoTracks.length > 0) {
                const enabled = !videoTracks[0].enabled;
                videoTracks[0].enabled = enabled;
                setIsVideoEnabled(enabled);
            }
            setIsLoadingVideo(false);
        }, [localStream, externalToggleVideo]);

        const toggleAudio = useCallback(async () => {
            if (externalToggleAudio) {
                // Use external toggle function from hook
                setIsLoadingAudio(true);
                try {
                    const enabled = await externalToggleAudio();
                    setIsAudioEnabled(enabled);

                    if (enabled && localStream) {
                        setupAudioAnalyser(localStream);
                    } else {
                        cleanupAudioAnalyser();
                    }
                } catch (error) {
                    console.error("Error toggling audio:", error);
                    toast.error("Failed to toggle microphone");
                } finally {
                    setIsLoadingAudio(false);
                }
                return;
            }

            // Fallback to local logic
            if (!localStream) {
                toast.error(
                    "Microphone not initialized. Please refresh the page."
                );
                return;
            }

            setIsLoadingAudio(true);
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                const enabled = !audioTracks[0].enabled;
                audioTracks[0].enabled = enabled;
                setIsAudioEnabled(enabled);

                if (enabled) {
                    setupAudioAnalyser(localStream);
                } else {
                    cleanupAudioAnalyser();
                }
            } else {
                toast.error("No microphone track available.");
            }
            setIsLoadingAudio(false);
        }, [
            localStream,
            setupAudioAnalyser,
            cleanupAudioAnalyser,
            externalToggleAudio,
        ]);
        // Use external stream or initialize local stream
        useEffect(() => {
            if (externalStream) {
                // Use external stream from hook
                console.log("[VideoPreview] Using external stream from hook");
                setLocalStream(externalStream);
                setIsInitializing(false);

                // Check track states
                const videoTracks = externalStream.getVideoTracks();
                const audioTracks = externalStream.getAudioTracks();

                setIsVideoEnabled(
                    videoTracks.length > 0 && videoTracks[0].enabled
                );
                setIsAudioEnabled(
                    audioTracks.length > 0 && audioTracks[0].enabled
                );

                // Setup audio analyser if audio is available and enabled
                if (audioTracks.length > 0 && audioTracks[0].enabled) {
                    setupAudioAnalyser(externalStream);
                }
            } else {
                // Fallback to local initialization
                console.log("[VideoPreview] Initializing local stream");
                const init = async () => {
                    try {
                        const stream =
                            await navigator.mediaDevices.getUserMedia({
                                video: {
                                    width: { ideal: 1280 },
                                    height: { ideal: 720 },
                                },
                                audio: true,
                            });
                        setLocalStream(stream);

                        // Check if video track exists and is enabled
                        const videoTracks = stream.getVideoTracks();
                        const audioTracks = stream.getAudioTracks();

                        setIsVideoEnabled(
                            videoTracks.length > 0 && videoTracks[0].enabled
                        );
                        setIsAudioEnabled(
                            audioTracks.length > 0 && audioTracks[0].enabled
                        );

                        // Setup audio analyser if audio is available
                        if (audioTracks.length > 0 && audioTracks[0].enabled) {
                            setupAudioAnalyser(stream);
                        }
                    } catch (error) {
                        console.error("Error accessing camera:", error);
                        setIsVideoEnabled(false);
                        setIsAudioEnabled(false);
                        toast.error(
                            "Could not access camera/microphone. Please check permissions."
                        );
                    } finally {
                        setIsInitializing(false);
                    }
                };

                init();
            }
        }, [externalStream, setupAudioAnalyser]); // Depend on external stream

        // Cleanup on component unmount - but don't stop external streams
        useEffect(() => {
            return () => {
                if (!externalStream) {
                    // Only cleanup if we're managing our own stream
                    cleanupMediaResources();
                } else {
                    // Just cleanup audio analyser for external streams
                    cleanupAudioAnalyser();
                }
            };
        }, [cleanupMediaResources, cleanupAudioAnalyser, externalStream]);

        // Cleanup when route changes (navigation away from current page)
        useEffect(() => {
            return () => {
                if (!externalStream) {
                    // Only cleanup local streams, external stream cleanup is handled by global service
                    cleanupMediaResources();
                }
            };
        }, [location.pathname, cleanupMediaResources, externalStream]);

        // Cleanup on page unload/reload
        useEffect(() => {
            const handleBeforeUnload = () => {
                if (!externalStream) {
                    // Only cleanup local streams, external stream cleanup is handled by global service
                    cleanupMediaResources();
                }
            };

            const handleVisibilityChange = () => {
                if (document.visibilityState === "hidden" && !externalStream) {
                    // Only cleanup local streams
                    cleanupMediaResources();
                }
            };

            window.addEventListener("beforeunload", handleBeforeUnload);
            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange
            );

            return () => {
                window.removeEventListener("beforeunload", handleBeforeUnload);
                document.removeEventListener(
                    "visibilitychange",
                    handleVisibilityChange
                );
            };
        }, [cleanupMediaResources, externalStream]);
        useEffect(() => {
            if (videoRef.current && localStream) {
                videoRef.current.srcObject = localStream;
                // Ensure video plays when stream is available
                videoRef.current.play().catch((error) => {
                    console.log("Video autoplay prevented:", error);
                });
            }
        }, [localStream]);

        const displayName = useMemo(() => userName || "Your Name", [userName]);
        const avatarInitial = useMemo(
            () => userName.charAt(0).toUpperCase() || "U",
            [userName]
        );

        return (
            <motion.div
                className={`relative h-[300px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden shadow-2xl border border-white/10 group ${
                    isSpeaking ? "ring-2 ring-green-500" : ""
                }`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
            >
                <motion.div
                    className="relative w-full h-full"
                    animate={{
                        scale: isSpeaking ? 1.02 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Video element */}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                            isVideoEnabled ? "opacity-100" : "opacity-0"
                        }`}
                    />{" "}
                    {/* Camera off state */}
                    <AnimatePresence>
                        {(!isVideoEnabled || isInitializing) && (
                            <motion.div
                                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="text-center">
                                    {isInitializing ? (
                                        <motion.div
                                            className="flex flex-col items-center gap-4"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                                            <p className="text-white text-sm font-medium">
                                                Initializing camera and
                                                microphone...
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            className="relative mx-auto mb-6"
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                                                {avatarInitial}
                                            </div>
                                            {/* Breathing effect */}
                                            <motion.div
                                                className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mx-auto opacity-30"
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.3, 0.1, 0.3],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                }}
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>{" "}
                </motion.div>
                {/* Name overlay - always visible */}
                <motion.div
                    className="absolute left-4 bottom-4 px-3 py-1.5 text-xs text-white bg-black/60 rounded-lg"
                    animate={{
                        scale: isSpeaking ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                >
                    <p className="text-white text-sm font-medium flex items-center gap-2">
                        {displayName}
                    </p>
                </motion.div>{" "}
                {/* Status icons in top-right corner */}
                {!isInitializing && (
                    <div className="absolute top-2 right-2 flex gap-1">
                        {!isVideoEnabled && (
                            <div className="bg-black/60 p-1 rounded-full">
                                <VideoOff className="h-4 w-4 text-white" />
                            </div>
                        )}
                        {!isAudioEnabled && (
                            <div className="bg-black/60 p-1 rounded-full">
                                <MicOff className="h-4 w-4 text-white" />
                            </div>
                        )}
                    </div>
                )}
                {/* Enhanced Camera Controls */}
                <div className="absolute bottom-3 right-3 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform translate-y-2 group-hover:translate-y-0">
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="sm"
                            variant={isVideoEnabled ? "default" : "destructive"}
                            className={`rounded-full w-14 h-14 p-0 shadow-2xl backdrop-blur-md border-2 transition-all duration-300 ${
                                isVideoEnabled
                                    ? "bg-white/90 hover:bg-white border-white/50 text-gray-700 hover:text-blue-600"
                                    : "bg-red-500/90 hover:bg-red-600 border-red-400/50 text-white"
                            }`}
                            onClick={toggleCamera}
                            disabled={isLoadingVideo || isInitializing}
                        >
                            {isLoadingVideo ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isVideoEnabled ? (
                                <Video className="w-5 h-5" />
                            ) : (
                                <VideoOff className="w-5 h-5" />
                            )}
                        </Button>
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        animate={{
                            boxShadow: isSpeaking
                                ? `0 0 20px rgba(34, 197, 94, ${
                                      0.5 + audioLevel * 0.3
                                  })`
                                : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        }}
                    >
                        <Button
                            size="sm"
                            variant={isAudioEnabled ? "default" : "destructive"}
                            className={`rounded-full w-14 h-14 p-0 shadow-2xl backdrop-blur-md border-2 transition-all duration-300 ${
                                isAudioEnabled
                                    ? "bg-white/90 hover:bg-white border-white/50 text-gray-700 hover:text-blue-600"
                                    : "bg-red-500/90 hover:bg-red-600 border-red-400/50 text-white"
                            }`}
                            onClick={toggleAudio}
                            disabled={isLoadingAudio || isInitializing}
                        >
                            {isLoadingAudio ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isAudioEnabled ? (
                                <Mic className="w-5 h-5" />
                            ) : (
                                <MicOff className="w-5 h-5" />
                            )}
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
        );
    }
);

export default VideoPreview;
