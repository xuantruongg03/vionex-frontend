import { CallSystemContext } from "../types";
import { StreamManager } from "../streams/StreamManager";

/**
 * Consumer Manager Module
 * Handles MediaSoup consumer creation and management
 */

export class ConsumerManager {
    private context: CallSystemContext;
    private streamManager: StreamManager;

    constructor(context: CallSystemContext, streamManager: StreamManager) {
        this.context = context;
        this.streamManager = streamManager;
    }

    /**
     * Create consumer from MediaSoup transport
     * @param data Consumer data from MediaSoup
     */
    createConsumer = async (data: any) => {
        if (!this.context.refs.recvTransportRef.current) {
            console.warn("[ConsumerManager] No receive transport available");
            return;
        }

        // Normalize stream properties - handle both streamId and stream_id
        const streamId = data.streamId;

        // Enhanced validation for streamId
        if (!streamId || streamId === "undefined" || streamId === "null" || typeof streamId !== "string" || streamId.trim().length === 0) {
            console.warn("[ConsumerManager] Invalid streamId:", streamId);
            return;
        }

        // Validate required fields
        const requiredFields = ["consumerId", "producerId", "kind", "rtpParameters"];
        const missingFields = requiredFields.filter((field) => !data[field]);

        if (missingFields.length > 0) {
            console.error(`[ConsumerManager] Missing required fields: ${missingFields.join(", ")} for stream ${streamId}`);
            // Clean up consuming tracking on error
            this.streamManager.removeFromConsuming(streamId);

            // Try to handle as fallback stream if we have at least a streamId
            if (streamId) {
                this.streamManager.handleInvalidConsumerAsPresence(streamId);
            }
            return;
        }

        // Check if we already have a consumer for this consumerId OR streamId
        if (this.context.refs.consumersRef.current.has(data.consumerId)) {
            this.streamManager.removeFromConsuming(streamId);
            return;
        }

        // Also check if we're already consuming this streamId with different consumerId
        const existingConsumerForStream = Array.from(this.context.refs.consumersRef.current.values()).find((consumer) => consumer.streamId === streamId);
        if (existingConsumerForStream) {
            this.streamManager.removeFromConsuming(streamId);
            return;
        }

        try {
            const consumer = await this.context.refs.recvTransportRef.current.consume({
                id: data.consumerId,
                producerId: data.producerId,
                kind: data.kind,
                rtpParameters: data.rtpParameters,
            });

            // Clean up consuming tracking - consumer created successfully
            this.streamManager.removeFromConsuming(streamId);

            // Add to consumers map
            this.context.refs.consumersRef.current.set(data.consumerId, {
                consumer,
                streamId: streamId,
            });

            this.context.refs.socketRef.current?.emit("sfu:resume-consumer", {
                consumerId: data.consumerId,
                roomId: this.context.roomId,
                participantId: this.context.room.username,
            });

            // Create remote stream ID (similar to old client logic)
            const parts = streamId.split("_");

            // Handle different stream types for publisherId extraction
            let publisherId: string;
            let mediaType: string;

            if (streamId.startsWith("translated_")) {
                // For translation streams: use metadata instead of parsing streamId
                publisherId = data.metadata?.targetUserId || "unknown";
                mediaType = "audio"; // Translation streams are always audio
            } else {
                // For regular streams: Uuu_audio_timestamp_random
                publisherId = parts[0]; // "Uuu"
                mediaType = parts[1]; // "audio" or "video" etc
            }

            // Double check stream ownership and determine if we should skip
            const isOwnStream = publisherId === this.context.room.username;
            const isScreenShare = mediaType === "screen" || mediaType === "screen_audio";

            // More robust check for own streams - also check for empty/invalid publisherId
            if (isOwnStream && !isScreenShare && publisherId && publisherId.length > 0) {
                // Skip own regular streams (audio/video) but allow own screen shares
                this.streamManager.removeFromConsuming(streamId);

                // Cleanup the consumer that was created
                if (consumer) {
                    consumer.close();
                }
                return;
            }

            // Determine if this is a translation stream
            const isTranslationStream = streamId.startsWith("translated_");

            // Create unique stream ID for UI
            let uiStreamId: string;
            if (isTranslationStream) {
                // For translation streams, use pattern that matches getUserAudioStream logic
                const targetUserId = data.metadata?.targetUserId || publisherId;
                uiStreamId = `remote-${targetUserId}-translated`;
            } else if (isScreenShare) {
                // For screen share, create separate streams for video and audio
                if (mediaType === "screen") {
                    uiStreamId = `screen-${publisherId}`;
                } else if (mediaType === "screen_audio") {
                    uiStreamId = `screen-audio-${publisherId}`;
                } else {
                    uiStreamId = `screen-${publisherId}`;
                }
            } else {
                uiStreamId = `remote-${publisherId}-${mediaType}`;
            }

            // Get or create MediaStream
            let mediaStream = this.context.refs.remoteStreamsMapRef.current.get(uiStreamId);
            if (!mediaStream) {
                mediaStream = new MediaStream();
                this.context.refs.remoteStreamsMapRef.current.set(uiStreamId, mediaStream);
            }

            // Add track to stream
            mediaStream.addTrack(consumer.track);

            // Resume consumer
            consumer.resume();

            // Process the stream based on type
            if (isTranslationStream) {
                // Handle translation stream - replace/pause original user's audio
                const targetUserId = publisherId;
                this.handleTranslationStream(consumer, mediaStream, targetUserId, data, streamId);
            } else if (isScreenShare) {
                this.streamManager.processScreenShareStream(mediaStream, publisherId, mediaType, data);
            } else {
                // Regular webcam stream handling
                if (publisherId === this.context.room.username) {
                    this.streamManager.removeFromConsuming(streamId);
                    if (consumer) {
                        consumer.close();
                    }
                    return;
                }

                // Get or create MediaStream for this remote publisher
                let currentStream = this.context.refs.remoteStreamsMapRef.current.get(uiStreamId);

                if (currentStream) {
                    try {
                        // Check if track is already in the stream to avoid duplicates
                        const existingTracks = currentStream.getTracks();
                        const trackExists = existingTracks.some((track) => track.id === consumer.track.id || (track.kind === consumer.track.kind && track.label === consumer.track.label));

                        if (!trackExists) {
                            currentStream.addTrack(consumer.track);
                        }
                    } catch (e) {
                        console.warn(`[ConsumerManager] Failed to add track to existing stream, creating new one:`, e);
                        currentStream = new MediaStream([consumer.track]);
                        this.context.refs.remoteStreamsMapRef.current.set(uiStreamId, currentStream);
                    }
                } else {
                    currentStream = new MediaStream([consumer.track]);
                    this.context.refs.remoteStreamsMapRef.current.set(uiStreamId, currentStream);
                }

                this.streamManager.processRegularStream(currentStream, uiStreamId, publisherId, data, mediaType);
            }
        } catch (error) {
            console.error("[Error ConsumerManager]: ", error);
            // Clean up on error
            this.streamManager.removeFromConsuming(streamId);

            // If consumer creation fails, we should still try to handle the stream as fallback
            this.streamManager.handleInvalidConsumerAsPresence(streamId);
        }
    };

