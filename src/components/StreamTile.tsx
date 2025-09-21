import { ActionVideoType } from "@/interfaces/action";
import { motion } from "framer-motion";
import { MicOff, VideoOff, Pin, PinOff, Languages, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, memo, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

interface StreamTileProps {
    stream: { id: string; stream: MediaStream; metadata?: any };
    isSpeaking: boolean;
    videoOff: boolean;
    micOff: boolean;
    userName: string;
    isScreen: boolean;
    onClick: () => void;
    audioStream?: MediaStream;
    isPinned?: boolean;
    togglePin?: (peerId: string) => void;
    ref?: React.Ref<HTMLDivElement>;
    // Translation control props
    hasTranslation?: boolean;
    isUsingTranslation?: boolean;
    userInfo?: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
    };
}

export const PinOverlay = ({ isPinned, togglePin, isLocal = false }: { isPinned?: boolean; togglePin?: () => void; isLocal?: boolean }) => {
    if (isLocal) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='absolute top-1 left-1 z-20'>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    togglePin?.();
                }}
                className={`
          flex items-center justify-center p-1.5 rounded-full 
          transition-colors duration-200
          ${isPinned ? "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700" : "bg-black/60 dark:bg-black/75 text-white hover:bg-black/80 dark:hover:bg-black/90"}
        `}
                title={isPinned ? "Unpin user" : "Pin user"}
            >
                {isPinned ? <PinOff className='h-3.5 w-3.5' /> : <Pin className='h-3.5 w-3.5' />}
            </button>
        </motion.div>
    );
};

