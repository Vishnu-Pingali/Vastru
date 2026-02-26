// Core types for VāstuCAD - Professional Civil Engineering Tool

export type ZoneId = 'NE' | 'N' | 'NW' | 'E' | 'C' | 'W' | 'SE' | 'S' | 'SW';

export type RoomType =
    | 'living_room'
    | 'kitchen'
    | 'master_bedroom'
    | 'bedroom'
    | 'toilet'
    | 'puja'
    | 'staircase'
    | 'dining'
    | 'study'
    | 'entrance'
    | 'utility'
    | 'balcony'
    | 'passage';

export type VastuMode = 'strict' | 'soft' | 'off';

export type Direction = 'N' | 'E' | 'S' | 'W';

// ==================== CIVIL GEOMETRY ====================

export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Wall definition with thickness and connectivity
export interface Wall {
    id: string;
    start: Point;
    end: Point;
    thickness: number; // millimeters
    isExternal: boolean;
    adjacentRooms: string[]; // Room IDs that share this wall
}

// Door with swing arc
export interface Door {
    id: string;
    wallId: string;
    position: number; // position along wall (0-1)
    width: number; // meters
    swingAngle: number; // degrees (90 or 180)
    swingDirection: 'left' | 'right' | 'double';
}

// Window
export interface Window {
    id: string;
    wallId: string;
    position: number;
    width: number;
}

export interface Furniture {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}

// Anchor point for room resizing
export type AnchorPoint = 'nw' | 'ne' | 'sw' | 'se' | 'center';

// ==================== TEMPLATE SYSTEM ====================

export interface RoomTemplate {
    id: string;
    label: string;
    type: RoomType;
    rect: Rect;
    zoneIntent: ZoneId[]; // Intended Vastu zones for this room
    forbiddenZones?: ZoneId[]; // Zones this room should never be in
    anchor: AnchorPoint; // How this room should resize
    minSize: Size;
    maxSize: Size;
    wallIds: string[]; // References to walls that bound this room
    doorIds?: string[];
    windowIds?: string[];
}

export interface PlanTemplate {
    id: string;
    name: string;
    facing: Direction; // Building facing direction
    baseEnvelope: Size; // Base dimensions in meters
    description: string;
    floors: number;
    bedrooms: number;
    walls: Wall[];
    rooms: RoomTemplate[];
    doors: Door[];
    windows?: Window[];
}

// ==================== RUNTIME STATE ====================

// Room instance at runtime (derived from template)
export interface Room {
    id: string;
    templateId: string; // Reference to template
    type: RoomType;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zone: ZoneId;
    score: number;
    violation?: string | null;
    furniture?: Furniture[];
}

// Wall instance at runtime
export interface RuntimeWall extends Wall {
    transformed: {
        start: Point;
        end: Point;
    };
}

export interface Zone {
    id: ZoneId;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface PlotSettings {
    width: number;
    height: number;
    orientation: number; // 0-360 degrees
}

export interface VastuRules {
    zones: ZoneId[];
    room_rules: {
        [key in RoomType]?: {
            preferred?: ZoneId[];
            allowed?: ZoneId[];
            forbidden?: ZoneId[];
        };
    };
    weights?: {
        vastu_soft?: number;
        adjacency?: number;
        area_mismatch?: number;
        hard_violation?: number;
    };
}

export interface ComplianceReport {
    totalScore: number;
    roomScores: {
        id: string;
        type: RoomType;
        zone: ZoneId;
        score: number;
        violation?: string | null;
    }[];
    hardViolations: {
        roomId: string;
        reason: string;
    }[];
}

export interface ProjectState {
    plot: PlotSettings;
    rooms: Room[];
    vastuMode: VastuMode;
    complianceScore: number;
    templateId?: string;
    activeTemplate?: PlanTemplate;
}

export interface RoomTypeInfo {
    type: RoomType;
    label: string;
    icon: string;
    defaultSize: { width: number; height: number };
    targetArea: number;
    priority: number;
}

// ==================== EDITING MODES ====================

export type EditMode = 'template' | 'creative';

export interface EditState {
    mode: EditMode;
    selectedWallId: string | null;
    selectedRoomId: string | null;
    isDraggingWall: boolean;
    dragStartPoint: Point | null;
}
