/**
 * Hand tracking module using MediaPipe Hands.
 * Processes video frames and provides normalized hand landmark data with Z-depth values.
 * 
 * Architecture: Framework-agnostic design that works with any video source.
 * MediaPipe Hands is loaded via CDN script tag and accessed via window.Hands.
 * 
 * Features:
 * - Normalized landmark coordinates (0-1 range)
 * - Z-depth values for 3D spatial awareness
 * - Confidence scores for detection and tracking
 * - Support for multiple hands
 * - Reusable across different frameworks and contexts
 */

import { CONFIG } from './config';
import type { Hands, HandsConstructor, HandsConfig, HandsResults } from '../types/mediapipe';

/**
 * Normalized hand landmark with X, Y, Z coordinates.
 * All coordinates are normalized to 0-1 range relative to video frame dimensions.
 * 
 * - x, y: Normalized screen coordinates (0-1)
 * - z: Normalized depth value (relative to wrist, negative = closer to camera)
 */
export interface HandLandmark {
  /** Normalized X coordinate (0 = left edge, 1 = right edge) */
  x: number;
  /** Normalized Y coordinate (0 = top edge, 1 = bottom edge) */
  y: number;
  /** Normalized Z-depth (relative to wrist, negative = closer to camera) */
  z: number;
}

/**
 * Complete hand tracking data with landmarks, handedness, and confidence scores.
 */
export interface HandData {
  /** Array of 21 normalized landmarks (MediaPipe Hands standard) */
  landmarks: HandLandmark[];
  /** Handedness: 'Left' or 'Right' */
  handedness: 'Left' | 'Right';
  /** Detection confidence (0-1) */
  detectionConfidence: number;
  /** Tracking confidence (0-1) */
  trackingConfidence: number;
  /** Average Z-depth of all landmarks (useful for overall hand position) */
  averageDepth: number;
  /** Wrist landmark (index 0) for reference point */
  wrist: HandLandmark;
  /** Index finger tip (index 8) - commonly used for drawing */
  indexTip: HandLandmark;
}

/**
 * Callback function type for hand tracking results.
 * Receives null when no hand is detected, or HandData when hand is detected.
 */
export type HandTrackingCallback = (handData: HandData | null) => void;

/**
 * Configuration options for MediaPipe Hands tracker.
 */
export interface HandTrackerOptions {
  /** Maximum number of hands to detect (1-2) */
  maxNumHands?: number;
  /** Model complexity (0=fast, 1=balanced) - MediaPipe Hands supports 0 or 1 */
  modelComplexity?: 0 | 1;
  /** Minimum detection confidence threshold (0-1) */
  minDetectionConfidence?: number;
  /** Minimum tracking confidence threshold (0-1) */
  minTrackingConfidence?: number;
  /** Custom file locator for MediaPipe assets (for offline use) */
  locateFile?: (file: string) => string;
}

/**
 * Wait for MediaPipe Hands to be available on window.
 * MediaPipe is loaded via CDN script tag in index.html.
 */
async function waitForMediaPipeHands(timeoutMs: number = 10000): Promise<HandsConstructor> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (typeof window !== 'undefined' && window.Hands) {
      console.log('✓ MediaPipe Hands available on window.Hands');
      return window.Hands;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`MediaPipe Hands not available after ${timeoutMs}ms. Ensure script tag loads before app initialization.`);
}

/**
 * MediaPipe Hands tracker - framework-agnostic hand tracking module.
 * 
 * Usage:
 * ```typescript
 * const tracker = new HandTracker(videoElement);
 * tracker.onHandData((handData) => {
 *   if (handData) {
 *     console.log('Hand detected:', handData.landmarks);
 *     console.log('Z-depth:', handData.averageDepth);
 *   }
 * });
 * await tracker.start();
 * ```
 */
export class HandTracker {
  private hands: Hands | null = null;
  private videoSource: HTMLVideoElement | HTMLCanvasElement | ImageBitmap | null = null;
  private callback: HandTrackingCallback | null = null;
  private isProcessing: boolean = false;
  private animationFrameId: number | null = null;
  private options: Required<HandTrackerOptions>;
  private initializationPromise: Promise<void>;

