import { User } from "@/interfaces";
import { Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { useSelector } from "react-redux";
import "react-resizable/css/styles.css";
import { StreamTile } from "./StreamTile";
import { useVideoGrid } from "@/hooks/use-video-grid";
import {
    calculateGridDimensions,
    createBreakpoints,
    createDefaultLayout,
} from "@/utils/gridLayout";
import LAYOUT_TEMPLATES from "./Templates/LayoutTemplate";
// import LAYOUT_TEMPLATES from "./Templates/LayoutTemplate";

const ResponsiveGridLayout = WidthProvider(Responsive);

export const VideoGrid = ({
    streams,
    isVideoOff,
    isMuted,
    users,
    speakingPeers,
    isSpeaking,
    togglePinUser,
    consumeTranslationStream,
    revertTranslationStream,
}: {
    streams: { id: string; stream: MediaStream; metadata?: any }[];
    isVideoOff: boolean;
    isMuted: boolean;
    users: User[];
    speakingPeers: string[];
    isSpeaking: boolean;
    togglePinUser: (peerId: string) => void;
    consumeTranslationStream?: (streamId: string) => Promise<boolean>;
    revertTranslationStream?: (targetUserId: string) => void;
}) => {
    const room = useSelector((state: any) => state.room);
    const myPeerId = room.username || "local";

    const {
        videoRefs,
        streamMapRef,
        attachMediaStream,
        layouts,
        setLayouts,
        currentBreakpoint,
        setCurrentBreakpoint,
        mounted,
        usersToShow,
        setUsersToShow,
        remainingUsers,
        setRemainingUsers,
        selectedLayoutTemplate,
        setSelectedLayoutTemplate,
        getUserStream,
        getUserAudioStream,
        isUserScreenSharing,
        isUserPinned,
        isUserSpeaking,
        hasUserStream,
        hasUserTranslation,
        isUserUsingTranslation,
        screenShareUsers,
        sortedUsers,
    } = useVideoGrid(streams, users, speakingPeers, myPeerId, room);

    const [draggedItemPrevPos, setDraggedItemPrevPos] = useState<{
        i: string;
        x: number;
        y: number;
    } | null>(null);

    // Helper: handle translation toggle
    const handleToggleTranslation = useCallback(
        async (userId: string, enable: boolean) => {
            try {
                if (enable) {
                    const translatedStreamId = `translated_${userId}_vi_en`;
                    if (consumeTranslationStream) {
                        await consumeTranslationStream(translatedStreamId);
                    }
                } else {
                    if (revertTranslationStream) {
                        revertTranslationStream(userId);
                    }
                }
            } catch (error) {
                console.error(
                    `[VideoGrid] Error toggling translation for ${userId}:`,
                    error
                );
            }
        },
        [consumeTranslationStream, revertTranslationStream]
    );

    // Get local user
    const localUser = users.find(
        (u) => u.peerId === myPeerId || u.peerId === "local"
    );
    const isLocalOnlyMode =
        sortedUsers.length === 0 && screenShareUsers.length === 0;

    // Process users for display
    useEffect(() => {
        const regularParticipants = localUser
            ? [localUser, ...sortedUsers]
            : sortedUsers;
        const allParticipants = [...screenShareUsers, ...regularParticipants];
        const maxDisplayUsers = 11;

        const usersToDisplay = allParticipants.slice(0, maxDisplayUsers);
        const remainingUsersCount = allParticipants.slice(maxDisplayUsers);

        // Check before setState to avoid unnecessary renders
        const peerIds = (arr: User[]) => arr.map((u) => u.peerId).join(",");
        if (
            peerIds(usersToShow) !== peerIds(usersToDisplay) ||
            peerIds(remainingUsers) !== peerIds(remainingUsersCount)
        ) {
            setUsersToShow(usersToDisplay);
            setRemainingUsers(remainingUsersCount);
        }
    }, [
        sortedUsers,
        localUser,
        isLocalOnlyMode,
        screenShareUsers,
        usersToShow,
        remainingUsers,
        setUsersToShow,
        setRemainingUsers,
    ]);

    // Calculate grid dimensions
    const headerHeight = 100;
    const availableHeight =
        typeof window !== "undefined" ? window.innerHeight - headerHeight : 660;
    const totalDisplayItems =
        usersToShow.length + (remainingUsers.length > 0 ? 1 : 0);

    const { gridCols, rowHeight, gridHeight } = calculateGridDimensions(
        totalDisplayItems,
        availableHeight
    );

    // Generate layouts
    useEffect(() => {
        if (isLocalOnlyMode) {
            setLayouts({});
            return;
        }

        const breakpoints = createBreakpoints(totalDisplayItems, gridCols);
        const newLayouts: { [key: string]: any[] } = {};

        Object.entries(breakpoints).forEach(([key, cols]) => {
            let layout = createDefaultLayout(usersToShow, cols);
            if (selectedLayoutTemplate) {
                layout = LAYOUT_TEMPLATES.find((template) => template.id === selectedLayoutTemplate)?.layout(
                    usersToShow,
                    cols,
                );
            }

            // Add remaining users slot if needed
            if (remainingUsers.length > 0) {
                const totalItems = usersToShow.length;
                layout.push({
                    i: "remaining",
                    x: totalItems % cols,
                    y: Math.floor(totalItems / cols),
                    w: 1,
                    h: 1,
                    minW: 1,
                    minH: 1,
                    maxW: 2,
                    maxH: 2,
                    static: false,
                });
            }

            newLayouts[key] = layout;
        });

        setLayouts(newLayouts);
    }, [
        usersToShow,
        remainingUsers,
        gridCols,
        isLocalOnlyMode,
        totalDisplayItems,
        setLayouts,
    ]);

    const createOccupancyMap = (
        layout: any[],
        gridWidth = 3,
        gridHeight = 3
    ) => {
        const grid: boolean[][] = Array.from({ length: gridHeight }, () =>
            Array.from({ length: gridWidth }, () => false)
        );

        layout.forEach((item) => {
            for (let dx = 0; dx < item.w; dx++) {
                for (let dy = 0; dy < item.h; dy++) {
                    const x = item.x + dx;
                    const y = item.y + dy;
                    if (x < gridWidth && y < gridHeight) {
                        grid[y][x] = true;
                    }
                }
            }
        });

        return grid;
    };

    const findEmptySlot = (occupancyMap: boolean[][], w: number, h: number) => {
        const rows = occupancyMap.length;
        const cols = occupancyMap[0].length;

        for (let y = 0; y <= rows - h; y++) {
            for (let x = 0; x <= cols - w; x++) {
                let fits = true;
                for (let dy = 0; dy < h && fits; dy++) {
                    for (let dx = 0; dx < w && fits; dx++) {
                        if (occupancyMap[y + dy][x + dx]) fits = false;
                    }
                }
                if (fits) return { x, y };
            }
        }
        return null;
    };

    const getItemBounds = (item: any) => ({
        x1: item.x,
        y1: item.y,
        x2: item.x + item.w - 1,
        y2: item.y + item.h - 1,
    });

    const checkOverlap = (item1: any, item2: any) => {
        const bounds1 = getItemBounds(item1);
        const bounds2 = getItemBounds(item2);

        return !(
            bounds1.x2 < bounds2.x1 ||
            bounds1.x1 > bounds2.x2 ||
            bounds1.y2 < bounds2.y1 ||
            bounds1.y1 > bounds2.y2
        );
    };

    const markOccupiedSlots = (occupancyMap: boolean[][], item: any) => {
        for (let dy = 0; dy < item.h; dy++) {
            for (let dx = 0; dx < item.w; dx++) {
                const x = item.x + dx;
                const y = item.y + dy;
                if (y < occupancyMap.length && x < occupancyMap[0].length) {
                    occupancyMap[y][x] = true;
                }
            }
        }
    };

    const onBreakpointChange = (breakpoint: string) => {
        setCurrentBreakpoint(breakpoint);
    };

    const onDragStart = (
        layout: any,
        oldItem: any,
        newItem: any,
        placeholder: any,
        e: any,
        element: any
    ) => {
        setDraggedItemPrevPos({ i: oldItem.i, x: oldItem.x, y: oldItem.y });
    };

    const onDragStop = (layout: any, oldItem: any, newItem: any) => {
        if (!draggedItemPrevPos) return;

        const overlappedItems = layout.filter(
            (item: any) => item.i !== newItem.i && checkOverlap(newItem, item)
        );

        if (overlappedItems.length > 0 && overlappedItems[0].w > newItem.w) {
            // Reset item về vị trí ban đầu
            const resetLayout = layout.map((item: any) => {
                if (item.i === newItem.i) {
                    return {
                        ...item,
                        x: draggedItemPrevPos.x,
                        y: draggedItemPrevPos.y,
                    };
                }
                return item;
            });
            // Cập nhật layout với vị trí đã reset
            setLayouts((prev) => ({
                ...prev,
                [currentBreakpoint]: resetLayout,
            }));
            setDraggedItemPrevPos(null);
            return;
        }

        if (overlappedItems.length === 0) {
            setLayouts((prev) => ({ ...prev, [currentBreakpoint]: layout }));
            setDraggedItemPrevPos(null);
            return;
        }

        const occupancyMap = createOccupancyMap(layout);

        overlappedItems.forEach((item: any) => {
            const slot = findEmptySlot(occupancyMap, item.w, item.h);
            if (slot) {
                item.x = slot.x;
                item.y = slot.y;
                markOccupiedSlots(occupancyMap, item);
            } else {
                console.warn("Không tìm được chỗ trống cho item", item.i);
            }
        });

        setLayouts((prev) => ({ ...prev, [currentBreakpoint]: layout }));
        setDraggedItemPrevPos(null);
    };

    // Render user grid item
    const renderUserGridItem = useCallback(
        (user: User) => {
            // Handle screen share users specially
            if ((user as any).isScreenShare) {
                const screenUser = user as any;
                const screenStream = screenUser.screenStream;
                const originalUser = screenUser.originalPeerId;

                return (
                    <div
                        key={user.peerId}
                        className="participant-container h-full w-full"
                    >
                        <div className="h-full w-full relative">
                            <StreamTile
                                stream={screenStream}
                                userName={`${originalUser} - Screen Share`}
                                isSpeaking={false}
                                onClick={() => {}}
                                videoOff={false}
                                micOff={false}
                                audioStream={null}
                                isScreen={true}
                                isPinned={isUserPinned(originalUser)}
                                togglePin={() => togglePinUser(originalUser)}
                                hasTranslation={false}
                                isUsingTranslation={false}
                                onToggleTranslation={handleToggleTranslation}
                            />
                        </div>
                    </div>
                );
            }

            // Regular user handling
            const userStream = getUserStream(user.peerId);
            const isLocalUser =
                user.peerId === myPeerId || user.peerId === "local";

            // Calculate remote user states
            let remoteVideoOff = false;
            let remoteMicOff = false;

            if (!isLocalUser) {
                const userStreams = streams.filter(
                    (s) =>
                        s.id.startsWith(`remote-${user.peerId}-`) &&
                        !s.id.includes("presence")
                );

                const videoStreams = userStreams.filter(
                    (s) =>
                        s.metadata?.type === "webcam" ||
                        s.metadata?.type === "screen"
                );
                const audioStreams = userStreams.filter(
                    (s) => s.metadata?.type === "mic"
                );

                const hasVideoStream = videoStreams.some(
                    (s) => s.metadata?.video !== false
                );
                const hasAudioStream = audioStreams.some(
                    (s) => s.metadata?.audio !== false
                );

                remoteVideoOff = !hasVideoStream;
                remoteMicOff = !hasAudioStream;
            }

            const isScreenShare =
                userStream?.metadata?.type === "screen" ||
                userStream?.metadata?.isScreenShare === true ||
                userStream?.id.includes("screen");

            return (
                <div
                    key={user.peerId}
                    className="participant-container h-full w-full"
                >
                    <div className="h-full w-full relative">
                        {userStream ? (
                            <StreamTile
                                stream={userStream}
                                userName={
                                    isLocalUser
                                        ? `${user.peerId} (You)`
                                        : user.peerId
                                }
                                isSpeaking={
                                    isSpeaking ||
                                    speakingPeers.includes(user.peerId)
                                }
                                onClick={() => {}}
                                videoOff={
                                    isScreenShare
                                        ? false
                                        : isLocalUser
                                        ? isVideoOff
                                        : remoteVideoOff
                                }
                                micOff={isLocalUser ? isMuted : remoteMicOff}
                                audioStream={getUserAudioStream(user.peerId)}
                                isScreen={isScreenShare}
                                isPinned={isUserPinned(user.peerId)}
                                togglePin={() => togglePinUser(user.peerId)}
                                hasTranslation={hasUserTranslation(user.peerId)}
                                isUsingTranslation={isUserUsingTranslation(
                                    user.peerId
                                )}
                                onToggleTranslation={handleToggleTranslation}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900 dark:bg-gray-800 rounded-lg shadow-md">
                                <div className="w-16 h-16 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-2 shadow-sm">
                                    {user.peerId[0].toUpperCase()}
                                </div>
                                <span className="text-white">
                                    {isLocalUser
                                        ? `${user.peerId} (You)`
                                        : user.peerId}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-300 mt-1">
                                    {isLocalUser
                                        ? "Camera/Mic turn off"
                                        : "No camera/mic"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            );
        },
        [
            getUserStream,
            getUserAudioStream,
            isUserPinned,
            hasUserTranslation,
            isUserUsingTranslation,
            handleToggleTranslation,
            togglePinUser,
            myPeerId,
            isVideoOff,
            isMuted,
            isSpeaking,
            speakingPeers,
            streams,
        ]
    );

    // Full screen local user mode
    if (isLocalOnlyMode) {
        return (
            <div
                id="video-grid"
                className="video-grid flex flex-col gap-4 relative"
            >
                <div
                    className="w-full flex items-center justify-center"
                    style={{
                        height: availableHeight,
                        maxHeight: availableHeight,
                    }}
                >
                    <div className="relative w-full h-full rounded-xl overflow-hidden bg-black dark:bg-gray-900">
                        {localUser && getUserStream(localUser.peerId) ? (
                            (() => {
                                const stream = getUserStream(localUser.peerId)!;
                                const isScreenSharing = isUserScreenSharing(
                                    localUser.peerId
                                );
                                const audioStream = getUserAudioStream(
                                    localUser.peerId
                                );

                                return (
                                    <StreamTile
                                        stream={stream}
                                        userName={`${
                                            localUser?.peerId || "Bạn"
                                        } (You)`}
                                        isSpeaking={
                                            isSpeaking ||
                                            speakingPeers.includes(
                                                localUser?.peerId || ""
                                            )
                                        }
                                        onClick={() => {}}
                                        videoOff={
                                            isScreenSharing ? false : isVideoOff
                                        }
                                        micOff={isMuted}
                                        isScreen={isScreenSharing}
                                        audioStream={audioStream}
                                        isPinned={false}
                                        togglePin={() => {}}
                                    />
                                );
                            })()
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900 dark:bg-gray-950 rounded-lg">
                                <div className="w-16 h-16 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
                                    {(localUser?.peerId ||
                                        "B")[0].toUpperCase()}
                                </div>
                                <span className="text-white text-2xl">
                                    {localUser?.peerId || "Bạn"}
                                </span>
                            </div>
                        )}
                        <span className="absolute top-4 left-4 bg-blue-600 dark:bg-blue-700 text-white text-xs px-4 py-2 rounded shadow">
                            Bạn
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Main grid layout
    const breakpoints = createBreakpoints(totalDisplayItems, gridCols);

    return (
        <div
            id="video-grid"
            className="video-grid flex flex-col gap-4 relative dark:bg-gray-950"
        >
            <div style={{ height: gridHeight, maxHeight: gridHeight }}>
                {layouts.lg && layouts.lg.length > 0 && (
                    <ResponsiveGridLayout
                        className="layout"
                        layouts={layouts}
                        breakpoints={{
                            lg: 1200,
                            md: 996,
                            sm: 768,
                            xs: 480,
                            xxs: 0,
                        }}
                        cols={breakpoints}
                        rowHeight={rowHeight}
                        isResizable={true}
                        isDraggable={true}
                        compactType={"vertical"}
                        preventCollision={false}
                        margin={[16, 16]}
                        containerPadding={[16, 16]}
                        onBreakpointChange={onBreakpointChange}
                        useCSSTransforms={mounted}
                        onDragStart={onDragStart}
                        onDragStop={onDragStop}
                        allowOverlap={true}
                        style={{ height: gridHeight, maxHeight: gridHeight }}
                    >
                        {usersToShow.map(renderUserGridItem)}

                        {remainingUsers.length > 0 && (
                            <div
                                key="remaining"
                                className="participant-container h-full w-full"
                            >
                                <div className="h-full w-full">
                                    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900 dark:bg-gray-800 rounded-lg shadow-md">
                                        <div className="w-16 h-16 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-2 shadow-sm">
                                            <Users className="h-7 w-7" />
                                        </div>
                                        <span className="text-white">
                                            +{remainingUsers.length} other users
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ResponsiveGridLayout>
                )}
            </div>
        </div>
    );
};
