import { ActionVideoType } from "@/interfaces/action";
import { motion } from "framer-motion";
import {
    MicOff,
    VideoOff,
    Pin,
    PinOff,
    Languages,
    Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

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
    onToggleTranslation?: (userId: string, enable: boolean) => void;
}

export const PinOverlay = ({
    isPinned,
    togglePin,
    isLocal = false,
}: {
    isPinned?: boolean;
    togglePin?: () => void;
    isLocal?: boolean;
}) => {
    // Không hiển thị nút ghim cho video của chính mình
    if (isLocal) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute top-1 left-1 z-20'
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    togglePin?.();
                }}
                className={`
          flex items-center justify-center p-1.5 rounded-full 
          transition-colors duration-200
          ${
              isPinned
                  ? "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700"
                  : "bg-black/60 dark:bg-black/75 text-white hover:bg-black/80 dark:hover:bg-black/90"
          }
        `}
                title={isPinned ? "Unpin user" : "Pin user"}
            >
                {isPinned ? (
                    <PinOff className='h-3.5 w-3.5' />
                ) : (
                    <Pin className='h-3.5 w-3.5' />
                )}
            </button>
        </motion.div>
    );
};

export const StreamTile = ({
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
    onToggleTranslation,
}: StreamTileProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const dispatch = useDispatch();
    const [showControls, setShowControls] = useState(false);
    const isLocal = stream.id === "local";

    // Fix: Only show speaking when mic is on
    const isActuallySpeaking = isSpeaking && !micOff;

    useEffect(() => {
        if (videoRef.current && stream.stream) {
            videoRef.current.srcObject = stream.stream;

            if (stream.id === "local" && videoRef.current) {
                dispatch({
                    type: ActionVideoType.SET_LOCAL_VIDEO_REF,
                    payload: { localVideoRef: videoRef.current },
                });
            }
        }

        return () => {
            if (stream.id === "local") {
                dispatch({ type: ActionVideoType.CLEAR_LOCAL_VIDEO_REF });
            }
        };
    }, [stream.stream, stream.id, dispatch, isScreen, videoOff]);

    const handleTogglePin = () => {
        if (togglePin) {
            togglePin(userName.split("-")[1]);
        }
    };

    const handleToggleTranslation = () => {
        if (onToggleTranslation && !isLocal && !isScreen) {
            const userId = userName.includes("-")
                ? userName.split("-")[1]
                : userName;
            onToggleTranslation(userId, !isUsingTranslation);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            onClick={onClick}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            className={`relative bg-gray-800 dark:bg-gray-900 rounded-md overflow-hidden flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-blue-500 w-full h-full ${
                isPinned ? "ring-2 ring-blue-500" : ""
            } ${isScreen ? "ring-2 ring-green-500" : ""} ${
                // ENHANCED: Speaking user gets prominent green border when camera is on
                isActuallySpeaking && !videoOff
                    ? "ring-4 ring-green-400 shadow-lg shadow-green-400/20"
                    : ""
            }`}
        >
            <div
                className={`relative bg-gray-800 dark:bg-gray-900 w-full h-full rounded-md overflow-hidden ${
                    // ENHANCED: Subtle ring for speaking when video is off (avatar will have animation)
                    isActuallySpeaking && videoOff
                        ? "ring-2 ring-green-400/60"
                        : ""
                }`}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-all duration-300 ${
                        isScreen ? "screen-share" : ""
                    } ${
                        // ENHANCED: Speaking user video gets subtle glow effect
                        isActuallySpeaking && !videoOff
                            ? "filter brightness-110 contrast-105"
                            : ""
                    }`}
                    style={{ display: videoOff ? "none" : "block" }}
                    onError={(e) => {
                        console.error("Video error:", {
                            streamId: stream.id,
                            error: e.currentTarget.error,
                        });
                    }}
                />

                {/* ENHANCED: Speaking indicator overlay for video streams */}
                {isActuallySpeaking && !videoOff && !isScreen && (
                    <motion.div
                        className='absolute top-2 left-2 flex items-center gap-1 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full shadow-lg'
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    >
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
                            {/* ENHANCED: Avatar with enhanced styling when speaking */}
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
                                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-sm relative z-10 ${
                                            isActuallySpeaking
                                                ? "bg-green-500 dark:bg-green-600 ring-2 ring-green-400/50 shadow-lg shadow-green-400/20"
                                                : "bg-blue-500 dark:bg-blue-600"
                                        }`}
                                        animate={
                                            isActuallySpeaking
                                                ? {
                                                      scale: [1, 1.05, 1],
                                                  }
                                                : {}
                                        }
                                        transition={{
                                            duration: 0.8,
                                            repeat: isActuallySpeaking
                                                ? Infinity
                                                : 0,
                                            ease: "easeInOut",
                                        }}
                                    >
                                        {userName.charAt(0).toUpperCase()}
                                    </motion.div>
                                </div>

                                {/* Username - positioned outside the avatar container */}
                                <p
                                    className={`text-white text-base font-medium mt-2 ${
                                        isActuallySpeaking
                                            ? "text-green-100"
                                            : ""
                                    }`}
                                >
                                    {userName}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <span className='absolute bottom-2 left-2 text-xs text-white bg-black/60 dark:bg-black/75 px-1.5 py-0.5 rounded-md shadow-sm'>
                <span>{userName}</span>
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

            {(showControls || isPinned) && togglePin && (
                <PinOverlay
                    isPinned={isPinned}
                    togglePin={handleTogglePin}
                    isLocal={isLocal}
                />
            )}

            {/* Translation Toggle Button */}
            {!isLocal &&
                !isScreen &&
                hasTranslation &&
                onToggleTranslation &&
                (showControls || isUsingTranslation) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className='absolute top-1 left-12 z-20'
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTranslation();
                            }}
                            className={`
                            flex items-center justify-center p-1.5 rounded-full 
                            transition-colors duration-200
                            ${
                                isUsingTranslation
                                    ? "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
                                    : "bg-black/60 dark:bg-black/75 text-white hover:bg-black/80 dark:hover:bg-black/90"
                            }
                        `}
                            title={
                                isUsingTranslation
                                    ? "Switch to Original Audio"
                                    : "Switch to Translated Audio"
                            }
                        >
                            {isUsingTranslation ? (
                                <Volume2 className='h-3.5 w-3.5' />
                            ) : (
                                <Languages className='h-3.5 w-3.5' />
                            )}
                        </button>
                    </motion.div>
                )}

            {isPinned && (
                <div className='absolute top-1 right-1 bg-blue-500 dark:bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm'>
                    <Pin className='h-3 w-3' />
                    <span>Pinned</span>
                </div>
            )}
        </motion.div>
    );
};
