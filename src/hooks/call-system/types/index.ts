import { StreamMetadata } from "@/interfaces/signal";
import { Device, types as mediasoupTypes } from "mediasoup-client";
import { MutableRefObject } from "react";
import { Socket } from "socket.io-client";
import ApiService from "@/services/signalService";

// Stream related types
export interface StreamInfo {
    id: string;
    stream: MediaStream;
    metadata?: StreamMetadata;
}

export interface ProducerInfo {
    producerId: string;
    streamId: string;
    kind: string;
    appData: any;
    producer?: any;
}

export interface ConsumerInfo {
    consumer: any;
    streamId: string;
}

export interface PendingStreamData {
    streamId: string;
    publisherId: string;
    metadata: any;
    rtpParameters: any;
}

// Current stream IDs tracking
export interface CurrentStreamIds {
    primary?: string;
    video?: string;
    audio?: string;
}

// Refs interface for passing refs between modules
export interface CallSystemRefs {
    apiServiceRef: MutableRefObject<ApiService | null>;
    socketRef: MutableRefObject<Socket | null>;
    deviceRef: MutableRefObject<Device | null>;
    localStreamRef: MutableRefObject<MediaStream | null>;
    sendTransportRef: MutableRefObject<mediasoupTypes.Transport | null>;
    recvTransportRef: MutableRefObject<mediasoupTypes.Transport | null>;
    producersRef: MutableRefObject<Map<string, ProducerInfo>>;
    consumersRef: MutableRefObject<Map<string, ConsumerInfo>>;
    remoteStreamsMapRef: MutableRefObject<Map<string, MediaStream>>;
    isInitializedRef: MutableRefObject<boolean>;
    screenStreamRef: MutableRefObject<MediaStream | null>;
    consumingStreamsRef: MutableRefObject<Set<string>>;
    isPublishingRef: MutableRefObject<boolean>;
    currentStreamIdsRef: MutableRefObject<CurrentStreamIds>;
    pendingStreamsRef: MutableRefObject<PendingStreamData[]>;
    isJoiningRef: MutableRefObject<boolean>; // Track joining status to prevent duplicates
}

// State setters interface
export interface CallSystemSetters {
    setStreams: React.Dispatch<React.SetStateAction<StreamInfo[]>>;
    setScreenStreams: React.Dispatch<React.SetStateAction<StreamInfo[]>>;
    setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>;
    setSpeakingPeers: React.Dispatch<React.SetStateAction<Set<string>>>;
    setIsSpeaking: React.Dispatch<React.SetStateAction<boolean>>;
    setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
    setIsJoined: React.Dispatch<React.SetStateAction<boolean>>;
    setIsWebSocketJoined: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setJoining: React.Dispatch<React.SetStateAction<boolean>>;
}

// Current state values interface
export interface CallSystemState {
    streams: StreamInfo[];
    screenStreams: StreamInfo[];
    isScreenSharing: boolean;
    speakingPeers: Set<string>;
    isSpeaking: boolean;
    isConnected: boolean;
    isJoined: boolean;
    isWebSocketJoined: boolean;
    error: string | null;
    loading: boolean;
    joining: boolean;
}

// Event handler function types
export interface SocketEventHandlers {
    handlePeerLeft: (data: { peerId: string }) => Promise<void>;
    handleConnect: () => void;
    handleDisconnect: () => void;
    handleJoinSuccess: (data: any) => void;
    handleStreams: (streams: any[]) => Promise<void>;
    handleStreamAdded: (data: any) => Promise<void>;
    handleStreamMetadataUpdated: (data: any) => void;
    handleConsumerCreated: (data: any) => Promise<void>;
    handleRouterCapabilities: (data: {
        routerRtpCapabilities: mediasoupTypes.RtpCapabilities;
    }) => Promise<void>;
    handleRtpCapabilitiesSet: () => void;
    handleTransportCreated: (transportInfo: any) => Promise<void>;
    handleConsumerResumed: (data: any) => Promise<void>;
    handleTransportConnected: (data: { transportId: string }) => void;
    handleProducerCreated: (data: any) => void;
    handlePinSuccess: (data: {
        pinnedPeerId: string;
        consumersCreated: any[];
        alreadyPriority: boolean;
    }) => void;
    handlePinError: (data: { message: string }) => void;
    handleUnpinSuccess: (data: {
        unpinnedPeerId: string;
        consumersRemoved: string[];
        stillInPriority: boolean;
    }) => void;
    handleUnpinError: (data: { message: string }) => void;
    handleConsumerRemoved: (data: {
        consumerId: string;
        reason: string;
    }) => void;
    handleLockSuccess: (data: { roomId: string; message: string }) => void;
    handleLockError: (data: { message: string }) => void;
    handleUnlockSuccess: (data: { roomId: string; message: string }) => void;
    handleUnlockError: (data: { message: string }) => void;
    handleRoomLocked: (data: {
        roomId: string;
        lockedBy: string;
        message: string;
    }) => void;
    handleRoomUnlocked: (data: {
        roomId: string;
        unlockedBy: string;
        message: string;
    }) => void;
    handleScreenShareStarted: (data: {
        peerId: string;
        streamId: string;
    }) => void;
    handleScreenShareStopped: (data: {
        peerId: string;
        streamId: string;
    }) => void;
}

// Room and media context
export interface CallSystemContext {
    roomId: string;
    room: any; // From Redux state
    dispatch: any; // Redux dispatch
    refs: CallSystemRefs;
    setters: CallSystemSetters;
    state: CallSystemState; // Current state values
}
