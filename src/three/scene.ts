/**
 * Three.js scene management for 3D neon drawing.
 * Handles scene setup, camera, lighting, and rendering loop.
 * Architecture: Centralized 3D rendering to allow easy extension with
 * AR/VR cameras, post-processing effects, or different renderers.
 */

import * as THREE from 'three';
import { CONFIG } from '../core/config';
import { NeonLine3D } from './neonLine3D';
import { DepthController } from './depthController';

export class Scene3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private currentLine: NeonLine3D | null = null;
  private lines: NeonLine3D[] = [];
  private depthController: DepthController;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.depthController = new DepthController();

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.three.backgroundColor);

    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.three.fov,
      aspect,
      CONFIG.three.near,
      CONFIG.three.far
    );
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());

    // Start render loop
    this.animate();
  }

  /**
   * Start drawing a new 3D line.
   */
  startDrawing(x: number, y: number, z: number): void {
    const point = new THREE.Vector3(x, y, z);
    this.currentLine = new NeonLine3D(this.scene);
    this.currentLine.startDrawing(point);
    this.lines.push(this.currentLine);
  }

  /**
   * Add a point to the current line.
   */
  addPoint(x: number, y: number, z: number): void {
    if (this.currentLine) {
      const point = new THREE.Vector3(x, y, z);
      this.currentLine.addPoint(point);
    }
  }

  /**
   * Stop drawing the current line.
   */
  stopDrawing(): void {
    if (this.currentLine) {
      this.currentLine.stopDrawing();
      this.currentLine = null;
    }
  }

  /**
   * Convert normalized hand coordinates to 3D world coordinates.
   */
  normalizeTo3D(normalizedX: number, normalizedY: number, normalizedZ: number): {
    x: number;
    y: number;
    z: number;
  } {
    return this.depthController.normalizeTo3D(
      normalizedX,
      normalizedY,
      normalizedZ,
      this.container.clientWidth,
      this.container.clientHeight
    );
  }

  /**
   * Clear all lines from the scene.
   */
  clear(): void {
    this.lines.forEach((line) => {
      line.clear();
      this.scene.remove(line.getLine());
    });
    this.lines = [];
    this.currentLine = null;
  }

  /**
   * Get the Three.js scene (for export).
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get all line objects (for export).
   */
  getLines(): THREE.Line[] {
    return this.lines.map((line) => line.getLine());
  }

  /**
   * Handle window resize.
   */
  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Render loop.
   */
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.clear();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.handleResize());
  }
}
