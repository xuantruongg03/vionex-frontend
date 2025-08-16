import React, { useState, useEffect } from "react";

interface AudioRecording {
    id: string;
    timestamp: number;
    duration: number;
    audioBuffer: Uint8Array;
    sampleRate: number;
    channels: number;
}

interface RecordingsDebugProps {
    getRecordings: () => AudioRecording[];
    clearRecordings: () => void;
}

/**
 * Recordings Debug Component
 * Shows raw recordings data and debug info
 */
export const RecordingsDebug: React.FC<RecordingsDebugProps> = ({
    getRecordings,
    clearRecordings,
}) => {
    const [recordings, setRecordings] = useState<AudioRecording[]>([]);
    const [lastUpdate, setLastUpdate] = useState<string>("");

    // Refresh recordings every 1 second
    useEffect(() => {
        const interval = setInterval(() => {
            const currentRecordings = getRecordings();
            setRecordings([...currentRecordings]); // Force new array
            setLastUpdate(new Date().toLocaleTimeString());
        }, 1000);

        return () => clearInterval(interval);
    }, [getRecordings]);

    // Manual refresh
    const handleRefresh = () => {
        const currentRecordings = getRecordings();
        setRecordings([...currentRecordings]);
        setLastUpdate(new Date().toLocaleTimeString());
        console.log(
            "[RecordingsDebug] Manual refresh, found recordings:",
            currentRecordings.length
        );
    };

    // Play audio
    const playAudio = async (recording: AudioRecording) => {
        try {
            console.log("[RecordingsDebug] Playing recording:", {
                id: recording.id,
                duration: recording.duration,
                bufferSize: recording.audioBuffer.length,
                sampleRate: recording.sampleRate,
                channels: recording.channels,
            });

            const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)();

            if (audioContext.state === "suspended") {
                await audioContext.resume();
            }

            // Convert PCM to AudioBuffer
            const samples = recording.audioBuffer.length / 2;
            const audioBuffer = audioContext.createBuffer(
                recording.channels,
                samples,
                recording.sampleRate
            );

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

            console.log("[RecordingsDebug] Playback started");
        } catch (error) {
            console.error("[RecordingsDebug] Playback error:", error);
            alert("❌ Playback failed: " + error.message);
        }
    };

    // Download as WAV
    const downloadWAV = (recording: AudioRecording) => {
        try {
            const wavBlob = createWAVBlob(
                recording.audioBuffer,
                recording.sampleRate,
                recording.channels
            );
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `recording-${recording.id}-${Date.now()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log("[RecordingsDebug] Downloaded:", a.download);
        } catch (error) {
            console.error("[RecordingsDebug] Download error:", error);
        }
    };

    // Create WAV blob
    const createWAVBlob = (
        pcmData: Uint8Array,
        sampleRate: number,
        channels: number
    ): Blob => {
        const length = pcmData.length;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);

        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        // WAV header
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

    return (
        <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-800">
                    🎵 Recordings Debug Panel
                </h3>
                <div className="flex space-x-2">
                    <button
                        onClick={handleRefresh}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                        🔄 Refresh
                    </button>
                    <button
                        onClick={() => {
                            clearRecordings();
                            handleRefresh();
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                        🗑️ Clear All
                    </button>
                </div>
            </div>

            {/* Status */}
            <div className="mb-4 p-3 bg-white rounded border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <strong>Total Recordings:</strong> {recordings.length}
                    </div>
                    <div>
                        <strong>Last Update:</strong> {lastUpdate}
                    </div>
                    <div>
                        <strong>Total Size:</strong>{" "}
                        {recordings.reduce(
                            (sum, r) => sum + r.audioBuffer.length,
                            0
                        )}{" "}
                        bytes
                    </div>
                    <div>
                        <strong>Avg Duration:</strong>{" "}
                        {recordings.length > 0
                            ? (
                                  recordings.reduce(
                                      (sum, r) => sum + r.duration,
                                      0
                                  ) /
                                  recordings.length /
                                  1000
                              ).toFixed(2)
                            : 0}
                        s
                    </div>
                </div>
            </div>

            {/* Recordings List */}
            {recordings.length === 0 ? (
                <div className="p-6 text-center bg-white rounded border-2 border-dashed border-gray-300">
                    <div className="text-gray-500 text-lg mb-2">
                        📭 No recordings found
                    </div>
                    <div className="text-gray-400 text-sm">
                        Start speaking to create recordings...
                    </div>
                </div>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recordings.map((recording, index) => (
                        <div
                            key={`${recording.id}-${index}`}
                            className="p-4 bg-white rounded border shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-medium text-lg">
                                        Recording #{recording.id.slice(-6)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        📅{" "}
                                        {new Date(
                                            recording.timestamp
                                        ).toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-right text-sm">
                                    <div className="font-medium">
                                        ⏱️{" "}
                                        {(recording.duration / 1000).toFixed(2)}
                                        s
                                    </div>
                                    <div className="text-gray-500">
                                        📊 {recording.audioBuffer.length} bytes
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3 text-xs text-gray-500">
                                <div>
                                    🎛️ {recording.sampleRate}Hz,{" "}
                                    {recording.channels}ch
                                </div>
                                <div>🆔 Full ID: {recording.id}</div>
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => playAudio(recording)}
                                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                                >
                                    ▶️ Play
                                </button>
                                <button
                                    onClick={() => downloadWAV(recording)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                                >
                                    💾 Download
                                </button>
                                <button
                                    onClick={() => {
                                        console.log(
                                            "[RecordingsDebug] Raw recording data:",
                                            recording
                                        );
                                        alert("📋 Check console for raw data");
                                    }}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium"
                                >
                                    🔍 Inspect
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Debug Info */}
            <div className="mt-4 p-3 bg-yellow-50 rounded border text-xs">
                <div className="font-medium mb-2">🐛 Debug Info:</div>
                <div className="space-y-1 text-gray-600">
                    <div>• Auto-refresh every 1 second</div>
                    <div>• Check browser console for detailed logs</div>
                    <div>• Click "Inspect" to see raw recording data</div>
                    <div>• WAV files are 16-bit PCM format</div>
                </div>
            </div>
        </div>
    );
};

export default RecordingsDebug;
