/**
 * Configuration constants for the Neon Hand Control application.
 * Centralized configuration makes it easy to tune gesture thresholds,
 * drawing parameters, and visual effects without hunting through code.
 */

export const CONFIG = {
  // MediaPipe Hands configuration
  hands: {
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.3, // Lowered for better detection
    minTrackingConfidence: 0.3, // Lowered for better tracking
  },

  // Gesture detection thresholds (normalized coordinates 0-1)
  gestures: {
    pinchThreshold: 0.05, // Distance between thumb and index finger tips
    fistThreshold: 0.08, // Average distance from finger tips to palm center
    spreadThreshold: 0.15, // Minimum distance between finger tips for spread
    depthSensitivity: 2.0, // Multiplier for vertical hand movement → Z-depth
  },

  // Drawing configuration
  drawing: {
    smoothingFactor: 0.7, // Interpolation factor for smooth movement (0-1)
    minDistance: 0.01, // Minimum distance to register a new point
    lineWidth: 4,
    glowRadius: 20,
    glowColor: '#ffffff', // White for visibility on black background
  },

  // 3D rendering configuration
  three: {
    fov: 75,
    near: 0.1,
    far: 1000,
    backgroundColor: 0x000000,
    neonColor: 0x00ffff,
    neonIntensity: 2.0,
    lineWidth: 3,
  },

  // Canvas dimensions
  canvas: {
    width: 1280,
    height: 720,
  },
} as const;
