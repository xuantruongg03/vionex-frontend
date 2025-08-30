import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ApiService from "../services/signalService";
import { useSocket } from "@/contexts/SocketContext";

interface User {
    peerId: string;
    isCreator: boolean;
    timeArrive: Date;
    userInfo?: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
    };
}

function useUser(roomId: string) {
    const [users, setUsers] = useState<User[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [apiService] = useState(() => new ApiService());

    const room = useSelector((state: any) => state.room);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Use Socket Context instead of global socket
    const { socket, isConnected } = useSocket();

    // Set peerId for API authentication
    useEffect(() => {
        if (room.username && apiService) {
            apiService.setPeerId(room.username);
        }
    }, [room.username, apiService]);

    // Get users via HTTP API
    const getUsers = useCallback(async () => {
        if (!apiService || !roomId) return [];

        try {
            if (room.username) {
                apiService.setPeerId(room.username);
            }
            const result = await apiService.getUsers(roomId);
            return result.users || [];
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    }, [roomId, room.username, apiService]);

    // Fetch and update users list
    const fetchUsers = useCallback(async () => {
        if (!roomId) return;

        try {
            const usersList = await getUsers();
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }, [roomId, getUsers]);

    // Kick user via WebSocket (for creators)
    const kickUser = useCallback(
        async (participantId: string) => {
            if (!socket || !roomId) return false;

            try {
                // Emit kick user event via WebSocket
                socket.emit("sfu:kick-user", {
                    roomId: roomId,
                    participantId: participantId,
                });

                // Wait for response
                return new Promise<boolean>((resolve) => {
                    const handleResponse = (response: {
                        success: boolean;
                        message: string;
                    }) => {
                        socket.off("sfu:kick-user-response", handleResponse);

                        if (response.success) {
                            toast.success(
                                `User ${participantId} kicked successfully`
                            );
                            // Note: Don't update local users list here - it will be handled by sfu:user-removed event
                            resolve(true);
                        } else {
                            toast.error(
                                response.message || "Failed to kick user"
                            );
                            resolve(false);
                        }
                    };

                    socket.on("sfu:kick-user-response", handleResponse);

                    // Timeout after 5 seconds
                    setTimeout(() => {
                        socket.off("sfu:kick-user-response", handleResponse);
                        toast.error("Kick user request timeout");
                        resolve(false);
                    }, 5000);
                });
            } catch (error) {
                console.error("Error kicking user:", error);
                toast.error("Failed to kick user");
                return false;
            }
        },
        [roomId, socket]
    );

    const handleKickUser = useCallback(
        (participantId: string) => {
            kickUser(participantId);
        },
        [kickUser]
    );

    useEffect(() => {
        if (!roomId || !socket) return;
        const onReceiveUsers = (data: { users: User[] } | User[]) => {
            try {
                // Handle format from backend: { users: User[] }
                const users = Array.isArray(data) ? data : data.users || [];
                setUsers(users);
            } catch (err) {
                console.error("Error in onReceiveUsers:", err);
            }
        };

        // Listen for join success to get authoritative isCreator info
        const onJoinSuccess = (data: {
            peerId: string;
            isCreator: boolean;
            roomId: string;
        }) => {
            try {
                if (data.peerId === room.username) {
                    dispatch({
                        type: "SET_CREATOR",
                        payload: { isCreator: data.isCreator },
                    });
                }
            } catch (err) {
                console.error("Error in onJoinSuccess:", err);
            }
        };

        const onUserRemoved = ({
            peerId,
            reason,
        }: {
            peerId: string;
            reason?: string;
        }) => {
            try {
                const myName = room.username;
                if (peerId === myName) {
                    toast.success(`You have been removed from the room`);
                    socket.emit("sfu:leave-room", { roomId });
                    navigate("/");
                } else {
                    // Only show toast for actual kicks, not voluntary disconnects
                    if (reason === "kicked") {
                        toast.success(
                            `${peerId} has been removed from the room`
                        );
                    }
                    setUsers((prevUsers) => {
                        if (!prevUsers) return null;
                        const filtered = prevUsers.filter(
                            (user) => user.peerId !== peerId
                        );
                        return filtered;
                    });
                }
            } catch (err) {
                console.error("Error in onUserRemoved:", err);
            }
        };

        const onUserJoined = (data: User) => {
            try {
                setUsers((prevUsers) => {
                    if (!prevUsers) return [data];
                    return [...prevUsers, data];
                });
            } catch (err) {
                console.error("Error in onUserJoined:", err);
            }
        };

        const onCreatorChanged = (data: {
            peerId: string;
            isCreator: boolean;
        }) => {
            try {
                const myName = room.username;
                if (data.peerId === myName) {
                    if (!room.isCreator) {
                        dispatch({
                            type: "SET_CREATOR",
                            payload: { isCreator: true },
                        });
                        toast.success("You have become the room creator");
                    }
                } else {
                    toast.info(`${data.peerId} has become the room creator`);
                }
                setUsers((prevUsers) => {
                    if (!prevUsers) return null;

                    return prevUsers.map((user) => {
                        const updatedUser = { ...user, isCreator: false };

                        if (updatedUser.peerId === data.peerId) {
                            updatedUser.isCreator = true;
                        }

                        return updatedUser;
                    });
                });
            } catch (err) {
                console.error("Error in onCreatorChanged:", err);
            }
        };

        const onPeerLeft = (data: { peerId: string }) => {
            try {
                setUsers((prevUsers) => {
                    if (!prevUsers) return null;
                    const filtered = prevUsers.filter(
                        (user) => user.peerId !== data.peerId
                    );
                    return filtered;
                });
            } catch (err) {
                console.error("Error in onPeerLeft:", err);
            }
        };

        // Setup WebSocket event listeners
        const setupSocketListeners = () => {
            if (!socket) return;
            try {
                socket.on("sfu:users-updated", onReceiveUsers);
                socket.on("sfu:user-removed", onUserRemoved);
                socket.on("sfu:new-peer-join", onUserJoined);
                socket.on("sfu:creator-changed", onCreatorChanged);
                socket.on("sfu:peer-left", onPeerLeft);
                socket.on("sfu:join-success", onJoinSuccess);
            } catch (err) {
                console.error("Error setting up socket events:", err);
                setError("Error setting up socket events");
            }
        };

        // Handle socket connection and disconnection
        const handleSocketConnect = () => {};

        if (socket) {
            // Set up listeners immediately
            setupSocketListeners();

            // Listen for connection events
            socket.on("connect", handleSocketConnect);
        }

        return () => {
            if (socket) {
                socket.off("sfu:users-updated", onReceiveUsers);
                socket.off("sfu:user-removed", onUserRemoved);
                socket.off("sfu:new-peer-join", onUserJoined);
                socket.off("sfu:creator-changed", onCreatorChanged);
                socket.off("sfu:peer-left", onPeerLeft);
                socket.off("sfu:join-success", onJoinSuccess);
                socket.off("connect", handleSocketConnect);
            }
        };
    }, [
        roomId,
        room.username,
        dispatch,
        navigate,
        fetchUsers,
        socket,
        isConnected,
    ]);

    return {
        users,
        handleKickUser,
        kickUser,
        getUsers,
        fetchUsers,
        error,
    };
}

export default useUser;
