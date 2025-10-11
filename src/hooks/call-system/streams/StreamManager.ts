import { StreamMetadata } from "@/interfaces/signal";
import { toast } from "sonner";
import { CallSystemContext, PendingStreamData } from "../types";

/**
 * Stream Management Module
 * Handles local and remote stream operations
 */

export class StreamManager {
    private context: CallSystemContext;
    private streamProcessingTimeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor(context: CallSystemContext) {
        this.context = context;
    }

    /**
     * Handle invalid consumer data as fallback stream
     */
    handleInvalidConsumerAsPresence = (streamId: string) => {
        const parts = streamId.split("_");
        const publisherId = parts[0];

        // Create a fallback stream for this user if we don't have one
        const fallbackStream = new MediaStream();
        const fallbackStreamId = `remote-${publisherId}-fallback`;

        this.context.setters.setStreams((prev) => {
            const existingIndex = prev.findIndex((s) => s.id.includes(publisherId));

            if (existingIndex === -1) {
                return [
                    ...prev,
                    {
                        id: fallbackStreamId,
                        stream: fallbackStream,
                        metadata: {
                            video: false,
                            audio: false,
                            type: "presence",
                            noCameraAvailable: true,
                            noMicroAvailable: true,
                        } as StreamMetadata,
                    },
                ];
            }
            return prev;
        });
    };

    /**
     * Process screen share stream updates
     */
    processScreenShareStream = (mediaStream: MediaStream, publisherId: string, mediaType: string, data: any) => {
        if (mediaType === "screen") {
            // Screen video stream - use separate screen streams state
            this.context.setters.setScreenStreams((prev) => {
                // Remove any duplicate screen streams for this publisher first
                const filteredStreams = prev.filter((s) => s.id !== `screen-${publisherId}`);

                // Always create/recreate the stream to avoid duplicates
                const newStream = {
                    id: `screen-${publisherId}`,
                    stream: mediaStream,
                    metadata: {
                        video: true,
                        audio: false,
                        type: "screen",
                        isScreenShare: true,
                        peerId: publisherId,
                        publisherId: publisherId,
                        ...data.metadata,
                    },
                };

                return [...filteredStreams, newStream];
            });
        } else if (mediaType === "screen_audio") {
            // Screen audio stream - update existing screen stream in screen streams state
            this.context.setters.setScreenStreams((prev) => {
                // Remove any duplicate screen streams for this publisher first
                const filteredStreams = prev.filter((s) => s.id !== `screen-${publisherId}`);

                // Find if we have existing screen stream to preserve video
                const existingStream = prev.find((s) => s.id === `screen-${publisherId}`);

                const newStream = {
                    id: `screen-${publisherId}`,
                    stream: mediaStream,
                    metadata: {
                        video: existingStream?.metadata?.video || false,
                        audio: true,
                        type: "screen",
                        isScreenShare: true,
                        peerId: publisherId,
                        publisherId: publisherId,
                        ...data.metadata,
                    },
                };

                return [...filteredStreams, newStream];
            });
        }
    };

