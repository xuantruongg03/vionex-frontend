/*!
 * Copyright (c) 2025 xuantruongg003
 *
 * This software is licensed for non-commercial use only.
 * You may use, study, and modify this code for educational and research purposes.
 *
 * Commercial use of this code, in whole or in part, is strictly prohibited
 * without prior written permission from the author.
 *
 * Author Contact: lexuantruong098@gmail.com
 */
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
                title={isPinned ? "Bỏ ghim" : "Ghim người dùng này"}
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
            } ${isScreen ? "ring-2 ring-green-500" : ""}`}
        >
            <div
                className={`relative bg-gray-800 dark:bg-gray-900 w-full h-full rounded-md overflow-hidden ${
                    isSpeaking ? "ring-1 ring-green-500" : ""
                }`}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                        isScreen ? "screen-share" : ""
                    }`}
                    style={{ display: videoOff ? "none" : "block" }}
                    onError={(e) => {
                        console.error("Video error:", {
                            streamId: stream.id,
                            error: e.currentTarget.error,
                        });
                    }}
                />

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
                        <div className='text-center'>
                            <div className='w-16 h-16 rounded-full bg-blue-500 dark:bg-blue-600 mx-auto flex items-center justify-center text-white text-xl font-semibold mb-1 shadow-sm'>
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <p className='text-white text-base font-medium'>
                                {userName}
                            </p>
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