  /**
   * Create a new HandTracker instance.
   * 
   * @param videoSource - Video element, canvas, or image bitmap to track from
   * @param options - Optional configuration overrides
   */
  constructor(
    videoSource?: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
    options?: HandTrackerOptions
  ) {
    this.videoSource = videoSource || null;
    
    // Merge options with defaults from CONFIG
    this.options = {
      maxNumHands: options?.maxNumHands ?? CONFIG.hands.maxNumHands,
      modelComplexity: options?.modelComplexity ?? CONFIG.hands.modelComplexity,
      minDetectionConfidence: options?.minDetectionConfidence ?? CONFIG.hands.minDetectionConfidence,
      minTrackingConfidence: options?.minTrackingConfidence ?? CONFIG.hands.minTrackingConfidence,
      locateFile: options?.locateFile ?? ((file: string) => {
        // MediaPipe assets are loaded from jsDelivr CDN
        // Use same version as script tag to avoid mismatches
        // CRITICAL: Must always return a valid string URL
        if (!file || typeof file !== 'string') {
          console.error('locateFile received invalid file parameter:', file);
          throw new Error(`Invalid file parameter: ${file}`);
        }
        
        // Remove leading slash if present
        const cleanFile = file.startsWith('/') ? file.slice(1) : file;
        const baseUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';
        const url = `${baseUrl}/${cleanFile}`;
        
        // Ensure we return a valid string
        if (!url || typeof url !== 'string') {
          throw new Error(`Failed to construct URL for: ${file}`);
        }
        
        return url;
      }),
    };

    // Initialize MediaPipe Hands asynchronously
    // Wait for window.Hands to be available (loaded via script tag)
    this.initializationPromise = this.initializeMediaPipe();
  }

