# SJF (Shortest Job First) Game Design Document

## 📊 Scenario Analysis: Existing Games

### FCFS Game (Restaurant)
- **Metaphor**: Restaurant service
- **Mapping**:
  - Customers = Processes
  - Orders = Jobs
  - Waiter = Scheduler
  - Chef = CPU
  - Delivery Boy = Completion handler
- **Key Concept**: First come, first served (arrival order matters)
- **Visual Style**: Warm, restaurant atmosphere

### First-Fit Game (Parking Lot)
- **Metaphor**: Parking lot management
- **Mapping**:
  - Vehicles = Processes
  - Parking Slots = Memory blocks
  - Road = Ready queue
- **Key Concept**: First available slot
- **Visual Style**: Urban, street scene

---

## 🎯 SJF Game Scenario: **PRINT SHOP**

### Why Print Shop?
1. **Intuitive**: Everyone understands that shorter documents print faster
2. **Clear Burst Times**: Page count = burst time (easy to visualize)
3. **Queue Reordering**: Shows SJF vs FCFS difference clearly
4. **Starvation Visible**: Long documents wait while short ones print
5. **Professional Setting**: Matches educational context

### Scenario Mapping

| OS Concept | Print Shop Equivalent |
|------------|----------------------|
| **Process** | Print Job (Document) |
| **Burst Time** | Number of Pages |
| **Arrival Time** | When document was submitted |
| **CPU** | Printer |
| **Ready Queue** | Print Queue Board |
| **Scheduler** | Print Shop Manager |
| **Completion** | Document delivered to customer |

---

## 🎮 Game Flow

### Phase 1: Document Submission
- **3-5 customers** arrive at print shop
- Each customer submits a document with different page counts
- Documents appear on the **Print Queue Board**
- Documents show: Customer name, Page count, Arrival time

### Phase 2: SJF Selection
- Player (Print Shop Manager) must select documents to print
- **SJF Rule**: Always select the document with **SHORTEST page count** first
- If wrong document selected → penalty points
- Queue board shows documents sorted by page count (shortest first)

### Phase 3: Printing
- Printer processes one document at a time
- Progress bar shows pages being printed
- Printing time = page count (burst time)
- Visual: Pages coming out of printer

### Phase 4: Delivery
- Completed documents delivered to customers
- Customer satisfaction shown (happy/sad based on waiting time)
- Metrics calculated: Waiting time, Turnaround time

### Phase 5: Results
- Gantt chart showing execution order
- Performance metrics
- Comparison with FCFS (if applicable)
- AI feedback

---

## 🎨 Visual Design

### Setting: Modern Print Shop
- **Left Side**: Customer waiting area (desks/chairs)
- **Center**: Print Queue Board (shows all documents)
- **Right Side**: Printer station with printer machine
- **Background**: Professional print shop interior

### Color Scheme
- **Primary**: Blue/Cyan (professional, tech)
- **Accent**: Orange/Yellow (warmth, documents)
- **Background**: Light gray/white (clean, modern)

---

## 📦 Required Assets

### Backgrounds
```
/games/cpu-scheduling/assets/sjf/
├── background.png              # Print shop interior (1600x1000px)
├── print-queue-board.png      # Queue display board (similar to order board)
└── printer-station.png         # Printer area background
```

### Characters & People
```
├── customer-1.png              # Customer sprite (sitting at desk)
├── customer-2.png              # Customer sprite variant
├── customer-3.png              # Customer sprite variant
├── manager-standing.png        # Print shop manager (scheduler)
├── manager-walking.png         # Manager walking animation
└── delivery-person.png         # Person delivering completed prints
```

### Documents (Print Jobs)
```
├── document-small.png          # Small document icon (1-2 pages)
├── document-medium.png         # Medium document icon (3-5 pages)
├── document-large.png          # Large document icon (6-8 pages)
├── document-xlarge.png         # Extra large document icon (9+ pages)
├── document-stack.png          # Stack of documents (for printer output)
└── document-icon.png           # Generic document icon
```

### Printer Assets
```
├── printer-idle.png            # Printer standing/idle
├── printer-printing.png       # Printer with paper coming out
├── printer-busy.png            # Printer with lights on
├── paper-coming-out.png        # Paper animation sprite
└── printer-station-bg.png     # Printer area background
```

