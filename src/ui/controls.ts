/**
 * UI controls for export and canvas management.
 * Provides buttons for exporting drawings and clearing canvas.
 * Architecture: Separated controls allow easy addition of new actions
 * (undo/redo, brush settings, color picker, etc.).
 */

import { exportAsPNG, exportAsSVG } from '../export/export2D';
import { exportAsGLTF, exportAsOBJ } from '../export/export3D';
import { Canvas2D } from '../drawing/canvas2D';
import { Scene3D } from '../three/scene';

export type ExportCallback = () => void;

export class Controls {
  private container: HTMLElement;
  private onClear2D: (() => void) | null = null;
  private onClear3D: (() => void) | null = null;
  private canvas2D: Canvas2D | null = null;
  private scene3D: Scene3D | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createButtons();
  }

  private createButtons(): void {
    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'control-btn clear-btn';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      if (this.onClear2D) this.onClear2D();
      if (this.onClear3D) this.onClear3D();
    });

    // Export 2D buttons
    const export2DGroup = document.createElement('div');
    export2DGroup.className = 'export-group';
    export2DGroup.innerHTML = '<span>Export 2D:</span>';

    const exportPNGBtn = document.createElement('button');
    exportPNGBtn.className = 'control-btn export-btn';
    exportPNGBtn.textContent = 'PNG';
    exportPNGBtn.addEventListener('click', () => {
      if (this.canvas2D) {
        exportAsPNG(this.canvas2D.getCanvas());
      }
    });

    const exportSVGBtn = document.createElement('button');
    exportSVGBtn.className = 'control-btn export-btn';
    exportSVGBtn.textContent = 'SVG';
    exportSVGBtn.addEventListener('click', () => {
      if (this.canvas2D) {
        exportAsSVG(this.canvas2D.getCanvas());
      }
    });

    export2DGroup.appendChild(exportPNGBtn);
    export2DGroup.appendChild(exportSVGBtn);

    // Export 3D buttons
    const export3DGroup = document.createElement('div');
    export3DGroup.className = 'export-group';
    export3DGroup.innerHTML = '<span>Export 3D:</span>';

    const exportGLTFBtn = document.createElement('button');
    exportGLTFBtn.className = 'control-btn export-btn';
    exportGLTFBtn.textContent = 'GLTF';
    exportGLTFBtn.addEventListener('click', async () => {
      if (this.scene3D) {
        await exportAsGLTF(this.scene3D.getScene());
      }
    });

    const exportOBJBtn = document.createElement('button');
    exportOBJBtn.className = 'control-btn export-btn';
    exportOBJBtn.textContent = 'OBJ';
    exportOBJBtn.addEventListener('click', () => {
      if (this.scene3D) {
        exportAsOBJ(this.scene3D.getScene());
      }
    });

    export3DGroup.appendChild(exportGLTFBtn);
    export3DGroup.appendChild(exportOBJBtn);

    // Append all to container
    this.container.appendChild(clearBtn);
    this.container.appendChild(export2DGroup);
    this.container.appendChild(export3DGroup);
  }

  /**
   * Register callbacks and drawing instances.
   */
  register(
    canvas2D: Canvas2D,
    scene3D: Scene3D,
    onClear2D: () => void,
    onClear3D: () => void
  ): void {
    this.canvas2D = canvas2D;
    this.scene3D = scene3D;
    this.onClear2D = onClear2D;
    this.onClear3D = onClear3D;
  }
}
