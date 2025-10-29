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
                // console.log("[TransportManager] Producer event triggered:", {
                //     kind: parameters.kind,
                //     appData: parameters.appData,
                //     transportId: transport.id,
                // });

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
                    // console.log("[TransportManager] sfu:producer-created received:", data);

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

                    // console.log("[TransportManager] Producer registered:", {
                    //     producerId,
                    //     streamId,
                    //     kind: data.kind,
                    //     totalProducers: this.context.refs.producersRef.current.size,
                    // });

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
                    const stillWaiting = this.context.refs.socketRef.current?.listeners("sfu:producer-created").includes(handleProducerCreated);
                    if (stillWaiting) {
                        console.error("[TransportManager] Producer creation timeout - no response after 10s");
                        this.context.refs.socketRef.current?.off("sfu:producer-created", handleProducerCreated);
                        this.context.refs.socketRef.current?.off("sfu:error", handleProduceError);
                        errback(new Error("Producer creation timeout"));
                    }
                }, 10000); // 10 second timeout
            } catch (error) {
                console.error("[TransportManager] Error in produce handler:", error);
                errback(error);
            }
        });

        // Listen for connection state changes and publish when ready
        transport.on("connectionstatechange", (state) => {
            console.log("[TransportManager] Send transport state changed:", state);
            
            if (state === "connected") {
                // Transport is ready, try to publish
                queueMicrotask(async () => {
                    await this.tryPublishTracks("transport-connected");
                });
            } else if (state === "failed" || state === "disconnected") {
                console.error("[TransportManager] Send transport state:", state);
            }
        });
    };

    /**
     * Try to publish tracks with retry logic (event-driven)
     */
    private async tryPublishTracks(source: string, maxRetries: number = 3): Promise<void> {
        console.log(`[TransportManager] tryPublishTracks called from: ${source}`);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check all conditions
                const transportConnected = this.context.refs.sendTransportRef.current?.connectionState === "connected";
                const deviceLoaded = this.context.refs.deviceRef.current?.loaded;
                const hasLocalStream = !!this.context.refs.localStreamRef.current;
                const noProducers = this.context.refs.producersRef.current.size === 0;
                const notPublishing = !this.context.refs.isPublishingRef.current;

                const canPublish = transportConnected && deviceLoaded && hasLocalStream && noProducers && notPublishing;

                if (!canPublish) {
                    console.log(`[TransportManager] Attempt ${attempt}/${maxRetries} - Waiting for conditions...`, {
                        transportConnected,
                        deviceLoaded,
                        hasLocalStream,
                        noProducers,
                        notPublishing,
                    });
                    
                    // Wait 500ms before retry
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        continue;
                    } else {
                        console.warn("[TransportManager] Conditions not met after retries - will try again on next event");
                        return;
                    }
                }

                // Try to publish
                console.log(`[TransportManager] ✅ Attempt ${attempt}/${maxRetries} - Publishing tracks...`);
                await this.producerManager?.publishTracks();
                console.log("[TransportManager] ✅ Tracks published successfully!");
                
                // Sync metadata after successful publish
                if (this.mediaManager?.syncMetadataWithTrackStates) {
                    await this.mediaManager.syncMetadataWithTrackStates();
                    console.log("[TransportManager] ✅ Metadata synced with track states");
                }
                
                return;
                
            } catch (err) {
                console.error(`[TransportManager] Attempt ${attempt}/${maxRetries} failed:`, err);
                
                if (attempt < maxRetries) {
                    console.log(`[TransportManager] Retrying in 500ms...`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    console.error("[TransportManager] ❌ Failed to publish tracks after all retries");
                }
            }
        }
    }

    /**
     * Setup receive transport with event handlers
     */
    private setupReceiveTransport = (transport: mediasoupTypes.Transport) => {
        this.context.refs.recvTransportRef.current = transport;

        transport.on("connect", this.createTransportConnectionHandler(transport));

        transport.on("connectionstatechange", (state) => {
            // console.log("[TransportManager] Receive transport state changed:", state);

            if (state === "connected") {
                // console.log("[TransportManager] Receive transport CONNECTED!");

                // Mark transport as ready
                setTimeout(() => {
                    if (!this.context.refs.isInitializedRef.current) {
                        this.context.refs.isInitializedRef.current = true;
                        console.log("[TransportManager] System marked as initialized");
                    }
                }, 500);

                // Also request existing streams as fallback
                setTimeout(() => {
                    console.log("[TransportManager] Requesting existing streams...");
                    this.context.refs.socketRef.current?.emit("sfu:get-streams", {
                        roomId: this.context.roomId,
                    });
                }, 1500);

                // Force connection if needed after timeout
                setTimeout(() => {
                    if (transport.connectionState !== "connected") {
                        console.warn("[TransportManager] Receive transport still not connected, trying to trigger connection");
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
            } else if (state === "failed" || state === "disconnected") {
                console.error("[TransportManager] Receive transport state:", state);
            }
        });
    };

    /**
     * Handle transport connection confirmation
     */
    handleTransportConnected = (data: { transportId: string }) => {
        // Just log, no publishing here - let queueMicrotask handle it
        console.log("[TransportManager] Transport connected confirmed:", data.transportId);
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
