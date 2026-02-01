/**
 * Main application entry point.
 * Orchestrates all modules: camera, hand tracking, gesture detection,
 * 2D/3D drawing, and UI controls.
 * 
 * Architecture: Central coordinator that connects all systems.
 * Each system is independent and can be swapped or extended without
 * affecting others.
 */

import './styles.css';
import { Camera } from './core/camera';
import { HandTracker, type HandData } from './core/handTracker';
import { detectGesture, Gesture, getGestureName, type GestureState } from './core/gestureDetector';
import { Canvas2D } from './drawing/canvas2D';
import { Scene3D } from './three/scene';
import { ModeIndicator, type DrawingMode } from './ui/modeIndicator';
import { Controls } from './ui/controls';
import { HandTrackingOverlay } from './ui/handTrackingOverlay';

class NeonHandControlApp {
  private camera!: Camera;
  private handTracker!: HandTracker;
  private canvas2D!: Canvas2D;
  private scene3D!: Scene3D;
  private modeIndicator!: ModeIndicator;
  private controls!: Controls;
  private handTrackingOverlay!: HandTrackingOverlay;

  private currentMode: DrawingMode = 'none';
  private lastGestureState: GestureState | null = null;

  constructor() {
    this.initializeElements();
  }

  /**
   * Initialize all UI elements and modules.
   */
  private initializeElements(): void {
    const app = document.querySelector<HTMLDivElement>('#app')!;
    
    // Create HTML structure
    app.innerHTML = `
      <div class="app-container">
        <div class="header">
          <h1>Neon Hand Control</h1>
          <div id="mode-indicator"></div>
        </div>
        
        <div class="main-content">
          <div class="video-container">
            <video id="video" autoplay playsinline></video>
          </div>
          
          <div class="drawing-container">
            <canvas id="canvas-2d"></canvas>
            <div id="scene-3d"></div>
            <div id="hand-tracking-overlay-container"></div>
          </div>
        </div>
        
        <div id="controls" class="controls-container"></div>
        
        <div class="instructions">
          <h3>Gestures:</h3>
          <ul>
            <li><strong>Open Hand</strong> → 2D Drawing Mode</li>
            <li><strong>Closed Fist</strong> → 3D Drawing Mode</li>
            <li><strong>Pinch</strong> → Start Drawing</li>
            <li><strong>Release Pinch</strong> → Stop Drawing</li>
            <li><strong>Move Hand Up/Down (Fist)</strong> → Control Z-Depth</li>
            <li><strong>Spread Fingers</strong> → Erase/Reset</li>
          </ul>
        </div>
      </div>
    `;

    // Initialize modules
    const videoElement = document.querySelector<HTMLVideoElement>('#video')!;
    const canvas2DElement = document.querySelector<HTMLCanvasElement>('#canvas-2d')!;
    const scene3DContainer = document.querySelector<HTMLDivElement>('#scene-3d')!;
    const modeIndicatorContainer = document.querySelector<HTMLDivElement>('#mode-indicator')!;
    const controlsContainer = document.querySelector<HTMLDivElement>('#controls')!;
    const overlayContainer = document.querySelector<HTMLDivElement>('#hand-tracking-overlay-container')!;

    this.camera = new Camera(videoElement);
    this.handTracker = new HandTracker(videoElement); // Pass video element to tracker
    this.canvas2D = new Canvas2D(canvas2DElement);
    this.scene3D = new Scene3D(scene3DContainer);
    this.modeIndicator = new ModeIndicator(modeIndicatorContainer);
    this.controls = new Controls(controlsContainer);
    this.handTrackingOverlay = new HandTrackingOverlay(overlayContainer);

    // Register controls
    this.controls.register(
      this.canvas2D,
      this.scene3D,
      () => this.canvas2D.clear(),
      () => this.scene3D.clear()
    );
  }

