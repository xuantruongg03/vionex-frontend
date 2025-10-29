import { toast } from "sonner";
import { ActionRoomType } from "@/interfaces/action";
import { CallSystemContext, SocketEventHandlers } from "../types";
import { StreamManager } from "../streams/StreamManager";
import { ConsumerManager } from "../transports/ConsumerManager";
import { ProducerManager } from "../transports/ProducerManager";
import { TransportManager } from "../transports/TransportManager";

/**
 * Socket Event Handlers Module
 * Handles all WebSocket event handlers for the call system
 */

export class SocketEventHandlerManager implements SocketEventHandlers {
    private context: CallSystemContext;
    private streamManager: StreamManager;
    private consumerManager: ConsumerManager;
    private producerManager: ProducerManager;
    private transportManager: TransportManager;

    constructor(context: CallSystemContext, streamManager: StreamManager, consumerManager: ConsumerManager, producerManager: ProducerManager, transportManager: TransportManager) {
        this.context = context;
        this.streamManager = streamManager;
        this.consumerManager = consumerManager;
        this.producerManager = producerManager;
        this.transportManager = transportManager;
    }

    // Getter for consumerManager (used by RoomManager)
    getConsumerManager() {
        return this.consumerManager;
    }

    // Basic connection handlers
    handleConnect = () => {
        this.context.setters.setIsConnected(true);
    };

    handleDisconnect = () => {
        this.context.setters.setIsConnected(false);
    };

    handleJoinSuccess = (data: any) => {
        this.context.setters.setIsWebSocketJoined(true);
    };

    // Peer management handlers
    handlePeerLeft = async (data: { peerId: string; reason?: string }) => {
        // Pass reason to StreamManager so it can show appropriate message
        this.streamManager.removePeerStreams(data.peerId, data.reason);
    };

    // Stream handlers
    handleStreams = async (streams: any[]) => {
        if (!streams || streams.length === 0) {
            return;
        }

        // Process each stream that's not from the current user
        for (const stream of streams) {
            // Normalize stream properties - handle both streamId and stream_id
            const streamId = stream.streamId || stream.stream_id;
            const publisherId = stream.publisherId || stream.publisher_id;
            const metadata = stream.metadata || {};

            // Check if this is a screen share stream
            const isScreenShare = metadata.isScreenShare || metadata.type === "screen" || metadata.type === "screen_audio" || streamId.includes("_screen_") || streamId.includes("_screen_audio_");

            // Skip our own non-screen streams
            if (publisherId === this.context.room.username && !isScreenShare) {
                continue;
            }

            // Validate streamId
            if (!streamId || streamId === "undefined" || typeof streamId !== "string") {
                continue;
            }

            // Check if already consuming this stream
            if (this.streamManager.isStreamBeingConsumed(streamId)) {
                continue;
            }

            // Use WebSocket consume instead of HTTP for consistency
            if (this.context.refs.recvTransportRef.current && this.context.refs.socketRef.current) {
                try {
                    // Mark as consuming
                    this.streamManager.markStreamAsConsuming(streamId);

                    this.context.refs.socketRef.current.emit("sfu:consume", {
                        streamId: streamId,
                        transportId: this.context.refs.recvTransportRef.current.id,
                    });
                } catch (error) {
                    // Remove from consuming list on error
                    this.streamManager.removeFromConsuming(streamId);
                }
            }
        }
    };

