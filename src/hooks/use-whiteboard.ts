import { useEffect, useRef, useCallback } from "react";
// import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
// import { toast } from "sonner";
// import { throttle } from "lodash";
// import { getSocket } from "./use-call-hybrid-new";

// type PointerData = {
//     pointer: { x: number; y: number; tool: string };
//     button: number;
//     pointersMap: any;
//     username: string;
//     userId: string;
// };

// interface Props {
//     isOpen: boolean;
//     roomId: string;
//     excalidrawAPI: ExcalidrawImperativeAPI | null;
//     canDraw?: boolean;
//     onRemoteUpdate?: () => void;
// }

// export const useWhiteboardSync = ({
//     isOpen,
//     roomId,
//     excalidrawAPI,
//     canDraw = false,
//     onRemoteUpdate,
// }: Props) => {
//     const pointerDataRef = useRef<PointerData | null>(null);
//     const lastUpdateRef = useRef<number>(0);
//     const pendingUpdateRef = useRef<{ elements: any[]; state: any } | null>(
//         null
//     );
//     const lastVersionRef = useRef<number>(0);
//     const lastElementsCountRef = useRef<number>(0);
//     const lastPointsHashRef = useRef<string>('');
//     const SYNC_THROTTLE_MS = 100; // Throttle sync để tránh spam

//     // Track drawing state and local elements
//     const isDrawingRef = useRef<boolean>(false);
//     const localElementsRef = useRef<any[]>([]);
//     const drawingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//     const lastSentVersionRef = useRef<number>(0);
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { toast } from "sonner";
import { throttle } from "lodash";
import { useSocket } from "@/contexts/SocketContext";

type PointerData = {
    pointer: { x: number; y: number; tool: string };
    button: number;
    pointersMap: any;
};

type Props = {
    isOpen: boolean;
    roomId: string;
    excalidrawAPI: ExcalidrawImperativeAPI | null;
    canDraw?: boolean; // Add permission check
    onRemoteUpdate?: (isReceiving: boolean) => void; // Callback for remote updates
    username?: string; // Add username for tracking updates
};