  /**
   * Initialize camera and start hand tracking.
   * 
   * Initialization order:
   * 1. Wait for MediaPipe Hands to be available (loaded via script tag)
   * 2. Initialize camera
   * 3. Set up hand tracking callback
   * 4. Start hand tracker (waits for MediaPipe internally)
   */
  async initialize(): Promise<void> {
    try {
      console.log('=== Initializing Neon Hand Control App ===');
      
      // Step 1: Ensure MediaPipe Hands is loaded (from script tag in index.html)
      console.log('Step 1: Checking MediaPipe Hands availability...');
      if (typeof window === 'undefined' || !(window as any).Hands) {
        console.warn('MediaPipe Hands not yet available, waiting...');
        // Wait up to 5 seconds for script tag to load
        let attempts = 0;
        while (attempts < 50 && (!(window as any).Hands)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        if (!(window as any).Hands) {
          throw new Error('MediaPipe Hands script not loaded. Ensure script tag in index.html loads before app.');
        }
      }
      console.log('✓ MediaPipe Hands available');
      
      // Step 2: Initialize camera
      console.log('Step 2: Initializing camera...');
      await this.camera.initialize();
      const videoElement = this.camera.getVideoElement();
      console.log('✓ Camera initialized');
      console.log('Video dimensions:', {
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        readyState: videoElement.readyState,
      });
      
      // Step 3: Connect video to hand tracker
      if (this.handTracker.getVideoSource() !== videoElement) {
        this.handTracker.setVideoSource(videoElement);
      }
      
      // Step 4: Set up hand tracking callback
      console.log('Step 3: Setting up hand tracking callback...');
      this.handTracker.onHandData((handData) => {
        this.handleHandData(handData);
      });
      console.log('✓ Callback registered');
      
      // Step 5: Wait for video to be ready
      console.log('Step 4: Waiting for video to be ready...');
      await this.waitForVideoReady(videoElement);
      
      // Step 6: Start hand tracker (waits for MediaPipe initialization internally)
      console.log('Step 5: Starting hand tracker...');
      await this.handTracker.start();
      
      console.log('=== Initialization Complete ===');
      console.log('Hold your hand in front of the camera to test detection');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to initialize: ${errorMessage}. Check console for details.`);
    }
  }

  /**
   * Wait for video element to be ready.
   */
  private waitForVideoReady(videoElement: HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      if (videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
        resolve();
        return;
      }

      const checkReady = () => {
        if (videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
          console.log('✓ Video is ready');
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      videoElement.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded');
        checkReady();
      }, { once: true });

      videoElement.addEventListener('canplaythrough', () => {
        console.log('Video can play through');
        checkReady();
      }, { once: true });

      // Fallback timeout
      setTimeout(() => {
        console.warn('Video ready timeout, proceeding anyway...');
        resolve();
      }, 3000);
    });
  }

  /**
   * Handle hand tracking data and update drawing.
   */
  private handleHandData(handData: HandData | null): void {
    // Update hand tracking overlay for debugging
    this.handTrackingOverlay.update(handData);
    
    const gestureState = detectGesture(handData);
    this.updateDrawing(gestureState, handData);
    this.updateUI(gestureState);
    this.lastGestureState = gestureState;
  }

  /**
   * Update drawing based on gesture state.
   */
  private updateDrawing(gestureState: GestureState, handData: HandData | null): void {
    if (!handData) {
      // No hand detected - stop drawing
      if (this.currentMode === '2D') {
        this.canvas2D.stopDrawing();
      } else if (this.currentMode === '3D') {
        this.scene3D.stopDrawing();
      }
      this.currentMode = 'none';
      return;
    }

    const landmarks = handData.landmarks;
    const indexTip = landmarks[8]; // Index finger tip

    // Handle spread gesture (erase)
    if (gestureState.gesture === Gesture.SPREAD_FINGERS) {
      if (this.currentMode === '2D') {
        this.canvas2D.clear();
      } else if (this.currentMode === '3D') {
        this.scene3D.clear();
      }
      return;
    }

    // Determine mode based on gesture
    if (gestureState.gesture === Gesture.CLOSED_FIST) {
      this.currentMode = '3D';
    } else if (gestureState.gesture === Gesture.PINCH) {
      // Only PINCH gesture activates 2D drawing mode
      this.currentMode = '2D';
    } else if (gestureState.gesture === Gesture.OPEN_HAND) {
      // Open hand sets 2D mode but doesn't draw
      this.currentMode = '2D';
      // Stop drawing if was previously drawing
      this.canvas2D.stopDrawing();
      return;
    }

    // Handle drawing - only when PINCH is active for 2D mode
    if (gestureState.isDrawing && gestureState.gesture === Gesture.PINCH) {
      if (this.currentMode === '2D') {
        // Stop 3D drawing if switching modes
        if (this.lastGestureState?.gesture === Gesture.CLOSED_FIST) {
          this.scene3D.stopDrawing();
        }

        // Use index finger tip for drawing
        const point = this.canvas2D.normalizeToCanvas(indexTip.x, indexTip.y);
        
        if (!this.lastGestureState?.isDrawing || this.lastGestureState.gesture !== Gesture.PINCH) {
          // Start new line when pinch begins
          this.canvas2D.startDrawing(point);
        } else {
          // Continue drawing while pinch is active
          this.canvas2D.drawTo(point);
        }
      } else if (this.currentMode === '3D') {
        // Stop 2D drawing if switching modes
        if (this.lastGestureState?.gesture === Gesture.PINCH || this.lastGestureState?.gesture === Gesture.OPEN_HAND) {
          this.canvas2D.stopDrawing();
        }

        const coords = this.scene3D.normalizeTo3D(
          indexTip.x,
          indexTip.y,
          gestureState.depth
        );

        if (!this.lastGestureState?.isDrawing || this.lastGestureState.gesture !== Gesture.CLOSED_FIST) {
          // Start new line
          this.scene3D.startDrawing(coords.x, coords.y, coords.z);
        } else {
          // Continue drawing
          this.scene3D.addPoint(coords.x, coords.y, coords.z);
        }
      }
    } else {
      // Stop drawing
      if (this.currentMode === '2D') {
        this.canvas2D.stopDrawing();
      } else if (this.currentMode === '3D') {
        this.scene3D.stopDrawing();
      }
    }
  }

  /**
   * Update UI indicators.
   */
  private updateUI(gestureState: GestureState): void {
    const gestureName = getGestureName(gestureState.gesture);
    this.modeIndicator.updateMode(this.currentMode, gestureName);
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.camera.stop();
    this.handTracker.dispose();
    this.scene3D.dispose();
  }
}

// Initialize app when DOM is ready
const app = new NeonHandControlApp();
app.initialize().catch(console.error);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  app.dispose();
});
