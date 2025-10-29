import { toast } from "sonner";
import { mediaStreamService } from "@/services/MediaStreamService";
import { CallSystemContext, ProducerInfo } from "../types"; // FIX: Import ProducerInfo
import { ProducerManager } from "../transports/ProducerManager";

/**
 * Media Manager Module
 * Handles local media operations and controls
 */

export class MediaManager {
    private context: CallSystemContext;
    private producerManager: ProducerManager;
    private vadManager: any = null; // Will be set later

    constructor(context: CallSystemContext, producerManager: ProducerManager) {
        this.context = context;
        this.producerManager = producerManager;
    }

    /**
     * Set VAD Manager reference
     */
    setVADManager(vadManager: any): void {
        this.vadManager = vadManager;
    }

    /**
     * Initialize local media stream
     */
    initializeLocalMedia = async (): Promise<MediaStream> => {
        try {
            const stream = await mediaStreamService.initializeLocalMedia();

            // Set the stream reference
            this.context.refs.localStreamRef.current = stream;

            const hasVideo = stream.getVideoTracks().length > 0;
            const hasAudio = stream.getAudioTracks().length > 0;

            // Add local stream to display with accurate metadata
            this.context.setters.setStreams((prev) => [
                {
                    id: "local",
                    stream,
                    metadata: {
                        video: hasVideo && stream.getVideoTracks()[0]?.enabled,
                        audio: hasAudio && stream.getAudioTracks()[0]?.enabled,
                        type: "webcam",
                        noCameraAvailable: !hasVideo,
                        noMicroAvailable: !hasAudio,
                    },
                },
                ...prev.filter((s) => s.id !== "local"),
            ]);

            // Don't publish here - let TransportManager handle publishing when transport is connected
            console.log("[MediaManager] Local media initialized, waiting for TransportManager to publish...");

            return stream;
        } catch (error) {
            console.error("[Media] Error getting media from service:", error);
            const emptyStream = new MediaStream();
            this.context.refs.localStreamRef.current = emptyStream;

            this.context.setters.setStreams((prev) => [
                {
                    id: "local",
                    stream: emptyStream,
                    metadata: {
                        video: false,
                        audio: false,
                        type: "webcam",
                        noCameraAvailable: true,
                        noMicroAvailable: true,
                    },
                },
                ...prev.filter((s) => s.id !== "local"),
            ]);

            toast.error("Failed to access camera/microphone");
            return emptyStream;
        }
    };

    /**
     * Sync metadata with actual track states after publishing
     * FIXED: Use producer.paused as source of truth (not track.enabled)
     * Reason: Dummy tracks are always enabled, but producers are paused
     */
    private syncMetadataWithTrackStates = async (): Promise<void> => {
        try {
            // Get producer states (more reliable than track states for dummy tracks)
            const producers = Array.from(this.context.refs.producersRef.current.values());

            const videoProducer = producers.find((p) => p.kind === "video" && !p.appData?.isScreenShare);
            const audioProducer = producers.find((p) => p.kind === "audio" && !p.appData?.isScreenShare);

            // Check producer.paused instead of track.enabled
            // If producer doesn't exist or is paused → media is OFF
            const videoEnabled = videoProducer?.producer && !videoProducer.producer.closed && !videoProducer.producer.paused;
            const audioEnabled = audioProducer?.producer && !audioProducer.producer.closed && !audioProducer.producer.paused;

            // Update both video and audio streams with correct metadata via WebSocket
            const streamId = this.context.refs.currentStreamIdsRef.current.primary || this.context.refs.currentStreamIdsRef.current.video || this.context.refs.currentStreamIdsRef.current.audio;

            if (streamId && this.context.refs.socketRef.current) {
                // Use WebSocket instead of HTTP
                this.context.refs.socketRef.current.emit("sfu:update-stream-metadata", {
                    streamId: streamId,
                    metadata: {
                        video: videoEnabled,
                        audio: audioEnabled,
                    },
                    roomId: this.context.roomId,
                });
            }
        } catch (error) {
            console.warn("Failed to sync metadata with track states:", error);
        }
    };