    handleStreamAdded = async (data: any) => {
        // Normalize stream properties - handle both streamId and stream_id
        const streamId = data.streamId || data.stream_id || data.id;
        const publisherId = data.publisherId || data.publisher_id || data.peerId;
        const metadata = data.metadata || {};

        // Skip own streams - but allow own screen share streams to be added
        const isOwnStream = publisherId === this.context.room.username;
        const isScreenShare = metadata.isScreenShare || metadata.type === "screen" || metadata.type === "screen_audio" || (streamId && streamId.includes("_screen_")) || (streamId && streamId.includes("_screen_audio_"));

        if (isOwnStream && !isScreenShare) {
            return;
        }

        // For screen share streams, show notification
        if (isScreenShare) {
            if (!isOwnStream) {
                toast.info(`${publisherId} started screen sharing`);
            }
        }

        // Validate streamId
        if (!streamId || streamId === "undefined" || typeof streamId !== "string") {
            return;
        }

        // Check if already consuming this stream
        if (this.streamManager.isStreamBeingConsumed(streamId)) {
            return;
        }

        if (!this.context.refs.recvTransportRef.current || !this.context.refs.socketRef.current) {
            // Add to pending streams queue
            this.streamManager.addToPendingStreams({
                streamId: streamId,
                publisherId: publisherId,
                metadata: data.metadata,
                rtpParameters: data.rtpParameters,
            });

            // Try to consume immediately if we have receive transport but it's just not connected yet
            if (this.context.refs.recvTransportRef.current && this.context.refs.socketRef.current) {
                setTimeout(() => {
                    if (!this.streamManager.isStreamBeingConsumed(streamId) && streamId && streamId !== "undefined" && typeof streamId === "string") {
                        try {
                            this.streamManager.markStreamAsConsuming(streamId);
                            this.context.refs.socketRef.current?.emit("sfu:consume", {
                                streamId: streamId,
                                transportId: this.context.refs.recvTransportRef.current!.id,
                            });
                        } catch (error) {
                            this.streamManager.removeFromConsuming(streamId);
                        }
                    }
                }, 500);
            }

            return;
        }

        try {
            // Mark as consuming
            this.streamManager.markStreamAsConsuming(streamId);

            // Use WebSocket instead of HTTP for consume
            this.context.refs.socketRef.current?.emit("sfu:consume", {
                streamId: streamId,
                transportId: this.context.refs.recvTransportRef.current.id,
            });
        } catch (error) {
            // Remove from consuming list on error
            this.streamManager.removeFromConsuming(streamId);
        }
    };

    handleStreamMetadataUpdated = (data: any) => {
        this.streamManager.updateStreamMetadata(data.streamId, data.metadata, data.publisherId);
    };

    // Consumer handlers
    handleConsumerCreated = async (data: any) => {
        await this.consumerManager.createConsumer(data);
    };

    // FIX: Handle consumer-skipped event to prevent timeout
    // This is emitted when stream is not in priority list (e.g., user not in top N)
    handleConsumerSkipped = (data: { streamId: string; message?: string }) => {
        // Remove from consuming tracking since we won't get a consumer for this stream
        this.streamManager.removeFromConsuming(data.streamId);
    };

    handleConsumerResumed = async (data: any) => {
        await this.consumerManager.resumeConsumer(data);
    };

    handleConsumerRemoved = (data: { consumerId: string; reason: string }) => {
        this.consumerManager.removeConsumer(data);
    };

    // Transport handlers
    handleRouterCapabilities = async (data: { routerRtpCapabilities: any }) => {
        if (!data.routerRtpCapabilities) {
            console.warn("No router RTP capabilities in data");
            return;
        }

        const deviceInitialized = await this.transportManager.initializeDevice(data.routerRtpCapabilities);

        if (deviceInitialized) {
            this.transportManager.createTransports();
        } else {
            console.error("Device initialization failed");
        }

        // Add timeout fallback in case sfu:rtp-capabilities-set is not received
        setTimeout(() => {
            if (!this.context.refs.sendTransportRef.current && !this.context.refs.recvTransportRef.current) {
                this.handleRtpCapabilitiesSet();
            }
        }, 3000);
    };

    handleRtpCapabilitiesSet = () => {
        this.transportManager.createTransports();
    };

    handleTransportCreated = async (transportInfo: any) => {
        await this.transportManager.createTransport(transportInfo);
    };

    handleTransportConnected = (data: { transportId: string }) => {
        this.transportManager.handleTransportConnected(data);

        // Process pending streams when receive transport is connected
        if (this.context.refs.recvTransportRef.current && this.context.refs.recvTransportRef.current.id === data.transportId) {
            this.streamManager.processPendingStreams();
        }

        // Also trigger auto-publish if we have media ready
        if (this.context.refs.sendTransportRef.current && this.context.refs.sendTransportRef.current.id === data.transportId && this.context.refs.localStreamRef.current && this.context.refs.producersRef.current.size === 0) {
            setTimeout(async () => {
                await this.producerManager.publishTracks();
            }, 500);
        }
    };

