// store/useStore.ts
// Zustand store for VāstuCAD - Template-driven architecture

import { create } from 'zustand';
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

function getFacingFromOrientation(orientation: number): 'N' | 'E' | 'S' | 'W' {
    const normalized = ((orientation % 360) + 360) % 360;

    if (normalized >= 315 || normalized < 45) return 'N';
    if (normalized >= 45 && normalized < 135) return 'E';
    if (normalized >= 135 && normalized < 225) return 'S';
    return 'W';
}

function extractJsonObject(text: string) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('Gemini response did not contain a complete JSON object');
    }

    return text.slice(firstBrace, lastBrace + 1).trim();
}

async function generateGeminiFloorPlan(apiKey: string, promptText: string) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: promptText }],
                },
            ],
            generationConfig: {
                temperature: 0.35,
                responseMimeType: 'application/json',
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('')
        .trim();

    if (!text) {
        throw new Error('Gemini returned an empty response');
    }

    return JSON.parse(extractJsonObject(text));
}

function formatGeminiError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
        return 'invalid Gemini API key';
    }

    if (message.includes('PERMISSION_DENIED') || message.includes('403')) {
        return 'Gemini access denied for this API key or project';
    }

    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        return 'Gemini quota limit reached';
    }

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return 'network/CORS error while contacting Gemini';
    }

    if (message.includes('empty response')) {
        return 'Gemini returned an empty response';
    }

    return message;
}

