import React, { useEffect, useState } from "react";
import { useCallRefactored } from "@/hooks/use-call-refactored";
import { useSelector } from "react-redux";
import { AudioPlayer } from "./AudioPlayer";

interface VADDemoProps {
    roomId: string;
}

/**
 * VAD Demo Component
 * Hiển thị trạng thái VAD và cho phép test chức năng
 */
export const VADDemo: React.FC<VADDemoProps> = ({ roomId }) => {
    const room = useSelector((state: any) => state.room);
    const [vadEnabled, setVADEnabled] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0); // To force re-render recordings

    const {
        vadState,
        isSpeaking,
        isJoined,
        localStream,
        startVADListening,
        stopVADListening,
        toggleAudio,
        getVADRecordings,
        clearVADRecordings,
    } = useCallRefactored(roomId);

    // Auto-start VAD when joined and has local stream
    useEffect(() => {
        if (isJoined && localStream && vadState.isInitialized && vadEnabled) {
            startVADListening();
        }
    }, [
        isJoined,
        localStream,
        vadState.isInitialized,
        vadEnabled,
        startVADListening,
    ]);

    // Refresh recordings periodically to show new ones
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshKey((prev) => prev + 1);
        }, 2000); // Refresh every 2 seconds

        return () => clearInterval(interval);
    }, []);

    const handleToggleVAD = () => {
        if (vadState.isListening) {
            stopVADListening();
            setVADEnabled(false);
        } else {
            startVADListening();
            setVADEnabled(true);
        }
    };

    const handleClearRecordings = () => {
        clearVADRecordings();
        setRefreshKey((prev) => prev + 1); // Force refresh
    };

    // Get current recordings
    const recordings = getVADRecordings();

    const getVADStatusColor = () => {
        if (!vadState.isInitialized) return "gray";
        if (vadState.isRecording) return "red";
        if (vadState.isListening) return "green";
        return "orange";
    };

    const getVADStatusText = () => {
        if (!vadState.isInitialized) return "VAD Not Initialized";
        if (vadState.isRecording) return "Recording Speech";
        if (vadState.isListening) return "Listening for Speech";
        return "VAD Stopped";
    };

    const getMicrophoneStatus = () => {
        if (!localStream) return "No Stream";
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length === 0) return "No Audio Track";

        const track = audioTracks[0];
        const settings = track.getSettings();
        return `${track.enabled ? "ON" : "OFF"} (${
            settings.sampleRate || "unknown"
        }Hz, ${settings.channelCount || "unknown"} ch)`;
    };

    const testMicrophone = () => {
        if (!localStream) {
            console.log("[VAD Test] No local stream available");
            return;
        }

        console.log("[VAD Test] Testing microphone...");
        console.log("[VAD Test] Local stream:", localStream);
        console.log(
            "[VAD Test] Audio tracks:",
            localStream.getAudioTracks().map((track) => ({
                label: track.label,
                enabled: track.enabled,
                kind: track.kind,
                settings: track.getSettings(),
                constraints: track.getConstraints(),
            }))
        );

        alert("Check console for microphone test results");
    };

    return (
        <div className='p-4 border rounded-lg bg-white shadow-sm'>
            <h3 className='text-lg font-semibold mb-4'>
                🎙️ Voice Activity Detection
            </h3>

            {/* VAD Status */}
            <div className='grid grid-cols-2 gap-4 mb-4'>
                <div className='space-y-2'>
                    <div className='flex items-center space-x-2'>
                        <div
                            className={`w-3 h-3 rounded-full`}
                            style={{ backgroundColor: getVADStatusColor() }}
                        />
                        <span className='text-sm font-medium'>
                            {getVADStatusText()}
                        </span>
                    </div>

                    <div className='text-xs text-gray-600 space-y-1'>
                        <div>
                            Initialized: {vadState.isInitialized ? "✅" : "❌"}
                        </div>
                        <div>
                            Listening: {vadState.isListening ? "✅" : "❌"}
                        </div>
                        <div>
                            Recording: {vadState.isRecording ? "✅" : "❌"}
                        </div>
                        <div>
                            Mic Enabled:{" "}
                            {vadState.microphoneEnabled ? "✅" : "❌"}
                        </div>
                        {"audioTracksCount" in vadState && (
                            <div>Audio Tracks: {vadState.audioTracksCount}</div>
                        )}
                    </div>
                </div>

                <div className='space-y-2'>
                    <div className='text-sm font-medium'>
                        Speaking: {isSpeaking ? "🗣️ YES" : "🤐 NO"}
                    </div>

                    <div className='text-xs text-gray-600 space-y-1'>
                        <div>Room Joined: {isJoined ? "✅" : "❌"}</div>
                        <div>Stream: {localStream ? "✅" : "❌"}</div>
                        <div>{getMicrophoneStatus()}</div>
                        <div>User: {room.username || "Not set"}</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className='flex space-x-3 flex-wrap'>
                <button
                    onClick={handleToggleVAD}
                    disabled={!vadState.isInitialized}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        vadState.isListening
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                    } ${
                        !vadState.isInitialized
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                    }`}
                >
                    {vadState.isListening ? "Stop VAD" : "Start VAD"}
                </button>

                <button
                    onClick={toggleAudio}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        vadState.microphoneEnabled
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-gray-500 hover:bg-gray-600 text-white"
                    }`}
                >
                    {vadState.microphoneEnabled ? "Mute Mic" : "Unmute Mic"}
                </button>

                <button
                    onClick={testMicrophone}
                    className='px-4 py-2 rounded text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white'
                >
                    Test Mic
                </button>
            </div>

            {/* VAD Configuration Info */}
            <div className='mt-4 p-3 bg-gray-50 rounded text-xs'>
                <h4 className='font-medium mb-2'>
                    VAD Configuration (Testing Mode):
                </h4>
                <div className='grid grid-cols-2 gap-2 text-gray-600'>
                    <div>Sample Rate: 16kHz</div>
                    <div>Frame Size: 1024</div>
                    <div>Min Speech: 300ms</div>
                    <div>Silence Timeout: 500ms</div>
                    <div>Max Recording: 15s</div>
                    <div className='font-bold text-red-600'>
                        Energy Threshold: 0.0001 ⬇️
                    </div>
                    <div>Confirmation Frames: 3</div>
                    <div>ZCR Threshold: 0.5 ⬆️</div>
                </div>
            </div>

            {/* Debug Info */}
            <div className='mt-4 p-3 bg-yellow-50 rounded text-xs'>
                <h4 className='font-medium mb-2'>🔍 Debug Information:</h4>
                <div className='text-gray-600 space-y-1'>
                    <div>✅ Check browser console for detailed VAD logs</div>
                    <div>✅ Energy threshold lowered to 0.0001 for testing</div>
                    <div>
                        ✅ Enhanced logging shows energy values with 6 decimals
                    </div>
                    <div>✅ Audio level monitoring every ~1000 frames</div>
                </div>
            </div>

            {/* Instructions */}
            <div className='mt-4 p-3 bg-blue-50 rounded text-xs'>
                <h4 className='font-medium mb-2'>🔧 How to Test:</h4>
                <ol className='list-decimal list-inside space-y-1 text-gray-600'>
                    <li>Make sure microphone is enabled</li>
                    <li>Join a room</li>
                    <li>VAD will auto-start listening</li>
                    <li>Speak normally - VAD will detect and record</li>
                    <li>Check browser console for audio buffer logs</li>
                    <li>Check server logs for received audio data</li>
                </ol>
            </div>

            {/* Audio Player for VAD Recordings */}
            <div className='mt-6'>
                <AudioPlayer
                    key={refreshKey}
                    recordings={recordings}
                    onClear={handleClearRecordings}
                />
            </div>
        </div>
    );
};
