import { useSocket } from "@/contexts/SocketContext";
import { CreateTranslationCabinRequest, DestroyTranslationCabinRequest, TranslationCabin } from "@/interfaces";
import { useCallback, useState } from "react";

interface TranslationSocketResponse {
    success: boolean;
    message?: string;
    data?: any;
}

interface TranslationCabinUpdate {
    action: "created" | "destroyed";
    roomId: string;
    sourceUserId: string;
    targetUserId: string;
    sourceLanguage: string;
    targetLanguage: string;
}

export const useTranslationSocket = (roomId: string) => {
    const { socket } = useSocket();
    const [isLoading, setIsLoading] = useState(false);

    // Create translation cabin via socket
    const createTranslationCabin = useCallback(
        async (request: CreateTranslationCabinRequest): Promise<{ streamId?: string }> => {
            if (!socket?.connected) {
                throw new Error("Socket not connected");
            }

            return new Promise((resolve, reject) => {
                setIsLoading(true);

                // Set up one-time listeners for the response
                const onSuccess = (response: TranslationSocketResponse) => {
                    setIsLoading(false);
                    if (response.success) {
                        resolve({ streamId: response.data?.streamId });
                    } else {
                        reject(new Error(response.message || "Failed to create translation cabin"));
                    }
                    // Clean up listeners
                    socket.off("translation:created", onSuccess);
                    socket.off("translation:error", onError);
                };

                const onError = (error: { message: string }) => {
                    setIsLoading(false);
                    reject(new Error(error.message || "Failed to create translation cabin"));
                    // Clean up listeners
                    socket.off("translation:created", onSuccess);
                    socket.off("translation:error", onError);
                };

                // Set up listeners
                socket.on("translation:created", onSuccess);
                socket.on("translation:error", onError);

                // Emit the request
                socket.emit("translation:create", request);

                // Timeout after 30 seconds
                setTimeout(() => {
                    setIsLoading(false);
                    socket.off("translation:created", onSuccess);
                    socket.off("translation:error", onError);
                    reject(new Error("Request timeout"));
                }, 15000);
            });
        },
        [socket]
    );

    // Destroy translation cabin via socket
    const destroyTranslationCabin = useCallback(
        async (request: DestroyTranslationCabinRequest): Promise<void> => {
            if (!socket?.connected) {
                throw new Error("Socket not connected");
            }

            return new Promise((resolve, reject) => {
                setIsLoading(true);

                // Set up one-time listeners for the response
                const onSuccess = (response: TranslationSocketResponse) => {
                    setIsLoading(false);
                    if (response.success) {
                        resolve();
                    } else {
                        reject(new Error(response.message || "Failed to destroy translation cabin"));
                    }
                    // Clean up listeners
                    socket.off("translation:destroyed", onSuccess);
                    socket.off("translation:error", onError);
                };

                const onError = (error: { message: string }) => {
                    setIsLoading(false);
                    reject(new Error(error.message || "Failed to destroy translation cabin"));
                    // Clean up listeners
                    socket.off("translation:destroyed", onSuccess);
                    socket.off("translation:error", onError);
                };

                // Set up listeners
                socket.on("translation:destroyed", onSuccess);
                socket.on("translation:error", onError);

                // Emit the request
                socket.emit("translation:destroy", request);

                // Timeout after 15 seconds
                setTimeout(() => {
                    setIsLoading(false);
                    socket.off("translation:destroyed", onSuccess);
                    socket.off("translation:error", onError);
                    reject(new Error("Request timeout"));
                }, 15000);
            });
        },
        [socket]
    );

    // List translation cabins via socket
    const listTranslationCabins = useCallback(
        async (params: { roomId: string; userId: string }): Promise<TranslationCabin[]> => {
            if (!socket?.connected) {
                throw new Error("Socket not connected");
            }

            return new Promise((resolve, reject) => {
                setIsLoading(true);

                // Set up one-time listeners for the response
                const onSuccess = (response: TranslationSocketResponse) => {
                    setIsLoading(false);
                    if (response.success) {
                        resolve(response.data || []);
                    } else {
                        reject(new Error(response.message || "Failed to list translation cabins"));
                    }
                    // Clean up listeners
                    socket.off("translation:list", onSuccess);
                    socket.off("translation:error", onError);
                };

                const onError = (error: { message: string }) => {
                    setIsLoading(false);
                    reject(new Error(error.message || "Failed to list translation cabins"));
                    // Clean up listeners
                    socket.off("translation:list", onSuccess);
                    socket.off("translation:error", onError);
                };

                // Set up listeners
                socket.on("translation:list", onSuccess);
                socket.on("translation:error", onError);

                // Emit the request
                socket.emit("translation:list", params);

                // Timeout after 30 seconds
                setTimeout(() => {
                    setIsLoading(false);
                    socket.off("translation:list", onSuccess);
                    socket.off("translation:error", onError);
                    reject(new Error("Request timeout"));
                }, 15000);
            });
        },
        [socket]
    );

    // Listen for cabin updates (other users creating/destroying cabins)
    const setupCabinUpdateListener = useCallback(
        (onUpdate: (update: TranslationCabinUpdate) => void) => {
            if (!socket?.connected) return;

            socket.on("translation:cabin-update", onUpdate);

            return () => {
                socket.off("translation:cabin-update", onUpdate);
            };
        },
        [socket]
    );

    return {
        createTranslationCabin,
        destroyTranslationCabin,
        listTranslationCabins,
        setupCabinUpdateListener,
        isLoading,
    };
};
