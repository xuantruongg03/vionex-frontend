import { getSocket } from "@/hooks/use-call-hybrid-new";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ChevronRight, Lock } from "lucide-react";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { Button } from "./ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "./ui/sheet";
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

export const Whiteboard = React.memo(
    ({ roomId, isOpen, onClose, users }: WhiteboardProps) => {
        console.log("🎨 [Whiteboard] Received props:", {
            roomId,
            isOpen,
            users: users?.length || 0,
            usersData: users,
        });

        const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] =
            useState(false);
        const [allowedUsers, setAllowedUsers] = useState<string[]>([]);

        const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null);
        const [excalidrawAPI, setExcalidrawAPI] =
            useState<ExcalidrawImperativeAPI | null>(null);
        const [sheetFullyOpen, setSheetFullyOpen] = useState(false);

        const isDraggingRef = useRef<boolean>(false);
        const canDrawRef = useRef<boolean>(false);
        const lastElementsCountRef = useRef<number>(0);
        const isReceivingRemoteUpdateRef = useRef<boolean>(false);

        // Calculate permission
        const room = useSelector((state: any) => state.room);
        const myName = room.username;
        const isCreator = room.isCreator;
        const canDraw =
            isCreator || (allowedUsers && allowedUsers.includes(myName));

        // Debug permission changes
        useEffect(() => {
            console.log("🎨 [Whiteboard] Permission calculation:", {
                myName,
                isCreator,
                allowedUsers: allowedUsers || [],
                canDraw,
                isInAllowedUsers: allowedUsers
                    ? allowedUsers.includes(myName)
                    : false,
                calculationBreakdown: {
                    creatorCheck: isCreator,
                    allowedCheck: allowedUsers && allowedUsers.includes(myName),
                    finalCanDraw:
                        isCreator ||
                        (allowedUsers && allowedUsers.includes(myName)),
                },
                roomDebug: {
                    roomId: room.roomId,
                    username: room.username,
                    isCreator: room.isCreator,
                    fullRoom: room,
                },
            });
            console.log("🎨 [Whiteboard] Button visibility:", {
                shouldShowPermissionButton: isCreator,
                roomData: room,
            });
        }, [myName, isCreator, allowedUsers, canDraw, room]);

        // Use the new hook for all whiteboard sync operations
        const {
            handlePointerUpdate,
            handleChange,
            handlePointerLeave,
            clearWhiteboard,
            updatePermissions,
            getPermissions,
        } = useWhiteboardSync({
            isOpen,
            roomId,
            excalidrawAPI,
            canDraw,
            username: myName,
            onRemoteUpdate: (isReceiving) => {
                isReceivingRemoteUpdateRef.current = isReceiving;
            },
        });

        // Get socket for direct event handling where needed
        const socket = getSocket();

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
            }
        }, [excalidrawAPI]);

        // Remove syncAfterUserAction - now handled by onPointerUp
        // useEffect(() => {
        //     if (!excalidrawAPI) return;
        //     const syncAfterUserAction = () => { ... };
        //     const container = document.querySelector(".excalidraw-container");
        //     if (container) { ... }
        // }, [excalidrawAPI, canDraw]);

        useEffect(() => {
            canDrawRef.current = canDraw;
            if (excalidrawAPI) {
                console.log(
                    "🎨 [Whiteboard] Setting viewModeEnabled to:",
                    !canDraw,
                    {
                        canDraw,
                        isCreator,
                        allowedUsers,
                        myName,
                    }
                );
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

            const onWhiteboardPermissions = (
                data: { allowed?: string[] } | any
            ) => {
                console.log(
                    "🎨 [Whiteboard] Received permissions update:",
                    data
                );
                console.log("🎨 [Whiteboard] Current state before update:", {
                    currentAllowedUsers: allowedUsers,
                    isCreator,
                    myName,
                    canDrawBefore:
                        isCreator ||
                        (allowedUsers && allowedUsers.includes(myName)),
                });

                // Handle various data formats
                let allowedArray: string[] = [];
                if (data && Array.isArray(data.allowed)) {
                    allowedArray = data.allowed;
                } else if (Array.isArray(data)) {
                    allowedArray = data;
                } else {
                    console.warn(
                        "🎨 [Whiteboard] Invalid permissions data format:",
                        data
                    );
                    allowedArray = [];
                }

                console.log(
                    "🎨 [Whiteboard] Will set allowedUsers to:",
                    allowedArray
                );
                console.log("🎨 [Whiteboard] After update canDraw will be:", {
                    isCreator,
                    willBeInAllowed: allowedArray.includes(myName),
                    finalCanDraw: isCreator || allowedArray.includes(myName),
                });

                setAllowedUsers(allowedArray);
            };

            // Listen for both events for compatibility
            socket?.on("whiteboard:permissions", onWhiteboardPermissions);
            socket?.on(
                "whiteboard:permissions-updated",
                onWhiteboardPermissions
            );

            return () => {
                socket?.off("whiteboard:permissions", onWhiteboardPermissions);
                socket?.off(
                    "whiteboard:permissions-updated",
                    onWhiteboardPermissions
                );
            };
        }, [socket]);

        useEffect(() => {
            if (isOpen && socket?.connected) {
                getPermissions();
            }
        }, [isOpen, roomId, socket, getPermissions]);

        useEffect(() => {
            if (isOpen) {
                const timer = setTimeout(() => {
                    setSheetFullyOpen(true);
                }, 300);
                return () => clearTimeout(timer);
            } else {
                setSheetFullyOpen(false);
            }
        }, [isOpen]);

        // Remove duplicate pointer handling - now handled by hook
        // useEffect(() => {
        //     if (!excalidrawAPI || !socket) return;
        //     const handleRemotePointers = (data: any) => { ... }
        //     socket.on("whiteboard:pointers", handleRemotePointers);
        //     return () => { socket.off("whiteboard:pointers", handleRemotePointers); };
        // }, [excalidrawAPI, users, myName, socket]);

        // Tool change detection is now handled in useWhiteboardSync hook
        // when handlePointerUpdate is called

        const handlePointerDown = () => {
            isDraggingRef.current = true;
        };

        const handlePointerUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;

                // Force sync after user finishes drawing action
                if (canDraw && excalidrawAPI) {
                    const elements = excalidrawAPI.getSceneElements();
                    const state = excalidrawAPI.getAppState();
                    handleChangeRef.current([...elements], state);
                }
            }
        };

        useEffect(() => {
            return () => {
                if (isOpen) {
                    handlePointerLeave();
                }
            };
        }, [roomId, isOpen, handlePointerLeave]);

        // The whiteboard data loading is now handled by the useWhiteboardSync hook
        // when isOpen changes, so we don't need this effect anymore

        const handleUpdatePermissions = useCallback(
            (newAllowedUsers: string[]) => {
                console.log("🎨 [Whiteboard] Updating permissions:", {
                    newAllowedUsers,
                    currentAllowedUsers: allowedUsers,
                });
                setAllowedUsers(newAllowedUsers);
                updatePermissions(newAllowedUsers);
                setIsPermissionsDialogOpen(false);
            },
            [updatePermissions, allowedUsers]
        );

        return (
            <>
                <Sheet open={isOpen} onOpenChange={onClose}>
                    <SheetContent
                        className="sm:max-w-[800px] md:max-w-[1200px] w-full p-0"
                        side="right"
                        style={{ transition: "none" }}
                    >
                        <SheetHeader className="p-4 border-b">
                            <div className="flex justify-between items-center">
                                <SheetTitle>Bảng trắng</SheetTitle>
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        console.log(
                                            "🎨 [Whiteboard] Button render check:",
                                            {
                                                isCreator,
                                                shouldShow: isCreator,
                                                roomData: room,
                                            }
                                        );
                                        return (
                                            isCreator && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setIsPermissionsDialogOpen(
                                                            true
                                                        )
                                                    }
                                                >
                                                    <Lock className="h-4 w-4 mr-1" />
                                                    Quản lý quyền vẽ
                                                </Button>
                                            )
                                        );
                                    })()}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={onClose}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <SheetDescription>
                                {!isCreator && !canDraw && (
                                    <div className="text-yellow-600 bg-yellow-50 p-2 rounded-md mt-2">
                                        <span>
                                            Bạn chỉ có thể xem bảng trắng này.
                                            Chỉ chủ phòng mới có thể vẽ hoặc cấp
                                            quyền vẽ.
                                        </span>
                                    </div>
                                )}
                            </SheetDescription>
                        </SheetHeader>

                        <div
                            className="excalidraw-container"
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
                                {sheetFullyOpen && (
                                    <Excalidraw
                                        key={`excalidraw-${roomId}`}
                                        onChange={(elements, state) => {
                                            // Don't sync if we're receiving a remote update
                                            if (
                                                isReceivingRemoteUpdateRef.current
                                            ) {
                                                return;
                                            }

                                            // Only sync when user has permission
                                            if (!canDraw) {
                                                return;
                                            }

                                            // Always call handleChange - let the hook decide when to sync
                                            handleChangeRef.current(
                                                [...elements],
                                                state
                                            );
                                        }}
                                        excalidrawAPI={(api) => {
                                            setExcalidrawAPI(api);
                                        }}
                                        initialData={{
                                            appState: {
                                                viewBackgroundColor: "#ffffff",
                                                currentItemStrokeColor:
                                                    "#000000",
                                                collaborators: new Map(),
                                                viewModeEnabled: !canDraw,
                                            },
                                            scrollToContent: true,
                                        }}
                                        onPointerUpdate={(payload) => {
                                            handlePointerUpdateRef.current(
                                                payload
                                            );
                                        }}
                                        onPointerDown={handlePointerDown}
                                        onPointerUp={handlePointerUp}
                                        viewModeEnabled={!canDraw}
                                        zenModeEnabled={false}
                                        gridModeEnabled={false}
                                        theme="light"
                                        name="Whiteboard Session"
                                        UIOptions={{
                                            canvasActions: {
                                                loadScene: false,
                                                saveToActiveFile: canDraw,
                                                export: false,
                                                clearCanvas:
                                                    canDraw && isCreator,
                                                changeViewBackgroundColor:
                                                    canDraw,
                                            },
                                            tools: {
                                                image: false,
                                            },
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                {isPermissionsDialogOpen && (
                    <WhiteboardPermissionsDialog
                        isOpen={isPermissionsDialogOpen}
                        onClose={() => setIsPermissionsDialogOpen(false)}
                        users={users || []}
                        allowedUsers={allowedUsers}
                        onUpdatePermissions={handleUpdatePermissions}
                    />
                )}
            </>
        );
    }
);