  /**
   * Initialize MediaPipe Hands instance.
   * Waits for window.Hands to be available, then creates instance.
   */
  private async initializeMediaPipe(): Promise<void> {
    try {
      // Check for SharedArrayBuffer support (required for MediaPipe WASM)
      if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error('SharedArrayBuffer is not available. Ensure COEP/COOP headers are set.');
      }
      console.log('✓ SharedArrayBuffer available');

      console.log('Waiting for MediaPipe Hands to be available...');
      
      // Wait for MediaPipe to be loaded via script tag
      const HandsClass = await waitForMediaPipeHands(10000);
      
      console.log('Creating MediaPipe Hands instance...');
      
      // Create locateFile wrapper for asset loading
      // MediaPipe will call this to load WASM files, model files, etc.
      // CRITICAL: Must always return a valid string URL - MediaPipe's loader is very sensitive
      const locateFileWrapper = (file: string): string => {
        // Validate input
        if (!file || typeof file !== 'string') {
          console.error('locateFile received invalid input:', file, typeof file);
          file = String(file || '');
        }
        
        // Get URL from configured locateFile function
        let url: string;
        try {
          url = this.options.locateFile(file);
        } catch (error) {
          console.error('Error in locateFile function:', error);
          // Emergency fallback
          const cleanFile = file.startsWith('/') ? file.slice(1) : file;
          url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${cleanFile}`;
        }
        
        // Validate output - MUST be a string
        if (!url || typeof url !== 'string') {
          console.error('locateFile returned invalid URL:', url, 'for file:', file);
          // Emergency fallback
          const cleanFile = file.startsWith('/') ? file.slice(1) : file;
          url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${cleanFile}`;
        }
        
        // Log important files
        if (file.includes('.wasm') || file.includes('.data') || file.includes('.pb') || file.includes('loader')) {
          console.log(`MediaPipe asset: ${file} -> ${url}`);
        }
        
        return url;
      };

      // Create Hands instance with configuration
      // MediaPipe will use locateFile to fetch WASM and model assets
      const config: HandsConfig = { 
        locateFile: locateFileWrapper
      };
      
      try {
        this.hands = new HandsClass(config);
        console.log('MediaPipe Hands instance created');
      } catch (error) {
        console.error('Error creating Hands instance:', error);
        throw error;
      }

      // Wait for MediaPipe to initialize WASM and load assets
      // This prevents "Aborted" errors from premature initialization
      console.log('Waiting for MediaPipe WASM initialization...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set MediaPipe options
      this.hands.setOptions({
        maxNumHands: this.options.maxNumHands,
        modelComplexity: this.options.modelComplexity,
        minDetectionConfidence: this.options.minDetectionConfidence,
        minTrackingConfidence: this.options.minTrackingConfidence,
      });

      // Register results callback
      this.hands.onResults((results: HandsResults) => {
        this.handleResults(results);
      });

      console.log('✓ MediaPipe Hands initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MediaPipe Hands:', error);
      throw new Error(`MediaPipe Hands initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process MediaPipe results and convert to normalized HandData format.
   */
  private handleResults(results: HandsResults): void {
    if (!this.callback) {
      return; // No callback registered, skip processing
    }

    // Check if hand detected
    if (
      results.multiHandLandmarks &&
      results.multiHandLandmarks.length > 0 &&
      results.multiHandedness &&
      results.multiHandedness.length > 0
    ) {
      // Process first detected hand
      const hand = results.multiHandLandmarks[0];
      const handInfo = results.multiHandedness[0];
      
      // Convert MediaPipe landmarks to normalized format
      const landmarks: HandLandmark[] = hand.map((landmark) => ({
        x: landmark.x, // Already normalized 0-1
        y: landmark.y, // Already normalized 0-1
        z: landmark.z, // Normalized depth (relative to wrist)
      }));

      // Calculate average Z-depth
      const averageDepth = landmarks.reduce((sum, lm) => sum + lm.z, 0) / landmarks.length;

      // Extract confidence scores
      const detectionConfidence = handInfo.score || 0;
      const trackingConfidence = results.multiHandWorldLandmarks?.[0] 
        ? 1.0 // If world landmarks exist, tracking is active
        : 0.5;

      // Create hand data object
      const handData: HandData = {
        landmarks,
        handedness: (handInfo.label || 'Right') as 'Left' | 'Right',
        detectionConfidence,
        trackingConfidence,
        averageDepth,
        wrist: landmarks[0], // Wrist is always index 0
        indexTip: landmarks[8], // Index finger tip is always index 8
      };

      // Log successful detection (occasionally to avoid spam)
      if (Math.random() < 0.05) {
        console.log('✓ Hand detected', {
          confidence: detectionConfidence.toFixed(2),
          handedness: handData.handedness,
        });
      }

      this.callback(handData);
    } else {
      // No hand detected
      this.callback(null);
    }
  }

  /**
   * Start tracking hands from the video source.
   * Begins continuous frame processing loop.
   * 
   * IMPORTANT: Ensure MediaPipe script tag loads before calling this.
   */
  async start(): Promise<void> {
    if (this.isProcessing) {
      console.warn('HandTracker is already running');
      return;
    }

    if (!this.videoSource) {
      throw new Error('No video source provided. Set video source before starting.');
    }

    // Wait for MediaPipe initialization to complete
    console.log('Waiting for MediaPipe initialization...');
    await this.initializationPromise;

    if (!this.hands) {
      throw new Error('MediaPipe Hands not initialized');
    }

    // Verify video element is ready
    if (this.videoSource instanceof HTMLVideoElement) {
      const video = this.videoSource;
      
      if (video.readyState < video.HAVE_METADATA) {
        console.warn('Video not ready, waiting for metadata...');
        await new Promise<void>((resolve) => {
          const onReady = () => resolve();
          video.addEventListener('loadedmetadata', onReady, { once: true });
          video.addEventListener('canplay', onReady, { once: true });
        });
      }
    }

    console.log('Starting hand tracking...');
    this.isProcessing = true;
    this.processFrame();
  }

  /**
   * Stop tracking and cancel frame processing.
   */
  stop(): void {
    this.isProcessing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Process a single video frame through MediaPipe.
   */
  private processFrame(): void {
    if (!this.isProcessing || !this.videoSource || !this.hands) {
      return;
    }

    try {
      // Send frame to MediaPipe based on source type
      if (this.videoSource instanceof HTMLVideoElement) {
        const video = this.videoSource;
        if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
          this.hands.send({ image: video });
        }
      } else if (this.videoSource instanceof HTMLCanvasElement) {
        this.hands.send({ image: this.videoSource });
      } else if (this.videoSource instanceof ImageBitmap) {
        // Convert ImageBitmap to canvas
        const canvas = document.createElement('canvas');
        canvas.width = this.videoSource.width;
        canvas.height = this.videoSource.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(this.videoSource, 0, 0);
          this.hands.send({ image: canvas });
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
      // Continue processing even if one frame fails
    }

    // Continue processing frames
    this.animationFrameId = requestAnimationFrame(() => this.processFrame());
  }

  /**
   * Set or update the video source.
   */
  setVideoSource(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): void {
    this.videoSource = source;
  }

  /**
   * Get the current video source.
   */
  getVideoSource(): HTMLVideoElement | HTMLCanvasElement | ImageBitmap | null {
    return this.videoSource;
  }

  /**
   * Register callback for hand tracking results.
   */
  onHandData(callback: HandTrackingCallback): void {
    this.callback = callback;
  }

  /**
   * Remove the current callback.
   */
  removeCallback(): void {
    this.callback = null;
  }

  /**
   * Update MediaPipe Hands options at runtime.
   */
  updateOptions(options: Partial<HandTrackerOptions>): void {
    if (options.maxNumHands !== undefined) {
      this.options.maxNumHands = options.maxNumHands;
    }
    if (options.modelComplexity !== undefined) {
      this.options.modelComplexity = options.modelComplexity;
    }
    if (options.minDetectionConfidence !== undefined) {
      this.options.minDetectionConfidence = options.minDetectionConfidence;
    }
    if (options.minTrackingConfidence !== undefined) {
      this.options.minTrackingConfidence = options.minTrackingConfidence;
    }

    if (this.hands) {
      this.hands.setOptions({
        maxNumHands: this.options.maxNumHands,
        modelComplexity: this.options.modelComplexity,
        minDetectionConfidence: this.options.minDetectionConfidence,
        minTrackingConfidence: this.options.minTrackingConfidence,
      });
    }
  }

  /**
   * Get current configuration options.
   */
  getOptions(): Readonly<HandTrackerOptions> {
    return { ...this.options };
  }

  /**
   * Clean up resources and stop tracking.
   */
  async dispose(): Promise<void> {
    this.stop();
    this.callback = null;
    this.videoSource = null;
    
    if (this.hands) {
      try {
        await this.hands.close();
      } catch (error) {
        console.error('Error closing MediaPipe Hands:', error);
      }
      this.hands = null;
    }
  }
}
