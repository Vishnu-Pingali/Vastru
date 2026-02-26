// store/useStore.ts
// Zustand store for VāstuCAD - Template-driven architecture

import { create } from 'zustand';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type Konva from 'konva';
import type {
    Room,
    PlotSettings,
    VastuMode,
    ProjectState,
    ComplianceReport,
    PlanTemplate,
    Wall,
    EditMode,
} from '../types';
import { computeZones, pickZoneForPoint } from '../utils/zoneUtils';
import { calculateComplianceReport } from '../utils/vastuUtils';
import { ALL_TEMPLATES, getTemplateById } from '../templates/planTemplates';
import { adaptTemplateToPlot } from '../utils/adaptTemplate';
import { validateLayout } from '../utils/vastuValidator';
import { generateLayout, type RoomReq } from '../utils/autoLayout';

interface StoreState {
    // Core state
    plot: PlotSettings;
    activeTemplate: PlanTemplate | null;
    rooms: Room[];
    walls: Wall[];
    vastuMode: VastuMode;
    editMode: EditMode;
    stageRef: React.RefObject<Konva.Stage> | null;
    complianceReport: ComplianceReport;

    // UI state
    selectedRoomId: string | null;
    selectedWallId: string | null;
    showToast: boolean;
    toastMessage: string;

    // Actions
    setEditMode: (mode: EditMode) => void;
    loadTemplate: (templateId: string) => void;
    setPlotSize: (width: number, height: number) => void;
    setOrientation: (orientation: number) => void;
    setVastuMode: (mode: VastuMode) => void;
    setStageRef: (ref: React.RefObject<Konva.Stage>) => void;

    updateRoom: (id: string, updates: Partial<Room>) => void;
    selectRoom: (id: string | null) => void;
    selectWall: (id: string | null) => void;

    clearAll: () => void;

    loadProject: (project: ProjectState) => void;
    getProjectState: () => ProjectState;

    showToastMessage: (message: string) => void;
    hideToast: () => void;

    recalculateCompliance: () => void;
    refitTemplate: () => void;
    generateDynamicLayout: (roomReqs: RoomReq[]) => void;
}

