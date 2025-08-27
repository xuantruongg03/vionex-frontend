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

    // Remove user via HTTP API (for creators)
    const removeUser = useCallback(
        async (participantId: string) => {
            if (!apiService || !roomId) return false;

            try {
                if (room.username) {
                    apiService.setPeerId(room.username);
                }
                await apiService.removeUser(roomId, participantId);
                toast.success(`User ${participantId} removed successfully`);

                // Update local users list
                setUsers((prev) =>
                    prev
                        ? prev.filter((user) => user.peerId !== participantId)
                        : null
                );
                return true;
            } catch (error) {
                console.error("Error removing user:", error);
                toast.error("Failed to remove user");
                return false;
            }
        },
        [roomId, room.username, apiService]
    );

    const handleRemoveUser = useCallback(
        (participantId: string) => {
            removeUser(participantId);
        },
        [removeUser]
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

        const onUserRemoved = ({ peerId }: { peerId: string }) => {
            try {
                const myName = room.username;
                if (peerId === myName) {
                    toast.success(`Bạn đã bị xoá khỏi phòng`);
                    socket.emit("sfu:leave-room", { roomId });
                    navigate("/");
                } else {
                    toast.success(`${peerId} đã bị xoá khỏi phòng`);
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
                        toast.success("Bạn đã trở thành chủ phòng");
                    }
                } else {
                    toast.info(`${data.peerId} đã trở thành chủ phòng`);
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
                setError("Lỗi thiết lập sự kiện socket");
            }
        };

        // Handle socket connection and disconnection
        const handleSocketConnect = () => {
        };

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
                console.log("🧹 [use-user] Cleaned up socket listeners");
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
        handleRemoveUser,
        removeUser,
        getUsers,
        fetchUsers,
        error,
    };
}

export default useUser;
