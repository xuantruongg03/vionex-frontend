import { ActionRoomType } from "@/interfaces/action";
import { toast } from "sonner";
import { CallSystemContext } from "../types";

/**
 * Room Manager Module
 * Handles room operations like join, leave, lock/unlock, pin users
 */

export class RoomManager {
    private context: CallSystemContext;
    private mediaManager?: any;
    private transportManager?: any;
    private socketEventHandlers?: any;

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
     * Set transport manager reference
     */
    setTransportManager(transportManager: any) {
        this.transportManager = transportManager;
    }

    /**
     * Set socket event handlers reference
     */
    setSocketEventHandlers(socketEventHandlers: any) {
        this.socketEventHandlers = socketEventHandlers;
    }

    /**
     * Join room
     */
    joinRoom = async (password?: string): Promise<boolean> => {
        if (!this.context.refs.apiServiceRef.current || !this.context.room.username) {
            console.error("[RoomManager] Service not initialized or username missing");
            this.context.setters.setError("Service not initialized or username missing");
            return false;
        }

        // Prevent duplicate joins using ref
        if (this.context.refs.isJoiningRef.current) {
            return false;
        }

        try {
            this.context.refs.isJoiningRef.current = true;
            this.context.setters.setJoining(true);
            this.context.setters.setLoading(true);
            this.context.setters.setError(null);

            // Check socket connection
            if (!this.context.refs.socketRef.current?.connected) {
                throw new Error("Socket is not connected");
            }

            // Join directly via WebSocket only
            this.context.refs.socketRef.current.emit("sfu:join", {
                roomId: this.context.roomId,
                peerId: this.context.room.username,
                password: password,
                userInfo: this.context.room.userInfo, // Add user info
            });

            // Wait for join success and router capabilities
            const joinSuccess = await new Promise<boolean>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Join timeout"));
                }, 10000);

                const handleJoinSuccess = (data: { peerId: string; isCreator: boolean; roomId: string; roomKey?: string }) => {
                    clearTimeout(timeout);

                    // Dispatch roomKey to Redux
                    if (data.roomKey) {
                        this.context.dispatch({
                            type: ActionRoomType.JOIN_ROOM,
                            payload: {
                                roomKey: data.roomKey,
                            },
                        });
                    }

                    this.context.setters.setIsConnected(true);
                    this.context.setters.setIsJoined(true);
                    resolve(true);
                };

                const handleJoinError = (error: any) => {
                    clearTimeout(timeout);
                    reject(new Error(error.message || "Join failed"));
                };

