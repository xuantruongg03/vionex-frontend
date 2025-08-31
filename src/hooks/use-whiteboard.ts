import { useEffect, useRef, useCallback, useMemo } from "react";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { toast } from "sonner";
import { throttle, debounce } from "lodash";
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

// Constants moved outside component to prevent recreation
const SYNC_THROTTLE_MS = 100;
const POINTER_THROTTLE_MS = 200;
const DRAWING_TIMEOUT_MS = 500;
const ELEMENT_AGE_THRESHOLD = 100;

export const useWhiteboardSync = ({ isOpen, roomId, excalidrawAPI, canDraw = false, onRemoteUpdate, username }: Props) => {
    const pointerDataRef = useRef<PointerData | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const pendingUpdateRef = useRef<{ elements: any[]; state: any } | null>(null);
    const lastVersionRef = useRef<number>(0);
    const lastElementsCountRef = useRef<number>(0);
    const lastPointsHashRef = useRef<string>("");
    const isDrawingRef = useRef<boolean>(false);
    const localElementsRef = useRef<any[]>([]);
    const drawingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSentVersionRef = useRef<number>(0);
    const lastAppliedUpdateRef = useRef<string>("");

    // Use Socket Context
    const { socket } = useSocket();

    // Memoized throttled functions to prevent recreation on every render
    const throttledEmitPointer = useMemo(
        () =>
            throttle((roomId: string, position: { x: number; y: number; tool: string }) => {
                if (socket?.connected) {
                    socket.emit("whiteboard:pointer", { roomId, position });
                }
            }, POINTER_THROTTLE_MS),
        [socket]
    );

    // Khởi tạo socket event listeners
    useEffect(() => {
        const handleUpdate = (data: any) => {
            if (!excalidrawAPI || !data.elements) return;

            // Don't apply our own updates back to ourselves
            if (data.fromUser && data.fromUser === username) {
                return;
            }

            // If user is currently drawing, don't apply remote updates
            // to avoid interrupting their drawing experience
            if (isDrawingRef.current) {
                return;
            }

            // Create a unique identifier for this update to prevent duplicates
            const updateId = `${data.version || Date.now()}-${data.elements?.length || 0}-${data.timestamp || ""}`;
            if (lastAppliedUpdateRef.current === updateId) {
                return;
            }
            // Mark this update as processed
            lastAppliedUpdateRef.current = updateId;

            // Notify component that we're receiving a remote update
            onRemoteUpdate?.(true);

            if (data.version) {
                lastVersionRef.current = Math.max(lastVersionRef.current, data.version);
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

                            if (!element.points || !Array.isArray(element.points)) {
                                return {
                                    ...element,
                                    points: [], // Empty points array
                                    pressures: [], // Add pressures array
                                    simulatePressure: true, // Enable pressure simulation
                                    // Add other required properties for freedraw
                                    strokeColor: element.strokeColor || "#000000",
                                    backgroundColor: element.backgroundColor || "transparent",
                                    fillStyle: element.fillStyle || "hachure",
                                    strokeWidth: element.strokeWidth || 1,
                                    strokeStyle: element.strokeStyle || "solid",
                                    roughness: element.roughness || 1,
                                    opacity: element.opacity || 100,
                                    seed: element.seed || Math.floor(Math.random() * 2 ** 31),
                                };
                            }
                            // Ensure pressures array exists for non-deleted elements
                            if (!element.pressures || !Array.isArray(element.pressures)) {
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
                            const hasValidStructure = element.points && Array.isArray(element.points);
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

            // Send pointer updates for all users to show cursors, not just those who can draw
            const currentTool = excalidrawAPI.getAppState().activeTool.type || "selection";
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
        [excalidrawAPI, roomId, throttledEmitPointer]
    );

    // Optimized send function with better performance
    const sendPendingUpdate = useCallback(() => {
        if (!pendingUpdateRef.current || !socket || !socket.connected) {
            return;
        }

        if (!canDraw) {
            return;
        }

        if (!username) {
            return;
        }

        const { elements, state } = pendingUpdateRef.current;

        const validElements =
            elements?.filter((element) => {
                if (element.type === "freedraw") {
                    // Include freedraw elements that have points array OR are deleted
                    const hasPoints = "points" in element && Array.isArray(element.points);
                    const isDeleted = element.isDeleted === true;
                    return hasPoints || isDeleted;
                }
                return true; // Include all other element types
            }) || [];

        // Don't send if no valid elements
        if (validElements.length === 0) {
            pendingUpdateRef.current = null;
            return;
        }

        // Skip if nothing meaningful changed - sử dụng hash đơn giản
        const elementsHash = validElements.map((el) => `${el.id}-${el.x}-${el.y}-${el.width}-${el.height}`).join(",");
        if (elementsHash === lastPointsHashRef.current) {
            pendingUpdateRef.current = null;
            return;
        }

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
                      currentItemBackgroundColor: state.currentItemBackgroundColor,
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

        // Update tracking refs
        lastPointsHashRef.current = elementsHash;
        lastUpdateRef.current = Date.now();
        lastSentVersionRef.current = lastVersionRef.current;
        // Xóa cập nhật đang chờ
        pendingUpdateRef.current = null;
    }, [roomId, socket, canDraw, username]);

    // Debounced sync function for performance optimization
    const debouncedSync = useMemo(
        () =>
            debounce(() => {
                if (pendingUpdateRef.current) {
                    sendPendingUpdate();
                }
            }, SYNC_THROTTLE_MS),
        [sendPendingUpdate]
    );

    // Optimized change handler with better performance
    const handleChange = useCallback(
        (elements: any[], state: any) => {
            if (!elements || !Array.isArray(elements)) return;

            // Only send updates if user has permission to draw
            if (!canDraw) {
                return;
            }

            // Store local elements immediately for responsive UI
            localElementsRef.current = [...elements];

            // Check if user is currently drawing or creating shapes
            const isCurrentlyDrawing = elements.some((element) => {
                if (element.type === "freedraw") {
                    // Check if this is an incomplete freedraw (still being drawn)
                    return element.points && element.points.length > 0 && !element.isDeleted && element.id && !element.endTimestamp;
                } else {
                    // For other shapes, check if they're being created recently
                    const now = Date.now();
                    const elementAge = now - (element.updated || element.created || 0);
                    return elementAge < ELEMENT_AGE_THRESHOLD;
                }
            });

            // Set drawing state and reset timeout
            if (isCurrentlyDrawing && !isDrawingRef.current) {
                isDrawingRef.current = true;
            }

            // Clear previous timeout
            if (drawingTimeoutRef.current) {
                clearTimeout(drawingTimeoutRef.current);
            }

            // Set timeout to detect when drawing stops
            if (isCurrentlyDrawing) {
                drawingTimeoutRef.current = setTimeout(() => {
                    isDrawingRef.current = false;

                    // Send final update when drawing stops - include deleted elements
                    const validElements = localElementsRef.current.filter((element) => {
                        if (element.type === "freedraw") {
                            // Include elements with points array OR deleted elements
                            return (element.points && Array.isArray(element.points)) || element.isDeleted;
                        }
                        return true;
                    });

                    if (validElements.length > 0) {
                        pendingUpdateRef.current = {
                            elements: [...validElements],
                            state,
                        };
                        sendPendingUpdate();
                    }
                }, DRAWING_TIMEOUT_MS);
            } else {
                isDrawingRef.current = false;
            }

            // Filter elements - include all elements (even deleted ones for sync purposes)
            const validElements = elements.filter((element) => {
                if (element.type === "freedraw") {
                    // Include freedraw elements that have points array OR are marked as deleted
                    return (element.points && Array.isArray(element.points)) || element.isDeleted;
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
                        const sampledPoints = el.points?.filter((_, index) => index % 5 === 0) || [];
                        return `${el.id}:${pointsCount}:${sampledPoints.length}:${isDeleted}`;
                    } else {
                        // For other element types (rectangle, circle, etc.), include key properties
                        const isDeleted = el.isDeleted ? "deleted" : "active";
                        const positionHash = `${Math.round(el.x || 0)},${Math.round(el.y || 0)}`;
                        const sizeHash = `${Math.round(el.width || 0)}x${Math.round(el.height || 0)}`;
                        return `${el.id}:${el.type}:${positionHash}:${sizeHash}:${isDeleted}`;
                    }
                })
                .join("|");

            // Check if drawing content has actually changed
            const hasContentChanged = currentHash !== lastPointsHashRef.current;
            const hasElementCountChanged = validElements.length !== lastElementsCountRef.current;

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
                } else {
                    // Use debounced sync for frequent updates
                    debouncedSync();
                }
            }
        },
        [sendPendingUpdate, canDraw, debouncedSync]
    );

    // Load whiteboard data when opening or when API becomes available
    useEffect(() => {
        if (isOpen && excalidrawAPI && socket && socket.connected) {
            socket.emit("whiteboard:get-data", { roomId });
        }
    }, [isOpen, roomId, socket, excalidrawAPI]);

    // Unified handler for whiteboard data - handles both initial load and subsequent updates
    useEffect(() => {
        if (!socket) return;

        const handleWhiteboardData = (data: any) => {
            if (!excalidrawAPI || !data.elements) {
                console.warn("[useWhiteboardSync] Missing excalidrawAPI or elements in data response");
                return;
            }

            try {
                // Parse state properly - handle both string and object
                let parsedState = {};
                if (data.state) {
                    if (typeof data.state === "string") {
                        parsedState = JSON.parse(data.state);
                    } else if (typeof data.state === "object") {
                        parsedState = data.state;
                    }
                }

                // Validate and fix elements before using them
                const validatedElements = data.elements
                    .map((element: any) => {
                        // Fix freedraw elements missing required properties
                        if (element.type === "freedraw") {
                            // If element is deleted, preserve it as-is for proper sync
                            if (element.isDeleted) {
                                return element;
                            }

                            if (!element.points || !Array.isArray(element.points)) {
                                return {
                                    ...element,
                                    points: [], // Empty points array
                                    pressures: [], // Add pressures array
                                    simulatePressure: true, // Enable pressure simulation
                                    // Add other required properties for freedraw
                                    strokeColor: element.strokeColor || "#000000",
                                    backgroundColor: element.backgroundColor || "transparent",
                                    fillStyle: element.fillStyle || "hachure",
                                    strokeWidth: element.strokeWidth || 1,
                                    strokeStyle: element.strokeStyle || "solid",
                                    roughness: element.roughness || 1,
                                    opacity: element.opacity || 100,
                                    seed: element.seed || Math.floor(Math.random() * 2 ** 31),
                                };
                            }
                            // Ensure pressures array exists for non-deleted elements
                            if (!element.pressures || !Array.isArray(element.pressures)) {
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
                        // Keep deleted elements for proper synchronization
                        if (element.isDeleted) {
                            return true;
                        }

                        // For freedraw elements, ensure they have valid structure
                        if (element.type === "freedraw") {
                            const hasValidStructure = element.points && Array.isArray(element.points);
                            return hasValidStructure;
                        }

                        // Keep all other element types
                        return true;
                    });

                // Load existing whiteboard data with merged state handling
                excalidrawAPI.updateScene({
                    elements: validatedElements,
                    appState: {
                        ...excalidrawAPI.getAppState(),
                        ...parsedState,
                        viewModeEnabled: !canDraw,
                        collaborators: new Map(),
                    },
                });

                // Update version tracking
                if (data.version) {
                    lastVersionRef.current = data.version;
                }

                // Update local elements ref when receiving valid remote data
                localElementsRef.current = [...validatedElements];
            } catch (error) {
                console.error("[useWhiteboardSync] Error loading whiteboard data:", error);
            }
        };

        socket.on("whiteboard:data", handleWhiteboardData);

        return () => {
            socket.off("whiteboard:data", handleWhiteboardData);
        };
    }, [socket, excalidrawAPI, canDraw]);

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
            if (!excalidrawAPI || !data.userId || !data.position) return;

            // Update collaborators to show pointer positions from other users
            const collaborators = new Map(excalidrawAPI.getAppState().collaborators);

            const color = getColorFromPeerId(data.userId);
            collaborators.set(data.userId, {
                username: data.userId,
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
            if (!excalidrawAPI || !data.userId) return;

            const collaborators = new Map(excalidrawAPI.getAppState().collaborators);
            collaborators.delete(data.userId);

            excalidrawAPI.updateScene({
                appState: {
                    ...excalidrawAPI.getAppState(),
                    collaborators,
                },
            });
        };

        const handleWhiteboardUpdated = (data: any) => {
            if (!excalidrawAPI || !data.elements) {
                console.warn("[useWhiteboardSync] Missing excalidrawAPI or elements");
                return;
            }

            // Check if this update is from the current user to avoid infinite loops
            if (data.fromUser === username) {
                console.log("[useWhiteboardSync] Ignoring self-update");
                return;
            }

            try {
                // Parse state properly - handle both string and object
                let parsedState = {};
                if (data.state) {
                    if (typeof data.state === "string") {
                        parsedState = JSON.parse(data.state);
                    } else if (typeof data.state === "object") {
                        parsedState = data.state;
                    }
                }

                // Update the whiteboard with received elements
                excalidrawAPI.updateScene({
                    elements: data.elements,
                    appState: {
                        ...excalidrawAPI.getAppState(),
                        ...parsedState,
                    },
                });

                // Update version tracking
                if (data.version) {
                    lastVersionRef.current = data.version;
                }

                // Call remote update callback
                onRemoteUpdate?.(true);
            } catch (error) {
                console.error("[useWhiteboardSync] Error applying remote update:", error);
            }
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

        socket.on("whiteboard:updated", handleWhiteboardUpdated);
        socket.on("whiteboard:pointer-update", handlePointerUpdate);
        socket.on("whiteboard:pointer-leave", handlePointerRemove);
        socket.on("whiteboard:cleared", handleWhiteboardCleared);
        socket.on("whiteboard:permissions-updated", handlePermissionsUpdated);

        return () => {
            socket.off("whiteboard:updated", handleWhiteboardUpdated);
            socket.off("whiteboard:pointer-update", handlePointerUpdate);
            socket.off("whiteboard:pointer-leave", handlePointerRemove);
            socket.off("whiteboard:cleared", handleWhiteboardCleared);
            socket.off("whiteboard:permissions-updated", handlePermissionsUpdated);
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

    // Add method to load existing whiteboard data
    const loadWhiteboardData = useCallback(() => {
        if (!socket || !socket.connected) return;
        socket.emit("whiteboard:get-data", { roomId });
    }, [socket, roomId]);

    // Load whiteboard data when component opens
    useEffect(() => {
        if (isOpen && socket && excalidrawAPI) {
            loadWhiteboardData();
        }
    }, [isOpen, socket, excalidrawAPI, loadWhiteboardData]);

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

    // Cleanup effect để clear timeout và cancel functions khi component unmount
    useEffect(() => {
        return () => {
            if (drawingTimeoutRef.current) {
                clearTimeout(drawingTimeoutRef.current);
            }
            // Cancel throttled and debounced functions
            throttledEmitPointer.cancel();
            debouncedSync.cancel();
        };
    }, [throttledEmitPointer, debouncedSync]);

    return {
        handlePointerUpdate,
        handleChange,
        handlePointerLeave,
        clearWhiteboard,
        updatePermissions,
        getPermissions,
        loadWhiteboardData,
    };
};