function getGeminiApiKey() {
    // @ts-expect-error: environment variable may be undefined in browser build
    return String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

function buildGeminiPrompt(plot: PlotSettings, roomReqs: RoomReq[]) {
    return `
You are an expert apartment floor-plan architect and Vastu-aware planner. Generate ONLY valid JSON for a realistic Indian apartment-style residential floor plan. The result must look like a brochure plan with connected rooms, believable circulation, and practical proportions, not like separate floating rectangles.

Plot: ${plot.width}m x ${plot.height}m, facing ${plot.orientation} degrees
Rooms: ${JSON.stringify(roomReqs.map((r) => ({ type: r.type, area: r.targetArea })))}

STYLE TARGET:
- central dining or family hall as the main organizing core
- living room near the main entrance
- kitchen directly connected to dining
- utility attached to or beside kitchen
- bedrooms placed at outer edges or corners for privacy
- attached toilets near bedrooms where possible
- puja as a small quiet corner room
- balcony attached to living room or bedroom edge
- compact Indian apartment brochure style

MANDATORY RULES:
1. Produce one connected apartment layout, not scattered boxes.
2. Rooms must share walls logically and form a believable home plan.
3. No large empty unused gaps inside the plan.
4. Use compact realistic sizes for toilet, puja, utility, and entrance.
5. Keep living and dining larger than service rooms.
6. Main entrance must be on the facing side and open into living, foyer, or circulation.
7. Avoid opening the main entrance directly into a toilet or private bedroom.
8. Keep habitable rooms on outer walls where possible for light and ventilation.
9. Avoid doors directly facing each other when possible.
10. Use only whole numbers or 0.5 increments for coordinates and sizes.
11. Generate proper walls and believable door positions matching room adjacency.

VASTU PREFERENCES:
- master bedroom: SW / S / W
- bedroom: W / NW / N
- kitchen: SE / E
- living: N / NE / E near entrance
- puja: NE / N / E quiet corner
- toilet: W / NW / S if possible

LABELS:
Use only these architectural labels when relevant:
"Living", "Dining", "Kitchen", "Bedroom", "Master Bedroom", "Toilet", "Puja", "Utility", "Balcony", "Entrance", "Passage"

Return ONLY this JSON structure:
{"score": 85, "rooms": [{"id": "r1", "label": "Master Bedroom", "type": "master_bedroom", "x": 0, "y": 0, "width": 4, "height": 4, "zone": "SW", "score": 100, "violation": null}], "walls": [{"id": "w1", "start": {"x": 0, "y": 0}, "end": {"x": 4, "y": 0}, "thickness": 0.23, "isExternal": true, "adjacentRooms": ["r1"]}], "doors": [{"id": "d1", "wallId": "w1", "position": 0.5, "width": 0.9, "swingAngle": 90, "swingDirection": "left"}]}`;
}

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
    testGeminiConnection: () => Promise<boolean>;
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
        let geminiFailureReason: string | null = null;

        showToastMessage('🤖 Generating AI Layout...');

        try {
            // Try AI generation with Gemini
            const apiKey = getGeminiApiKey();
            
            if (apiKey) {
                try {
                    const promptText = buildGeminiPrompt(plot, roomReqs);
                    const _legacyPrompt = `
You are an expert Vastu Shastra architect and floor plan designer. Generate ONLY valid JSON (no markdown blocks) for a floor plan.

Plot: ${plot.width}m x ${plot.height}m, facing ${plot.orientation}°
Rooms: ${JSON.stringify(roomReqs.map(r => ({ type: r.type, area: r.targetArea })))}

REQUIREMENTS:
1. Design rooms packed in a rectangular footprint starting at (0,0)
2. NO empty gaps between rooms - they must fit like a puzzle
3. All coordinates: whole numbers or .5 increments (e.g., 2, 3.5)
4. Vastu rules: Master Bedroom SW, Kitchen SE, Living near entrance in N/NE/E, Puja in a quiet NE/N/E corner
5. Public zone: living hall near the entrance
6. Semi-private zone: dining directly connected to kitchen
7. Private zone: bedrooms grouped in a quiet corner away from entrance
8. Master bedroom should have attached bathroom and privacy
9. Avoid placing doors directly opposite each other across a passage
10. Provide a clear corridor / movement spine without dead-end circulation
11. Ensure natural light and ventilation by keeping habitable rooms on external edges when possible
12. Return ONLY this JSON structure, no markdown:

{"score": 85, "rooms": [{"id": "r1", "label": "Room", "type": "master_bedroom", "x": 0, "y": 0, "width": 4, "height": 4, "zone": "SW", "score": 100, "violation": null}], "walls": [{"id": "w1", "start": {"x": 0, "y": 0}, "end": {"x": 4, "y": 0}, "thickness": 0.23, "isExternal": true, "adjacentRooms": []}], "doors": [{"id": "d1", "wallId": "w1", "position": 0.5, "width": 0.9, "swingAngle": 90, "swingDirection": "left"}]}`;

                    const plan = await generateGeminiFloorPlan(apiKey, promptText);
                    console.log('Gemini Response:', plan);
                    
                    // Validate plan structure
                    if (!plan.rooms || !Array.isArray(plan.rooms) || plan.rooms.length === 0) {
                        throw new Error('Invalid plan structure from AI');
                    }

                    const syntheticTemplate: PlanTemplate = {
                        id: 'ai-template',
                        name: '🏠 AI Generated',
                        facing: getFacingFromOrientation(plot.orientation),
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
                    geminiFailureReason = formatGeminiError(aiError);
                    console.error('Gemini unavailable:', geminiFailureReason);
                }
            } else {
                geminiFailureReason = 'Gemini API key missing';
            }
        } catch (error: any) {
            console.error('API setup error:', error);
            geminiFailureReason = formatGeminiError(error);
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
                facing: getFacingFromOrientation(plot.orientation),
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

            showToastMessage(
                geminiFailureReason
                    ? `Local plan generated. Gemini failed: ${geminiFailureReason}`
                    : '✅ Layout Generated (Local)'
            );
        } catch (fallbackError) {
            console.error('Local layout generation failed:', fallbackError);
            showToastMessage('❌ Layout generation failed');
        }
    },

    testGeminiConnection: async () => {
        const { showToastMessage } = get();
        const apiKey = getGeminiApiKey();

        if (!apiKey) {
            showToastMessage('Gemini test failed: API key missing');
            return false;
        }

        showToastMessage('Testing Gemini connection...');

        try {
            await generateGeminiFloorPlan(
                apiKey,
                `Return only valid JSON like {"status":"ok","message":"Gemini reachable"}`
            );
            showToastMessage('Gemini connected successfully');
            return true;
        } catch (error) {
            const reason = formatGeminiError(error);
            console.error('Gemini test failed:', reason);
            showToastMessage(`Gemini test failed: ${reason}`);
            return false;
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
