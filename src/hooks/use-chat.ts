import { useState, useEffect } from "react";
import { getSocket } from "./use-call-hybrid-new";

export interface Message {
    id: string;
    roomId: string;
    sender: string;
    senderName: string;
    text: string;
    timestamp: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    isImage?: boolean;
}

export function useChat(roomId: string, userName: string) {
    const [messages, setMessages] = useState<Message[]>([]);

    // Use global socket like use-user does
    const socket = getSocket();

    useEffect(() => {
        if (!socket || !socket.connected) {
            console.log("[useChat] Socket not ready:", {
                socket: !!socket,
                connected: socket?.connected,
            });
            return;
        }
        // Add a small delay to ensure socket is fully ready
        const joinTimer = setTimeout(() => {
            // Join chat room
            socket.emit("chat:join", { roomId, userName });
        }, 100);

        const handleNewMessage = (message: Message) => {
            setMessages((prev) => [...prev, message]);
        };

        const handleChatHistory = (history: Message[]) => {
            if (Array.isArray(history)) {
                setMessages(history);
            } else {
                setMessages([]);
            }
        };

        socket.on("chat:message", handleNewMessage);
        socket.on("chat:history", handleChatHistory);

        return () => {
            clearTimeout(joinTimer);
            socket.emit("chat:leave", { roomId });

            socket.off("chat:message", handleNewMessage);
            socket.off("chat:history", handleChatHistory);
        };
    }, [roomId, userName, socket]);

    const sendMessage = (text: string) => {
        if (text.trim() && socket && socket.connected) {
            const message = {
                sender: userName,
                senderName: userName,
                text,
            };
            socket.emit("chat:message", {
                roomId,
                message,
            });
        } else {
            console.warn("[useChat] Cannot send message:", {
                hasText: !!text.trim(),
                hasSocket: !!socket,
                socketConnected: socket?.connected,
            });
        }
    };

    const sendFileMessage = (file: File) => {
        if (!socket) return;

        // Convert file to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target?.result as string;

            // Prepare message with file info
            const message = {
                sender: userName,
                senderName: userName,
                text: file.name, // Use file name as message text
                fileUrl: base64Data,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                isImage: file.type.startsWith("image/"),
            };

            // Send via websocket
            socket.emit("chat:file", {
                roomId,
                message,
            });
        };

        reader.readAsDataURL(file);
    };

    return {
        messages,
        sendMessage,
        sendFileMessage,
    };
}
