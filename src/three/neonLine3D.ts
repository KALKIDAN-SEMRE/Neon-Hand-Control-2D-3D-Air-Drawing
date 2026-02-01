/**
 * 3D neon line rendering using Three.js.
 * Creates smooth, glowing 3D lines with emissive materials.
 * Architecture: Separated from scene management to allow different
 * line styles, particle effects, or rendering techniques.
 */

import * as THREE from 'three';
import { CONFIG } from '../core/config';

export class NeonLine3D {
  private points: THREE.Vector3[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private line: THREE.Line;
  private lastPoint: THREE.Vector3 | null = null;
  private isDrawing: boolean = false;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    
    // Create neon material with emissive glow
    // Note: linewidth is not supported in WebGL, but we keep it for documentation
    this.material = new THREE.LineBasicMaterial({
      color: CONFIG.three.neonColor,
      transparent: true,
      opacity: 0.9,
    });

    // Add emissive property for glow effect
    (this.material as any).emissive = new THREE.Color(CONFIG.three.neonColor);
    (this.material as any).emissiveIntensity = CONFIG.three.neonIntensity;

    this.line = new THREE.Line(this.geometry, this.material);
    scene.add(this.line);
  }

  /**
   * Start drawing a new line segment.
   */
  startDrawing(point: THREE.Vector3): void {
    this.isDrawing = true;
    this.lastPoint = point.clone();
    this.points = [point.clone()];
    this.updateGeometry();
  }

  /**
   * Add a point to the current line with smooth interpolation.
   */
  addPoint(point: THREE.Vector3): void {
    if (!this.isDrawing || !this.lastPoint) {
      return;
    }

    // Smooth interpolation
    const smoothedPoint = this.interpolate(
      this.lastPoint,
      point,
      CONFIG.drawing.smoothingFactor
    );

    // Only add if moved enough
    const distance = this.lastPoint.distanceTo(smoothedPoint);
    if (distance < CONFIG.drawing.minDistance) {
      return;
    }

    this.points.push(smoothedPoint.clone());
    this.lastPoint = smoothedPoint.clone();
    this.updateGeometry();
  }

  /**
   * Stop drawing the current line.
   */
  stopDrawing(): void {
    this.isDrawing = false;
    this.lastPoint = null;
  }

  /**
   * Interpolate between two 3D points.
   */
  private interpolate(a: THREE.Vector3, b: THREE.Vector3, factor: number): THREE.Vector3 {
    return a.clone().lerp(b, factor);
  }

  /**
   * Update the geometry with current points.
   */
  private updateGeometry(): void {
    if (this.points.length === 0) {
      return;
    }

    const positions = new Float32Array(this.points.length * 3);
    this.points.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    });

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.computeBoundingSphere();
  }

  /**
   * Clear all points.
   */
  clear(): void {
    this.points = [];
    this.lastPoint = null;
    this.isDrawing = false;
    this.updateGeometry();
  }

  /**
   * Get the line object for export.
   */
  getLine(): THREE.Line {
    return this.line;
  }

  /**
   * Get all points for export.
   */
  getPoints(): THREE.Vector3[] {
    return this.points.map((p) => p.clone());
  }
}