    /**
     * Process regular webcam stream
     */
    processRegularStream = (mediaStream: MediaStream, uiStreamId: string, publisherId: string, data: any, mediaType: string) => {
        // Clear any existing timeout for this stream
        const existingTimeout = this.streamProcessingTimeouts.get(uiStreamId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Debounce stream updates to prevent spam
        const timeout = setTimeout(() => {
            this.context.setters.setStreams((prev) => {
                // Remove any existing streams for this specific remote stream ID to avoid duplicates
                const filteredStreams = prev.filter((s) => s.id !== uiStreamId);

                // Also remove any fallback streams for this user since we now have real media
                const finalFilteredStreams = filteredStreams.filter((s) => {
                    if (s.id.startsWith(`remote-${publisherId}-fallback`)) {
                        return false;
                    }
                    return true;
                });

                const isAudioStream = data.kind === "audio" || mediaType.includes("mic");
                const isVideoStream = data.kind === "video" || mediaType.includes("webcam");

                // FIXED: Use data.metadata if available (from server), otherwise fallback to kind detection
                // This ensures metadata updates from server take precedence over initial detection
                const metadata: StreamMetadata = {
                    type: isAudioStream ? "mic" : "webcam",
                    isScreenShare: false,
                    peerId: publisherId,
                    // Spread data.metadata first, then set defaults if not present
                    ...data.metadata,
                    // Only set video/audio if not already in data.metadata
                    video: data.metadata?.video !== undefined ? data.metadata.video : isVideoStream,
                    audio: data.metadata?.audio !== undefined ? data.metadata.audio : isAudioStream,
                };

                // Check if stream has tracks before adding to UI
                const tracks = mediaStream.getTracks();
                const hasValidTracks = tracks.length > 0;

                if (!hasValidTracks) {
                    return finalFilteredStreams;
                }

                // Add the new media stream
                const newStreams = [
                    ...finalFilteredStreams,
                    {
                        id: uiStreamId,
                        stream: mediaStream,
                        metadata: metadata,
                    },
                ];
                return newStreams;
            });

            // Clean up the timeout
            this.streamProcessingTimeouts.delete(uiStreamId);
        }, 50); // 50ms debounce

        this.streamProcessingTimeouts.set(uiStreamId, timeout);
    };

    /**
     * Update stream metadata
     */
    updateStreamMetadata = (streamId: string, metadata: any, publisherId: string) => {
        // Skip own streams
        if (publisherId === this.context.room.username) {
            return;
        }

        // Create the remote stream ID that matches our naming convention
        const parts = streamId.split("_");
        const mediaType = parts[1]; // Get just the kind (video/audio)
        const remoteStreamId = `remote-${publisherId}-${mediaType}`;

        // Update only the specific stream with new metadata
        this.context.setters.setStreams((prev) => {
            return prev.map((stream) => {
                // Only update the specific stream that matches the exact remote stream ID
                if (stream.id === remoteStreamId) {
                    return {
                        ...stream,
                        metadata: {
                            ...stream.metadata,
                            ...metadata,
                        },
                    };
                }
                return stream;
            });
        });
    };

    /**
     * Remove stream by ID
     */
    removeStream = (streamId: string, isScreenShare?: boolean, publisherId?: string) => {
        if (!streamId) {
            return;
        }

        // Parse stream ID to determine type and peer if publisherId not provided
        const parts = streamId.split("_");
        const parsedPublisherId = parts[0];
        const mediaType = parts[1]; // video, audio, screen, screen_audio

        // Use provided publisherId or fallback to parsed one
        const actualPublisherId = publisherId || parsedPublisherId;

        // Check if this is a screen share stream - use parameter if provided, otherwise fallback to parsing
        const isScreenShareStream = isScreenShare !== undefined ? isScreenShare : mediaType === "screen" || mediaType === "screen_audio";

        if (isScreenShareStream) {
            // Remove screen share stream from regular streams
            this.context.setters.setStreams((prev) =>
                prev.filter((stream) => {
                    const isScreenFromThisPeer = stream.id === `screen-${actualPublisherId}` || (stream.metadata?.peerId === actualPublisherId && stream.metadata?.isScreenShare);
                    return !isScreenFromThisPeer;
                })
            );

            // Remove screen share stream from dedicated screen streams state
            this.context.setters.setScreenStreams((prev) =>
                prev.filter((stream) => {
                    const isScreenFromThisPeer = stream.id === `screen-${actualPublisherId}` || (stream.metadata?.peerId === actualPublisherId && stream.metadata?.isScreenShare);
                    return !isScreenFromThisPeer;
                })
            );

            // Clean up remote streams map
            this.context.refs.remoteStreamsMapRef.current.delete(`screen-${actualPublisherId}`);
            this.context.refs.remoteStreamsMapRef.current.delete(`screen-audio-${actualPublisherId}`);
        } else {
            // Handle regular stream removal
            const remoteStreamId = `remote-${actualPublisherId}-${mediaType}`;
            this.context.refs.remoteStreamsMapRef.current.delete(remoteStreamId);

            this.context.setters.setStreams((prev) => prev.filter((stream) => stream.id !== remoteStreamId));
        }
    };

    /**
     * Remove streams from a specific peer
     */
    removePeerStreams = (peerId: string, reason?: string) => {
        // Remove regular streams from this peer
        this.context.setters.setStreams((prev) => {
            const filteredStreams = prev.filter((s) => !s.id.includes(peerId));
            return filteredStreams;
        });

        // Remove screen share streams from this peer
        this.context.setters.setScreenStreams((prev) => {
            const filteredStreams = prev.filter((s) => !s.id.includes(peerId));
            return filteredStreams;
        });

        // Clean up remote streams map for all streams from this peer
        const streamsToDelete = [];
        for (const [key] of this.context.refs.remoteStreamsMapRef.current) {
            if (key.includes(peerId)) {
                streamsToDelete.push(key);
            }
        }
        streamsToDelete.forEach((key) => {
            this.context.refs.remoteStreamsMapRef.current.delete(key);
        });

        // Remove from speaking peers
        this.context.setters.setSpeakingPeers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(peerId);
            return newSet;
        });

