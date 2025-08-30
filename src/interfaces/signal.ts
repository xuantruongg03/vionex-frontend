import { types as mediasoupTypes } from "mediasoup-client";
// Types
export interface User {
    peerId: string;
    isCreator: boolean;
    timeArrive: Date;
    userInfo?: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
    };
}

export interface StreamMetadata {
    video: boolean;
    audio: boolean;
    type: "webcam" | "mic" | "screen" | "presence";
    isScreenShare?: boolean;
    peerId?: string;
    noCameraAvailable?: boolean;
    noMicroAvailable?: boolean;
    isTranslation?: boolean;
    targetUserId?: string;
}

export interface Stream {
    streamId: string;
    publisherId: string;
    producerId: string;
    metadata: StreamMetadata;
    rtpParameters: mediasoupTypes.RtpParameters;
    roomId: string;
}
