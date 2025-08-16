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

class AudioRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        if (input.length > 0) {
            const inputChannel = input[0];

            // Copy input to our buffer
            for (let i = 0; i < inputChannel.length; i++) {
                this.buffer[this.bufferIndex] = inputChannel[i];
                this.bufferIndex++;

                // When buffer is full, send to main thread
                if (this.bufferIndex >= this.bufferSize) {
                    this.port.postMessage({
                        type: 'audioData',
                        audioData: new Float32Array(this.buffer)
                    });

                    // Reset buffer
                    this.bufferIndex = 0;
                    this.buffer.fill(0);
                }
            }
        }

        // Continue processing
        return true;
    }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);

/**
 * Audio Worklet Processor for Voice Activity Detection
 * Processes audio in frames for VAD analysis
 */
class VADAudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.frameSize = options.processorOptions?.frameSize || 1024;
        this.sampleBuffer = [];
        this.port.onmessage = this.handleMessage.bind(this);
    }

    handleMessage(event) {
        // Handle messages from main thread if needed
        console.log('[VADAudioProcessor] Received message:', event.data);
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        if (input && input.length > 0 && input[0]) {
            const inputChannel = input[0];

            // DEBUG: Log input levels periodically
             if (this.frameCount % 100 === 0) {
                const max = Math.max(...inputChannel.map(Math.abs));
                const avg = inputChannel.reduce((sum, val) => sum + Math.abs(val), 0) / inputChannel.length;
                console.log(`[Worklet] Frame: ${this.frameCount}, Max: ${max.toFixed(6)}, Avg: ${avg.toFixed(6)}, Length: ${inputChannel.length}`);
            }
            this.frameCount++;
            
            // Add samples to buffer
            for (let i = 0; i < inputChannel.length; i++) {
                this.sampleBuffer.push(inputChannel[i]);

                // When we have enough samples for a frame, process it
                if (this.sampleBuffer.length >= this.frameSize) {
                    const frame = new Float32Array(this.sampleBuffer.splice(0, this.frameSize));

                    // Calculate basic energy for debug
                    const energy = frame.reduce((sum, val) => sum + val * val, 0) / frame.length;

                    // Send audio frame to main thread for VAD processing
                    this.port.postMessage({
                        audioData: frame,
                        // timestamp: Date.now(), // Use Date.now() instead of currentTime
                        timestamp: currentTime * 1000,
                        // energy: energy 
                    });
                }
            }
        }

        // Keep processor alive
        return true;
    }
}

// Register both processors
registerProcessor('audio-worklet-processor', VADAudioProcessor);