### UI Elements
```
├── queue-slot-bg.png           # Background for queue items
├── page-count-badge.png        # Badge showing page count
├── timer-icon.png             # Arrival time indicator
└── progress-bar-bg.png        # Progress bar background
```

### Furniture & Environment
```
├── desk.png                    # Customer desk
├── chair.png                   # Chair
├── waiting-area.png            # Waiting area background
└── counter.png                 # Print shop counter
```

### Sound Effects
```
sounds/
├── background-music.flac       # Ambient print shop music
├── printer-printing.mp3        # Printer sound (continuous)
├── paper-out.wav               # Paper coming out sound
├── document-submit.wav         # Document submission sound
├── person-walk.wav             # Walking sound
└── success-ding.wav            # Completion sound
```

---

## 📋 Document Types Configuration

```typescript
const DOCUMENT_CONFIGS = {
  letter: { 
    name: 'Letter', 
    emoji: '📄', 
    pages: 1, 
    asset: 'document-small',
    color: '#4CAF50'  // Green (short)
  },
  report: { 
    name: 'Report', 
    emoji: '📊', 
    pages: 3, 
    asset: 'document-medium',
    color: '#2196F3'  // Blue (medium)
  },
  thesis: { 
    name: 'Thesis', 
    emoji: '📚', 
    pages: 5, 
    asset: 'document-large',
    color: '#FF9800'  // Orange (long)
  },
  book: { 
    name: 'Book', 
    emoji: '📖', 
    pages: 8, 
    asset: 'document-xlarge',
    color: '#F44336'  // Red (very long)
  },
  manual: {
    name: 'Manual',
    emoji: '📘',
    pages: 10,
    asset: 'document-xlarge',
    color: '#9C27B0'  // Purple (extremely long)
  }
};
```

---

## 🎯 Game Mechanics

### SJF Algorithm Implementation

```typescript
// Find shortest job (by page count)
const shortestJob = this.printQueue.reduce((shortest, job) => {
  return job.pages < shortest.pages ? job : shortest;
}, this.printQueue[0]);

// Validate user selection
if (selectedJob.id !== shortestJob.id) {
  // Wrong! Must select shortest job first
  this.showError('❌ Wrong! SJF = Shortest Job First! Select document with fewest pages!');
  this.score -= 10;
  return;
}
```

### Key Differences from FCFS

1. **Queue Ordering**: 
   - FCFS: Order by arrival time
   - SJF: Order by page count (shortest first)

2. **Selection Logic**:
   - FCFS: First document in queue
   - SJF: Document with fewest pages (may not be first)

3. **Starvation Risk**:
   - FCFS: No starvation (all jobs eventually run)
   - SJF: Long documents may wait indefinitely if short ones keep arriving

### Visual Indicators

1. **Queue Board**:
   - Documents sorted by page count (not arrival)
   - Page count badge prominently displayed
   - Color coding: Green (short) → Red (long)

2. **Selection Feedback**:
   - Highlight shortest document
   - Show page count comparison
   - Flash correct document if wrong selected

3. **Starvation Warning**:
   - If long document waits too long, show warning
   - "⚠️ Long document waiting! This is starvation risk in SJF"

---

## 🎬 Scene Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    PRINT SHOP - SJF SIMULATOR                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Customer 1]  [Customer 2]  [Customer 3]  [Customer 4]    │
│     📄 1pg        📊 3pg        📚 5pg        📖 8pg         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         PRINT QUEUE BOARD (SJF Order)               │    │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │    │
│  │  │ 📄 1 │  │ 📊 3 │  │ 📚 5 │  │ 📖 8 │            │    │
│  │  │ Alice│  │ Bob  │  │ Carol│  │ Dave │            │    │
│  │  └──────┘  └──────┘  └──────┘  └──────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│                    [Manager]                                  │
│                                                               │
│                    ┌─────────┐                                │
│                    │ PRINTER │  ← Printing...                │
│                    │  [████] │                                │
│                    └─────────┘                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Metrics & Results

### Calculated Metrics
1. **Average Waiting Time**: Sum of all waiting times / number of jobs
2. **Average Turnaround Time**: Sum of all turnaround times / number of jobs
3. **Throughput**: Number of jobs completed / total time
4. **Starvation Count**: Number of times a long job was skipped

