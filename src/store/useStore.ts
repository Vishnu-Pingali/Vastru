// store/useStore.ts
// Zustand store for VāstuCAD - Template-driven architecture

import { create } from 'zustand';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    Room,
    PlotSettings,
    VastuMode,
    ProjectState,
    ComplianceReport,
    PlanTemplate,
    Wall,
    EditMode,
    ExportableStage,
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
    stageRef: React.RefObject<ExportableStage> | null;
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
    setStageRef: (ref: React.RefObject<ExportableStage>) => void;

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
            // Try AI generation with Gemini
            // @ts-expect-error: environment variable may be undefined in browser build
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            
            if (apiKey) {
                try {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    // Using gemini-1.5-flash which is reliable and fast
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                    const promptText = `
You are an expert Vastu Shastra architect and floor plan designer. Generate ONLY valid JSON (no markdown blocks) for a floor plan.

Plot: ${plot.width}m x ${plot.height}m, facing ${plot.orientation}°
Rooms: ${JSON.stringify(roomReqs.map(r => ({ type: r.type, area: r.targetArea })))}

REQUIREMENTS:
1. Design rooms packed in a rectangular footprint starting at (0,0)
2. NO empty gaps between rooms - they must fit like a puzzle
3. All coordinates: whole numbers or .5 increments (e.g., 2, 3.5)
4. Vastu rules: Master Bedroom SW, Kitchen SE, Living NE, Puja NW
5. Return ONLY this JSON structure, no markdown:

{"score": 85, "rooms": [{"id": "r1", "label": "Room", "type": "master_bedroom", "x": 0, "y": 0, "width": 4, "height": 4, "zone": "SW", "score": 100, "violation": null}], "walls": [{"id": "w1", "start": {"x": 0, "y": 0}, "end": {"x": 4, "y": 0}, "thickness": 0.23, "isExternal": true, "adjacentRooms": []}], "doors": [{"id": "d1", "wallId": "w1", "position": 0.5, "width": 0.9, "swingAngle": 90, "swingDirection": "left"}]}`;

                    const result = await model.generateContent(promptText);
                    const responseText = result.response.text().trim();
                    
                    // Clean JSON response
                    const cleanedJsonText = responseText
                        .replace(/```json/gi, '')
                        .replace(/```/g, '')
                        .replace(/^[\s\S]*?{/, '{')
                        .replace(/}[\s\S]*?$/, '}')
                        .trim();
                    
                    console.log("Gemini Response:", cleanedJsonText);

                    const plan = JSON.parse(cleanedJsonText);
                    
                    // Validate plan structure
                    if (!plan.rooms || !Array.isArray(plan.rooms) || plan.rooms.length === 0) {
                        throw new Error('Invalid plan structure from AI');
                    }

                    const syntheticTemplate: PlanTemplate = {
                        id: 'ai-template',
                        name: '🏠 AI Generated',
                        facing: 'E',
                        baseEnvelope: { width: plot.width, height: plot.height },
                        description: 'AI-generated Vastu floor plan',
                        floors: 1,
                        bedrooms: roomReqs.filter(r => r.type.includes('bedroom')).length,
                        walls: plan.walls || [],
                        rooms: plan.rooms.map((r: any) => ({
                            id: r.id,
                            label: r.label,
                            type: r.type,
                            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                            zoneIntent: [r.zone || 'C'],
                            anchor: 'center',
                            minSize: { width: 1, height: 1 },
                            maxSize: { width: 20, height: 20 },
                            wallIds: []
                        })),
                        doors: plan.doors || []
                    };

                    // Ensure rooms have all required properties
                    const roomsWithTemplate = plan.rooms.map((r: any) => ({
                        ...r,
                        templateId: 'ai-template',
                        zone: r.zone || 'C'
                    }));

                    set({
                        rooms: roomsWithTemplate,
                        walls: plan.walls || [],
                        activeTemplate: syntheticTemplate,
                        complianceReport: {
                            totalScore: plan.score || 75,
                            roomScores: plan.rooms.map((r: any) => ({
                                id: r.id,
                                type: r.type,
                                zone: r.zone,
                                score: r.score || 80,
                                violation: r.violation
                            })),
                            hardViolations: (plan.rooms || [])
                                .filter((r: any) => r.violation === 'forbidden')
                                .map((r: any) => ({ roomId: r.id, reason: 'Vastu Violation' }))
                        },
                        selectedRoomId: null,
                        selectedWallId: null,
                        editMode: 'creative'
                    });

                    showToastMessage('✨ AI Plan Generated!');
                    return;
                } catch (aiError) {
                    console.warn('AI generation failed, using local generator:', aiError);
                }
            }
        } catch (error: any) {
            console.error('API setup error:', error);
        }

        // Fallback: Always use local JS generation
        console.log('Using local layout generator...');
        try {
            const { rooms, compliance, walls, doors } = generateLayout(plot, roomReqs);

            // Ensure rooms have all required properties
            const roomsWithTemplate = rooms.map(r => ({
                ...r,
                templateId: 'local-template',
                zone: r.zone || 'C'
            }));

            const syntheticTemplate: PlanTemplate = {
                id: 'local-template',
                name: '⚙️ Smart Layout (Local)',
                facing: 'E',
                baseEnvelope: { width: plot.width, height: plot.height },
                description: 'Vastu-optimized local layout',
                floors: 1,
                bedrooms: roomReqs.filter(r => r.type.includes('bedroom')).length,
                walls,
                rooms: roomsWithTemplate.map(r => ({
                    id: r.id,
                    label: r.label,
                    type: r.type,
                    rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                    zoneIntent: [r.zone || 'C'],
                    anchor: 'center',
                    minSize: { width: 1, height: 1 },
                    maxSize: { width: 20, height: 20 },
                    wallIds: []
                })),
                doors: doors || []
            };

            set({
                rooms: roomsWithTemplate,
                walls: walls || [],
                activeTemplate: syntheticTemplate,
                complianceReport: compliance,
                selectedRoomId: null,
                selectedWallId: null,
                editMode: 'creative'
            });

            showToastMessage('✅ Layout Generated (Local)');
        } catch (fallbackError) {
            console.error('Local layout generation failed:', fallbackError);
            showToastMessage('❌ Layout generation failed');
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