                this.context.refs.socketRef.current?.once("sfu:join-success", handleJoinSuccess);
                this.context.refs.socketRef.current?.once("sfu:error", handleJoinError);
            });

            if (joinSuccess) {
                toast.success("Joined room successfully");

                // Auto-initialize local media after joining
                setTimeout(async () => {
                    if (!this.context.refs.localStreamRef.current && this.mediaManager) {
                        await this.mediaManager.initializeLocalMedia();
                        // Force sync metadata after initialization to ensure correct state
                        setTimeout(async () => {
                            await this.mediaManager.forceSyncMetadata();
                        }, 2000);
                    }
                }, 1000);

                return true;
            }
            return false;
        } catch (error: any) {
            let errorMessage = "Failed to join room";

            if (error.message?.includes("ECONNREFUSED")) {
                errorMessage = "Cannot connect to server. Please check if the service is running.";
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
            // Cleanup screen share if active before leaving
            if (this.context.state.isScreenSharing && this.mediaManager) {
                this.mediaManager.handleScreenShareEnded();
            }

            // Cleanup local references but don't cleanup global media service
            this.context.refs.sendTransportRef.current?.close();
            this.context.refs.recvTransportRef.current?.close();

            // Reset state
            this.context.setters.setIsJoined(false);
            this.context.setters.setIsConnected(false);
            this.context.setters.setIsWebSocketJoined(false);
            this.context.setters.setStreams([]);
            this.context.setters.setScreenStreams([]);
            this.context.setters.setIsScreenSharing(false);
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
        if (!this.context.setters.setIsJoined || !this.context.roomId || !this.context.refs.socketRef.current) {
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
            this.context.refs.socketRef.current.emit(
                "sfu:unlock-room",
                {
                    roomId: this.context.roomId,
                    creatorId: this.context.room.username,
                },
                (response: any) => {
                    if (response.success) {
                        toast.success(response.message || "Room unlocked successfully");
                    } else {
                        toast.error(response.message || "Failed to unlock room");
                    }
                }
            );
        } else {
            // Lock room
            if (!password || password.trim() === "") {
                toast.error("Password is required to lock the room");
                return;
            }

            this.context.refs.socketRef.current.emit(
                "sfu:lock-room",
                {
                    roomId: this.context.roomId,
                    password: password.trim(),
                    creatorId: this.context.room.username,
                },
                (response: any) => {
                    if (response.success) {
                        toast.success(response.message || "Room locked successfully");
                    } else {
                        toast.error(response.message || "Failed to lock room");
                    }
                }
            );
        }
    };

    /**
     * Toggle pin/unpin user
     */
    togglePinUser = (peerId: string) => {
        if (!this.context.setters.setIsJoined || !this.context.roomId) return;

        if (this.context.room.pinnedUsers.includes(peerId)) {
            // Unpin user
            this.context.refs.socketRef.current?.emit(
                "sfu:unpin-user",
                {
                    roomId: this.context.roomId,
                    unpinnedPeerId: peerId, // Use proper field name
                },
                (res: any) => {
                    if (res.success) {
                        this.context.dispatch({
                            type: ActionRoomType.REMOVE_PINNED_USER,
                            payload: peerId,
                        });

                        // Show appropriate message
                        if (res.stillInPriority) {
                            toast.success(`Unpinned user ${peerId} (still in priority view)`);
                        } else {
                            toast.success(`Unpinned user ${peerId}`);
                        }
                    } else {
                        toast.error(res.message || "Failed to unpin user");
                    }
                }
            );
        } else {
            // Pin user
            if (!this.context.refs.recvTransportRef.current) {
                toast.error("Receive transport not ready for pinning");
                return;
            }
            this.context.refs.socketRef.current?.emit(
                "sfu:pin-user",
                {
                    roomId: this.context.roomId,
                    pinnedPeerId: peerId, // Use proper field name
                    transportId: this.context.refs.recvTransportRef.current.id,
                },
                (res: any) => {
                    if (res.success) {
                        // Update Redux state regardless of whether it's already in priority
                        this.context.dispatch({
                            type: ActionRoomType.SET_PINNED_USERS,
                            payload: { pinnedUsers: peerId },
                        });

                        // Process consumers created by pin action
                        if (res.consumersCreated && res.consumersCreated.length > 0) {
                            // Use socketEventHandlers to create consumers
                            if (this.socketEventHandlers) {
                                const consumerManager = this.socketEventHandlers.getConsumerManager();
                                res.consumersCreated.forEach((consumerData: any) => {
                                    consumerManager.createConsumer(consumerData);
                                });
                            } else {
                                console.error("[RoomManager] socketEventHandlers not available for creating consumers");
                            }
                        }

                        // Show appropriate message
                        if (res.alreadyPriority) {
                            toast.success(`Pinned user ${peerId} (already in priority view)`);
                        } else {
                            toast.success(`Pinned user ${peerId}`);
                        }
                    } else {
                        console.error("[RoomManager] Pin failed:", res.message);
                        toast.error(res.message || "Failed to pin user");
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
            if (this.context.room.username && this.context.refs.apiServiceRef.current) {
                this.context.refs.apiServiceRef.current.setPeerId(this.context.room.username);
            }

            const result = await this.context.refs.apiServiceRef.current.getStreams(this.context.roomId);
            const streams = result.streams || [];

            // Auto-consume remote streams
            if (this.context.refs.recvTransportRef.current && streams.length > 0) {
                for (const stream of streams) {
                    // Skip own streams
                    if (stream.publisherId === this.context.room.username) {
                        continue;
                    }

                    // Validate streamId - filter out non-stream objects
                    if (!stream.streamId || stream.streamId === "undefined" || typeof stream.streamId !== "string" || !stream.publisherId || !stream.producerId) {
                        console.warn("Invalid or incomplete stream object in getRemoteStreams:", stream);
                        continue;
                    }

                    // Skip presence-type streams
                    if ((stream.metadata as any)?.type === "presence") {
                        continue;
                    }

                    // Check if already consuming this stream
                    if (this.context.refs.consumingStreamsRef.current.has(stream.streamId)) {
                        continue;
                    }

                    try {
                        // Mark as consuming to prevent duplicates
                        this.context.refs.consumingStreamsRef.current.add(stream.streamId);

                        // Use WebSocket consume for consistency
                        if (this.context.refs.socketRef.current) {
                            this.context.refs.socketRef.current.emit("sfu:consume", {
                                streamId: stream.streamId,
                                transportId: this.context.refs.recvTransportRef.current.id,
                            });
                        } else {
                            // Fallback to HTTP if no WebSocket
                            await this.context.refs.apiServiceRef.current.consumeHttp(this.context.refs.recvTransportRef.current.id, stream.streamId, this.context.refs.deviceRef.current?.rtpCapabilities, this.context.roomId, this.context.room.username);
                        }
                    } catch (error) {
                        console.error("Failed to consume remote stream:", stream.streamId, error);
                        // Remove from consuming set on error
                        this.context.refs.consumingStreamsRef.current.delete(stream.streamId);
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
                    if (this.context.room.username && this.context.refs.apiServiceRef.current) {
                        this.context.refs.apiServiceRef.current.setPeerId(this.context.room.username);
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
