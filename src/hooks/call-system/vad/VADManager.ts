import { CallSystemContext } from "../types";
import { VoiceActivityDetector, VADConfig } from "../../../services/VoiceActivityDetector";
import { VADAudioProcessor } from "@/services/vad-audio-processor";
import vadConfig from "@/configs/vadconfig";

/**
 * VAD Manager - Manages Voice Activity Detection for the call system
 */
export class VADManager {
    private context: CallSystemContext;
    private vadInstance: VoiceActivityDetector | null = null;
    private isInitialized = false;
    private useRawAudio = false; // Option to bypass VADAudioProcessor

    // Periodic audio sending
    private chunkStartTime: number = 0;
    private sendIntervalTimer: NodeJS.Timeout | null = null;
    private readonly CHUNK_DURATION = 15000; // 15 seconds

    // Audio recordings storage for debugging (với giới hạn memory)
    // private recordings: Array<{
    //     id: string;
    //     timestamp: number;
    //     duration: number;
    //     audioBuffer: Uint8Array;
    //     sampleRate: number;
    //     channels: number;
    // }> = [];
    private readonly MAX_RECORDINGS = 5; // Giảm từ 5 xuống 3 để tiết kiệm memory
    private readonly MAX_RECORDING_SIZE = 48000; // Giới hạn size mỗi recording (3s at 16kHz)

    constructor(context: CallSystemContext, useRawAudio = false) {
        this.context = context;
        this.useRawAudio = useRawAudio;

        // Cleanup any existing timers để tránh memory leak
        this.cleanup();
    }

