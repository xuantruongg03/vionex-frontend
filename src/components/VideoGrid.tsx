import { User } from "@/interfaces";
import { Users } from "lucide-react";
import { useCallback, useEffect, useState, useMemo, memo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { useSelector } from "react-redux";
import "react-resizable/css/styles.css";
import { StreamTile } from "./StreamTile";
import { useVideoGrid } from "@/hooks/use-video-grid";
import { calculateGridDimensions, createDefaultLayout, getOptimalLayout } from "@/utils/gridLayout";
import LAYOUT_TEMPLATES, { getLayoutCapacity } from "./Templates/LayoutTemplate";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Shared Avatar component to eliminate duplication
const SharedAvatar = ({ userName, isSpeaking = false, size = "w-16 h-16", textSize = "text-xl", children }: { userName: string; isSpeaking?: boolean; size?: string; textSize?: string; children?: React.ReactNode }) => {
    const initial = (userName || "U").charAt(0).toUpperCase();

    return <div className={`${size} rounded-full flex items-center justify-center text-white ${textSize} font-bold shadow-sm relative z-10 ${isSpeaking ? "bg-gradient-to-r from-green-500 to-green-600 ring-2 ring-green-400/50 shadow-lg shadow-green-400/20" : "bg-gradient-to-r from-blue-500 to-purple-500"}`}>{children || initial}</div>;
};

// Memoize the entire component to prevent unnecessary re-renders
export const VideoGrid = memo(({ streams, screenStreams, isVideoOff, isMuted, users, speakingPeers, isSpeaking, togglePinUser, removeTranslatedStream }: { streams: { id: string; stream: MediaStream; metadata?: any }[]; screenStreams: { id: string; stream: MediaStream; metadata?: any }[]; isVideoOff: boolean; isMuted: boolean; users: User[]; speakingPeers: string[]; isSpeaking: boolean; togglePinUser: (peerId: string) => void; removeTranslatedStream?: (targetUserId: string) => void }) => {
    const room = useSelector((state: any) => state.room);
    const myPeerId = room.username || "local";

    const {
        layouts,
        setLayouts,
        currentBreakpoint,
        setCurrentBreakpoint,
        mounted,
        usersToShow,
        setUsersToShow,
        remainingUsers,
        setRemainingUsers,
        selectedLayoutTemplate, // Now from Redux via useVideoGrid
        getUserStream,
        getUserAudioStream,
        isUserScreenSharing,
        isUserPinned,
        isUserSpeaking,
        hasUserTranslation,
        isUserUsingTranslation,
        screenShareUsers,
        sortedUsers,
        processUsersForDisplay,
    } = useVideoGrid(streams, screenStreams, users, speakingPeers, myPeerId, room);

    const [draggedItemPrevPos, setDraggedItemPrevPos] = useState<{
        i: string;
        x: number;
        y: number;
    } | null>(null);

    // Get local user
    const localUser = users.find((u) => u.peerId === myPeerId || u.peerId === "local");
    const isLocalOnlyMode = sortedUsers.length === 0 && screenShareUsers.length === 0;

    // FIX: Calculate grid dimensions FIRST
    const headerHeight = 100;
    const availableHeight = useMemo(() => (typeof window !== "undefined" ? window.innerHeight - headerHeight : 660), []);

    // [REFACTOR] Process users for display - use hook function
    const allValidUsers = useMemo(() => {
        return processUsersForDisplay(selectedLayoutTemplate, localUser, room.pinnedUsers);
    }, [processUsersForDisplay, selectedLayoutTemplate, localUser, room.pinnedUsers]);

    // Calculate grid cols based on total users
    const baseGridCols = useMemo(() => {
        // FIX: Only force 4 cols for specific templates (not 'auto')
        // 'auto' is the default layout and should use optimal grid sizing
        const needsFixedGrid = selectedLayoutTemplate && selectedLayoutTemplate !== "auto";

        if (needsFixedGrid) {
            return 4; // Standard grid for sidebar, spotlight, top-hero-bar
        }

        // Original logic for auto/default layout
        const layout = getOptimalLayout(Math.min(allValidUsers.length, 12));
        return layout.cols;
    }, [allValidUsers.length, selectedLayoutTemplate]);

    // FIX: Calculate max display users based on grid cols and selected layout
    const maxDisplayUsers = useMemo(() => {
        const cols = baseGridCols;
        const rows = 3; // Standard 3 rows

        // If auto layout or no layout, use default capacity (cols * rows - 1)
        const needsFixedGrid = selectedLayoutTemplate && selectedLayoutTemplate !== "auto";
        if (!needsFixedGrid) {
            return cols * rows - 1; // Default: varies based on grid size
        }

        // Get capacity for selected layout (sidebar, spotlight, top-hero-bar)
        // Spotlight doesn't reserve slot for remaining indicator
        const includeRemaining = selectedLayoutTemplate !== "spotlight";
        const capacity = getLayoutCapacity(selectedLayoutTemplate, cols, rows, includeRemaining);

        // If capacity calculation fails, fallback based on grid size
        return capacity !== null ? capacity : cols * rows - 1;
    }, [selectedLayoutTemplate, baseGridCols, allValidUsers.length]);

    // Slice users based on calculated capacity
    const processedUsers = useMemo(() => {
        const usersToDisplay = allValidUsers.slice(0, maxDisplayUsers);
        const remainingUsersCount = allValidUsers.slice(maxDisplayUsers);

        return {
            usersToDisplay,
            remainingUsersCount,
        };
    }, [allValidUsers, maxDisplayUsers]);

    // Update state only when needed
    useEffect(() => {
        const { usersToDisplay, remainingUsersCount } = processedUsers;

        // Special handling for spotlight: no remaining users
        const finalRemainingUsers = selectedLayoutTemplate === "spotlight" ? [] : remainingUsersCount;

        // Check before setState to avoid unnecessary renders
        const peerIds = (arr: User[]) => arr.map((u) => u.peerId).join(",");
        if (peerIds(usersToShow) !== peerIds(usersToDisplay) || peerIds(remainingUsers) !== peerIds(finalRemainingUsers)) {
            setUsersToShow(usersToDisplay);
            setRemainingUsers(finalRemainingUsers);
        }
    }, [processedUsers, selectedLayoutTemplate]); // Remove circular dependencies

    // Calculate totalDisplayItems and grid dimensions
    // Spotlight layout never shows remaining users indicator
    const totalDisplayItems = useMemo(() => {
        const hasRemaining = selectedLayoutTemplate === "spotlight" ? false : remainingUsers.length > 0;
        return usersToShow.length + (hasRemaining ? 1 : 0);
    }, [usersToShow.length, remainingUsers.length, selectedLayoutTemplate]);

    // Memoize needsFixedGrid check to avoid recalculation
    const needsFixedGrid = useMemo(() => {
        return selectedLayoutTemplate && selectedLayoutTemplate !== "auto";
    }, [selectedLayoutTemplate]);

    // FIX: Use baseGridCols for grid dimensions, NOT recalculated from totalDisplayItems
    // This ensures layout templates render with correct column count
    const gridDimensions = useMemo(() => {
        // Only force fixed 4×3 grid for specific templates (not 'auto')
        // 'auto' is the default and should use optimal sizing
        let itemsForCalculation = totalDisplayItems;

        if (needsFixedGrid) {
            // Force calculation for full 4×3 grid (12 items) for sidebar, spotlight, top-hero-bar
            itemsForCalculation = 12;
        }

        // Calculate dimensions using totalDisplayItems to get correct rowCount
        // Then recalculate gridHeight based on baseGridCols for consistency
        const dims = calculateGridDimensions(
            itemsForCalculation,
            availableHeight,
            16, // containerPadding
            16, // marginSize
            180, // minRowHeight
            500, // maxRowHeightLimit
            currentBreakpoint
        );

        // Recalculate actualRows based on baseGridCols for accurate height
        const actualRows = Math.ceil(totalDisplayItems / baseGridCols);
        const actualItemHeight = dims.rowHeight + 16; // marginSize
        const calculatedHeight = actualRows * actualItemHeight + 16 * 2; // containerPadding

        // Use availableHeight as minimum to prevent small background
        const gridHeight = Math.max(calculatedHeight, availableHeight);

        return {
            ...dims,
            gridCols: baseGridCols,
            actualRows,
            gridHeight,
        };
    }, [totalDisplayItems, availableHeight, currentBreakpoint, baseGridCols, needsFixedGrid]);

    const { gridCols, rowHeight, gridHeight } = gridDimensions;

    // Memoize breakpoint configurations
    const breakpointConfigs = useMemo(() => {
        // FIX: Only force baseGridCols for specific templates (not 'auto')
        // 'auto' should use responsive grid like default
        if (needsFixedGrid) {
            return {
                lg: { cols: baseGridCols },
                md: { cols: baseGridCols },
                sm: { cols: baseGridCols },
                xs: { cols: baseGridCols },
                xxs: { cols: baseGridCols },
            };
        }

        // Original responsive logic for auto/default layout
        return {
            lg: { cols: gridCols },
            md: { cols: gridCols },
            sm: {
                cols: totalDisplayItems === 2 ? 2 : totalDisplayItems === 3 ? 3 : Math.min(gridCols, 2),
            },
            xs: {
                cols: totalDisplayItems === 2 || totalDisplayItems === 3 ? 1 : Math.min(gridCols, 2),
            },
            xxs: {
                cols: totalDisplayItems === 2 || totalDisplayItems === 3 ? 1 : 1,
            },
        };
    }, [gridCols, totalDisplayItems, needsFixedGrid, baseGridCols]);

    useEffect(() => {
        if (isLocalOnlyMode) {
            setLayouts({});
            return;
        }

        const newLayouts: { [key: string]: any[] } = {};

        // Create layout for each breakpoint with specific logic
        Object.entries(breakpointConfigs).forEach(([key, config]) => {
            const cols = config.cols;
            let layout = createDefaultLayout(usersToShow, cols);

            if (selectedLayoutTemplate) {
                const template = LAYOUT_TEMPLATES.find((template) => template.id === selectedLayoutTemplate);
                if (template) {
                    layout = template.layout(usersToShow, cols, remainingUsers.length);
                }
            } else {
                // Default behavior: add remaining slot for default layout
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
            }

            newLayouts[key] = layout;
        });

        setLayouts(newLayouts);
    }, [usersToShow, remainingUsers.length, gridCols, isLocalOnlyMode, totalDisplayItems, setLayouts, selectedLayoutTemplate, room.pinnedUsers, breakpointConfigs]);

    const createOccupancyMap = (layout: any[], gridWidth = 3, gridHeight = 3) => {
        const grid: boolean[][] = Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => false));

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

        return !(bounds1.x2 < bounds2.x1 || bounds1.x1 > bounds2.x2 || bounds1.y2 < bounds2.y1 || bounds1.y1 > bounds2.y2);
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

    // Stable function references to prevent re-renders
    const onBreakpointChangeStable = useCallback(
        (breakpoint: string) => {
            setCurrentBreakpoint(breakpoint);
        },
        [setCurrentBreakpoint]
    );

    const onDragStartStable = useCallback((layout: any, oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
        setDraggedItemPrevPos({
            i: oldItem.i,
            x: oldItem.x,
            y: oldItem.y,
        });
    }, []);

    const onDragStopStable = useCallback(
        (layout: any, oldItem: any, newItem: any) => {
            if (!draggedItemPrevPos) return;

            const overlappedItems = layout.filter((item: any) => item.i !== newItem.i && checkOverlap(newItem, item));

            if (overlappedItems.length > 0 && overlappedItems[0].w > newItem.w) {
                // Reset item to original position
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
                // Update layout with reset position
                setLayouts((prev) => ({
                    ...prev,
                    [currentBreakpoint]: resetLayout,
                }));
                setDraggedItemPrevPos(null);
                return;
            }

            if (overlappedItems.length === 0) {
                setLayouts((prev) => ({
                    ...prev,
                    [currentBreakpoint]: layout,
                }));
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
                    console.warn("Cannot find empty slot for item", item.i);
                }
            });

            setLayouts((prev) => ({
                ...prev,
                [currentBreakpoint]: layout,
            }));
            setDraggedItemPrevPos(null);
        },
        [draggedItemPrevPos, currentBreakpoint, setLayouts]
    );

    const onBreakpointChange = onBreakpointChangeStable;
    const onDragStart = onDragStartStable;
    const onDragStop = onDragStopStable;

    // Render user grid item
    const renderUserGridItem = useCallback(
        (user: User) => {
            // Safety check for user object
            if (!user || !user.peerId) {
                console.warn("[VideoGrid] Invalid user object:", user);
                return null;
            }

            // Handle screen share users specially
            if ((user as any).isScreenShare) {
                const screenUser = user as any;
                const screenStream = screenUser.screenStream;
                const originalUser = screenUser.originalPeerId;

                return (
                    <div key={user.peerId} className='participant-container h-full w-full'>
                        <StreamTile stream={screenStream} userName={`${originalUser} - Screen Share`} isSpeaking={false} onClick={() => {}} videoOff={false} micOff={false} audioStream={null} isScreen={true} isPinned={isUserPinned(originalUser)} togglePin={() => togglePinUser(originalUser)} hasTranslation={false} isUsingTranslation={false} userInfo={user.userInfo} />
                    </div>
                );
            }

            // Regular user handling - always use StreamTile for consistency
            const userStream = getUserStream(user.peerId);
            const isLocalUser = user.peerId === myPeerId || user.peerId === "local";

            // Calculate remote user states
            let remoteVideoOff = false;
            let remoteMicOff = false;

            if (!isLocalUser) {
                const userStreams = streams.filter((s) => s.id.startsWith(`remote-${user.peerId}-`) && !s.id.includes("presence"));

                const videoStreams = userStreams.filter((s) => s.metadata?.type === "webcam" || s.metadata?.type === "screen");
                const audioStreams = userStreams.filter((s) => s.metadata?.type === "mic");

                // IMPROVED: More comprehensive video/audio state detection
                const hasEnabledVideoStream = videoStreams.length > 0 && videoStreams.some((s) => s.metadata?.video === true);

                const hasEnabledAudioStream = audioStreams.length > 0 && audioStreams.some((s) => s.metadata?.audio === true);

                remoteVideoOff = !hasEnabledVideoStream;
                remoteMicOff = !hasEnabledAudioStream;
            }

            const isScreenShare = userStream?.metadata?.type === "screen" || userStream?.metadata?.isScreenShare === true || userStream?.id.includes("screen");

            return (
                <div key={user.peerId} className='participant-container h-full w-full'>
                    <StreamTile
                        stream={
                            userStream || {
                                id: `fallback-${user.peerId}`,
                                stream: new MediaStream(),
                                metadata: {},
                            }
                        }
                        userName={isLocalUser ? `${user.peerId} (You)` : user.peerId}
                        isSpeaking={isSpeaking || speakingPeers.includes(user.peerId)}
                        onClick={() => {}}
                        videoOff={isScreenShare ? false : isLocalUser ? isVideoOff : remoteVideoOff}
                        micOff={isLocalUser ? isMuted : remoteMicOff}
                        audioStream={getUserAudioStream(user.peerId)}
                        isScreen={isScreenShare}
                        isPinned={isUserPinned(user.peerId)}
                        togglePin={() => togglePinUser(user.peerId)}
                        hasTranslation={hasUserTranslation(user.peerId)}
                        isUsingTranslation={isUserUsingTranslation(user.peerId)}
                        userInfo={user.userInfo}
                    />
                </div>
            );
        },
        [myPeerId, isVideoOff, isMuted, isSpeaking, streams, speakingPeers, getUserStream, getUserAudioStream, isUserPinned, hasUserTranslation, isUserUsingTranslation, togglePinUser]
    );

    // Memoize breakpoint columns for ResponsiveGridLayout
    const breakpointCols = useMemo(
        () => ({
            lg: breakpointConfigs.lg.cols,
            md: breakpointConfigs.md.cols,
            sm: breakpointConfigs.sm.cols,
            xs: breakpointConfigs.xs.cols,
            xxs: breakpointConfigs.xxs.cols,
        }),
        [breakpointConfigs]
    );

    // Full screen local user mode - refactored to use StreamTile consistently
    if (isLocalOnlyMode) {
        return (
            <div id='video-grid' className='video-grid flex flex-col gap-4 relative'>
                <div
                    className='w-full flex items-center justify-center'
                    style={{
                        height: availableHeight,
                        maxHeight: availableHeight,
                    }}
                >
                    <div className='relative w-full h-full rounded-xl overflow-hidden bg-black dark:bg-gray-900'>
                        {localUser ? (
                            <StreamTile
                                stream={
                                    getUserStream(localUser.peerId) || {
                                        id: `local-${localUser.peerId}`,
                                        stream: new MediaStream(),
                                        metadata: {},
                                    }
                                }
                                userName={`${localUser?.peerId || "You"} (You)`}
                                isSpeaking={isSpeaking || speakingPeers.includes(localUser?.peerId || "")}
                                onClick={() => {}}
                                videoOff={isUserScreenSharing(localUser.peerId) ? false : isVideoOff}
                                micOff={isMuted}
                                isScreen={isUserScreenSharing(localUser.peerId)}
                                audioStream={getUserAudioStream(localUser.peerId)}
                                isPinned={false}
                                togglePin={() => {}}
                                userInfo={localUser.userInfo} // Pass user info for local user too
                            />
                        ) : (
                            <div className='flex flex-col items-center justify-center h-full w-full bg-gray-900 dark:bg-gray-950 rounded-lg'>
                                <SharedAvatar userName='You' size='w-16 h-16' textSize='text-2xl' />
                                <span className='text-white text-2xl mt-4'>You</span>
                            </div>
                        )}
                        <span className='absolute top-4 left-4 bg-blue-600 dark:bg-blue-700 text-white text-xs px-4 py-2 rounded shadow'>You</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id='video-grid' className='video-grid flex flex-col gap-4 relative dark:bg-gray-950' style={{ minHeight: availableHeight }}>
            <div style={{ height: "100%", minHeight: gridHeight }}>
                {layouts.lg && layouts.lg.length > 0 && (
                    <ResponsiveGridLayout
                        className='layout'
                        layouts={layouts}
                        breakpoints={{
                            lg: 1200,
                            md: 996,
                            sm: 768,
                            xs: 480,
                            xxs: 0,
                        }}
                        cols={breakpointCols}
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
                        style={{
                            height: gridHeight,
                            maxHeight: gridHeight,
                        }}
                    >
                        {usersToShow.map(renderUserGridItem)}

                        {remainingUsers.length > 0 && selectedLayoutTemplate !== "spotlight" && (
                            <div key='remaining' className='participant-container h-full w-full'>
                                <div className='h-full w-full'>
                                    <div className='flex flex-col items-center justify-center h-full w-full bg-gray-900 dark:bg-gray-800 rounded-lg shadow-md'>
                                        <SharedAvatar userName='remaining-users' size='w-16 h-16' textSize='text-2xl'>
                                            <Users className='h-7 w-7' />
                                        </SharedAvatar>
                                        <span className='text-white mt-2'>+{remainingUsers.length} other users</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ResponsiveGridLayout>
                )}
            </div>
        </div>
    );
});

// Add display name for debugging
VideoGrid.displayName = "VideoGrid";
