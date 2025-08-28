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

/**
 * Voice Activity Detector (VAD) Service
 * Detects speech activity and manages audio recording
 */

export interface VADConfig {
    /** Sample rate for audio processing */
    sampleRate: number;
    /** Frame size in samples for VAD analysis */
    frameSize: number;
    /** Energy threshold for speech detection */
    energyThreshold: number;
    /** Zero crossing rate threshold */
    zcrThreshold: number;
    /** Minimum duration for speech detection (ms) */
    minSpeechDuration: number;
    /** Silence duration before stopping recording (ms) */
    silenceDuration: number;
    /** Maximum recording duration (ms) */
    maxRecordingDuration: number;
}

export interface VADAudioChunk {
    buffer: Float32Array;
    timestamp: number;
    duration: number;
}

export interface VADEvents {
    onSpeechStart: () => void;
    onSpeechEnd: (audioBuffer: Uint8Array, duration: number) => void;
    onError: (error: Error) => void;
}

export class VoiceActivityDetector {
    private config: VADConfig;
    private events: VADEvents;

    // Audio recording
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private audioWorkletNode: AudioWorkletNode | null = null;
    private recordedChunks: VADAudioChunk[] = [];

    // VAD state
    private isListening = false;
    private isRecording = false;
    private speechStartTime = 0;
    private lastSpeechTime = 0;
    private microphoneEnabled = true;

    // Enhanced VAD state
    private speechFrameCount = 0;
    private speechConfirmationFrames = 3; // Need 3 consecutive frames to confirm speech

    // Timers
    private silenceTimer: NodeJS.Timeout | null = null;
    private maxDurationTimer: NodeJS.Timeout | null = null;

    constructor(config: Partial<VADConfig> = {}, events: VADEvents) {
        this.config = {
            sampleRate: 16000,
            frameSize: 1024,
            energyThreshold: 0.01,
            zcrThreshold: 0.3,
            minSpeechDuration: 300,
            silenceDuration: 500,
            maxRecordingDuration: 30000,
            ...config,
        };

        this.events = events;
    }

