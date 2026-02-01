/**
 * Neon brush configuration and utilities.
 * Provides reusable brush settings for consistent neon effects with enhanced glow.
 * Architecture: Separated from canvas drawing to allow multiple brush types
 * or custom brush effects to be added later.
 */

import { CONFIG } from '../core/config';

export interface BrushStyle {
  color: string;
  lineWidth: number;
  glowRadius: number;
  glowColor: string;
  /** Inner glow intensity (0-1) */
  innerGlowIntensity?: number;
  /** Outer glow intensity (0-1) */
  outerGlowIntensity?: number;
}

/**
 * Default neon brush style with enhanced glow effects.
 */
export function createNeonBrush(color: string = CONFIG.drawing.glowColor): BrushStyle {
  return {
    color,
    lineWidth: CONFIG.drawing.lineWidth,
    glowRadius: CONFIG.drawing.glowRadius,
    glowColor: color,
    innerGlowIntensity: 0.8,
    outerGlowIntensity: 0.6,
  };
}

/**
 * Apply enhanced neon glow effect to canvas context.
 * Uses multiple shadow layers for a more realistic neon glow.
 */
export function applyNeonStyle(
  ctx: CanvasRenderingContext2D,
  brush: BrushStyle
): void {
  // Set basic line properties
  ctx.strokeStyle = brush.color;
  ctx.lineWidth = brush.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Enhanced neon glow using multiple shadow layers
  // This creates a more realistic neon effect with inner and outer glow
  ctx.shadowBlur = brush.glowRadius;
  ctx.shadowColor = brush.glowColor;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draw a neon line with enhanced glow effect.
 * Uses multiple passes to create a realistic neon glow.
 * 
 * @param ctx - Canvas rendering context
 * @param brush - Brush style configuration
 * @param points - Array of points to draw
 */
export function drawNeonLine(
  ctx: CanvasRenderingContext2D,
  brush: BrushStyle,
  points: Array<{ x: number; y: number }>
): void {
  if (points.length < 2) return;

  // Save context state
  ctx.save();

  // Set common line properties
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw multiple layers for enhanced glow effect
  // Layer 1: Outer glow (largest, most transparent)
  ctx.globalAlpha = (brush.outerGlowIntensity ?? 0.6) * 0.3;
  ctx.strokeStyle = brush.glowColor;
  ctx.lineWidth = brush.lineWidth + brush.glowRadius * 2;
  ctx.shadowBlur = brush.glowRadius * 1.5;
  ctx.shadowColor = brush.glowColor;
  drawPath(ctx, points);
  ctx.stroke();

  // Layer 2: Middle glow
  ctx.globalAlpha = (brush.outerGlowIntensity ?? 0.6) * 0.5;
  ctx.lineWidth = brush.lineWidth + brush.glowRadius;
  ctx.shadowBlur = brush.glowRadius;
  drawPath(ctx, points);
  ctx.stroke();

  // Layer 3: Inner glow
  ctx.globalAlpha = brush.innerGlowIntensity ?? 0.8;
  ctx.lineWidth = brush.lineWidth + brush.glowRadius * 0.5;
  ctx.shadowBlur = brush.glowRadius * 0.5;
  drawPath(ctx, points);
  ctx.stroke();

  // Layer 4: Core line (brightest, most opaque)
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = brush.color;
  ctx.lineWidth = brush.lineWidth;
  ctx.shadowBlur = brush.glowRadius * 0.3;
  drawPath(ctx, points);
  ctx.stroke();

  // Restore context state
  ctx.restore();
}

/**
 * Draw a path from points array.
 */
function drawPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
}
