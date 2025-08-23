
import { MicVAD } from "@ricky0123/vad-web";

interface AudioProcessorConfig {
    sampleRate: number;
    frameSize: number;
    noiseGateThreshold: number;
    compressionRatio: number;
    gainBoost: number;
}

export class VADAudioProcessor {
    private audioContext: AudioContext | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private gainNode: GainNode | null = null;
    private secondaryGainNode: GainNode | null = null; // Additional gain stage
    private dynamicsCompressor: DynamicsCompressorNode | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private vad: MicVAD | null = null;
    private isProcessing = false;
    private config: AudioProcessorConfig;

    // Callbacks
    public onSpeechStart?: () => void;
    public onSpeechEnd?: () => void;
    public onAudioData?: (audioData: Float32Array) => void;

    // Audio monitoring
    private audioLevelCallback?: (level: number, maxLevel: number) => void;
    private audioMonitoringInterval?: NodeJS.Timeout;

    constructor(config: Partial<AudioProcessorConfig> = {}) {
        this.config = {
            sampleRate: 16000,
            frameSize: 512,
            noiseGateThreshold: -60, // More sensitive (was -50dB)
            compressionRatio: 6, // Stronger compression to normalize volume
            gainBoost: 2.0, // Drastically reduced from 15.0 to prevent clipping
            ...config,
        };
    }

    async initialize(stream: MediaStream): Promise<void> {
        try {
            // Create audio context
            this.audioContext = new AudioContext({
                sampleRate: this.config.sampleRate,
            });

            // Create source from stream
            this.sourceNode = this.audioContext.createMediaStreamSource(stream);

            // Create gain node for volume boost - Conservative gain
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.config.gainBoost * 1.0; // Reduce multiplier from 1.5x to 1.0x

            // Create secondary gain node for additional amplification
            this.secondaryGainNode = this.audioContext.createGain();
            this.secondaryGainNode.gain.value = 1.5; // Drastically reduce from 3.0 to 1.5

            // Create dynamics compressor for better speech clarity - More moderate settings
            this.dynamicsCompressor =
                this.audioContext.createDynamicsCompressor();
            this.dynamicsCompressor.threshold.value = -24; // Slightly lower threshold
            this.dynamicsCompressor.knee.value = 30; // Moderate knee
            this.dynamicsCompressor.ratio.value = 4; // Reduce ratio for gentler compression
            this.dynamicsCompressor.attack.value = 0.003; // Slightly slower attack
            this.dynamicsCompressor.release.value = 0.1; // Slower release to prevent pumping

            // Connect audio chain: source -> compressor -> gain -> secondary gain
            this.sourceNode.connect(this.dynamicsCompressor);
            this.dynamicsCompressor.connect(this.gainNode);
            this.gainNode.connect(this.secondaryGainNode);

            // Setup VAD
            await this.setupVAD(stream);

            console.log("[VAD Audio] Processor initialized successfully");
            console.log(
                `[VAD Audio] Total gain boost: ${
                    this.config.gainBoost * 1.0
                } x ${this.secondaryGainNode.gain.value} = ${
                    this.config.gainBoost *
                    1.0 *
                    this.secondaryGainNode.gain.value
                }x`
            );
        } catch (error) {
            console.error("[VAD Audio] Failed to initialize processor:", error);
            throw error;
        }
    }

    private async setupVAD(stream: MediaStream): Promise<void> {
        try {
            this.vad = await MicVAD.new({
                stream,
                onSpeechStart: () => {
                    console.log(
                        "[VAD] Speech started - enhanced audio detected"
                    );
                    this.isProcessing = true;
                    this.onSpeechStart?.();
                },
                onSpeechEnd: () => {
                    console.log("[VAD] Speech ended");
                    this.isProcessing = false;
                    this.onSpeechEnd?.();
                },
                onVADMisfire: () => {
                    console.log(
                        "[VAD] Misfire detected - ignoring false positive"
                    );
                },
                positiveSpeechThreshold: 0.6, // Reduce sensitivity (was 0.3) - need higher confidence
                negativeSpeechThreshold: 0.3, // Increase silence threshold (was 0.1)
                preSpeechPadFrames: 10, // Reduce padding (was 15)
                redemptionFrames: 8, // Reduce hold time (was 12)
                frameSamples: 1536, // Audio frame size
                minSpeechFrames: 5, // Increase minimum speech frames (was 3)
                submitUserSpeechOnPause: true, // Submit audio when user pauses
            });

            // Start audio level monitoring
            this.startAudioLevelMonitoring();

            console.log("[VAD] Voice Activity Detection initialized");
        } catch (error) {
            console.error("[VAD] Failed to setup VAD:", error);
            throw error;
        }
    }

