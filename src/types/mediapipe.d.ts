/**
 * Global type declarations for MediaPipe Hands.
 * MediaPipe is loaded via CDN script tags and exposed on window.
 */

/**
 * MediaPipe Hands configuration interface.
 */
export interface HandsConfig {
  locateFile?: (file: string) => string;
}

/**
 * MediaPipe Hands results interface.
 */
export interface HandsResults {
  multiHandLandmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
  multiHandWorldLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandedness: Array<{ score: number; label: string }>;
  image: HTMLCanvasElement;
}

/**
 * MediaPipe Hands class (loaded from CDN, available on window.Hands).
 */
export interface Hands {
  setOptions(options: {
    maxNumHands?: number;
    modelComplexity?: 0 | 1;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }): void;
  onResults(callback: (results: HandsResults) => void): void;
  send(inputs: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
  close(): Promise<void>;
  reset(): void;
}

/**
 * MediaPipe Hands constructor type.
 */
export interface HandsConstructor {
  new (config?: HandsConfig): Hands;
}

/**
 * MediaPipe Camera utility (optional, for camera setup).
 */
export interface Camera {
  // Camera utility methods if needed
}

declare global {
  interface Window {
    Hands: HandsConstructor;
    Camera?: new (videoElement: HTMLVideoElement) => Camera;
  }
}

export {};
