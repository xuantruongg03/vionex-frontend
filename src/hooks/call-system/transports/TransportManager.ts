import { Device, types as mediasoupTypes } from "mediasoup-client";
import { CallSystemContext } from "../types";

/**
 * Transport Manager Module
 * Handles MediaSoup transport creation and management
 */

export class TransportManager {
    private context: CallSystemContext;
    private producerManager?: any;
    private mediaManager?: any;

    constructor(context: CallSystemContext) {
        this.context = context;
    }

    /**
     * Set manager references for auto-publishing
     */
    setManagers(producerManager: any, mediaManager: any) {
        this.producerManager = producerManager;
        this.mediaManager = mediaManager;
    }

    /**
     * Initialize device with router capabilities
     */
    initializeDevice = async (routerRtpCapabilities: mediasoupTypes.RtpCapabilities) => {
        if (!this.context.refs.deviceRef.current) {
            this.context.refs.deviceRef.current = new Device();
        }

        if (!this.context.refs.deviceRef.current.loaded) {
            try {
                await this.context.refs.deviceRef.current.load({
                    routerRtpCapabilities,
                });

                // Now send device RTP capabilities to SFU
                this.context.refs.socketRef.current?.emit("sfu:set-rtp-capabilities", {
                    rtpCapabilities: this.context.refs.deviceRef.current.rtpCapabilities,
                });

                return true;
            } catch (error) {
                console.error("Error loading device:", error);
                return false;
            }
        } else {
            // Now send device RTP capabilities to SFU
            this.context.refs.socketRef.current?.emit("sfu:set-rtp-capabilities", {
                rtpCapabilities: this.context.refs.deviceRef.current.rtpCapabilities,
            });
            return true;
        }
    };

    /**
     * Create transports after RTP capabilities are set
     */
    createTransports = () => {
        // Prevent creating duplicate transports
        if (this.context.refs.sendTransportRef.current || this.context.refs.recvTransportRef.current) {
            return;
        }

        // Create transports sequentially to avoid race conditions
        this.context.refs.socketRef.current?.emit("sfu:create-transport", {
            roomId: this.context.roomId,
            isProducer: true,
        });

        // Small delay to ensure server processes first transport before second
        setTimeout(() => {
            this.context.refs.socketRef.current?.emit("sfu:create-transport", {
                roomId: this.context.roomId,
                isProducer: false,
            });
        }, 100);
    };

    /**
     * Create send or receive transport
     */
    createTransport = async (transportInfo: any) => {
        try {
            if (!this.context.refs.deviceRef.current) {
                throw new Error("Device not initialized");
            }

            // Extract the actual transport data - remove isProducer before creating transport
            const { isProducer, ...actualTransportInfo } = transportInfo;

            if (!actualTransportInfo.id) {
                throw new Error("Transport info missing required 'id' field");
            }

            // Check if transport already exists to prevent duplicates
            if (isProducer && this.context.refs.sendTransportRef.current) {
                return;
            }

            if (!isProducer && this.context.refs.recvTransportRef.current) {
                return;
            }

            const transport = isProducer ? this.context.refs.deviceRef.current.createSendTransport(actualTransportInfo) : this.context.refs.deviceRef.current.createRecvTransport(actualTransportInfo);

            if (isProducer) {
                this.setupSendTransport(transport);
            } else {
                this.setupReceiveTransport(transport);
            }
        } catch (error) {
            console.error("Error creating transport:", error);
        }
    };

    /**
     * Common transport connection handler
     */
    private createTransportConnectionHandler = (transport: mediasoupTypes.Transport) => {
        return ({ dtlsParameters }: any, callback: () => void, errback: (error: any) => void) => {
            dtlsParameters.role = "client";
            this.context.refs.socketRef.current?.emit("sfu:connect-transport", {
                transportId: transport.id,
                dtlsParameters,
            });

            const handleTransportConnected = (data: { transportId: string }) => {
                if (data.transportId === transport.id) {
                    this.context.refs.socketRef.current?.off("sfu:transport-connected", handleTransportConnected);
                    this.context.refs.socketRef.current?.off("sfu:error", handleError);
                    callback();
                }
            };

            const handleError = (error: any) => {
                this.context.refs.socketRef.current?.off("sfu:transport-connected", handleTransportConnected);
                this.context.refs.socketRef.current?.off("sfu:error", handleError);
                errback(error);
            };

            this.context.refs.socketRef.current?.on("sfu:transport-connected", handleTransportConnected);
            this.context.refs.socketRef.current?.on("sfu:error", handleError);
        };
    };