    /**
     * Handle translation stream - add as separate stream (don't replace original)
     */
    private handleTranslationStream = (consumer: any, translationStream: MediaStream, targetUserId: string, data: any, streamId: string) => {
        // Simply add translation stream as new stream alongside original
        setTimeout(() => {
            this.context.setters.setStreams((prevStreams) => {
                // Check if translation stream already exists
                const translationExists = prevStreams.some((stream) => stream.id === `remote-${targetUserId}-translated`);

                if (translationExists) {
                    return prevStreams; // Already exists, don't add duplicate
                }

                // Add new translation stream
                const newTranslatedStream = {
                    id: `remote-${targetUserId}-translated`,
                    stream: translationStream,
                    metadata: {
                        ...data.metadata,
                        isTranslation: true,
                        targetUserId: targetUserId,
                    },
                };

                return [...prevStreams, newTranslatedStream];
            });
        }, 50);
    };

    /**
     * Resume consumer
     */
    resumeConsumer = async (data: any) => {
        // Consumer resumed, no action needed
    };

    /**
     * Revert translation stream back to original audio
     */
    revertTranslationStream = (targetUserId: string) => {
        // Find and resume paused original audio consumers
        const originalConsumers = Array.from(this.context.refs.consumersRef.current.entries()).filter(([consumerId, consumerInfo]) => {
            return (consumerInfo.streamId.includes(`${targetUserId}_mic`) || consumerInfo.streamId.includes(`${targetUserId}_audio`) || consumerInfo.streamId.includes(`${targetUserId}_`)) && consumerInfo.consumer.paused;
        });

        // Resume original audio consumers
        originalConsumers.forEach(([consumerId, consumerInfo]) => {
            try {
                consumerInfo.consumer.resume();
            } catch (error) {
                console.error(`[ConsumerManager] Error resuming consumer ${consumerId}:`, error);
            }
        });

        // Remove translation stream from UI and close its consumer
        setTimeout(() => {
            this.context.setters.setStreams((prevStreams) => {
                return prevStreams.filter((streamInfo) => {
                    // Find translation stream for this user
                    if (streamInfo.metadata?.isTranslation && streamInfo.metadata?.targetUserId === targetUserId) {
                        // Find and close the translation consumer
                        const translationConsumer = Array.from(this.context.refs.consumersRef.current.entries()).find(([_, consumerInfo]) => {
                            return consumerInfo.streamId.startsWith("translated_") && (consumerInfo.streamId.includes(targetUserId) || streamInfo.metadata?.targetUserId === targetUserId);
                        });

                        if (translationConsumer) {
                            const [consumerId, consumerInfo] = translationConsumer;
                            try {
                                consumerInfo.consumer.close();
                                this.context.refs.consumersRef.current.delete(consumerId);
                                console.log(`[ConsumerManager] Closed translation consumer: ${consumerId}`);
                            } catch (error) {
                                console.error(`[ConsumerManager] Error closing translation consumer:`, error);
                            }
                        }

                        // Remove translation stream from remoteStreamsMap
                        const translationStreamId = `remote-${targetUserId}-translated`;
                        this.context.refs.remoteStreamsMapRef.current.delete(translationStreamId);

                        console.log(`[ConsumerManager] Removed translation stream from UI for user: ${targetUserId}`);
                        return false; // Remove this stream from UI
                    }
                    return true; // Keep other streams
                });
            });
        }, 50);
    };

    /**
     * Remove consumer
     */
    removeConsumer = (data: { consumerId: string; reason: string }) => {
        // Remove from consumers map
        const consumer = Array.from(this.context.refs.consumersRef.current.values()).find((c) => c.consumer.id === data.consumerId);

        if (consumer) {
            consumer.consumer.close();
            this.context.refs.consumersRef.current.delete(data.consumerId);
        }
    };

    /**
     * Cleanup all consumers
     */
    cleanup = () => {
        this.context.refs.consumersRef.current.forEach((consumer) => {
            consumer.consumer.close();
        });
        this.context.refs.consumersRef.current.clear();
        this.context.refs.consumingStreamsRef.current.clear();
    };
}
