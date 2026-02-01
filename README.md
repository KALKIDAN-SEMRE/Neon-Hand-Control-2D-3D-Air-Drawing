# Neon Hand Control – 2D & 3D Air Drawing

A production-ready web application for real-time hand-controlled neon drawing in both 2D and 3D space using webcam and MediaPipe Hands.

## Features

- **Real-time Hand Tracking**: Uses MediaPipe Hands for accurate hand landmark detection
- **2D Neon Drawing**: Draw on canvas with neon glow effects using open hand gestures
- **3D Neon Drawing**: Create 3D drawings in Three.js space with closed fist gesture
- **Depth Control**: Control Z-depth in 3D mode by moving hand vertically
- **Gesture-Based Controls**:
  - Open hand → 2D mode
  - Closed fist → 3D mode
  - Pinch (thumb + index) → Start drawing
  - Release pinch → Stop drawing
  - Spread fingers → Erase/reset canvas
- **Export Functionality**:
  - 2D: PNG, SVG
  - 3D: GLTF, OBJ

## Architecture

The application follows a modular, scalable architecture with clear separation of concerns:

```
src/
 ├─ core/           # Core systems (camera, hand tracking, gesture detection)
 ├─ drawing/        # 2D canvas drawing logic
 ├─ three/          # 3D rendering with Three.js
 ├─ export/         # Export utilities (isolated for easy extension)
 ├─ ui/             # UI components (controls, indicators)
 └─ main.ts         # Application orchestrator
```

### Key Architectural Decisions

1. **Modular Design**: Each system is independent and swappable
   - Hand tracking can be replaced with different ML models
   - Drawing systems (2D/3D) are completely separate
   - Export logic is isolated for easy format additions

2. **Configuration-Driven**: All thresholds and parameters are centralized in `src/core/config.ts`

3. **Type Safety**: Full TypeScript with strict mode for production reliability

4. **Extensibility**: Architecture supports:
   - New gestures (add to `gestureDetector.ts`)
   - New brush types (extend `neonBrush.ts`)
   - AR/VR support (swap camera/scene modules)
   - Multiplayer (add networking layer)

## Tech Stack

- **Vite** + **TypeScript**: Fast development and optimized builds
- **MediaPipe Hands**: Real-time hand tracking
- **HTML Canvas**: 2D drawing with neon effects
- **Three.js**: 3D rendering and scene management
- **Vanilla CSS**: No framework dependencies

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Webcam access

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Production Preview

```bash
npm run preview
```

## Usage

1. **Allow camera access** when prompted
2. **Position yourself** so your hand is visible in the camera
3. **Use gestures**:
   - **Open hand** → Switch to 2D mode
   - **Pinch** (thumb + index close) → Start drawing
   - **Closed fist** → Switch to 3D mode
   - **Move hand up/down** (in fist mode) → Control Z-depth
   - **Spread fingers** → Clear canvas/scene
4. **Export** your drawings using the control buttons

## Gesture Detection

The application uses MediaPipe's 21 hand landmarks to detect gestures:

- **Pinch**: Distance between thumb tip (landmark 4) and index tip (landmark 8)
- **Fist**: Average distance from finger tips to wrist (landmark 0)
- **Spread**: Distance between adjacent finger tips
- **Open**: Not a fist and not pinched

All thresholds are configurable in `src/core/config.ts`.

## Configuration

Edit `src/core/config.ts` to adjust:

- Gesture detection thresholds
- Drawing smoothness and line width
- Neon glow effects
- 3D rendering parameters
- Canvas dimensions

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may have limited MediaPipe support)

Requires WebGL for 3D rendering and WebRTC for camera access.

## Future Extensions

The architecture supports easy addition of:

- **New Gestures**: Add detection logic to `gestureDetector.ts`
- **Brush Variants**: Extend `neonBrush.ts` with new styles
- **AR/VR Support**: Replace camera/scene modules with AR camera matrices
- **Multiplayer**: Add networking layer between hand tracking and drawing
- **ML Gestures**: Replace rule-based detection with ML models
- **Export Formats**: Add new formats to `export/` modules

## License

MIT
