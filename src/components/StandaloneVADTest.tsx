import React, { useState, useRef, useEffect } from "react";
import { VoiceActivityDetector } from "@/services/VoiceActivityDetector";

/**
 * Standalone VAD Test Component
 * Test VAD without dependency on call system
 */
export const StandaloneVADTest: React.FC = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
    const [currentRecordingDuration, setCurrentRecordingDuration] = useState(0);
    const [recordings, setRecordings] = useState<
        Array<{
            id: string;
            timestamp: number;
            duration: number;
            audioBuffer: Uint8Array;
        }>
    >([]);

    const vadRef = useRef<VoiceActivityDetector | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Initialize VAD
    const handleInitialize = async () => {
        try {
            setError(null);
            console.log("[StandaloneVAD] Requesting microphone access...");

            // Get media stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });

            streamRef.current = stream;
            console.log("[StandaloneVAD] Got media stream:", stream);

            // Create VAD instance
            const vadEvents = {
                onSpeechStart: () => {
                    const startTime = Date.now();
                    console.log("[StandaloneVAD] Speech started at:", new Date(startTime).toLocaleTimeString());
                    setIsSpeaking(true);
                    setIsRecording(true);
                    setRecordingStartTime(startTime);
                    setCurrentRecordingDuration(0);
                },
                onSpeechEnd: (audioBuffer: Uint8Array, duration: number) => {
                    const endTime = Date.now();
                    const actualDuration = recordingStartTime ? endTime - recordingStartTime : 0;
                    console.log(
                        "[StandaloneVAD] Speech ended at:", new Date(endTime).toLocaleTimeString(),
                        "\n- Reported duration:", duration, "ms",
                        "\n- Actual duration:", actualDuration, "ms", 
                        "\n- Buffer size:", audioBuffer.length, "bytes",
                        "\n- Expected buffer size for", actualDuration, "ms:", Math.floor((actualDuration / 1000) * 16000 * 2), "bytes"
                    );
                    setIsSpeaking(false);
                    setIsRecording(false);
                    setRecordingStartTime(null);
                    setCurrentRecordingDuration(0);

                    // Store recording
                    const recording = {
                        id: Date.now().toString(),
                        timestamp: Date.now(),
                        duration,
                        audioBuffer: new Uint8Array(audioBuffer),
                    };

                    setRecordings((prev) => [...prev, recording].slice(-5)); // Keep last 5
                },
                onError: (error: Error) => {
                    console.error("[StandaloneVAD] VAD Error:", error);
                    setError(error.message);
                },
            };

            vadRef.current = new VoiceActivityDetector(
                {
                    energyThreshold: 0.0001, // Very low for testing
                    zcrThreshold: 0.5,
                    minSpeechDuration: 100, // Reduce minimum to 100ms
                    silenceDuration: 1500, // Increase to 1.5s to capture longer speech
                    maxRecordingDuration: 30000, // 30 seconds max
                    sampleRate: 16000,
                    frameSize: 1024,
                },
                vadEvents
            );

            // Initialize VAD
            await vadRef.current.initialize(stream);
            setIsInitialized(true);
            console.log("[StandaloneVAD] VAD initialized successfully");
        } catch (error) {
            console.error("[StandaloneVAD] Initialization failed:", error);
            setError(error.message);
        }
    };

    // Start listening
    const handleStartListening = () => {
        if (vadRef.current && !isListening) {
            vadRef.current.startListening();
            setIsListening(true);
            console.log("[StandaloneVAD] Started listening");
        }
    };

    // Stop listening
    const handleStopListening = () => {
        if (vadRef.current && isListening) {
            vadRef.current.stopListening();
            setIsListening(false);
            console.log("[StandaloneVAD] Stopped listening");
        }
    };

    // Cleanup
    const handleCleanup = () => {
        if (vadRef.current) {
            vadRef.current.cleanup();
            vadRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsInitialized(false);
        setIsListening(false);
        setIsRecording(false);
        setIsSpeaking(false);
        console.log("[StandaloneVAD] Cleaned up");
    };

    // Play recording
    const playRecording = async (recording: {
        audioBuffer: Uint8Array;
        duration: number;
    }) => {
        try {
            const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)();

            // Convert Uint8Array to AudioBuffer
            const samples = recording.audioBuffer.length / 2;
            const audioBuffer = audioContext.createBuffer(1, samples, 16000);
            const channelData = audioBuffer.getChannelData(0);
            const dataView = new DataView(recording.audioBuffer.buffer);

            for (let i = 0; i < samples; i++) {
                const sample = dataView.getInt16(i * 2, true);
                channelData[i] = sample / 32768.0;
            }

            // Play
            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(audioContext.destination);
            sourceNode.start();

            console.log(
                "[StandaloneVAD] Playing recording, duration:",
                recording.duration
            );
        } catch (error) {
            console.error("[StandaloneVAD] Play error:", error);
        }
    };

    // Real-time recording duration update
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isRecording && recordingStartTime) {
            interval = setInterval(() => {
                const duration = Date.now() - recordingStartTime;
                setCurrentRecordingDuration(duration);
            }, 100); // Update every 100ms
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording, recordingStartTime]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            handleCleanup();
        };
    }, []);

    return (
        <div className="p-4 border rounded-lg bg-blue-50">
            <h3 className="text-lg font-semibold mb-4">
                🧪 Standalone VAD Test
            </h3>

            {/* Status */}
            <div className="mb-4 p-3 bg-white rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Initialized: {isInitialized ? "✅" : "❌"}</div>
                    <div>Listening: {isListening ? "✅" : "❌"}</div>
                    <div>Recording: {isRecording ? "🔴" : "⚫"}</div>
                    <div>Speaking: {isSpeaking ? "🗣️" : "🤐"}</div>
                </div>
                
                {/* Real-time recording info */}
                {isRecording && (
                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                        <div className="text-red-700 font-medium">
                            🎙️ Recording... {(currentRecordingDuration / 1000).toFixed(1)}s
                        </div>
                        <div className="text-red-600 text-xs">
                            Started: {recordingStartTime ? new Date(recordingStartTime).toLocaleTimeString() : 'N/A'}
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="mt-2 text-red-600 text-sm">❌ {error}</div>
                )}
            </div>

            {/* Controls */}
            <div className="mb-4 flex space-x-2 flex-wrap">
                <button
                    onClick={handleInitialize}
                    disabled={isInitialized}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                >
                    Initialize VAD
                </button>

                <button
                    onClick={handleStartListening}
                    disabled={!isInitialized || isListening}
                    className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                    Start Listening
                </button>

                <button
                    onClick={handleStopListening}
                    disabled={!isListening}
                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                >
                    Stop Listening
                </button>

                <button
                    onClick={handleCleanup}
                    className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                    Cleanup
                </button>
            </div>

            {/* Recordings */}
            {recordings.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-medium mb-2">
                        🎵 Recordings ({recordings.length})
                    </h4>
                    <div className="space-y-2">
                        {recordings.map((recording) => (
                            <div
                                key={recording.id}
                                className="flex items-center justify-between p-2 bg-white rounded text-sm"
                            >
                                <div>
                                    <div className="font-medium">
                                        #{recording.id.slice(-6)}
                                    </div>
                                    <div className="text-gray-600">
                                        {new Date(
                                            recording.timestamp
                                        ).toLocaleTimeString()}{" "}
                                        • Duration: {(recording.duration / 1000).toFixed(2)}s
                                        • Size: {recording.audioBuffer.length} bytes
                                        • Expected: ~{Math.floor((recording.duration / 1000) * 16000 * 2)} bytes
                                    </div>
                                </div>
                                <button
                                    onClick={() => playRecording(recording)}
                                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    ▶️ Play
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-4 p-3 bg-yellow-50 rounded text-xs">
                <h4 className="font-medium mb-1">📋 Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                    <li>Click "Initialize VAD" to setup microphone</li>
                    <li>Click "Start Listening" to begin VAD</li>
                    <li>Speak normally to trigger recording</li>
                    <li>Recording stops after 1.5s of silence</li>
                    <li>Play recordings to test audio quality</li>
                    <li>Check browser console for detailed logs</li>
                </ol>
                
                <div className="mt-3 p-2 bg-blue-50 rounded">
                    <h5 className="font-medium text-blue-800 mb-1">🔧 Current Settings:</h5>
                    <div className="text-blue-700 space-y-1">
                        <div>• Energy Threshold: 0.0001 (very sensitive)</div>
                        <div>• Silence Duration: 1.5 seconds</div>
                        <div>• Min Speech: 100ms</div>
                        <div>• Max Recording: 30 seconds</div>
                        <div>• Sample Rate: 16kHz, Mono</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StandaloneVADTest;
