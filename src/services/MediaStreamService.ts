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
            console.log("[MediaService] Using existing local stream");
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
        console.log("[MediaService] Initializing new local media stream");

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
            console.warn(
                "Failed to get video+audio, trying video only:",
                errorVideoAudio
            );
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
                console.warn(
                    "Failed to get video, trying audio only:",
                    errorVideo
                );
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
                    console.warn(
                        "Failed to get any media, creating empty stream:",
                        errorAudio
                    );
                    // Create empty stream as fallback
                    return new MediaStream();
                }
            }
        }
    }

    toggleVideo(): boolean {
        if (!this._localStream) return false;

        const videoTrack = this._localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            return videoTrack.enabled;
        }
        return false;
    }

    toggleAudio(): boolean {
        if (!this._localStream) return false;

        const audioTrack = this._localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return audioTrack.enabled;
        }
        return false;
    }

    cleanup(): void {
        if (this._localStream) {
            console.log("[MediaService] Cleaning up local media stream");
            this._localStream.getTracks().forEach((track) => track.stop());
            this._localStream = null;
        }
        this._isInitializing = false;
        this._initPromise = null;
    }

    // Force cleanup - used when user leaves video call pages
    forceCleanup(): void {
        console.log("[MediaService] Force cleaning up media stream");
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
