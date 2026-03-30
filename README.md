# VāstuCAD 🏗️
### The Professional AI-Driven Civil Engineering Floor Plan Generator

VāstuCAD is a state-of-the-art web application designed for civil engineers and architects to generate residential floor plans that are intrinsically compliant with **Vedic Vāstu Shastra** principles. It combines modern geometric algorithms with ancient architectural wisdom to create deterministic, construction-ready layouts.

---

## 🌟 Key Features

- **Deterministic AI Layout**: Generates optimized room placements using a seed-based greedy guillotine packing algorithm.
- **Vāstu Compliance Engine**: Real-time validation of room positions, orientations, and forbidden adjacencies.
- **Dynamic Template System**: Adapts structural templates to any plot footprint while maintaining structural integrity.
- **Professional CAD Visualization**: Heavy-duty rendering using Konva.js with support for wall thicknesses, door swings, and zone overlays.
- **Export Capabilities**: Export designs as high-fidelity PNG or detailed DXF-compatible data structures.
- **Creative Mode**: Fully interactive drag-and-drop room customization with live compliance scoring.

---

## 🛠️ Tech Stack

- **Core**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Graphics Engine**: [Konva](https://konvajs.org/) + [React-Konva](https://github.com/konvajs/react-konva)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Vishnu-Pingali/Vastru.git
   cd Vastru
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

## 📐 Core Architecture & Logic

### 1. Vāstu Rule Engine
The project uses a formalized schema to define Vāstu principles. Every room type (Puja, Kitchen, Master Bedroom, etc.) has **Preferred**, **Allowed**, and **Forbidden** zones.

```json
// vastu_rules.json snippet
"puja": {
    "preferred": ["NE"],
    "allowed": ["N", "E"],
    "forbidden": ["SW", "S", "SE", "W", "C"]
}
```

### 2. Auto-Layout Algorithm
The layout is generated using a multi-phase optimization process:
1. **Greedy Placement**: Rooms are placed in their most preferred zones using a guillotine split method.
2. **Local Improvement**: A stochastic "Local Search" algorithm (Hill Climbing) nudges and resizes rooms to maximize the overall Vāstu score.

```typescript
// Deterministic seed-based layout generation
export function generateLayout(plot: PlotSettings, roomReqs: RoomReq[]) {
    // 1. Initial Greedy Placement
    const { rooms: initialRooms, zones } = greedyPlaceRooms(plot, roomReqs, vastuRules);
    
    // 2. Score Optimization (150+ iterations)
    const improved = localImprove(initialRooms, zones, vastuRules, iterations);
    
    // 3. Structural Synthesis (Generate Walls & Doors)
    const walls = generateWallsFromRooms(improved.rooms);
    return { rooms: improved.rooms, walls };
}
```

### 3. Adaptive Template Fitting
Templates are not just scaled; they are adapted to the plot footprint using uniform scaling to preserve architectural aspect ratios and structural logic.

```typescript
// Uniform scaling and centering of architectural templates
export function adaptTemplateToPlot(template: PlanTemplate, plot: PlotSettings) {
    const { scale, scaledSize } = scaleEnvelope(
        template.baseEnvelope,
        { width: plot.width * 0.9, height: plot.height * 0.9 }
    );
    
    const offset = {
        x: (plot.width - scaledSize.width) / 2,
        y: (plot.height - scaledSize.height) / 2,
    };
    
    // Transform coordinates while preserving structural integrity
    const transformedWalls = template.walls.map(wall => ({
        ...wall,
        start: { x: wall.start.x * scale + offset.x, y: wall.start.y * scale + offset.y },
        end: { x: wall.end.x * scale + offset.x, y: wall.end.y * scale + offset.y }
    }));
}
```

### 4. Structural Topology & Validation
Beyond zone checking, the engine enforces critical architectural rules, such as preventing Puja rooms from sharing walls with toilets.

```typescript
// Adjacency & Hard Violation Check
if (puja && toilet) {
    const dx = Math.abs(puja.x - toilet.x) - (puja.width + toilet.width) / 2;
    const dy = Math.abs(puja.y - toilet.y) - (puja.height + toilet.height) / 2;
    if (dx < 0.1 && dy < 0.1) {
        return { score: -Infinity, reason: 'Puja room near Toilet (Forbidden)' };
    }
}
```

---

## 📂 Project Structure

```text
Vastru/
├── src/
│   ├── components/       # React UI components (Canvas, Control Panel)
│   ├── geometry/         # Structural logic (Wall graphs, Envelopes)
│   ├── store/            # Zustand state management
│   ├── utils/            # Core algorithms
│   │   ├── autoLayout.ts     # Greedy + Optimization engine
│   │   ├── vastuValidator.ts # Compliance reporting
│   │   └── exportUtils.ts    # PNG/PDF/CAD export logic
│   ├── types.ts          # Centralized Type Definitions
│   └── vastu_rules.json  # Vedic architectural ruleset
├── public/               # Static assets
└── tailwind.config.js    # Design system configuration
```

---

## 📖 Usage Guide

1. **Set Plot Size**: Enter your land dimensions in meters.
2. **Select Orientation**: Rotate the plot to align with North. The Vāstu grid automatically updates.
3. **Choose Mode**:
   - **Template Mode**: Pick from predefined, structurally sound architectural templates.
   - **AI Generate**: Input room requirements and let the engine solve the layout.
4. **Refine**: Drag walls and rooms. The compliance score at the top right will update in real-time.
5. **Export**: Once satisfied, export the plan for use in AutoCAD or for client presentation.

---

## 🛡️ License
This project is licensed under the MIT License - see the LICENSE file for details.

Developed with ❤️ for the intersection of Tradition and Technology.
