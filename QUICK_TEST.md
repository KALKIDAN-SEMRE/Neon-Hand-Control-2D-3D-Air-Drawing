# Quick Test Guide - 2D Neon Drawing

## 🚀 Quick Start (2 minutes)

### 1. Setup
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in Chrome/Edge

### 2. Grant Camera Access
- Click "Allow" when prompted
- Webcam feed should appear

### 3. Basic Test (30 seconds)
1. **Pinch** (thumb + index together) → Move hand → ✅ Neon line appears
2. **Release pinch** → Move hand → ✅ Drawing stops
3. **Open hand** → Move hand → ✅ No drawing (correct!)
4. **Pinch again** → Draw circle → ✅ Smooth neon line

## ✅ Success Criteria

- [ ] Hand detected (check top-right indicator)
- [ ] Pinch gesture shows "Pinch" in indicator
- [ ] Drawing appears when pinching
- [ ] Line is smooth (not jagged)
- [ ] Neon glow visible around line
- [ ] Drawing stops when pinch released
- [ ] No drawing with open hand

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No hand detected | Better lighting, move closer |
| Drawing is jagged | Move slower, check lighting |
| No drawing | Make sure you're pinching (not just open hand) |
| No glow effect | Draw on dark background, check browser |

## 📋 Full Test Checklist

See `TESTING_GUIDE.md` for comprehensive testing procedures.
