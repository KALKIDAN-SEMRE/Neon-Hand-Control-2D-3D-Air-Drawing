/**
 * 3D export utilities for GLTF and OBJ formats.
 * Exports Three.js scenes to standard 3D file formats.
 * Architecture: Isolated export logic allows easy addition of new formats
 * (STL, PLY, USDZ for AR, etc.) or cloud storage integration.
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Export scene as GLTF file.
 */
export async function exportAsGLTF(
  scene: THREE.Scene,
  filename: string = 'neon-drawing.gltf'
): Promise<void> {
  const exporter = new GLTFExporter();
  
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result: any) => {
        if (result instanceof ArrayBuffer) {
          // Binary GLTF
          const blob = new Blob([result], { type: 'application/octet-stream' });
          downloadBlob(blob, filename.replace('.gltf', '.glb'));
        } else {
          // JSON GLTF
          const jsonString = JSON.stringify(result, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          downloadBlob(blob, filename);
        }
        resolve();
      },
      (error: any) => {
        console.error('GLTF export error:', error);
        reject(error);
      }
    );
  });
}

/**
 * Export scene as OBJ file.
 * Simple OBJ exporter for lines and geometry.
 */
export function exportAsOBJ(
  scene: THREE.Scene,
  filename: string = 'neon-drawing.obj'
): void {
  let objContent = '# Neon Hand Control 3D Drawing\n';
  let vertexOffset = 0;

  scene.traverse((object: any) => {
    if (object instanceof THREE.Line) {
      const geometry = object.geometry;
      const positions = geometry.attributes.position;

      if (positions) {
        // Write vertices
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);
          objContent += `v ${x} ${y} ${z}\n`;
        }

        // Write line segments
        objContent += 'l';
        for (let i = 0; i < positions.count; i++) {
          objContent += ` ${vertexOffset + i + 1}`;
        }
        objContent += '\n';

        vertexOffset += positions.count;
      }
    }
  });

  const blob = new Blob([objContent], { type: 'text/plain' });
  downloadBlob(blob, filename);
}

/**
 * Helper function to download a blob as a file.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
