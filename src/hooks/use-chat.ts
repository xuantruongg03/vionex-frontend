import { useState, useEffect, useMemo } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "sonner";
import { useSelector } from "react-redux";

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
    // Reply fields
    replyTo?: {
        messageId: string;
        senderName: string;
        text: string;
        isFile?: boolean;
    };
    // UI state
    isPending?: boolean; // Message being sent
    isConfirmed?: boolean; // Message confirmed by server
    isFailed?: boolean; // Message sending failed
}

export function useChat(roomId: string, userName: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [pendingMessages, setPendingMessages] = useState<Map<string, Message>>(new Map());
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    const orgId = useMemo(() => {
        return (state: any) => state.room.organizationId;
    }, []);
    const organizationId = useSelector(orgId);

    // Use Socket Context
    const { socket } = useSocket();

    // Create temporary ID for messages
    const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    useEffect(() => {
        if (!socket?.connected) return;

        const joinTimer = setTimeout(() => {
            socket.emit("chat:join", { roomId, userName });
        }, 100);

        const handleNewMessage = (message: Message) => {
            setPendingMessages((currentPending) => {
                const tempId = Array.from(currentPending.keys()).find((id) => {
                    const pending = currentPending.get(id);
                    if (!pending || pending.sender !== message.sender) return false;

                    if (pending.fileUrl && message.fileUrl) {
                        return pending.fileName === message.fileName && pending.fileType === message.fileType && Math.abs(new Date(pending.timestamp).getTime() - new Date(message.timestamp).getTime()) < 10000;
                    }

                    return pending.text === message.text && Math.abs(new Date(pending.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000;
                });

                if (tempId) {
                    setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...message, isConfirmed: true } : msg)));
                    const newPending = new Map(currentPending);
                    newPending.delete(tempId);
                    return newPending;
                } else {
                    setMessages((prev) => [...prev, { ...message, isConfirmed: true }]);
                    return currentPending;
                }
            });
        };

        const handleChatHistory = (history: Message[]) => {
            setMessages(Array.isArray(history) ? history.map((msg) => ({ ...msg, isConfirmed: true })) : []);
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
        if (!text.trim() || !socket?.connected) return;

        const tempId = generateTempId();
        const tempMessage: Message = {
            id: tempId,
            roomId,
            sender: userName,
            senderName: userName,
            text: text.trim(),
            timestamp: new Date().toISOString(),
            isPending: true,
            isConfirmed: false,
            replyTo: replyingTo
                ? {
                      messageId: replyingTo.id,
                      senderName: replyingTo.senderName,
                      text: replyingTo.text,
                      isFile: !!replyingTo.fileUrl,
                  }
                : undefined,
        };

        setPendingMessages((prev) => new Map(prev).set(tempId, tempMessage));
        setMessages((prev) => [...prev, tempMessage]);

        socket.emit("chat:message", {
            roomId,
            message: {
                sender: userName,
                senderName: userName,
                text: text.trim(),
                replyTo: tempMessage.replyTo,
                orgId: organizationId,
            },
        });

        setReplyingTo(null);

        setTimeout(() => {
            setPendingMessages((prev) => {
                if (prev.has(tempId)) {
                    setMessages((prevMsgs) => prevMsgs.map((msg) => (msg.id === tempId ? { ...msg, isPending: false, isFailed: true } : msg)));
                    const newMap = new Map(prev);
                    newMap.delete(tempId);
                    return newMap;
                }
                return prev;
            });
        }, 7000);
    };

    const sendFileMessage = (file: File) => {
        if (!socket) return;

        const maxFileSize = 1 * 1024 * 1024; // 1MB
        if (file.size > maxFileSize) {
            toast.error("File too large! Maximum allowed size is 1MB. Your file: " + (file.size / 1024 / 1024).toFixed(2) + "MB");
            return;
        }

        const tempId = generateTempId();
        const tempMessage: Message = {
            id: tempId,
            roomId,
            sender: userName,
            senderName: userName,
            text: file.name,
            timestamp: new Date().toISOString(),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            isImage: file.type.startsWith("image/"),
            isPending: true,
            isConfirmed: false,
        };

        setPendingMessages((prev) => new Map(prev).set(tempId, tempMessage));
        setMessages((prev) => [...prev, tempMessage]);

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target?.result as string;

            setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...msg, fileUrl: base64Data } : msg)));

            socket.emit("chat:file", {
                roomId,
                message: {
                    sender: userName,
                    senderName: userName,
                    text: file.name,
                    fileUrl: base64Data,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    isImage: file.type.startsWith("image/"),
                },
            });
        };

        reader.onerror = () => {
            setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...msg, isPending: false, isFailed: true } : msg)));
            setPendingMessages((prev) => {
                const newMap = new Map(prev);
                newMap.delete(tempId);
                return newMap;
            });
        };

        reader.readAsDataURL(file);

        setTimeout(() => {
            setPendingMessages((prev) => {
                if (prev.has(tempId)) {
                    setMessages((prevMsgs) => prevMsgs.map((msg) => (msg.id === tempId ? { ...msg, isPending: false, isFailed: true } : msg)));
                    const newMap = new Map(prev);
                    newMap.delete(tempId);
                    return newMap;
                }
                return prev;
            });
        }, 10000);
    };

    return {
        messages,
        sendMessage,
        sendFileMessage,
        replyingTo,
        setReplyingTo,
        cancelReply: () => setReplyingTo(null),
        retryMessage: (messageId: string) => {
            const message = messages.find((msg) => msg.id === messageId);
            if (message?.isFailed && !message.fileUrl) {
                sendMessage(message.text);
                setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
            }
        },
        deleteMessage: (messageId: string) => {
            setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
            setPendingMessages((prev) => {
                const newMap = new Map(prev);
                newMap.delete(messageId);
                return newMap;
            });
        },
    };
}
