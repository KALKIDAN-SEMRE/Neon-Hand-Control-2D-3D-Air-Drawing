/**
 * Depth controller for 3D mode.
 * Maps hand vertical position to Z-depth in 3D space.
 * Architecture: Isolated to allow different depth mapping strategies
 * or depth control mechanisms (e.g., hand distance from camera).
 */

export class DepthController {
  private depthRange: number = 10; // Z-depth range in 3D space

  /**
   * Convert normalized depth (0-1) to 3D Z coordinate.
   * @param normalizedDepth - Depth value from gesture detection (0-1)
   * @returns Z coordinate in 3D space
   */
  getZDepth(normalizedDepth: number): number {
    // Map 0-1 to -depthRange/2 to +depthRange/2
    return (normalizedDepth - 0.5) * this.depthRange;
  }

  /**
   * Set the base depth (center point of depth range).
   */
  setBaseDepth(_depth: number): void {
    // Base depth is currently not used in calculations
    // Kept for API compatibility
  }

  /**
   * Set the depth range (how far forward/backward drawing can go).
   */
  setDepthRange(range: number): void {
    this.depthRange = range;
  }

  /**
   * Convert normalized hand coordinates to 3D world coordinates.
   * @param normalizedX - X coordinate (0-1)
   * @param normalizedY - Y coordinate (0-1)
   * @param normalizedZ - Z depth (0-1)
   * @param canvasWidth - Canvas width for scaling
   * @param canvasHeight - Canvas height for scaling
   * @returns 3D world coordinates
   */
  normalizeTo3D(
    normalizedX: number,
    normalizedY: number,
    normalizedZ: number,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number; z: number } {
    // Map normalized coordinates to 3D space
    // Center at origin, scale based on canvas dimensions
    const aspect = canvasWidth / canvasHeight;
    const scale = 10; // Scale factor for 3D space

    return {
      x: (normalizedX - 0.5) * scale * aspect,
      y: (0.5 - normalizedY) * scale, // Invert Y (screen Y is inverted)
      z: this.getZDepth(normalizedZ),
    };
  }
}
