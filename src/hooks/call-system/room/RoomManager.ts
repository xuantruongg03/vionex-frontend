import { toast } from "sonner";
import { Device } from "mediasoup-client";
import { ActionRoomType } from "@/interfaces/action";
import { CallSystemContext } from "../types";

/**
 * Room Manager Module
 * Handles room operations like join, leave, lock/unlock, pin users
 */

export class RoomManager {
    private context: CallSystemContext;
    private mediaManager?: any;

    constructor(context: CallSystemContext) {
        this.context = context;
    }

    /**
     * Set media manager reference
     */
    setMediaManager(mediaManager: any) {
        this.mediaManager = mediaManager;
    }

    /**
     * Join room
     */
    joinRoom = async (password?: string): Promise<boolean> => {
                        if (
            !this.context.refs.apiServiceRef.current ||
            !this.context.room.username
        ) {
            console.error(
                "[RoomManager] Service not initialized or username missing"
            );
            this.context.setters.setError(
                "Service not initialized or username missing"
            );
            return false;
        }

        // Prevent duplicate joins using ref
        if (this.context.refs.isJoiningRef.current) {
            console.log("[RoomManager] Already joining (ref check), skipping");
            return false;
        }

        try {
                        this.context.refs.isJoiningRef.current = true;
            this.context.setters.setJoining(true);
            this.context.setters.setLoading(true);
            this.context.setters.setError(null);

            // Set peerId BEFORE making any HTTP requests
            this.context.refs.apiServiceRef.current.setPeerId(
                this.context.room.username
            );

                        const joinResult =
                await this.context.refs.apiServiceRef.current.joinRoom(
                    this.context.roomId,
                    this.context.room.username,
                    password
                );

                        if (joinResult.success) {
                                if (!this.context.refs.deviceRef.current) {
                    this.context.refs.deviceRef.current = new Device();
                }

                if (
                    !this.context.refs.deviceRef.current.loaded &&
                    joinResult.rtpCapabilities
                ) {
                                        await this.context.refs.deviceRef.current.load({
                        routerRtpCapabilities: joinResult.rtpCapabilities,
                    });

                    // Verify that device capabilities are compatible with router
                    const deviceCodecs =
                        this.context.refs.deviceRef.current.rtpCapabilities
                            .codecs || [];
                    const routerCodecs =
                        joinResult.rtpCapabilities.codecs || [];

                    // Check for common codecs
                    const commonCodecs = deviceCodecs.filter((deviceCodec) =>
                        routerCodecs.some(
                            (routerCodec) =>
                                routerCodec.mimeType.toLowerCase() ===
                                deviceCodec.mimeType.toLowerCase()
                        )
                    );

                    if (commonCodecs.length === 0) {
                        throw new Error(
                            "Device and router have no compatible codecs"
                        );
                    }

                                    }

                                this.context.setters.setIsJoined(true);

                // Connect WebSocket and wait for connection
                                this.context.refs.socketRef.current?.connect();

                // Wait for WebSocket connection to be established before proceeding
                                await this.waitForConnection();

                                this.context.refs.socketRef.current?.emit("sfu:join", {
                    roomId: this.context.roomId,
                    peerId: this.context.room.username,
                    password: password,
                });

                this.context.setters.setIsConnected(true);
                toast.success("Joined room successfully");

                // Auto-initialize local media after joining (like old logic)
                setTimeout(async () => {
                    if (!this.context.refs.localStreamRef.current) {
                                                if (this.mediaManager) {
                            await this.mediaManager.initializeLocalMedia();
                        } else {
                            console.warn("[RoomManager] MediaManager not set!");
                        }
                    }
                }, 1000);

                return true;
            }
            return false;
        } catch (error: any) {
            console.error("Join room error:", error);
            let errorMessage = "Failed to join room";

            if (error.message?.includes("ECONNREFUSED")) {
                errorMessage =
                    "Cannot connect to server. Please check if the service is running.";
            } else if (error.message?.includes("ROOM_PASSWORD_REQUIRED")) {
                errorMessage = "This room requires a password";
            } else if (error.message?.includes("INVALID_ROOM_PASSWORD")) {
                errorMessage = "Invalid room password";
            } else if (error.message) {
                errorMessage = error.message;
            }

            this.context.setters.setError(errorMessage);
            toast.error(errorMessage);
            return false;
        } finally {
            this.context.setters.setLoading(false);
            this.context.setters.setJoining(false);
            this.context.refs.isJoiningRef.current = false;
        }
    };

    /**
     * Leave room
     */
    leaveRoom = async () => {
        try {
            // Cleanup local references but don't cleanup global media service
            this.context.refs.sendTransportRef.current?.close();
            this.context.refs.recvTransportRef.current?.close();

            // Reset state
            this.context.setters.setIsJoined(false);
            this.context.setters.setIsConnected(false);
            this.context.setters.setIsWebSocketJoined(false);
            this.context.setters.setStreams([]);
            this.context.refs.isInitializedRef.current = false;
            this.context.refs.isPublishingRef.current = false;
            this.context.refs.localStreamRef.current = null;
            this.context.refs.sendTransportRef.current = null;
            this.context.refs.recvTransportRef.current = null;
            this.context.refs.producersRef.current.clear();
            this.context.refs.consumersRef.current.clear();
            this.context.refs.consumingStreamsRef.current.clear();
            this.context.refs.currentStreamIdsRef.current = {};
            this.context.refs.pendingStreamsRef.current = [];
            this.context.refs.screenStreamRef.current = null;
            this.context.setters.setIsScreenSharing(false);

            this.context.dispatch({
                type: ActionRoomType.RESET,
            });

            this.context.refs.socketRef.current?.disconnect();
        } catch (error) {
            console.error("Error leaving room:", error);
        }
    };

