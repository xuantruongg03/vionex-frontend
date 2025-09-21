import { toast } from "sonner";
import { CallSystemContext } from "../types";

/**
 * Producer Manager Module
 * Handles MediaSoup producer creation and management
 */

export class ProducerManager {
    private context: CallSystemContext;

    constructor(context: CallSystemContext) {
        this.context = context;
    }

    /**
     * Handle producer created event from server
     */
    handleProducerCreated = (data: any) => {
        // Handle different response formats from server
        const producerId = data.producerId || data.producer_id || data.id;
        const streamId = data.streamId || data.stream_id;
        const kind = data.kind;

        // Store producer info
        if (producerId && streamId) {
            this.context.refs.producersRef.current.set(producerId, {
                producerId: producerId,
                streamId: streamId,
                kind: data.kind,
                appData: data.appData,
            });

            // Store streamId for metadata updates
            if (kind === "video") {
                this.context.refs.currentStreamIdsRef.current.video = streamId;
                // If this is the first stream, also set as primary
                if (!this.context.refs.currentStreamIdsRef.current.primary) {
                    this.context.refs.currentStreamIdsRef.current.primary =
                        streamId;
                }
            } else if (kind === "audio") {
                this.context.refs.currentStreamIdsRef.current.audio = streamId;
                // If this is the first stream, also set as primary
                if (!this.context.refs.currentStreamIdsRef.current.primary) {
                    this.context.refs.currentStreamIdsRef.current.primary =
                        streamId;
                }
            }
        }
    };

    /**
     * Publish local media tracks
     */
    publishTracks = async (): Promise<boolean> => {
        if (
            !this.context.refs.localStreamRef.current ||
            !this.context.refs.sendTransportRef.current
        ) {
            return false;
        }

        // Check if we already have producers to avoid duplicates
        if (this.context.refs.producersRef.current.size > 0) {
            return true;
        }

        // Check if already publishing to avoid race conditions
        if (this.context.refs.isPublishingRef.current) {
            return false;
        }

        try {
            this.context.refs.isPublishingRef.current = true;

            // Check device capabilities before producing
            if (!this.context.refs.deviceRef.current?.loaded) {
                console.error("[WS] Device not loaded, cannot publish");
                return false;
            }

            const videoTrack =
                this.context.refs.localStreamRef.current.getVideoTracks()[0];
            const audioTrack =
                this.context.refs.localStreamRef.current.getAudioTracks()[0];

            const hasValidVideo =
                videoTrack && videoTrack.readyState === "live";
            const hasValidAudio =
                audioTrack && audioTrack.readyState === "live";

            // Priority 1: Both video and audio available
            if (hasValidVideo && hasValidAudio) {
                await this.publishAudioTrack(audioTrack);
                await this.publishVideoTrack(videoTrack);
            }
            // Priority 2: Only audio available
            else if (!hasValidVideo && hasValidAudio) {
                await this.publishAudioTrack(audioTrack);
            }
            // Priority 3: Only video available
            else if (hasValidVideo && !hasValidAudio) {
                await this.publishVideoTrack(videoTrack);
            }
            // Priority 4: No media available - notify user and skip
            else {
                return false;
            }

            return true;
        } catch (error) {
            console.error("[WS] Error publishing tracks:", error);
            toast.error("Failed to publish media");
            return false;
        } finally {
            this.context.refs.isPublishingRef.current = false;
        }
    };

