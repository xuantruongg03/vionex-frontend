import { useSocket } from "@/contexts/SocketContext";
import { useCallback, useEffect } from "react";
import { useSelector } from "react-redux";

type ResponseEvt = { requestId: string; text: string };
type ErrorEvt = { requestId: string; message: string };

type Handlers = {
    onResponse: (m: ResponseEvt) => void;
    onError: (m: ErrorEvt) => void;
};

interface RootState {
    room: {
        organizationId: string | null;
        roomKey: string | null; // NEW: Add roomKey to state interface
    };
}

function genId() {
    return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function useAskChatBot(roomId: string, handlers: Handlers) {
    const { socket } = useSocket();
    const organizationId = useSelector((state: RootState) => state.room.organizationId);
    const roomKey = useSelector((state: RootState) => state.room.roomKey); // NEW: Get roomKey from Redux

    useEffect(() => {
        if (!socket) return;

        const onResponse = (m: ResponseEvt) => handlers.onResponse?.(m);
        const onError = (m: ErrorEvt) => handlers.onError?.(m);

        socket.on("chatbot:final", onResponse);
        socket.on("chatbot:error", onError);

        return () => {
            socket.off("chatbot:final", onResponse);
            socket.off("chatbot:error", onError);
        };
    }, [socket, handlers]);

    const sendQuestion = useCallback(
        (question: string) => {
            const requestId = genId();
            socket.emit("chatbot:ask", {
                id: requestId,
                roomId,
                roomKey, // NEW: Send roomKey for semantic context isolation
                text: question,
                organizationId,
            });
            return Promise.resolve({ requestId });
        },
        [socket, roomId, roomKey, organizationId]
    );

    return { sendQuestion };
}
