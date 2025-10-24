import { Device, types as mediasoupTypes } from "mediasoup-client";
import { CallSystemContext } from "../types";

console.log('[TransportManager] 🎬 Module loaded at', new Date().toISOString());

/**
 * Transport Manager Module
 * Handles MediaSoup transport creation and management
 */

export class TransportManager {
    private context: CallSystemContext;
    private producerManager?: any;
    private mediaManager?: any;

    constructor(context: CallSystemContext) {
        console.log('[TransportManager] 🏗️ Constructor called', {
            roomId: context.roomId,
            username: context.room?.username,
            timestamp: new Date().toISOString(),
        });
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
    initializeDevice = async (
        routerRtpCapabilities: mediasoupTypes.RtpCapabilities
    ) => {
        if (!this.context.refs.deviceRef.current) {
            this.context.refs.deviceRef.current = new Device();
        }

        if (!this.context.refs.deviceRef.current.loaded) {
            try {
                await this.context.refs.deviceRef.current.load({
                    routerRtpCapabilities,
                });

                // Now send device RTP capabilities to SFU
                this.context.refs.socketRef.current?.emit(
                    "sfu:set-rtp-capabilities",
                    {
                        rtpCapabilities:
                            this.context.refs.deviceRef.current.rtpCapabilities,
                    }
                );

                return true;
            } catch (error) {
                console.error("Error loading device:", error);
                return false;
            }
        } else {
            // Now send device RTP capabilities to SFU
            this.context.refs.socketRef.current?.emit(
                "sfu:set-rtp-capabilities",
                {
                    rtpCapabilities:
                        this.context.refs.deviceRef.current.rtpCapabilities,
                }
            );
            return true;
        }
    };

    /**
     * Create transports after RTP capabilities are set
     */
    createTransports = () => {
        const stack = new Error().stack;
        console.log('[TransportManager] createTransports called', {
            timestamp: new Date().toISOString(),
            hasSendTransport: !!this.context.refs.sendTransportRef.current,
            hasRecvTransport: !!this.context.refs.recvTransportRef.current,
            sendTransportId: this.context.refs.sendTransportRef.current?.id,
            recvTransportId: this.context.refs.recvTransportRef.current?.id,
            socketConnected: this.context.refs.socketRef.current?.connected,
            roomId: this.context.roomId,
            callStack: stack?.split('\n').slice(1, 4).join('\n'), // Show caller
        });

        // Prevent creating duplicate transports
        if (this.context.refs.sendTransportRef.current || this.context.refs.recvTransportRef.current) {
            console.warn('[TransportManager] ⚠️ Skipping transport creation - transports already exist', {
                hasSend: !!this.context.refs.sendTransportRef.current,
                hasRecv: !!this.context.refs.recvTransportRef.current,
            });
            return;
        }
        
        // Create transports sequentially to avoid race conditions
        console.log('[TransportManager] 📤 Emitting sfu:create-transport for SEND (producer)');
        this.context.refs.socketRef.current?.emit("sfu:create-transport", {
            roomId: this.context.roomId,
            isProducer: true,
        });

        // Small delay to ensure server processes first transport before second
        setTimeout(() => {
            console.log('[TransportManager] 📥 Emitting sfu:create-transport for RECEIVE (consumer) - after 100ms delay');
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
            console.log('[TransportManager] 🚀 createTransport called', {
                timestamp: new Date().toISOString(),
                isProducer: transportInfo.isProducer,
                transportId: transportInfo.id,
                hasDevice: !!this.context.refs.deviceRef.current,
                deviceLoaded: this.context.refs.deviceRef.current?.loaded,
                currentSendTransport: this.context.refs.sendTransportRef.current?.id,
                currentRecvTransport: this.context.refs.recvTransportRef.current?.id,
            });

            if (!this.context.refs.deviceRef.current) {
                console.error('[TransportManager] ❌ Device not initialized');
                throw new Error("Device not initialized");
            }

            // Extract the actual transport data - remove isProducer before creating transport
            const { isProducer, ...actualTransportInfo } = transportInfo;

            if (!actualTransportInfo.id) {
                console.error('[TransportManager] ❌ Transport info missing ID', actualTransportInfo);
                throw new Error("Transport info missing required 'id' field");
            }

            // Check if transport already exists to prevent duplicates
            if (isProducer && this.context.refs.sendTransportRef.current) {
                console.warn('[TransportManager] ⚠️ Send transport already exists, skipping', {
                    existingId: this.context.refs.sendTransportRef.current.id,
                    newId: actualTransportInfo.id,
                });
                return;
            }
            
            if (!isProducer && this.context.refs.recvTransportRef.current) {
                console.warn('[TransportManager] ⚠️ Receive transport already exists, skipping', {
                    existingId: this.context.refs.recvTransportRef.current.id,
                    newId: actualTransportInfo.id,
                });
                return;
            }

            console.log('[TransportManager] ✅ Creating transport', {
                type: isProducer ? 'SEND' : 'RECEIVE',
                transportId: actualTransportInfo.id,
                iceServers: transportInfo.iceServers?.length || 0,
            });

            const transport = isProducer
                ? this.context.refs.deviceRef.current.createSendTransport(
                      actualTransportInfo
                  )
                : this.context.refs.deviceRef.current.createRecvTransport(
                      actualTransportInfo
                  );

            console.log('[TransportManager] 🎉 Transport created successfully', {
                type: isProducer ? 'SEND' : 'RECEIVE',
                transportId: transport.id,
                connectionState: transport.connectionState,
            });

            if (isProducer) {
                this.setupSendTransport(transport);
            } else {
                this.setupReceiveTransport(transport);
            }
        } catch (error) {
            console.error("[TransportManager] ❌ Error creating transport:", error);
            console.error('[TransportManager] Error details:', {
                message: error.message,
                stack: error.stack,
                transportInfo: JSON.stringify(transportInfo, null, 2),
            });
        }
    };

    /**
     * Common transport connection handler
     */
    private createTransportConnectionHandler = (
        transport: mediasoupTypes.Transport
    ) => {
        return (
            { dtlsParameters }: any,
            callback: () => void,
            errback: (error: any) => void
        ) => {
            const transportType = this.context.refs.sendTransportRef.current?.id === transport.id ? 'SEND' : 'RECEIVE';
            
            console.log(`[TransportManager] 🔌 ${transportType} transport connect event`, {
                transportId: transport.id,
                dtlsRole: dtlsParameters.role,
                connectionState: transport.connectionState,
            });

            dtlsParameters.role = "client";
            
            console.log(`[TransportManager] 📡 Emitting sfu:connect-transport for ${transportType}`, {
                transportId: transport.id,
            });

            this.context.refs.socketRef.current?.emit("sfu:connect-transport", {
                transportId: transport.id,
                dtlsParameters,
            });

            const handleTransportConnected = (data: {
                transportId: string;
            }) => {
                if (data.transportId === transport.id) {
                    console.log(`[TransportManager] ✅ ${transportType} transport connected confirmation`, {
                        transportId: transport.id,
                        connectionState: transport.connectionState,
                    });

                    this.context.refs.socketRef.current?.off(
                        "sfu:transport-connected",
                        handleTransportConnected
                    );
                    this.context.refs.socketRef.current?.off(
                        "sfu:error",
                        handleError
                    );
                    callback();
                }
            };

            const handleError = (error: any) => {
                console.error(`[TransportManager] ❌ ${transportType} transport connection error`, {
                    transportId: transport.id,
                    error: error.message || error,
                });

                this.context.refs.socketRef.current?.off(
                    "sfu:transport-connected",
                    handleTransportConnected
                );
                this.context.refs.socketRef.current?.off(
                    "sfu:error",
                    handleError
                );
                errback(error);
            };

            this.context.refs.socketRef.current?.on(
                "sfu:transport-connected",
                handleTransportConnected
            );
            this.context.refs.socketRef.current?.on("sfu:error", handleError);

            // Add timeout for connect confirmation
            setTimeout(() => {
                console.warn(`[TransportManager] ⏱️ ${transportType} transport connect timeout`, {
                    transportId: transport.id,
                });
                this.context.refs.socketRef.current?.off(
                    "sfu:transport-connected",
                    handleTransportConnected
                );
                this.context.refs.socketRef.current?.off(
                    "sfu:error",
                    handleError
                );
                // Don't call errback on timeout - let mediasoup retry
            }, 15000); // 15 second timeout
        };
    };

    /**
     * Setup send transport with event handlers
     */
    private setupSendTransport = (transport: mediasoupTypes.Transport) => {
        console.log('[TransportManager] 📤 Setting up SEND transport', {
            transportId: transport.id,
            connectionState: transport.connectionState,
        });

        this.context.refs.sendTransportRef.current = transport;

        transport.on(
            "connect",
            this.createTransportConnectionHandler(transport)
        );

        transport.on("produce", async (parameters, callback, errback) => {
            console.log('[TransportManager] 🎬 Produce event triggered', {
                transportId: transport.id,
                kind: parameters.kind,
                hasAppData: !!parameters.appData,
            });

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

                console.log('[TransportManager] 📡 Emitted sfu:produce', {
                    transportId: transport.id,
                    kind: parameters.kind,
                    peerId: this.context.room.username,
                });

                const handleProducerCreated = (data: any) => {
                    // Handle different response formats from server
                    const producerId =
                        data.producerId || data.producer_id || data.id;
                    const streamId = data.streamId || data.stream_id;

                    console.log('[TransportManager] ✅ Producer created', {
                        producerId,
                        streamId,
                        kind: data.kind,
                    });

                    if (!producerId) {
                        console.error(
                            "[TransportManager] ❌ Producer ID is missing in response:",
                            data
                        );
                        errback(
                            new Error("Producer ID missing in server response")
                        );
                        return;
                    }

                    this.context.refs.producersRef.current.set(producerId, {
                        producerId: producerId,
                        streamId: streamId,
                        kind: data.kind,
                        appData: data.appData,
                    });

                    this.context.refs.socketRef.current?.off(
                        "sfu:producer-created",
                        handleProducerCreated
                    );
                    this.context.refs.socketRef.current?.off(
                        "sfu:error",
                        handleProduceError
                    );

                    callback({ id: producerId });
                };

                const handleProduceError = (error: any) => {
                    console.error("[TransportManager] ❌ Producer creation error:", error);
                    this.context.refs.socketRef.current?.off(
                        "sfu:producer-created",
                        handleProducerCreated
                    );
                    this.context.refs.socketRef.current?.off(
                        "sfu:error",
                        handleProduceError
                    );
                    errback(
                        new Error(error.message || "Producer creation failed")
                    );
                };

                this.context.refs.socketRef.current?.on(
                    "sfu:producer-created",
                    handleProducerCreated
                );
                this.context.refs.socketRef.current?.on(
                    "sfu:error",
                    handleProduceError
                );

                // Add timeout to prevent hanging
                setTimeout(() => {
                    this.context.refs.socketRef.current?.off(
                        "sfu:producer-created",
                        handleProducerCreated
                    );
                    this.context.refs.socketRef.current?.off(
                        "sfu:error",
                        handleProduceError
                    );
                    console.error('[TransportManager] ⏱️ Producer creation timeout');
                    errback(new Error("Producer creation timeout"));
                }, 10000); // 10 second timeout
            } catch (error) {
                console.error('[TransportManager] ❌ Error in produce handler:', error);
                errback(error);
            }
        });

        // Initialize local media when send transport is ready
        transport.on("connectionstatechange", (state) => {
            console.log('[TransportManager] 📤 Send transport state changed', {
                transportId: transport.id,
                state,
                previousState: transport.connectionState,
                hasLocalStream: !!this.context.refs.localStreamRef.current,
                producersCount: this.context.refs.producersRef.current.size,
            });

            if (state === "connected") {
                console.log('[TransportManager] ✅ Send transport CONNECTED');
                if (!this.context.refs.localStreamRef.current) {
                    console.log('[TransportManager] 🎥 Will initialize local media in 1s');
                    setTimeout(async () => {
                        if (this.mediaManager) {
                            await this.mediaManager.initializeLocalMedia();
                        }
                    }, 1000);
                } else if (this.context.refs.producersRef.current.size === 0) {
                    console.log('[TransportManager] 📢 Will publish tracks in 500ms');
                    setTimeout(async () => {
                        if (this.producerManager) {
                            await this.producerManager.publishTracks();
                        }
                    }, 500);
                }
            } else if (state === "failed" || state === "disconnected") {
                console.error('[TransportManager] ❌ Send transport connection issue', {
                    state,
                    transportId: transport.id,
                });
            }
        });
    };

    /**
     * Setup receive transport with event handlers
     */
    private setupReceiveTransport = (transport: mediasoupTypes.Transport) => {
        console.log('[TransportManager] 📥 Setting up RECEIVE transport', {
            transportId: transport.id,
            connectionState: transport.connectionState,
        });

        this.context.refs.recvTransportRef.current = transport;

        transport.on(
            "connect",
            this.createTransportConnectionHandler(transport)
        );

        transport.on("connectionstatechange", (state) => {
            console.log('[TransportManager] 📥 Receive transport state changed', {
                transportId: transport.id,
                state,
                previousState: transport.connectionState,
                isInitialized: this.context.refs.isInitializedRef.current,
            });

            if (state === "connected") {
                console.log('[TransportManager] ✅ Receive transport CONNECTED');
                
                // Mark transport as ready
                setTimeout(() => {
                    if (!this.context.refs.isInitializedRef.current) {
                        this.context.refs.isInitializedRef.current = true;
                        console.log('[TransportManager] 🎯 Marked as initialized');
                    }
                }, 500);

                // Also request existing streams as fallback
                setTimeout(() => {
                    console.log('[TransportManager] 📡 Requesting existing streams');
                    this.context.refs.socketRef.current?.emit(
                        "sfu:get-streams",
                        {
                            roomId: this.context.roomId,
                        }
                    );
                }, 1500);

                // Force connection if needed after timeout
                setTimeout(() => {
                    if (transport.connectionState !== "connected") {
                        console.warn('[TransportManager] ⚠️ Transport not connected after 3s, trying to consume pending stream');
                        // Try to trigger the connection by consuming a pending stream
                        const pendingStreams =
                            this.context.refs.pendingStreamsRef.current;
                        if (pendingStreams.length > 0) {
                            const firstStream = pendingStreams[0];

                            console.log('[TransportManager] 🔄 Attempting to consume first pending stream', {
                                streamId: firstStream.streamId,
                                type: firstStream.metadata?.type,
                            });

                            // Validate first stream
                            if (
                                firstStream.streamId &&
                                firstStream.streamId !== "undefined" &&
                                typeof firstStream.streamId === "string" &&
                                firstStream.metadata?.type !== "presence" &&
                                !this.context.refs.consumingStreamsRef.current.has(
                                    firstStream.streamId
                                )
                            ) {
                                this.context.refs.consumingStreamsRef.current.add(
                                    firstStream.streamId
                                );
                                this.context.refs.socketRef.current?.emit(
                                    "sfu:consume",
                                    {
                                        streamId: firstStream.streamId,
                                        transportId: transport.id,
                                    }
                                );
                            }
                        } else {
                            console.log('[TransportManager] 📭 No pending streams to consume');
                        }
                    }
                }, 3000);
            } else if (state === "failed" || state === "disconnected") {
                console.error('[TransportManager] ❌ Receive transport connection issue', {
                    state,
                    transportId: transport.id,
                });
            } else if (state === "connecting") {
                console.log('[TransportManager] 🔄 Receive transport is connecting...');
            }
        });
    };

    /**
     * Handle transport connection confirmation
     */
    handleTransportConnected = (data: { transportId: string }) => {
        console.log('[TransportManager] 🎉 handleTransportConnected called', {
            transportId: data.transportId,
            sendTransportId: this.context.refs.sendTransportRef.current?.id,
            recvTransportId: this.context.refs.recvTransportRef.current?.id,
            hasLocalStream: !!this.context.refs.localStreamRef.current,
            producersCount: this.context.refs.producersRef.current.size,
        });

        // Check if this is our send transport and we have local media ready
        if (
            this.context.refs.sendTransportRef.current &&
            this.context.refs.sendTransportRef.current.id ===
                data.transportId &&
            this.context.refs.localStreamRef.current
        ) {
            console.log('[TransportManager] 📤 Send transport confirmed, checking if we need to publish');
            
            // Transport is connected, we can now publish if we haven't already
            setTimeout(async () => {
                if (
                    this.context.refs.localStreamRef.current &&
                    this.context.refs.producersRef.current.size === 0
                ) {
                    console.log('[TransportManager] 📢 Publishing tracks via ProducerManager');
                    if (this.producerManager) {
                        await this.producerManager.publishTracks();
                    } else {
                        console.warn(
                            "[TransportManager] ⚠️ ProducerManager not set!"
                        );
                    }
                } else {
                    console.log('[TransportManager] ℹ️ Skipping publish - already have producers or no local stream', {
                        hasLocalStream: !!this.context.refs.localStreamRef.current,
                        producersCount: this.context.refs.producersRef.current.size,
                    });
                }
            }, 500);
        } else if (
            this.context.refs.recvTransportRef.current &&
            this.context.refs.recvTransportRef.current.id === data.transportId
        ) {
            console.log('[TransportManager] 📥 Receive transport confirmed');
        }
    };

    /**
     * Close and cleanup transports
     */
    cleanup = () => {
        console.log('[TransportManager] 🧹 Cleanup called', {
            hasSendTransport: !!this.context.refs.sendTransportRef.current,
            hasRecvTransport: !!this.context.refs.recvTransportRef.current,
            sendTransportId: this.context.refs.sendTransportRef.current?.id,
            recvTransportId: this.context.refs.recvTransportRef.current?.id,
            sendState: this.context.refs.sendTransportRef.current?.connectionState,
            recvState: this.context.refs.recvTransportRef.current?.connectionState,
        });

        this.context.refs.sendTransportRef.current?.close();
        this.context.refs.recvTransportRef.current?.close();
        this.context.refs.sendTransportRef.current = null;
        this.context.refs.recvTransportRef.current = null;

        console.log('[TransportManager] ✅ Cleanup completed');
    };
}
