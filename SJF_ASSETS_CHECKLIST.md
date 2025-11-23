# SJF Game - Complete Asset Checklist

## 📁 Folder Structure
```
public/games/cpu-scheduling/assets/sjf/
├── backgrounds/
├── characters/
├── documents/
├── printer/
├── ui/
└── sounds/
```

---

## 🖼️ Required Assets (Complete List)

### 1. BACKGROUNDS (3 files)
- [ ] `background.png` - Print shop interior (1600x1000px)
- [ ] `print-queue-board.png` - Queue display board (600x400px)
- [ ] `printer-station-bg.png` - Printer area background (400x300px)

### 2. CHARACTERS (7 files)
- [ ] `customer-1.png` - Customer sprite variant 1 (200x300px)
- [ ] `customer-2.png` - Customer sprite variant 2 (200x300px)
- [ ] `customer-3.png` - Customer sprite variant 3 (200x300px)
- [ ] `customer-4.png` - Customer sprite variant 4 (200x300px)
- [ ] `manager-standing.png` - Print shop manager idle (200x300px)
- [ ] `manager-walking.png` - Manager walking animation (200x300px)
- [ ] `delivery-person.png` - Delivery person sprite (200x300px)

### 3. DOCUMENTS (6 files)
- [ ] `document-small.png` - 1-2 pages icon (100x150px)
- [ ] `document-medium.png` - 3-5 pages icon (100x150px)
- [ ] `document-large.png` - 6-8 pages icon (100x150px)
- [ ] `document-xlarge.png` - 9+ pages icon (100x150px)
- [ ] `document-stack.png` - Stack of printed documents (150x200px)
- [ ] `document-icon.png` - Generic document icon (80x100px)

### 4. PRINTER ASSETS (5 files)
- [ ] `printer-idle.png` - Printer idle state (300x400px)
- [ ] `printer-printing.png` - Printer with paper coming out (300x400px)
- [ ] `printer-busy.png` - Printer with lights on (300x400px)
- [ ] `paper-coming-out.png` - Paper animation sprite (100x200px)
- [ ] `printer-station.png` - Complete printer station (400x500px)

### 5. UI ELEMENTS (4 files)
- [ ] `queue-slot-bg.png` - Queue item background (150x80px)
- [ ] `page-count-badge.png` - Page count badge (60x60px)
- [ ] `timer-icon.png` - Arrival time indicator (40x40px)
- [ ] `progress-bar-bg.png` - Progress bar background (400x30px)

### 6. FURNITURE (4 files)
- [ ] `desk.png` - Customer desk (200x150px)
- [ ] `chair.png` - Chair (100x150px)
- [ ] `waiting-area.png` - Waiting area background (800x400px)
- [ ] `counter.png` - Print shop counter (600x200px)

### 7. SOUND EFFECTS (6 files)
- [ ] `background-music.flac` - Ambient print shop music (loop)
- [ ] `printer-printing.mp3` - Printer sound (continuous, loop)
- [ ] `paper-out.wav` - Paper coming out sound (short)
- [ ] `document-submit.wav` - Document submission sound (short)
- [ ] `person-walk.wav` - Walking sound (can reuse from FCFS)
- [ ] `success-ding.wav` - Completion sound (short)

---

## 📊 Asset Priority (Development Order)

### Phase 1: Essential (Start Here)
1. `background.png` - Main scene background
2. `printer-idle.png` - Core printer asset
3. `document-small.png`, `document-medium.png`, `document-large.png` - Document types
4. `customer-1.png`, `customer-2.png` - Basic customer sprites
5. `manager-standing.png` - Manager character
6. `print-queue-board.png` - Queue display

### Phase 2: Important (Add Next)
7. `printer-printing.png` - Printing animation
8. `document-xlarge.png` - Complete document set
9. `customer-3.png`, `customer-4.png` - More customer variety
10. `queue-slot-bg.png` - UI polish
11. `page-count-badge.png` - Visual feedback

### Phase 3: Polish (Final Touches)
12. All remaining UI elements
13. Furniture assets
14. Sound effects
15. Animation sprites

---

## 🎨 Asset Style Guidelines

### Visual Style
- **Art Style**: 2D, slightly cartoonish but professional
- **Color Scheme**: 
  - Primary: Blue (#2196F3)
  - Accent: Orange (#FF9800)
  - Documents: White/beige with colored borders
- **Consistency**: Match FCFS game style (similar art direction)

### Technical Requirements
- **Format**: PNG with transparency (RGBA)
- **Resolution**: 2x for retina displays (can scale down)
- **Optimization**: Compress for web (use TinyPNG or similar)
- **Naming**: Use kebab-case (lowercase with hyphens)

---

## 🔄 Reusable Assets from FCFS

You can potentially reuse:
- ✅ `person-walk.wav` - Walking sound
- ✅ `background_music.flac` - Background music (if suitable)
- ✅ Some UI patterns (buttons, progress bars)

---

## 💰 Asset Creation Options

### Option 1: Commission Artist
- **Cost**: $200-500
- **Time**: 1-2 weeks
- **Quality**: High, custom

### Option 2: Use Asset Store
- **Cost**: $20-50
- **Time**: Immediate
- **Quality**: Good, may need customization
- **Recommended Sites**: 
  - itch.io
  - OpenGameArt.org
  - Unity Asset Store (can extract images)

### Option 3: AI Generation
- **Cost**: Free-$20/month
- **Time**: 1-2 days
- **Quality**: Variable, may need editing
- **Tools**: 
  - DALL-E / Midjourney
  - Stable Diffusion
  - Leonardo.ai

### Option 4: Simple Graphics Tools
- **Cost**: Free
- **Time**: 3-5 days
- **Quality**: Basic but functional
- **Tools**: 
  - Canva
  - GIMP
  - Inkscape
  - Figma

---

## 📝 Asset Naming Convention

Use this exact naming for consistency:

```
background.png
print-queue-board.png
customer-1.png
customer-2.png
customer-3.png
customer-4.png
manager-standing.png
manager-walking.png
delivery-person.png
document-small.png
document-medium.png
document-large.png
document-xlarge.png
document-stack.png
document-icon.png
printer-idle.png
printer-printing.png
printer-busy.png
paper-coming-out.png
printer-station.png
queue-slot-bg.png
page-count-badge.png
timer-icon.png
progress-bar-bg.png
desk.png
chair.png
waiting-area.png
counter.png
```

---

## ✅ Quick Start Checklist

Before starting development:
- [ ] Create asset folder structure
- [ ] Get at least Phase 1 assets ready
- [ ] Test assets load correctly
- [ ] Verify dimensions and transparency
- [ ] Organize assets in proper folders

---

**Total Assets Needed**: 35 files
**Critical Path Assets**: 10 files (Phase 1)
**Estimated Asset Creation Time**: 1-2 weeks (depending on method)

