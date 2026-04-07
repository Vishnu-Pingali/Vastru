// utils/autoLayout.ts
// Lightweight, client-side autolayout with Vedic Vastu awareness

import type { PlotSettings, Room, RoomType, Zone, ZoneId, VastuRules, ComplianceReport, Wall, Door, Furniture } from '../types';
import { computeZones, pickZoneForPoint } from './zoneUtils';
import { calculateRoomVastuScore, getRoomLabel } from './vastuUtils';
import vastuRulesData from '../vastu_rules.json';

const vastuRules = vastuRulesData as VastuRules;

export type RoomReq = {
    id: string;
    type: RoomType;
    targetArea: number;
    minArea?: number;
    maxArea?: number;
    priority?: number;
};

type LayoutRoom = Room;

type LayoutScore = { score: number; hardViolation: { roomId: string; reason: string } | null };
type GridCell = { row: 0 | 1 | 2; col: 0 | 1 | 2 };
type Rect = { x: number; y: number; width: number; height: number };
type FacingDirection = 'N' | 'E' | 'S' | 'W';

const ZONE_TO_CELL: Record<ZoneId, GridCell> = {
    NW: { row: 0, col: 0 },
    N: { row: 0, col: 1 },
    NE: { row: 0, col: 2 },
    W: { row: 1, col: 0 },
    C: { row: 1, col: 1 },
    E: { row: 1, col: 2 },
    SW: { row: 2, col: 0 },
    S: { row: 2, col: 1 },
    SE: { row: 2, col: 2 },
};

/**
 * Simple deterministic pseudo-random with seed (mulberry32)
 */
export function mulberry32(seed: number) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function snapToGrid(value: number, step = 0.5) {
    return Math.round(value / step) * step;
}

function wallLength(edge: { x1: number; y1: number; x2: number; y2: number } | { start: { x: number; y: number }; end: { x: number; y: number } }) {
    const x1 = 'x1' in edge ? edge.x1 : edge.start.x;
    const y1 = 'y1' in edge ? edge.y1 : edge.start.y;
    const x2 = 'x2' in edge ? edge.x2 : edge.end.x;
    const y2 = 'y2' in edge ? edge.y2 : edge.end.y;
    return Math.hypot(x2 - x1, y2 - y1);
}

