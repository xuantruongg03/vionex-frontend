import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
                analyserRef.current.fftSize = 128; // Reduced for better performance
                analyserRef.current.smoothingTimeConstant = 0.8;

                source.connect(analyserRef.current);

                const dataArray = new Uint8Array(
                    analyserRef.current.frequencyBinCount
                );

                // Throttled audio level update for better performance
                let lastUpdateTime = 0;
                const UPDATE_INTERVAL = 150; // Update every 150ms instead of 100ms

                const updateAudioLevel = (currentTime: number) => {
                    if (!analyserRef.current) return;

                    // Throttle updates for better performance
                    if (currentTime - lastUpdateTime < UPDATE_INTERVAL) {
                        animationFrameRef.current =
                            requestAnimationFrame(updateAudioLevel);
                        return;
                    }

                    lastUpdateTime = currentTime;
                    analyserRef.current.getByteFrequencyData(dataArray);

                    // Optimized average calculation with reduced samples
                    let sum = 0;
                    const step = 4; // Sample every 4th element for better performance
                    for (let i = 0; i < dataArray.length; i += step) {
                        sum += dataArray[i];
                    }
                    const average = sum / (dataArray.length / step);

                    const normalizedLevel = Math.min(average / 128, 1);
                    const speaking = normalizedLevel > 0.1;

                    // Batch state updates to reduce re-renders
                    setAudioLevel(normalizedLevel);
                    setIsSpeaking(speaking);

                    animationFrameRef.current =
                        requestAnimationFrame(updateAudioLevel);
                };

                animationFrameRef.current =
                    requestAnimationFrame(updateAudioLevel);
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
        // Combined effect for stream management and cleanup
        useEffect(() => {
            let mounted = true;

            // Handle external stream setup
            if (externalStream && mounted) {
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

                // Setup video element
                if (videoRef.current) {
                    videoRef.current.srcObject = externalStream;
                    videoRef.current.play().catch((error) => {
                        console.log("Video autoplay prevented:", error);
                    });
                }
            }

            // Setup cleanup handlers
            const handleBeforeUnload = () => {
                if (!externalStream) {
                    cleanupMediaResources();
                }
            };

            const handleVisibilityChange = () => {
                if (document.visibilityState === "hidden" && !externalStream) {
                    cleanupMediaResources();
                }
            };

            // Add event listeners only once
            window.addEventListener("beforeunload", handleBeforeUnload);
            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange
            );

            // Cleanup function
            return () => {
                mounted = false;

                // Remove event listeners
                window.removeEventListener("beforeunload", handleBeforeUnload);
                document.removeEventListener(
                    "visibilitychange",
                    handleVisibilityChange
                );

                // Cleanup resources based on stream type
                if (!externalStream) {
                    cleanupMediaResources();
                } else {
                    cleanupAudioAnalyser();
                }
            };
        }, [
            externalStream,
            setupAudioAnalyser,
            cleanupMediaResources,
            cleanupAudioAnalyser,
        ]);

        // Separate effect for video element updates only when localStream changes
        useEffect(() => {
            if (videoRef.current && localStream) {
                videoRef.current.srcObject = localStream;
                videoRef.current.play().catch((error) => {
                    console.log("Video autoplay prevented:", error);
                });
            }
        }, [localStream]);

        // Optimized memoization - combine related calculations
        const displayInfo = useMemo(
            () => ({
                name: userName || "Your Name",
                initial: userName.charAt(0).toUpperCase() || "U",
            }),
            [userName]
        );

        // Memoize speaking-related styles and animations together
        const speakingStyles = useMemo(() => {
            const isSpeakingActive = isSpeaking && isAudioEnabled;

            return {
                avatarClassName: `w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-2xl relative z-10 transition-colors duration-300 ${
                    isSpeakingActive
                        ? "bg-gradient-to-r from-green-500 to-green-600 ring-2 ring-green-400/50 shadow-lg shadow-green-400/20"
                        : "bg-gradient-to-r from-blue-500 to-purple-500"
                }`,
                avatarAnimation: isSpeakingActive
                    ? { scale: [1, 1.05, 1] }
                    : { scale: 1 },
                avatarTransition: {
                    duration: 0.8,
                    repeat: isSpeakingActive ? Infinity : 0,
                    ease: "easeInOut",
                    repeatType: "loop" as const,
                },
            };
        }, [isSpeaking, isAudioEnabled]);

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
                    className='relative w-full h-full'
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
                                className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900'
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className='text-center'>
                                    {isInitializing ? (
                                        <motion.div
                                            className='flex flex-col items-center gap-4'
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.5 }}
                                        >
                                            <Loader2 className='h-12 w-12 text-blue-500 animate-spin' />
                                            <p className='text-white text-sm font-medium'>
                                                Initializing camera and
                                                microphone...
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            className='relative mx-auto mb-6'
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {/* Sound wave animation when speaking (optimized) */}
                                            <AnimatePresence>
                                                {isSpeaking &&
                                                    isAudioEnabled && (
                                                        <motion.div
                                                            className='absolute inset-0 flex items-center justify-center'
                                                            initial={{
                                                                opacity: 0,
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                            }}
                                                            exit={{
                                                                opacity: 0,
                                                            }}
                                                            transition={{
                                                                duration: 0.2,
                                                            }}
                                                        >
                                                            <motion.div
                                                                className='absolute w-24 h-24 rounded-full border-2 border-green-400/30'
                                                                animate={{
                                                                    scale: [
                                                                        1, 1.4,
                                                                        1,
                                                                    ],
                                                                    opacity: [
                                                                        0.3,
                                                                        0.6,
                                                                        0.3,
                                                                    ],
                                                                }}
                                                                transition={{
                                                                    duration: 1.5,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut",
                                                                    repeatType:
                                                                        "loop",
                                                                }}
                                                            />
                                                            <motion.div
                                                                className='absolute w-28 h-28 rounded-full border-2 border-green-400/20'
                                                                animate={{
                                                                    scale: [
                                                                        1, 1.6,
                                                                        1,
                                                                    ],
                                                                    opacity: [
                                                                        0.2,
                                                                        0.4,
                                                                        0.2,
                                                                    ],
                                                                }}
                                                                transition={{
                                                                    duration: 2,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut",
                                                                    delay: 0.3,
                                                                    repeatType:
                                                                        "loop",
                                                                }}
                                                            />
                                                            <motion.div
                                                                className='absolute w-32 h-32 rounded-full border-2 border-green-400/10'
                                                                animate={{
                                                                    scale: [
                                                                        1, 1.8,
                                                                        1,
                                                                    ],
                                                                    opacity: [
                                                                        0.1,
                                                                        0.3,
                                                                        0.1,
                                                                    ],
                                                                }}
                                                                transition={{
                                                                    duration: 2.5,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut",
                                                                    delay: 0.6,
                                                                    repeatType:
                                                                        "loop",
                                                                }}
                                                            />
                                                        </motion.div>
                                                    )}
                                            </AnimatePresence>

                                            {/* Avatar with enhanced styling when speaking */}
                                            <motion.div
                                                className={
                                                    speakingStyles.avatarClassName
                                                }
                                                animate={
                                                    speakingStyles.avatarAnimation
                                                }
                                                transition={
                                                    speakingStyles.avatarTransition
                                                }
                                            >
                                                {displayInfo.initial}
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
                {/* Name overlay - always visible */}
                <motion.div
                    className='absolute left-4 bottom-4 px-3 py-1.5 text-xs text-white bg-black/60 rounded-lg'
                    animate={{
                        scale: isSpeaking ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                >
                    <p className='text-white text-sm font-medium flex items-center gap-2'>
                        {displayInfo.name}
                    </p>
                </motion.div>{" "}
                {/* Status icons in top-right corner */}
                {!isInitializing && (
                    <div className='absolute top-2 right-2 flex gap-1'>
                        {!isVideoEnabled && (
                            <div className='bg-black/60 p-1 rounded-full'>
                                <VideoOff className='h-4 w-4 text-white' />
                            </div>
                        )}
                        {!isAudioEnabled && (
                            <div className='bg-black/60 p-1 rounded-full'>
                                <MicOff className='h-4 w-4 text-white' />
                            </div>
                        )}
                    </div>
                )}
                {/* Enhanced Camera Controls */}
                <div className='absolute bottom-3 right-3 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform translate-y-2 group-hover:translate-y-0'>
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size='sm'
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
                                <Loader2 className='w-5 h-5 animate-spin' />
                            ) : isVideoEnabled ? (
                                <Video className='w-5 h-5' />
                            ) : (
                                <VideoOff className='w-5 h-5' />
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
                            size='sm'
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
                                <Loader2 className='w-5 h-5 animate-spin' />
                            ) : isAudioEnabled ? (
                                <Mic className='w-5 h-5' />
                            ) : (
                                <MicOff className='w-5 h-5' />
                            )}
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
        );
    }
);

export default VideoPreview;
