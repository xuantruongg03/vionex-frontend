import useBehaviorMonitor from "@/hooks/use-behavior-monitor";
import { useCallRefactored as useCall } from "@/hooks/use-call-refactored";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScreenRecorder } from "@/hooks/use-screen-recorder";
import useUser from "@/hooks/use-user";
import { User } from "@/interfaces";
import { ActionLogType } from "@/interfaces/action";
import { TypeUserEvent } from "@/interfaces/behavior";
import { Disc2, Loader2, QrCode } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Chatbot } from "./ChatBotUI";
import {
    ChatSidebar,
    LockRoomDialog,
    NetworkMonitorDialog,
    ParticipantsList,
    QRCodeDialog,
    QuizSidebar,
    SecretVotingDialog,
    TranslationCabinSidebar,
    VideoControls,
    VideoGrid,
    Whiteboard,
} from "./index";
import { Button } from "./ui/button";
import { SelectLayoutTemplate } from "./Dialogs/SelectLayoutTemplate";

export const VideoCallHybrid = ({ roomId }: { roomId: string }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
    const [isQuizOpen, setIsQuizOpen] = useState(false);
    const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
    const [isChatboxOpen, setIsChatboxOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [canToggleVideo, setCanToggleVideo] = useState(true);
    const [canToggleAudio, setCanToggleAudio] = useState(true);
    const [isShowDialogPassword, setIsShowDialogPassword] = useState(false);
    const [isNetworkMonitorOpen, setIsNetworkMonitorOpen] = useState(false);
    const [isVotingDialogOpen, setIsVotingDialogOpen] = useState(false);
    const [isTranslationCabinOpen, setIsTranslationCabinOpen] = useState(false);
    const [isOpenSelectLayoutTemplate, setIsOpenSelectLayoutTemplate] =
        useState(false);

    // Track if we've already attempted to join to prevent multiple join attempts
    const hasAttemptedJoin = useRef(false);

    const { isRecording, isProcessing, toggleRecording } = useScreenRecorder();
    //Room state from redux store
    const room = useSelector((state: any) => state.room);

    const {
        streams,
        screenStreams,
        // isConnected,
        isJoined,
        speakingPeers,
        isSpeaking,
        isScreenSharing,
        // Actions
        joinRoom,
        leaveRoom,
        toggleVideo,
        toggleAudio,
        toggleScreenShare,
        toggleLockRoom,
        togglePinUser,
        consumeTranslationStream,
        revertTranslationStream,
    } = useCall(roomId ?? "", room.password || null);
    const {
        users: hybridUsers,
        handleKickUser: kickUserFromHook,
        fetchUsers,
        // error: userError,
    } = useUser(roomId ?? "");

    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const dispatch = useDispatch();

    // Auto-join room when component mounts and user is authenticated
    useEffect(() => {
        const autoJoinRoom = async () => {
            // Only attempt to join once and if we have the required data
            if (
                roomId &&
                room.username &&
                joinRoom &&
                !hasAttemptedJoin.current
            ) {
                hasAttemptedJoin.current = true;
                try {
                    await joinRoom();
                } catch (error) {
                    console.error("[VideoCallHybrid] Auto-join failed:", error);
                    // Reset the flag on failure so user can retry
                    hasAttemptedJoin.current = false;
                }
            }
        };

        // Add a small delay to ensure all dependencies are stable
        const timeoutId = setTimeout(() => {
            autoJoinRoom();
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [roomId, room.username]); // Only depend on stable values

    const { sendLogsToServer, isMonitorActive, toggleBehaviorMonitoring } =
        useBehaviorMonitor({ roomId: roomId ?? "" });

    const users = useMemo((): User[] => {
        // If we have users from the hybrid hook, use them
        if (hybridUsers && hybridUsers.length > 0) {
            return hybridUsers;
        }

        // Fallback: create users from streams (for backward compatibility)
        const userMap = new Map<string, User>();

        // Add current user
        const currentUser = room.username;
        if (currentUser) {
            userMap.set(currentUser, {
                peerId: currentUser,
                isCreator: room.isCreator || false,
                timeArrive: new Date(),
            });
        }

        // Extract users from remote stream IDs (format: remote-{publisherId}-{mediaType})
        streams.forEach((stream) => {
            if (stream.id.startsWith("remote-")) {
                const parts = stream.id.split("-");
                if (parts.length >= 3) {
                    const publisherId = parts[1]; // remote-{publisherId}-{mediaType}
                    if (!userMap.has(publisherId)) {
                        userMap.set(publisherId, {
                            peerId: publisherId,
                            isCreator: false,
                            timeArrive: new Date(),
                        });
                    }
                }
            }
        });

        return Array.from(userMap.values());
    }, [hybridUsers, streams, room.username, room.isCreator]);

    // Handle user kick using the user hook
    const handleKickUser = useCallback(
        (participantId: string) => {
            kickUserFromHook(participantId);
        },
        [kickUserFromHook]
    );

    // Fetch users when joined or streams change significantly
    useEffect(() => {
        if (isJoined && fetchUsers) {
            // Fetch users when stream count changes (new user might have joined)
            const timeoutId = setTimeout(() => {
                fetchUsers();
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [isJoined, streams.length]);

    // Handle navigation if no username
    useEffect(() => {
        if (!room.username) {
            navigate("/room");
        }
    }, [room.username, navigate]);

    // Cleanup on unmount
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (roomId) {
                sendLogsToServer();
                leaveRoom();
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Only leave room on unmount, media cleanup is handled by App-level hook
            if (roomId) {
                leaveRoom();
            }
        };
    }, []); // Empty dependency array - only run on mount/unmount

    // Update local UI state based on streams
    useEffect(() => {
        const localStream = streams.find((s) => s.id === "local");
        if (localStream) {
            const videoTracks = localStream.stream.getVideoTracks();
            const hasVideoTracks = videoTracks.length > 0;
            const isVideoEnabled = hasVideoTracks && videoTracks[0].enabled;
            const hasCameraUnavailable =
                localStream.metadata?.noCameraAvailable === true;

            // Update video state based on metadata or track state
            if (localStream.metadata?.video === false || !isVideoEnabled) {
                if (!isVideoOff) {
                    setIsVideoOff(true);
                }
            } else if (localStream.metadata?.video === true || isVideoEnabled) {
                if (isVideoOff) {
                    setIsVideoOff(false);
                }
            }

            // Only disable toggle if camera is actually unavailable, not just off
            if (hasCameraUnavailable || !hasVideoTracks) {
                setCanToggleVideo(false);
            } else {
                setCanToggleVideo(true);
            }

            const audioTracks = localStream.stream.getAudioTracks();
            const hasAudioTracks = audioTracks.length > 0;
            const isAudioEnabled = hasAudioTracks && audioTracks[0].enabled;
            const hasMicUnavailable =
                localStream.metadata?.noMicroAvailable === true;

            // Update muted state based on metadata or track state
            if (localStream.metadata?.audio === false || !isAudioEnabled) {
                if (!isMuted) {
                    setIsMuted(true);
                }
            } else if (localStream.metadata?.audio === true || isAudioEnabled) {
                if (isMuted) {
                    setIsMuted(false);
                }
            }

            // Only disable toggle if mic is actually unavailable, not just muted
            if (hasMicUnavailable || !hasAudioTracks) {
                setCanToggleAudio(false);
            } else {
                setCanToggleAudio(true);
            }
        }
    }, [streams, isVideoOff, isMuted]);

    const handleToggleVideo = async () => {
        if (canToggleVideo) {
            try {
                const videoEnabled = await toggleVideo();
                setIsVideoOff(!videoEnabled);
                dispatch({
                    type: ActionLogType.SET_EVENT_LOG,
                    payload: [
                        {
                            type: TypeUserEvent.CAM,
                            value: videoEnabled,
                            time: new Date(),
                        },
                    ],
                });
            } catch (error) {
                toast.error("Can't toggle camera");
            }
        } else {
            toast.error("Can't toggle camera");
        }
    };

    const handleToggleAudio = async () => {
        if (canToggleAudio) {
            try {
                const audioEnabled = await toggleAudio();
                setIsMuted(!audioEnabled);
                dispatch({
                    type: ActionLogType.SET_EVENT_LOG,
                    payload: [
                        {
                            type: TypeUserEvent.MIC,
                            value: audioEnabled,
                            time: new Date(),
                        },
                    ],
                });
            } catch (error) {
                toast.error("Can't toggle microphone");
            }
        } else {
            toast.error("Can't toggle microphone");
        }
    };

    const handleSetPassword = async (password: string) => {
        setIsShowDialogPassword(false);
        toggleLockRoom(password);
    };

    const handleToggleLockRoom = () => {
        if (!room.isLocked) {
            setIsShowDialogPassword(true);
        } else {
            handleSetPassword("");
        }
    };

    const handleToggleVoting = () => {
        if (isMobile) {
            if (isChatOpen) setIsChatOpen(false);
            if (isWhiteboardOpen) setIsWhiteboardOpen(false);
            if (isQuizOpen) setIsQuizOpen(false);
        }
        setIsVotingDialogOpen(!isVotingDialogOpen);
    };

    const handleToggleQuiz = () => {
        if (isMobile) {
            if (isChatOpen) setIsChatOpen(false);
            if (isWhiteboardOpen) setIsWhiteboardOpen(false);
        }
        setIsQuizOpen(!isQuizOpen);
    };

    const handleToggleChat = () => {
        if (isMobile && isQuizOpen && !isChatOpen) {
            setIsQuizOpen(false);
        }
        // Desktop: Auto-close other sidebars when opening chat
        if (!isChatOpen) {
            setIsTranslationCabinOpen(false);
            setIsWhiteboardOpen(false);
        }
        setIsChatOpen(!isChatOpen);
    };

    const handleToggleWhiteboard = () => {
        if (isMobile) {
            if (isChatOpen) setIsChatOpen(false);
            if (isQuizOpen) setIsQuizOpen(false);
        } else {
            if (!isWhiteboardOpen) {
                setIsChatOpen(false);
                setIsTranslationCabinOpen(false);
            }
        }
        setIsWhiteboardOpen(!isWhiteboardOpen);
    };

    const handleToggleRecording = () => {
        toggleRecording();
    };

    const handleToggleBehaviorMonitoring = () => {
        if (streams.length > 2) {
            toggleBehaviorMonitoring();
        } else {
            toast.error(
                "At least 3 participants are required for behavior monitoring."
            );
        }
    };

    const handleLeaveRoom = () => {
        sendLogsToServer();
        leaveRoom();
        navigate("/room");
    };

    const handleToggleScreenShare = async () => {
        try {
            const success = await toggleScreenShare();
            if (!success) {
                console.log("Screen share toggle failed or was cancelled");
            }
        } catch (error) {
            console.error("Error toggling screen share:", error);
            toast.error("Can't toggle screen share");
        }
    };

    const handleToggleTranslationCabin = () => {
        if (isMobile) {
            if (isChatOpen) setIsChatOpen(false);
            if (isWhiteboardOpen) setIsWhiteboardOpen(false);
            if (isQuizOpen) setIsQuizOpen(false);
        } else {
            // Desktop: Auto-close other sidebars when opening translation cabin
            if (!isTranslationCabinOpen) {
                setIsChatOpen(false);
                setIsWhiteboardOpen(false);
            }
        }
        setIsTranslationCabinOpen(!isTranslationCabinOpen);
    };

    return (
        <div className='flex h-screen bg-gray-50 dark:bg-gray-900 relative'>
            <SelectLayoutTemplate
                isOpen={isOpenSelectLayoutTemplate}
                onClose={() => setIsOpenSelectLayoutTemplate(false)}
            />
            <LockRoomDialog
                isOpen={isShowDialogPassword}
                onClose={() => {
                    setIsShowDialogPassword(false);
                }}
                onSetPassword={handleSetPassword}
            />
            {isNetworkMonitorOpen && (
                <NetworkMonitorDialog
                    isOpen={isNetworkMonitorOpen}
                    onClose={() => setIsNetworkMonitorOpen(false)}
                />
            )}
            {isVotingDialogOpen && (
                <SecretVotingDialog
                    isOpen={isVotingDialogOpen}
                    onClose={() => setIsVotingDialogOpen(false)}
                    roomId={roomId || ""}
                />
            )}
            <Chatbot
                isOpen={isChatboxOpen}
                onClose={() => setIsChatboxOpen(false)}
                roomId={roomId || ""}
            />
            <div
                className={`relative flex-1 p-2 md:p-4 transition-all duration-300 ${
                    (isChatOpen || isTranslationCabinOpen) && !isMobile
                        ? "mr-[320px]"
                        : ""
                }`}
            >
                <div className='mb-2 md:mb-4 flex items-center justify-between relative'>
                    <div className='flex items-center gap-2'>
                        <h2 className='text-base md:text-lg font-semibold text-gray-900 dark:text-white'>
                            {room.isOrganizationRoom ? (
                                <>(Organization Room)</>
                            ) : (
                                <>Room ID: {roomId}</>
                            )}
                        </h2>
                        {!room.isOrganizationRoom && (
                            <Button
                                variant='outline'
                                size='icon'
                                title='QR Code'
                                onClick={() => setIsQRCodeOpen(true)}
                                className=''
                            >
                                <QrCode className='h-5 w-5' />
                            </Button>
                        )}
                    </div>
                    <div className='flex items-center gap-2'>
                        {isRecording && !isProcessing && (
                            <div className='flex items-center gap-1 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full'>
                                <Disc2
                                    className='h-4 w-4 fill-white animate-pulse'
                                    color='red'
                                />
                                <span className='text-xs text-red-600 dark:text-red-400 font-medium'>
                                    Recording
                                </span>
                            </div>
                        )}
                        {isProcessing && (
                            <div className='flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full'>
                                <Loader2
                                    className='h-4 w-4 animate-spin'
                                    color='#f59e0b'
                                />
                                <span className='text-xs text-yellow-600 dark:text-yellow-400 font-medium'>
                                    Processing
                                </span>
                            </div>
                        )}
                        <ParticipantsList
                            roomId={roomId}
                            togglePinUser={togglePinUser}
                            handleKickUser={handleKickUser}
                            users={users}
                        />
                    </div>
                </div>
                <VideoGrid
                    streams={streams}
                    screenStreams={screenStreams}
                    isVideoOff={isVideoOff}
                    users={users || []}
                    isMuted={isMuted}
                    speakingPeers={Array.from(speakingPeers)}
                    isSpeaking={isSpeaking}
                    togglePinUser={togglePinUser}
                    consumeTranslationStream={consumeTranslationStream}
                    revertTranslationStream={revertTranslationStream}
                />
                <VideoControls
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                    onToggleMute={handleToggleAudio}
                    onToggleVideo={handleToggleVideo}
                    onToggleChat={handleToggleChat}
                    onToggleWhiteboard={handleToggleWhiteboard}
                    onToggleScreenShare={handleToggleScreenShare}
                    isScreenSharing={isScreenSharing}
                    onToggleLockRoom={handleToggleLockRoom}
                    onToggleNetworkMonitor={() =>
                        setIsNetworkMonitorOpen(!isNetworkMonitorOpen)
                    }
                    onToggleTranslationCabin={handleToggleTranslationCabin}
                    onToggleVoting={handleToggleVoting}
                    onToggleQuiz={handleToggleQuiz}
                    onToggleRecording={handleToggleRecording}
                    isRecording={isRecording}
                    isProcessing={isProcessing}
                    onLeaveRoom={handleLeaveRoom}
                    onToggleBehaviorMonitoring={handleToggleBehaviorMonitoring}
                    isCreator={room.isCreator}
                    isMonitorActive={isMonitorActive}
                    onToggleLayout={() =>
                        setIsOpenSelectLayoutTemplate(
                            !isOpenSelectLayoutTemplate
                        )
                    }
                />
            </div>{" "}
            {isTranslationCabinOpen && (
                <TranslationCabinSidebar
                    isOpen={isTranslationCabinOpen}
                    setIsOpen={setIsTranslationCabinOpen}
                    roomId={roomId || ""}
                    availableUsers={users.map((user) => ({
                        id: user.peerId,
                        username: user.peerId,
                    }))}
                    onConsumeTranslation={(streamId) =>
                        consumeTranslationStream(streamId)
                    }
                />
            )}
            {isChatOpen && (
                <ChatSidebar
                    isOpen={isChatOpen}
                    setIsOpen={setIsChatOpen}
                    roomId={roomId}
                />
            )}
            <QRCodeDialog
                isOpen={isQRCodeOpen}
                onClose={() => setIsQRCodeOpen(false)}
                roomId={roomId || ""}
            />{" "}
            {isWhiteboardOpen && (
                <Whiteboard
                    roomId={roomId}
                    isOpen={isWhiteboardOpen}
                    onClose={() => setIsWhiteboardOpen(false)}
                    users={hybridUsers || []}
                />
            )}
            {isQuizOpen && (
                <QuizSidebar
                    roomId={roomId || ""}
                    isOpen={isQuizOpen}
                    onClose={() => {
                        setIsQuizOpen(false);
                    }}
                />
            )}
        </div>
    );
};
