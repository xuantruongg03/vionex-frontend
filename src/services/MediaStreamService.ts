class MediaStreamService {
    private static instance: MediaStreamService;
    private _localStream: MediaStream | null = null;
    private _isInitializing = false;
    private _initPromise: Promise<MediaStream> | null = null;

    private constructor() {}

    static getInstance(): MediaStreamService {
        if (!MediaStreamService.instance) {
            MediaStreamService.instance = new MediaStreamService();
        }
        return MediaStreamService.instance;
    }

    get localStream(): MediaStream | null {
        return this._localStream;
    }

    get isInitializing(): boolean {
        return this._isInitializing;
    }

    async initializeLocalMedia(): Promise<MediaStream> {
        // If already initializing, return the existing promise
        if (this._initPromise) {
            return this._initPromise;
        }

        // If already initialized, return existing stream
        if (this._localStream) {
            return this._localStream;
        }

        // Start initialization
        this._isInitializing = true;
        this._initPromise = this._doInitialize();

        try {
            const stream = await this._initPromise;
            this._localStream = stream;
            return stream;
        } finally {
            this._isInitializing = false;
            this._initPromise = null;
        }
    }

    private async _doInitialize(): Promise<MediaStream> {
        try {
            // Try to get both video and audio
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            return stream;
        } catch (errorVideoAudio) {
            try {
                // Try video only
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 },
                    },
                });
                return stream;
            } catch (errorVideo) {
                try {
                    // Try audio only
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                    });
                    return stream;
                } catch (errorAudio) {
                    console.warn("Failed to get any media, creating empty stream:", errorAudio);
                    // Create empty stream as fallback
                    return new MediaStream();
                }
            }
        }
    }

    // Toggle video - Stop track when OFF (release hardware), return status
    toggleVideo(): boolean {
        if (!this._localStream) return false;

        const videoTrack = this._localStream.getVideoTracks()[0];

        if (!videoTrack) {
            console.warn("[MediaService] No video track to toggle");
            return false;
        }

        if (videoTrack.enabled) {
            videoTrack.stop();
            this._localStream.removeTrack(videoTrack);
            return false;
        } else {
            // Track disabled - enable it
            videoTrack.enabled = true;
            return true;
        }
    }

    // Request new video track
    async requestVideoTrack(): Promise<MediaStreamTrack | null> {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                },
            });

            const newVideoTrack = videoStream.getVideoTracks()[0];
            if (newVideoTrack && this._localStream) {
                this._localStream.addTrack(newVideoTrack);
                return newVideoTrack;
            }
            return null;
        } catch (error) {
            console.error("[MediaService] Failed to request camera:", error);
            return null;
        }
    }

    toggleAudio(): boolean {
        if (!this._localStream) return false;

        const audioTrack = this._localStream.getAudioTracks()[0];

        if (!audioTrack) {
            return false;
        }

        if (audioTrack.enabled) {
            audioTrack.stop();
            this._localStream.removeTrack(audioTrack);
            return false;
        } else {
            // Track disabled - enable it
            audioTrack.enabled = true;
            return true;
        }
    }

    // Request new audio track
    async requestAudioTrack(): Promise<MediaStreamTrack | null> {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            const newAudioTrack = audioStream.getAudioTracks()[0];
            if (newAudioTrack && this._localStream) {
                this._localStream.addTrack(newAudioTrack);
                return newAudioTrack;
            }
            return null;
        } catch (error) {
            console.error("[MediaService] Failed to request microphone:", error);
            return null;
        }
    }

    cleanup(): void {
        if (this._localStream) {
            this._localStream.getTracks().forEach((track) => track.stop());
            this._localStream = null;
        }
        this._isInitializing = false;
        this._initPromise = null;
    }

    // Force cleanup - used when user leaves video call pages
    forceCleanup(): void {
        this.cleanup();
    }
}

export const mediaStreamService = MediaStreamService.getInstance();

// Export cleanup function for app-level cleanup (like window beforeunload)
export const cleanupGlobalMedia = () => {
    mediaStreamService.cleanup();
};

// Export force cleanup for route-based cleanup
export const forceCleanupGlobalMedia = () => {
    mediaStreamService.forceCleanup();
};
