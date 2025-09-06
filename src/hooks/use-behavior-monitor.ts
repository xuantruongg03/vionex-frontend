import { useSocket } from "@/contexts/SocketContext";
import { ActionLogType } from "@/interfaces/action";
import { TypeUserEvent } from "@/interfaces/behavior";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import useDetectEye from "./use-detect-eye";

interface BehaviorMonitorProps {
    roomId: string;
    isExamMode?: boolean;
    activeQuiz?: any;
}

export default function useBehaviorMonitor({
    roomId,
    isExamMode = false,
    activeQuiz = null,
}: BehaviorMonitorProps) {
    const dispatch = useDispatch();
    const { socket: sfuSocket } = useSocket();

    // Determine if user is taking quiz (not just quiz exists)
    const isUserTakingQuiz =
        isExamMode && activeQuiz && !activeQuiz.isCompleted;
    const examModeActive = isUserTakingQuiz;

    const { isLookingAtScreen, isInitialized, hasCamera } =
        useDetectEye(examModeActive);
    // const interval = useRef<NodeJS.Timeout | null>(null);
    const logSendInterval = useRef<NodeJS.Timeout | null>(null);
    const room = useSelector((state: any) => state.room);
    const log = useSelector((state: any) => state.log);
    const { isMonitorActive, eventLog } = log;
    const { username, isCreator } = room;
    const eventListenersRegistered = useRef(false);
    const requestLogThrottleRef = useRef<NodeJS.Timeout | null>(null);
    const lastRequestTimeRef = useRef(0);

    const sendLogsToServer = useCallback(async () => {
        if (eventLog && eventLog.length > 0 && username && roomId) {
            try {
                sfuSocket.emit("sfu:send-behavior-logs", {
                    peerId: username,
                    roomId,
                    behaviorLogs: eventLog,
                });
                dispatch({ type: ActionLogType.RESET_EVENT_LOG, payload: [] });
                return true;
            } catch (error) {
                console.error("Failed to send behavior logs:", error);
                return false;
            }
        }
        return true;
    }, [eventLog, username, roomId, dispatch]);

    const throttledSendLogs = useCallback(() => {
        // const now = Date.now();
        // if (now - lastRequestTimeRef.current > 5000) {
        //     lastRequestTimeRef.current = now;
        //     sendLogsToServer();
        // } else if (!requestLogThrottleRef.current) {
        //     requestLogThrottleRef.current = setTimeout(() => {
        //         lastRequestTimeRef.current = Date.now();
        //         sendLogsToServer();
        //         requestLogThrottleRef.current = null;
        //     }, 5000 - (now - lastRequestTimeRef.current));
        // }
    }, [sendLogsToServer]);

    useEffect(() => {
        if (eventListenersRegistered.current || !sfuSocket) {
            return;
        }

        if (!sfuSocket) {
            console.warn("Socket not initialized");
            return;
        }

        let mounted = true;
        eventListenersRegistered.current = true;

        const handleBehaviorMonitorState = (data: { isActive: boolean }) => {
            if (!mounted) return;
            dispatch({
                type: ActionLogType.SET_MONITOR_ACTIVE,
                payload: {
                    isActive: data.isActive,
                },
            });
            if (isCreator) return;

            if (!data.isActive) {
                throttledSendLogs();
            }
        };

        const handleRequestUserLog = (data: { peerId: string }) => {
            if (isCreator) return;
            if (data.peerId === username) {
                throttledSendLogs();
            }
        };

        // Xóa bất kỳ người nghe sự kiện nào đã đăng ký trước đó
        sfuSocket.off("sfu:behavior-monitor-state");
        sfuSocket.off("sfu:request-user-log");

        // Đăng ký người nghe sự kiện mới
        sfuSocket.on("sfu:behavior-monitor-state", handleBehaviorMonitorState);
        sfuSocket.on("sfu:request-user-log", handleRequestUserLog);

        return () => {
            mounted = false;
            eventListenersRegistered.current = false;

            // Dọn dẹp các tiết chế nếu component unmount
            if (requestLogThrottleRef.current) {
                clearTimeout(requestLogThrottleRef.current);
                requestLogThrottleRef.current = null;
            }

            // Hủy đăng ký người nghe sự kiện
            sfuSocket.off(
                "sfu:behavior-monitor-state",
                handleBehaviorMonitorState
            );
            sfuSocket.off("sfu:request-user-log", handleRequestUserLog);
        };
    }, [isCreator, username, roomId, dispatch, throttledSendLogs]);

    const toggleBehaviorMonitoring = useCallback(() => {
        if (!isCreator) return;
        if (sfuSocket && sfuSocket.connected) {
            try {
                if (isMonitorActive) {
                    toast.info("Stopping monitoring, downloading logs...");
                    sfuSocket.emit(
                        "sfu:download-room-log",
                        {
                            roomId,
                            peerId: username,
                        },
                        (file: any) => {
                            if (file && file.success) {
                                window.URL.revokeObjectURL(file.file);
                                const blob = new Blob([file.file], {
                                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `behavior-logs-${roomId}-${new Date()
                                    .toISOString()
                                    .slice(0, 10)}.xlsx`;
                                document.body.appendChild(a);
                                a.click();

                                setTimeout(() => {
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                }, 100);

                                toast.success(
                                    "Successfully downloaded log file"
                                );
                            } else if (file && !file.success) {
                                toast.error(
                                    file.error || "Unable to download log file"
                                );
                            }
                        }
                    );
                } else {
                    toast.info("Starting monitoring...");
                }

                sfuSocket.emit("sfu:toggle-behavior-monitor", {
                    roomId,
                    peerId: username,
                    isActive: !isMonitorActive,
                });
            } catch (err) {
                console.error("Error sending toggle monitoring command:", err);
                toast.error("Error changing monitoring status");
            }
        } else {
            console.warn("Socket not connected, can't toggle monitoring");
            toast.error("Cannot connect to server");
        }
    }, [isCreator, roomId, username, isMonitorActive]);

    useEffect(() => {
        if (isMonitorActive && !isCreator) {
            logSendInterval.current = setInterval(() => {
                if (eventLog.length > 0) {
                    sendLogsToServer();
                }
            }, 30000);

            return () => {
                if (logSendInterval.current) {
                    clearInterval(logSendInterval.current);
                    logSendInterval.current = null;
                }
            };
        } else if (!isMonitorActive && logSendInterval.current) {
            clearInterval(logSendInterval.current);
            logSendInterval.current = null;
        }
    }, [isMonitorActive, eventLog.length, isCreator, sendLogsToServer]);

    useEffect(() => {
        if (!isMonitorActive) {
            return;
        }

        // --- Giám sát người dùng chuyển tab ---
        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === "visible";

            // Enhanced logging for exam mode
            if (examModeActive && !isVisible) {
                console.warn(
                    "[EXAM] Suspicious: User switched tab during quiz!"
                );
                toast.warning("Warning: Tab switching detected during exam");
            }

            dispatch({
                type: ActionLogType.SET_EVENT_LOG,
                payload: [
                    {
                        type: TypeUserEvent.FOCUS_TAB,
                        value: isVisible,
                        time: new Date(),
                        context: examModeActive
                            ? {
                                  examMode: true,
                                  severity: !isVisible ? "HIGH" : "LOW",
                                  quizId: activeQuiz?.id,
                              }
                            : undefined,
                    },
                ],
            });
        };

        // --- Giám sát người dùng chuyển cửa sổ ---
        const handleFocus = () => {
            if (document.visibilityState === "visible") {
                // Tránh ghi đè nếu tab đang ẩn
                dispatch({
                    type: ActionLogType.SET_EVENT_LOG,
                    payload: [
                        {
                            type: TypeUserEvent.FOCUS,
                            value: true,
                            time: new Date(),
                        },
                    ],
                });
            }
        };

        const handleBlur = () => {
            if (document.visibilityState === "visible") {
                // Enhanced warning for exam mode
                if (examModeActive) {
                    console.warn(
                        "[EXAM] Suspicious: User lost focus during quiz!"
                    );
                    toast.warning("Warning: Window focus lost during exam");
                }

                // Chỉ ghi blur nếu tab đang active => tức là mất focus do chuyển cửa sổ
                dispatch({
                    type: ActionLogType.SET_EVENT_LOG,
                    payload: [
                        {
                            type: TypeUserEvent.FOCUS,
                            value: false,
                            time: new Date(),
                            context: examModeActive
                                ? {
                                      examMode: true,
                                      severity: "HIGH",
                                      quizId: activeQuiz?.id,
                                  }
                                : undefined,
                        },
                    ],
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        // let eyeTrackingInterval = 10000;

        return () => {
            // if (interval.current) {
            //   clearInterval(interval.current);
            //   interval.current = null;
            // }

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, [isMonitorActive, isInitialized, hasCamera, dispatch]);

    // Separate effect for eye tracking to avoid infinite loops
    useEffect(() => {
        if (!isMonitorActive || !isInitialized || !hasCamera) {
            return;
        }

        // Debounce eye tracking logs to avoid spam
        const timeoutId = setTimeout(() => {
            const logLevel = examModeActive ? "EXAM" : "NORMAL";
            console.log(
                `[${logLevel}] Eye tracking result:`,
                isLookingAtScreen
            );

            dispatch({
                type: ActionLogType.SET_EVENT_LOG,
                payload: [
                    {
                        type: TypeUserEvent.ATTENTION,
                        value: isLookingAtScreen,
                        time: new Date(),
                        // Add exam mode context
                        context: examModeActive
                            ? {
                                  examMode: true,
                                  quizId: activeQuiz?.id,
                                  quizTitle: activeQuiz?.title,
                              }
                            : undefined,
                    },
                ],
            });
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [
        isLookingAtScreen,
        isMonitorActive,
        isInitialized,
        hasCamera,
        dispatch,
        examModeActive,
        activeQuiz,
    ]);

    return {
        isMonitorActive,
        toggleBehaviorMonitoring,
        sendLogsToServer,
        examModeActive,
        isUserTakingQuiz,
    };
}