    /**
     * Toggle room lock/unlock
     */
    toggleLockRoom = (password?: string) => {
        if (
            !this.context.setters.setIsJoined ||
            !this.context.roomId ||
            !this.context.refs.socketRef.current
        ) {
            toast.error("Not connected to room");
            return;
        }

        // Check if user is creator
        if (!this.context.room.isCreator) {
            toast.error("Only room creator can lock/unlock the room");
            return;
        }

        if (this.context.room.isLocked) {
            // Unlock room
            this.context.refs.socketRef.current.emit("sfu:unlock-room", {
                roomId: this.context.roomId,
                creatorId: this.context.room.username,
            });
        } else {
            // Lock room
            if (!password || password.trim() === "") {
                toast.error("Password is required to lock the room");
                return;
            }

            this.context.refs.socketRef.current.emit("sfu:lock-room", {
                roomId: this.context.roomId,
                password: password.trim(),
                creatorId: this.context.room.username,
            });
        }
    };

    /**
     * Toggle pin/unpin user
     */
    togglePinUser = (peerId: string) => {
        if (!this.context.setters.setIsJoined || !this.context.roomId) return;

        if (
            this.context.room.pinnedUsers.some((arr: any) =>
                arr.includes(peerId)
            )
        ) {
            this.context.refs.socketRef.current?.emit(
                "sfu:unpin-user",
                {
                    roomId: this.context.roomId,
                    peerId,
                },
                (res: any) => {
                    if (res.success) {
                        this.context.dispatch({
                            type: ActionRoomType.REMOVE_PINNED_USER,
                            payload: peerId,
                        });
                    }
                }
            );
        } else {
            if (!this.context.refs.recvTransportRef.current) {
                toast.error("Receive transport not ready for pinning");
                return;
            }
            this.context.refs.socketRef.current?.emit(
                "sfu:pin-user",
                {
                    roomId: this.context.roomId,
                    peerId,
                },
                (res: any) => {
                    if (res.success) {
                        this.context.dispatch({
                            type: ActionRoomType.SET_PINNED_USERS,
                            payload: { pinnedUsers: [peerId] },
                        });
                    }
                }
            );
        }
    };

    /**
     * Get remote streams via HTTP API
     */
    getRemoteStreams = async () => {
        if (!this.context.refs.apiServiceRef.current) return [];

        try {
            // Ensure peerId is set before making the request
            if (
                this.context.room.username &&
                this.context.refs.apiServiceRef.current
            ) {
                this.context.refs.apiServiceRef.current.setPeerId(
                    this.context.room.username
                );
            }

            const result =
                await this.context.refs.apiServiceRef.current.getStreams(
                    this.context.roomId
                );
            const streams = result.streams || [];

            // Auto-consume remote streams
            if (
                this.context.refs.recvTransportRef.current &&
                streams.length > 0
            ) {
                for (const stream of streams) {
                                        // Skip own streams
                    if (stream.publisherId === this.context.room.username) {
                                                continue;
                    }

                    // Validate streamId - filter out non-stream objects
                    if (
                        !stream.streamId ||
                        stream.streamId === "undefined" ||
                        typeof stream.streamId !== "string" ||
                        !stream.publisherId ||
                        !stream.producerId
                    ) {
                        console.warn(
                            "Invalid or incomplete stream object in getRemoteStreams:",
                            stream
                        );
                        continue;
                    }

                    // Skip presence-type streams
                    if ((stream.metadata as any)?.type === "presence") {
                        continue;
                    }

                    // Check if already consuming this stream
                    if (
                        this.context.refs.consumingStreamsRef.current.has(
                            stream.streamId
                        )
                    ) {
                        continue;
                    }

                    try {
                        // Mark as consuming to prevent duplicates
                        this.context.refs.consumingStreamsRef.current.add(
                            stream.streamId
                        );

                        // Use WebSocket consume for consistency
                        if (this.context.refs.socketRef.current) {
                            this.context.refs.socketRef.current.emit(
                                "sfu:consume",
                                {
                                    streamId: stream.streamId,
                                    transportId:
                                        this.context.refs.recvTransportRef
                                            .current.id,
                                }
                            );
                        } else {
                            // Fallback to HTTP if no WebSocket
                            await this.context.refs.apiServiceRef.current.consumeHttp(
                                this.context.refs.recvTransportRef.current.id,
                                stream.streamId,
                                this.context.refs.deviceRef.current
                                    ?.rtpCapabilities,
                                this.context.roomId,
                                this.context.room.username
                            );
                        }
                    } catch (error) {
                        console.error(
                            "Failed to consume remote stream:",
                            stream.streamId,
                            error
                        );
                        // Remove from consuming set on error
                        this.context.refs.consumingStreamsRef.current.delete(
                            stream.streamId
                        );
                    }
                }
            }

            return streams;
        } catch (error) {
            return [];
        }
    };

    /**
     * Wait for WebSocket connection to be established
     */
    private waitForConnection = (): Promise<void> => {
        return new Promise<void>((resolve) => {
            const checkConnection = () => {
                if (this.context.refs.socketRef.current?.id) {
                    // Set the peerId for HTTP authentication
                    if (
                        this.context.room.username &&
                        this.context.refs.apiServiceRef.current
                    ) {
                        this.context.refs.apiServiceRef.current.setPeerId(
                            this.context.room.username
                        );
                                            }
                    resolve();
                } else {
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
    };
}
