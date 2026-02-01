/**
 * Gesture detection module with enum-based state machine.
 * Analyzes hand landmarks to detect gestures: pinch, fist, open hand, spread.
 * 
 * Architecture: 
 * - Enum-based gesture types for type safety
 * - State machine pattern for clean gesture transitions
 * - Confidence scoring for each gesture
 * - Extensible design for adding new gestures
 * 
 * MediaPipe Hands Landmark Indices:
 * - 0: Wrist
 * - 4: Thumb tip
 * - 8: Index finger tip
 * - 12: Middle finger tip
 * - 16: Ring finger tip
 * - 20: Pinky tip
 */

import type { HandData, HandLandmark } from './handTracker';
import { CONFIG } from './config';

/**
 * Enumeration of all supported gestures.
 * Used for type-safe gesture detection and state management.
 */
export enum Gesture {
  /** No hand detected or unrecognized gesture */
  NONE = 'none',
  /** Open hand with fingers extended (not pinched, not fist) */
  OPEN_HAND = 'open',
  /** Closed fist with all fingers curled */
  CLOSED_FIST = 'fist',
  /** Thumb and index finger pinched together */
  PINCH = 'pinch',
  /** Fingers spread wide apart */
  SPREAD_FINGERS = 'spread',
}

/**
 * Gesture detection result with confidence and metadata.
 * Represents the current state of the gesture detection state machine.
 */
export interface GestureState {
  /** Detected gesture type */
  gesture: Gesture;
  /** Confidence score (0-1) for the detected gesture */
  confidence: number;
  /** Whether this gesture should trigger drawing */
  isDrawing: boolean;
  /** Normalized Z-depth value (0-1) for 3D mode */
  depth: number;
  /** Additional metadata about the gesture */
  metadata?: {
    /** Distance measurements used for detection */
    distances?: {
      pinch?: number;
      fist?: number;
      spread?: number;
    };
  };
}

/**
 * Gesture detector class implementing a state machine pattern.
 * Provides clean, extensible gesture detection with confidence scoring.
 */
export class GestureDetector {
  private previousGesture: Gesture = Gesture.NONE;
  private gestureHistory: Gesture[] = [];
  private readonly historySize: number = 5;

  /**
   * Detect gesture from hand landmark data.
   * Implements priority-based state machine: PINCH > FIST > SPREAD > OPEN > NONE
   * 
   * @param handData - Hand tracking data with normalized landmarks
   * @returns GestureState with detected gesture and metadata
   */
  detect(handData: HandData | null): GestureState {
    if (!handData) {
      return this.createState(Gesture.NONE, 0, false, 0.5);
    }

    const landmarks = handData.landmarks;
    const wrist = landmarks[0];

    // Calculate all gesture confidences
    const pinchResult = this.detectPinch(landmarks);
    const fistResult = this.detectFist(landmarks);
    const spreadResult = this.detectSpread(landmarks);
    const openResult = this.detectOpen(landmarks, fistResult.confidence, pinchResult.confidence);

    // State machine: Priority-based detection
    // Priority order: PINCH > FIST > SPREAD > OPEN > NONE
    if (pinchResult.confidence > 0.5) {
      const state = this.createState(
        Gesture.PINCH,
        pinchResult.confidence,
        true,
        0.5,
        { distances: { pinch: pinchResult.distance } }
      );
      this.updateHistory(Gesture.PINCH);
      return state;
    }

    if (fistResult.confidence > 0.5) {
      // In fist mode, use vertical hand position to control depth
      const normalizedDepth = 1 - wrist.y;
      const depth = Math.max(0, Math.min(1, normalizedDepth * CONFIG.gestures.depthSensitivity));

      const state = this.createState(
        Gesture.CLOSED_FIST,
        fistResult.confidence,
        true,
        depth,
        { distances: { fist: fistResult.avgDistance } }
      );
      this.updateHistory(Gesture.CLOSED_FIST);
      return state;
    }

    if (spreadResult.confidence > 0.5) {
      const state = this.createState(
        Gesture.SPREAD_FINGERS,
        spreadResult.confidence,
        false,
        0.5,
        { distances: { spread: spreadResult.minDistance } }
      );
      this.updateHistory(Gesture.SPREAD_FINGERS);
      return state;
    }

    if (openResult.confidence > 0.5) {
      const state = this.createState(
        Gesture.OPEN_HAND,
        openResult.confidence,
        false,
        0.5
      );
      this.updateHistory(Gesture.OPEN_HAND);
      return state;
    }

    // No gesture detected with sufficient confidence
    const state = this.createState(Gesture.NONE, 0, false, 0.5);
    this.updateHistory(Gesture.NONE);
    return state;
  }

  /**
   * Create a gesture state object.
   */
  private createState(
    gesture: Gesture,
    confidence: number,
    isDrawing: boolean,
    depth: number,
    metadata?: GestureState['metadata']
  ): GestureState {
    return {
      gesture,
      confidence,
      isDrawing,
      depth,
      metadata,
    };
  }

  /**
   * Update gesture history for state machine transitions.
   */
  private updateHistory(gesture: Gesture): void {
    this.gestureHistory.push(gesture);
    if (this.gestureHistory.length > this.historySize) {
      this.gestureHistory.shift();
    }
    this.previousGesture = gesture;
  }

  /**
   * Get the previous gesture (useful for transition detection).
   */
  getPreviousGesture(): Gesture {
    return this.previousGesture;
  }