export const useWhiteboardSync = ({
    isOpen,
    roomId,
    excalidrawAPI,
    canDraw = false,
    onRemoteUpdate,
    username,
}: Props) => {
    // Debug canDraw changes
    useEffect(() => {
        console.log("🎨 [useWhiteboardSync] canDraw changed:", canDraw);
    }, [canDraw]);
    const pointerDataRef = useRef<PointerData | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const pendingUpdateRef = useRef<{ elements: any[]; state: any } | null>(
        null
    );
    const lastVersionRef = useRef<number>(0);
    const lastElementsCountRef = useRef<number>(0);
    const lastPointsHashRef = useRef<string>("");
    const isDrawingRef = useRef<boolean>(false);
    const localElementsRef = useRef<any[]>([]);
    const SYNC_THROTTLE_MS = 100; // Throttle sync để tránh spam

    const drawingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSentVersionRef = useRef<number>(0);

    // Use Socket Context
    const { socket } = useSocket();

    // Throttled pointer emission to prevent spamming server
    const throttledEmitPointer = useRef(
        throttle(
            (
                roomId: string,
                position: { x: number; y: number; tool: string }
            ) => {
                if (socket && socket.connected) {
                    socket.emit("whiteboard:pointer", { roomId, position });
                }
            },
            200
        ) // Emit max every 200ms
    ).current;

    // Track the last applied update to prevent duplicate processing
    const lastAppliedUpdateRef = useRef<string>("");

    // Khởi tạo socket event listeners
    useEffect(() => {
        const handleUpdate = (data: any) => {
            if (!excalidrawAPI || !data.elements) return;

            // Don't apply our own updates back to ourselves
            if (data.fromUser && data.fromUser === username) {
                console.log(
                    "🎨 [handleUpdate] Skipping own update from:",
                    data.fromUser
                );
                return;
            }

            // If user is currently drawing, don't apply remote updates
            // to avoid interrupting their drawing experience
            if (isDrawingRef.current) {
                console.log(
                    "🎨 [handleUpdate] Skipping remote update - user is drawing"
                );
                return;
            }

            // Create a unique identifier for this update to prevent duplicates
            const updateId = `${data.version || Date.now()}-${
                data.elements?.length || 0
            }-${data.timestamp || ""}`;
            if (lastAppliedUpdateRef.current === updateId) {
                console.log(
                    "🎨 [handleUpdate] Skipping duplicate update:",
                    updateId
                );
                return;
            }

            console.log("🎨 [handleUpdate] Applying remote update:", {
                elementsCount: data.elements?.length,
                version: data.version,
                fromUser: data.fromUser,
                myUsername: username,
                updateId,
            });

            // Mark this update as processed
            lastAppliedUpdateRef.current = updateId;

            // Notify component that we're receiving a remote update
            onRemoteUpdate?.(true);

            if (data.version) {
                lastVersionRef.current = Math.max(
                    lastVersionRef.current,
                    data.version
                );
            }

            try {
                // Validate and fix elements before using them
                const validatedElements = data.elements
                    .map((element: any) => {
                        // Fix freedraw elements missing required properties
                        if (element.type === "freedraw") {
                            // If element is deleted, preserve it as-is for proper sync
                            if (element.isDeleted) {
                                return element;
                            }

                            if (
                                !element.points ||
                                !Array.isArray(element.points)
                            ) {
                                return {
                                    ...element,
                                    points: [], // Empty points array
                                    pressures: [], // Add pressures array
                                    simulatePressure: true, // Enable pressure simulation
                                    // Add other required properties for freedraw
                                    strokeColor:
                                        element.strokeColor || "#000000",
                                    backgroundColor:
                                        element.backgroundColor ||
                                        "transparent",
                                    fillStyle: element.fillStyle || "hachure",
                                    strokeWidth: element.strokeWidth || 1,
                                    strokeStyle: element.strokeStyle || "solid",
                                    roughness: element.roughness || 1,
                                    opacity: element.opacity || 100,
                                    seed:
                                        element.seed ||
                                        Math.floor(Math.random() * 2 ** 31),
                                };
                            }
                            // Ensure pressures array exists for non-deleted elements
                            if (
                                !element.pressures ||
                                !Array.isArray(element.pressures)
                            ) {
                                return {
                                    ...element,
                                    pressures: element.points.map(() => 0.5), // Default pressure
                                    simulatePressure: true,
                                };
                            }
                        }
                        return element;
                    })
                    .filter((element) => {
                        // Don't filter out deleted elements - they're needed for sync
                        if (element.type === "freedraw") {
                            // Keep deleted elements for proper synchronization
                            if (element.isDeleted) {
                                return true;
                            }
                            // Include all freedraw elements that have a valid points array structure
                            const hasValidStructure =
                                element.points && Array.isArray(element.points);
                            if (!hasValidStructure) {
                                return false;
                            }
                            // Accept elements even with 0 points (drawing in progress)
                            return true;
                        }
                        return true;
                    });

                const appState = {
                    ...excalidrawAPI.getAppState(),
                    ...(data.state || {}),
                    // Keep the current viewModeEnabled from component permission logic
                    viewModeEnabled: !canDraw,
                    collaborators: new Map(),
                };

                excalidrawAPI.updateScene({
                    elements: validatedElements,
                    appState,
                });

                // Update local elements ref when receiving valid remote data
                if (!isDrawingRef.current) {
                    localElementsRef.current = [...validatedElements];
                }

                // Notify component that remote update is complete
                setTimeout(() => {
                    onRemoteUpdate?.(false);
                    console.log("🎨 [handleUpdate] Remote update complete");
                }, 200); // Increased timeout to ensure onChange doesn't trigger sync
            } catch (err) {
                console.error("Error applying whiteboard update:", err);
                onRemoteUpdate?.(false);
            }
        };

        socket.on("whiteboard:update", handleUpdate);

        return () => {
            socket.off("whiteboard:update", handleUpdate);
        };
    }, [socket, excalidrawAPI, onRemoteUpdate, canDraw, username]);

    // Gửi dữ liệu khi di chuyển chuột với throttle
    const handlePointerUpdate = useCallback(
        (payload: any) => {
            if (!excalidrawAPI || !socket || !socket.connected) return;

            // Only send pointer updates if user has permission to draw
            if (!canDraw) {
                return;
            }

            const currentTool =
                excalidrawAPI.getAppState().activeTool.type || "selection";
            const position = {
                x: payload.pointer.x,
                y: payload.pointer.y,
                tool: currentTool,
            };

            pointerDataRef.current = {
                pointer: position,
                button: payload.button,
                pointersMap: payload.pointersMap,
            };

            // Use throttled emission to prevent spamming
            throttledEmitPointer(roomId, position);
        },
        [excalidrawAPI, roomId, throttledEmitPointer, canDraw]
    );

    // Gửi cập nhật đã lên lịch
    const sendPendingUpdate = useCallback(() => {
        console.log("🎨 [sendPendingUpdate] Called with:", {
            hasPending: !!pendingUpdateRef.current,
            hasSocket: !!socket,
            isConnected: socket?.connected,
            canDraw,
            username,
        });

        if (!pendingUpdateRef.current || !socket || !socket.connected) {
            console.log(
                "🎨 [sendPendingUpdate] Early return - missing requirements"
            );
            return;
        }

        if (!canDraw) {
            console.log(
                "🎨 [sendPendingUpdate] Early return - no draw permission"
            );
            return;
        }

        if (!username) {
            console.log("🎨 [sendPendingUpdate] Early return - no username");
            return;
        }

        const { elements, state } = pendingUpdateRef.current;

        console.log("🎨 [sendPendingUpdate] Raw elements:", {
            elementsCount: elements?.length || 0,
            sampleElement: elements?.[0],
        });

        // Validate elements before sending - include deleted elements for sync
        const validElements =
            elements?.filter((element) => {
                if (element.type === "freedraw") {
                    // Include freedraw elements that have points array OR are deleted
                    const hasPoints =
                        "points" in element && Array.isArray(element.points);
                    const isDeleted = element.isDeleted === true;
                    return hasPoints || isDeleted;
                }
                return true; // Include all other element types
            }) || [];

        // Don't send if no valid elements
        if (validElements.length === 0) {
            console.log("🎨 [sendPendingUpdate] No valid elements to send");
            pendingUpdateRef.current = null;
            return;
        }

        console.log("🎨 [sendPendingUpdate] Sending valid elements:", {
            validElementsCount: validElements.length,
            sampleValid: validElements[0],
            fromUser: username,
            roomId,
        });

        // Tăng phiên bản mỗi khi gửi cập nhật
        lastVersionRef.current++;
        const version = lastVersionRef.current;

        socket.emit("whiteboard:update", {
            roomId,
            elements: validElements,
            state: state
                ? {
                      viewBackgroundColor: state.viewBackgroundColor,
                      currentItemStrokeColor: state.currentItemStrokeColor,
                      currentItemBackgroundColor:
                          state.currentItemBackgroundColor,
                      currentItemFillStyle: state.currentItemFillStyle,
                      currentItemStrokeWidth: state.currentItemStrokeWidth,
                      currentItemRoughness: state.currentItemRoughness,
                      currentItemOpacity: state.currentItemOpacity,
                      currentItemFontFamily: state.currentItemFontFamily,
                      currentItemFontSize: state.currentItemFontSize,
                      currentItemTextAlign: state.currentItemTextAlign,
                      currentItemStrokeStyle: state.currentItemStrokeStyle,
                  }
                : {},
            version,
            timestamp: Date.now(),
            fromUser: username, // Add user tracking
        });

        console.log(
            "🎨 [sendPendingUpdate] Successfully emitted whiteboard:update"
        );

        // Xóa cập nhật đang chờ
        pendingUpdateRef.current = null;
    }, [roomId, socket, canDraw, username]);

    const handleChange = useCallback(
        (elements: any[], state: any) => {
            if (!elements || !Array.isArray(elements)) return;

            // Only send updates if user has permission to draw
            if (!canDraw) {
                console.log("🎨 [handleChange] Skipping - no draw permission");
                return;
            }

            console.log("🎨 [handleChange] Processing local change:", {
                elementsCount: elements.length,
                canDraw,
            });

            // Store local elements immediately for responsive UI
            localElementsRef.current = [...elements];

            // Check if user is currently drawing or creating shapes
            const isCurrentlyDrawing = elements.some((element) => {
                if (element.type === "freedraw") {
                    // Check if this is an incomplete freedraw (still being drawn)
                    return (
                        element.points &&
                        element.points.length > 0 &&
                        !element.isDeleted &&
                        element.id &&
                        !element.endTimestamp
                    );
                } else {
                    // For other shapes (rectangle, circle, arrow, etc.), check if they're being created
                    // Elements are considered "being drawn" if they're very new (created in last 100ms)
                    const now = Date.now();
                    const elementAge =
                        now - (element.updated || element.created || 0);
                    return elementAge < 100; // Element is very new, likely being created
                }
            });

            // Set drawing state and reset timeout
            if (isCurrentlyDrawing && !isDrawingRef.current) {
                isDrawingRef.current = true;
                console.log("User started drawing");
            }

            // Clear previous timeout
            if (drawingTimeoutRef.current) {
                clearTimeout(drawingTimeoutRef.current);
            }

            // Set timeout to detect when drawing stops
            if (isCurrentlyDrawing) {
                drawingTimeoutRef.current = setTimeout(() => {
                    isDrawingRef.current = false;
                    console.log("User stopped drawing");

                    // Send final update when drawing stops - include deleted elements
                    const validElements = localElementsRef.current.filter(
                        (element) => {
                            if (element.type === "freedraw") {
                                // Include elements with points array OR deleted elements
                                return (
                                    (element.points &&
                                        Array.isArray(element.points)) ||
                                    element.isDeleted
                                );
                            }
                            return true;
                        }
                    );

                    if (validElements.length > 0) {
                        pendingUpdateRef.current = {
                            elements: [...validElements],
                            state,
                        };
                        sendPendingUpdate();
                    }
                }, 500); // 500ms after last change
            } else {
                isDrawingRef.current = false;
            }

            // Filter elements - include all elements (even deleted ones for sync purposes)
            const validElements = elements.filter((element) => {
                if (element.type === "freedraw") {
                    // Include freedraw elements that have points array OR are marked as deleted
                    return (
                        (element.points && Array.isArray(element.points)) ||
                        element.isDeleted
                    );
                }
                return true; // Include all other element types (rectangle, circle, etc.)
            });

            // Generate a hash that includes deletion state and element properties to detect meaningful changes
            const currentHash = validElements
                .map((el) => {
                    if (el.type === "freedraw") {
                        const pointsCount = el.points?.length || 0;
                        // Include deletion state in hash
                        const isDeleted = el.isDeleted ? "deleted" : "active";
                        // Only hash every 5th point to reduce sensitivity
                        const sampledPoints =
                            el.points?.filter((_, index) => index % 5 === 0) ||
                            [];
                        return `${el.id}:${pointsCount}:${sampledPoints.length}:${isDeleted}`;
                    } else {
                        // For other element types (rectangle, circle, etc.), include key properties
                        const isDeleted = el.isDeleted ? "deleted" : "active";
                        const positionHash = `${Math.round(
                            el.x || 0
                        )},${Math.round(el.y || 0)}`;
                        const sizeHash = `${Math.round(
                            el.width || 0
                        )}x${Math.round(el.height || 0)}`;
                        return `${el.id}:${el.type}:${positionHash}:${sizeHash}:${isDeleted}`;
                    }
                })
                .join("|");

            // Check if drawing content has actually changed
            const hasContentChanged = currentHash !== lastPointsHashRef.current;
            const hasElementCountChanged =
                validElements.length !== lastElementsCountRef.current;

            if (!hasContentChanged && !hasElementCountChanged) {
                // No meaningful changes detected
                return;
            }

            // Update tracking refs
            lastPointsHashRef.current = currentHash;
            lastElementsCountRef.current = validElements.length;

            // Sync immediately if not currently drawing (for completed elements)
            // Or if elements array is empty (clearing/deletion)
            if (!isCurrentlyDrawing || validElements.length === 0) {
                pendingUpdateRef.current = {
                    elements: [...validElements],
                    state,
                };

                // Throttle sync to prevent too many updates
                const now = Date.now();
                if (now - lastUpdateRef.current >= SYNC_THROTTLE_MS) {
                    lastUpdateRef.current = now;
                    sendPendingUpdate();
                }
            }
        },
        [sendPendingUpdate, canDraw, roomId, username]
    );

    // Load whiteboard data when opening or when API becomes available
    useEffect(() => {
        if (isOpen && excalidrawAPI && socket && socket.connected) {
            socket.emit("whiteboard:get-data", { roomId });
        }
    }, [isOpen, roomId, socket, excalidrawAPI]);

    useEffect(() => {
        if (!excalidrawAPI || !socket) return;

        const handleWhiteboardData = (data: any) => {
            if (!data.elements || !excalidrawAPI) return;

            // If user is currently drawing, don't apply remote updates
            // to avoid interrupting their drawing experience
            if (isDrawingRef.current) {
                console.log(
                    "🎨 [handleWhiteboardData] Skipping - user is drawing"
                );
                return;
            }

            console.log(
                "🎨 [handleWhiteboardData] Loading initial whiteboard data:",
                {
                    elementsCount: data.elements?.length,
                    version: data.version,
                }
            );

            if (data.version) {
                lastVersionRef.current = data.version;
            }

            if (data.elements && Array.isArray(data.elements)) {
                try {
                    // Validate and fix elements before using them
                    const validatedElements = data.elements
                        .map((element: any) => {
                            // Fix freedraw elements missing required properties
                            if (element.type === "freedraw") {
                                // If element is deleted, preserve it as-is for proper sync
                                if (element.isDeleted) {
                                    return element;
                                }

                                if (
                                    !element.points ||
                                    !Array.isArray(element.points)
                                ) {
                                    return {
                                        ...element,
                                        points: [], // Empty points array
                                        pressures: [], // Add pressures array
                                        simulatePressure: true, // Enable pressure simulation
                                        // Add other required properties for freedraw
                                        strokeColor:
                                            element.strokeColor || "#000000",
                                        backgroundColor:
                                            element.backgroundColor ||
                                            "transparent",
                                        fillStyle:
                                            element.fillStyle || "hachure",
                                        strokeWidth: element.strokeWidth || 1,
                                        strokeStyle:
                                            element.strokeStyle || "solid",
                                        roughness: element.roughness || 1,
                                        opacity: element.opacity || 100,
                                        seed:
                                            element.seed ||
                                            Math.floor(Math.random() * 2 ** 31),
                                    };
                                }
                                // Ensure pressures array exists for non-deleted elements
                                if (
                                    !element.pressures ||
                                    !Array.isArray(element.pressures)
                                ) {
                                    return {
                                        ...element,
                                        pressures: element.points.map(
                                            () => 0.5
                                        ), // Default pressure
                                        simulatePressure: true,
                                    };
                                }
                            }
                            return element;
                        })
                        .filter((element) => {
                            // Don't filter out deleted elements - they're needed for sync
                            if (element.type === "freedraw") {
                                // Keep deleted elements for proper synchronization
                                if (element.isDeleted) {
                                    return true;
                                }
                                // Include freedraw elements that have points array
                                const hasValidStructure =
                                    element.points &&
                                    Array.isArray(element.points);
                                if (!hasValidStructure) {
                                    return false;
                                }
                                // Accept elements even with 0 points for real-time sync
                                return true;
                            }
                            return true;
                        });

                    const appState = {
                        ...excalidrawAPI.getAppState(),
                        ...(data.state || {}),
                        viewModeEnabled: !canDraw,
                        collaborators: new Map(),
                    };

                    excalidrawAPI.updateScene({
                        elements: validatedElements,
                        appState,
                    });

                    // Update local elements ref when receiving valid remote data
                    if (!isDrawingRef.current) {
                        localElementsRef.current = [...validatedElements];
                    }

                    // Clear the applying remote update flag after a delay
                    setTimeout(() => {
                        console.log(
                            "🎨 [handleWhiteboardData] Initial data load complete"
                        );
                    }, 200);
                } catch (err) {
                    console.error("Error updating initial scene:", err);
                }
            }
        };

        socket.on("whiteboard:data", handleWhiteboardData);

        return () => {
            socket.off("whiteboard:data", handleWhiteboardData);
        };
    }, [socket, excalidrawAPI]);

    useEffect(() => {
        if (isOpen && socket) {
            socket.on("whiteboard:error", (data: any) => {
                toast.error(data.message);
            });

            return () => {
                socket.off("whiteboard:error");
            };
        }
    }, [isOpen, roomId, socket]);

    // Add essential event handlers
    useEffect(() => {
        if (!socket) return;

        const handlePointerUpdate = (data: any) => {
            // Handle other users' pointer updates to show their cursors
            if (!excalidrawAPI || !data.peerId || !data.position) return;

            // Update collaborators to show pointer positions from other users
            const collaborators = new Map(
                excalidrawAPI.getAppState().collaborators
            );

            const color = getColorFromPeerId(data.peerId);
            collaborators.set(data.peerId, {
                username: data.peerId,
                pointer: data.position,
                selectedElementIds: {},
                button: "up",
                color: {
                    background: color,
                    stroke: color,
                },
            });

            excalidrawAPI.updateScene({
                appState: {
                    ...excalidrawAPI.getAppState(),
                    collaborators,
                },
            });
        };

        const handlePointerRemove = (data: any) => {
            // Remove pointer when user leaves or stops interacting
            if (!excalidrawAPI || !data.peerId) return;

            const collaborators = new Map(
                excalidrawAPI.getAppState().collaborators
            );
            collaborators.delete(data.peerId);

            excalidrawAPI.updateScene({
                appState: {
                    ...excalidrawAPI.getAppState(),
                    collaborators,
                },
            });
        };

        const handleWhiteboardCleared = () => {
            if (!excalidrawAPI) return;

            try {
                excalidrawAPI.updateScene({
                    elements: [],
                    appState: {
                        ...excalidrawAPI.getAppState(),
                        collaborators: new Map(),
                    },
                });
                toast.success("Whiteboard cleared");
            } catch (err) {
                console.error("Error clearing whiteboard:", err);
            }
        };

        const handlePermissionsUpdated = (data: any) => {
            // You might want to update UI to show permission status
        };

        // Helper function to generate color for each user
        const getColorFromPeerId = (peerId: string) => {
            let hash = 0;
            for (let i = 0; i < peerId.length; i++) {
                hash = peerId.charCodeAt(i) + ((hash << 5) - hash);
            }
            const h = Math.abs(hash) % 360;
            return `hsl(${h}, 80%, 60%)`;
        };

        socket.on("whiteboard:pointer-update", handlePointerUpdate);
        socket.on("whiteboard:pointer-remove", handlePointerRemove);
        socket.on("whiteboard:cleared", handleWhiteboardCleared);
        socket.on("whiteboard:permissions-updated", handlePermissionsUpdated);

        return () => {
            socket.off("whiteboard:pointer-update", handlePointerUpdate);
            socket.off("whiteboard:pointer-remove", handlePointerRemove);
            socket.off("whiteboard:cleared", handleWhiteboardCleared);
            socket.off(
                "whiteboard:permissions-updated",
                handlePermissionsUpdated
            );
        };
    }, [socket, excalidrawAPI]);

    // Handle pointer leave when user stops interacting
    const handlePointerLeave = useCallback(() => {
        if (!socket || !socket.connected) return;

        socket.emit("whiteboard:pointer-leave", { roomId });
        // Cancel any pending throttled calls
        throttledEmitPointer.cancel();
    }, [socket, roomId, throttledEmitPointer]);

    // Cleanup throttled function on unmount
    useEffect(() => {
        return () => {
            throttledEmitPointer.cancel();
        };
    }, [throttledEmitPointer]);

    // Add method to clear whiteboard
    const clearWhiteboard = useCallback(() => {
        if (!socket || !socket.connected) return;

        socket.emit("whiteboard:clear", { roomId });
    }, [socket, roomId]);

    // Add method to update permissions
    const updatePermissions = useCallback(
        (allowedUsers: string[]) => {
            if (!socket || !socket.connected) return;

            socket.emit("whiteboard:update-permissions", {
                roomId,
                allowed: allowedUsers,
            });
        },
        [socket, roomId]
    );

    // Add method to get current permissions
    const getPermissions = useCallback(() => {
        if (!socket || !socket.connected) return;

        socket.emit("whiteboard:get-permissions", { roomId });
    }, [socket, roomId]);

    // Cleanup effect để clear timeout khi component unmount
    useEffect(() => {
        return () => {
            if (drawingTimeoutRef.current) {
                clearTimeout(drawingTimeoutRef.current);
            }
        };
    }, []);

    return {
        handlePointerUpdate,
        handleChange,
        handlePointerLeave,
        clearWhiteboard,
        updatePermissions,
        getPermissions,
    };
};