    /**
     * Setup send transport with event handlers
     */
    private setupSendTransport = (transport: mediasoupTypes.Transport) => {
        this.context.refs.sendTransportRef.current = transport;

        // SETUP EVENT LISTENERS TRƯỚC
        transport.on("connect", this.createTransportConnectionHandler(transport));

        transport.on("produce", async (parameters, callback, errback) => {
            try {
                this.context.refs.socketRef.current?.emit("sfu:produce", {
                    transportId: transport.id,
                    kind: parameters.kind,
                    rtpParameters: parameters.rtpParameters,
                    metadata: parameters.appData || {},
                    // Add participant info to fix the "unknown" issue
                    roomId: this.context.roomId,
                    peerId: this.context.room.username,
                });

                const handleProducerCreated = (data: any) => {
                    // Handle different response formats from server
                    const producerId = data.producerId || data.producer_id || data.id;
                    const streamId = data.streamId || data.stream_id;

                    if (!producerId) {
                        console.error("[WS] Producer ID is missing in response:", data);
                        errback(new Error("Producer ID missing in server response"));
                        return;
                    }

                    this.context.refs.producersRef.current.set(producerId, {
                        producerId: producerId,
                        streamId: streamId,
                        kind: data.kind,
                        appData: data.appData,
                    });

                    this.context.refs.socketRef.current?.off("sfu:producer-created", handleProducerCreated);
                    this.context.refs.socketRef.current?.off("sfu:error", handleProduceError);

                    callback({ id: producerId });
                };

                const handleProduceError = (error: any) => {
                    console.error("[WS] Producer creation error:", error);
                    this.context.refs.socketRef.current?.off("sfu:producer-created", handleProducerCreated);
                    this.context.refs.socketRef.current?.off("sfu:error", handleProduceError);
                    errback(new Error(error.message || "Producer creation failed"));
                };

                this.context.refs.socketRef.current?.on("sfu:producer-created", handleProducerCreated);
                this.context.refs.socketRef.current?.on("sfu:error", handleProduceError);

                // Add timeout to prevent hanging
                setTimeout(() => {
                    this.context.refs.socketRef.current?.off("sfu:producer-created", handleProducerCreated);
                    this.context.refs.socketRef.current?.off("sfu:error", handleProduceError);
                    errback(new Error("Producer creation timeout"));
                }, 10000); // 10 second timeout
            } catch (error) {
                errback(error);
            }
        });

        // Initialize local media when send transport is ready
        transport.on("connectionstatechange", (state) => {
            if (state === "connected") {
                if (!this.context.refs.localStreamRef.current) {
                    setTimeout(async () => {
                        if (this.mediaManager) {
                            await this.mediaManager.initializeLocalMedia();
                        }
                    }, 1000);
                } else if (this.context.refs.producersRef.current.size === 0) {
                    setTimeout(async () => {
                        if (this.producerManager) {
                            await this.producerManager.publishTracks();
                        }
                    }, 500);
                }
            } 
        });

        // If local stream already exists and no producers yet, publish tracks
        if (this.context.refs.localStreamRef.current && this.context.refs.producersRef.current.size === 0 && this.producerManager) {
            queueMicrotask(async () => {
                try {
                    await this.producerManager?.publishTracks();
                } catch (err) {
                    console.error("[TransportManager] Failed to publish:", err);
                }
            });
        }
    };

    /**
     * Setup receive transport with event handlers
     */
    private setupReceiveTransport = (transport: mediasoupTypes.Transport) => {
        this.context.refs.recvTransportRef.current = transport;

        transport.on("connect", this.createTransportConnectionHandler(transport));

        transport.on("connectionstatechange", (state) => {
            if (state === "connected") {
                // Mark transport as ready
                setTimeout(() => {
                    if (!this.context.refs.isInitializedRef.current) {
                        this.context.refs.isInitializedRef.current = true;
                    }
                }, 500);

                // Also request existing streams as fallback
                setTimeout(() => {
                    this.context.refs.socketRef.current?.emit("sfu:get-streams", {
                        roomId: this.context.roomId,
                    });
                }, 1500);

                // Force connection if needed after timeout
                setTimeout(() => {
                    if (transport.connectionState !== "connected") {
                        // Try to trigger the connection by consuming a pending stream
                        const pendingStreams = this.context.refs.pendingStreamsRef.current;
                        if (pendingStreams.length > 0) {
                            const firstStream = pendingStreams[0];

                            // Validate first stream
                            if (firstStream.streamId && firstStream.streamId !== "undefined" && typeof firstStream.streamId === "string" && firstStream.metadata?.type !== "presence" && !this.context.refs.consumingStreamsRef.current.has(firstStream.streamId)) {
                                this.context.refs.consumingStreamsRef.current.add(firstStream.streamId);
                                this.context.refs.socketRef.current?.emit("sfu:consume", {
                                    streamId: firstStream.streamId,
                                    transportId: transport.id,
                                });
                            }
                        }
                    }
                }, 3000);
            }
        });
    };

    /**
     * Handle transport connection confirmation
     */
    handleTransportConnected = (data: { transportId: string }) => {
        // Check if this is our send transport and we have local media ready
        if (this.context.refs.sendTransportRef.current && this.context.refs.sendTransportRef.current.id === data.transportId && this.context.refs.localStreamRef.current) {
            // Transport is connected, we can now publish if we haven't already
            setTimeout(async () => {
                if (this.context.refs.localStreamRef.current && this.context.refs.producersRef.current.size === 0) {
                    if (this.producerManager) {
                        await this.producerManager.publishTracks();
                    } else {
                        console.warn("[TransportManager] ProducerManager not set!");
                    }
                }
            }, 500);
        }
    };

    /**
     * Close and cleanup transports
     */
    cleanup = () => {
        this.context.refs.sendTransportRef.current?.close();
        this.context.refs.recvTransportRef.current?.close();
        this.context.refs.sendTransportRef.current = null;
        this.context.refs.recvTransportRef.current = null;
    };
}
