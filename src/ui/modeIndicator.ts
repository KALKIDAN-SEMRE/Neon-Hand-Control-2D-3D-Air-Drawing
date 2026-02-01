/**
 * Mode indicator UI component.
 * Displays current drawing mode (2D/3D) and gesture status.
 * Architecture: Separated UI component allows easy styling changes,
 * animations, or additional status displays.
 */

export type DrawingMode = '2D' | '3D' | 'none';

export class ModeIndicator {
  private container: HTMLElement;
  private modeElement!: HTMLElement;
  private gestureElement!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createElements();
  }

  private createElements(): void {
    // Mode display (2D/3D)
    this.modeElement = document.createElement('div');
    this.modeElement.className = 'mode-indicator';
    this.modeElement.textContent = 'Mode: None';

    // Gesture status
    this.gestureElement = document.createElement('div');
    this.gestureElement.className = 'gesture-status';
    this.gestureElement.textContent = 'Gesture: None';

    this.container.appendChild(this.modeElement);
    this.container.appendChild(this.gestureElement);
  }

  /**
   * Update the displayed mode.
   */
  updateMode(mode: DrawingMode, gesture: string): void {
    this.modeElement.textContent = `Mode: ${mode}`;
    this.gestureElement.textContent = `Gesture: ${gesture}`;

    // Add visual feedback
    this.modeElement.className = `mode-indicator mode-${mode.toLowerCase()}`;
  }

  /**
   * Show/hide the indicator.
   */
  setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'block' : 'none';
  }
}
