/*!
 * Copyright (c) 2025 xuantruongg003
 *
 * This software is licensed for non-commercial use only.
 * You may use, study, and modify this code for educational and research purposes.
 *
 * Commercial use of this code, in whole or in part, is strictly prohibited
 * without prior written permission from the author.
 *
 * Author Contact: lexuantruong098@gmail.com
 */

import { types as mediasoupTypes } from "mediasoup-client";
// Types
export interface User {
    peerId: string;
    isCreator: boolean;
    timeArrive: Date;
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
