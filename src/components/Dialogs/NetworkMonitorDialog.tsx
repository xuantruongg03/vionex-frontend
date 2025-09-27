import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNetworkMonitor } from "@/hooks/use-network-monitor";
import { Activity } from "lucide-react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

interface NetworkMonitorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transport?: any; // WebRTC transport for network monitoring
}

export const NetworkMonitorDialog = ({ isOpen, onClose, transport: externalTransport }: NetworkMonitorDialogProps) => {
    const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(false);
    const monitoringIntervalMs = 5000;

    // Check if transport is available and connected
    const isTransportReady = useMemo(() => {
        return externalTransport && externalTransport.connectionState === "connected";
    }, [externalTransport?.connectionState]);

    // Memoize callbacks to prevent unnecessary re-renders
    const handlePoorNetworkDetected = useCallback(() => {
        toast.warning("Poor network detected", {
            description: "Poor network quality may affect call quality",
        });
    }, []);

    const handleGoodNetworkDetected = useCallback(() => {
        toast.success("Network connection is stable", {
            description: "Network quality has returned to good level",
        });
    }, []);

    const { networkStats, startMonitoring, stopMonitoring } = useNetworkMonitor({
        transport: externalTransport,
        onPoorNetworkDetected: handlePoorNetworkDetected,
        onGoodNetworkDetected: handleGoodNetworkDetected,
        interval: monitoringIntervalMs,
    });

    useEffect(() => {
        if (isMonitoringEnabled && isTransportReady) {
            startMonitoring();
        } else {
            stopMonitoring();
        }

        return () => {
            stopMonitoring();
        };
    }, [isMonitoringEnabled, isTransportReady, startMonitoring, stopMonitoring]);

    // Memoize format functions for better performance
    const formatValue = useCallback((value: number, unit: string, decimals: number = 0): string => {
        if (value === 0) return `0 ${unit}`;

        if (unit === "bps") {
            if (value > 1000000) {
                return `${(value / 1000000).toFixed(decimals)} Mbps`;
            } else if (value > 1000) {
                return `${(value / 1000).toFixed(decimals)} Kbps`;
            }
        }

        return `${value.toFixed(decimals)} ${unit}`;
    }, []);

    // Memoize network quality calculations
    const networkQualityInfo = useMemo(() => {
        if (!externalTransport) {
            return { label: "No transport", color: "text-orange-500 dark:text-orange-400" };
        }
        if (externalTransport.connectionState !== "connected") {
            return { label: "Connecting...", color: "text-orange-500 dark:text-orange-400" };
        }
        if (!networkStats) {
            return { label: "No data", color: "text-gray-500 dark:text-gray-400" };
        }

        // Sử dụng networkQuality từ webrtc-issue-detector
        switch (networkStats.networkQuality) {
            case "excellent":
                return { label: "Excellent", color: "text-emerald-500 dark:text-emerald-400" };
            case "good":
                return { label: "Good", color: "text-green-500 dark:text-green-400" };
            case "fair":
                return { label: "Fair", color: "text-yellow-500 dark:text-yellow-400" };
            case "poor":
                return { label: "Poor", color: "text-red-500 dark:text-red-400" };
            default:
                return { label: "Unknown", color: "text-gray-500 dark:text-gray-400" };
        }
    }, [externalTransport, networkStats]);

    const getNetworkQualityLabel = useCallback(() => {
        return networkQualityInfo.label;
    }, [networkQualityInfo.label]);

    const getNetworkQualityColor = useCallback(() => {
        return networkQualityInfo.color;
    }, [networkQualityInfo.color]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='text-center flex items-center justify-center gap-2'>
                        <Activity className='h-5 w-5' /> Network Monitor
                    </DialogTitle>
                    <DialogDescription className='text-center'>Monitor your network metrics during the call</DialogDescription>
                </DialogHeader>

                <div className='flex items-center space-x-2 my-4'>
                    <Switch id='network-monitoring' checked={isMonitoringEnabled} onCheckedChange={setIsMonitoringEnabled} disabled={!isTransportReady} />
                    <Label htmlFor='network-monitoring'>{isMonitoringEnabled ? "Monitoring" : "Monitoring off"}</Label>
                    {!externalTransport && <span className='text-xs text-orange-500 dark:text-orange-400 ml-2'>(No transport)</span>}
                    {externalTransport && !isTransportReady && <span className='text-xs text-orange-500 dark:text-orange-400 ml-2'>(Connecting...)</span>}
                </div>

                <div className='space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-md'>
                    <div className='flex justify-between items-center'>
                        <span className='text-sm font-medium'>Network Quality:</span>
                        <span className={`font-semibold ${getNetworkQualityColor()}`}>{getNetworkQualityLabel()}</span>
                    </div>

                    <div className='flex justify-between items-center'>
                        <span className='text-sm font-medium'>Upload Speed:</span>
                        <span className='font-mono'>{networkStats ? formatValue(networkStats.upBps, "bps", 1) : "N/A"}</span>
                    </div>

                    <div className='flex justify-between items-center'>
                        <span className='text-sm font-medium'>Download Speed:</span>
                        <span className='font-mono'>{networkStats ? formatValue(networkStats.downBps, "bps", 1) : "N/A"}</span>
                    </div>

                    <div className='flex justify-between items-center'>
                        <span className='text-sm font-medium'>Latency (RTT):</span>
                        <span className='font-mono'>{networkStats && networkStats.rtt !== null ? `${networkStats.rtt.toFixed(0)} ms` : "N/A"}</span>
                    </div>

                    <div className='flex justify-between items-center'>
                        <span className='text-sm font-medium'>Jitter:</span>
                        <span className='font-mono'>{networkStats && networkStats.jitter !== null ? `${networkStats.jitter.toFixed(1)} ms` : "N/A"}</span>
                    </div>

                    <div className='flex justify-between items-center'>
                        <span className='text-sm font-medium'>Packet Loss:</span>
                        <span className='font-mono'>{networkStats && networkStats.packetLoss !== null ? `${networkStats.packetLoss.toFixed(1)}%` : "N/A"}</span>
                    </div>

                    {networkStats && (networkStats.inboundScore || networkStats.outboundScore) && (
                        <>
                            <div className='border-t pt-3 mt-3'>
                                <div className='text-xs font-medium text-gray-600 dark:text-gray-300 mb-2'>MOS Scores (1-5)</div>

                                {networkStats.inboundScore && (
                                    <div className='flex justify-between items-center'>
                                        <span className='text-sm font-medium'>Inbound Quality:</span>
                                        <span className='font-mono'>{networkStats.inboundScore.toFixed(1)}/5</span>
                                    </div>
                                )}

                                {networkStats.outboundScore && (
                                    <div className='flex justify-between items-center'>
                                        <span className='text-sm font-medium'>Outbound Quality:</span>
                                        <span className='font-mono'>{networkStats.outboundScore.toFixed(1)}/5</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                    <p>{!externalTransport ? "Waiting for WebRTC connection setup..." : !isTransportReady ? `Transport is ${externalTransport.connectionState}...` : isMonitoringEnabled ? `Monitoring active - using webrtc-issue-detector` : "Network monitoring is off"}</p>
                </div>

                <DialogFooter className='mt-4 sm:justify-center'>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
