import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { Socket, io } from "socket.io-client";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<Socket>;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
    children: React.ReactNode;
    url?: string;
}

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export const SocketProvider: React.FC<SocketProviderProps> = ({
    children,
    url = API_BASE_URL,
}) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const connect = (): Promise<Socket> => {
        if (socketRef.current?.connected) {
            return Promise.resolve(socketRef.current);
        }

        setIsConnecting(true);

        return new Promise((resolve, reject) => {
            const newSocket = io(url, {
                transports: ["websocket"],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                autoConnect: true,
            });

            newSocket.on("connect", () => {
                socketRef.current = newSocket;
                setSocket(newSocket);
                setIsConnected(true);
                setIsConnecting(false);
                resolve(newSocket);
            });

            newSocket.on("connect_error", (error) => {
                console.error("Socket connection error:", error);
                setIsConnecting(false);
                reject(error);
            });

            newSocket.on("disconnect", () => {
                setIsConnected(false);
                setIsConnecting(false);
            });

            newSocket.on("reconnect", () => {
                setIsConnected(true);
                setIsConnecting(false);
            });

            // Set socket immediately but wait for connection
            socketRef.current = newSocket;
            setSocket(newSocket);
        });
    };

    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
            setIsConnecting(false);
        }
    };

    useEffect(() => {
        // Don't auto connect - let components call connect() when needed
        return () => {
            disconnect();
        };
    }, [url]);

    const value: SocketContextType = {
        socket,
        isConnected,
        isConnecting,
        connect,
        disconnect,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};