    /**
     * Initialize VAD with current local stream
     */
    async initialize(): Promise<void> {
        console.log("[VADManager] ===== INITIALIZE VAD =====");

        try {
            const localStream = this.context.refs.localStreamRef.current;

            console.log("[VADManager] Checking preconditions:", {
                hasLocalStream: !!localStream,
                audioTracks: localStream?.getAudioTracks().length || 0,
            });

            if (!localStream) {
                throw new Error("No local audio stream available for VAD");
            }

            // Check if stream has audio tracks
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error("Local stream has no audio tracks");
            }

            console.log("[VADManager] Audio tracks info:", {
                count: audioTracks.length,
                enabled: audioTracks.map((t) => t.enabled),
                labels: audioTracks.map((t) => t.label),
            });

            // VAD events
            const vadEvents = {
                onSpeechStart: () => {
                    console.log("[VADManager] ===== SPEECH START DETECTED =====");
                    console.log("[VADManager] Timestamp:", new Date().toISOString());

                    // Check microphone state
                    const micEnabled = this.isMicrophoneEnabled();
                    console.log("[VADManager] Microphone state:", {
                        enabled: micEnabled,
                        localStream: !!this.context.refs.localStreamRef.current,
                        audioTracks: this.context.refs.localStreamRef.current?.getAudioTracks().length || 0,
                        audioTrackEnabled: this.context.refs.localStreamRef.current?.getAudioTracks()[0]?.enabled,
                    });

                    // Check socket state
                    const socket = this.context.refs.socketRef.current;
                    console.log("[VADManager] Socket state:", {
                        hasSocket: !!socket,
                        socketId: socket?.id,
                        isConnected: socket?.connected,
                        roomId: this.context.roomId,
                        username: this.context.room.username,
                    });

                    // Only set speaking to true if microphone is enabled
                    if (micEnabled) {
                        console.log("[VADManager] ✓ Microphone enabled - proceeding with speech start");
                        console.log("[VADManager] Setting isSpeaking to true");
                        this.context.setters.setIsSpeaking(true);

                        console.log("[VADManager] Calling handleSpeechStart");
                        this.handleSpeechStart();

                        console.log("[VADManager] Starting periodic sending");
                        this.startPeriodicSending();
                    } else {
                        console.warn("[VADManager] ✗ Mic disabled, ignoring speech start");
                    }
                    console.log("[VADManager] ===== SPEECH START PROCESSING COMPLETE =====");
                },

                onSpeechEnd: (audioBuffer: Uint8Array, duration: number) => {
                    console.log("[VADManager] ===== SPEECH END DETECTED =====");
                    console.log(`[VADManager] Speech ended - Duration: ${duration}ms, Buffer: ${audioBuffer.length} bytes`);
                    console.log("[VADManager] Timestamp:", new Date().toISOString());

                    this.context.setters.setIsSpeaking(false);

                    // Store recording for debugging
                    this.storeRecording(audioBuffer, duration);

                    // Stop periodic sending and send final chunk
                    this.stopPeriodicSending();

                    // Only send to server if mic was enabled during recording
                    const micEnabled = this.isMicrophoneEnabled();
                    console.log("[VADManager] Microphone state on speech end:", micEnabled);

                    if (micEnabled) {
                        console.log("[VADManager] ✓ Mic enabled - sending final audio buffer");
                        this.handleSpeechEnd(audioBuffer, duration);
                    } else {
                        console.warn("[VADManager] ✗ Mic disabled - not sending audio buffer");
                    }
                    console.log("[VADManager] ===== SPEECH END PROCESSING COMPLETE =====");
                },

                // Placeholder for future periodic chunk support

                onError: (error: Error) => {
                    console.error("[VADManager] VAD Error:", error);
                    this.context.setters.setError(`VAD Error: ${error.message}`);
                },
            };

            // Create and initialize VAD
            this.vadInstance = new VoiceActivityDetector(vadConfig, vadEvents);

            let streamForVAD = localStream;

            if (this.useRawAudio) {
                // Use original stream directly - matches vad-debug behavior
                streamForVAD = localStream;
            } else {
                console.log("[VADManager] Using enhanced audio stream with VADAudioProcessor");
                // 1. Boost volume bằng VADAudioProcessor
                const vadProcessor = new VADAudioProcessor();
                await vadProcessor.initialize(localStream);

                // 2. Get enhanced stream
                const enhancedStream = vadProcessor.getEnhancedStream();
                if (enhancedStream) {
                    streamForVAD = enhancedStream;
                } else {
                    console.warn("[VADManager] Failed to get enhanced stream, using original");
                    streamForVAD = localStream;
                }
            }

            // 3. Pass to VAD
            await this.vadInstance.initialize(streamForVAD);

            this.isInitialized = true;
            console.log("[VADManager] ✓✓✓ VAD initialized successfully ✓✓✓");

            // Auto-start listening if microphone is enabled
            const micEnabled = this.isMicrophoneEnabled();
            console.log("[VADManager] Checking if should auto-start listening:", {
                micEnabled,
                willAutoStart: micEnabled,
            });

            if (micEnabled) {
                console.log("[VADManager] Auto-starting VAD listening...");
                this.startListening();
            } else {
                console.log("[VADManager] Microphone disabled, not auto-starting");
            }

            console.log("[VADManager] ===== INITIALIZE COMPLETE =====");
        } catch (error) {
            console.error("[VADManager] ===== INITIALIZE FAILED =====");
            console.error("[VADManager] Failed to initialize VAD:", error);
            this.context.setters.setError(`Failed to initialize voice detection: ${error.message}`);
            throw error;
        }
    }

    /**
     * Start VAD listening based on microphone state
     */
    startListening(): void {
        console.log("[VADManager] ===== START LISTENING CALLED =====");

        if (!this.vadInstance || !this.isInitialized) {
            console.warn("[VADManager] ✗ VAD not initialized", {
                hasVadInstance: !!this.vadInstance,
                isInitialized: this.isInitialized,
            });
            return;
        }

        // Check if microphone is enabled (check if local stream has audio tracks)
        const localStream = this.context.refs.localStreamRef.current;
        const microphoneEnabled = this.isMicrophoneEnabled();

        console.log("[VADManager] Microphone check:", {
            hasLocalStream: !!localStream,
            microphoneEnabled,
            audioTracks: localStream?.getAudioTracks().length || 0,
            audioTrackEnabled: localStream?.getAudioTracks()[0]?.enabled,
        });

        if (!this.isMicrophoneEnabled()) {
            console.log("[VADManager] ✗ Microphone disabled, not starting VAD");
            return;
        }

        console.log("[VADManager] ✓ Starting VAD listening");
        this.vadInstance.setMicrophoneEnabled(true);
        this.vadInstance.startListening();
        console.log("[VADManager] ✓ VAD listening started successfully");
    }

    /**
     * Stop VAD listening
     */
    stopListening(): void {
        if (this.vadInstance) {
            this.vadInstance.stopListening();
        }
    }

    /**
     * Update microphone state for VAD
     */
    updateMicrophoneState(enabled: boolean): void {
        console.log("[VADManager] ===== UPDATE MICROPHONE STATE =====", {
            enabled,
            hasVadInstance: !!this.vadInstance,
            currentListeningState: this.vadInstance?.getState().isListening,
            currentRecordingState: this.vadInstance?.getState().isRecording,
        });

        if (this.vadInstance) {
            // Update VAD's internal microphone state
            this.vadInstance.setMicrophoneEnabled(enabled);

            // If microphone is disabled, stop listening entirely
            // If enabled, start listening again
            if (enabled) {
                console.log("[VADManager] ✓ Microphone enabled - starting VAD listening");
                this.vadInstance.startListening();
            } else {
                console.log("[VADManager] ✗ Microphone disabled - stopping VAD listening");
                this.vadInstance.stopListening();
                // Also stop any periodic sending
                this.stopPeriodicSending();
                // IMPORTANT: Set speaking to false when mic is turned off
                this.context.setters.setIsSpeaking(false);
            }
        }

        console.log("[VADManager] Microphone state updated successfully");
    }

    /**
     * Store recording for debugging purposes với memory management
     */
    private storeRecording(audioBuffer: Uint8Array, duration: number): void {
        if (audioBuffer.length > 1000 && duration > 500) {
            let bufferToStore = audioBuffer;
            if (audioBuffer.length > this.MAX_RECORDING_SIZE) {
                bufferToStore = audioBuffer.slice(0, this.MAX_RECORDING_SIZE);
            }

            // Remove oldest recordings để giới hạn memory usage
            // while (this.recordings.length >= this.MAX_RECORDINGS) {
            //     this.recordings.shift();
            // }

            const recording = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                duration,
                audioBuffer: bufferToStore,
                sampleRate: 16000,
                channels: 1,
            };

            // this.recordings.push(recording);
        }
    }

    /**
     * Get stored recordings for debugging
     */
    // getRecordings() {
    //     return [...this.recordings]; // Return a copy
    // }

    /**
     * Check if microphone is enabled
     */
    private isMicrophoneEnabled(): boolean {
        const localStream = this.context.refs.localStreamRef.current;
        const audioTracks = localStream?.getAudioTracks() || [];
        return audioTracks.some((track) => track.enabled);
    }

    /**
     * Clear stored recordings
     */
    // clearRecordings(): void {
    //     this.recordings = [];
    // }
    private handleSpeechStart(): void {
        const socket = this.context.refs.socketRef.current;
        const { roomId, room } = this.context;

        console.log("[VADManager] handleSpeechStart called", {
            hasSocket: !!socket,
            isConnected: socket?.connected,
            roomId,
            peerId: room.username,
        });

        if (socket && socket.connected) {
            console.log("[VADManager] Emitting sfu:my-speaking event", {
                roomId,
                peerId: room.username,
            });

            socket.emit("sfu:my-speaking", {
                roomId,
                peerId: room.username,
            });

            console.log("[VADManager] sfu:my-speaking event emitted successfully");
        } else {
            console.warn("[VADManager] Cannot emit sfu:my-speaking - socket not available or not connected", {
                hasSocket: !!socket,
                isConnected: socket?.connected,
            });
        }
    }

    /**
     * Handle speech end event and send final audio buffer
     */
    private handleSpeechEnd(audioBuffer: Uint8Array, duration: number): void {
        this.sendAudioBuffer(audioBuffer, duration, true); // true = final chunk
    }

    /**
     * Send audio buffer to server
     */
    private sendAudioBuffer(audioBuffer: Uint8Array, duration: number, isFinal: boolean): void {
        const socket = this.context.refs.socketRef.current;
        const { roomId, room } = this.context;

        if (!socket || !socket.connected) {
            console.warn("[VADManager] Socket not connected, cannot send audio buffer");
            return;
        }

        if (audioBuffer.length === 0) {
            console.warn("[VADManager] Empty audio buffer, not sending");
            return;
        }

        // For final chunks, always send even if microphone is disabled
        // (because user might have disabled mic after speaking)
        if (!isFinal && !this.isMicrophoneEnabled()) {
            console.log("[VADManager] Microphone disabled, not sending periodic audio buffer");
            return;
        }

        // Check for silence - count non-zero bytes
        const nonZeroBytes = audioBuffer.filter((b) => b !== 0).length;
        const silencePercentage = ((audioBuffer.length - nonZeroBytes) / audioBuffer.length) * 100;

        if (silencePercentage > 95) {
            return;
        }

        // Check buffer size - prevent sending extremely large buffers
        // 16kHz * 2 bytes/sample * 15 seconds = 480,000 bytes max
        const MAX_BUFFER_SIZE = 480000; // ~15 seconds at 16kHz (16-bit PCM)
        if (audioBuffer.length > MAX_BUFFER_SIZE) {
            audioBuffer = audioBuffer.slice(0, MAX_BUFFER_SIZE);
        }

        // Prepare audio data for server (matching server's expected format)
        const audioData = {
            userId: room.username,
            roomId,
            roomKey: room.roomKey || null, // NEW: Send roomKey for semantic context isolation
            timestamp: Date.now(),
            buffer: audioBuffer, // Send Uint8Array directly - socket.io can handle it
            duration,
            sampleRate: 16000,
            channels: 1,
            isFinal, // Indicate if this is the final chunk or periodic chunk
            orgId: room.organizationId || null,
        };

        // Listen for audio errors from server
        socket.once("audio:error", (errorData) => {
            console.error("[VADManager] Server audio error:", errorData);
            this.context.setters.setError(`Audio processing error: ${errorData.message}`);
        });

        // Send audio buffer to server for processing
        socket.emit("audio:buffer", audioData);

        // Only send stop speaking signal for final chunks
        if (isFinal) {
            console.log("[VADManager] Emitting sfu:my-stop-speaking event", {
                roomId,
                peerId: room.username,
            });

            socket.emit("sfu:my-stop-speaking", {
                roomId,
                peerId: room.username,
            });

            console.log("[VADManager] sfu:my-stop-speaking event emitted successfully");
        }
    }

    /**
     * Start periodic sending of audio chunks every 10 seconds during speech
     */
    private startPeriodicSending(): void {
        this.chunkStartTime = Date.now();

        // Clear any existing timer
        if (this.sendIntervalTimer) {
            clearInterval(this.sendIntervalTimer);
        }

        this.sendIntervalTimer = setInterval(() => {
            this.sendCurrentRecordingChunk();
        }, this.CHUNK_DURATION);
    }

    /**
     * Stop periodic sending với improved cleanup
     */
    private stopPeriodicSending(): void {
        if (this.sendIntervalTimer) {
            clearInterval(this.sendIntervalTimer);
            this.sendIntervalTimer = null;
        }
    }

    /**
     * Get current recording buffer and send as periodic chunk
     */
    private sendCurrentRecordingChunk(): void {
        if (!this.vadInstance || !this.isRecording()) {
            console.log("[VADManager] Not recording, skipping periodic chunk");
            return;
        }

        // Check if microphone is actually enabled
        if (!this.isMicrophoneEnabled()) {
            this.stopPeriodicSending();
            return;
        }

        // Get current recorded chunks from VAD instance
        const currentBuffer = this.vadInstance.getCurrentRecording();

        if (!currentBuffer || currentBuffer.length === 0) {
            console.log("[VADManager] No current recording data for periodic chunk");
            return;
        }

        // Calculate actual duration from buffer size (more accurate)
        const actualDuration = Math.round((currentBuffer.length / 2 / 16000) * 1000); // bytes ÷ 2 ÷ sampleRate * 1000

        // Send the chunk with actual duration from buffer
        this.sendAudioBuffer(currentBuffer, actualDuration, false); // false = not final chunk

        // Clear the current recording to avoid re-sending same data
        this.vadInstance.clearCurrentRecording();

        // Reset timer for next chunk
        this.chunkStartTime = Date.now();
    }

    /**
     * Check if VAD is currently listening
     */
    isListening(): boolean {
        return this.vadInstance?.getState().isListening || false;
    }

    /**
     * Check if VAD is currently recording
     */
    isRecording(): boolean {
        return this.vadInstance?.getState().isRecording || false;
    }

    /**
     * Get VAD state
     */
    getState() {
        if (!this.vadInstance) {
            return {
                isInitialized: false,
                isListening: false,
                isRecording: false,
                microphoneEnabled: false,
            };
        }

        return {
            isInitialized: this.isInitialized,
            ...this.vadInstance.getState(),
        };
    }

    /**
     * Cleanup VAD resources với improved memory management
     */
    cleanup(): void {
        // Stop periodic sending
        this.stopPeriodicSending();

        // Clear recordings to free memory
        // this.clearRecordings();

        if (this.vadInstance) {
            this.vadInstance.cleanup();
            this.vadInstance = null;
        }

        this.isInitialized = false;
    }
}