export const useStore = create<StoreState>((set, get) => ({
    // Initial state
    plot: {
        width: 14,
        height: 10,
        orientation: 0,
    },
    activeTemplate: null,
    rooms: [],
    walls: [],
    vastuMode: 'soft',
    editMode: 'template',
    stageRef: null,
    complianceReport: {
        totalScore: 100,
        roomScores: [],
        hardViolations: [],
    },
    selectedRoomId: null,
    selectedWallId: null,
    showToast: false,
    toastMessage: '',

    // Actions
    setEditMode: (mode) => set({ editMode: mode }),

    /**
     * Load and adapt a template to the current plot
     * This is the primary way to create layouts in VāstuCAD
     */
    loadTemplate: (templateId) => {
        const template = getTemplateById(templateId);
        if (!template) {
            get().showToastMessage('Template not found');
            return;
        }

        const { plot } = get();

        // Adapt template to plot
        const { rooms, walls } = adaptTemplateToPlot(template, plot);

        set({
            activeTemplate: template,
            rooms,
            walls,
            selectedRoomId: null,
            selectedWallId: null,
        });

        get().recalculateCompliance();
        get().showToastMessage(`Loaded: ${template.name}`);
    },

    generateDynamicLayout: async (roomReqs) => {
        const { plot, showToastMessage } = get();

        showToastMessage('🤖 Generating AI Layout...');

        try {
            // Define API key directly or prompt user (using a placeholder or import.meta.env)
            // @ts-ignore
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || prompt("Enter your Gemini API key:");
            if (!apiKey) throw new Error("Gemini API key is required to generate AI layouts.");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

            const promptText = `
                You are an expert Vastu Shastra architect and floor plan designer. I need a JSON structure for a complete, solid, monolithic floor plan based on these constraints:
                Plot: ${plot.width}m x ${plot.height}m, facing ${plot.orientation} degrees.
                Rooms required: ${JSON.stringify(roomReqs)}
                
                CRITICAL ARCHITECTURAL RULES:
                1. SOLID FOOTPRINT: Design a single rectangular building (e.g. 10x8) starting exactly at (x:0, y:0).
                2. NO GAPS: Rooms MUST pack perfectly into this building footprint like a jigsaw puzzle. There MUST NOT be any empty space or corridors between rooms.
                3. GRID SNAPPING: All x, y, width, and height values MUST be whole numbers or end in .5 (e.g., 2, 3.5, 4).
                4. WALL ENCLOSURE: Generate walls that trace every single external border of the building layout AND the interior borders between rooms. Ensure no walls intersect incorrectly.
                5. VASTU COMPLIANCE: Place Master Bedroom in SW, Kitchen in SE, etc., but respect the contiguous puzzle-layout rule above all.
                
                Respond ONLY with valid JSON in this exact format:
                {
                    "score": 85,
                    "rooms": [
                        { "id": "room_id", "label": "Label", "type": "master_bedroom", "x": 0, "y": 0, "width": 4, "height": 4, "zone": "SW", "score": 100, "violation": null }
                    ],
                    "walls": [
                        { "id": "w1", "start": {"x":0, "y":0}, "end": {"x":4, "y":0}, "thickness": 0.23, "isExternal": true, "adjacentRooms": [] }
                    ],
                    "doors": [
                        { "id": "d1", "wallId": "w1", "position": 0.5, "width": 0.9, "swingAngle": 90, "swingDirection": "left" }
                    ]
                }
                Make sure the walls completely enclose the rooms. Do NOT include markdown code blocks, just raw JSON.`;
            const result = await model.generateContent(promptText);
            const responseText = result.response.text().trim();
            // Remove markdown format if it wrapped it
            const cleanedJsonText = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
            console.log("Raw Gemini Response:", cleanedJsonText);

            let plan;
            try {
                plan = JSON.parse(cleanedJsonText);
            } catch (e) {
                console.error("Failed to parse Gemini JSON", e);
                throw new Error("Gemini returned invalid JSON format.");
            }
            // Create a synthetic template from Gemini AI plan
            const syntheticTemplate: PlanTemplate = {
                id: 'ai-template',
                name: '🏠 Dynamic AI - CAD Plan',
                facing: 'E',
                baseEnvelope: { width: plot.width, height: plot.height },
                description: 'AI-generated architectural layout',
                floors: 1,
                bedrooms: roomReqs.filter(r => r.type === 'master_bedroom' || r.type === 'bedroom').length,
                walls: plan.walls,
                rooms: plan.rooms.map((r: any) => ({
                    id: r.id,
                    label: r.label,
                    type: r.type,
                    rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                    zoneIntent: [],
                    anchor: 'center',
                    minSize: { width: 1, height: 1 },
                    maxSize: { width: 10, height: 10 },
                    wallIds: []
                })),
                doors: plan.doors
            };

            set({
                rooms: plan.rooms,
                walls: plan.walls,
                activeTemplate: syntheticTemplate,
                complianceReport: {
                    totalScore: plan.score,
                    roomScores: plan.rooms.map((r: any) => ({
                        id: r.id,
                        type: r.type,
                        zone: r.zone,
                        score: r.score,
                        violation: r.violation
                    })),
                    hardViolations: plan.rooms
                        .filter((r: any) => r.violation === 'forbidden')
                        .map((r: any) => ({ roomId: r.id, reason: 'Vastu Violation' }))
                },
                selectedRoomId: null,
                selectedWallId: null,
                editMode: 'creative'
            });

            showToastMessage('✨ AI Plan Generated!');
        } catch (error: any) {
            console.error('AI Generator Error:', error);

            // @ts-ignore
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
            if (apiKey === 'your_api_key_here') {
                showToastMessage('⚠️ Please add your actual Gemini API key to the .env file!');
                return;
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            showToastMessage(`⚠️ AI Failed: ${errorMessage.substring(0, 150)}`);

            // Fallback to local JS generation if Python fails
            const { rooms, compliance, walls, doors } = generateLayout(plot, roomReqs);
            // ... (rest of local fallback same as before)
            set({
                rooms,
                walls,
                activeTemplate: {
                    id: 'fallback-template',
                    name: 'Local fallback',
                    facing: 'E',
                    baseEnvelope: { width: plot.width, height: plot.height },
                    description: 'Local JS generator',
                    floors: 1,
                    bedrooms: 2,
                    walls,
                    rooms,
                    doors
                } as any,
                complianceReport: compliance
            });
        }
    },

    /**
     * Refit current template when plot size changes
     */
    refitTemplate: () => {
        const { activeTemplate, plot } = get();
        if (!activeTemplate) return;

        const { rooms, walls } = adaptTemplateToPlot(activeTemplate, plot);

        set({ rooms, walls });
        get().recalculateCompliance();
    },

    setPlotSize: (width, height) => {
        set({ plot: { ...get().plot, width, height } });
        get().refitTemplate();
    },

    setOrientation: (orientation) => {
        set({ plot: { ...get().plot, orientation } });
        get().refitTemplate();
    },

    setVastuMode: (mode) => {
        set({ vastuMode: mode });
        get().recalculateCompliance();
    },

    setStageRef: (ref) => {
        set({ stageRef: ref });
    },

    // Room actions (constrained by template)
    updateRoom: (id, updates) => {
        const { rooms, plot, activeTemplate, editMode } = get();

        // In template mode, only allow constrained resizing
        if (editMode === 'template' && !activeTemplate) {
            get().showToastMessage('Load a template first');
            return;
        }

        const zones = computeZones(plot);

        set({
            rooms: rooms.map((r) => {
                if (r.id !== id) return r;

                const updated = { ...r, ...updates };

                // Recalculate zone if position changed
                if (
                    updates.x !== undefined ||
                    updates.y !== undefined ||
                    updates.width !== undefined ||
                    updates.height !== undefined
                ) {
                    const cx = updated.x + updated.width / 2;
                    const cy = updated.y + updated.height / 2;
                    updated.zone = pickZoneForPoint(zones, cx, cy);

                    // Recalculate Vastu score
                    const validation = validateLayout([updated], activeTemplate!);
                    const roomScore = validation.score;
                    updated.score = roomScore;
                }

                return updated;
            }),
        });

        get().recalculateCompliance();
    },

    selectRoom: (id) => {
        set({ selectedRoomId: id, selectedWallId: null });
    },

    selectWall: (id) => {
        set({ selectedWallId: id, selectedRoomId: null });
    },

    clearAll: () => {
        set({
            rooms: [],
            walls: [],
            activeTemplate: null,
            selectedRoomId: null,
            selectedWallId: null,
        });
        get().recalculateCompliance();
    },

    // Project management
    loadProject: (project) => {
        set({
            plot: project.plot,
            rooms: project.rooms,
            vastuMode: project.vastuMode,
        });

        // Try to reload template
        if (project.templateId) {
            const template = getTemplateById(project.templateId);
            if (template) {
                set({ activeTemplate: template });
            }
        }

        get().recalculateCompliance();
        get().showToastMessage('Project loaded successfully');
    },

    getProjectState: () => {
        const { plot, rooms, vastuMode, complianceReport, activeTemplate } = get();
        return {
            plot,
            rooms,
            vastuMode,
            complianceScore: complianceReport.totalScore,
            templateId: activeTemplate?.id,
        };
    },

    // Toast notifications
    showToastMessage: (message) => {
        set({ showToast: true, toastMessage: message });
        setTimeout(() => {
            set({ showToast: false });
        }, 3000);
    },

    hideToast: () => {
        set({ showToast: false });
    },

    // Compliance calculation
    recalculateCompliance: () => {
        const { rooms } = get();
        const compliance = calculateComplianceReport(rooms);
        set({ complianceReport: compliance });
    },
}));

/**
 * Get available templates
 */
export function getAvailableTemplates(): PlanTemplate[] {
    return ALL_TEMPLATES;
}