    /**
     * FIX: Toggle video on/off
     * When turning OFF: Stop track completely to release camera hardware
     * When turning ON: Request camera access to get new track
     */
    toggleVideo = async (): Promise<boolean> => {
        try {
            const localStream = mediaStreamService.localStream;
            if (!localStream) {
                console.error("[MediaManager] No local stream available");
                return false;
            }

            const videoTrack = localStream.getVideoTracks()[0];
            const isCurrentlyEnabled = videoTrack && videoTrack.enabled;

            let enabled: boolean;

            if (isCurrentlyEnabled) {
                // Turning OFF - Stop track to release hardware
                enabled = mediaStreamService.toggleVideo();

                // Pause producer to stop streaming
                const producers = Array.from(this.context.refs.producersRef.current.values());
                const videoProducerInfo = producers.find((p) => p.kind === "video" && !p.appData?.isScreenShare);

                if (videoProducerInfo && videoProducerInfo.producer && !videoProducerInfo.producer.closed) {
                    if (!videoProducerInfo.producer.paused) {
                        videoProducerInfo.producer.pause();
                        console.log("[MediaManager] Video producer paused");
                    }
                }
            } else {
                // Turning ON - Request new camera access
                const newVideoTrack = await mediaStreamService.requestVideoTrack();

                if (newVideoTrack) {
                    enabled = true;

                    // Replace track in existing producer
                    const producers = Array.from(this.context.refs.producersRef.current.values());
                    const videoProducerInfo = producers.find((p) => p.kind === "video" && !p.appData?.isScreenShare);

                    if (videoProducerInfo && videoProducerInfo.producer && !videoProducerInfo.producer.closed) {
                        try {
                            // Replace track to use new camera
                            await videoProducerInfo.producer.replaceTrack({ track: newVideoTrack });
                            console.log("[MediaManager] Video track replaced in producer");

                            // Resume producer
                            if (videoProducerInfo.producer.paused) {
                                videoProducerInfo.producer.resume();
                                console.log("[MediaManager] Video producer resumed");
                            }
                        } catch (error) {
                            console.error("[MediaManager] Failed to replace video track:", error);
                        }
                    }
                } else {
                    console.error("[MediaManager] Failed to request camera");
                    toast.error("Failed to enable camera");
                    enabled = false;
                }
            }

            // Update local UI immediately
            this.context.setters.setStreams((prev) =>
                prev.map((stream) =>
                    stream.id === "local"
                        ? {
                              ...stream,
                              metadata: {
                                  ...stream.metadata,
                                  video: enabled,
                                  noCameraAvailable: false,
                              },
                          }
                        : stream
                )
            );

            // Update stream metadata via WebSocket
            try {
                if (this.context.refs.socketRef.current && this.context.room.username) {
                    const streamId = this.context.refs.currentStreamIdsRef.current.video || this.context.refs.currentStreamIdsRef.current.primary;

                    if (streamId) {
                        // FIXED: Get audio state from producer, not track (for dummy track compatibility)
                        const producers = Array.from(this.context.refs.producersRef.current.values());
                        const audioProducer = producers.find((p) => p.kind === "audio" && !p.appData?.isScreenShare);
                        const audioEnabled = audioProducer?.producer && !audioProducer.producer.closed && !audioProducer.producer.paused;

                        this.context.refs.socketRef.current.emit("sfu:update-stream-metadata", {
                            streamId: streamId,
                            metadata: {
                                video: enabled,
                                audio: audioEnabled,
                            },
                            roomId: this.context.roomId,
                        });
                    }
                }
            } catch (error) {
                console.warn("Failed to update video stream metadata:", error);
            }

            return enabled;
        } catch (error) {
            console.error("[MediaManager] Error toggling video:", error);
            return false;
        }
    };

