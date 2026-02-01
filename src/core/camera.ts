/**
 * Camera module for webcam access.
 * Provides a clean interface for initializing and managing video stream.
 * Architecture: Separated from hand tracking to allow swapping video sources
 * (e.g., recorded videos, WebRTC streams, or AR camera feeds).
 */

export class Camera {
  private videoElement: HTMLVideoElement;
  private stream: MediaStream | null = null;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  /**
   * Initialize camera with user's webcam.
   * @returns Promise that resolves when camera is ready
   */
  async initialize(): Promise<void> {
    try {
      console.log('Requesting camera access...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      };

      console.log('Calling getUserMedia...');
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', {
        tracks: this.stream.getTracks().length,
        videoTracks: this.stream.getVideoTracks().length,
      });

      this.videoElement.srcObject = this.stream;
      console.log('Video element srcObject set');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Camera initialization timeout'));
        }, 10000); // 10 second timeout

        this.videoElement.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log('Video metadata loaded:', {
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight,
          });
          
          this.videoElement.play().then(() => {
            console.log('Video playback started');
            resolve();
          }).catch((playError) => {
            console.error('Video play error:', playError);
            reject(playError);
          });
        };

        this.videoElement.onerror = (error) => {
          clearTimeout(timeout);
          console.error('Video element error:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Camera initialization error:', error);
      throw new Error(`Failed to initialize camera: ${error}`);
    }
  }

  /**
   * Get the video element (for MediaPipe processing).
   */
  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  /**
   * Stop the camera stream and clean up resources.
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement.srcObject) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Get current video dimensions.
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }
}
