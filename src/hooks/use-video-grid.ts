import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { User } from "@/interfaces";
import { RootState } from "@/redux/store";

export const useVideoGrid = (streams: any[], screenStreams: any[], users: User[], speakingPeers: string[], myPeerId: string, room: any) => {
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
    const streamMapRef = useRef<Map<string, MediaStream>>(new Map());

    // Get layout state from Redux instead of local state
    const selectedLayoutTemplate = useSelector((state: RootState) => state.layout.selectedLayoutTemplate);

    const [layouts, setLayouts] = useState<{ [index: string]: any[] }>({});
    const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
    const [mounted, setMounted] = useState(false);
    const [usersToShow, setUsersToShow] = useState<User[]>([]);
    const [remainingUsers, setRemainingUsers] = useState<User[]>([]);

    const streamMaps = useMemo(() => {
        const byPeerId = new Map<string, any[]>();
        const translated = new Map<string, any>();
        const screenShares = new Map<string, any>();

        streams.forEach((stream) => {
            const { id, metadata } = stream;

            // Group by peerId
            if (id.startsWith("remote-")) {
                const parts = id.split("-");
                if (parts.length >= 3) {
                    const peerId = parts[1];
                    if (!byPeerId.has(peerId)) {
                        byPeerId.set(peerId, []);
                    }
                    byPeerId.get(peerId)!.push(stream);
                }
            }

            // Track translated streams
            if (metadata?.isTranslation && metadata?.targetUserId) {
                translated.set(metadata.targetUserId, stream);
            }

            // Track screen shares
            if (id.startsWith("screen-") || metadata?.isScreenShare || metadata?.type === "screen") {
                const owner = id.startsWith("screen-") ? id.replace("screen-", "") : metadata?.publisherId || metadata?.peerId;
                if (owner) {
                    screenShares.set(owner, stream);
                }
            }
        });

        return { byPeerId, translated, screenShares };
    }, [streams]);

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

    const getUserStream = useCallback(
        (peerId: string) => {
            if (peerId === myPeerId || peerId === "local") {
                const localStream = streamMaps.byPeerId.get("local")?.[0] || streams.find((s) => s.id === "local");
                if (localStream) return localStream;
                return null;
            }

            const userStreams = streamMaps.byPeerId.get(peerId) || [];

            // Screen share streams first from cached map
            const screenStream = streamMaps.screenShares.get(peerId);
            if (screenStream) {
                return screenStream;
            }

            // Video streams - prioritize streams with actual video tracks
            const videoStream = userStreams.find((s) => {
                const hasVideoTracks = s.stream.getVideoTracks().length > 0;
                const isVideoType = s.metadata?.type === "webcam" || s.metadata?.video === true;
                return hasVideoTracks && isVideoType;
            });
            if (videoStream) {
                return videoStream;
            }

            const audioStream = userStreams.find((s) => {
                const hasAudioTracks = s.stream.getAudioTracks().length > 0;
                const hasNoVideoTracks = s.stream.getVideoTracks().length === 0;
                const isAudioType = s.metadata?.type === "mic" || (s.metadata?.audio === true && s.metadata?.video === false);
                return hasAudioTracks && hasNoVideoTracks && isAudioType;
            });
            if (audioStream) {
                return audioStream;
            }

            // Presence streams
            const presenceStream = userStreams.find((s) => s.metadata?.type === "presence");
            return presenceStream || null;
        },
        [streams, myPeerId, streamMaps]
    );

    const getUserAudioStream = useCallback(
        (peerId: string) => {
            if (peerId === myPeerId || peerId === "local") {
                const localScreenStream = streamMaps.screenShares.get("local") || streamMaps.screenShares.get(myPeerId) || streams.find((s) => s.id === "screen-local");
                if (localScreenStream && localScreenStream.stream.getAudioTracks().length > 0) {
                    return localScreenStream.stream;
                }
                return null;
            }

            const translatedStream = streamMaps.translated.get(peerId);
            if (translatedStream && translatedStream.stream.getAudioTracks().length > 0) {
                return translatedStream.stream;
            }

            const screenStream = streamMaps.screenShares.get(peerId);
            if (screenStream && screenStream.stream.getAudioTracks().length > 0) {
                return screenStream.stream;
            }

            const userStreams = streamMaps.byPeerId.get(peerId) || [];
            const audioStream = userStreams.find((s) => s.stream.getAudioTracks().length > 0 && !s.id.includes("-translated") && s.metadata?.isTranslation !== true);
            return audioStream ? audioStream.stream : null;
        },
        [streams, myPeerId, streamMaps]
    );

    const isUserScreenSharing = useCallback(
        (peerId: string) => {
            if (peerId === myPeerId || peerId === "local") {
                return streams.some((s) => s.id === "screen-local");
            }
            return streamMaps.screenShares.has(peerId);
        },
        [streams, myPeerId, streamMaps.screenShares]
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
            return streamMaps.translated.has(peerId);
        },
        [streamMaps.translated]
    );

    const isUserUsingTranslation = useCallback(
        (peerId: string) => {
            const translatedStream = streamMaps.translated.get(peerId);
            return !!translatedStream && translatedStream.stream.getAudioTracks().length > 0;
        },
        [streamMaps.translated]
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

    // Sorted users logic with priority: screen share → pinned → speaking → others
    // Additional priority (handled in processUsersForDisplay): user with camera (1 person) → local (You) → others
    const sortedUsers = useMemo(() => {
        const localUser = users.find((u) => u.peerId === myPeerId || u.peerId === "local");
        const otherUsers = users.filter((u) => u.peerId !== myPeerId && u.peerId !== "local");

        return [...otherUsers].sort((a, b) => {
            // Priority 1: Screen sharing
            const aScreen = isUserScreenSharing(a.peerId);
            const bScreen = isUserScreenSharing(b.peerId);
            if (aScreen && !bScreen) return -1;
            if (!aScreen && bScreen) return 1;

            // Priority 2: Pinned users
            const aPinned = isUserPinned(a.peerId);
            const bPinned = isUserPinned(b.peerId);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;

            // Priority 3: Speaking users
            const aSpeaking = isUserSpeaking(a.peerId);
            const bSpeaking = isUserSpeaking(b.peerId);
            if (aSpeaking && !bSpeaking) return -1;
            if (!aSpeaking && bSpeaking) return 1;

            // Priority 4: User with camera (first one only) - handled in processUsersForDisplay
            // Priority 5: Local user (You) - added after first video user in processUsersForDisplay
            // Priority 6: Others (with or without camera)

            // Users with streams (for fallback sorting)
            const aHasStream = hasUserStream(a.peerId);
            const bHasStream = hasUserStream(b.peerId);
            if (aHasStream && !bHasStream) return -1;
            if (!aHasStream && bHasStream) return 1;

            return 0;
        });
    }, [users, myPeerId, isUserScreenSharing, isUserPinned, isUserSpeaking, hasUserStream]);

    // Process and prioritize users for display with video stream detection
    const processUsersForDisplay = useCallback(
        (selectedLayoutTemplate: string | null, localUser: User | undefined, pinnedUsers: string[] = []) => {
            const validScreenShareUsers = screenShareUsers.filter((user) => user && user.peerId);
            const otherUsers = sortedUsers.filter((user) => user && user.peerId);

            // Helper: Check if user has video stream (camera on)
            const hasVideoStream = (user: any) => {
                const stream = getUserStream(user.peerId);
                if (!stream || !stream.stream) return false;
                const videoTracks = stream.stream.getVideoTracks();
                return videoTracks.length > 0 && videoTracks.some((track) => track.enabled && track.readyState === "live");
            };

            // For spotlight: exclude local user unless it's the only user in room
            if (selectedLayoutTemplate === "spotlight") {
                const hasOtherUsers = validScreenShareUsers.length > 0 || otherUsers.length > 0;

                if (hasOtherUsers) {
                    // Priority: screen share → pinned → speaking → user with camera (1 person) → others (exclude local)
                    const pinnedUsersFiltered = otherUsers.filter((u) => pinnedUsers.includes(u.peerId));
                    const speakingUsersFiltered = otherUsers.filter((u) => !pinnedUsers.includes(u.peerId) && speakingPeers.includes(u.peerId));
                    const usersWithVideo = otherUsers.filter((u) => !pinnedUsers.includes(u.peerId) && !speakingPeers.includes(u.peerId) && hasVideoStream(u));
                    const usersWithoutVideo = otherUsers.filter((u) => !pinnedUsers.includes(u.peerId) && !speakingPeers.includes(u.peerId) && !hasVideoStream(u));

                    return [
                        ...validScreenShareUsers,
                        ...pinnedUsersFiltered,
                        ...speakingUsersFiltered,
                        ...(usersWithVideo.length > 0 ? [usersWithVideo[0]] : []), // Only take first user with camera
                        ...usersWithoutVideo,
                    ];
                } else {
                    // Only show local user when alone in room
                    return localUser ? [localUser] : [];
                }
            }

            // For other layouts: screen share → pinned → speaking → user with camera (1) → local (You) → others
            const pinnedUsersFiltered = otherUsers.filter((u) => pinnedUsers.includes(u.peerId));
            const speakingUsersFiltered = otherUsers.filter((u) => !pinnedUsers.includes(u.peerId) && speakingPeers.includes(u.peerId));
            const usersWithVideo = otherUsers.filter((u) => !pinnedUsers.includes(u.peerId) && !speakingPeers.includes(u.peerId) && hasVideoStream(u));
            const usersWithoutVideo = otherUsers.filter((u) => !pinnedUsers.includes(u.peerId) && !speakingPeers.includes(u.peerId) && !hasVideoStream(u));

            // Build final list: screen share → pinned → speaking → 1 user with camera → local (You) → others
            const orderedUsers = [
                ...validScreenShareUsers,
                ...pinnedUsersFiltered,
                ...speakingUsersFiltered,
                ...(usersWithVideo.length > 0 ? [usersWithVideo[0]] : []), // Only take first user with camera
                ...(localUser ? [localUser] : []),
                ...usersWithVideo.slice(1), // Remaining users with camera (if any)
                ...usersWithoutVideo,
            ];

            return orderedUsers;
        },
        [sortedUsers, screenShareUsers, speakingPeers, getUserStream]
    );

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
        processUsersForDisplay,
    };
};