    /**
     * Toggle audio on/off
     */
    toggleAudio = async (): Promise<boolean> => {
        try {
            // Get local stream and check current audio state
            const localStream = mediaStreamService.localStream;
            if (!localStream) {
                console.error("[MediaManager] No local stream available");
                return false;
            }

            const audioTrack = localStream.getAudioTracks()[0];
            const isCurrentlyEnabled = audioTrack && audioTrack.enabled;

            let enabled: boolean;

            if (isCurrentlyEnabled) {
                // Turning OFF - Stop track to release hardware
                enabled = mediaStreamService.toggleAudio();

                // Pause producer to stop streaming
                const producers = Array.from(this.context.refs.producersRef.current.values());
                const audioProducerInfo = producers.find((p) => p.kind === "audio");

                if (audioProducerInfo && audioProducerInfo.producer && !audioProducerInfo.producer.closed) {
                    if (!audioProducerInfo.producer.paused) {
                        audioProducerInfo.producer.pause();
                        console.log("[MediaManager] Audio producer paused");
                    }
                }
            } else {
                // Turning ON - Request new microphone access
                const newAudioTrack = await mediaStreamService.requestAudioTrack();

                if (newAudioTrack) {
                    console.log("[MediaManager] Audio turned ON - microphone acquired");
                    enabled = true;

                    // Replace track in existing producer
                    const producers = Array.from(this.context.refs.producersRef.current.values());
                    const audioProducerInfo = producers.find((p) => p.kind === "audio");

                    if (audioProducerInfo && audioProducerInfo.producer && !audioProducerInfo.producer.closed) {
                        try {
                            // Replace track to use new microphone
                            await audioProducerInfo.producer.replaceTrack({ track: newAudioTrack });
                            console.log("[MediaManager] Audio track replaced in producer");

                            // Resume producer
                            if (audioProducerInfo.producer.paused) {
                                audioProducerInfo.producer.resume();
                                console.log("[MediaManager] Audio producer resumed");
                            }
                        } catch (error) {
                            console.error("[MediaManager] Failed to replace audio track:", error);
                        }
                    }
                } else {
                    console.error("[MediaManager] Failed to request microphone");
                    toast.error("Failed to enable microphone");
                    enabled = false;
                }
            }

            // Update local UI immediately
            this.context.setters.setStreams((prev) =>
                prev.map((stream) =>
                    stream.id === "local"
                        ? {
                              ...stream,
                              metadata: {
                                  ...stream.metadata,
                                  audio: enabled,
                                  // FIX: If we can toggle, microphone is available
                                  noMicroAvailable: false,
                              },
                          }
                        : stream
                )
            );

            // Update VAD microphone state immediately
            if (this.vadManager) {
                this.vadManager.updateMicrophoneState(enabled);
                console.log(`[MediaManager] VAD microphone updated immediately: ${enabled ? "enabled" : "disabled"}`);
            }

            // Update stream metadata via WebSocket
            try {
                if (this.context.refs.socketRef.current && this.context.room.username) {
                    // Try to use audio-specific streamId first, then primary
                    const streamId = this.context.refs.currentStreamIdsRef.current.audio || this.context.refs.currentStreamIdsRef.current.primary;

                    if (streamId) {
                        // FIXED: Get video state from producer, not track (for dummy track compatibility)
                        const producers = Array.from(this.context.refs.producersRef.current.values());
                        const videoProducer = producers.find((p) => p.kind === "video" && !p.appData?.isScreenShare);
                        const videoEnabled = videoProducer?.producer && !videoProducer.producer.closed && !videoProducer.producer.paused;

                        // Use WebSocket instead of HTTP
                        this.context.refs.socketRef.current.emit("sfu:update-stream-metadata", {
                            streamId: streamId,
                            metadata: {
                                audio: enabled,
                                video: videoEnabled,
                            },
                            roomId: this.context.roomId,
                        });
                    } else {
                        console.warn("No streamId available for audio update");
                    }
                }
            } catch (error) {
                console.warn("Failed to update audio stream metadata:", error);
            }

            return enabled;
        } catch (error) {
            console.error("[Media] Error toggling audio:", error);
            return false;
        }
    };

