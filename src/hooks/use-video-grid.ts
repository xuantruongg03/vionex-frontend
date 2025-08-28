import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { User } from "@/interfaces";

export const useVideoGrid = (
    streams: any[],
    screenStreams: any[],
    users: User[],
    speakingPeers: string[],
    myPeerId: string,
    room: any
) => {
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
    const streamMapRef = useRef<Map<string, MediaStream>>(new Map());

    const [layouts, setLayouts] = useState<{ [index: string]: any[] }>({});
    const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
    const [mounted, setMounted] = useState(false);
    const [usersToShow, setUsersToShow] = useState<User[]>([]);
    const [remainingUsers, setRemainingUsers] = useState<User[]>([]);
    const [selectedLayoutTemplate, setSelectedLayoutTemplate] =
        useState("auto");

    const attachMediaStream = useCallback((id: string, stream: MediaStream) => {
        const videoElement = videoRefs.current[id];
        if (videoElement && videoElement.srcObject !== stream) {
            videoElement.srcObject = stream;
        }
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        streams.forEach(({ id, stream }) => {
            streamMapRef.current.set(id, stream);
            attachMediaStream(id, stream);
        });
    }, [streams, attachMediaStream]);

    // Helper: tìm stream của user
    const getUserStream = useCallback(
        (peerId: string) => {
            if (peerId === myPeerId || peerId === "local") {
                const localStream = streams.find((s) => s.id === "local");
                if (localStream) return localStream;
                return null;
            }

            // Screen share streams first
            const screenStream = streams.find(
                (s) =>
                    s.id === `screen-${peerId}` ||
                    (s.id.startsWith(`remote-${peerId}-`) &&
                        (s.metadata?.isScreenShare ||
                            s.metadata?.type === "screen"))
            );
            if (screenStream) return screenStream;

            // Video streams
            const videoStream = streams.find(
                (s) =>
                    s.id.startsWith(`remote-${peerId}-`) &&
                    (s.metadata?.type === "webcam" ||
                        s.metadata?.video === true)
            );
            if (videoStream) return videoStream;

            // Audio streams
            const audioStream = streams.find(
                (s) =>
                    s.id.startsWith(`remote-${peerId}-`) &&
                    (s.metadata?.type === "mic" ||
                        (s.metadata?.audio === true &&
                            s.metadata?.video === false))
            );
            if (audioStream) return audioStream;

            // Presence streams
            const presenceStream = streams.find(
                (s) =>
                    s.id.startsWith(`remote-${peerId}-`) &&
                    s.metadata?.type === "presence"
            );
            return presenceStream || null;
        },
        [streams, myPeerId]
    );

    // Helper: tìm audio stream riêng biệt cho user
    const getUserAudioStream = useCallback(
        (peerId: string) => {
            if (peerId === myPeerId || peerId === "local") {
                const localScreenStream = streams.find(
                    (s) => s.id === "screen-local"
                );
                if (
                    localScreenStream &&
                    localScreenStream.stream.getAudioTracks().length > 0
                ) {
                    return localScreenStream.stream;
                }

                const ownScreenStream = streams.find(
                    (s) => s.id === `screen-${myPeerId}`
                );
                if (
                    ownScreenStream &&
                    ownScreenStream.stream.getAudioTracks().length > 0
                ) {
                    return ownScreenStream.stream;
                }
                return null;
            }

            // For remote users, prioritize translated audio
            const translatedStream = streams.find(
                (s) => s.metadata?.isTranslation
            );
            if (translatedStream) return translatedStream.stream;

            // Screen share audio
            const screenStream = streams.find(
                (s) => s.id === `screen-${peerId}`
            );
            if (
                screenStream &&
                screenStream.stream.getAudioTracks().length > 0
            ) {
                return screenStream.stream;
            }

            // Original audio streams
            const audioStreams = streams.filter(
                (s) =>
                    s.id.startsWith(`remote-${peerId}-`) &&
                    s.stream.getAudioTracks().length > 0 &&
                    !s.id.includes("-translated")
            );
            return audioStreams.length > 0 ? audioStreams[0].stream : null;
        },
        [streams, myPeerId]
    );

    // Helper functions
    const isUserScreenSharing = useCallback(
        (peerId: string) => {
            return streams.some(
                (s) =>
                    s.id === `screen-${peerId}` ||
                    (s.id.startsWith(`remote-${peerId}-`) &&
                        (s.metadata?.isScreenShare ||
                            s.metadata?.type === "screen")) ||
                    (s.id === "screen-local" &&
                        (peerId === myPeerId || peerId === "local"))
            );
        },
        [streams, myPeerId]
    );

    const isUserPinned = useCallback(
        (peerId: string) => {
            return room.pinnedUsers?.includes(peerId);
        },
        [room.pinnedUsers]
    );

    const isUserSpeaking = useCallback(
        (peerId: string) => {
            return speakingPeers.includes(peerId);
        },
        [speakingPeers]
    );

    const hasUserStream = useCallback(
        (peerId: string) => {
            return !!getUserStream(peerId);
        },
        [getUserStream]
    );

    const hasUserTranslation = useCallback(
        (peerId: string) => {
            return streams.some((s) => s.id === `remote-${peerId}-translated`);
        },
        [streams]
    );

    const isUserUsingTranslation = useCallback(
        (peerId: string) => {
            const translatedStream = streams.find(
                (s) => s.id === `remote-${peerId}-translated`
            );
            return (
                !!translatedStream &&
                translatedStream.stream.getAudioTracks().length > 0
            );
        },
        [streams]
    );

    // Screen share users logic - use dedicated screenStreams instead of filtering
    const screenShareUsers = useMemo(() => {
        if (screenStreams.length === 0) {
            return [];
        }

        // Group streams by owner and pick the best one (with video tracks)
        const streamsByOwner = new Map<string, any>();

        for (const stream of screenStreams) {
            let screenOwner = "";
            
            // Enhanced owner detection with metadata priority
            if (stream.metadata?.publisherId) {
                screenOwner = stream.metadata.publisherId;
            } else if (stream.id === "screen-local") {
                screenOwner = myPeerId || "local";
            } else if (stream.id.startsWith("screen-")) {
                screenOwner = stream.id.replace("screen-", "");
            } else if (stream.metadata?.peerId) {
                screenOwner = stream.metadata.peerId;
            }

            if (!screenOwner) continue;

            const hasVideoTracks = stream.stream && stream.stream.getVideoTracks().length > 0;
            const existingStream = streamsByOwner.get(screenOwner);

            // Only replace if new stream has video and existing doesn't, or if no existing stream
            if (!existingStream || (hasVideoTracks && (!existingStream.stream || existingStream.stream.getVideoTracks().length === 0))) {
                streamsByOwner.set(screenOwner, stream);
            }
        }

        // Create screen users from best streams
        const screenUsers = [];
        for (const [screenOwner, stream] of streamsByOwner) {
            const hasVideoTracks = stream.stream && stream.stream.getVideoTracks().length > 0;
            
            if (hasVideoTracks) {
                const screenUser = {
                    peerId: `${screenOwner}-screen`,
                    isScreenShare: true,
                    originalPeerId: screenOwner,
                    screenStream: stream,
                };
                screenUsers.push(screenUser);
            }
        }
        return screenUsers;
    }, [screenStreams, myPeerId]);

    // Sorted users logic
    const sortedUsers = useMemo(() => {
        const localUser = users.find(
            (u) => u.peerId === myPeerId || u.peerId === "local"
        );
        const otherUsers = users.filter(
            (u) => u.peerId !== myPeerId && u.peerId !== "local"
        );

        return [...otherUsers].sort((a, b) => {
            const aScreen = isUserScreenSharing(a.peerId);
            const bScreen = isUserScreenSharing(b.peerId);
            if (aScreen && !bScreen) return -1;
            if (!aScreen && bScreen) return 1;

            const aPinned = isUserPinned(a.peerId);
            const bPinned = isUserPinned(b.peerId);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;

            const aSpeaking = isUserSpeaking(a.peerId);
            const bSpeaking = isUserSpeaking(b.peerId);
            if (aSpeaking && !bSpeaking) return -1;
            if (!aSpeaking && bSpeaking) return 1;

            const aHasStream = hasUserStream(a.peerId);
            const bHasStream = hasUserStream(b.peerId);
            if (aHasStream && !bHasStream) return -1;
            if (!aHasStream && bHasStream) return 1;

            return 0;
        });
    }, [
        users,
        myPeerId,
        isUserScreenSharing,
        isUserPinned,
        isUserSpeaking,
        hasUserStream,
    ]);

    return {
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
    };
};
