import { useSocket } from "@/contexts/SocketContext";
import { ActionLogType } from "@/interfaces/action";
import { TypeUserEvent } from "@/interfaces/behavior";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

interface UseRaiseHandProps {
    roomId: string;
    username: string;
    isMonitorActive: boolean;
    isCreator: boolean;
}

interface UseRaiseHandReturn {
    isHandRaised: boolean;
    usersWithHandsRaised: string[];
    toggleRaiseHand: () => void;
}

/**
 * Custom hook to manage raise hand functionality
 * Handles state, socket events, and behavior logging
 */
export function useRaiseHand({ roomId, username, isMonitorActive, isCreator }: UseRaiseHandProps): UseRaiseHandReturn {
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [usersWithHandsRaised, setUsersWithHandsRaised] = useState<string[]>([]);
    const dispatch = useDispatch();
    const { socket } = useSocket();

    const toggleRaiseHand = useCallback(() => {
        const newState = !isHandRaised;
        setIsHandRaised(newState);

        // Log behavior event if monitoring is active and user is not creator
        if (isMonitorActive && !isCreator) {
            dispatch({
                type: ActionLogType.SET_EVENT_LOG,
                payload: [
                    {
                        type: newState ? TypeUserEvent.RAISE_HAND : TypeUserEvent.LOWER_HAND,
                        value: newState,
                        time: new Date(),
                    },
                ],
            });
        }

        // Emit socket event to notify other users
        if (socket?.connected) {
            socket.emit("interaction:toggle-raise-hand", {
                roomId,
                userId: username,
                isRaised: newState,
            });
        }

        // Show toast notification
        if (newState) {
            toast.success("Hand raised! Others will be notified.");
        } else {
            toast.info("Hand lowered.");
        }
    }, [isHandRaised, isMonitorActive, isCreator, username, dispatch, socket, roomId]);

    /**
     * Socket listeners for raise hand events from other users
     */
    useEffect(() => {
        if (!socket?.connected) {
            console.log("[useRaiseHand] Socket not connected, skipping listeners setup");
            return;
        }

        // Handler for when another user raises their hand
        const handleHandRaised = (data: { userId: string; peerId: string; timestamp: string }) => {
            setUsersWithHandsRaised((prev) => {
                // Avoid duplicates
                if (!prev.includes(data.userId)) {
                    return [...prev, data.userId];
                }
                return prev;
            });

            // Show notification ONLY to other users
            if (data.userId !== username) {
                toast.info(`${data.userId} raised their hand!`);
            }
        };

        // Handler for when another user lowers their hand
        const handleHandLowered = (data: { userId: string; peerId: string; timestamp: string }) => {
            setUsersWithHandsRaised((prev) => prev.filter((id) => id !== data.userId));
        };

        const handleError = (data: { message: string }) => {
        };

        socket.on("interaction:hand-raised", handleHandRaised);
        socket.on("interaction:hand-lowered", handleHandLowered);
        socket.on("interaction:raise-hand-error", handleError);

        return () => {
            console.log("[useRaiseHand] Cleaning up socket listeners");
            socket.off("interaction:hand-raised", handleHandRaised);
            socket.off("interaction:hand-lowered", handleHandLowered);
            socket.off("interaction:raise-hand-error", handleError);
        };
    }, [socket?.connected, username]);

    /**
     * Update local user's hand state in the usersWithHandsRaised list
     * This ensures the current user appears in the list when they raise their hand
     */
    useEffect(() => {
        setUsersWithHandsRaised((prev) => {
            const hasUser = prev.includes(username);

            if (isHandRaised && !hasUser) {
                // Add current user to the list
                return [...prev, username];
            } else if (!isHandRaised && hasUser) {
                // Remove current user from the list
                return prev.filter((id) => id !== username);
            }

            return prev;
        });
    }, [isHandRaised, username]);

    return {
        isHandRaised,
        usersWithHandsRaised,
        toggleRaiseHand,
    };
}
