// Audio Testing Utility
export class AudioTester {
    private audioContext: AudioContext | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    private isMonitoring = false;

    public onAudioLevel?: (
        level: number,
        status: "silent" | "quiet" | "normal" | "loud"
    ) => void;

    async testMicrophone(): Promise<{
        success: boolean;
        maxLevel: number;
        avgLevel: number;
        message: string;
        recommendations: string[];
    }> {
        try {
            console.log("[AudioTest] 🎤 Starting microphone test...");

            // Get audio stream with optimal settings for maximum sensitivity
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true, // Keep this enabled for max volume
                    sampleRate: 48000,
                    channelCount: 1,
                    deviceId: undefined, // Use default device
                },
            });

            // Setup audio analysis
            this.audioContext = new AudioContext({ sampleRate: 48000 });
            this.sourceNode = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();

            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.3;
            this.sourceNode.connect(this.analyser);

            console.log("[AudioTest] 📊 Analyzing audio for 3 seconds...");
            console.log(
                "[AudioTest] 🗣️ Please speak normally during this test"
            );

            // Monitor audio for 3 seconds
            const results = await this.monitorAudio(3000);

            // Cleanup
            stream.getTracks().forEach((track) => track.stop());
            this.cleanup();

            return results;
        } catch (error) {
            console.error("[AudioTest] ❌ Microphone test failed:", error);
            this.cleanup();

            return {
                success: false,
                maxLevel: 0,
                avgLevel: 0,
                message:
                    "Failed to access microphone. Please check permissions.",
                recommendations: [
                    "Check microphone permissions in browser",
                    "Ensure microphone is connected and working",
                    "Try refreshing the page",
                ],
            };
        }
    }

    private async monitorAudio(duration: number): Promise<{
        success: boolean;
        maxLevel: number;
        avgLevel: number;
        message: string;
        recommendations: string[];
    }> {
        return new Promise((resolve) => {
            if (!this.analyser) {
                resolve({
                    success: false,
                    maxLevel: 0,
                    avgLevel: 0,
                    message: "Audio analyzer not initialized",
                    recommendations: [],
                });
                return;
            }

            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            let maxLevel = 0;
            let totalLevel = 0;
            let sampleCount = 0;

            this.isMonitoring = true;
            const startTime = Date.now();

            const monitor = () => {
                if (!this.isMonitoring || !this.analyser) return;

                this.analyser.getByteFrequencyData(dataArray);

                // Calculate audio level (0-1)
                const level = Math.max(...dataArray) / 255;
                maxLevel = Math.max(maxLevel, level);
                totalLevel += level;
                sampleCount++;

                // Determine status
                let status: "silent" | "quiet" | "normal" | "loud";
                if (level < 0.01) status = "silent";
                else if (level < 0.05) status = "quiet";
                else if (level < 0.7) status = "normal";
                else status = "loud";

                this.onAudioLevel?.(level, status);

                const elapsed = Date.now() - startTime;
                if (elapsed < duration) {
                    requestAnimationFrame(monitor);
                } else {
                    this.isMonitoring = false;
                    const avgLevel = totalLevel / sampleCount;

                    // Generate results
                    let success = true;
                    let message = "";
                    const recommendations: string[] = [];

                    if (maxLevel < 0.01) {
                        success = false;
                        message =
                            "No audio detected. Microphone may be muted or broken.";
                        recommendations.push("Check if microphone is muted");
                        recommendations.push("Verify microphone is connected");
                        recommendations.push("Try speaking louder");
                    } else if (maxLevel < 0.05) {
                        success = false;
                        message =
                            "Audio level very low. Speech may not be detected properly.";
                        recommendations.push("Move closer to microphone");
                        recommendations.push(
                            "Increase microphone volume in system settings"
                        );
                        recommendations.push("Speak louder");
                    } else if (maxLevel < 0.15) {
                        success = true;
                        message =
                            "Audio level low but acceptable. Consider increasing volume.";
                        recommendations.push(
                            "Consider moving closer to microphone"
                        );
                        recommendations.push(
                            "You may want to speak a bit louder"
                        );
                    } else if (maxLevel < 0.7) {
                        success = true;
                        message =
                            "Audio level good. Should work well for transcription.";
                    } else {
                        success = true;
                        message =
                            "Audio level high. Excellent for transcription.";
                    }

                    console.log(
                        `[AudioTest] ✅ Test complete - Max: ${(
                            maxLevel * 100
                        ).toFixed(1)}%, Avg: ${(avgLevel * 100).toFixed(1)}%`
                    );

                    resolve({
                        success,
                        maxLevel,
                        avgLevel,
                        message,
                        recommendations,
                    });
                }
            };

            monitor();
        });
    }

    private cleanup() {
        this.isMonitoring = false;

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }

        if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    // Quick test without UI feedback
    static async quickTest(): Promise<boolean> {
        const tester = new AudioTester();
        const result = await tester.testMicrophone();
        return result.success && result.maxLevel > 0.05;
    }
}

export const audioTester = new AudioTester();
