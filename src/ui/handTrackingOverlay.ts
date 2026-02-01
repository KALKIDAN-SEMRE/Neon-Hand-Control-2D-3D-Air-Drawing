/**
 * Hand tracking overlay for debugging and visualization.
 * Displays hand landmarks, connections, and tracking status on screen.
 */

import type { HandData, HandLandmark } from '../core/handTracker';

export class HandTrackingOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isEnabled: boolean = true;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'hand-tracking-overlay';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '3'; // Above drawing canvas, below UI
    container.appendChild(this.canvas);

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context for hand tracking overlay');
    }
    this.ctx = context;

    // Set canvas size to match container
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Resize canvas to match container.
   */
  private resize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
    }
  }

  /**
   * Update overlay with hand tracking data.
   */
  update(handData: HandData | null): void {
    if (!this.isEnabled) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!handData) {
      // Show "No hand detected" message
      this.drawNoHandMessage();
      return;
    }

    // Draw hand landmarks and connections
    this.drawHandSkeleton(handData.landmarks);
    this.drawLandmarks(handData.landmarks);
    this.drawIndexTip(handData.indexTip);
    this.drawInfo(handData);
  }

  /**
   * Draw "No hand detected" message.
   */
  private drawNoHandMessage(): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('No Hand Detected', this.canvas.width / 2, 50);
    this.ctx.restore();
  }

  /**
   * Draw hand skeleton (connections between landmarks).
   */
  private drawHandSkeleton(landmarks: HandLandmark[]): void {
    if (landmarks.length < 21) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#00ff00'; // Green for skeleton
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.6;

    // Hand connections (MediaPipe Hands structure)
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index finger
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle finger
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring finger
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm
      [5, 9], [9, 13], [13, 17],
    ];

    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        const startX = landmarks[start].x * this.canvas.width;
        const startY = landmarks[start].y * this.canvas.height;
        const endX = landmarks[end].x * this.canvas.width;
        const endY = landmarks[end].y * this.canvas.height;

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
      }
    });

    this.ctx.restore();
  }

  /**
   * Draw all landmarks as circles.
   */
  private drawLandmarks(landmarks: HandLandmark[]): void {
    this.ctx.save();

    landmarks.forEach((landmark, index) => {
      const x = landmark.x * this.canvas.width;
      const y = landmark.y * this.canvas.height;

      // Different colors for different landmark types
      let color = '#00ffff'; // Cyan default
      let radius = 4;

      if (index === 0) {
        color = '#ff00ff'; // Magenta for wrist
        radius = 6;
      } else if (index === 8) {
        color = '#ffff00'; // Yellow for index tip (drawing point)
        radius = 8;
      } else if ([4, 8, 12, 16, 20].includes(index)) {
        color = '#00ff00'; // Green for finger tips
        radius = 5;
      }

      // Draw landmark circle
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  /**
   * Highlight index finger tip (drawing point).
   */
  private drawIndexTip(indexTip: HandLandmark): void {
    const x = indexTip.x * this.canvas.width;
    const y = indexTip.y * this.canvas.height;

    this.ctx.save();
    
    // Outer glow
    this.ctx.beginPath();
    this.ctx.arc(x, y, 15, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Inner circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fill();
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Label
    this.ctx.fillStyle = '#ffff00';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('DRAW POINT', x, y - 25);

    this.ctx.restore();
  }

  /**
   * Draw hand tracking info.
   */
  private drawInfo(handData: HandData): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 250, 100);

    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('✓ Hand Detected', 20, 35);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Hand: ${handData.handedness}`, 20, 55);
    this.ctx.fillText(`Confidence: ${(handData.detectionConfidence * 100).toFixed(0)}%`, 20, 75);
    this.ctx.fillText(`Z-Depth: ${handData.averageDepth.toFixed(3)}`, 20, 95);

    this.ctx.restore();
  }

  /**
   * Enable or disable the overlay.
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Toggle overlay visibility.
   */
  toggle(): void {
    this.setEnabled(!this.isEnabled);
  }

  /**
   * Get canvas element.
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