    // NOTE: Removed unused processAudioFrame and softCompress methods
    // Audio processing now handled by Web Audio API nodes (gain + compressor)

    // Get enhanced audio stream for transmission
    getEnhancedStream(): MediaStream | null {
        if (!this.audioContext || !this.secondaryGainNode) {
            return null;
        }

        try {
            // Create destination for enhanced audio
            const destination =
                this.audioContext.createMediaStreamDestination();
            this.secondaryGainNode.connect(destination); // Connect from final gain stage

            return destination.stream;
        } catch (error) {
            console.error(
                "[VAD Audio] Failed to create enhanced stream:",
                error
            );
            return null;
        }
    }

    // Start VAD processing
    start(): void {
        if (this.vad) {
            this.vad.start();
            console.log(
                "[VAD] Started voice activity detection with audio enhancement"
            );
        }
    }

    // Pause VAD processing
    pause(): void {
        if (this.vad) {
            this.vad.pause();
            console.log("[VAD] Paused voice activity detection");
        }
    }

    // Check if currently processing speech
    isSpeechActive(): boolean {
        return this.isProcessing;
    }

    // Update processing parameters in real-time
    updateConfig(newConfig: Partial<AudioProcessorConfig>): void {
        this.config = { ...this.config, ...newConfig };

        if (this.gainNode) {
            this.gainNode.gain.value = this.config.gainBoost * 1.5; // Keep the 1.5x multiplier
        }

        if (this.secondaryGainNode) {
            // Moderate secondary gain
            this.secondaryGainNode.gain.value = Math.max(
                3.0, // Reduced from 5.0
                this.config.gainBoost * 0.3
            );
        }

        if (this.dynamicsCompressor) {
            this.dynamicsCompressor.threshold.value =
                this.config.noiseGateThreshold;
            this.dynamicsCompressor.ratio.value = this.config.compressionRatio;
        }

        console.log("[VAD Audio] Updated config:", this.config);
        console.log(
            "[VAD Audio] Total gain:",
            this.config.gainBoost *
                1.5 *
                (this.secondaryGainNode?.gain.value || 1)
        );
    }

    // Cleanup resources
    destroy(): void {
        console.log("[VAD] Destroying VAD Audio Processor");

        this.stopAudioLevelMonitoring();

        if (this.vad) {
            this.vad.destroy();
            this.vad = null;
        }

        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }

        if (this.dynamicsCompressor) {
            this.dynamicsCompressor.disconnect();
            this.dynamicsCompressor = null;
        }

        if (this.secondaryGainNode) {
            this.secondaryGainNode.disconnect();
            this.secondaryGainNode = null;
        }

        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.isProcessing = false;
        console.log("[VAD] ✅ VAD Audio Processor destroyed successfully");
    }

    public setAudioLevelCallback(
        callback: (level: number, maxLevel: number) => void
    ) {
        this.audioLevelCallback = callback;
    }

    private startAudioLevelMonitoring() {
        if (this.audioMonitoringInterval) {
            clearInterval(this.audioMonitoringInterval);
        }

        (this as any).maxAudioLevel = 0;
        (this as any).sampleCount = 0;

        this.audioMonitoringInterval = setInterval(() => {
            const maxAudioLevel = (this as any).maxAudioLevel || 0;
            const sampleCount = (this as any).sampleCount || 0;

            if (this.audioLevelCallback && sampleCount > 0) {
                this.audioLevelCallback(maxAudioLevel, 1.0);
                console.log(
                    `[VAD] Audio Level Monitor: max=${(
                        maxAudioLevel * 100
                    ).toFixed(1)}% over last second (${sampleCount} samples)`
                );
                if (maxAudioLevel < 0.01) {
                    console.warn(
                        `[VAD] Very low audio level detected (${(
                            maxAudioLevel * 100
                        ).toFixed(3)}%), check microphone volume!`
                    );
                } else if (maxAudioLevel > 0.1) {
                    console.log(
                        `[VAD] Good audio level detected (${(
                            maxAudioLevel * 100
                        ).toFixed(1)}%)`
                    );
                }
                (this as any).maxAudioLevel = 0;
                (this as any).sampleCount = 0;
            }
        }, 1000);
    }

    private stopAudioLevelMonitoring() {
        if (this.audioMonitoringInterval) {
            clearInterval(this.audioMonitoringInterval);
            this.audioMonitoringInterval = undefined;
        }
    }
}