    // Producer handlers
    handleProducerCreated = (data: any) => {
        this.producerManager.handleProducerCreated(data);
    };

    // Pin/Unpin response handlers
    handlePinResponse = (data: { success: boolean; message: string; consumersCreated?: any[]; alreadyPriority?: boolean; existingConsumer?: boolean; pinnedPeerId?: string }) => {
        if (data.success) {
            // Process consumers created by pin action
            if (data.consumersCreated && data.consumersCreated.length > 0) {
                // Create consumers for each stream
                data.consumersCreated.forEach((consumerData) => {
                    this.consumerManager.createConsumer(consumerData);
                });
            }
        } else {
            toast.error(`Failed to pin user: ${data.message}`);
        }
    };

    handleUnpinResponse = (data: { success: boolean; message: string; consumersRemoved?: string[]; stillInPriority?: boolean; unpinnedPeerId?: string }) => {
        if (data.success) {
            // Process consumers removed by unpin action
            if (data.consumersRemoved && data.consumersRemoved.length > 0) {
                // Remove consumers
                data.consumersRemoved.forEach((consumerId) => {
                    const consumerInfo = this.context.refs.consumersRef.current.get(consumerId);
                    if (consumerInfo) {
                        consumerInfo.consumer.close();
                        this.context.refs.consumersRef.current.delete(consumerId);
                    }
                });
            }
        } else {
            toast.error(`Failed to unpin user: ${data.message}`);
        }
    };

    // Legacy handlers (keeping for compatibility)
    handlePinSuccess = (data: { pinnedPeerId: string; consumersCreated: any[]; alreadyPriority: boolean }) => {
        if (data.alreadyPriority) {
            toast.info(`${data.pinnedPeerId} is already in priority view`);
        } else {
            toast.success(`Successfully pinned ${data.pinnedPeerId}`);
        }

        // Update Redux store with pinned user
        this.context.dispatch({
            type: ActionRoomType.SET_PINNED_USERS,
            payload: data.pinnedPeerId,
        });
    };

    handlePinError = (data: { message: string }) => {
        toast.error(`Failed to pin user: ${data.message}`);
    };

    handleUnpinSuccess = (data: { unpinnedPeerId: string; consumersRemoved: string[]; stillInPriority: boolean }) => {
        if (data.stillInPriority) {
            toast.info(`${data.unpinnedPeerId} is still in priority view`);
        } else {
            toast.success(`Successfully unpinned ${data.unpinnedPeerId}`);

            // Remove streams if consumers were removed
            if (data.consumersRemoved && data.consumersRemoved.length > 0) {
                this.context.setters.setStreams((prev) => prev.filter((stream) => !stream.id.includes(data.unpinnedPeerId)));
            }
        }

        // Update Redux store
        this.context.dispatch({
            type: ActionRoomType.REMOVE_PINNED_USER,
            payload: data.unpinnedPeerId,
        });
    };

    handleUnpinError = (data: { message: string }) => {
        toast.error(`Failed to unpin user: ${data.message}`);
    };

    // Room lock/unlock broadcast handlers (from server to all clients)
    handleRoomLocked = (data: { roomId: string; lockedBy: string; message: string }) => {
        toast.info(`Room locked by ${data.lockedBy}`);
        this.context.dispatch({
            type: ActionRoomType.LOCK_ROOM,
        });
    };

    handleRoomUnlocked = (data: { roomId: string; unlockedBy: string; message: string }) => {
        toast.info(`Room unlocked by ${data.unlockedBy}`);
        this.context.dispatch({
            type: ActionRoomType.UNLOCK_ROOM,
        });
    };

    // ENHANCED: Speaking activity handlers for visual indicators
    handleUserSpeaking = (data: { peerId: string }) => {
        // Add user to speaking peers set for visual indicators
        this.context.setters.setSpeakingPeers((prev) => {
            const newSet = new Set(prev);
            newSet.add(data.peerId);
            return newSet;
        });
    };

