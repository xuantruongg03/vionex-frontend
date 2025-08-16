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

import ApiService from "@/services/signalService";
import { Device, types as mediasoupTypes } from "mediasoup-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io, Socket } from "socket.io-client";

// Import all modules from our call system
import {
    CallSystemContext,
    CallSystemRefs,
    CallSystemSetters,
    CallSystemState,
    ConsumerManager,
    MediaManager,
    ProducerManager,
    RoomManager,
    SocketEventHandlerManager,
    StreamInfo,
    StreamManager,
    TransportManager,
    VADManager,
} from "./call-system";

// Constants
const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

/**
 * Refactored Call Hook
 * Main hook that orchestrates all call system modules
 */
export function useCallRefactored(roomId: string, password?: string) {
    // State
    const [streams, setStreams] = useState<StreamInfo[]>([]);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [isWebSocketJoined, setIsWebSocketJoined] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [joining, setJoining] = useState(false);

    // Redux
    const room = useSelector((state: any) => state.room);
    const dispatch = useDispatch();

    // Refs - organize all refs into our refs interface
    const refs: CallSystemRefs = {
        apiServiceRef: useRef<ApiService | null>(null),
        socketRef: useRef<Socket | null>(null),
        deviceRef: useRef<Device | null>(null),
        localStreamRef: useRef<MediaStream | null>(null),
        sendTransportRef: useRef<mediasoupTypes.Transport | null>(null),
        recvTransportRef: useRef<mediasoupTypes.Transport | null>(null),
        producersRef: useRef(new Map()),
        consumersRef: useRef(new Map()),
        remoteStreamsMapRef: useRef(new Map<string, MediaStream>()),
        isInitializedRef: useRef(false),
        screenStreamRef: useRef<MediaStream | null>(null),
        consumingStreamsRef: useRef<Set<string>>(new Set()),
        isPublishingRef: useRef(false),
        currentStreamIdsRef: useRef({}),
        pendingStreamsRef: useRef([]),
        isJoiningRef: useRef(false),
    };

    // Setters - organize all state setters
    const setters: CallSystemSetters = {
        setStreams,
        setIsScreenSharing,
        setSpeakingPeers,
        setIsSpeaking,
        setIsConnected,
        setIsJoined,
        setIsWebSocketJoined,
        setError,
        setLoading,
        setJoining,
    };

    // Current state values - create state object for context
    const currentState: CallSystemState = {
        streams,
        isScreenSharing,
        speakingPeers,
        isSpeaking,
        isConnected,
        isJoined,
        isWebSocketJoined,
        error,
        loading,
        joining,
    };

    // Create context for all modules
    const context: CallSystemContext = {
        roomId,
        room,
        dispatch,
        refs,
        setters,
        state: currentState,
    };

    // Initialize managers
    const streamManager = new StreamManager(context);
    const transportManager = new TransportManager(context);
    const producerManager = new ProducerManager(context);
    const consumerManager = new ConsumerManager(context, streamManager);
    const mediaManager = new MediaManager(context, producerManager);
    const roomManager = new RoomManager(context);

    // Check for raw audio mode from URL parameter
    const useRawAudio =
        new URLSearchParams(window.location.search).get("rawAudio") === "true";

    const vadManager = new VADManager(context, useRawAudio);

    // Set manager references for cross-dependencies
    transportManager.setManagers(producerManager, mediaManager);
    roomManager.setMediaManager(mediaManager);
    mediaManager.setVADManager(vadManager);

    const eventHandlerManager = new SocketEventHandlerManager(
        context,
        streamManager,
        consumerManager,
        producerManager,
        transportManager
    );

    // Set cross-references for auto-publishing
    transportManager.setManagers(producerManager, mediaManager);

    // Initialize services
    useEffect(() => {
        refs.apiServiceRef.current = new ApiService(API_BASE_URL);

        // Create Socket.IO connection
        refs.socketRef.current = io(API_BASE_URL, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            autoConnect: false,
        });

        // Set global socket reference for other hooks
        setGlobalSocket(refs.socketRef.current);

        return () => {
            refs.socketRef.current?.disconnect();
            setGlobalSocket(null);
        };
    }, []);

    // Set up WebSocket event handlers using our event handler manager
    useEffect(() => {
        const socket = refs.socketRef.current;
        if (!socket) return;

        // Register all event handlers
        eventHandlerManager.registerHandlers(socket);

        // Cleanup function
        return () => {
            eventHandlerManager.unregisterHandlers(socket);
        };
    }, [room.username, roomId]);

    // Periodic check for pending streams - fallback mechanism
    useEffect(() => {
        const checkPendingStreams = () => {
            const pendingCount = refs.pendingStreamsRef.current.length;
            if (
                pendingCount > 0 &&
                refs.recvTransportRef.current &&
                refs.socketRef.current
            ) {
                const pendingStreams = [...refs.pendingStreamsRef.current];
                for (const streamData of pendingStreams) {
                    // Validate streamId
                    if (
                        !streamData.streamId ||
                        streamData.streamId === "undefined" ||
                        typeof streamData.streamId !== "string"
                    ) {
                        continue;
                    }

                    // Skip presence streams
                    if (streamData.metadata?.type === "presence") {
                        continue;
                    }

                    if (
                        !streamManager.isStreamBeingConsumed(
                            streamData.streamId
                        )
                    ) {
                        try {
                            streamManager.markStreamAsConsuming(
                                streamData.streamId
                            );
                            refs.socketRef.current?.emit("sfu:consume", {
                                streamId: streamData.streamId,
                                transportId: refs.recvTransportRef.current!.id,
                            });

                            // Remove from pending after attempting
                            const index =
                                refs.pendingStreamsRef.current.findIndex(
                                    (p) => p.streamId === streamData.streamId
                                );
                            if (index >= 0) {
                                refs.pendingStreamsRef.current.splice(index, 1);
                            }
                        } catch (error) {
                            console.error(
                                `Periodic consume failed for ${streamData.streamId}:`,
                                error
                            );
                            streamManager.removeFromConsuming(
                                streamData.streamId
                            );
                        }
                    }
                }
            }
        };

        const interval = setInterval(checkPendingStreams, 2000);
        return () => clearInterval(interval);
    }, []);

    // Force initialize local media if not done after join
    useEffect(() => {
        if (isJoined && !refs.localStreamRef.current) {
            const timer = setTimeout(async () => {
                await mediaManager.initializeLocalMedia();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isJoined]);

    // Auto-initialize local media when hook is first loaded (like old logic)
    useEffect(() => {
        const autoInitializeMedia = async () => {
            if (!refs.localStreamRef.current) {
                try {
                    await mediaManager.initializeLocalMedia();
                } catch (error) {
                    console.error(
                        "[useCallRefactored] Auto-initialize media failed:",
                        error
                    );
                }
            }
        };

        // Initialize media early, even before joining room
        const timer = setTimeout(() => {
            autoInitializeMedia();
        }, 500);

        return () => clearTimeout(timer);
    }, []); // Run once on mount

    // Initialize VAD when local stream is available
    useEffect(() => {
        const initVAD = async () => {
            if (refs.localStreamRef.current && isJoined) {
                try {
                    await vadManager.initialize();
                    console.log("[useCallRefactored] VAD initialized");
                } catch (error) {
                    console.error(
                        "[useCallRefactored] VAD initialization failed:",
                        error
                    );
                }
            }
        };

        initVAD();
    }, [refs.localStreamRef.current, isJoined]);

    // Monitor microphone state for VAD
    useEffect(() => {
        if (
            vadManager.getState().isInitialized &&
            refs.localStreamRef.current
        ) {
            const localStream = refs.localStreamRef.current;
            const audioTracks = localStream.getAudioTracks();
            const microphoneEnabled =
                audioTracks.length > 0 &&
                audioTracks.some((track) => track.enabled);

            console.log("[useCallRefactored] Microphone state update:", {
                tracksCount: audioTracks.length,
                enabled: microphoneEnabled,
                trackStates: audioTracks.map((t) => ({
                    label: t.label,
                    enabled: t.enabled,
                })),
                vadCurrentState: vadManager.getState(),
            });

            vadManager.updateMicrophoneState(microphoneEnabled);
        }
    }, [
        refs.localStreamRef.current?.getAudioTracks()?.length,
        refs.localStreamRef.current
            ?.getAudioTracks()
            ?.map((track) => track.enabled)
            .join(","), // Track enabled states
    ]);

    // Cleanup VAD on unmount
    useEffect(() => {
        return () => {
            vadManager.cleanup();
        };
    }, []);

    // Screen share ended effect - handle when tracks end
    useEffect(() => {
        if (refs.screenStreamRef.current) {
            const tracks = refs.screenStreamRef.current.getTracks();

            const trackEndedListener = () => {
                mediaManager.handleScreenShareEnded();
            };

            tracks.forEach((track) => {
                track.addEventListener("ended", trackEndedListener);
            });

            return () => {
                if (refs.screenStreamRef.current) {
                    refs.screenStreamRef.current
                        .getTracks()
                        .forEach((track) => {
                            track.removeEventListener(
                                "ended",
                                trackEndedListener
                            );
                        });
                }
            };
        }
    }, [isScreenSharing]);

    // Expose public interface
    const joinRoom = useCallback(async () => {
        return await roomManager.joinRoom(password);
    }, [roomId, room.username, password]);

    const leaveRoom = useCallback(async () => {
        await roomManager.leaveRoom();
    }, []);

    const toggleVideo = useCallback(async () => {
        return await mediaManager.toggleVideo();
    }, [room.username, roomId]);

    const toggleAudio = useCallback(async () => {
        return await mediaManager.toggleAudio();
    }, [room.username, roomId]);

    const toggleLockRoom = useCallback(
        (password?: string) => {
            roomManager.toggleLockRoom(password);
        },
        [isJoined, roomId, room.isLocked, room.isCreator, room.username]
    );

    const togglePinUser = useCallback(
        (peerId: string) => {
            roomManager.togglePinUser(peerId);
        },
        [isJoined, roomId, room.pinnedUsers, refs.recvTransportRef.current]
    );

    const toggleScreenShare = useCallback(async () => {
        return await mediaManager.toggleScreenShare();
    }, [isScreenSharing]);

    const handleScreenShareEnded = useCallback(() => {
        mediaManager.handleScreenShareEnded();
    }, []);

    const initializeLocalMedia = useCallback(async () => {
        return await mediaManager.initializeLocalMedia();
    }, [roomId, room.username]);

    const getRemoteStreams = useCallback(async () => {
        return await roomManager.getRemoteStreams();
    }, [roomId, room.username]);

    const consumeTranslationStream = useCallback(
        async (streamId: string) => {
            try {
                // Check if we have necessary transport and socket
                if (!refs.recvTransportRef.current || !refs.socketRef.current) {
                    console.error(
                        "[useCallRefactored] Missing required transport or socket for translation consumption"
                    );
                    throw new Error("Transport or socket not available");
                }

                // Mark as consuming to prevent duplicate requests
                if (streamManager.isStreamBeingConsumed(streamId)) {
                    console.log(
                        "[useCallRefactored] Translation stream already being consumed:",
                        streamId
                    );
                    return true;
                }

                streamManager.markStreamAsConsuming(streamId);

                // Emit consume request for the translation stream
                refs.socketRef.current.emit("sfu:consume", {
                    streamId: streamId,
                    transportId: refs.recvTransportRef.current.id,
                });

                return true;
            } catch (error) {
                console.error(
                    "[useCallRefactored] Error consuming translation stream:",
                    error
                );
                // Clean up on error
                if (streamId) {
                    streamManager.removeFromConsuming(streamId);
                }
                throw error;
            }
        },
        [streamManager]
    );

    const revertTranslationStream = useCallback(
        (targetUserId: string) => {
            consumerManager.revertTranslationStream(targetUserId);
        },
        [consumerManager]
    );

    return {
        // State
        streams,
        isWebSocketJoined,
        isScreenSharing,
        speakingPeers,
        isSpeaking,
        isConnected,
        isJoined,
        error,
        loading,
        joining,

        // VAD State
        vadState: vadManager.getState(),

        // Actions
        joinRoom,
        leaveRoom,
        toggleVideo,
        toggleAudio,
        toggleLockRoom,
        togglePinUser,
        toggleScreenShare,
        handleScreenShareEnded,
        initializeLocalMedia,
        getRemoteStreams,

        // Translation Actions
        consumeTranslationStream,
        revertTranslationStream,

        // VAD Actions
        startVADListening: () => vadManager.startListening(),
        stopVADListening: () => vadManager.stopListening(),
        getVADRecordings: () => vadManager.getRecordings(),
        clearVADRecordings: () => vadManager.clearRecordings(),

        // Global stream from service
        localStream: mediaManager.getLocalStream(),
    };
}

// Export socket instance for use in other hooks
let globalSocketRef: Socket | null = null;

export const setGlobalSocket = (socket: Socket | null) => {
    globalSocketRef = socket;
};

export const getSocket = () => {
    return globalSocketRef;
};

// Alias for backward compatibility
export const sfuSocket = globalSocketRef;
