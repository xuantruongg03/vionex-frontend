import { toast } from "sonner";
import { mediaStreamService } from "@/services/MediaStreamService";
import { CallSystemContext } from "../types";
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

            // Show success messages only if this is a new initialization
            // if (!mediaStreamService.isInitializing) {
            //     if (hasVideo && hasAudio) {
            //         toast.success("Camera and microphone ready");
            //     } else if (hasVideo) {
            //         toast.info("Camera ready (microphone not available)");
            //     } else if (hasAudio) {
            //         toast.info("Microphone ready (camera not available)");
            //     } else {
            //         toast.info(
            //             "Ready to join (camera and microphone not available)"
            //         );
            //     }
            // }

            // Publish tracks if transports are ready - only if we don't have producers yet
            if (
                this.context.refs.sendTransportRef.current &&
                this.context.refs.producersRef.current.size === 0
            ) {
                setTimeout(async () => {
                    const publishResult =
                        await this.producerManager.publishTracks();
                    if (publishResult) {
                    }
                }, 1000);
            }

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
     * Toggle video on/off
     */
    toggleVideo = async (): Promise<boolean> => {
        try {
            // Use global media service
            const enabled = mediaStreamService.toggleVideo();

            // Update local UI immediately
            this.context.setters.setStreams((prev) =>
                prev.map((stream) =>
                    stream.id === "local"
                        ? {
                              ...stream,
                              metadata: {
                                  ...stream.metadata,
                                  video: enabled,
                              },
                          }
                        : stream
                )
            );

            // // Update stream metadata via HTTP
            try {
                if (
                    this.context.refs.apiServiceRef.current &&
                    this.context.room.username
                ) {
                    // Try to use video-specific streamId first, then primary
                    const streamId =
                        this.context.refs.currentStreamIdsRef.current.video ||
                        this.context.refs.currentStreamIdsRef.current.primary;

                    if (streamId) {
                        // Get current audio state from the service
                        const localStream = mediaStreamService.localStream;
                        const audioTrack = localStream?.getAudioTracks()[0];
                        const audioEnabled = audioTrack
                            ? audioTrack.enabled
                            : false;

                        await this.context.refs.apiServiceRef.current.updateStream(
                            streamId,
                            {
                                video: enabled,
                                audio: audioEnabled,
                            },
                            this.context.roomId
                        );
                    } else {
                        console.warn("No streamId available for video update");
                    }
                }
            } catch (error) {
                console.warn("Failed to update video stream metadata:", error);
            }

            return enabled;
        } catch (error) {
            console.error("[Media] Error toggling video:", error);
            return false;
        }
    };

    /**
     * Toggle audio on/off
     */
    toggleAudio = async (): Promise<boolean> => {
        try {
            // Use global media service
            const enabled = mediaStreamService.toggleAudio();

            // Update local UI immediately
            this.context.setters.setStreams((prev) =>
                prev.map((stream) =>
                    stream.id === "local"
                        ? {
                              ...stream,
                              metadata: {
                                  ...stream.metadata,
                                  audio: enabled,
                              },
                          }
                        : stream
                )
            );

            // Update VAD microphone state immediately
            if (this.vadManager) {
                this.vadManager.updateMicrophoneState(enabled);
                console.log(
                    `[MediaManager] VAD microphone updated immediately: ${
                        enabled ? "enabled" : "disabled"
                    }`
                );
            }

            // Update stream metadata via HTTP
            try {
                if (
                    this.context.refs.apiServiceRef.current &&
                    this.context.room.username
                ) {
                    // Try to use audio-specific streamId first, then primary
                    const streamId =
                        this.context.refs.currentStreamIdsRef.current.audio ||
                        this.context.refs.currentStreamIdsRef.current.primary;

                    if (streamId) {
                        // Get current video state from the service
                        const localStream = mediaStreamService.localStream;
                        const videoTrack = localStream?.getVideoTracks()[0];
                        const videoEnabled = videoTrack
                            ? videoTrack.enabled
                            : false;

                        await this.context.refs.apiServiceRef.current.updateStream(
                            streamId,
                            {
                                audio: enabled,
                                video: videoEnabled,
                            },
                            this.context.roomId
                        );
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
            if (
                this.context.setters.setIsScreenSharing &&
                this.context.refs.screenStreamRef.current
            ) {
                // Stop all tracks
                this.context.refs.screenStreamRef.current
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });

                // Clean up producers - unpublish screen share streams
                this.producerManager.unpublishScreenShare();

                // Update UI state - remove from screen streams
                this.context.setters.setScreenStreams((prev) =>
                    prev.filter((stream) => stream.id !== "screen-local")
                );

                this.context.refs.screenStreamRef.current = null;
                this.context.setters.setIsScreenSharing(false);
                toast.success("Stopped screen sharing");
                return true;
            }

            // Start screen sharing
            console.log("[MediaManager] Checking screen share requirements:", {
                hasSendTransport: !!this.context.refs.sendTransportRef.current,
                sendTransportId: this.context.refs.sendTransportRef.current?.id,
                sendTransportState:
                    this.context.refs.sendTransportRef.current?.connectionState,
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
            const publishResult =
                await this.producerManager.publishScreenShareTracks(
                    screenStream
                );

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
                this.context.refs.screenStreamRef.current
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });
                this.context.refs.screenStreamRef.current = null;
            }

            this.context.setters.setIsScreenSharing(false);
            this.context.setters.setScreenStreams((prev) =>
                prev.filter((stream) => stream.id !== "screen-local")
            );

            if ((error as any).name === "NotAllowedError") {
                toast.error("You have denied screen sharing");
            } else if ((error as any).name === "NotFoundError") {
                toast.error("No source found for sharing");
            } else {
                toast.error(
                    "Cannot start screen sharing: " + (error as Error).message
                );
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
            this.context.refs.screenStreamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            // Clean up producers - unpublish screen share streams
            this.producerManager.unpublishScreenShare();

            // Clean up refs and state
            this.context.refs.screenStreamRef.current = null;
            this.context.setters.setIsScreenSharing(false);

            // Remove from screen streams
            this.context.setters.setScreenStreams((prev) =>
                prev.filter((stream) => stream.id !== "screen-local")
            );

            toast.info("Stopped screen sharing");
        }
    };

    /**
     * Get local stream from global service
     */
    getLocalStream = (): MediaStream | null => {
        return mediaStreamService.localStream;
    };
}
