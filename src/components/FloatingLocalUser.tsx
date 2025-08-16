import React, { useEffect, useState } from "react";
import Draggable from "react-draggable";
import { motion } from "framer-motion";
import { StreamTile } from "./StreamTile";
import { Maximize2, Minimize2 } from "lucide-react";
import { User } from "@/interfaces";

const FloatingLocalUser = ({
    localUser,
    localStream,
    isVideoOff,
    isMuted,
    isSpeaking,
    onToggleSize,
    isMinimized = false,
}: {
    localUser: User;
    localStream: MediaStream | null;
    isVideoOff: boolean;
    isMuted: boolean;
    isSpeaking: boolean;
    onToggleSize: () => void;
    isMinimized?: boolean;
}) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const updatePosition = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const width = isMinimized ? 120 : 240;
            const height = isMinimized ? 80 : 180;

            setPosition({
                x: windowWidth - width - 20,
                y: windowHeight - height - 20,
            });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        return () => window.removeEventListener("resize", updatePosition);
    }, [isMinimized]);

    return (
        <Draggable
            position={position}
            onStop={(e, data) => setPosition({ x: data.x, y: data.y })}
            handle=".drag-handle"
            bounds="parent"
        >
            <motion.div
                className="fixed z-50 bg-black dark:bg-gray-900 rounded-lg shadow-2xl border-2 border-blue-500 dark:border-blue-600 overflow-hidden cursor-move drag-handle"
                style={{
                    width: isMinimized ? 120 : 240,
                    height: isMinimized ? 80 : 180,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: isMinimized ? 1.05 : 1.02 }}
            >
                <div className="absolute top-1 right-1 z-10 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSize();
                        }}
                        className="p-1 bg-black bg-opacity-50 rounded text-white hover:bg-opacity-70 transition-all"
                    >
                        {isMinimized ? (
                            <Maximize2 className="w-3 h-3" />
                        ) : (
                            <Minimize2 className="w-3 h-3" />
                        )}
                    </button>
                </div>

                <div className="w-full h-full relative">
                    {localStream ? (
                        <StreamTile
                            stream={{
                                id: localUser?.peerId || "local",
                                stream: localStream,
                            }}
                            userName="Bạn"
                            isSpeaking={isSpeaking}
                            isActive={true}
                            onClick={() => {}}
                            videoOff={isVideoOff}
                            micOff={isMuted}
                            isScreen={false}
                            audioStream={null}
                            isPinned={false}
                            togglePin={() => {}}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900 dark:bg-gray-800">
                            <div
                                className={`rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mb-1 ${
                                    isMinimized
                                        ? "w-8 h-8 text-xs"
                                        : "w-12 h-12 text-lg"
                                }`}
                            >
                                {(localUser?.peerId || "B")[0].toUpperCase()}
                            </div>
                            {!isMinimized && (
                                <span className="text-white text-xs">Bạn</span>
                            )}
                        </div>
                    )}

                    <div
                        className={`absolute ${
                            isMinimized ? "bottom-0" : "top-2"
                        } left-2`}
                    >
                        <span
                            className={`bg-blue-600 text-white px-1 py-0.5 rounded shadow ${
                                isMinimized ? "text-xs" : "text-xs"
                            }`}
                        >
                            Bạn
                        </span>
                    </div>
                </div>
            </motion.div>
        </Draggable>
    );
};

export default FloatingLocalUser;
