import { useSocket } from "@/contexts/SocketContext";
import { CreateTranslationCabinRequest, DestroyTranslationCabinRequest, TranslationCabin } from "@/interfaces";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

interface TranslationSocketResponse {
    success: boolean;
    message?: string;
    data?: any;
}

const SOCKET_TIMEOUT = 15000; // 15 seconds

export const useTranslationSocket = (roomId: string) => {
    const { socket } = useSocket();
    const [isLoading, setIsLoading] = useState(false);

    // Generic socket request helper
    const makeSocketRequest = useCallback(
        <T = any>(eventToEmit: string, successEvent: string, data: any, errorMessage: string, onSuccess?: (data: T) => void): Promise<T> => {
            if (!socket?.connected) {
                throw new Error("Socket not connected");
            }

            return new Promise((resolve, reject) => {
                setIsLoading(true);

                const cleanup = () => {
                    socket.off(successEvent, onSuccessHandler);
                    socket.off("translation:error", onErrorHandler);
                    setIsLoading(false);
                };

                const onSuccessHandler = (response: TranslationSocketResponse) => {
                    cleanup();
                    if (response.success) {
                        onSuccess?.(response.data);
                        resolve(response.data);
                    } else {
                        reject(new Error(response.message || errorMessage));
                    }
                };

                const onErrorHandler = (error: { message: string }) => {
                    cleanup();
                    reject(new Error(error.message || errorMessage));
                };

                // Set up listeners
                socket.on(successEvent, onSuccessHandler);
                socket.on("translation:error", onErrorHandler);

                // Emit the request
                socket.emit(eventToEmit, data);

                // Timeout
                setTimeout(() => {
                    cleanup();
                    reject(new Error("Request timeout"));
                }, SOCKET_TIMEOUT);
            });
        },
        [socket]
    );

    // Create translation cabin via socket
    const createTranslationCabin = useCallback(
        async (request: CreateTranslationCabinRequest): Promise<{ streamId?: string }> => {
            const data = await makeSocketRequest<{ streamId?: string }>("translation:create", "translation:created", request, "Failed to create translation cabin");
            return { streamId: data?.streamId };
        },
        [makeSocketRequest]
    );

    // Destroy translation cabin via socket
    const destroyTranslationCabin = useCallback(
        async (request: DestroyTranslationCabinRequest, onDestroyed?: (targetUserId: string) => void): Promise<void> => {
            await makeSocketRequest("translation:destroy", "translation:destroyed", request, "Failed to destroy translation cabin", () => {
                console.log(`[useTranslationSocket] Cabin destroyed successfully for targetUserId: ${request.targetUserId}`);
                onDestroyed?.(request.targetUserId);
            });
        },
        [makeSocketRequest]
    );

    // List translation cabins via socket
    const listTranslationCabins = useCallback(
        async (params: { roomId: string; userId: string }): Promise<TranslationCabin[]> => {
            const data = await makeSocketRequest<TranslationCabin[]>("translation:list", "translation:list", params, "Failed to list translation cabins");
            return data || [];
        },
        [makeSocketRequest]
    );

    return {
        createTranslationCabin,
        destroyTranslationCabin,
        listTranslationCabins,
        isLoading,
    };
};

// Mutation hook for destroying cabin (previously in separate file)
export const useDestroyCabin = (roomId: string, onDestroyed?: (targetUserId: string) => void) => {
    const { destroyTranslationCabin } = useTranslationSocket(roomId);

    const {
        mutateAsync: destroyCabin,
        isPending,
        isError,
    } = useMutation({
        mutationFn: (params: DestroyTranslationCabinRequest) => destroyTranslationCabin(params, onDestroyed),
    });

    return {
        loading: isPending,
        error: isError,
        destroyCabin,
    };
};
