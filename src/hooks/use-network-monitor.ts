import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import WebRTCIssueDetector from "webrtc-issue-detector";
import { NetworkStats, UseNetworkMonitorProps } from "@/interfaces/network";

export function useNetworkMonitor({ transport, onPoorNetworkDetected, onGoodNetworkDetected, onMediumNetworkDetected, interval = 5000 }: UseNetworkMonitorProps) {
    const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
    const detectorRef = useRef<WebRTCIssueDetector | null>(null);
    const poorNetworkCounterRef = useRef(0);
    const goodNetworkCounterRef = useRef(0);
    const autoDisabledVideoRef = useRef(false);
    const isMonitoringRef = useRef(false);

    // Store callbacks in refs to avoid dependency issues
    const poorCbRef = useRef(onPoorNetworkDetected);
    const goodCbRef = useRef(onGoodNetworkDetected);
    const mediumCbRef = useRef(onMediumNetworkDetected);

    useEffect(() => {
        poorCbRef.current = onPoorNetworkDetected;
        goodCbRef.current = onGoodNetworkDetected;
        mediumCbRef.current = onMediumNetworkDetected;
    }, [onPoorNetworkDetected, onGoodNetworkDetected, onMediumNetworkDetected]);

    // Determine network quality based on MOS scores
    const getNetworkQuality = useCallback((inboundScore: number | null, outboundScore: number | null): "excellent" | "good" | "fair" | "poor" | "unknown" => {
        const avgScore = (inboundScore || 0 + outboundScore || 0) / 2;

        if (!inboundScore && !outboundScore) return "unknown";

        const score = inboundScore && outboundScore ? avgScore : inboundScore || outboundScore || 0;

        if (score >= 4.5) return "excellent";
        if (score >= 4.0) return "good";
        if (score >= 3.0) return "fair";
        return "poor";
    }, []);

    // Initialize WebRTC Issue Detector
    const initializeDetector = useCallback(() => {
        if (detectorRef.current) {
            detectorRef.current.stopWatchingNewPeerConnections();
        }

        try {
            detectorRef.current = new WebRTCIssueDetector({
                getStatsInterval: interval,
                onIssues: (issues) => {
                    console.log("WebRTC Issues detected:", issues);

                    // Check for network-related issues
                    const networkIssues = issues.filter((issue) => issue.type === "network");

                    if (networkIssues.length > 0) {
                        poorNetworkCounterRef.current++;
                        goodNetworkCounterRef.current = 0;

                        if (poorNetworkCounterRef.current >= 3 && !autoDisabledVideoRef.current) {
                            if (poorCbRef.current) {
                                poorCbRef.current();
                                autoDisabledVideoRef.current = true;
                            }
                        }
                    }
                },
                onNetworkScoresUpdated: (scores) => {
                    console.log("Network scores updated:", scores);

                    const { inbound, outbound, statsSamples } = scores;
                    const quality = getNetworkQuality(inbound, outbound);

                    // Extract stats from samples with safe access
                    const inboundStats = (statsSamples?.inboundStatsSample as any) || {};
                    const outboundStats = (statsSamples?.outboundStatsSample as any) || {};

                    // Calculate approximate bitrates (webrtc-issue-detector doesn't provide direct bitrate)
                    // These are estimated values based on quality scores
                    const estimateDownloadBps = inbound ? Math.max(inbound * 200000, 100000) : 0; // Rough estimation
                    const estimateUploadBps = outbound ? Math.max(outbound * 150000, 100000) : 0; // Rough estimation

                    const newStats: NetworkStats = {
                        upBps: estimateUploadBps,
                        downBps: estimateDownloadBps,
                        rtt: inboundStats?.rtt || outboundStats?.rtt || null,
                        jitter: inboundStats?.avgJitter || outboundStats?.avgJitter || null,
                        packetLoss: inboundStats?.packetLossPct || outboundStats?.packetLossPct || null,
                        isGoodNetwork: quality === "excellent" || quality === "good",
                        isPoorNetwork: quality === "poor",
                        networkQuality: quality,
                        inboundScore: inbound,
                        outboundScore: outbound,
                    };

                    setNetworkStats(newStats);

                    // Handle quality changes
                    if (quality === "excellent" || quality === "good") {
                        goodNetworkCounterRef.current++;
                        poorNetworkCounterRef.current = 0;

                        if (goodNetworkCounterRef.current >= 3 && autoDisabledVideoRef.current) {
                            if (goodCbRef.current) {
                                goodCbRef.current();
                            }
                            autoDisabledVideoRef.current = false;
                        }
                    } else if (quality === "poor") {
                        poorNetworkCounterRef.current++;
                        goodNetworkCounterRef.current = 0;

                        if (poorNetworkCounterRef.current >= 3 && !autoDisabledVideoRef.current) {
                            if (poorCbRef.current) {
                                poorCbRef.current();
                                autoDisabledVideoRef.current = true;
                            }
                        }
                    } else if (quality === "fair") {
                        // Reset counters but call medium callback
                        poorNetworkCounterRef.current = 0;
                        goodNetworkCounterRef.current = 0;

                        if (mediumCbRef.current) {
                            mediumCbRef.current();
                        }
                    }
                },
            });

            console.log("WebRTC Issue Detector initialized");
        } catch (error) {
            console.error("Failed to initialize WebRTC Issue Detector:", error);
            toast.error("Failed to initialize network monitoring");
        }
    }, [interval, getNetworkQuality]);

    const startMonitoring = useCallback(async () => {
        if (!transport) {
            console.warn("No transport provided for network monitoring");
            return;
        }

        try {
            if (transport.connectionState !== "connected") {
                toast.error("Monitoring is only active with a receiving connection");
                return;
            }

            if (!isMonitoringRef.current) {
                initializeDetector();

                if (detectorRef.current) {
                    detectorRef.current.watchNewPeerConnections();
                    isMonitoringRef.current = true;
                    console.log("Network monitoring started");
                    toast.success("Network monitoring started", {
                        description: "Monitoring network quality and detecting issues",
                    });
                }
            }
        } catch (error) {
            console.error("Error starting network monitoring:", error);
            toast.error("Failed to start network monitoring");
        }
    }, [transport, initializeDetector]);

    const stopMonitoring = useCallback(() => {
        if (detectorRef.current && isMonitoringRef.current) {
            detectorRef.current.stopWatchingNewPeerConnections();
            isMonitoringRef.current = false;
            console.log("Network monitoring stopped");
        }
    }, []);

    const resetNetworkCounters = useCallback(() => {
        poorNetworkCounterRef.current = 0;
        goodNetworkCounterRef.current = 0;
        autoDisabledVideoRef.current = false;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopMonitoring();
        };
    }, [stopMonitoring]);

    return {
        networkStats,
        startMonitoring,
        stopMonitoring,
        resetNetworkCounters,
    };
}