export const StreamTile = memo(
    ({
        stream,
        isSpeaking,
        videoOff,
        micOff,
        userName,
        isScreen,
        onClick,
        audioStream,
        isPinned,
        togglePin,
        ref,
        hasTranslation = false,
        isUsingTranslation = false,
        // onToggleTranslation,
        userInfo,
    }: StreamTileProps) => {
        const videoRef = useRef<HTMLVideoElement>(null);
        const dispatch = useDispatch();
        const [showControls, setShowControls] = useState(false);
        const isLocal = stream.id === "local";

        // Get user info from Redux for local stream
        const user = useSelector((state: any) => state.auth.user);

        // Fix: Only show speaking when mic is on
        const isActuallySpeaking = isSpeaking && !micOff;

        // Memoize stream properties to prevent unnecessary re-renders
        const streamProperties = useMemo(
            () => ({
                id: stream.id,
                hasStream: !!stream.stream,
                streamId: stream.stream?.id || "no-stream",
            }),
            [stream.id, stream.stream?.id]
        );

        // Memoize user avatar display
        const avatarInfo = useMemo(
            () => ({
                hasAvatar: !!(userInfo?.avatar || (isLocal && user?.avatar)),
                avatarSrc: userInfo?.avatar || user?.avatar,
                initial: userName.charAt(0).toUpperCase(),
            }),
            [userInfo?.avatar, user?.avatar, userName, isLocal]
        );

        // Memoize handlers to prevent re-renders
        const handleTogglePin = useMemo(() => {
            if (!togglePin) return undefined;
            return () => {
                togglePin(userName.split("-")[1]);
            };
        }, [togglePin, userName]);

        // Memoize computed style classes
        const containerClasses = useMemo(() => {
            const baseClasses = "relative bg-gray-800 dark:bg-gray-900 rounded-md overflow-hidden flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-blue-500 w-full h-full";
            const pinnedClass = isPinned ? "ring-2 ring-blue-500" : "";
            const screenClass = isScreen ? "ring-2 ring-green-500" : "";
            const speakingClass = isActuallySpeaking && !videoOff ? "ring-4 ring-green-400 shadow-lg shadow-green-400/20" : "";

            return `${baseClasses} ${pinnedClass} ${screenClass} ${speakingClass}`;
        }, [isPinned, isScreen, isActuallySpeaking, videoOff]);

        // Throttle video source updates to prevent excessive re-renders
        const lastStreamUpdate = useRef<string>("");
        const updateTimeout = useRef<NodeJS.Timeout>();

        const updateVideoSource = useCallback(
            (newStream: MediaStream, streamId: string) => {
                // Clear any pending update
                if (updateTimeout.current) {
                    clearTimeout(updateTimeout.current);
                }

                // Skip if same stream
                if (lastStreamUpdate.current === streamId) {
                    return;
                }

                updateTimeout.current = setTimeout(() => {
                    if (videoRef.current && videoRef.current.srcObject !== newStream) {
                        // Pause any current playback before changing source
                        if (!videoRef.current.paused) {
                            videoRef.current.pause();
                        }

                        videoRef.current.srcObject = newStream;
                        lastStreamUpdate.current = streamId;

                        // Wait for loadedmetadata before attempting to play
                        const handleLoadedMetadata = () => {
                            if (videoRef.current && !videoOff) {
                                videoRef.current.play().catch((error) => {
                                    // Only log non-abort errors
                                    if (error.name !== "AbortError") {
                                        console.warn(`[StreamTile] Video play failed for ${streamId}:`, error);
                                    }
                                });
                            }
                            videoRef.current?.removeEventListener("loadedmetadata", handleLoadedMetadata);
                        };

                        videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);
                    }
                }, 50); // 50ms throttle
            },
            [videoOff]
        );

        // Separate effect for stream source updates to minimize re-renders
        useEffect(() => {
            if (videoRef.current && stream.stream) {
                updateVideoSource(stream.stream, streamProperties.id);
            }

            return () => {
                if (updateTimeout.current) {
                    clearTimeout(updateTimeout.current);
                }
            };
        }, [stream.stream, streamProperties.id, updateVideoSource]);

        // Separate effect for local video ref dispatch to minimize dependency conflicts
        useEffect(() => {
            if (isLocal && videoRef.current) {
                dispatch({
                    type: ActionVideoType.SET_LOCAL_VIDEO_REF,
                    payload: { localVideoRef: videoRef.current },
                });
            }

            return () => {
                if (isLocal) {
                    dispatch({ type: ActionVideoType.CLEAR_LOCAL_VIDEO_REF });
                }
            };
        }, [dispatch, isLocal]);

        return (
            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} onClick={onClick} onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)} className={containerClasses}>
                <div
                    className={`relative bg-gray-800 dark:bg-gray-900 w-full h-full rounded-md overflow-hidden ${
                        isActuallySpeaking && videoOff ? "ring-2 ring-green-400/60" : ""
                    }`}
                >
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-all duration-300 ${isScreen ? "screen-share" : ""} ${
                            isActuallySpeaking && !videoOff ? "filter brightness-110 contrast-105" : ""
                        }`}
                        style={{ display: videoOff ? "none" : "block" }}
                        onError={(e) => {
                            console.error("Video error:", {
                                streamId: stream.id,
                                error: e.currentTarget.error,
                                errorCode: e.currentTarget.error?.code,
                                errorMessage: e.currentTarget.error?.message,
                                readyState: e.currentTarget.readyState,
                                networkState: e.currentTarget.networkState,
                            });

                            // Try to recover from error
                            if (e.currentTarget.srcObject && e.currentTarget.error?.code !== 4) {
                                setTimeout(() => {
                                    e.currentTarget.load();
                                }, 1000);
                            }
                        }}

                    />

                    {isActuallySpeaking && !videoOff && !isScreen && (
                        <motion.div className='absolute top-2 left-2 flex items-center gap-1 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full shadow-lg' initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                            <motion.div
                                className='w-2 h-2 bg-white rounded-full'
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.8, 1, 0.8],
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />
                            <span className='font-medium'>Speaking</span>
                        </motion.div>
                    )}

                    {audioStream && (
                        <audio
                            autoPlay
                            playsInline
                            style={{ display: "none" }}
                            ref={(el) => {
                                if (el && el.srcObject !== audioStream) {
                                    el.srcObject = audioStream;
                                }
                            }}
                        />
                    )}

                    {videoOff && !isScreen && (
                        <div className='absolute inset-0 flex items-center justify-center bg-gray-900 dark:bg-gray-800 z-10'>
                            <div className='text-center relative'>
                                <div className='relative flex flex-col items-center'>
                                    {/* Avatar container with sound waves positioned relative to it */}
                                    <div className='relative w-16 h-16 flex items-center justify-center'>
                                        {/* Sound wave animation - positioned absolute to avatar container */}
                                        {isActuallySpeaking && (
                                            <div className='absolute inset-0 flex items-center justify-center'>
                                                <motion.div
                                                    className='absolute w-20 h-20 rounded-full border-2 border-green-400/30'
                                                    animate={{
                                                        scale: [1, 1.3, 1],
                                                        opacity: [0.3, 0.6, 0.3],
                                                    }}
                                                    transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                    }}
                                                />
                                                <motion.div
                                                    className='absolute w-24 h-24 rounded-full border-2 border-green-400/20'
                                                    animate={{
                                                        scale: [1, 1.5, 1],
                                                        opacity: [0.2, 0.4, 0.2],
                                                    }}
                                                    transition={{
                                                        duration: 2,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: 0.3,
                                                    }}
                                                />
                                                <motion.div
                                                    className='absolute w-28 h-28 rounded-full border-2 border-green-400/10'
                                                    animate={{
                                                        scale: [1, 1.7, 1],
                                                        opacity: [0.1, 0.3, 0.1],
                                                    }}
                                                    transition={{
                                                        duration: 2.5,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: 0.6,
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Avatar - positioned relative within the container */}
                                        <motion.div
                                            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-sm relative z-10 ${isActuallySpeaking ? "bg-gradient-to-r from-green-500 to-green-600 ring-2 ring-green-400/50 shadow-lg shadow-green-400/20" : "bg-gradient-to-r from-blue-500 to-purple-500"}`}
                                            animate={
                                                isActuallySpeaking
                                                    ? {
                                                          scale: [1, 1.05, 1],
                                                      }
                                                    : {}
                                            }
                                            transition={{
                                                duration: 0.8,
                                                repeat: isActuallySpeaking ? Infinity : 0,
                                                ease: "easeInOut",
                                            }}
                                        >
                                            {/* Avatar from userInfo (remote) or auth user (local) */}
                                            {userInfo?.avatar || (isLocal && user?.avatar) ? (
                                                <img
                                                    src={userInfo?.avatar || user?.avatar}
                                                    alt={userName}
                                                    className='w-full h-full object-cover rounded-full'
                                                    onError={(e) => {
                                                        // Fallback to initial if image fails to load
                                                        const target = e.target as HTMLImageElement;
                                                        const parent = target.parentElement;
                                                        if (parent) {
                                                            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-xl font-semibold">${userName.charAt(0).toUpperCase()}</div>`;
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className='w-full h-full flex items-center justify-center text-white text-xl font-semibold'>{userName.charAt(0).toUpperCase()}</div>
                                            )}
                                        </motion.div>
                                    </div>

                                    {/* Username - positioned outside the avatar container */}
                                    <div className='text-center mt-2'>
                                        <p className={`text-white text-base font-medium ${isActuallySpeaking ? "text-green-100" : ""}`}>{userName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <span className='absolute bottom-2 left-2 text-xs text-white bg-black/60 dark:bg-black/75 px-1.5 py-0.5 rounded-md shadow-sm'>
                    <span className='flex items-center gap-1'>
                        {/* Avatar for any user with avatar (local or remote) */}
                        {(userInfo?.avatar || (isLocal && user?.avatar)) && (
                            <img
                                src={userInfo?.avatar || user?.avatar}
                                alt={userName}
                                className='w-4 h-4 object-cover rounded-full border border-white/30'
                                onError={(e) => {
                                    // Hide avatar if fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                }}
                            />
                        )}
                        {userName}
                    </span>
                </span>

                <div className='absolute top-1 right-1 flex gap-1'>
                    {videoOff && !isScreen && (
                        <div className='bg-black/60 dark:bg-black/75 p-1 rounded-md shadow-sm'>
                            <VideoOff className='h-4 w-4 text-white' />
                        </div>
                    )}
                    {micOff && (
                        <div className='bg-black/60 dark:bg-black/75 p-1 rounded-md z-20 shadow-sm'>
                            <MicOff className='h-4 w-4 text-white' />
                        </div>
                    )}
                </div>

                {(showControls || isPinned) && togglePin && <PinOverlay isPinned={isPinned} togglePin={handleTogglePin} isLocal={isLocal} />}

                {isPinned && (
                    <div className='absolute top-1 right-1 bg-blue-500 dark:bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm'>
                        <Pin className='h-3 w-3' />
                        <span>Pinned</span>
                    </div>
                )}
            </motion.div>
        );
    }
);

// Set display name for debugging
StreamTile.displayName = "StreamTile";

// Memoization comparison function to prevent unnecessary re-renders
const areEqual = (prevProps: StreamTileProps, nextProps: StreamTileProps) => {
    return (
        prevProps.stream.id === nextProps.stream.id &&
        prevProps.stream.stream?.id === nextProps.stream.stream?.id &&
        prevProps.isSpeaking === nextProps.isSpeaking &&
        prevProps.videoOff === nextProps.videoOff &&
        prevProps.micOff === nextProps.micOff &&
        prevProps.userName === nextProps.userName &&
        prevProps.isScreen === nextProps.isScreen &&
        prevProps.isPinned === nextProps.isPinned &&
        prevProps.hasTranslation === nextProps.hasTranslation &&
        prevProps.isUsingTranslation === nextProps.isUsingTranslation &&
        prevProps.userInfo?.avatar === nextProps.userInfo?.avatar &&
        prevProps.audioStream?.id === nextProps.audioStream?.id
    );
};

export default memo(StreamTile, areEqual);
