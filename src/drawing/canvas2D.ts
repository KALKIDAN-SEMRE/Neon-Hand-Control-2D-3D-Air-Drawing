/**
 * 2D canvas drawing module for neon drawing with enhanced smoothing and glow effects.
 * Handles smooth interpolation, point tracking, and multi-layer neon effects.
 * 
 * Architecture: Isolated from gesture detection and 3D rendering to allow
 * independent optimization and feature additions.
 * 
 * Features:
 * - Enhanced smoothing using moving average and cubic interpolation
 * - Multi-layer neon glow effect for realistic appearance
 * - Point buffer for smooth line rendering
 * - Jitter reduction and noise filtering
 */

import { CONFIG } from '../core/config';
import { createNeonBrush, drawNeonLine, type BrushStyle } from './neonBrush';

export type Point2D = {
  x: number;
  y: number;
};

/**
 * Enhanced 2D canvas drawing with neon effects and advanced smoothing.
 */
export class Canvas2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private brush: BrushStyle;
  private lastPoint: Point2D | null = null;
  private isDrawing: boolean = false;
  
  // Smoothing buffers for better interpolation
  private pointBuffer: Point2D[] = [];
  private readonly bufferSize: number = 5;
  private smoothedPoints: Point2D[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', {
      alpha: true, // Enable transparency for glow effects
      desynchronized: true, // Better performance
    });
    if (!context) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = context;
    this.brush = createNeonBrush();

    // Set canvas dimensions
    this.canvas.width = CONFIG.canvas.width;
    this.canvas.height = CONFIG.canvas.height;

    // Set CSS dimensions for display
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    // Enable image smoothing for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Start drawing at a point (index finger tip position).
   * Initializes the drawing state and clears buffers.
   */
  startDrawing(point: Point2D): void {
    this.isDrawing = true;
    this.lastPoint = point;
    this.pointBuffer = [point];
    this.smoothedPoints = [point];
  }

  /**
   * Draw to a new point with enhanced smoothing and neon glow.
   * Uses index finger tip position for drawing.
   * 
   * @param point - New point from index finger tip (normalized coordinates)
   */
  drawTo(point: Point2D): void {
    if (!this.isDrawing || !this.lastPoint) {
      return;
    }

    // Add point to buffer for smoothing
    this.pointBuffer.push(point);
    if (this.pointBuffer.length > this.bufferSize) {
      this.pointBuffer.shift();
    }

    // Apply enhanced smoothing
    const smoothedPoint = this.applySmoothing(point);

    // Only draw if moved enough to avoid jitter
    const distance = this.getDistance(this.lastPoint, smoothedPoint);
    if (distance < CONFIG.drawing.minDistance) {
      return;
    }

    // Add smoothed point to path
    this.smoothedPoints.push(smoothedPoint);

    // Draw neon line with enhanced glow effect
    // Only draw if we have enough points for smooth curves
    if (this.smoothedPoints.length >= 2) {
      drawNeonLine(this.ctx, this.brush, this.smoothedPoints);
    }

    this.lastPoint = smoothedPoint;
  }

  /**
   * Stop drawing and finalize the current line.
   */
  stopDrawing(): void {
    if (this.isDrawing && this.smoothedPoints.length > 0) {
      // Draw final segment if needed
      if (this.smoothedPoints.length >= 2) {
        drawNeonLine(this.ctx, this.brush, this.smoothedPoints);
      }
    }
    
    this.isDrawing = false;
    this.lastPoint = null;
    this.pointBuffer = [];
    this.smoothedPoints = [];
  }

  /**
   * Apply enhanced smoothing to reduce jitter and create smooth lines.
   * Uses multiple techniques:
   * 1. Moving average for noise reduction
   * 2. Linear interpolation for smooth transitions
   * 3. Cubic interpolation for natural curves
   */
  private applySmoothing(point: Point2D): Point2D {
    if (this.pointBuffer.length === 1) {
      return point;
    }

    // Technique 1: Moving average (simple but effective)
    const avgPoint = this.calculateMovingAverage();

    // Technique 2: Weighted interpolation with last point
    // This creates smoother transitions
    const smoothingFactor = CONFIG.drawing.smoothingFactor;
    const interpolatedPoint = this.interpolate(this.lastPoint!, avgPoint, smoothingFactor);

    // Technique 3: Apply additional smoothing if buffer is full
    if (this.pointBuffer.length >= this.bufferSize) {
      return this.cubicInterpolate(interpolatedPoint);
    }

    return interpolatedPoint;
  }

  /**
   * Calculate moving average of points in buffer.
   * Reduces noise and jitter from hand tracking.
   */
  private calculateMovingAverage(): Point2D {
    const sum = this.pointBuffer.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return {
      x: sum.x / this.pointBuffer.length,
      y: sum.y / this.pointBuffer.length,
    };
  }

  /**
   * Linear interpolation between two points.
   */
  private interpolate(a: Point2D, b: Point2D, factor: number): Point2D {
    return {
      x: a.x + (b.x - a.x) * factor,
      y: a.y + (b.y - a.y) * factor,
    };
  }

  /**
   * Apply additional smoothing using weighted average of recent points.
   * Creates smoother curves by considering point history.
   */
  private cubicInterpolate(point: Point2D): Point2D {
    if (this.pointBuffer.length < 3 || !this.lastPoint) {
      return point;
    }

    // Use weighted average: more weight on recent points
    // This creates natural-looking curves
    const weights = [0.1, 0.3, 0.6]; // Older to newer
    let weightedX = 0;
    let weightedY = 0;
    let totalWeight = 0;

    const startIdx = Math.max(0, this.pointBuffer.length - 3);
    for (let i = startIdx; i < this.pointBuffer.length; i++) {
      const weight = weights[i - startIdx] || 0.6;
      weightedX += this.pointBuffer[i].x * weight;
      weightedY += this.pointBuffer[i].y * weight;
      totalWeight += weight;
    }

    // Blend with current point for extra smoothness
    const smoothed = {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
    };

    // Final interpolation between smoothed point and current point
    return this.interpolate(smoothed, point, 0.7);
  }

  /**
   * Calculate Euclidean distance between two points.
   */
  private getDistance(a: Point2D, b: Point2D): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Convert normalized hand coordinates (0-1) to canvas coordinates.
   * Used to map index finger tip position to canvas space.
   * 
   * @param normalizedX - Normalized X coordinate from hand tracking (0-1)
   * @param normalizedY - Normalized Y coordinate from hand tracking (0-1)
   * @returns Canvas coordinates
   */
  normalizeToCanvas(normalizedX: number, normalizedY: number): Point2D {
    return {
      x: normalizedX * this.canvas.width,
      y: normalizedY * this.canvas.height,
    };
  }

  /**
   * Clear the canvas and reset drawing state.
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.stopDrawing();
  }

  /**
   * Get the canvas element (for export).
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Update brush color and regenerate brush style.
   */
  setBrushColor(color: string): void {
    this.brush = createNeonBrush(color);
  }

  /**
   * Get current brush style.
   */
  getBrush(): Readonly<BrushStyle> {
    return { ...this.brush };
  }

  /**
   * Update brush style.
   */
  setBrush(brush: Partial<BrushStyle>): void {
    this.brush = { ...this.brush, ...brush };
  }
}