        // Show appropriate message based on reason
        if (reason === "kicked") {
            toast.info(`${peerId} was removed from the room`);
        } else {
            // voluntary or undefined (default to voluntary)
            toast.info(`${peerId} left the room`);
        }
    };

    /**
     * Remove screen share streams from a specific peer
     */
    removeScreenShareStreams = (peerId: string) => {
        toast.info(`${peerId} stopped screen sharing`);

        // Remove screen share streams from regular streams state
        this.context.setters.setStreams((prev) =>
            prev.filter((stream) => {
                // Remove streams that match this peer's screen share
                const isScreenFromThisPeer = stream.id === `screen-${peerId}` || (stream.metadata?.peerId === peerId && stream.metadata?.isScreenShare);
                return !isScreenFromThisPeer;
            })
        );

        // Remove screen share streams from dedicated screen streams state
        this.context.setters.setScreenStreams((prev) =>
            prev.filter((stream) => {
                // Remove streams that match this peer's screen share
                const isScreenFromThisPeer = stream.id === `screen-${peerId}` || (stream.metadata?.peerId === peerId && stream.metadata?.isScreenShare);
                return !isScreenFromThisPeer;
            })
        );

        // Clean up remote streams map
        this.context.refs.remoteStreamsMapRef.current.delete(`screen-${peerId}`);
        this.context.refs.remoteStreamsMapRef.current.delete(`screen-audio-${peerId}`);
    };

    /**
     * Process pending streams that arrived before transport was ready
     */
    processPendingStreams = () => {
        const pendingStreams = this.context.refs.pendingStreamsRef.current;

        if (pendingStreams.length > 0) {
            for (const streamData of pendingStreams) {
                // Validate streamId
                if (!streamData.streamId || streamData.streamId === "undefined" || typeof streamData.streamId !== "string") {
                    continue;
                }

                // Skip fallback streams
                if (streamData.metadata?.type === "presence") {
                    continue;
                }

                // Check if already consuming
                if (!this.context.refs.consumingStreamsRef.current.has(streamData.streamId)) {
                    try {
                        this.context.refs.consumingStreamsRef.current.add(streamData.streamId);
                        this.context.refs.socketRef.current?.emit("sfu:consume", {
                            streamId: streamData.streamId,
                            transportId: this.context.refs.recvTransportRef.current!.id,
                        });
                    } catch (error) {
                        console.error(`Failed to consume pending stream ${streamData.streamId}:`, error);
                        this.context.refs.consumingStreamsRef.current.delete(streamData.streamId);
                    }
                }
            }

            // Clear pending streams
            this.context.refs.pendingStreamsRef.current = [];
        }
    };

    /**
     * Add stream to pending queue
     */
    addToPendingStreams = (streamData: PendingStreamData) => {
        this.context.refs.pendingStreamsRef.current.push(streamData);
    };

    /**
     * Check if stream is already being consumed
     */
    isStreamBeingConsumed = (streamId: string): boolean => {
        return this.context.refs.consumingStreamsRef.current.has(streamId);
    };

    /**
     * Mark stream as being consumed
     */
    markStreamAsConsuming = (streamId: string) => {
        this.context.refs.consumingStreamsRef.current.add(streamId);
    };

    /**
     * Remove stream from consuming tracking
     */
    removeFromConsuming = (streamId: string) => {
        this.context.refs.consumingStreamsRef.current.delete(streamId);
    };

    /**
     * Cleanup timeouts and resources
     */
    cleanup = () => {
        // Clear all pending timeouts
        this.streamProcessingTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.streamProcessingTimeouts.clear();
    };
}
