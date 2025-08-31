import { useSocket } from "@/contexts/SocketContext";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ChevronRight, Lock } from "lucide-react";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import "@excalidraw/excalidraw/index.css";
import { useWhiteboardSync } from "@/hooks/use-whiteboard";
import { WhiteboardPermissionsDialog } from "./Dialogs/WhiteboardPermissionsDialog";

interface User {
    peerId: string;
    username?: string;
    isCreator?: boolean;
}

interface WhiteboardProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
    users: User[];
}

export const Whiteboard = React.memo(({ roomId, isOpen, onClose, users }: WhiteboardProps) => {
    // Use Socket Context at component level
    const { socket } = useSocket();

    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
    const [allowedUsers, setAllowedUsers] = useState<string[]>([]);

    const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null);
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const [sheetFullyOpen, setSheetFullyOpen] = useState(false);

    const isDraggingRef = useRef<boolean>(false);
    const canDrawRef = useRef<boolean>(false);
    const lastElementsCountRef = useRef<number>(0);
    const isReceivingRemoteUpdateRef = useRef<boolean>(false);

    // Memoize room data to prevent unnecessary re-renders
    const room = useSelector((state: any) => state.room);
    const { username: myName, isCreator } = useMemo(
        () => ({
            username: room.username,
            isCreator: room.isCreator,
        }),
        [room.username, room.isCreator]
    );

    // Memoize permission calculation
    const canDraw = useMemo(() => {
        return isCreator || (allowedUsers && allowedUsers.includes(myName));
    }, [isCreator, allowedUsers, myName]);

    // Memoized remote update callback
    const handleRemoteUpdate = useCallback((isReceiving: boolean) => {
        isReceivingRemoteUpdateRef.current = isReceiving;
    }, []);

    // Use the new hook for all whiteboard sync operations
    const { handlePointerUpdate, handleChange, handlePointerLeave, clearWhiteboard, updatePermissions, getPermissions } = useWhiteboardSync({
        isOpen,
        roomId,
        excalidrawAPI,
        canDraw,
        username: myName,
        onRemoteUpdate: handleRemoteUpdate,
    });

    // Memoize stable refs to prevent unnecessary hook re-runs
    const handleChangeRef = useRef(handleChange);
    const handlePointerUpdateRef = useRef(handlePointerUpdate);

    // Keep refs updated
    useEffect(() => {
        handleChangeRef.current = handleChange;
    }, [handleChange]);

    useEffect(() => {
        handlePointerUpdateRef.current = handlePointerUpdate;
    }, [handlePointerUpdate]);

    useEffect(() => {
        if (excalidrawAPI) {
            excalidrawRef.current = excalidrawAPI;

            // Load whiteboard data when API becomes available
            if (isOpen && socket?.connected) {
                socket.emit("whiteboard:get-data", { roomId });
            }
        }
    }, [excalidrawAPI, isOpen, socket, roomId]);

    useEffect(() => {
        canDrawRef.current = canDraw;
        if (excalidrawAPI) {
            excalidrawAPI.updateScene({
                appState: {
                    ...excalidrawAPI.getAppState(),
                    viewModeEnabled: !canDraw,
                },
            });
        }
    }, [canDraw, excalidrawAPI, isCreator, allowedUsers, myName]);

    useEffect(() => {
        if (!socket?.connected) {
            socket?.connect();
        }

        const onWhiteboardPermissions = (data: { allowed?: string[] } | any) => {
            // Handle various data formats
            let allowedArray: string[] = [];
            if (data && Array.isArray(data.allowed)) {
                allowedArray = data.allowed;
            } else if (Array.isArray(data)) {
                allowedArray = data;
            } else {
                allowedArray = [];
            }

            setAllowedUsers(allowedArray);
        };

        // Listen for both events for compatibility
        socket?.on("whiteboard:permissions", onWhiteboardPermissions);
        socket?.on("whiteboard:permissions-updated", onWhiteboardPermissions);

        return () => {
            socket?.off("whiteboard:permissions", onWhiteboardPermissions);
            socket?.off("whiteboard:permissions-updated", onWhiteboardPermissions);
        };
    }, [socket, allowedUsers, isCreator, myName]);

    useEffect(() => {
        if (isOpen && socket?.connected) {
            getPermissions();
        }
    }, [isOpen, roomId, socket, getPermissions]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setSheetFullyOpen(true);

                // Force load whiteboard data when sheet is fully open
                if (socket?.connected && excalidrawAPI) {
                    socket.emit("whiteboard:get-data", { roomId });
                }
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setSheetFullyOpen(false);
        }
    }, [isOpen, socket, excalidrawAPI, roomId]);

    // Memoized event handlers to prevent re-creating on every render
    const handlePointerDown = useCallback(() => {
        isDraggingRef.current = true;
    }, []);

    const handlePointerUp = useCallback(() => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;

            // Force sync after user finishes drawing action
            if (canDraw && excalidrawAPI) {
                const elements = excalidrawAPI.getSceneElements();
                const state = excalidrawAPI.getAppState();
                handleChangeRef.current([...elements], state);
            }
        }
    }, [canDraw, excalidrawAPI]);

    useEffect(() => {
        return () => {
            if (isOpen) {
                handlePointerLeave();
            }
        };
    }, [roomId, isOpen, handlePointerLeave]);

    // Memoize Excalidraw initial data to prevent recreation
    const excalidrawInitialData = useMemo(
        () => ({
            appState: {
                viewBackgroundColor: "#ffffff",
                currentItemStrokeColor: "#000000",
                collaborators: new Map(),
                viewModeEnabled: !canDraw,
            },
            scrollToContent: true,
        }),
        [canDraw]
    );

    // Memoize UI options to prevent recreation
    const excalidrawUIOptions = useMemo(
        () => ({
            canvasActions: {
                loadScene: false,
                saveToActiveFile: canDraw,
                export: false as const,
                clearCanvas: canDraw && isCreator,
                changeViewBackgroundColor: canDraw,
            },
            tools: {
                image: false,
            },
        }),
        [canDraw, isCreator]
    );

    // Memoized onChange handler
    const handleExcalidrawChange = useCallback(
        (elements: any[], state: any) => {
            // Don't sync if we're receiving a remote update
            if (isReceivingRemoteUpdateRef.current) {
                return;
            }

            // Only sync when user has permission
            if (!canDraw) {
                return;
            }

            // Always call handleChange - let the hook decide when to sync
            handleChangeRef.current([...elements], state);
        },
        [canDraw]
    );

    // Memoized API callback
    const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
        setExcalidrawAPI(api);
    }, []);

    const handleUpdatePermissions = useCallback(
        (newAllowedUsers: string[]) => {
            setAllowedUsers(newAllowedUsers);
            updatePermissions(newAllowedUsers);
            setIsPermissionsDialogOpen(false);
        },
        [updatePermissions, allowedUsers]
    );

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent className='sm:max-w-[800px] md:max-w-[1200px] w-full p-0' side='right' style={{ transition: "none" }}>
                    <SheetHeader className='p-4 border-b'>
                        <div className='flex justify-between items-center'>
                            <SheetTitle>WhiteBoard</SheetTitle>
                            <div className='flex items-center gap-2'>
                                {isCreator && (
                                    <Button variant='outline' size='sm' onClick={() => setIsPermissionsDialogOpen(true)}>
                                        <Lock className='h-4 w-4 mr-1' />
                                        Manage Drawing Permissions
                                    </Button>
                                )}
                                <Button variant='outline' size='icon' onClick={onClose}>
                                    <ChevronRight className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                        {!isCreator && !canDraw && (
                            <div className='text-yellow-600 bg-yellow-50 p-2 rounded-md mt-2'>
                                <span>You can only view this whiteboard. Only the room creator can draw or grant drawing permissions.</span>
                            </div>
                        )}
                    </SheetHeader>

                    <div
                        className='excalidraw-container'
                        style={{
                            height: "calc(100vh - 120px)",
                            width: "100%",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                touchAction: "none",
                            }}
                        >
                            {sheetFullyOpen && <Excalidraw key={`excalidraw-${roomId}`} onChange={handleExcalidrawChange} excalidrawAPI={handleExcalidrawAPI} initialData={excalidrawInitialData} onPointerUpdate={handlePointerUpdateRef.current} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} viewModeEnabled={!canDraw} zenModeEnabled={false} gridModeEnabled={false} theme='light' name='Whiteboard Session' UIOptions={excalidrawUIOptions} />}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <WhiteboardPermissionsDialog isOpen={isPermissionsDialogOpen} onClose={() => setIsPermissionsDialogOpen(false)} users={users || []} allowedUsers={allowedUsers} onUpdatePermissions={handleUpdatePermissions} />
        </>
    );
});
