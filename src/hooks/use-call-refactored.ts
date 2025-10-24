import ApiService from "@/services/signalService";
import { Device, types as mediasoupTypes } from "mediasoup-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Socket } from "socket.io-client";
import { useSocket } from "@/contexts/SocketContext";

// Import all modules from our call system
import { CallSystemContext, CallSystemRefs, CallSystemSetters, CallSystemState, ConsumerManager, MediaManager, ProducerManager, RoomManager, SocketEventHandlerManager, StreamInfo, StreamManager, TransportManager, VADManager } from "./call-system";

/**
 * Refactored Call Hook
 * Main hook that orchestrates all call system modules
 */
export function useCallRefactored(roomId: string, password?: string) {
    // State
    const [streams, setStreams] = useState<StreamInfo[]>([]);
    const [screenStreams, setScreenStreams] = useState<StreamInfo[]>([]);
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

    // Use Socket Context instead of creating new socket
    const { socket: contextSocket, isConnected: socketConnected, connect: connectSocket, disconnect: disconnectSocket } = useSocket();

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
        setScreenStreams,
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
        screenStreams,
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
    console.log('[useCallRefactored] 🚀 Initializing managers', {
        roomId,
        username: room.username,
        timestamp: new Date().toISOString(),
    });

    const streamManager = new StreamManager(context);
    const transportManager = new TransportManager(context);
    const producerManager = new ProducerManager(context);
    const consumerManager = new ConsumerManager(context, streamManager);
    const mediaManager = new MediaManager(context, producerManager);
    const roomManager = new RoomManager(context);

    console.log('[useCallRefactored] ✅ Managers initialized');

    // Check for raw audio mode from URL parameter
    const useRawAudio = new URLSearchParams(window.location.search).get("rawAudio") === "true";

    const vadManager = new VADManager(context, useRawAudio);

    // Set manager references for cross-dependencies
    transportManager.setManagers(producerManager, mediaManager);
    roomManager.setMediaManager(mediaManager);
    roomManager.setTransportManager(transportManager);
    mediaManager.setVADManager(vadManager);

    const eventHandlerManager = new SocketEventHandlerManager(context, streamManager, consumerManager, producerManager, transportManager);

    // Set socketEventHandlers reference for RoomManager to create consumers
    roomManager.setSocketEventHandlers(eventHandlerManager);

    // Set cross-references for auto-publishing
    transportManager.setManagers(producerManager, mediaManager);

    // Initialize services
    useEffect(() => {
        console.log('[useCallRefactored] 🔧 Initializing services', {
            hasContextSocket: !!contextSocket,
            socketConnected: contextSocket?.connected,
        });

        refs.apiServiceRef.current = new ApiService();

        // Use socket from context instead of creating new one
        refs.socketRef.current = contextSocket;

        console.log('[useCallRefactored] ✅ Services initialized');

        return () => {
            console.log('[useCallRefactored] 🧹 Cleaning up services');
            // Don't disconnect context socket here, let context manage it
            refs.socketRef.current = null;
        };
    }, [contextSocket]);

    // Set up WebSocket event handlers using our event handler manager
    useEffect(() => {
        console.log('[useCallRefactored] 🔌 Setting up WebSocket handlers', {
            hasSocket: !!refs.socketRef.current,
            socketId: refs.socketRef.current?.id,
            connected: refs.socketRef.current?.connected,
        });

        const socket = refs.socketRef.current;
        if (!socket) {
            console.warn('[useCallRefactored] ⚠️ No socket available for handlers');
            return;
        }

        // Register all event handlers
        console.log('[useCallRefactored] 📝 Registering event handlers');
        eventHandlerManager.registerHandlers(socket);

        // Cleanup function
        return () => {
            console.log('[useCallRefactored] 🗑️ Unregistering event handlers');
            eventHandlerManager.unregisterHandlers(socket);
        };
    }, [contextSocket]); // Changed: depend on contextSocket to ensure handlers are registered when socket changes

    // Monitor transport connection and process pending streams
    useEffect(() => {
        if (refs.recvTransportRef.current && refs.socketRef.current && refs.pendingStreamsRef.current.length > 0) {
            streamManager.processPendingStreams();
        }
    }, [refs.recvTransportRef.current?.id, refs.socketRef.current?.connected, isJoined]);
    useEffect(() => {
        const checkPendingStreams = () => {
            const pendingCount = refs.pendingStreamsRef.current.length;
            if (pendingCount > 0 && refs.recvTransportRef.current && refs.socketRef.current) {
                const pendingStreams = [...refs.pendingStreamsRef.current];
                for (const streamData of pendingStreams) {
                    // Validate streamId
                    if (!streamData.streamId || streamData.streamId === "undefined" || typeof streamData.streamId !== "string") {
                        continue;
                    }

                    // Skip presence streams
                    if (streamData.metadata?.type === "presence") {
                        continue;
                    }

                    if (!streamManager.isStreamBeingConsumed(streamData.streamId)) {
                        try {
                            streamManager.markStreamAsConsuming(streamData.streamId);
                            refs.socketRef.current?.emit("sfu:consume", {
                                streamId: streamData.streamId,
                                transportId: refs.recvTransportRef.current!.id,
                            });

                            // Remove from pending after attempting
                            const index = refs.pendingStreamsRef.current.findIndex((p) => p.streamId === streamData.streamId);
                            if (index >= 0) {
                                refs.pendingStreamsRef.current.splice(index, 1);
                            }
                        } catch (error) {
                            console.error(`Periodic consume failed for ${streamData.streamId}:`, error);
                            streamManager.removeFromConsuming(streamData.streamId);
                        }
                    }
                }
            }
        };

        // const interval = setInterval(checkPendingStreams, 2000);
        // return () => clearInterval(interval);
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
                    console.error("[useCallRefactored] Auto-initialize media failed:", error);
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
                    // Check if local stream has audio tracks before initializing VAD
                    const localStream = refs.localStreamRef.current;
                    const audioTracks = localStream.getAudioTracks();

                    if (audioTracks.length === 0) {
                        return;
                    }

                    // Check if audio tracks are enabled
                    const hasEnabledAudio = audioTracks.some((track) => track.enabled);
                    if (!hasEnabledAudio) {
                        console.warn("[useCallRefactored] All audio tracks are disabled, skipping VAD initialization");
                        return;
                    }
                    await vadManager.initialize();
                } catch (error) {
                    console.error("[useCallRefactored] VAD initialization failed:", error);
                }
            }
        };

        initVAD();
    }, [refs.localStreamRef.current, isJoined]); // Remove invalid dependency

    // Monitor microphone state for VAD
    useEffect(() => {
        if (vadManager.getState().isInitialized && refs.localStreamRef.current) {
            const localStream = refs.localStreamRef.current;
            const audioTracks = localStream.getAudioTracks();
            const microphoneEnabled = audioTracks.length > 0 && audioTracks.some((track) => track.enabled);

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
                    refs.screenStreamRef.current.getTracks().forEach((track) => {
                        track.removeEventListener("ended", trackEndedListener);
                    });
                }
            };
        }
    }, [isScreenSharing]);

    // Expose public interface
    const joinRoom = useCallback(async () => {
        console.log('[useCallRefactored] 🚪 joinRoom called', {
            roomId,
            username: room.username,
            hasPassword: !!password,
            contextSocketConnected: contextSocket?.connected,
            timestamp: new Date().toISOString(),
        });

        try {
            // Connect socket first if not connected
            let currentSocket = contextSocket;
            if (!currentSocket || !currentSocket.connected) {
                console.log('[useCallRefactored] 🔌 Connecting socket...');
                currentSocket = await connectSocket();
                console.log('[useCallRefactored] ✅ Socket connected', {
                    socketId: currentSocket?.id,
                });
            } else {
                console.log('[useCallRefactored] ✅ Using existing socket connection', {
                    socketId: currentSocket?.id,
                });
            }

            // Ensure socket is properly assigned to refs
            refs.socketRef.current = currentSocket;

            // Wait a bit to ensure event handlers are registered
            console.log('[useCallRefactored] ⏳ Waiting 100ms for handlers...');
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Verify socket is connected
            if (!currentSocket?.connected) {
                console.error('[useCallRefactored] ❌ Socket not connected after waiting');
                throw new Error("Socket is not connected after connection attempt");
            }

            console.log('[useCallRefactored] 🎯 Calling roomManager.joinRoom()');
            const result = await roomManager.joinRoom(password);
            console.log('[useCallRefactored] ✅ joinRoom completed', result);
            
            return result;
        } catch (error) {
            console.error('[useCallRefactored] ❌ joinRoom failed', error);
            throw error;
        }
    }, [roomId, room.username, password, contextSocket, connectSocket]);

    const leaveRoom = useCallback(async () => {
        await roomManager.leaveRoom();

        // Disconnect socket when leaving room
        disconnectSocket();
    }, [disconnectSocket]);

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
                    console.error("[useCallRefactored] Missing required transport or socket for translation consumption");
                    throw new Error("Transport or socket not available");
                }

                // Mark as consuming to prevent duplicate requests
                if (streamManager.isStreamBeingConsumed(streamId)) {
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
                console.error("[useCallRefactored] Error consuming translation stream:", error);
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

    // Simple function to remove translated stream from list
    const removeTranslatedStream = useCallback(
        (targetUserId: string) => {
            setStreams((prevStreams) => prevStreams.filter((stream) => !(stream.id === `remote-${targetUserId}-translated` || (stream.metadata?.isTranslation && stream.metadata?.targetUserId === targetUserId))));
        },
        [setStreams]
    );

    return {
        // State
        streams,
        screenStreams,
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
        removeTranslatedStream,

        // VAD Actions
        startVADListening: () => vadManager.startListening(),
        stopVADListening: () => vadManager.stopListening(),
        getVADRecordings: () => vadManager.getRecordings(),
        clearVADRecordings: () => vadManager.clearRecordings(),

        // Global stream from service
        localStream: mediaManager.getLocalStream(),

        // WebRTC Transports for network monitoring
        recvTransport: refs.recvTransportRef.current,
        sendTransport: refs.sendTransportRef.current,
    };
}
