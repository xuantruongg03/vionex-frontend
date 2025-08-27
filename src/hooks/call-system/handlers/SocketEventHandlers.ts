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

    constructor(
        context: CallSystemContext,
        streamManager: StreamManager,
        consumerManager: ConsumerManager,
        producerManager: ProducerManager,
        transportManager: TransportManager
    ) {
        this.context = context;
        this.streamManager = streamManager;
        this.consumerManager = consumerManager;
        this.producerManager = producerManager;
        this.transportManager = transportManager;
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
    handlePeerLeft = async (data: { peerId: string }) => {
        this.streamManager.removePeerStreams(data.peerId);
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
            const isScreenShare =
                metadata.isScreenShare ||
                metadata.type === "screen" ||
                metadata.type === "screen_audio" ||
                streamId.includes("_screen_") ||
                streamId.includes("_screen_audio_");

            // Skip our own non-screen streams
            if (publisherId === this.context.room.username && !isScreenShare) {
                continue;
            }

            // Validate streamId
            if (
                !streamId ||
                streamId === "undefined" ||
                typeof streamId !== "string"
            ) {
                continue;
            }

            // Check if already consuming this stream
            if (this.streamManager.isStreamBeingConsumed(streamId)) {
                continue;
            }

            // Use WebSocket consume instead of HTTP for consistency
            if (
                this.context.refs.recvTransportRef.current &&
                this.context.refs.socketRef.current
            ) {
                try {
                    // Mark as consuming
                    this.streamManager.markStreamAsConsuming(streamId);

                    this.context.refs.socketRef.current.emit("sfu:consume", {
                        streamId: streamId,
                        transportId:
                            this.context.refs.recvTransportRef.current.id,
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
        const publisherId =
            data.publisherId || data.publisher_id || data.peerId;
        const metadata = data.metadata || {};

        // Skip own streams - but allow own screen share streams to be added
        const isOwnStream = publisherId === this.context.room.username;
        const isScreenShare =
            metadata.isScreenShare ||
            metadata.type === "screen" ||
            metadata.type === "screen_audio" ||
            streamId.includes("_screen_") ||
            streamId.includes("_screen_audio_");

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
        if (
            !streamId ||
            streamId === "undefined" ||
            typeof streamId !== "string"
        ) {
            return;
        }

        // Check if already consuming this stream
        if (this.streamManager.isStreamBeingConsumed(streamId)) {
            return;
        }

        if (
            !this.context.refs.recvTransportRef.current ||
            !this.context.refs.socketRef.current
        ) {
            // Add to pending streams queue
            this.streamManager.addToPendingStreams({
                streamId: streamId,
                publisherId: publisherId,
                metadata: data.metadata,
                rtpParameters: data.rtpParameters,
            });

            // Try to consume immediately if we have receive transport but it's just not connected yet
            if (
                this.context.refs.recvTransportRef.current &&
                this.context.refs.socketRef.current
            ) {
                setTimeout(() => {
                    if (
                        !this.streamManager.isStreamBeingConsumed(streamId) &&
                        streamId &&
                        streamId !== "undefined" &&
                        typeof streamId === "string"
                    ) {
                        try {
                            this.streamManager.markStreamAsConsuming(streamId);
                            this.context.refs.socketRef.current?.emit(
                                "sfu:consume",
                                {
                                    streamId: streamId,
                                    transportId:
                                        this.context.refs.recvTransportRef
                                            .current!.id,
                                }
                            );
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
        this.streamManager.updateStreamMetadata(
            data.streamId,
            data.metadata,
            data.publisherId
        );
    };

    // Consumer handlers
    handleConsumerCreated = async (data: any) => {
        await this.consumerManager.createConsumer(data);
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

        const deviceInitialized = await this.transportManager.initializeDevice(
            data.routerRtpCapabilities
        );

        if (deviceInitialized) {
            this.transportManager.createTransports();
        } else {
            console.error("Device initialization failed");
        }

        // Add timeout fallback in case sfu:rtp-capabilities-set is not received
        setTimeout(() => {
            if (
                !this.context.refs.sendTransportRef.current &&
                !this.context.refs.recvTransportRef.current
            ) {
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
        if (
            this.context.refs.recvTransportRef.current &&
            this.context.refs.recvTransportRef.current.id === data.transportId
        ) {
            this.streamManager.processPendingStreams();
        }

        // Also trigger auto-publish if we have media ready
        if (
            this.context.refs.sendTransportRef.current &&
            this.context.refs.sendTransportRef.current.id ===
                data.transportId &&
            this.context.refs.localStreamRef.current &&
            this.context.refs.producersRef.current.size === 0
        ) {
            setTimeout(async () => {
                await this.producerManager.publishTracks();
            }, 500);
        }
    };

    // Producer handlers
    handleProducerCreated = (data: any) => {
        this.producerManager.handleProducerCreated(data);
    };

    // Pin/Unpin handlers
    handlePinSuccess = (data: {
        pinnedPeerId: string;
        consumersCreated: any[];
        alreadyPriority: boolean;
    }) => {
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

    handleUnpinSuccess = (data: {
        unpinnedPeerId: string;
        consumersRemoved: string[];
        stillInPriority: boolean;
    }) => {
        if (data.stillInPriority) {
            toast.info(`${data.unpinnedPeerId} is still in priority view`);
        } else {
            toast.success(`Successfully unpinned ${data.unpinnedPeerId}`);

            // Remove streams if consumers were removed
            if (data.consumersRemoved && data.consumersRemoved.length > 0) {
                this.context.setters.setStreams((prev) =>
                    prev.filter(
                        (stream) => !stream.id.includes(data.unpinnedPeerId)
                    )
                );
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

    // Room lock/unlock handlers
    handleLockSuccess = (data: { roomId: string; message: string }) => {
        toast.success("Room locked successfully");
        this.context.dispatch({
            type: ActionRoomType.LOCK_ROOM,
            payload: {
                isLocked: true,
            },
        });
    };

    handleLockError = (data: { message: string }) => {
        toast.error(`Failed to lock room: ${data.message}`);
    };

    handleUnlockSuccess = (data: { roomId: string; message: string }) => {
        toast.success("Room unlocked successfully");
        this.context.dispatch({
            type: ActionRoomType.UNLOCK_ROOM,
            payload: {
                isLocked: false,
            },
        });
    };

    handleUnlockError = (data: { message: string }) => {
        toast.error(`Failed to unlock room: ${data.message}`);
    };

    handleRoomLocked = (data: {
        roomId: string;
        lockedBy: string;
        message: string;
    }) => {
        toast.info(`Room locked by ${data.lockedBy}`);
    };

    handleRoomUnlocked = (data: {
        roomId: string;
        unlockedBy: string;
        message: string;
    }) => {
        toast.info(`Room unlocked by ${data.unlockedBy}`);
    };

    // Screen share handlers
    handleScreenShareStarted = (data: { peerId: string; streamId: string }) => {
        toast.info(`${data.peerId} started screen sharing`);
    };

    handleScreenShareStopped = (data: { peerId: string; streamId: string }) => {
        this.streamManager.removeScreenShareStreams(data.peerId);
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
        socket.on(
            "sfu:stream-metadata-updated",
            this.handleStreamMetadataUpdated
        );
        socket.on("sfu:stream-removed", (data: any) => {
            this.streamManager.removeStream(data.streamId || data.stream_id);
        });

        // Consumer handlers
        socket.on("sfu:consumer-created", this.handleConsumerCreated);
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
        socket.on("sfu:pin-success", this.handlePinSuccess);
        socket.on("sfu:pin-error", this.handlePinError);
        socket.on("sfu:unpin-success", this.handleUnpinSuccess);
        socket.on("sfu:unpin-error", this.handleUnpinError);

        // Room lock/unlock handlers
        socket.on("sfu:lock-success", this.handleLockSuccess);
        socket.on("sfu:lock-error", this.handleLockError);
        socket.on("sfu:unlock-success", this.handleUnlockSuccess);
        socket.on("sfu:unlock-error", this.handleUnlockError);
        socket.on("sfu:room-locked", this.handleRoomLocked);
        socket.on("sfu:room-unlocked", this.handleRoomUnlocked);

        // Screen share handlers
        socket.on("sfu:screen-share-started", this.handleScreenShareStarted);
        socket.on("sfu:screen-share-stopped", this.handleScreenShareStopped);
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
        socket.off(
            "sfu:stream-metadata-updated",
            this.handleStreamMetadataUpdated
        );
        socket.off("sfu:stream-removed");

        // Consumer handlers
        socket.off("sfu:consumer-created", this.handleConsumerCreated);
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
        socket.off("sfu:pin-success", this.handlePinSuccess);
        socket.off("sfu:pin-error", this.handlePinError);
        socket.off("sfu:unpin-success", this.handleUnpinSuccess);
        socket.off("sfu:unpin-error", this.handleUnpinError);

        // Room lock/unlock handlers
        socket.off("sfu:lock-success", this.handleLockSuccess);
        socket.off("sfu:lock-error", this.handleLockError);
        socket.off("sfu:unlock-success", this.handleUnlockSuccess);
        socket.off("sfu:unlock-error", this.handleUnlockError);
        socket.off("sfu:room-locked", this.handleRoomLocked);
        socket.off("sfu:room-unlocked", this.handleRoomUnlocked);

        // Screen share handlers
        socket.off("sfu:screen-share-started", this.handleScreenShareStarted);
        socket.off("sfu:screen-share-stopped", this.handleScreenShareStopped);
    };
}
