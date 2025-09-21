import { io, Socket } from "socket.io-client";

const WEBSOCKET_URL = "http://localhost:3005";
const HTTP_API_URL = "http://localhost:3005";

class WebSocketService {
    private socket: Socket | null = null;

    connect(socketId?: string) {
        if (this.socket) return;

        this.socket = io(WEBSOCKET_URL, {
            transports: ["websocket"],
            reconnection: true,
            autoConnect: true,
        });

        // Store socket ID when available
        this.socket.on("connect", () => {
            console.log("[WS] Connected with socket ID:", this.socket?.id);
        });

        this.socket.on("disconnect", (reason) => {
            console.log("[WS] Disconnected:", reason);
        });

        this.socket.on("connect_error", (error) => {
            console.error("[WS] Connection error:", error);
        });
    }

    getSocketId(): string | undefined {
        return this.socket?.id;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
    on(event: string, handler: (...args: any[]) => void) {
        this.socket?.on(event, handler);
    }

    off(event: string, handler?: (...args: any[]) => void) {
        this.socket?.off(event, handler);
    }

    emit(event: string, data?: any) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    // New hybrid approach: HTTP first, then WebSocket
    async joinRoom(roomId: string, peerId: string, password?: string, userInfo?: any) {
        try {
            console.log("[WS] Starting hybrid join process for room:", roomId);

            // Step 1: Join room via HTTP API first
            const joinResponse = await fetch(`${HTTP_API_URL}/room/${roomId}/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    peerId,
                    password,
                    userInfo,
                }),
            });

            if (!joinResponse.ok) {
                const error = await joinResponse.json();
                throw new Error(error.message || "Failed to join room via HTTP");
            }

            const joinResult = await joinResponse.json();
            console.log("[WS] Joined room via HTTP:", joinResult);

            // Wait for WebSocket connection if not connected
            if (!this.socket?.connected) {
                await new Promise<void>((resolve) => {
                    if (this.socket?.connected) {
                        resolve();
                        return;
                    }
                    this.socket?.once("connect", () => resolve());
                });
            }

            // Step 2: Connect WebSocket to room
            const socketId = this.getSocketId();
            if (!socketId) {
                throw new Error("WebSocket not connected");
            }

            const wsConnectResponse = await fetch(`${HTTP_API_URL}/room/${roomId}/connect-websocket`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    peerId,
                    socketId,
                }),
            });

            if (!wsConnectResponse.ok) {
                const error = await wsConnectResponse.json();
                throw new Error(error.message || "Failed to connect WebSocket");
            }

            console.log("[WS] WebSocket connected to room:", roomId);

            // Step 3: Setup media room
            const mediaSetupResponse = await fetch(`${HTTP_API_URL}/room/${roomId}/setup-media`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    peerId,
                }),
            });

            if (!mediaSetupResponse.ok) {
                const error = await mediaSetupResponse.json();
                throw new Error(error.message || "Failed to setup media");
            }

            const mediaSetupResult = await mediaSetupResponse.json();
            console.log("[WS] Media setup completed:", mediaSetupResult);

            // Now emit WebSocket event to complete the process
            this.socket?.emit("sfu:join-complete", {
                roomId,
                peerId,
                routerRtpCapabilities: mediaSetupResult.routerRtpCapabilities,
            });

            return {
                success: true,
                participant: joinResult.participant,
                roomData: joinResult.roomData,
                routerRtpCapabilities: mediaSetupResult.routerRtpCapabilities,
            };
        } catch (error) {
            console.error("[WS] Hybrid join failed:", error);
            throw error;
        }
    }
}

export default WebSocketService;