### Gantt Chart
- Shows execution order (shortest first)
- Color-coded by document type
- Time markers for start/completion

### Comparison with FCFS
- Show side-by-side comparison
- Highlight that SJF minimizes average waiting time
- But may cause starvation

---

## 🎓 Educational Points

### Learning Objectives
1. ✅ Understand SJF prioritizes shortest jobs
2. ✅ See how SJF differs from FCFS
3. ✅ Recognize starvation problem
4. ✅ Calculate waiting/turnaround times
5. ✅ Visualize execution with Gantt chart

### Key Concepts Demonstrated
- **Non-preemptive scheduling**: Once printing starts, it completes
- **Optimal average waiting time**: SJF minimizes this
- **Starvation**: Long jobs may never execute
- **Queue reordering**: Order changes based on job size

---

## 🚀 Implementation Checklist

### Phase 1: Assets
- [ ] Create/acquire print shop background
- [ ] Design customer sprites (3-4 variants)
- [ ] Create document icons (different sizes)
- [ ] Design printer sprites (idle, printing, busy)
- [ ] Create queue board UI
- [ ] Record/generate sound effects

### Phase 2: Core Game Logic
- [ ] Implement document submission system
- [ ] Create print queue with SJF ordering
- [ ] Implement SJF selection validation
- [ ] Add printing animation
- [ ] Create delivery system

### Phase 3: UI & Feedback
- [ ] Queue board with page count display
- [ ] Progress bar for printing
- [ ] Error messages for wrong selections
- [ ] Success animations
- [ ] Customer satisfaction indicators

### Phase 4: Metrics & Results
- [ ] Calculate waiting/turnaround times
- [ ] Generate Gantt chart
- [ ] Display performance metrics
- [ ] Show starvation warnings
- [ ] AI feedback integration

### Phase 5: Polish
- [ ] Add sound effects
- [ ] Smooth animations
- [ ] Tutorial/intro screen
- [ ] Results screen
- [ ] Testing & bug fixes

---

## 💡 Alternative Scenarios (Backup Options)

### Option 2: Laundry Service
- **Mapping**: Clothes = Jobs, Washing Machine = CPU, Wash Time = Burst Time
- **Assets**: Washing machine, clothes items (socks, shirts, blankets)
- **Pros**: Very intuitive, clear time differences
- **Cons**: Less professional setting

### Option 3: Coffee Shop
- **Mapping**: Drinks = Jobs, Barista = CPU, Prep Time = Burst Time
- **Assets**: Coffee shop, barista, different drinks
- **Pros**: Similar to restaurant (familiar), engaging
- **Cons**: Too similar to FCFS restaurant game

### Option 4: Package Sorting
- **Mapping**: Packages = Jobs, Sorter = CPU, Sort Time = Burst Time
- **Assets**: Conveyor belt, packages, sorting machine
- **Pros**: Modern, tech-oriented
- **Cons**: Less relatable

**Recommendation**: **Print Shop** is the best choice - professional, clear, and distinct from FCFS.

---

## 📐 Asset Specifications

### Image Dimensions
- **Background**: 1600x1000px (full screen)
- **Characters**: 200x300px (scalable)
- **Documents**: 100x150px
- **Printer**: 300x400px
- **Queue Items**: 150x80px
- **UI Elements**: Variable, scalable

### File Formats
- **Images**: PNG with transparency
- **Sounds**: MP3/WAV/FLAC
- **Optimization**: Compress for web

---

## 🎨 Color Palette

```css
Primary Blue: #2196F3    /* Professional, tech */
Accent Orange: #FF9800   /* Warm, documents */
Success Green: #4CAF50   /* Short jobs */
Warning Red: #F44336     /* Long jobs */
Background: #F5F5F5       /* Light gray */
Text: #212121            /* Dark gray */
```

---

## 📝 Next Steps

1. **Asset Creation**: Start with background and basic sprites
2. **Prototype**: Build minimal playable version
3. **Test Algorithm**: Verify SJF logic is correct
4. **Add Polish**: Animations, sounds, UI
5. **Integration**: Connect to module system

---

**Design Status**: ✅ Complete
**Ready for Implementation**: Yes
**Estimated Development Time**: 2-3 weeks

