import { io, Socket } from "socket.io-client";

const WEBSOCKET_URL = "http://localhost:3005";

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
            // Connected
        });

        this.socket.on("disconnect", (reason) => {
            // Disconnected
        });

        this.socket.on("connect_error", (error) => {
            // Connection error
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

    joinRoom(
        roomId: string,
        peerId: string,
        password?: string,
        userInfo?: any
    ) {
        this.socket?.emit("sfu:join", { roomId, peerId, password, userInfo });
    }
}

export default WebSocketService;
