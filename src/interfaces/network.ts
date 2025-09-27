export interface NetworkStats {
    upBps: number;
    downBps: number;
    rtt: number | null;
    jitter: number | null;
    packetLoss: number | null;
    isGoodNetwork: boolean;
    isPoorNetwork: boolean;
    networkQuality: "excellent" | "good" | "fair" | "poor" | "unknown";
    inboundScore: number | null; // MOS score cho inbound (1-5)
    outboundScore: number | null; // MOS score cho outbound (1-5)
}

export interface UseNetworkMonitorProps {
    transport: any;
    onPoorNetworkDetected?: () => void;
    onGoodNetworkDetected?: () => void;
    onMediumNetworkDetected?: () => void;
    interval?: number;
}