    handleUserStoppedSpeaking = (data: { peerId: string }) => {
        // Remove user from speaking peers set
        this.context.setters.setSpeakingPeers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.peerId);
            return newSet;
        });
    };

    // Screen share handlers
    handleScreenShareStarted = (data: { peerId: string; streamId: string }) => {
        toast.info(`${data.peerId} started screen sharing`);
    };

    handleScreenShareStopped = (data: { peerId: string; streamId: string }) => {
        this.streamManager.removeScreenShareStreams(data.peerId);
    };

    // Translation cabin handlers
    handleTranslationCabinUpdate = (data: { action: "created" | "destroyed"; roomId: string; sourceUserId: string; targetUserId: string; sourceLanguage: string; targetLanguage: string }) => {
        if (data.action === "destroyed") {
            // Revert translation stream back to original audio
            this.consumerManager.revertTranslationStream(data.targetUserId);

            // Show notification
            if (data.targetUserId === this.context.room.username) {
                toast.info(`Translation from ${data.sourceUserId} has ended`);
            } else {
                toast.info(`Translation for ${data.targetUserId} has ended`);
            }
        } else if (data.action === "created") {
            // Show notification for new translation
            if (data.targetUserId === this.context.room.username) {
                toast.info(`Translation from ${data.sourceUserId} started`);
            } else {
                toast.info(`Translation for ${data.targetUserId} started`);
            }
        }
    };

    // Voting handlers - Global listeners for notifications
    handleVoteCreated = (data: { id: string; creatorId: string; question: string }) => {
        // Show notification to all users (except creator, they already see it in the dialog)
        if (data.creatorId !== this.context.room.username) {
            toast.info(`${data.creatorId} created a new vote: "${data.question}"`);
        }
    };

    handleVoteEnded = (data: { id: string; question: string }) => {
        toast.info(`Vote ended: "${data.question}"`);
    };

    // Quiz handlers - Global listeners for notifications
    handleQuizCreated = (data: { id?: string; title: string; creator_id?: string; creatorId?: string }) => {
        const creatorId = data.creator_id || data.creatorId;
        // Show notification to all users (except creator, they already see it in the sidebar)
        if (creatorId !== this.context.room.username) {
            toast.info(`${creatorId} created a new quiz: "${data.title}"`);
        }
    };

    handleQuizEnded = (data: { quiz_session?: { title: string } }) => {
        const title = data.quiz_session?.title || "Quiz";
        toast.info(`Quiz ended: "${title}"`);
    };

    /**
     * Register all event handlers with socket
     */
    registerHandlers = (socket: any) => {
        // Connection handlers
        socket.on("connect", this.handleConnect);
        socket.on("disconnect", this.handleDisconnect);
        socket.on("sfu:join-success", this.handleJoinSuccess);

        // Peer handlers
        socket.on("sfu:peer-left", this.handlePeerLeft);

        // Stream handlers
        socket.on("sfu:streams", this.handleStreams);
        socket.on("sfu:stream-added", this.handleStreamAdded);
        socket.on("sfu:stream-metadata-updated", this.handleStreamMetadataUpdated);
        socket.on("sfu:stream-removed", (data: any) => {
            const streamId = data.streamId;
            if (streamId) {
                this.streamManager.removeStream(streamId, data.isScreenShare, data.publisherId);

                // Also remove from consuming tracking
                this.streamManager.removeFromConsuming(streamId);

                // Use isScreenShare from data instead of parsing streamId
                if (data.isScreenShare) {
                    toast.info(`${data.publisherId} stopped screen sharing`);
                }
            }
        });

        // Consumer handlers
        socket.on("sfu:consumer-created", this.handleConsumerCreated);
        socket.on("sfu:consumer-skipped", this.handleConsumerSkipped); // FIX: Handle skipped consumers
        socket.on("sfu:consumer-resumed", this.handleConsumerResumed);
        socket.on("sfu:consumer-removed", this.handleConsumerRemoved);

        // Transport handlers
        socket.on("sfu:router-capabilities", this.handleRouterCapabilities);
        socket.on("sfu:rtp-capabilities-set", this.handleRtpCapabilitiesSet);
        socket.on("sfu:transport-created", this.handleTransportCreated);
        socket.on("sfu:transport-connected", this.handleTransportConnected);

        // Producer handlers
        socket.on("sfu:producer-created", this.handleProducerCreated);

        // Pin/Unpin handlers
        // Pin/Unpin response handlers
        socket.on("sfu:pin-user-response", this.handlePinResponse);
        socket.on("sfu:unpin-user-response", this.handleUnpinResponse);

        socket.on("sfu:unpin-success", this.handleUnpinSuccess);
        socket.on("sfu:unpin-error", this.handleUnpinError);

        // Room lock/unlock broadcast handlers
        socket.on("sfu:room-locked", this.handleRoomLocked);
        socket.on("sfu:room-unlocked", this.handleRoomUnlocked);

        // ENHANCED: Speaking activity handlers for visual indicators
        socket.on("sfu:user-speaking", this.handleUserSpeaking);
        socket.on("sfu:user-stopped-speaking", this.handleUserStoppedSpeaking);

        // Screen share handlers
        socket.on("sfu:screen-share-started", this.handleScreenShareStarted);
        socket.on("sfu:screen-share-stopped", this.handleScreenShareStopped);

        // Translation cabin handlers
        socket.on("translation:cabin-update", this.handleTranslationCabinUpdate);

        // Voting handlers - Global listeners for notifications
        socket.on("sfu:vote-created", this.handleVoteCreated);
        socket.on("sfu:vote-ended", this.handleVoteEnded);

        // Quiz handlers - Global listeners for notifications
        socket.on("quiz:created", this.handleQuizCreated);
        socket.on("quiz:ended", this.handleQuizEnded);
    };

    /**
     * Unregister all event handlers from socket
     */
    unregisterHandlers = (socket: any) => {
        // Connection handlers
        socket.off("connect", this.handleConnect);
        socket.off("disconnect", this.handleDisconnect);
        socket.off("sfu:join-success", this.handleJoinSuccess);

        // Peer handlers
        socket.off("sfu:peer-left", this.handlePeerLeft);

        // Stream handlers
        socket.off("sfu:streams", this.handleStreams);
        socket.off("sfu:stream-added", this.handleStreamAdded);
        socket.off("sfu:stream-metadata-updated", this.handleStreamMetadataUpdated);
        socket.off("sfu:stream-removed");

        // Consumer handlers
        socket.off("sfu:consumer-created", this.handleConsumerCreated);
        socket.off("sfu:consumer-skipped", this.handleConsumerSkipped); 
        socket.off("sfu:consumer-resumed", this.handleConsumerResumed);
        socket.off("sfu:consumer-removed", this.handleConsumerRemoved);

        // Transport handlers
        socket.off("sfu:router-capabilities", this.handleRouterCapabilities);
        socket.off("sfu:rtp-capabilities-set", this.handleRtpCapabilitiesSet);
        socket.off("sfu:transport-created", this.handleTransportCreated);
        socket.off("sfu:transport-connected", this.handleTransportConnected);

        // Producer handlers
        socket.off("sfu:producer-created", this.handleProducerCreated);

        // Pin/Unpin handlers
        // Pin/Unpin response handlers
        socket.off("sfu:pin-user-response", this.handlePinResponse);
        socket.off("sfu:unpin-user-response", this.handleUnpinResponse);

        // Legacy handlers
        socket.off("sfu:pin-success", this.handlePinSuccess);
        socket.off("sfu:pin-error", this.handlePinError);
        socket.off("sfu:unpin-success", this.handleUnpinSuccess);
        socket.off("sfu:unpin-error", this.handleUnpinError);

        // Room lock/unlock broadcast handlers
        socket.off("sfu:room-locked", this.handleRoomLocked);
        socket.off("sfu:room-unlocked", this.handleRoomUnlocked);

        // ENHANCED: Speaking activity handlers for visual indicators
        socket.off("sfu:user-speaking", this.handleUserSpeaking);
        socket.off("sfu:user-stopped-speaking", this.handleUserStoppedSpeaking);

        // Screen share handlers
        socket.off("sfu:screen-share-started", this.handleScreenShareStarted);
        socket.off("sfu:screen-share-stopped", this.handleScreenShareStopped);

        // Translation cabin handlers
        socket.off("translation:cabin-update", this.handleTranslationCabinUpdate);

        // Voting handlers
        socket.off("sfu:vote-created", this.handleVoteCreated);
        socket.off("sfu:vote-ended", this.handleVoteEnded);

        // Quiz handlers
        socket.off("quiz:created", this.handleQuizCreated);
        socket.off("quiz:ended", this.handleQuizEnded);
    };
}
