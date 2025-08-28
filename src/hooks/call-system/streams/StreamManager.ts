import { StreamMetadata } from "@/interfaces/signal";
import { toast } from "sonner";
import { CallSystemContext, PendingStreamData } from "../types";

/**
 * Stream Management Module
 * Handles local and remote stream operations
 */

export class StreamManager {
    private context: CallSystemContext;

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
            const existingIndex = prev.findIndex((s) =>
                s.id.includes(publisherId)
            );

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
    processScreenShareStream = (
        mediaStream: MediaStream,
        publisherId: string,
        mediaType: string,
        data: any
    ) => {
        if (mediaType === "screen") {
            // Screen video stream - use separate screen streams state
            this.context.setters.setScreenStreams((prev) => {
                // Remove any duplicate screen streams for this publisher first
                const filteredStreams = prev.filter(
                    (s) => s.id !== `screen-${publisherId}`
                );

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
                const filteredStreams = prev.filter(
                    (s) => s.id !== `screen-${publisherId}`
                );

                // Find if we have existing screen stream to preserve video
                const existingStream = prev.find(
                    (s) => s.id === `screen-${publisherId}`
                );

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
    processRegularStream = (
        mediaStream: MediaStream,
        uiStreamId: string,
        publisherId: string,
        data: any,
        mediaType: string
    ) => {
        // Add stream to UI state
        setTimeout(() => {
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

                const isAudioStream =
                    data.kind === "audio" || mediaType.includes("mic");
                const isVideoStream =
                    data.kind === "video" || mediaType.includes("webcam");

                const metadata: StreamMetadata = {
                    video: isVideoStream,
                    audio: isAudioStream,
                    type: isAudioStream ? "mic" : "webcam",
                    isScreenShare: false,
                    peerId: publisherId,
                    ...data.metadata,
                };

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
        }, 100);
    };

    /**
     * Update stream metadata
     */
    updateStreamMetadata = (
        streamId: string,
        metadata: any,
        publisherId: string
    ) => {
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
    removeStream = (streamId: string) => {
        if (!streamId) {
            return;
        }

        // Parse stream ID to determine type and peer
        const parts = streamId.split("_");
        const publisherId = parts[0];
        const mediaType = parts[1]; // video, audio, screen, screen_audio

        // Check if this is a screen share stream
        const isScreenShare =
            mediaType === "screen" || mediaType === "screen_audio";

        if (isScreenShare) {
            // Remove screen share stream from regular streams
            this.context.setters.setStreams((prev) =>
                prev.filter((stream) => {
                    const isScreenFromThisPeer =
                        stream.id === `screen-${publisherId}` ||
                        (stream.metadata?.peerId === publisherId &&
                            stream.metadata?.isScreenShare);
                    return !isScreenFromThisPeer;
                })
            );

            // Remove screen share stream from dedicated screen streams state
            this.context.setters.setScreenStreams((prev) =>
                prev.filter((stream) => {
                    const isScreenFromThisPeer =
                        stream.id === `screen-${publisherId}` ||
                        (stream.metadata?.peerId === publisherId &&
                            stream.metadata?.isScreenShare);
                    return !isScreenFromThisPeer;
                })
            );

            // Clean up remote streams map
            this.context.refs.remoteStreamsMapRef.current.delete(
                `screen-${publisherId}`
            );
            this.context.refs.remoteStreamsMapRef.current.delete(
                `screen-audio-${publisherId}`
            );
        } else {
            // Handle regular stream removal
            const remoteStreamId = `remote-${publisherId}-${mediaType}`;
            this.context.refs.remoteStreamsMapRef.current.delete(
                remoteStreamId
            );

            this.context.setters.setStreams((prev) =>
                prev.filter((stream) => stream.id !== remoteStreamId)
            );
        }
    };

    /**
     * Remove streams from a specific peer
     */
    removePeerStreams = (peerId: string) => {
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

        toast.info(`${peerId} left the room`);
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
                const isScreenFromThisPeer =
                    stream.id === `screen-${peerId}` ||
                    (stream.metadata?.peerId === peerId &&
                        stream.metadata?.isScreenShare);
                return !isScreenFromThisPeer;
            })
        );

        // Remove screen share streams from dedicated screen streams state
        this.context.setters.setScreenStreams((prev) =>
            prev.filter((stream) => {
                // Remove streams that match this peer's screen share
                const isScreenFromThisPeer =
                    stream.id === `screen-${peerId}` ||
                    (stream.metadata?.peerId === peerId &&
                        stream.metadata?.isScreenShare);
                return !isScreenFromThisPeer;
            })
        );

        // Clean up remote streams map
        this.context.refs.remoteStreamsMapRef.current.delete(
            `screen-${peerId}`
        );
        this.context.refs.remoteStreamsMapRef.current.delete(
            `screen-audio-${peerId}`
        );
    };

    /**
     * Process pending streams that arrived before transport was ready
     */
    processPendingStreams = () => {
        const pendingStreams = this.context.refs.pendingStreamsRef.current;

        if (pendingStreams.length > 0) {
            for (const streamData of pendingStreams) {
                // Validate streamId
                if (
                    !streamData.streamId ||
                    streamData.streamId === "undefined" ||
                    typeof streamData.streamId !== "string"
                ) {
                    continue;
                }

                // Skip fallback streams
                if (streamData.metadata?.type === "presence") {
                    continue;
                }

                // Check if already consuming
                if (
                    !this.context.refs.consumingStreamsRef.current.has(
                        streamData.streamId
                    )
                ) {
                    try {
                        this.context.refs.consumingStreamsRef.current.add(
                            streamData.streamId
                        );
                        this.context.refs.socketRef.current?.emit(
                            "sfu:consume",
                            {
                                streamId: streamData.streamId,
                                transportId:
                                    this.context.refs.recvTransportRef.current!
                                        .id,
                            }
                        );
                    } catch (error) {
                        console.error(
                            `Failed to consume pending stream ${streamData.streamId}:`,
                            error
                        );
                        this.context.refs.consumingStreamsRef.current.delete(
                            streamData.streamId
                        );
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
}
