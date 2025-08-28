import React, { useState } from "react";
import { VADDemo } from "./VADDemo";
import { StandaloneVADTest } from "./StandaloneVADTest";
import { RecordingsDebug } from "./RecordingsDebug";
import { useCallRefactored } from "@/hooks/use-call-refactored";
import { useDispatch, useSelector } from "react-redux";
import { ActionRoomType } from "@/interfaces/action";

/**
 * VAD Debug Page Component
 * Trang demo cho việc test và debug VAD với audio playback
 */
export const VADDebugPage: React.FC = () => {
    const [roomId, setRoomId] = useState("vad-test-room");
    const [username, setUsername] = useState(
        "debug-user-" + Math.random().toString(36).substr(2, 5)
    );

    const dispatch = useDispatch();
    const room = useSelector((state: any) => state.room);

    const {
        isJoined,
        isConnected,
        localStream,
        vadState,
        joinRoom,
        initializeLocalMedia,
        error,
        loading,
        getVADRecordings,
        clearVADRecordings,
    } = useCallRefactored(roomId);

    // Set username in Redux store
    const handleSetUsername = () => {
        dispatch({
            type: ActionRoomType.JOIN_ROOM,
            payload: { username: username },
        });
    };

    // Join room handler
    const handleJoinRoom = async () => {
        try {
            // First set username
            if (!room.username) {
                handleSetUsername();
            }

            // Initialize media first
            await initializeLocalMedia();

            // Then join room
            await joinRoom();
        } catch (error) {
            console.error("[VADDebugPage] Join room error:", error);
        }
    };

    // Test microphone permissions
    const handleTestMicrophone = async () => {
        try {
            console.log("[VADDebugPage] Testing microphone permissions...");
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });

            console.log("[VADDebugPage] Microphone access granted!");
            console.log(
                "[VADDebugPage] Audio tracks:",
                stream.getAudioTracks()
            );

            // Stop the test stream
            stream.getTracks().forEach((track) => track.stop());

            alert("✅ Microphone test successful! Check console for details.");
        } catch (error) {
            console.error("[VADDebugPage] Microphone test failed:", error);
            alert("❌ Microphone test failed: " + error.message);
        }
    };

    // Debug: Check recordings count
    const handleCheckRecordings = () => {
        const recordings = getVADRecordings();
        console.log("[VADDebugPage] Current recordings:", recordings);
        alert(
            `📊 Found ${recordings.length} recordings. Check console for details.`
        );
    };

    return (
        <div className='min-h-screen bg-gray-100 p-4'>
            <div className='max-w-4xl mx-auto'>
                <h1 className='text-2xl font-bold mb-6 text-center'>
                    🎙️ VAD Debug & Audio Playback
                </h1>

                {/* Setup Controls */}
                <div className='mb-6 p-4 bg-white rounded-lg shadow'>
                    <h2 className='text-lg font-semibold mb-4'>
                        Setup Controls
                    </h2>

                    {/* Username */}
                    <div className='mb-4 flex items-center space-x-4'>
                        <label className='text-sm font-medium min-w-24'>
                            Username:
                        </label>
                        <input
                            type='text'
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className='px-3 py-2 border rounded-md flex-1 max-w-md'
                            placeholder='Enter username'
                        />
                        <button
                            onClick={handleSetUsername}
                            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                        >
                            Set Username
                        </button>
                    </div>

                    {/* Room ID */}
                    <div className='mb-4 flex items-center space-x-4'>
                        <label className='text-sm font-medium min-w-24'>
                            Room ID:
                        </label>
                        <input
                            type='text'
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className='px-3 py-2 border rounded-md flex-1 max-w-md'
                            placeholder='Enter room ID'
                        />
                    </div>

                    {/* Status */}
                    <div className='mb-4 p-3 bg-gray-50 rounded'>
                        <h3 className='font-medium mb-2'>Current Status:</h3>
                        <div className='grid grid-cols-2 gap-4 text-sm'>
                            <div>Username: {room.username || "Not set"}</div>
                            <div>Connected: {isConnected ? "✅" : "❌"}</div>
                            <div>Joined: {isJoined ? "✅" : "❌"}</div>
                            <div>Local Stream: {localStream ? "✅" : "❌"}</div>
                            <div>
                                VAD Initialized:{" "}
                                {vadState.isInitialized ? "✅" : "❌"}
                            </div>
                            <div>
                                VAD Listening:{" "}
                                {vadState.isListening ? "✅" : "❌"}
                            </div>
                        </div>
                        {error && (
                            <div className='mt-2 text-red-600 text-sm'>
                                Error: {error}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className='flex space-x-3 flex-wrap'>
                        <button
                            onClick={handleTestMicrophone}
                            className='px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600'
                        >
                            🎤 Test Mic
                        </button>

                        <button
                            onClick={handleCheckRecordings}
                            className='px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600'
                        >
                            📊 Check Recordings
                        </button>

                        <button
                            onClick={initializeLocalMedia}
                            disabled={loading}
                            className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50'
                        >
                            {loading ? "Loading..." : "Init Media"}
                        </button>

                        <button
                            onClick={handleJoinRoom}
                            disabled={loading || !room.username}
                            className='px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50'
                        >
                            {loading ? "Joining..." : "Join Room"}
                        </button>
                    </div>
                </div>

                {/* Audio Mode Comparison */}
                <div className='mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200'>
                    <h2 className='text-lg font-semibold mb-4 text-amber-800'>
                        🎵 Audio Mode Comparison
                    </h2>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='p-3 bg-white rounded border'>
                            <h3 className='font-medium text-green-700 mb-2'>
                                🎯 VAD Debug Mode (This Page)
                            </h3>
                            <ul className='text-sm space-y-1'>
                                <li>• Uses raw audio stream directly</li>
                                <li>• No VADAudioProcessor enhancement</li>
                                <li>• Total gain: 1.0x (no amplification)</li>
                                <li>• Better for Whisper transcription</li>
                                <li>• Minimal audio processing</li>
                            </ul>
                        </div>
                        <div className='p-3 bg-white rounded border'>
                            <h3 className='font-medium text-blue-700 mb-2'>
                                🔧 Main Call System
                            </h3>
                            <ul className='text-sm space-y-1'>
                                <li>• Uses VADAudioProcessor enhancement</li>
                                <li>• Gain + compression applied</li>
                                <li>• Total gain: 3.0x (reduced from 67.5x)</li>
                                <li>• Risk of audio clipping</li>
                                <li>
                                    • Add ?rawAudio=true to URL for raw mode
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className='mt-4 p-3 bg-blue-50 rounded border border-blue-200'>
                        <p className='text-sm text-blue-700'>
                            💡 <strong>To test raw audio in main call:</strong>{" "}
                            Add <code>?rawAudio=true</code> to the URL (e.g.,{" "}
                            <code>/call/room123?rawAudio=true</code>)
                        </p>
                    </div>
                </div>

                {/* VAD Demo and Tests */}
                <div className='space-y-6'>
                    {/* Recordings Debug Panel - Shows all recordings clearly */}
                    <RecordingsDebug
                        getRecordings={getVADRecordings}
                        clearRecordings={clearVADRecordings}
                    />

                    {/* Standalone VAD Test (Independent) */}
                    <StandaloneVADTest />

                    {/* Full Call System VAD Demo */}
                    <VADDemo roomId={roomId} />
                </div>

                <div className='mt-8 p-4 bg-yellow-50 rounded-lg'>
                    <h3 className='font-semibold text-yellow-800 mb-2'>
                        📝 Hướng dẫn sử dụng
                    </h3>
                    <ol className='list-decimal list-inside space-y-2 text-yellow-700 text-sm'>
                        <li>Nhập Room ID và tham gia phòng</li>
                        <li>Bật microphone và đảm bảo VAD đang hoạt động</li>
                        <li>Nói một vài câu để VAD ghi âm</li>
                        <li>Kiểm tra phần "🎵 Audio Recordings" bên dưới</li>
                        <li>Click "▶️ Play" để nghe lại bản ghi âm</li>
                        <li>Click "💾 Download" để tải file WAV về máy</li>
                        <li>Click "Clear All" để xóa tất cả bản ghi âm</li>
                    </ol>
                </div>

                <div className='mt-6 p-4 bg-green-50 rounded-lg'>
                    <h3 className='font-semibold text-green-800 mb-2'>
                        🔍 Debug Tips
                    </h3>
                    <ul className='list-disc list-inside space-y-1 text-green-700 text-sm'>
                        <li>Mở Developer Console để xem log chi tiết</li>
                        <li>Kiểm tra thông số energy và ZCR trong console</li>
                        <li>So sánh chất lượng âm thanh giữa các bản ghi âm</li>
                        <li>Test với âm lượng và khoảng cách khác nhau</li>
                        <li>Kiểm tra xem server có nhận được dữ liệu không</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default VADDebugPage;