function overlapAmount(aStart: number, aEnd: number, bStart: number, bEnd: number) {
    return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function roomsOverlap(roomA: LayoutRoom, roomB: LayoutRoom) {
    const overlapX = overlapAmount(roomA.x, roomA.x + roomA.width, roomB.x, roomB.x + roomB.width);
    const overlapY = overlapAmount(roomA.y, roomA.y + roomA.height, roomB.y, roomB.y + roomB.height);
    return overlapX > 0.05 && overlapY > 0.05;
}

function roomDistance(roomA: LayoutRoom, roomB: LayoutRoom) {
    const dx = Math.max(0, Math.max(roomA.x - (roomB.x + roomB.width), roomB.x - (roomA.x + roomA.width)));
    const dy = Math.max(0, Math.max(roomA.y - (roomB.y + roomB.height), roomB.y - (roomA.y + roomA.height)));
    return Math.hypot(dx, dy);
}

function roomCenter(room: LayoutRoom) {
    return {
        x: room.x + room.width / 2,
        y: room.y + room.height / 2,
    };
}

function isHabitableRoom(type: RoomType) {
    return !['toilet', 'passage', 'utility'].includes(type);
}

function isCornerRoom(plot: PlotSettings, room: LayoutRoom, tolerance = 0.6) {
    const touchesLeft = room.x <= tolerance;
    const touchesRight = plot.width - (room.x + room.width) <= tolerance;
    const touchesTop = room.y <= tolerance;
    const touchesBottom = plot.height - (room.y + room.height) <= tolerance;

    return (touchesLeft || touchesRight) && (touchesTop || touchesBottom);
}

function distanceFromEntranceAxis(plot: PlotSettings, room: LayoutRoom, facing: FacingDirection) {
    const center = roomCenter(room);

    switch (facing) {
        case 'N':
            return center.y;
        case 'S':
            return plot.height - center.y;
        case 'E':
            return plot.width - center.x;
        case 'W':
            return center.x;
    }
}

function getRoomArea(room: LayoutRoom) {
    return room.width * room.height;
}

function isNearBoundary(plot: PlotSettings, room: LayoutRoom, tolerance = 0.35) {
    return (
        room.x <= tolerance ||
        room.y <= tolerance ||
        plot.width - (room.x + room.width) <= tolerance ||
        plot.height - (room.y + room.height) <= tolerance
    );
}

function getPreferredZones(roomType: RoomType, rules: VastuRules): ZoneId[] {
    const rule = rules.room_rules[roomType];
    const base = [...(rule?.preferred || []), ...(rule?.allowed || [])];

    if (base.length > 0) {
        return Array.from(new Set(base));
    }

    switch (roomType) {
        case 'master_bedroom':
            return ['SW', 'S', 'W'];
        case 'bedroom':
            return ['NW', 'N', 'W'];
        case 'living_room':
            return ['N', 'NE', 'C', 'E'];
        case 'kitchen':
            return ['SE', 'E', 'S'];
        case 'dining':
            return ['C', 'S', 'E'];
        case 'puja':
            return ['NE', 'E', 'N'];
        case 'toilet':
            return ['W', 'NW', 'S'];
        case 'entrance':
            return ['E', 'N', 'NE'];
        case 'utility':
            return ['SE', 'S', 'E'];
        case 'balcony':
            return ['N', 'E', 'W'];
        case 'staircase':
            return ['SW', 'S', 'W'];
        case 'study':
            return ['E', 'N', 'C'];
        case 'passage':
            return ['C', 'W', 'E'];
        default:
            return ['C'];
    }
}

function cellKey(cell: GridCell) {
    return `${cell.row}-${cell.col}`;
}

function getFacingDirection(orientation: number): FacingDirection {
    const normalized = ((orientation % 360) + 360) % 360;

    if (normalized >= 315 || normalized < 45) return 'N';
    if (normalized >= 45 && normalized < 135) return 'E';
    if (normalized >= 135 && normalized < 225) return 'S';
    return 'W';
}

function getFacingCell(facing: FacingDirection): GridCell {
    switch (facing) {
        case 'N':
            return { row: 0, col: 1 };
        case 'E':
            return { row: 1, col: 2 };
        case 'S':
            return { row: 2, col: 1 };
        case 'W':
            return { row: 1, col: 0 };
    }
}

function getInteriorCellForFacing(facing: FacingDirection): GridCell {
    switch (facing) {
        case 'N':
            return { row: 1, col: 1 };
        case 'E':
            return { row: 1, col: 1 };
        case 'S':
            return { row: 1, col: 1 };
        case 'W':
            return { row: 1, col: 1 };
    }
}

function areaOfReqs(roomReqs: RoomReq[]) {
    return roomReqs.reduce((sum, req) => sum + req.targetArea, 0);
}

function distributeSpan(total: number, weights: number[], active: boolean[], minSize: number) {
    const result = [0, 0, 0];
    const activeIndexes = active
        .map((enabled, index) => (enabled ? index : -1))
        .filter((index) => index >= 0);

    if (activeIndexes.length === 0) {
        return result;
    }

    const reserved = activeIndexes.length * minSize;
    const remaining = Math.max(0, total - reserved);
    const totalWeight = activeIndexes.reduce((sum, index) => sum + Math.max(0, weights[index]), 0);

    activeIndexes.forEach((index) => {
        const share = totalWeight > 0 ? Math.max(0, weights[index]) / totalWeight : 1 / activeIndexes.length;
        result[index] = minSize + remaining * share;
    });

    return result;
}

function splitRect(rect: Rect, roomReqs: RoomReq[]): Array<{ req: RoomReq; rect: Rect }> {
    if (roomReqs.length === 0) {
        return [];
    }

    if (roomReqs.length === 1) {
        return [{ req: roomReqs[0], rect }];
    }

    const sorted = [...roomReqs].sort((a, b) => b.targetArea - a.targetArea);
    const targetHalf = areaOfReqs(sorted) / 2;
    let running = 0;
    let splitIndex = 1;

    while (splitIndex < sorted.length - 1 && running + sorted[splitIndex - 1].targetArea < targetHalf) {
        running += sorted[splitIndex - 1].targetArea;
        splitIndex += 1;
    }

    const firstGroup = sorted.slice(0, splitIndex);
    const secondGroup = sorted.slice(splitIndex);
    const firstArea = areaOfReqs(firstGroup);
    const totalArea = Math.max(1, firstArea + areaOfReqs(secondGroup));
    const splitVertical = rect.width >= rect.height;

    if (splitVertical) {
        const firstWidth = rect.width * (firstArea / totalArea);
        return [
            ...splitRect({ x: rect.x, y: rect.y, width: firstWidth, height: rect.height }, firstGroup),
            ...splitRect({ x: rect.x + firstWidth, y: rect.y, width: rect.width - firstWidth, height: rect.height }, secondGroup),
        ];
    }

    const firstHeight = rect.height * (firstArea / totalArea);
    return [
        ...splitRect({ x: rect.x, y: rect.y, width: rect.width, height: firstHeight }, firstGroup),
        ...splitRect({ x: rect.x, y: rect.y + firstHeight, width: rect.width, height: rect.height - firstHeight }, secondGroup),
    ];
}

function isExpandableRoomType(type: RoomType) {
    return ['living_room', 'dining', 'passage', 'balcony'].includes(type);
}

function getRoomGrowthFactor(type: RoomType) {
    switch (type) {
        case 'toilet':
        case 'puja':
            return 1.2;
        case 'kitchen':
        case 'utility':
        case 'entrance':
        case 'study':
            return 1.35;
        case 'master_bedroom':
        case 'bedroom':
            return 1.6;
        case 'living_room':
        case 'dining':
        case 'passage':
        case 'balcony':
            return 3;
        default:
            return 1.5;
    }
}

function getPreferredAspectRatio(type: RoomType) {
    switch (type) {
        case 'toilet':
            return 0.85;
        case 'kitchen':
        case 'utility':
            return 0.95;
        case 'entrance':
        case 'puja':
            return 1;
        case 'passage':
            return 1.4;
        case 'living_room':
        case 'dining':
            return 1.2;
        case 'master_bedroom':
        case 'bedroom':
            return 1.1;
        default:
            return 1;
    }
}

function fitRoomToCell(req: RoomReq, rect: Rect): Rect {
    if (isExpandableRoomType(req.type)) {
        return rect;
    }

    const cellArea = rect.width * rect.height;
    const targetArea = Math.min(cellArea, req.targetArea * getRoomGrowthFactor(req.type));
    const preferredRatio = getPreferredAspectRatio(req.type);

    let width = Math.sqrt(targetArea * preferredRatio);
    let height = targetArea / Math.max(width, 0.1);

    if (width > rect.width) {
        width = rect.width;
        height = targetArea / Math.max(width, 0.1);
    }

    if (height > rect.height) {
        height = rect.height;
        width = targetArea / Math.max(height, 0.1);
    }

    width = Math.max(1, Math.min(rect.width, snapToGrid(width)));
    height = Math.max(1, Math.min(rect.height, snapToGrid(height)));

    let x = rect.x;
    let y = rect.y;

    switch (req.type) {
        case 'master_bedroom':
        case 'bedroom':
            x = rect.x;
            y = rect.y + rect.height - height;
            break;
        case 'toilet':
        case 'utility':
        case 'kitchen':
            x = rect.x + rect.width - width;
            y = rect.y + rect.height - height;
            break;
        case 'puja':
            x = rect.x + rect.width - width;
            y = rect.y;
            break;
        case 'entrance':
            x = rect.x + rect.width - width;
            y = rect.y + (rect.height - height) / 2;
            break;
        default:
            x = rect.x + (rect.width - width) / 2;
            y = rect.y + (rect.height - height) / 2;
            break;
    }

    return {
        x: snapToGrid(x),
        y: snapToGrid(y),
        width,
        height,
    };
}

function refineCellAssignments(assignments: Map<string, GridCell>, sorted: RoomReq[], plot: PlotSettings) {
    const getAssigned = (type: RoomType) => sorted.find((req) => req.type === type && assignments.has(req.id));
    const getAssignedById = (id: string) => sorted.find((req) => req.id === id && assignments.has(req.id));
    const facing = getFacingDirection(plot.orientation);
    const entranceCell = getFacingCell(facing);
    const innerFacingCell = getInteriorCellForFacing(facing);
    const privateCorner: Record<FacingDirection, GridCell> = {
        N: { row: 2, col: 0 },
        E: { row: 2, col: 0 },
        S: { row: 0, col: 2 },
        W: { row: 2, col: 2 },
    };
    const quietCorner: Record<FacingDirection, GridCell> = {
        N: { row: 0, col: 2 },
        E: { row: 0, col: 2 },
        S: { row: 0, col: 0 },
        W: { row: 0, col: 0 },
    };

    const kitchen = getAssigned('kitchen');
    const utility = getAssigned('utility');
    const living = getAssigned('living_room');
    const entrance = getAssigned('entrance');
    const dining = getAssigned('dining');
    const passage = getAssigned('passage');
    const masterBedroom = getAssigned('master_bedroom');
    const bedroom = getAssigned('bedroom');
    const puja = getAssigned('puja');
    const toilet = getAssigned('toilet');

    if (passage) {
        assignments.set(passage.id, { row: 1, col: 1 });
    }

    if (kitchen && utility) {
        const kitchenCell = assignments.get(kitchen.id)!;
        assignments.set(utility.id, { row: kitchenCell.row, col: Math.max(0, kitchenCell.col - 1) as 0 | 1 | 2 });
    }

    if (entrance) {
        assignments.set(entrance.id, entranceCell);
    }

    if (living && entrance) {
        assignments.set(living.id, innerFacingCell);
    }

    if (living && dining) {
        const livingCell = assignments.get(living.id)!;
        assignments.set(dining.id, { row: Math.min(2, livingCell.row + 1) as 0 | 1 | 2, col: livingCell.col });
    }

    if (masterBedroom) {
        assignments.set(masterBedroom.id, privateCorner[facing]);
    }

    if (bedroom) {
        const masterCell = masterBedroom ? assignments.get(masterBedroom.id)! : privateCorner[facing];
        assignments.set(bedroom.id, {
            row: masterCell.row === 2 ? 0 : 2,
            col: masterCell.col,
        });
    }

    if (puja) {
        assignments.set(puja.id, quietCorner[facing]);
    }

    if (masterBedroom && toilet) {
        const masterCell = assignments.get(masterBedroom.id)!;
        assignments.set(toilet.id, {
            row: masterCell.row,
            col: Math.min(2, masterCell.col + 1) as 0 | 1 | 2,
        });
    }

    sorted
        .filter((req) => req.type === 'toilet' && req.id.endsWith('_bath'))
        .forEach((bathReq) => {
            const parentId = bathReq.id.replace(/_bath$/, '');
            const parent = getAssignedById(parentId);
            if (!parent) return;

            const parentCell = assignments.get(parent.id)!;
            assignments.set(bathReq.id, {
                row: parentCell.row,
                col: Math.min(2, parentCell.col + 1) as 0 | 1 | 2,
            });
        });
}

function ensureCirculationRooms(roomReqs: RoomReq[], plot: PlotSettings): RoomReq[] {
    const withCirculation = [...roomReqs];
    const hasEntrance = withCirculation.some((req) => req.type === 'entrance');
    const hasPassage = withCirculation.some((req) => req.type === 'passage');
    const habitableRooms = withCirculation.filter(
        (req) => !['toilet', 'utility', 'balcony', 'entrance', 'passage'].includes(req.type)
    ).length;

    if (!hasEntrance) {
        withCirculation.push({
            id: 'auto_entrance',
            type: 'entrance',
            targetArea: Math.max(4, Math.min(6, plot.width * 0.35)),
            priority: 2,
        });
    }

    if (!hasPassage && habitableRooms >= 4) {
        withCirculation.push({
            id: 'auto_passage',
            type: 'passage',
            targetArea: Math.max(5, Math.min(8, plot.height * 0.45)),
            priority: 3,
        });
    }

    return withCirculation;
}

function attachFurniture(room: LayoutRoom, items: Array<Omit<Furniture, 'id'>>) {
    return {
        ...room,
        furniture: items.map((item, index) => ({
            ...item,
            id: `${room.id}-f-${index}`,
        })),
    };
}

function generateFurnitureForRoom(room: LayoutRoom): LayoutRoom {
    const inset = 0.25;

    if (room.type === 'master_bedroom' || room.type === 'bedroom') {
        const bedWidth = Math.min(room.width - inset * 2, 2);
        const bedHeight = Math.min(room.height - inset * 2, 2.1);
        return attachFurniture(room, [
            {
                type: 'bed',
                x: room.x + inset,
                y: room.y + inset,
                width: Math.max(1.5, bedWidth),
                height: Math.max(1.9, bedHeight),
                rotation: 0,
            },
            {
                type: 'wardrobe',
                x: room.x + room.width - 0.7,
                y: room.y + inset,
                width: 0.45,
                height: Math.max(1.2, room.height * 0.45),
                rotation: 0,
            },
        ]);
    }

    if (room.type === 'living_room') {
        return attachFurniture(room, [
            {
                type: 'sofa',
                x: room.x + inset,
                y: room.y + room.height * 0.2,
                width: Math.max(1.8, room.width * 0.32),
                height: Math.max(0.75, room.height * 0.18),
                rotation: 0,
            },
            {
                type: 'coffee_table',
                x: room.x + room.width * 0.42,
                y: room.y + room.height * 0.42,
                width: Math.max(0.8, room.width * 0.18),
                height: Math.max(0.5, room.height * 0.12),
                rotation: 0,
            },
        ]);
    }

    if (room.type === 'dining') {
        return attachFurniture(room, [
            {
                type: 'dining_table',
                x: room.x + room.width * 0.22,
                y: room.y + room.height * 0.24,
                width: Math.max(1.2, room.width * 0.48),
                height: Math.max(0.85, room.height * 0.34),
                rotation: 0,
            },
        ]);
    }

    if (room.type === 'kitchen') {
        return attachFurniture(room, [
            {
                type: 'counter',
                x: room.x + inset,
                y: room.y + inset,
                width: room.width - inset * 2,
                height: 0.55,
                rotation: 0,
            },
            {
                type: 'counter',
                x: room.x + room.width - 0.55 - inset,
                y: room.y + inset,
                width: 0.55,
                height: room.height - inset * 2,
                rotation: 0,
            },
            {
                type: 'stove',
                x: room.x + room.width * 0.25,
                y: room.y + inset + 0.08,
                width: 0.7,
                height: 0.45,
                rotation: 0,
            },
        ]);
    }

    if (room.type === 'toilet') {
        return attachFurniture(room, [
            {
                type: 'wc',
                x: room.x + inset,
                y: room.y + inset,
                width: 0.75,
                height: 0.55,
                rotation: 0,
            },
            {
                type: 'basin',
                x: room.x + room.width - 0.7 - inset,
                y: room.y + inset,
                width: 0.55,
                height: 0.4,
                rotation: 0,
            },
            {
                type: 'shower',
                x: room.x + room.width - 1 - inset,
                y: room.y + room.height - 1 - inset,
                width: 0.9,
                height: 0.9,
                rotation: 0,
            },
        ]);
    }

    if (room.type === 'entrance' || room.type === 'passage') {
        return attachFurniture(room, [
            {
                type: 'console',
                x: room.x + room.width * 0.25,
                y: room.y + room.height * 0.72,
                width: Math.max(0.7, room.width * 0.5),
                height: 0.18,
                rotation: 0,
            },
        ]);
    }

    return room;
}

/**
 * Compute layout score for optimization
 */
function computeLayoutScore(
    layoutRooms: LayoutRoom[],
    _rules: VastuRules,
    plot?: PlotSettings
): LayoutScore {
    let softSum = 0;

    for (let i = 0; i < layoutRooms.length; i++) {
        for (let j = i + 1; j < layoutRooms.length; j++) {
            if (roomsOverlap(layoutRooms[i], layoutRooms[j])) {
                return {
                    score: -Infinity,
                    hardViolation: {
                        roomId: layoutRooms[i].id,
                        reason: `${layoutRooms[i].label} overlaps ${layoutRooms[j].label}`,
                    },
                };
            }
        }
    }

    // Specific constraint: Puja room and Toilet should never be together (common wall or adjacent)
    const puja = layoutRooms.find((r) => r.type === 'puja');
    const toilets = layoutRooms.filter((r) => r.type === 'toilet');

    if (puja) {
        for (const toilet of toilets) {
            if (roomDistance(puja, toilet) < 0.1) {
                return {
                    score: -Infinity,
                    hardViolation: { roomId: puja.id, reason: 'Puja room near Toilet (Forbidden)' },
                };
            }
        }
    }

    for (const r of layoutRooms) {
        const vst = calculateRoomVastuScore(r.type, r.zone);
        if (vst.violation === 'forbidden') {
            return {
                score: -Infinity,
                hardViolation: { roomId: r.id, reason: `Forbidden in ${r.zone}` },
            };
        }
        softSum += vst.score;
    }

    const kitchen = layoutRooms.find((r) => r.type === 'kitchen');
    const living = layoutRooms.find((r) => r.type === 'living_room');
    const dining = layoutRooms.find((r) => r.type === 'dining');
    const entrance = layoutRooms.find((r) => r.type === 'entrance');
    const masterBedroom = layoutRooms.find((r) => r.type === 'master_bedroom');
    const bedrooms = layoutRooms.filter((r) => r.type === 'master_bedroom' || r.type === 'bedroom');
    const passage = layoutRooms.find((r) => r.type === 'passage');
    const facing = plot ? getFacingDirection(plot.orientation) : 'N';

    layoutRooms.forEach((room) => {
        if (plot && (room.type === 'balcony' || room.type === 'entrance')) {
            softSum += isNearBoundary(plot, room) ? 14 : -18;
        }

        if (plot && room.type === 'utility') {
            softSum += isNearBoundary(plot, room) ? 8 : -10;
        }

        if (room.type === 'utility' && kitchen) {
            softSum += roomDistance(room, kitchen) <= 1.5 ? 10 : -8;
        }

        if (room.type === 'toilet') {
            const nearbyBedroom = layoutRooms.some(
                (other) =>
                    (other.type === 'bedroom' || other.type === 'master_bedroom') &&
                    roomDistance(room, other) <= 1.25
            );
            softSum += nearbyBedroom ? 4 : -6;
        }

        if (plot && isHabitableRoom(room.type)) {
            softSum += isNearBoundary(plot, room, 0.45) ? 7 : -10;
        }

        if (plot && room.type === 'puja') {
            softSum += isCornerRoom(plot, room) ? 10 : -8;

            const tooCloseToEntrance = entrance && roomDistance(room, entrance) < 1.5;
            const tooCloseToPassage = passage && roomDistance(room, passage) < 0.5;
            softSum += tooCloseToEntrance || tooCloseToPassage ? -14 : 9;
        }
    });

    if (dining && living) {
        softSum += roomDistance(dining, living) <= 1.5 ? 8 : -6;
    }

    if (dining && kitchen) {
        softSum += roomDistance(dining, kitchen) <= 1.5 ? 10 : -6;
    }

    if (entrance && living) {
        softSum += roomDistance(entrance, living) <= 2.5 ? 10 : -8;
    }

    if (plot && entrance && living) {
        const livingDepth = distanceFromEntranceAxis(plot, living, facing);
        const diningDepth = dining ? distanceFromEntranceAxis(plot, dining, facing) : livingDepth + 1;
        const privateDepths = bedrooms.map((room) => distanceFromEntranceAxis(plot, room, facing));

        softSum += livingDepth <= plot.width * 0.5 || livingDepth <= plot.height * 0.5 ? 10 : -8;
        softSum += dining ? (diningDepth >= livingDepth - 0.5 ? 6 : -6) : 0;
        softSum += privateDepths.every((depth) => depth >= livingDepth + 0.5) ? 14 : -12;
    }

    if (masterBedroom) {
        const attachedBath = layoutRooms.find(
            (room) => room.type === 'toilet' && roomDistance(room, masterBedroom) < 0.15
        );
        softSum += attachedBath ? 18 : -16;

        if (entrance && plot) {
            const masterDepth = distanceFromEntranceAxis(plot, masterBedroom, facing);
            const entranceDepth = distanceFromEntranceAxis(plot, entrance, facing);
            softSum += masterDepth > entranceDepth + 1 ? 10 : -10;
        }
    }

    if (kitchen && dining) {
        softSum += roomDistance(kitchen, dining) < 0.15 ? 16 : -14;
    }

    if (passage) {
        const connectedRooms = layoutRooms.filter(
            (room) =>
                room.id !== passage.id &&
                room.type !== 'balcony' &&
                roomDistance(room, passage) < 0.15
        ).length;
        softSum += connectedRooms >= 3 ? 12 : -10;
    }

    const avg = Math.max(0, Math.min(100, softSum / Math.max(1, layoutRooms.length)));
    return { score: Math.round(avg), hardViolation: null };
}

/**
 * Greedy deterministic placement
 * Places rooms in preferred zones using guillotine packing
 */
export function greedyPlaceRooms(
    plot: PlotSettings,
    rooms: RoomReq[],
    rules: VastuRules
): { rooms: LayoutRoom[]; zones: Zone[] } {
    const zones = computeZones(plot);
    const sorted = [...rooms].sort(
        (a, b) => (a.priority || 5) - (b.priority || 5) || b.targetArea - a.targetArea
    );
    const assignments = new Map<string, GridCell>();
    const occupancy = new Map<string, RoomReq[]>();

    sorted.forEach((req, index) => {
        const preferredZones = getPreferredZones(req.type, rules);
        const candidateCells = Array.from(
            new Set(preferredZones.map((zoneId) => JSON.stringify(ZONE_TO_CELL[zoneId])))
        ).map((raw) => JSON.parse(raw) as GridCell);

        let bestCell = candidateCells[0] || { row: 1, col: 1 as 0 | 1 | 2 };
        let bestScore = Number.POSITIVE_INFINITY;

        candidateCells.forEach((cell, candidateIndex) => {
            const key = cellKey(cell);
            const area = areaOfReqs(occupancy.get(key) || []);
            const score = area + candidateIndex * 4 + ((index + candidateIndex) % 3);
            if (score < bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        });

        assignments.set(req.id, bestCell);
        const key = cellKey(bestCell);
        occupancy.set(key, [...(occupancy.get(key) || []), req]);
    });

    refineCellAssignments(assignments, sorted, plot);

    const rowWeights = [0, 0, 0];
    const colWeights = [0, 0, 0];

    sorted.forEach((req) => {
        const cell = assignments.get(req.id)!;
        rowWeights[cell.row] += req.targetArea;
        colWeights[cell.col] += req.targetArea;
    });

    const rowHeights = distributeSpan(plot.height, rowWeights, rowWeights.map((w) => w > 0), 2.4);
    const colWidths = distributeSpan(plot.width, colWeights, colWeights.map((w) => w > 0), 2.4);
    const rowY = [0, rowHeights[0], rowHeights[0] + rowHeights[1]];
    const colX = [0, colWidths[0], colWidths[0] + colWidths[1]];

    const placed: LayoutRoom[] = [];

    Array.from(occupancy.entries()).forEach(([key, roomReqs]) => {
        if (roomReqs.length === 0) return;

        const [row, col] = key.split('-').map(Number) as [0 | 1 | 2, 0 | 1 | 2];
        const cellRect: Rect = {
            x: colX[col],
            y: rowY[row],
            width: colWidths[col],
            height: rowHeights[row],
        };

        splitRect(cellRect, roomReqs).forEach(({ req, rect }) => {
            const fittedRect = fitRoomToCell(req, rect);
            const x = fittedRect.x;
            const y = fittedRect.y;
            const width = Math.max(1, snapToGrid(fittedRect.width));
            const height = Math.max(1, snapToGrid(fittedRect.height));
            const cx = x + width / 2;
            const cy = y + height / 2;
            const zone = pickZoneForPoint(zones, cx, cy);

            placed.push({
                id: req.id,
                templateId: `dyn_${req.id}`,
                type: req.type,
                label: getRoomLabel(req.type),
                x,
                y,
                width,
                height,
                zone,
                score: 0,
                violation: null,
            });
        });
    });

    return { rooms: placed, zones };
}

/**
 * Local improvement using simple mutations
 */
export function localImprove(
    layoutRooms: LayoutRoom[],
    zones: Zone[],
    rules: VastuRules,
    iterations = 150,
    seed = 1234
): { rooms: LayoutRoom[]; score: { score: number; hardViolation: any } } {
    const rng = mulberry32(seed);
    let best = layoutRooms.map((r) => ({ ...r }));
    const bestScore = computeLayoutScore(best, rules);

    if (bestScore.hardViolation) {
        return { rooms: best, score: bestScore };
    }

    let bestNumeric = bestScore.score;

    for (let it = 0; it < iterations; it++) {
        const m = Math.floor(rng() * 3);
        const candidate = best.map((r) => ({ ...r }));

        if (m === 0 && candidate.length >= 2) {
            // Swap zones between two rooms
            const i = Math.floor(rng() * candidate.length);
            let j = Math.floor(rng() * candidate.length);
            if (j === i) j = (i + 1) % candidate.length;

            const A = candidate[i];
            const B = candidate[j];
            const zoneA = zones.find((z) => z.id === A.zone)!;
            const zoneB = zones.find((z) => z.id === B.zone)!;

            const AnewX = zoneB.x + (zoneB.w - A.width) / 2;
            const AnewY = zoneB.y + (zoneB.h - A.height) / 2;
            const BnewX = zoneA.x + (zoneA.w - B.width) / 2;
            const BnewY = zoneA.y + (zoneA.h - B.height) / 2;

            candidate[i] = { ...A, x: AnewX, y: AnewY, zone: zoneB.id };
            candidate[j] = { ...B, x: BnewX, y: BnewY, zone: zoneA.id };
        } else if (m === 1) {
            // Nudge within zone
            const i = Math.floor(rng() * candidate.length);
            const r = candidate[i];
            const z = zones.find((z) => z.id === r.zone)!;
            const dx = (rng() - 0.5) * 0.3 * z.w;
            const dy = (rng() - 0.5) * 0.3 * z.h;

            r.x = Math.min(Math.max(z.x, r.x + dx), z.x + z.w - r.width);
            r.y = Math.min(Math.max(z.y, r.y + dy), z.y + z.h - r.height);
            candidate[i] = r;
        } else {
            // Resize
            const i = Math.floor(rng() * candidate.length);
            const r = candidate[i];
            const factor = 1 + (rng() - 0.5) * 0.2;
            const z = zones.find((z) => z.id === r.zone)!;

            const newW = Math.max(0.5, Math.min(r.width * factor, 0.9 * z.w));
            const newH = Math.max(0.5, Math.min(r.height * factor, 0.9 * z.h));

            r.width = newW;
            r.height = newH;
            r.x = Math.min(Math.max(z.x, r.x), z.x + z.w - r.width);
            r.y = Math.min(Math.max(z.y, r.y), z.y + z.h - r.height);
            candidate[i] = r;
        }

        const evalRes = computeLayoutScore(candidate, rules);
        if (!evalRes.hardViolation && evalRes.score > bestNumeric) {
            best = candidate.map((r) => ({ ...r }));
            bestNumeric = evalRes.score;
        }
    }

    const finalReport = computeLayoutScore(best, rules);
    return { rooms: best, score: finalReport };
}

function candidatePenalty(plot: PlotSettings, rooms: LayoutRoom[]) {
    const plotArea = plot.width * plot.height;
    const usedArea = rooms.reduce((sum, room) => sum + getRoomArea(room), 0);
    return Math.max(0, plotArea - usedArea);
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function createLayoutRoom(req: RoomReq, rect: Rect, zones: Zone[]): LayoutRoom {
    const x = snapToGrid(rect.x);
    const y = snapToGrid(rect.y);
    const width = Math.max(1, snapToGrid(rect.width));
    const height = Math.max(1, snapToGrid(rect.height));
    const zone = pickZoneForPoint(zones, x + width / 2, y + height / 2);

    return {
        id: req.id,
        templateId: `dyn_${req.id}`,
        type: req.type,
        label: getRoomLabel(req.type),
        x,
        y,
        width,
        height,
        zone,
        score: 0,
        violation: null,
    };
}

function canUseApartmentArchetype(roomReqs: RoomReq[]) {
    const counts = roomReqs.reduce<Record<string, number>>((acc, req) => {
        acc[req.type] = (acc[req.type] || 0) + 1;
        return acc;
    }, {});

    return (
        (counts.master_bedroom || 0) >= 1 &&
        ((counts.bedroom || 0) + (counts.master_bedroom || 0)) >= 2 &&
        (counts.living_room || 0) >= 1 &&
        (counts.kitchen || 0) >= 1 &&
        (counts.dining || 0) >= 1
    );
}

function generateApartmentArchetypeLayout(plot: PlotSettings, roomReqs: RoomReq[]) {
    if (!canUseApartmentArchetype(roomReqs)) {
        return null;
    }

    const zones = computeZones(plot);
    const byType = new Map<RoomType, RoomReq[]>();
    roomReqs.forEach((req) => {
        const existing = byType.get(req.type) || [];
        byType.set(req.type, [...existing, req]);
    });

    const take = (type: RoomType) => {
        const list = byType.get(type) || [];
        return list.shift() || null;
    };

    const rooms: LayoutRoom[] = [];
    const w = plot.width;
    const h = plot.height;

    const topH = snapToGrid(clamp(h * 0.34, 5.5, 9.5));
    const entranceH = snapToGrid(clamp(h * 0.12, 1.8, 3));
    const serviceH = snapToGrid(clamp(h * 0.16, 2.2, 4));
    const usableMiddle = Math.max(4, h - topH - entranceH - serviceH);
    const passageH = byType.get('passage')?.length ? snapToGrid(clamp(h * 0.08, 1.2, 2)) : 0;
    const diningH = snapToGrid(Math.max(3.5, usableMiddle - passageH));

    const leftW = snapToGrid(clamp(w * 0.33, 3.8, w * 0.4));
    const centerW = snapToGrid(clamp(w * 0.31, 3.8, w * 0.36));
    const rightW = snapToGrid(Math.max(3.8, w - leftW - centerW));

    const balconyReqs = byType.get('balcony') || [];
    const balconyStrip = balconyReqs.length ? snapToGrid(clamp(w * 0.1, 1.2, 2)) : 0;
    const rightCoreW = balconyStrip > 0 ? Math.max(3, rightW - balconyStrip) : rightW;

    const xLeft = 0;
    const xCenter = leftW;
    const xRight = leftW + centerW;
    const xBalcony = xRight + rightCoreW;

    const yTop = 0;
    const yPassage = topH;
    const yDining = topH + passageH;
    const yService = topH + passageH + diningH;
    const yEntrance = h - entranceH;

    const masterReq = take('master_bedroom');
    if (masterReq) {
        rooms.push(createLayoutRoom(masterReq, { x: xLeft, y: yTop, width: leftW, height: topH }, zones));
    }

    const pujaReq = take('puja');
    const utilityReq = take('utility');
    const kitchenReq = take('kitchen');
    const pujaW = pujaReq ? snapToGrid(clamp(centerW * 0.28, 1.6, 2.8)) : 0;
    const utilityH = utilityReq ? snapToGrid(clamp(topH * 0.22, 1.2, 2)) : 0;

    if (pujaReq) {
        rooms.push(createLayoutRoom(pujaReq, { x: xCenter, y: yTop, width: pujaW, height: topH }, zones));
    }

    if (kitchenReq) {
        rooms.push(createLayoutRoom(kitchenReq, {
            x: xCenter + pujaW,
            y: yTop + utilityH,
            width: centerW - pujaW,
            height: topH - utilityH,
        }, zones));
    }

    if (utilityReq) {
        rooms.push(createLayoutRoom(utilityReq, {
            x: xCenter + pujaW,
            y: yTop,
            width: centerW - pujaW,
            height: utilityH,
        }, zones));
    }

    const rightBedrooms = [take('bedroom'), take('bedroom'), take('study')].filter(Boolean) as RoomReq[];
    const upperRightHeight = rightBedrooms.length >= 2 ? snapToGrid(clamp((h - serviceH) * 0.48, 4.2, 7)) : h - serviceH;

    if (rightBedrooms[0]) {
        rooms.push(createLayoutRoom(rightBedrooms[0], {
            x: xRight,
            y: yTop,
            width: rightCoreW,
            height: upperRightHeight,
        }, zones));
    }

    if (rightBedrooms[1]) {
        rooms.push(createLayoutRoom(rightBedrooms[1], {
            x: xRight,
            y: upperRightHeight,
            width: rightCoreW,
            height: h - serviceH - upperRightHeight,
        }, zones));
    }

    if (rightBedrooms[2]) {
        rooms.push(createLayoutRoom(rightBedrooms[2], {
            x: xLeft,
            y: topH,
            width: leftW,
            height: diningH,
        }, zones));
    }

    if (balconyReqs[0]) {
        rooms.push(createLayoutRoom(balconyReqs[0], {
            x: xBalcony,
            y: yTop,
            width: balconyStrip,
            height: upperRightHeight,
        }, zones));
    }

    if (balconyReqs[1]) {
        rooms.push(createLayoutRoom(balconyReqs[1], {
            x: xBalcony,
            y: upperRightHeight,
            width: balconyStrip,
            height: h - serviceH - upperRightHeight,
        }, zones));
    }

    const livingReq = take('living_room');
    if (livingReq) {
        rooms.push(createLayoutRoom(livingReq, {
            x: xLeft,
            y: topH,
            width: leftW,
            height: h - topH - entranceH,
        }, zones));
    }

    const entranceReq = take('entrance');
    if (entranceReq) {
        rooms.push(createLayoutRoom(entranceReq, {
            x: xLeft,
            y: yEntrance,
            width: leftW,
            height: entranceH,
        }, zones));
    }

    const passageReq = take('passage');
    if (passageReq) {
        rooms.push(createLayoutRoom(passageReq, {
            x: xCenter,
            y: yPassage,
            width: w - xCenter,
            height: passageH,
        }, zones));
    }

    const diningReq = take('dining');
    if (diningReq) {
        rooms.push(createLayoutRoom(diningReq, {
            x: xCenter,
            y: yDining,
            width: centerW,
            height: diningH,
        }, zones));
    }

    const toilets = [take('toilet'), take('toilet'), take('toilet')].filter(Boolean) as RoomReq[];
    const toiletAreaWidth = centerW + rightCoreW;
    if (toilets.length > 0) {
        const eachWidth = snapToGrid(toiletAreaWidth / toilets.length);
        toilets.forEach((toiletReq, index) => {
            const isLast = index === toilets.length - 1;
            const rectWidth = isLast ? (xCenter + toiletAreaWidth) - (xCenter + eachWidth * index) : eachWidth;
            rooms.push(createLayoutRoom(toiletReq, {
                x: xCenter + eachWidth * index,
                y: yService,
                width: rectWidth,
                height: serviceH,
            }, zones));
        });
    }

    ['master_bedroom', 'bedroom', 'study', 'kitchen', 'dining', 'puja', 'entrance', 'utility', 'living_room', 'passage'].forEach((type) => {
        let req = take(type as RoomType);
        while (req) {
            rooms.push(createLayoutRoom(req, {
                x: xCenter,
                y: yDining,
                width: centerW,
                height: diningH,
            }, zones));
            req = take(type as RoomType);
        }
    });

    return { rooms, zones };
}

function generateCandidateLayout(
    plot: PlotSettings,
    roomReqs: RoomReq[],
    _improveIterations: number,
    _seed: number
) {
    const normalizedReqs = ensureCirculationRooms(roomReqs, plot);
    const archetypeLayout = generateApartmentArchetypeLayout(plot, normalizedReqs);
    const { rooms: initialRooms, zones } = archetypeLayout || greedyPlaceRooms(plot, normalizedReqs, vastuRules);

    const finalRooms = initialRooms
        .map((room) => ({
            ...room,
            x: snapToGrid(room.x),
            y: snapToGrid(room.y),
            width: snapToGrid(room.width),
            height: snapToGrid(room.height),
        }))
        .map(generateFurnitureForRoom);

    return {
        rooms: finalRooms,
        zones,
        score: computeLayoutScore(finalRooms, vastuRules, plot),
        penalty: candidatePenalty(plot, finalRooms),
    };
}

/**
 * Main autolayout function
 */
export function generateLayout(
    plot: PlotSettings,
    roomReqs: RoomReq[],
    improveIterations = 120,
    seed = 1234
): { rooms: LayoutRoom[]; compliance: ComplianceReport; zones: Zone[]; walls: Wall[]; doors: Door[] } {
    const candidateCount = Math.min(8, Math.max(3, roomReqs.length + 1));
    let bestCandidate = generateCandidateLayout(plot, roomReqs, improveIterations, seed);

    for (let i = 1; i < candidateCount; i++) {
        const candidate = generateCandidateLayout(plot, roomReqs, improveIterations, seed + i * 97);
        const isBetter =
            candidate.score.score > bestCandidate.score.score ||
            (candidate.score.score === bestCandidate.score.score &&
                candidate.penalty < bestCandidate.penalty);

        if (isBetter) {
            bestCandidate = candidate;
        }
    }

    const finalRooms = bestCandidate.rooms;
    const zones = bestCandidate.zones;

    // Generate Walls and Doors to make it "Template Style"
    const walls = generateWallsFromRooms(finalRooms);
    const doors = generateDoorsForRooms(finalRooms, walls, plot);

    // Compute scores
    const roomScores = finalRooms.map((r) => {
        const vst = calculateRoomVastuScore(r.type, r.zone);
        r.score = vst.score;
        r.violation = vst.violation;
        return {
            id: r.id,
            type: r.type,
            zone: r.zone,
            score: vst.score,
            violation: vst.violation,
        };
    });

    const hardViolations = roomScores
        .filter((s) => s.violation === 'forbidden')
        .map((s) => ({ roomId: s.id, reason: 'Forbidden zone' }));

    const totalScore = Math.round(
        roomScores.reduce((a, b) => a + b.score, 0) / Math.max(1, roomScores.length)
    );

    const compliance: ComplianceReport = {
        totalScore,
        roomScores,
        hardViolations,
    };

    return { rooms: finalRooms, compliance, zones, walls, doors };
}

/**
 * Generate structural walls from room rectangles
 */
function generateWallsFromRooms(rooms: LayoutRoom[]): Wall[] {
    type RawEdge = {
        orientation: 'H' | 'V';
        line: number;
        start: number;
        end: number;
        roomId: string;
    };

    const rawEdges: RawEdge[] = [];

    rooms.forEach((r) => {
        const left = snapToGrid(r.x);
        const right = snapToGrid(r.x + r.width);
        const top = snapToGrid(r.y);
        const bottom = snapToGrid(r.y + r.height);

        rawEdges.push(
            { orientation: 'H', line: top, start: left, end: right, roomId: r.id },
            { orientation: 'H', line: bottom, start: left, end: right, roomId: r.id },
            { orientation: 'V', line: left, start: top, end: bottom, roomId: r.id },
            { orientation: 'V', line: right, start: top, end: bottom, roomId: r.id }
        );
    });

    const grouped = new Map<string, RawEdge[]>();
    rawEdges.forEach((edge) => {
        const key = `${edge.orientation}:${edge.line}`;
        grouped.set(key, [...(grouped.get(key) || []), edge]);
    });

    const walls: Wall[] = [];
    let idx = 0;

    grouped.forEach((edges, key) => {
        const breakpoints = Array.from(
            new Set(edges.flatMap((edge) => [edge.start, edge.end]).map((value) => snapToGrid(value, 0.5)))
        ).sort((a, b) => a - b);

        for (let i = 0; i < breakpoints.length - 1; i++) {
            const segStart = breakpoints[i];
            const segEnd = breakpoints[i + 1];
            if (segEnd - segStart < 0.05) continue;

            const coveringEdges = edges.filter((edge) => edge.start <= segStart + 0.01 && edge.end >= segEnd - 0.01);
            if (coveringEdges.length === 0) continue;

            const roomIds = Array.from(new Set(coveringEdges.map((edge) => edge.roomId)));
            const isExternal = roomIds.length === 1;
            const [orientation, rawLine] = key.split(':');
            const line = Number(rawLine);

            walls.push({
                id: `dyn-wall-${idx}`,
                start: orientation === 'H' ? { x: segStart, y: line } : { x: line, y: segStart },
                end: orientation === 'H' ? { x: segEnd, y: line } : { x: line, y: segEnd },
                thickness: isExternal ? 0.23 : 0.115,
                isExternal,
                adjacentRooms: roomIds,
            });
            idx += 1;
        }
    });

    return walls;
}

/**
 * Generate logical doors for the layout
 */
function getDoorWidth(length: number, preferred = 0.9) {
    return Math.max(0.75, Math.min(preferred, length - 0.1));
}

function getWallFacing(wall: Wall): FacingDirection | null {
    if (!wall.isExternal) return null;

    if (wall.start.y === wall.end.y) {
        return wall.start.y < wall.end.y || wall.start.x < wall.end.x
            ? (wall.start.y === 0 ? 'N' : 'S')
            : null;
    }

    if (wall.start.x === wall.end.x) {
        return wall.start.x === 0 ? 'W' : 'E';
    }

    return null;
}

function buildAdjacencyMap(walls: Wall[]) {
    const adjacency = new Map<string, Set<string>>();

    walls
        .filter((wall) => wall.adjacentRooms.length > 1)
        .forEach((wall) => {
            const [roomA, roomB] = wall.adjacentRooms;
            adjacency.set(roomA, new Set([...(adjacency.get(roomA) || []), roomB]));
            adjacency.set(roomB, new Set([...(adjacency.get(roomB) || []), roomA]));
        });

    return adjacency;
}

function getDoorPositionForConnection(roomA: LayoutRoom, roomB: LayoutRoom) {
    const types = [roomA.type, roomB.type];

    if (types.includes('entrance') && types.includes('passage')) return 0.35;
    if (types.includes('entrance') && types.includes('living_room')) return 0.4;
    if (types.includes('passage') && (types.includes('master_bedroom') || types.includes('bedroom'))) return 0.65;
    if (types.includes('passage') && types.includes('toilet')) return 0.3;
    if (types.includes('kitchen') && types.includes('dining')) return 0.55;

    return 0.5;
}

function generateDoorsForRooms(rooms: LayoutRoom[], walls: Wall[], plot: PlotSettings): Door[] {
    const doors: Door[] = [];
    const usedWallIds = new Set<string>();
    const roomsById = new Map(rooms.map((room) => [room.id, room]));
    const roomByType = (type: RoomType) => rooms.find((room) => room.type === type);
    const facing = getFacingDirection(plot.orientation);
    const entranceRoom = roomByType('entrance');
    const adjacency = buildAdjacencyMap(walls);

    const preferredConnections = new Map<string, RoomType[]>([
        ['entrance', ['passage', 'living_room', 'dining']],
        ['passage', ['living_room', 'dining', 'kitchen', 'master_bedroom', 'bedroom', 'study', 'puja', 'toilet', 'utility']],
        ['living_room', ['dining', 'passage', 'entrance', 'balcony']],
        ['dining', ['living_room', 'kitchen', 'passage', 'balcony']],
        ['kitchen', ['utility', 'dining', 'passage']],
        ['master_bedroom', ['passage', 'toilet', 'balcony']],
        ['bedroom', ['passage', 'toilet', 'balcony']],
        ['study', ['passage', 'living_room']],
        ['puja', ['living_room', 'passage', 'dining']],
        ['toilet', ['passage', 'master_bedroom', 'bedroom']],
        ['utility', ['kitchen', 'passage']],
        ['balcony', ['living_room', 'bedroom', 'master_bedroom', 'dining']],
    ]);

    const addDoorForWall = (
        wall: Wall,
        indexSeed: string,
        preferredWidth = 0.9,
        position = 0.5
    ) => {
        if (usedWallIds.has(wall.id)) return;

        const length = wallLength(wall);
        if (length < 0.9) return;

        doors.push({
            id: `dyn-door-${indexSeed}`,
            wallId: wall.id,
            position,
            width: getDoorWidth(length, preferredWidth),
            swingAngle: 90,
            swingDirection: length >= 1.4 ? 'left' : 'right',
        });
        usedWallIds.add(wall.id);
    };

    if (entranceRoom) {
        const entranceBoundaryWalls = walls
            .filter((wall) => wall.isExternal && wall.adjacentRooms[0] === entranceRoom.id)
            .filter((wall) => wallLength(wall) >= 0.9);

        const facingWall =
            entranceBoundaryWalls.find((wall) => getWallFacing(wall) === facing) ||
            entranceBoundaryWalls.sort((a, b) => wallLength(b) - wallLength(a))[0];

        if (facingWall) {
            addDoorForWall(facingWall, 'main', 1.05, 0.5);
        }
    }

    const connectionPairs = new Set<string>();
    const pairKey = (a: string, b: string) => [a, b].sort().join('::');

    rooms.forEach((room) => {
        const adjacentIds = Array.from(adjacency.get(room.id) || []);
        if (adjacentIds.length === 0) return;

        const preferredTypes = preferredConnections.get(room.type) || [];
        const targetRoomId = preferredTypes
            .map((type) => adjacentIds.find((adjacentId) => roomsById.get(adjacentId)?.type === type))
            .find(Boolean);

        if (!targetRoomId) return;

        connectionPairs.add(pairKey(room.id, targetRoomId));
    });

    const internalWalls = walls.filter((w) => w.adjacentRooms.length > 1);
    internalWalls.forEach((wall, idx) => {
        const [roomA, roomB] = wall.adjacentRooms;
        if (!connectionPairs.has(pairKey(roomA, roomB))) return;
        const roomAData = roomsById.get(roomA);
        const roomBData = roomsById.get(roomB);
        const position = roomAData && roomBData ? getDoorPositionForConnection(roomAData, roomBData) : 0.5;
        addDoorForWall(wall, `int-${idx}`, 0.9, position);
    });

    const needsEntrance = !doors.some((door) => {
        const wall = walls.find((w) => w.id === door.wallId);
        return wall?.isExternal;
    });

    if (needsEntrance) {
        const entranceWall = walls.find((wall) => wall.isExternal && getWallFacing(wall) === facing && wallLength(wall) >= 0.9)
            || walls.find((wall) => wall.isExternal && wallLength(wall) >= 0.9);

        if (entranceWall) {
            addDoorForWall(entranceWall, 'ext', 1.05, 0.5);
        }
    }

    return doors;
}
