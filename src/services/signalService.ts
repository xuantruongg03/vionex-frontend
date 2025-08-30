import { types as mediasoupTypes } from "mediasoup-client";
import axiosClient from "@/apis/api-client";

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
    private peerId: string | null = null;

    constructor() {
        // No need for baseUrl since axiosClient already has it configured
    }

    setPeerId(peerId: string) {
        this.peerId = peerId;
    }

    private async request<T>(
        endpoint: string,
        options: {
            method?: string;
            data?: any;
            requireAuth?: boolean;
        } = {}
    ): Promise<T> {
        const { method = "GET", data, requireAuth = false } = options;

        // Prepare headers
        const headers: any = {};

        // Add JWT authorization header only when required (for org rooms)
        if (requireAuth) {
            const accessToken = localStorage.getItem("accessToken");
            if (accessToken) {
                headers["Authorization"] = `Bearer ${accessToken}`;
            } else {
                throw new Error(
                    "Authentication required but no access token found"
                );
            }
        }

        // Add peerId header for all requests (backward compatibility)
        if (this.peerId) {
            const encodedPeerId = encodeURIComponent(this.peerId);
            headers["X-Peer-Id"] = encodedPeerId;
        }

        try {
            const response = await axiosClient({
                method,
                url: endpoint,
                data,
                headers,
            });

            return response as T;
        } catch (error: any) {
            const message =
                error.response?.data?.message ||
                error.message ||
                "Request failed";
            throw new Error(message);
        }
    }

    // These methods are no longer used - WebSocket handles all communication
    async joinRoom(roomId: string, peerId: string, password?: string) {
        throw new Error("Use WebSocket join instead - sfu:join event");
    }

    async joinOrgRoom(roomId: string, peerId: string) {
        throw new Error("Use WebSocket join instead - sfu:join event");
    }

    async getRouterRtpCapabilities(roomId: string) {
        throw new Error(
            "Router capabilities are provided via WebSocket - sfu:router-capabilities event"
        );
    }

    async verifyOrgRoomAccess(roomId: string) {
        return this.request<{
            success: boolean;
            message: string;
            roomId: string;
        }>(`/api/room/org/verify`, {
            method: "POST",
            data: { roomId },
            requireAuth: true,
        });
    }

    // Updated endpoints to match new gateway.controller.ts
    async setRtpCapabilities(rtpCapabilities: any) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/rtp-capabilities`,
            {
                method: "PUT",
                data: { rtpCapabilities },
            }
        );
    }

    async createTransport(roomId: string, isProducer: boolean) {
        return this.request<any>(`/sfu/transport`, {
            method: "POST",
            data: { roomId, isProducer },
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
                data: { peerId, dtlsParameters },
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
                data: {
                    peerId,
                    transportId,
                    kind,
                    rtpParameters,
                    metadata: appData,
                },
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
            data: {
                streamId,
                transportId,
                peerId: peerId,
            },
        });
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
                data: { dtlsParameters, roomId },
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
            data: {
                kind,
                rtpParameters,
                roomId,
                participantId,
                appData,
            },
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
                data: {
                    streamId,
                    rtpCapabilities,
                    roomId,
                    participantId,
                },
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
                data: { roomId, participantId },
            }
        );
    }

    async pauseConsumer(consumerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/consumer/${consumerId}/pause`,
            {
                method: "POST",
                data: { roomId },
            }
        );
    }

    async closeConsumer(consumerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/consumer/${consumerId}`,
            {
                method: "DELETE",
                data: { roomId },
            }
        );
    }

    async pauseProducer(producerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/producer/${producerId}/pause`,
            {
                method: "POST",
                data: { roomId },
            }
        );
    }

    async resumeProducer(producerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/producer/${producerId}/resume`,
            {
                method: "POST",
                data: { roomId },
            }
        );
    }

    async closeProducer(producerId: string, roomId: string) {
        return this.request<{ success: boolean; message: string }>(
            `/sfu/producer/${producerId}`,
            {
                method: "DELETE",
                data: { roomId },
            }
        );
    }
}

export default ApiService;