    /**
     * Toggle screen sharing
     */
    toggleScreenShare = async (): Promise<boolean> => {
        try {
            // Stop screen sharing if currently active
            if (this.context.setters.setIsScreenSharing && this.context.refs.screenStreamRef.current) {
                // Stop all tracks
                this.context.refs.screenStreamRef.current.getTracks().forEach((track) => {
                    track.stop();
                });

                // Clean up producers - unpublish screen share streams
                this.producerManager.unpublishScreenShare();

                // Update UI state - remove from screen streams
                this.context.setters.setScreenStreams((prev) => prev.filter((stream) => stream.id !== "screen-local"));

                this.context.refs.screenStreamRef.current = null;
                this.context.setters.setIsScreenSharing(false);
                toast.success("Stopped screen sharing");
                return true;
            }

            // Start screen sharing
            console.log("[MediaManager] Checking screen share requirements:", {
                hasSendTransport: !!this.context.refs.sendTransportRef.current,
                sendTransportId: this.context.refs.sendTransportRef.current?.id,
                sendTransportState: this.context.refs.sendTransportRef.current?.connectionState,
                hasDevice: !!this.context.refs.deviceRef.current,
                deviceLoaded: this.context.refs.deviceRef.current?.loaded,
            });

            if (!this.context.refs.sendTransportRef.current) {
                toast.error("Cannot start screen sharing: Not connected");
                return false;
            }

            // Request screen capture
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always",
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 },
                    frameRate: { ideal: 30, max: 30 },
                } as MediaTrackConstraints,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                } as MediaTrackConstraints,
            });

            if (!screenStream) {
                throw new Error("Failed to capture screen");
            }

            this.context.refs.screenStreamRef.current = screenStream;

            // Add to screen streams for UI (local display)
            this.context.setters.setScreenStreams((prev) => [
                ...prev,
                {
                    id: "screen-local",
                    stream: screenStream,
                    metadata: {
                        video: true,
                        audio: screenStream.getAudioTracks().length > 0,
                        type: "screen",
                        isScreenShare: true,
                        peerId: this.context.room.username,
                        publisherId: this.context.room.username,
                    },
                },
            ]);

            // Publish screen share tracks
            const publishResult = await this.producerManager.publishScreenShareTracks(screenStream);

            if (publishResult) {
                this.context.setters.setIsScreenSharing(true);
                toast.success("Started screen sharing");

                // Handle screen share end when user clicks "Stop sharing" in browser
                const videoTrack = screenStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.onended = this.handleScreenShareEnded;
                }

                return true;
            } else {
                throw new Error("Failed to publish screen share tracks");
            }
        } catch (error) {
            console.error("[WS] Error toggling screen share:", error);

            // Clean up on error
            if (this.context.refs.screenStreamRef.current) {
                this.context.refs.screenStreamRef.current.getTracks().forEach((track) => {
                    track.stop();
                });
                this.context.refs.screenStreamRef.current = null;
            }

            this.context.setters.setIsScreenSharing(false);
            this.context.setters.setScreenStreams((prev) => prev.filter((stream) => stream.id !== "screen-local"));

            if ((error as any).name === "NotAllowedError") {
                toast.error("You have denied screen sharing");
            } else if ((error as any).name === "NotFoundError") {
                toast.error("No source found for sharing");
            } else {
                toast.error("Cannot start screen sharing: " + (error as Error).message);
            }

            return false;
        }
    };

    /**
     * Handle when screen sharing ends (when user clicks Stop sharing in browser)
     */
    handleScreenShareEnded = () => {
        if (this.context.refs.screenStreamRef.current) {
            // Stop all tracks
            this.context.refs.screenStreamRef.current.getTracks().forEach((track) => {
                track.stop();
            });

            // Clean up producers - unpublish screen share streams
            this.producerManager.unpublishScreenShare();

            // Clean up refs and state
            this.context.refs.screenStreamRef.current = null;
            this.context.setters.setIsScreenSharing(false);

            // Remove from screen streams
            this.context.setters.setScreenStreams((prev) => prev.filter((stream) => stream.id !== "screen-local"));

            toast.info("Stopped screen sharing");
        }
    };

    /**
     * Get local stream from global service
     */
    getLocalStream = (): MediaStream | null => {
        return mediaStreamService.localStream;
    };

    /**
     * Force sync metadata with current track states (public method)
     */
    forceSyncMetadata = async (): Promise<void> => {
        await this.syncMetadataWithTrackStates();
    };
}
