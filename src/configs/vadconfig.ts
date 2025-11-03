import { VADConfig } from "@/services/VoiceActivityDetector";

// VAD configuration
const vadConfig: Partial<VADConfig> = {
    sampleRate: 16000, // Sample rate in Hz
    frameSize: 1024, // Size of each audio frame in samples

    // Audio thresholds - TĂNG để giảm false positive khi im lặng
    energyThreshold: 0.02, // Tăng từ 0.01 lên 0.02 - Minimum energy level to consider as speech
    zcrThreshold: 0.3, // Zero-crossing rate threshold for speech detection

    // Timing thresholds
    minSpeechDuration: 800, // Tăng từ 500ms lên 800ms - Minimum duration for speech detection
    silenceDuration: 2000, // Tăng từ 1500ms lên 2000ms - Silence duration before stopping recording
    maxRecordingDuration: 15000, // Maximum recording duration
};

// Export configuration for use in VADManager
export default vadConfig;
