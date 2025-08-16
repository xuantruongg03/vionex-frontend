import React, { useState, useRef, useEffect } from "react";

interface AudioRecording {
    id: string;
    timestamp: number;
    duration: number;
    audioBuffer: Uint8Array;
    sampleRate: number;
    channels: number;
}

interface AudioPlayerProps {
    recordings: AudioRecording[];
    onClear?: () => void;
}

/**
 * Audio Player Component for VAD Debug
 * Allows playback of recorded audio buffers
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
    recordings,
    onClear,
}) => {
    const [isPlaying, setIsPlaying] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<{ [key: string]: number }>(
        {}
    );
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        // Initialize audio context
        audioContextRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    /**
     * Convert Uint8Array PCM to AudioBuffer
     */
    const createAudioBuffer = async (
        audioData: Uint8Array,
        sampleRate: number,
        channels: number
    ): Promise<AudioBuffer> => {
        if (!audioContextRef.current) {
            throw new Error("Audio context not initialized");
        }

        // Convert 16-bit PCM to Float32Array
        const samples = audioData.length / 2; // 16-bit = 2 bytes per sample
        const audioBuffer = audioContextRef.current.createBuffer(
            channels,
            samples,
            sampleRate
        );

        const channelData = audioBuffer.getChannelData(0);
        const dataView = new DataView(audioData.buffer);

        for (let i = 0; i < samples; i++) {
            // Read 16-bit little-endian sample and convert to float (-1 to 1)
            const sample = dataView.getInt16(i * 2, true);
            channelData[i] = sample / 32768.0;
        }

        return audioBuffer;
    };

    /**
     * Play audio recording
     */
    const playRecording = async (recording: AudioRecording) => {
        try {
            if (!audioContextRef.current) {
                console.error("Audio context not available");
                return;
            }

            // Stop any currently playing audio
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
                sourceNodeRef.current = null;
            }

            // Resume audio context if suspended
            if (audioContextRef.current.state === "suspended") {
                await audioContextRef.current.resume();
            }

            // Create audio buffer from recorded data
            const audioBuffer = await createAudioBuffer(
                recording.audioBuffer,
                recording.sampleRate,
                recording.channels
            );

            // Create source node and connect to destination
            const sourceNode = audioContextRef.current.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(audioContextRef.current.destination);

            // Track playback state
            setIsPlaying(recording.id);

            sourceNode.onended = () => {
                setIsPlaying(null);
                sourceNodeRef.current = null;
                setCurrentTime((prev) => ({ ...prev, [recording.id]: 0 }));
            };

            // Start playback
            sourceNode.start();
            sourceNodeRef.current = sourceNode;

            console.log(
                `[AudioPlayer] Playing recording ${recording.id} - Duration: ${recording.duration}ms`
            );
        } catch (error) {
            console.error("[AudioPlayer] Error playing audio:", error);
            setIsPlaying(null);
        }
    };

    /**
     * Stop current playback
     */
    const stopPlayback = () => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current = null;
        }
        setIsPlaying(null);
    };

    /**
     * Download recording as WAV file
     */
    const downloadRecording = (recording: AudioRecording) => {
        try {
            // Create WAV file blob
            const wavBlob = createWavBlob(
                recording.audioBuffer,
                recording.sampleRate,
                recording.channels
            );

            // Create download link
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `vad-recording-${recording.id}-${new Date(
                recording.timestamp
            )
                .toISOString()
                .slice(0, 19)
                .replace(/:/g, "-")}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`[AudioPlayer] Downloaded recording ${recording.id}`);
        } catch (error) {
            console.error("[AudioPlayer] Error downloading audio:", error);
        }
    };

    /**
     * Create WAV file blob from PCM data
     */
    const createWavBlob = (
        pcmData: Uint8Array,
        sampleRate: number,
        channels: number
    ): Blob => {
        const length = pcmData.length;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, "RIFF");
        view.setUint32(4, 36 + length, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * channels * 2, true);
        view.setUint16(32, channels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, "data");
        view.setUint32(40, length, true);

        // Copy PCM data
        const pcmView = new Uint8Array(buffer, 44);
        pcmView.set(pcmData);

        return new Blob([buffer], { type: "audio/wav" });
    };

    /**
     * Format timestamp for display
     */
    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    /**
     * Format duration for display
     */
    const formatDuration = (duration: number) => {
        return `${(duration / 1000).toFixed(2)}s`;
    };

    if (recordings.length === 0) {
        return (
            <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">
                    🎵 Audio Recordings
                </h3>
                <p className="text-gray-600 text-sm">
                    No recordings available. Start speaking to record audio.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                    🎵 Audio Recordings ({recordings.length})
                </h3>
                <button
                    onClick={onClear}
                    className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                >
                    Clear All
                </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
                {recordings.map((recording) => (
                    <div
                        key={recording.id}
                        className="p-3 border rounded bg-gray-50"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-sm">
                                <div className="font-medium">
                                    Recording #{recording.id.slice(-8)}
                                </div>
                                <div className="text-gray-600">
                                    {formatTimestamp(recording.timestamp)} •{" "}
                                    {formatDuration(recording.duration)}
                                </div>
                                <div className="text-gray-500 text-xs">
                                    {recording.sampleRate}Hz,{" "}
                                    {recording.channels}ch,{" "}
                                    {recording.audioBuffer.length} bytes
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    if (isPlaying === recording.id) {
                                        stopPlayback();
                                    } else {
                                        playRecording(recording);
                                    }
                                }}
                                className={`px-3 py-1 text-sm rounded font-medium ${
                                    isPlaying === recording.id
                                        ? "bg-red-500 hover:bg-red-600 text-white"
                                        : "bg-blue-500 hover:bg-blue-600 text-white"
                                }`}
                            >
                                {isPlaying === recording.id
                                    ? "⏹️ Stop"
                                    : "▶️ Play"}
                            </button>

                            <button
                                onClick={() => downloadRecording(recording)}
                                className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded font-medium"
                            >
                                💾 Download
                            </button>
                        </div>

                        {isPlaying === recording.id && (
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full animate-pulse"
                                    style={{ width: "100%" }}
                                ></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded text-xs">
                <h4 className="font-medium mb-2">🔧 Audio Debug Tips:</h4>
                <ul className="text-gray-600 space-y-1">
                    <li>
                        • Play recordings to hear what VAD actually captured
                    </li>
                    <li>• Check if speech is clear and at good volume</li>
                    <li>• Download files to analyze in audio software</li>
                    <li>• Compare successful vs failed detections</li>
                </ul>
            </div>
        </div>
    );
};
