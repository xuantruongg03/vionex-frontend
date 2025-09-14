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
            return;
        }

        // Normalize stream properties - handle both streamId and stream_id
        const streamId = data.streamId;

        // Validate required fields
        const requiredFields = ["consumerId", "producerId", "kind", "rtpParameters"];
        const missingFields = requiredFields.filter((field) => !data[field]);

        if (missingFields.length > 0) {
            // Clean up consuming tracking on error
            this.streamManager.removeFromConsuming(streamId);

            // Try to handle as fallback stream if we have at least a streamId
            if (streamId) {
                this.streamManager.handleInvalidConsumerAsPresence(streamId);
            }
            return;
        }

        // Check if we already have a consumer for this consumerId
        if (this.context.refs.consumersRef.current.has(data.consumerId)) {
            this.streamManager.removeFromConsuming(streamId);
            return;
        }

        try {
            // Enhanced validation of RTP parameters before consumer creation
            if (!data.rtpParameters || !data.rtpParameters.codecs) {
                console.error("[ConsumerManager] Invalid RTP parameters:", data);
                throw new Error("Invalid RTP parameters: missing codecs");
            }

            // Validate codec compatibility
            const primaryCodec = data.rtpParameters.codecs[0];
            if (!primaryCodec || !primaryCodec.mimeType) {
                console.error("[ConsumerManager] Invalid primary codec:", primaryCodec);
                throw new Error("Invalid primary codec in RTP parameters");
            }

            // Log codec information for debugging
            console.log(`[ConsumerManager] Creating consumer for ${streamId}`, {
                kind: data.kind,
                codec: primaryCodec.mimeType,
                payloadType: primaryCodec.payloadType,
                clockRate: primaryCodec.clockRate,
                parameters: primaryCodec.parameters,
            });

            // Check for known problematic H.264 profiles
            if (primaryCodec.mimeType.toLowerCase() === 'video/h264' && 
                primaryCodec.parameters?.['profile-level-id']) {
                const profileLevel = primaryCodec.parameters['profile-level-id'];
                console.log(`[ConsumerManager] H.264 profile-level-id: ${profileLevel}`);
                
                // Warn about high profiles that might cause issues
                if (profileLevel.startsWith('4d') || profileLevel.startsWith('64')) {
                    console.warn(`[ConsumerManager] High H.264 profile detected (${profileLevel}), may cause compatibility issues`);
                }
            }

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

            if (isOwnStream && !isScreenShare) {
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
                        currentStream.addTrack(consumer.track);
                    } catch (e) {
                        currentStream = new MediaStream([consumer.track]);
                        this.context.refs.remoteStreamsMapRef.current.set(uiStreamId, currentStream);
                    }
                } else {
                    currentStream = new MediaStream([consumer.track]);
                    this.context.refs.remoteStreamsMapRef.current.set(uiStreamId, currentStream);
                }

                this.streamManager.processRegularStream(mediaStream, uiStreamId, publisherId, data, mediaType);
            }
        } catch (error) {
            console.error("[Error ConsumerManager]: ", error);
            
            // Enhanced error handling with specific error types
            if (error.message?.includes('setRemoteDescription') || 
                error.message?.includes('Failed to set recv parameters')) {
                console.error("[ConsumerManager] WebRTC setRemoteDescription error - codec mismatch or RTP parameter issue", {
                    streamId,
                    error: error.message,
                    rtpParameters: data.rtpParameters,
                    codec: data.rtpParameters?.codecs?.[0]?.mimeType,
                    profileLevelId: data.rtpParameters?.codecs?.[0]?.parameters?.['profile-level-id'],
                });
                
                // Emit specific error to notify UI
                this.context.refs.socketRef.current?.emit('sfu:consumer-error', {
                    streamId,
                    error: 'Video codec not supported by your device',
                    errorType: 'RTP_PARAMETERS_MISMATCH',
                    details: {
                        codec: data.rtpParameters?.codecs?.[0]?.mimeType,
                        profileLevelId: data.rtpParameters?.codecs?.[0]?.parameters?.['profile-level-id']
                    }
                });
            } else if (error.message?.includes('InvalidAccessError')) {
                console.error("[ConsumerManager] WebRTC InvalidAccessError - transport or connection issue", {
                    streamId,
                    error: error.message,
                });
                
                // Try to request stream refresh
                this.context.refs.socketRef.current?.emit('sfu:request-stream-refresh', {
                    streamId,
                    reason: 'InvalidAccessError'
                });
            } else if (error.message?.includes('OperationError')) {
                console.error("[ConsumerManager] WebRTC OperationError - likely codec negotiation failure", {
                    streamId,
                    error: error.message,
                });
                
                this.context.refs.socketRef.current?.emit('sfu:consumer-error', {
                    streamId,
                    error: 'Unable to decode video stream',
                    errorType: 'CODEC_NEGOTIATION_FAILED'
                });
            }

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
        // No need to pause or replace anything - let UI choose which one to use
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
        console.log(`[ConsumerManager] Reverting translation stream for user: ${targetUserId}`);

        // Find and resume paused original audio consumers
        const originalConsumers = Array.from(this.context.refs.consumersRef.current.entries()).filter(([consumerId, consumerInfo]) => {
            return (consumerInfo.streamId.includes(`${targetUserId}_mic`) || consumerInfo.streamId.includes(`${targetUserId}_audio`) || consumerInfo.streamId.includes(`${targetUserId}_`)) && consumerInfo.consumer.paused;
        });

        // Resume original audio consumers
        originalConsumers.forEach(([consumerId, consumerInfo]) => {
            try {
                consumerInfo.consumer.resume();
                console.log(`[ConsumerManager] Resumed original consumer: ${consumerId}`);
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
