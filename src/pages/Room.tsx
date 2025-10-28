import { PasswordDialog } from "@/components/Dialogs/PasswordRequire";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import VideoPreview from "@/components/VideoPreview";
import { useCheckRoomStatus, useCheckUsername, useVerifyRoom } from "@/hooks";
import { useCallRefactored as useCall } from "@/hooks/use-call-refactored";
import { useCheckApi } from "@/hooks/use-check-api";
import CONSTANT from "@/lib/constant";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, MessageCircle, UserRound } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { toast } from "sonner";
import nameDefault from "../lib/name";
import { isOrganizationRoomToken, generateRoomDisplayId } from "@/utils/roomSecurity";
import { useVerifyOrgRoomAccess } from "@/hooks/org";
import roomService from "@/services/room";

const Room = () => {
    const navigate = useNavigate();
    const { roomId: urlRoomId } = useParams();
    const [roomId, setRoomId] = useState("");
    const [userName, setUserName] = useState("");
    const [debouncedUserName, setDebouncedUserName] = useState("");
    const { isPending, checkUsernameMutation } = useCheckUsername();
    const { checkRoomStatusMutation, isPending: isRoomStatusPending } = useCheckRoomStatus();
    const { verifyRoomMutation, isPending: isVerifyRoomPending } = useVerifyRoom();
    const { verifyAccess, isLoading: isVerifyingOrgRoom } = useVerifyOrgRoomAccess();
    const { isPending: isCheckApiLoading, checkApi } = useCheckApi();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const dispatch = useDispatch();
    const user = useSelector((state: any) => state.auth.user);
    const [searchParams] = useSearchParams();

    // Organization room detection
    const [isOrgRoom, setIsOrgRoom] = useState(false);
    const [orgRoomDisplayId, setOrgRoomDisplayId] = useState("");

    // Use the call hook to get media functions
    // Use a stable roomId for preview mode to prevent re-initialization
    const previewRoomId = useMemo(() => "preview-mode", []);
    const { initializeLocalMedia, toggleVideo, toggleAudio, localStream } = useCall(previewRoomId);

    useEffect(() => {
        // Get room ID from query parameter ?idroom=abc
        const roomIdFromQuery = searchParams.get("idroom");

        if (roomIdFromQuery) {
            setRoomId(roomIdFromQuery);

            if (isOrganizationRoomToken(roomIdFromQuery)) {
                setIsOrgRoom(true);
                setOrgRoomDisplayId(generateRoomDisplayId(roomIdFromQuery));
            }
        }
    }, [searchParams]);

    // Initialize media when component mounts
    useEffect(() => {
        initializeLocalMedia();
    }, [initializeLocalMedia]);

    const checkUsername = useCallback(
        async (userName: string) => {
            const checkUsername = await checkUsernameMutation({
                username: userName,
                roomId: roomId,
            });
            return checkUsername;
        },
        [checkUsernameMutation, roomId]
    );

    // Generate random username with availability check
    const generateAvailableUsername = useCallback(async (): Promise<string | null> => {
        const maxAttempts = 20;
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;
            const randomName = nameDefault[Math.floor(Math.random() * nameDefault.length)];
            try {
                const res = await checkUsername(randomName);
                if (res.data.success) {
                    return randomName;
                }
            } catch (error) {
                console.error("Error checking username:", error);
                continue;
            }
        }

        return null; // Couldn't find available name after max attempts
    }, [checkUsername]);

    const handleCreateRoom = async () => {
        try {
            // 1. Check if API is available
            await checkApi();

            // 2. Call server to create room (server generates unique ID)
            const response = await roomService.createRoom();

            if (!response.data?.success) {
                toast.error(response.data?.message || "Failed to create room");
                return;
            }

            const newRoomId = response.data.roomId;

            // 3. Prepare username
            let finalUserName = user?.name;
            if (!finalUserName) {
                if (userName.trim() === "") {
                    finalUserName = nameDefault[Math.floor(Math.random() * nameDefault.length)];
                } else {
                    finalUserName = userName;
                }
            }

            // 4. Dispatch Redux action
            dispatch({
                type: "JOIN_ROOM",
                payload: {
                    username: finalUserName,
                    isCreator: true,
                    userInfo: user,
                },
            });

            // 5. Navigate to the newly created room
            navigate(`/room/${newRoomId}`);
        } catch (error) {
            console.error("Failed to create room:", error);
            toast.error("Server is not available. Please try again later.");
        }
    };

    const handlePasswordSubmit = (password: string) => {
        setIsPasswordDialogOpen(false);
        handleJoinRoomWithPassword(password);
    };

    const handleJoinRoomWithPassword = async (password: string) => {
        try {
            const res = await verifyRoomMutation({
                roomId: roomId,
                password: password,
            });
            if (res.data.valid) {
                // Auto-generate random name if username is empty
                let finalUserName = user?.name || userName.trim();
                if (!finalUserName) {
                    finalUserName = await generateAvailableUsername();
                    if (!finalUserName) {
                        toast.error("Unable to generate available username. Please enter a custom name.");
                        setIsPasswordDialogOpen(false);
                        return;
                    }
                }

                dispatch({
                    type: "JOIN_ROOM",
                    payload: {
                        username: finalUserName,
                        password: password,
                        isLocked: true,
                        userInfo: user,
                    },
                });
                navigate(`/room/${roomId}`);
            } else {
                toast.error("Invalid password. Please try again.");
                setIsPasswordDialogOpen(true); // Reopen dialog for retry
            }
        } catch (error) {
            console.error("Error verifying room password:", error);
            toast.error("Failed to verify password. Please try again.");
            setIsPasswordDialogOpen(true); // Reopen dialog for retry
        }
    };

    const handleJoinRoom = async () => {
        try {
            let isUsernameValid = { success: false, message: "" };
            let validatedUsername = ""; // Store the validated username

            // Handle organization room differently
            if (isOrgRoom) {
                // For org rooms, verify access with session token using hook
                try {
                    const verifyResponse = await verifyAccess(roomId);
                    if (!verifyResponse.data?.success) {
                        toast.error("You don't have access to this room or the session has expired");
                        return;
                    }
                } catch (error) {
                    console.error("Error verifying org room access:", error);
                    toast.error("Failed to verify room access. Please try again.");
                    return;
                }

                // For org rooms, set organization context and navigate directly
                const finalUserName = user?.name || userName.trim() || nameDefault[Math.floor(Math.random() * nameDefault.length)];

                dispatch({
                    type: "JOIN_ROOM",
                    payload: {
                        username: finalUserName,
                        isOrganizationRoom: true,
                        roomId: roomId,
                        userInfo: user,
                    },
                });
                navigate(`/room/${roomId}`);
                return;
            }

            // Regular room logic (existing)
            if (user && user.name) {
                // If username has characters "-" or "_", replace them with spaces
                const formattedName = user.name.replace(/[-_]/g, " ");

                // Set new username for consistency
                setUserName(formattedName);

                // If user has a name from authentication, use it directly
                try {
                    const res = await checkUsername(formattedName);
                    isUsernameValid = {
                        success: res.data.success,
                        message: res.data.message,
                    };
                    if (!isUsernameValid.success) {
                        toast.error(isUsernameValid.message || "Username already exists in this room! Please choose a different name.");
                        return;
                    }
                    setUserName(user.name); // Update local state to match
                    validatedUsername = user.name; // Store validated username
                } catch (error) {
                    console.error("Error checking username:", error);
                    toast.error("Failed to validate username. Please try again.");
                    return;
                }
            } else if (userName.trim() === "") {
                // If no user name and no input, generate random name with availability check
                const randomName = await generateAvailableUsername();
                if (!randomName) {
                    toast.error("Unable to generate available username. Please enter a custom name.");
                    return;
                }
                setUserName(randomName);
                validatedUsername = randomName; // Store validated username
                isUsernameValid = { success: true, message: "" };
            } else {
                // Use the manually entered username
                try {
                    const res = await checkUsername(userName);
                    isUsernameValid = {
                        success: res.data.success,
                        message: res.data.message,
                    };
                    if (!isUsernameValid.success) {
                        toast.error(isUsernameValid.message || "Username already exists in this room! Please choose a different name.");
                        return;
                    }
                    validatedUsername = userName; // Store validated username
                } catch (error) {
                    console.error("Error checking username:", error);
                    toast.error("Failed to validate username. Please try again.");
                    return;
                }
            }

            // Only proceed if username validation was successful
            try {
                const res = await checkRoomStatusMutation({ roomId: roomId });
                if (res.data.locked) {
                    setIsPasswordDialogOpen(true);
                } else {
                    // Use the validated username stored earlier
                    const finalUserName = validatedUsername;

                    dispatch({
                        type: "JOIN_ROOM",
                        payload: {
                            username: finalUserName,
                            userInfo: user,
                        },
                    });
                    navigate(`/room/${roomId}`);
                }
            } catch (err) {
                console.error("Error checking room status:", err);
                toast.error("Room does not exist or has been deleted!");
                return;
            }
        } catch (error) {
            console.error("Unexpected error in handleJoinRoom:", error);
            toast.error("An unexpected error occurred. Please try again.");
        }
    };

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900'>
            {/* Subtle Background Elements */}

            {isPasswordDialogOpen && <PasswordDialog isOpen={isPasswordDialogOpen} onClose={() => setIsPasswordDialogOpen(false)} onSubmit={handlePasswordSubmit} />}
            {/* Hero Section */}
            <section className='relative z-10 flex items-center justify-center min-h-screen px-4 py-8'>
                <div className='max-w-6xl w-full mx-auto'>
                    {/* Title */}
                    <div className='text-center mb-8 md:mb-12'>
                        <h1 className='inline text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 leading-tight'>{isOrgRoom ? "Join Organization Meeting" : "Join Your Meeting"}</h1>
                        <p className='text-base mt-4 md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed'>{isOrgRoom ? "Secure organization meeting - Test your camera and audio before joining" : "Test your camera and audio, then enter your meeting details"}</p>
                        {isOrgRoom && orgRoomDisplayId && (
                            <div className='mt-4'>
                                <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>Room ID: {orgRoomDisplayId}</span>
                            </div>
                        )}
                    </div>{" "}
                    {/* Main Content */}
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center max-w-5xl mx-auto'>
                        <div className='absolute overflow-hidden'>
                            <div className='absolute top-20 right-20 w-64 h-64 rounded-full bg-gradient-to-r from-blue-100 to-purple-200 dark:from-blue-900/20 dark:to-purple-900/20 opacity-60 blur-3xl'></div>
                            <div className='absolute bottom-20 left-20 w-80 h-80 rounded-full bg-gradient-to-r from-purple-100 to-pink-200 dark:from-purple-900/20 dark:to-pink-900/20 opacity-40 blur-3xl'></div>
                        </div>
                        <div className='relative group order-1 lg:order-1'>
                            <VideoPreview userName={user?.name || debouncedUserName} localStream={localStream} toggleVideo={toggleVideo} toggleAudio={toggleAudio} />
                        </div>
                        {/* Right Column - Join Room Form */}
                        <motion.div className='relative order-2 lg:order-2' initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                            <Card className='relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden rounded-xl'>
                                <CardContent className='p-6'>
                                    <div className='space-y-5'>
                                        <motion.div className='text-center' initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                                            <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>Join Meeting Room</h3>
                                            <p className='text-gray-600 dark:text-gray-300 text-sm'>Enter your details to get started</p>
                                        </motion.div>
                                        <motion.div className='space-y-4' initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                                            {!user?.name && (
                                                <>
                                                    <div className='relative'>
                                                        <div className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500'>
                                                            <UserRound size={18} />
                                                        </div>
                                                        <Input
                                                            placeholder='Enter your display name'
                                                            id='name'
                                                            className='pl-10 text-sm h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-lg transition-all duration-200'
                                                            maxLength={CONSTANT.USER_NAME_MAX_LENGTH}
                                                            value={userName}
                                                            onChange={(e) => {
                                                                setUserName(e.target.value);
                                                                setDebouncedUserName(e.target.value);
                                                            }}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <div className='relative'>
                                                <div className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500'>
                                                    <MessageCircle size={18} />
                                                </div>
                                                <Input placeholder='Enter room code' id='room' className='pl-10 text-sm h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-lg transition-all duration-200' maxLength={CONSTANT.ROOM_ID_LENGTH} minLength={CONSTANT.ROOM_ID_LENGTH} value={roomId} onChange={(e) => setRoomId(e.target.value)} />
                                            </div>
                                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                <Button onClick={handleJoinRoom} id='join-btn' className='w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2' disabled={isPending || isRoomStatusPending || isVerifyRoomPending || isVerifyingOrgRoom || !roomId.trim()}>
                                                    {isPending || isRoomStatusPending || isVerifyRoomPending || isVerifyingOrgRoom ? "Joining..." : "Join Room"}
                                                    <ArrowRight className='ml-2 h-4 w-4' />
                                                </Button>
                                            </motion.div>{" "}
                                            <div className='relative flex items-center py-2'>
                                                <div className='flex-grow border-t border-gray-300 dark:border-gray-600'></div>
                                                <span className='flex-shrink mx-3 text-gray-500 dark:text-gray-400 text-xs font-medium'>or</span>
                                                <div className='flex-grow border-t border-gray-300 dark:border-gray-600'></div>
                                            </div>
                                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                <Button onClick={handleCreateRoom} disabled={isCheckApiLoading} variant='outline' className='w-full h-12 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'>
                                                    {isCheckApiLoading ? (
                                                        "Creating..."
                                                    ) : (
                                                        <>
                                                            <CheckCircle className='mr-2 h-4 w-4' />
                                                            Create New Room
                                                        </>
                                                    )}
                                                </Button>
                                            </motion.div>
                                        </motion.div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Room;
