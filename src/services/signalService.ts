import { types as mediasoupTypes } from "mediasoup-client";

interface StreamMetadata {
    video: boolean;
    audio: boolean;
    type: "webcam" | "mic" | "screen";
    isScreenShare?: boolean;
    noCameraAvailable?: boolean;
    noMicroAvailable?: boolean;
}

interface Stream {
    streamId: string;
    publisherId: string;
    producerId: string;
    metadata: StreamMetadata;
    rtpParameters: mediasoupTypes.RtpParameters;
    roomId: string;
}

class ApiService {
    private baseUrl: string;
    private peerId: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setPeerId(peerId: string) {
        this.peerId = peerId;
    }

    private async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...options?.headers,
        };

        // Add authorization header if peerId is available
        if (this.peerId) {
            // URL encode the peerId to handle non-ASCII characters (like Vietnamese characters)
            const encodedPeerId = encodeURIComponent(this.peerId);
            headers["Authorization"] = `Bearer ${encodedPeerId}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers,
            ...options,
        });

        if (!response.ok) {
            // Defensive: try to parse error JSON, fallback to empty object
            const errorText = await response.text();
            let errorData: any = {};
            try {
                errorData = errorText ? JSON.parse(errorText) : {};
            } catch {}
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        // Defensive: handle empty or invalid JSON response
        const text = await response.text();
        if (!text) return {} as T;
        try {
            return JSON.parse(text);
        } catch {
            return {} as T;
        }
    }

    // Room API
    async joinRoom(roomId: string, peerId: string, password?: string) {
        return this.request<{
            success: boolean;
            message: string;
            rtpCapabilities: mediasoupTypes.RtpCapabilities;
        }>(`/api/room/${roomId}/join`, {
            method: "POST",
            body: JSON.stringify({ peerId, password }),
        });
    }

    // Updated endpoints to match new gateway.controller.ts
    async setRtpCapabilities(rtpCapabilities: any) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/rtp-capabilities`,
            {
                method: "PUT",
                body: JSON.stringify({ rtpCapabilities }),
            }
        );
    }

    async createTransport(roomId: string, isProducer: boolean) {
        return this.request<any>(`/sfu/transport`, {
            method: "POST",
            body: JSON.stringify({ roomId, isProducer }),
        });
    }

    async getUsers(roomId: string) {
        return this.request<{ success: boolean; users: any[] }>(
            `/sfu/rooms/${roomId}/users`
        );
    }

    async getStreams(roomId: string) {
        return this.request<{ success: boolean; streams: Stream[] }>(
            `/sfu/rooms/${roomId}/streams`
        );
    }

    async updateStream(streamId: string, metadata: any, roomId?: string) {
        return await this.request<{
            success: boolean;
            message: string;
        }>(`/sfu/streams/${streamId}`, {
            method: "PUT",
            body: JSON.stringify({ metadata, roomId }),
        });
    }

    async unpublishStream(streamId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/streams/${streamId}`,
            {
                method: "DELETE",
            }
        );
    }

    async removeUser(roomId: string, participantId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/rooms/${roomId}/users/${participantId}`,
            {
                method: "DELETE",
            }
        );
    }

    async connectTransport(
        roomId: string,
        transportId: string,
        peerId: string,
        dtlsParameters: any
    ) {
        return this.request<{ success: boolean; message: string }>(
            `/api/room/${roomId}/transports/${transportId}/connect`,
            {
                method: "POST",
                body: JSON.stringify({ peerId, dtlsParameters }),
            }
        );
    }
    async produce(
        roomId: string,
        peerId: string,
        transportId: string,
        kind: string,
        rtpParameters: any,
        appData: any
    ) {
        return this.request<{ success: boolean; producerId: string }>(
            `/api/room/${roomId}/produce`,
            {
                method: "POST",
                body: JSON.stringify({
                    peerId,
                    transportId,
                    kind,
                    rtpParameters,
                    metadata: appData,
                }),
            }
        );
    }

    async consume({
        streamId,
        roomId,
        transportId,
        peerId,
    }: {
        streamId: string;
        roomId: string;
        transportId: string;
        peerId: string;
    }) {
        return this.request<{
            success: boolean;
            consumerId: string;
            producerId: string;
            streamId: string;
            kind: mediasoupTypes.MediaKind;
            rtpParameters: mediasoupTypes.RtpParameters;
            metadata: any;
        }>(`/api/room/${roomId}/consume`, {
            method: "POST",
            body: JSON.stringify({
                streamId,
                transportId,
                peerId: peerId,
            }),
        });
    }

    // Updated methods for new HTTP endpoints
    async getRouterRtpCapabilities(roomId: string) {
        return this.request<{
            success: boolean;
            data: mediasoupTypes.RtpCapabilities;
        }>(`/sfu/rooms/${roomId}/router-capabilities`);
    }

    async connectTransportHttp(
        transportId: string,
        dtlsParameters: any,
        roomId: string
    ) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/transport/${transportId}/connect`,
            {
                method: "POST",
                body: JSON.stringify({ dtlsParameters, roomId }),
            }
        );
    }

    async produceHttp(
        transportId: string,
        kind: "audio" | "video",
        rtpParameters: any,
        roomId: string,
        participantId?: string,
        appData?: any
    ) {
        return this.request<{
            success: boolean;
            data: { id: string; producerId: string };
        }>(`/sfu/transport/${transportId}/produce`, {
            method: "POST",
            body: JSON.stringify({
                kind,
                rtpParameters,
                roomId,
                participantId,
                appData,
            }),
        });
    }

    async consumeHttp(
        transportId: string,
        streamId: string,
        rtpCapabilities: any,
        roomId: string,
        participantId?: string
    ) {
        return this.request<{ success: boolean; data: any }>(
            `/sfu/transport/${transportId}/consume`,
            {
                method: "POST",
                body: JSON.stringify({
                    streamId,
                    rtpCapabilities,
                    roomId,
                    participantId,
                }),
            }
        );
    }

    async resumeConsumer(
        consumerId: string,
        roomId: string,
        participantId?: string
    ) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/consumer/${consumerId}/resume`,
            {
                method: "POST",
                body: JSON.stringify({ roomId, participantId }),
            }
        );
    }

    async pauseConsumer(consumerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/consumer/${consumerId}/pause`,
            {
                method: "POST",
                body: JSON.stringify({ roomId }),
            }
        );
    }

    async closeConsumer(consumerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/consumer/${consumerId}`,
            {
                method: "DELETE",
                body: JSON.stringify({ roomId }),
            }
        );
    }

    async pauseProducer(producerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/producer/${producerId}/pause`,
            {
                method: "POST",
                body: JSON.stringify({ roomId }),
            }
        );
    }

    async resumeProducer(producerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/producer/${producerId}/resume`,
            {
                method: "POST",
                body: JSON.stringify({ roomId }),
            }
        );
    }

    async closeProducer(producerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/producer/${producerId}`,
            {
                method: "DELETE",
                body: JSON.stringify({ roomId }),
            }
        );
    }
}

export default ApiService;