    /**
     * Publish video track
     */
    private publishVideoTrack = async (
        track: MediaStreamTrack
    ): Promise<boolean> => {
        // Check if device supports video codecs
        const videoCodecs =
            this.context.refs.deviceRef.current?.rtpCapabilities.codecs?.filter(
                (c) => c.kind === "video"
            );
        if (!videoCodecs || videoCodecs.length === 0) {
            return false;
        }

        try {
            // Check if device is mobile for encoding adjustments
            const isMobile =
                /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent
                );

            const encodings = isMobile
                ? [
                      // Mobile-optimized encodings - lower bitrates
                      {
                          maxBitrate: 50000,
                          scaleResolutionDownBy: 4,
                      },
                      {
                          maxBitrate: 150000,
                          scaleResolutionDownBy: 2,
                      },
                      { maxBitrate: 300000 },
                  ]
                : [
                      // Desktop encodings
                      { maxBitrate: 100000 },
                      { maxBitrate: 300000 },
                      { maxBitrate: 900000 },
                  ];

            const videoProducer =
                await this.context.refs.sendTransportRef.current!.produce({
                    track: track,
                    encodings: encodings,
                    appData: {
                        type: "webcam",
                        video: track.enabled, 
                        audio: false,
                        platform: isMobile ? "mobile" : "desktop",
                    },
                });

            this.context.refs.producersRef.current.set(videoProducer.id, {
                producerId: videoProducer.id,
                streamId: "",
                kind: "video",
                appData: videoProducer.appData,
                producer: videoProducer,
            });
            return true;
        } catch (videoError) {
            console.error("[WS] Failed to produce video:", videoError);
            return false;
        }
    };

    /**
     * Publish audio track
     */
    private publishAudioTrack = async (
        track: MediaStreamTrack
    ): Promise<boolean> => {
        // Check if device supports audio codecs
        const audioCodecs =
            this.context.refs.deviceRef.current?.rtpCapabilities.codecs?.filter(
                (c) => c.kind === "audio"
            );
        if (!audioCodecs || audioCodecs.length === 0) {
            return false;
        }

        try {
            const audioProducer =
                await this.context.refs.sendTransportRef.current!.produce({
                    track: track,
                    appData: {
                        type: "mic",
                        video: false,
                        audio: track.enabled,
                    },
                });

            this.context.refs.producersRef.current.set(audioProducer.id, {
                producerId: audioProducer.id,
                streamId: "",
                kind: "audio",
                appData: audioProducer.appData,
                producer: audioProducer,
            });

            return true;
        } catch (audioError) {
            console.error("[WS] Failed to produce audio:", audioError);
            return false;
        }
    };

    /**
     * Publish screen share tracks
     */
    publishScreenShareTracks = async (
        screenStream: MediaStream
    ): Promise<boolean> => {
        if (!this.context.refs.sendTransportRef.current) {
            toast.error("Cannot start screen sharing: Not connected");
            return false;
        }

        try {
            // Publish video track (create separate stream for screen video)
            const videoTrack = screenStream.getVideoTracks()[0];
            if (videoTrack && this.context.refs.sendTransportRef.current) {
                try {
                    const screenVideoProducer =
                        await this.context.refs.sendTransportRef.current.produce(
                            {
                                track: videoTrack,
                                encodings: [
                                    {
                                        maxBitrate: 500000,
                                        scaleResolutionDownBy: 4,
                                    },
                                    {
                                        maxBitrate: 1500000,
                                        scaleResolutionDownBy: 2,
                                    },
                                    {
                                        maxBitrate: 3000000,
                                        scaleResolutionDownBy: 1,
                                    },
                                ],
                                codecOptions: {
                                    videoGoogleStartBitrate: 1000,
                                },
                                appData: {
                                    video: true,
                                    audio: false,
                                    type: "screen",
                                    isScreenShare: true,
                                },
                            }
                        );

                    this.context.refs.producersRef.current.set(
                        screenVideoProducer.id,
                        {
                            producerId: screenVideoProducer.id,
                            streamId: "",
                            kind: "video",
                            appData: screenVideoProducer.appData,
                            producer: screenVideoProducer,
                        }
                    );
                } catch (error) {
                    console.error(
                        "[WS] Failed to produce screen video:",
                        error
                    );
                    throw error;
                }
            }

            // Publish audio track if available (create separate stream for screen audio)
            const audioTrack = screenStream.getAudioTracks()[0];
            if (audioTrack && this.context.refs.sendTransportRef.current) {
                try {
                    const screenAudioProducer =
                        await this.context.refs.sendTransportRef.current.produce(
                            {
                                track: audioTrack,
                                codecOptions: {
                                    opusStereo: true,
                                    opusDtx: true,
                                },
                                appData: {
                                    video: false,
                                    audio: true,
                                    type: "screen_audio",
                                    isScreenShare: true,
                                },
                            }
                        );

                    this.context.refs.producersRef.current.set(
                        screenAudioProducer.id,
                        {
                            producerId: screenAudioProducer.id,
                            streamId: "",
                            kind: "audio",
                            appData: screenAudioProducer.appData,
                            producer: screenAudioProducer,
                        }
                    );
                } catch (error) {
                    console.error(
                        "[WS] Failed to produce screen audio:",
                        error
                    );
                    // Audio failure shouldn't stop screen sharing
                }
            }

            return true;
        } catch (error) {
            console.error("[WS] Error publishing screen share tracks:", error);
            return false;
        }
    };

    /**
     * Unpublish screen share streams
     */
    unpublishScreenShare = () => {
        // Clean up producers - unpublish screen share streams
        this.context.refs.producersRef.current.forEach((info, producerId) => {
            if (
                (info?.appData && info.appData.type === "screen") ||
                (info?.appData && info.appData.type === "screen_audio") ||
                (info?.appData && info.appData.isScreenShare)
            ) {
                // Send unpublish to server (server will generate the streamId)
                this.context.refs.socketRef.current?.emit("sfu:unpublish", {
                    streamId: info.streamId || producerId,
                });

                // Remove from producers map
                this.context.refs.producersRef.current.delete(producerId);
            }
        });
    };

    /**
     * Cleanup all producers
     */
    cleanup = () => {
        this.context.refs.producersRef.current.forEach((producer) => {
            producer.producer?.close();
        });
        this.context.refs.producersRef.current.clear();
        this.context.refs.currentStreamIdsRef.current = {};
        this.context.refs.isPublishingRef.current = false;
    };
}