    /**
     * Initialize VAD with global audio stream
     */
    async initialize(globalAudioStream: MediaStream): Promise<void> {
        try {
            this.mediaStream = globalAudioStream;

            // Create audio context with browser compatibility
            this.audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)({
                sampleRate: this.config.sampleRate,
            });

            // Resume audio context if suspended (required by some browsers)
            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            // Register audio worklet processor
            try {
                await this.audioContext.audioWorklet.addModule(
                    "/audio-worklet-processor.js"
                );
            } catch (workletError) {
                console.error(
                    "[VAD] Failed to load audio worklet:",
                    workletError
                );
                throw new Error(
                    "Audio worklet loading failed. Make sure audio-worklet-processor.js is accessible."
                );
            }

            // Create worklet node
            this.audioWorkletNode = new AudioWorkletNode(
                this.audioContext,
                "audio-worklet-processor",
                {
                    processorOptions: {
                        frameSize: this.config.frameSize,
                    },
                }
            );

            // Handle processed audio data
            this.audioWorkletNode.port.onmessage = (event) => {
                const { audioData, timestamp } = event.data;
                this.processAudioFrame(audioData, timestamp);
            };

            // Handle worklet errors
            this.audioWorkletNode.port.onmessageerror = (error) => {
                console.error("[VAD] Worklet message error:", error);
                this.events.onError(new Error("Audio worklet message error"));
            };

            // Connect audio stream to worklet
            const source = this.audioContext.createMediaStreamSource(
                this.mediaStream
            );
            source.connect(this.audioWorkletNode);
            // Note: Don't connect to destination to avoid feedback
            // this.audioWorkletNode.connect(this.audioContext.destination);

            console.log("[VAD] Initialized successfully");
        } catch (error) {
            console.error("[VAD] Initialization failed:", error);
            this.events.onError(
                new Error(`VAD initialization failed: ${error.message}`)
            );
            throw error;
        }
    }

    /**
     * Start listening for speech activity
     */
    startListening(): void {
        if (!this.audioContext || !this.microphoneEnabled) {
            console.warn(
                "[VAD] Cannot start listening - not initialized or mic disabled"
            );
            return;
        }

        this.isListening = true;
        console.log("[VAD] Started listening for speech activity");
    }

    /**
     * Stop listening for speech activity
     */
    stopListening(): void {
        this.isListening = false;

        if (this.isRecording) {
            this.stopRecording();
        }

        console.log("[VAD] Stopped listening");
    }

    /**
     * Set microphone enabled state
     */
    setMicrophoneEnabled(enabled: boolean): void {
        this.microphoneEnabled = enabled;

        if (!enabled) {
            // When mic is disabled, stop recording and reset speaking state
            if (this.isRecording) {
                this.stopRecording();
            }
            // Reset speech frame count to prevent false positives
            this.speechFrameCount = 0;
        }

        console.log(`[VAD] Microphone ${enabled ? "enabled" : "disabled"}`);
    }

    /**
     * Process audio frame for VAD
     */
    private processAudioFrame(
        audioData: Float32Array,
        timestamp: number
    ): void {
        // Check if we should process audio
        if (!this.isListening || !this.microphoneEnabled) {
            return;
        }

        // Check for silence in audio data
        const nonZeroSamples = audioData.filter(
            (sample) => Math.abs(sample) > 0.001
        ).length;
        const silencePercentage =
            ((audioData.length - nonZeroSamples) / audioData.length) * 100;

        if (silencePercentage > 98) {
            // Nearly complete silence - likely microphone is disabled
            if (this.isRecording) {
                console.log("[VAD] Detected silence, stopping recording");
                this.stopRecording();
            }
            return;
        }

        // Additional check: verify the actual audio tracks are enabled
        if (this.mediaStream) {
            const audioTracks = this.mediaStream.getAudioTracks();
            const hasEnabledTrack = audioTracks.some((track) => track.enabled);

            if (!hasEnabledTrack) {
                // Audio tracks are disabled, don't process
                return;
            }
        }

        // Calculate audio features
        const energy = this.calculateEnergy(audioData);
        const zcr = this.calculateZeroCrossingRate(audioData);

        // Enhanced VAD logic with confirmation frames
        const isSpeech =
            energy > this.config.energyThreshold &&
            zcr < this.config.zcrThreshold;

        // Speech confirmation logic - need multiple consecutive frames
        if (isSpeech) {
            this.speechFrameCount++;
        } else {
            this.speechFrameCount = 0; // Reset on silence
        }

        const confirmedSpeech =
            this.speechFrameCount >= this.speechConfirmationFrames;

        // Enhanced debug logging - always log when energy is above minimal threshold
        const shouldLog =
            Math.random() < 0.05 || // Increase logging frequency for debugging
            energy > 0.00001 ||
            isSpeech ||
            confirmedSpeech;
        if (shouldLog) {
            // Calculate additional metrics for debugging
            const maxAmplitude = Math.max(
                ...Array.from(audioData).map(Math.abs)
            );
            const rms = Math.sqrt(energy);
            console.log(
                `[VAD] Energy: ${energy.toFixed(8)}, RMS: ${rms.toFixed(
                    6
                )}, Max: ${maxAmplitude.toFixed(6)}, ZCR: ${zcr.toFixed(
                    4
                )}, Threshold: ${
                    this.config.energyThreshold
                }, Speech: ${isSpeech}, Confirmed: ${confirmedSpeech}, Frames: ${
                    this.speechFrameCount
                }/${this.speechConfirmationFrames}, Recording: ${
                    this.isRecording
                }`
            );
        }

        if (confirmedSpeech) {
            this.handleSpeechDetected(audioData, timestamp);
        } else {
            this.handleSilenceDetected(audioData, timestamp);
        }
    }

    /**
     * Handle speech detection
     */
    private handleSpeechDetected(
        audioData: Float32Array,
        timestamp: number
    ): void {
        this.lastSpeechTime = timestamp;

        if (!this.isRecording) {
            this.startRecording(timestamp);
        }

        // Add audio chunk to recording
        if (this.isRecording) {
            this.recordedChunks.push({
                buffer: new Float32Array(audioData),
                timestamp,
                duration: (audioData.length / this.config.sampleRate) * 1000,
            });
        }

        // Clear silence timer
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    /**
     * Handle silence detection
     */
    private handleSilenceDetected(
        audioData: Float32Array,
        timestamp: number
    ): void {
        if (this.isRecording) {
            // Continue recording during short silences
            this.recordedChunks.push({
                buffer: new Float32Array(audioData),
                timestamp,
                duration: (audioData.length / this.config.sampleRate) * 1000,
            });

            // Start silence timer if not already started
            if (!this.silenceTimer) {
                this.silenceTimer = setTimeout(() => {
                    const silenceDuration = timestamp - this.lastSpeechTime;
                    if (silenceDuration >= this.config.silenceDuration) {
                        this.stopRecording();
                    }
                }, this.config.silenceDuration);
            }
        }
    }

    /**
     * Start recording
     */
    private startRecording(timestamp: number): void {
        this.speechStartTime = timestamp;
        this.isRecording = true;
        this.recordedChunks = [];

        // Set maximum recording duration timer
        this.maxDurationTimer = setTimeout(() => {
            console.warn("[VAD] Maximum recording duration reached");
            this.stopRecording();
        }, this.config.maxRecordingDuration);

        console.log("[VAD] Started recording");
        this.events.onSpeechStart();
    }

    /**
     * Stop recording and process audio
     */
    private stopRecording(): void {
        if (!this.isRecording) return;

        this.isRecording = false;

        // Clear timers
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.maxDurationTimer) {
            clearTimeout(this.maxDurationTimer);
            this.maxDurationTimer = null;
        }

        // Check minimum speech duration
        const totalDuration = this.recordedChunks.reduce(
            (sum, chunk) => sum + chunk.duration,
            0
        );

        if (totalDuration < this.config.minSpeechDuration) {
            console.log(
                `[VAD] Recording too short (${totalDuration}ms), discarding`
            );
            this.recordedChunks = [];
            return;
        }

        // Convert recorded chunks to final audio buffer
        const finalBuffer = this.combineAudioChunks(this.recordedChunks);
        //DEBUG: Log final buffer for debugging
        console.log("Final Buffer: ", finalBuffer);

        console.log(
            `[VAD] Stopped recording - Duration: ${totalDuration}ms, Buffer size: ${finalBuffer.length} bytes`
        );

        // Send to callback
        this.events.onSpeechEnd(finalBuffer, totalDuration);

        // Clear recorded chunks
        this.recordedChunks = [];
    }

    /**
     * Combine audio chunks into final buffer
     */
    private combineAudioChunks(chunks: VADAudioChunk[]): Uint8Array {
        // Calculate total samples
        const totalSamples = chunks.reduce(
            (sum, chunk) => sum + chunk.buffer.length,
            0
        );

        // Create combined float array
        const combinedFloat = new Float32Array(totalSamples);
        let offset = 0;

        for (const chunk of chunks) {
            combinedFloat.set(chunk.buffer, offset);
            offset += chunk.buffer.length;
        }

        // Convert to 16-bit PCM with better handling
        const pcmBuffer = new Uint8Array(totalSamples * 2);
        const view = new DataView(pcmBuffer.buffer);

        // Track conversion metrics for debugging
        let clippedSamples = 0;
        let maxInputSample = 0;
        let minInputSample = 0;

        for (let i = 0; i < totalSamples; i++) {
            const inputSample = combinedFloat[i];
            maxInputSample = Math.max(maxInputSample, Math.abs(inputSample));
            minInputSample = Math.min(minInputSample, inputSample);

            // Clamp and convert to 16-bit
            let clampedSample = inputSample;
            if (inputSample > 1) {
                clampedSample = 1;
                clippedSamples++;
            } else if (inputSample < -1) {
                clampedSample = -1;
                clippedSamples++;
            }

            const pcmSample = Math.round(clampedSample * 32767);
            view.setInt16(i * 2, pcmSample, true); // little-endian
        }

        // Log conversion metrics occasionally
        if (Math.random() < 0.1) {
            // 10% chance
            console.log(
                `[VAD PCM Conversion] Samples: ${totalSamples}, Clipped: ${clippedSamples}, Max: ${maxInputSample.toFixed(
                    6
                )}, Min: ${minInputSample.toFixed(6)}`
            );
        }

        return pcmBuffer;
    }

    /**
     * Calculate energy of audio frame
     */
    private calculateEnergy(audioData: Float32Array): number {
        let energy = 0;
        let maxSample = 0;
        let minSample = 0;

        for (let i = 0; i < audioData.length; i++) {
            const sample = audioData[i];
            energy += sample * sample;
            maxSample = Math.max(maxSample, Math.abs(sample));
            minSample = Math.min(minSample, sample);
        }

        // Log audio levels occasionally for debugging
        if (Math.random() < 0.001) {
            // 0.1% chance
            console.log(
                `[VAD Audio Levels] Max: ${maxSample.toFixed(
                    6
                )}, Min: ${minSample.toFixed(6)}, RMS: ${Math.sqrt(
                    energy / audioData.length
                ).toFixed(6)}`
            );
        }

        return energy / audioData.length;
    }

    /**
     * Calculate zero crossing rate
     */
    private calculateZeroCrossingRate(audioData: Float32Array): number {
        let crossings = 0;
        for (let i = 1; i < audioData.length; i++) {
            if (audioData[i] >= 0 !== audioData[i - 1] >= 0) {
                crossings++;
            }
        }
        return crossings / (audioData.length - 1);
    }

    /**
     * Get current VAD state with detailed info
     */
    getState() {
        const audioTracks = this.mediaStream?.getAudioTracks() || [];
        return {
            isListening: this.isListening,
            isRecording: this.isRecording,
            microphoneEnabled: this.microphoneEnabled,
            hasStream: !!this.mediaStream,
            audioTracksCount: audioTracks.length,
            audioTracksEnabled: audioTracks.map((track) => ({
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState,
            })),
        };
    }

    /**
     * Get current recording buffer for periodic sending
     * Returns the currently recorded audio without stopping the recording
     */
    getCurrentRecording(): Uint8Array | null {
        if (!this.isRecording || this.recordedChunks.length === 0) {
            return null;
        }

        // Combine current chunks into buffer
        return this.combineAudioChunks(this.recordedChunks);
    }

    /**
     * Clear current recording chunks (used after periodic sending)
     * Keeps recording active but clears accumulated data
     */
    clearCurrentRecording(): void {
        if (this.isRecording) {
            this.recordedChunks = [];
            console.log("[VAD] Cleared current recording chunks");
        }
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        this.stopListening();

        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        if (this.maxDurationTimer) {
            clearTimeout(this.maxDurationTimer);
        }

        if (this.audioWorkletNode) {
            this.audioWorkletNode.disconnect();
        }

        if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close();
        }

        console.log("[VAD] Cleaned up");
    }
}
