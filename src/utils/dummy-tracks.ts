/**
 * Utility functions to create dummy media tracks
 * Used for creating placeholder producers when camera/mic are OFF
 */

/**
 * Creates a black video track using canvas
 * @param width - Video width (default: 640)
 * @param height - Video height (default: 480)
 * @param frameRate - Frame rate (default: 1 FPS to minimize CPU usage)
 * @returns MediaStreamTrack of black video
 */
export function createBlackVideoTrack(width = 640, height = 480, frameRate = 1): MediaStreamTrack {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    // Fill with black color
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Capture stream with minimal frame rate
    const stream = canvas.captureStream(frameRate);
    const track = stream.getVideoTracks()[0];

    if (!track) {
        throw new Error("Failed to create black video track");
    }

    return track;
}

/**
 * Creates a silent audio track
 * @returns MediaStreamTrack of silent audio
 */
export function createSilentAudioTrack(): MediaStreamTrack {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = (ctx as any).createMediaStreamDestination();
    const gainNode = ctx.createGain();

    // Set gain to 0 for complete silence
    gainNode.gain.value = 0;

    oscillator.connect(gainNode);
    gainNode.connect(dst);
    oscillator.start();

    const track = dst.stream.getAudioTracks()[0];

    if (!track) {
        throw new Error("Failed to create silent audio track");
    }
    return track;
}

/**
 * Check if a track is a dummy track
 * @param track - MediaStreamTrack to check
 * @returns true if track is a dummy track
 */
export function isDummyTrack(track: MediaStreamTrack): boolean {
    // Check if track label indicates it's from canvas or AudioContext
    const label = track.label.toLowerCase();
    return label.includes("canvas") || label === "" || track.id.startsWith("dummy-");
}
