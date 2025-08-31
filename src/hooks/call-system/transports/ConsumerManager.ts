/*!
 * Copyright (c) 2025 xuantruongg003
 *
 * This software is licensed for non-commercial use only.
 * You may use, study, and modify this code for educational and research purposes.
 *
 * Commercial use of this code, in whole or in part, is strictly prohibited
 * without prior written permission from the author.
 *
 * Author Contact: lexuantruong098@gmail.com
 */

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
        const requiredFields = [
            "consumerId",
            "producerId",
            "kind",
            "rtpParameters",
        ];
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
            const consumer =
                await this.context.refs.recvTransportRef.current.consume({
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
                // For translation streams: translated_Uuu_vi_en
                publisherId = parts[1]; // "Uuu"
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
            let mediaStream =
                this.context.refs.remoteStreamsMapRef.current.get(uiStreamId);
            if (!mediaStream) {
                mediaStream = new MediaStream();
                this.context.refs.remoteStreamsMapRef.current.set(
                    uiStreamId,
                    mediaStream
                );
            }

            // Add track to stream
            mediaStream.addTrack(consumer.track);

            // Resume consumer
            consumer.resume();

            // Process the stream based on type
            if (isTranslationStream) {
                // Handle translation stream - replace/pause original user's audio
                const targetUserId = publisherId;
                this.handleTranslationStream(
                    consumer,
                    mediaStream,
                    targetUserId,
                    data,
                    streamId
                );
            } else if (isScreenShare) {
                this.streamManager.processScreenShareStream(
                    mediaStream,
                    publisherId,
                    mediaType,
                    data
                );
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
                let currentStream =
                    this.context.refs.remoteStreamsMapRef.current.get(
                        uiStreamId
                    );

                if (currentStream) {
                    try {
                        currentStream.addTrack(consumer.track);
                    } catch (e) {
                        currentStream = new MediaStream([consumer.track]);
                        this.context.refs.remoteStreamsMapRef.current.set(
                            uiStreamId,
                            currentStream
                        );
                    }
                } else {
                    currentStream = new MediaStream([consumer.track]);
                    this.context.refs.remoteStreamsMapRef.current.set(
                        uiStreamId,
                        currentStream
                    );
                }

                this.streamManager.processRegularStream(
                    mediaStream,
                    uiStreamId,
                    publisherId,
                    data,
                    mediaType
                );
            }
        } catch (error) {
            // Clean up on error
            this.streamManager.removeFromConsuming(streamId);

            // If consumer creation fails, we should still try to handle the stream as fallback
            this.streamManager.handleInvalidConsumerAsPresence(streamId);
        }
    };

    /**
     * Handle translation stream - replace original audio stream
     */
    private handleTranslationStream = (
        consumer: any,
        translationStream: MediaStream,
        targetUserId: string,
        data: any,
        streamId: string
    ) => {
        // Find and pause existing consumers for this user's audio
        const existingConsumers = Array.from(
            this.context.refs.consumersRef.current.entries()
        ).filter(([consumerId, consumerInfo]) => {
            return (
                consumerInfo.streamId.includes(`${targetUserId}_mic`) ||
                consumerInfo.streamId.includes(`${targetUserId}_audio`)
            );
        });

        // Pause original audio consumers to stop consuming original stream
        existingConsumers.forEach(([consumerId, consumerInfo]) => {
            consumerInfo.consumer.pause();
        });

        // Replace stream in UI list - find existing mic stream and replace it
        setTimeout(() => {
            this.context.setters.setStreams((prevStreams) => {
                return prevStreams.map((streamInfo) => {
                    // Find the original mic stream for this user
                    if (
                        (streamInfo.id === `remote-${targetUserId}-mic` ||
                            streamInfo.id === `remote-${targetUserId}-audio`)
                    ) {
                        // Replace with translation stream, keeping same ID for seamless UI
                        return {
                            ...streamInfo,
                            stream: translationStream, // Replace the MediaStream
                            metadata: {
                                ...streamInfo.metadata,
                                isTranslation: true,
                                targetUserId: targetUserId,
                            },
                        };
                    }
                    return streamInfo;
                });
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
        // Find paused original audio consumers and resume them
        const pausedConsumers = Array.from(
            this.context.refs.consumersRef.current.entries()
        ).filter(([consumerId, consumerInfo]) => {
            return (
                (consumerInfo.streamId.includes(`${targetUserId}_mic`) ||
                    consumerInfo.streamId.includes(`${targetUserId}_audio`)) &&
                consumerInfo.consumer.paused
            );
        });

        // Resume original audio consumers
        pausedConsumers.forEach(([consumerId, consumerInfo]) => {
            consumerInfo.consumer.resume();
        });

        // Revert stream in UI list - find translation stream and revert it back
        setTimeout(() => {
            this.context.setters.setStreams((prevStreams) => {
                return prevStreams.map((streamInfo) => {
                    // Find translation stream for this user
                    if (
                        streamInfo.metadata?.isTranslation &&
                        streamInfo.metadata?.targetUserId === targetUserId
                    ) {
                        // Find original consumer to get the original stream
                        const originalConsumer = pausedConsumers.find(
                            ([_, consumerInfo]) =>
                                consumerInfo.streamId.includes(
                                    `${targetUserId}_mic`
                                ) ||
                                consumerInfo.streamId.includes(
                                    `${targetUserId}_audio`
                                )
                        );

                        if (originalConsumer) {
                            const [_, consumerInfo] = originalConsumer;
                            const originalStream = new MediaStream([
                                consumerInfo.consumer.track,
                            ]);

                            // Revert back to original stream
                            return {
                                ...streamInfo,
                                stream: originalStream, // Replace with original MediaStream
                                metadata: {
                                    ...streamInfo.metadata,
                                    isTranslation: false,
                                    targetUserId: undefined,
                                },
                            };
                        }
                    }
                    return streamInfo;
                });
            });
        }, 50);
    };

    /**
     * Remove consumer
     */
    removeConsumer = (data: { consumerId: string; reason: string }) => {
        // Remove from consumers map
        const consumer = Array.from(
            this.context.refs.consumersRef.current.values()
        ).find((c) => c.consumer.id === data.consumerId);

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
