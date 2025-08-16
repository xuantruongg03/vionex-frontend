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

import { VADConfig } from "@/services/VoiceActivityDetector";

// VAD configuration
const vadConfig: Partial<VADConfig> = {
    sampleRate: 16000, // Sample rate in Hz
    frameSize: 1024, // Size of each audio frame in samples

    // Audio thresholds
    energyThreshold: 0.01, // Minimum energy level to consider as speech
    zcrThreshold: 0.3, // Zero-crossing rate threshold for speech detection

    // Timing thresholds
    minSpeechDuration: 500, // Minimum duration for speech detection
    silenceDuration: 1500, // Silence duration before stopping recording
    maxRecordingDuration: 15000, // Maximum recording duration
};

// Export configuration for use in VADManager
export default vadConfig;
