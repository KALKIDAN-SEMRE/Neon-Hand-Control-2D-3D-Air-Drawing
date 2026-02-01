/**
 * 2D export utilities for PNG and SVG.
 * Provides clean export functions for canvas drawings.
 * Architecture: Isolated export logic allows easy addition of new formats
 * (JPEG, WebP, PDF, etc.) or cloud storage integration.
 */

/**
 * Export canvas as PNG image.
 */
export function exportAsPNG(canvas: HTMLCanvasElement, filename: string = 'neon-drawing.png'): void {
  canvas.toBlob((blob) => {
    if (!blob) {
      console.error('Failed to create PNG blob');
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Export canvas as SVG.
 * Converts canvas paths to SVG format for vector export.
 * Note: This is a simplified version. For production, consider using
 * a library like canvas2svg or track drawing commands for accurate SVG.
 */
export function exportAsSVG(canvas: HTMLCanvasElement, filename: string = 'neon-drawing.svg'): void {
  const width = canvas.width;
  const height = canvas.height;

  // Get canvas image data and embed as base64 PNG in SVG
  // (True vector export would require tracking all drawing commands)
  const imageData = canvas.toDataURL('image/png');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <image width="${width}" height="${height}" href="${imageData}"/>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get canvas as data URL (for preview or sharing).
 */
export function getCanvasDataURL(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png'): string {
  return canvas.toDataURL(`image/${format}`);
}