  /**
   * Get gesture history (useful for gesture sequence detection).
   */
  getHistory(): ReadonlyArray<Gesture> {
    return [...this.gestureHistory];
  }

  /**
   * Reset gesture history and state.
   */
  reset(): void {
    this.previousGesture = Gesture.NONE;
    this.gestureHistory = [];
  }

  /**
   * Detect pinch gesture (thumb and index finger together).
   * Returns confidence and distance measurement.
   */
  private detectPinch(landmarks: HandLandmark[]): {
    confidence: number;
    distance: number;
  } {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = this.calculateDistance(thumbTip, indexTip);

    // Confidence is inverse of distance (closer = higher confidence)
    // Normalize to 0-1 range based on threshold
    const normalizedDistance = distance / CONFIG.gestures.pinchThreshold;
    const confidence = Math.max(0, Math.min(1, 1 - normalizedDistance));

    return { confidence, distance };
  }

  /**
   * Detect closed fist gesture.
   * A fist is detected when finger tips are close to the wrist/palm center.
   */
  private detectFist(landmarks: HandLandmark[]): {
    confidence: number;
    avgDistance: number;
  } {
    const wrist = landmarks[0];
    const fingerTips = [
      landmarks[4],  // Thumb
      landmarks[8],  // Index
      landmarks[12], // Middle
      landmarks[16], // Ring
      landmarks[20], // Pinky
    ];

    // Calculate average distance from finger tips to wrist
    const distances = fingerTips.map(tip => this.calculateDistance(wrist, tip));
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;

    // Confidence is inverse of average distance
    // Normalize based on threshold
    const normalizedDistance = avgDistance / CONFIG.gestures.fistThreshold;
    const confidence = Math.max(0, Math.min(1, 1 - normalizedDistance));

    return { confidence, avgDistance };
  }

  /**
   * Detect spread fingers gesture.
   * Fingers are spread when adjacent finger tips are far apart.
   */
  private detectSpread(landmarks: HandLandmark[]): {
    confidence: number;
    minDistance: number;
  } {
    const fingerTips = [
      landmarks[8],  // Index
      landmarks[12], // Middle
      landmarks[16], // Ring
      landmarks[20], // Pinky
    ];

    // Calculate distances between adjacent finger tips
    const distances: number[] = [];
    for (let i = 0; i < fingerTips.length - 1; i++) {
      distances.push(this.calculateDistance(fingerTips[i], fingerTips[i + 1]));
    }

    // Find minimum distance between adjacent fingers
    const minDistance = Math.min(...distances);

    // Confidence increases as minimum distance increases
    // Normalize based on threshold
    const normalizedDistance = minDistance / CONFIG.gestures.spreadThreshold;
    const confidence = Math.max(0, Math.min(1, normalizedDistance));

    return { confidence, minDistance };
  }

  /**
   * Detect open hand gesture.
   * Hand is open when it's not a fist and not pinched.
   */
  private detectOpen(
    landmarks: HandLandmark[],
    fistConfidence: number,
    pinchConfidence: number
  ): {
    confidence: number;
  } {
    // Open hand is the inverse of fist and pinch
    // Higher confidence when both fist and pinch are low
    const combinedConfidence = (fistConfidence + pinchConfidence) / 2;
    const confidence = Math.max(0, 1 - combinedConfidence);

    // Additional check: verify fingers are extended
    // Check if middle finger tip is far from wrist
    const wrist = landmarks[0];
    const middleTip = landmarks[12];
    const middleDistance = this.calculateDistance(wrist, middleTip);

    // If middle finger is extended (far from wrist), increase confidence
    const extendedConfidence = Math.min(1, middleDistance / 0.15);
    const finalConfidence = (confidence + extendedConfidence) / 2;

    return { confidence: finalConfidence };
  }

  /**
   * Calculate 3D Euclidean distance between two landmarks.
   */
  private calculateDistance(a: HandLandmark, b: HandLandmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

/**
 * Global gesture detector instance.
 * Can be used as a singleton or create new instances for different contexts.
 */
let globalDetector: GestureDetector | null = null;

/**
 * Get or create the global gesture detector instance.
 */
export function getGestureDetector(): GestureDetector {
  if (!globalDetector) {
    globalDetector = new GestureDetector();
  }
  return globalDetector;
}

/**
 * Convenience function for simple gesture detection.
 * Uses the global detector instance.
 * 
 * @param handData - Hand tracking data
 * @returns GestureState with detected gesture
 */
export function detectGesture(handData: HandData | null): GestureState {
  return getGestureDetector().detect(handData);
}

/**
 * Check if a gesture state represents a specific gesture type.
 * Useful for type-safe gesture checking.
 */
export function isGesture(state: GestureState, gesture: Gesture): boolean {
  return state.gesture === gesture;
}

/**
 * Get gesture name as string (for display/logging).
 */
export function getGestureName(gesture: Gesture): string {
  switch (gesture) {
    case Gesture.NONE:
      return 'None';
    case Gesture.OPEN_HAND:
      return 'Open Hand';
    case Gesture.CLOSED_FIST:
      return 'Closed Fist';
    case Gesture.PINCH:
      return 'Pinch';
    case Gesture.SPREAD_FINGERS:
      return 'Spread Fingers';
    default:
      return 'Unknown';
  }
}
