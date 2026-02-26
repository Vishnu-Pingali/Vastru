// utils/autoLayout.ts
// Lightweight, client-side autolayout with Vedic Vastu awareness

import type { PlotSettings, Room, RoomType, Zone, ZoneId, VastuRules, ComplianceReport } from '../types';
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

type FreeRect = { zoneId: ZoneId; x: number; y: number; w: number; h: number };

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

/**
 * Compute layout score for optimization
 */
function computeLayoutScore(
    layoutRooms: LayoutRoom[],
    _rules: VastuRules
): { score: number; hardViolation: { roomId: string; reason: string } | null } {
    let softSum = 0;

    // Specific constraint: Puja room and Toilet should never be together (common wall or adjacent)
    const puja = layoutRooms.find((r) => r.type === 'puja');
    const toilets = layoutRooms.filter((r) => r.type === 'toilet');

    if (puja) {
        for (const toilet of toilets) {
            // Check if they are adjacent or sharing a wall (simplified for now: distance check)
            // If they are within 0.1m of each other, consider it a violation
            const dx = Math.max(0, Math.abs(puja.x - toilet.x) - (puja.width + toilet.width) / 2);
            const dy = Math.max(0, Math.abs(puja.y - toilet.y) - (puja.height + toilet.height) / 2);

            // Simplified adjacency check: if they are very close or touching
            if (dx < 0.1 && dy < 0.1) {
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

    const avg = softSum / Math.max(1, layoutRooms.length);
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
    const freeRects: FreeRect[] = zones.map((z) => ({
        zoneId: z.id,
        x: z.x,
        y: z.y,
        w: z.w,
        h: z.h,
    }));

    // Sort by priority and area
    const sorted = [...rooms].sort(
        (a, b) => (a.priority || 5) - (b.priority || 5) || b.targetArea - a.targetArea
    );

    const placed: LayoutRoom[] = [];

    for (const req of sorted) {
        const rr = rules.room_rules[req.type] || {};
        const tryZones = [
            ...(rr.preferred || []),
            ...(rr.allowed || []),
            ...zones
                .map((z) => z.id)
                .filter(
                    (id) => !(rr.preferred || []).includes(id) && !(rr.allowed || []).includes(id)
                ),
        ];

        // Compute desired dimensions (aspect ratio 1.4)
        const ratio = 1.4;
        const desiredW = Math.sqrt(req.targetArea * ratio);
        const desiredH = Math.sqrt(req.targetArea / ratio);

        let placedRect: LayoutRoom | null = null;

        // Try to place in preferred/allowed zones
        for (const zid of tryZones) {
            const frIndex = freeRects.findIndex(
                (fr) =>
                    fr.zoneId === zid && fr.w >= desiredW - 1e-6 && fr.h >= desiredH - 1e-6
            );

            if (frIndex >= 0) {
                const fr = freeRects[frIndex];
                const w = Math.min(desiredW, fr.w);
                const h = Math.min(desiredH, fr.h);
                const x = fr.x;
                const y = fr.y;

                placedRect = {
                    id: req.id,
                    templateId: `dyn_${req.id}`,
                    type: req.type,
                    label: getRoomLabel(req.type),
                    x,
                    y,
                    width: w,
                    height: h,
                    zone: zid,
                    score: 0,
                    violation: null,
                };

                // Guillotine split
                const right: FreeRect = { zoneId: zid, x: x + w, y: y, w: fr.w - w, h: h };
                const bottom: FreeRect = { zoneId: zid, x: x, y: y + h, w: fr.w, h: fr.h - h };

                freeRects.splice(frIndex, 1);
                if (right.w > 0.01 && right.h > 0.01) freeRects.push(right);
                if (bottom.w > 0.01 && bottom.h > 0.01) freeRects.push(bottom);
                break;
            }
        }

        // Fallback: try to fit in any available space with shrink
        if (!placedRect) {
            const fallbackIndex = freeRects.findIndex((fr) => fr.w * fr.h >= 0.5 * req.targetArea);
            if (fallbackIndex >= 0) {
                const fr = freeRects[fallbackIndex];
                const area = Math.min(fr.w * fr.h, req.targetArea);
                const w = Math.min(fr.w, Math.max(1, Math.sqrt(area * ratio)));
                const h = Math.min(fr.h, Math.max(1, Math.sqrt(area / ratio)));
                const x = fr.x;
                const y = fr.y;

                placedRect = {
                    id: req.id,
                    templateId: `dyn_${req.id}`,
                    type: req.type,
                    label: getRoomLabel(req.type),
                    x,
                    y,
                    width: w,
                    height: h,
                    zone: fr.zoneId,
                    score: 0,
                    violation: null,
                };

                freeRects.splice(fallbackIndex, 1);
            }
        }

        // Last resort: place in center zone
        if (!placedRect) {
            const cZone = zones.find((z) => z.id === 'C')!;
            const w = Math.min(Math.sqrt(req.targetArea * ratio), cZone.w - 0.1);
            const h = Math.min(Math.sqrt(req.targetArea / ratio), cZone.h - 0.1);
            const x = cZone.x + (cZone.w - w) / 2;
            const y = cZone.y + (cZone.h - h) / 2;

            placedRect = {
                id: req.id,
                templateId: `dyn_${req.id}`,
                type: req.type,
                label: getRoomLabel(req.type),
                x,
                y,
                width: w,
                height: h,
                zone: 'C',
                score: 0,
                violation: null,
            };
        }

        if (placedRect) placed.push(placedRect);
    }

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
    let bestScore = computeLayoutScore(best, rules);

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

/**
 * Main autolayout function
 */
export function generateLayout(
    plot: PlotSettings,
    roomReqs: RoomReq[],
    improveIterations = 120,
    seed = 1234
): { rooms: LayoutRoom[]; compliance: ComplianceReport; zones: Zone[]; walls: any[]; doors: any[] } {
    const { rooms: initialRooms, zones } = greedyPlaceRooms(plot, roomReqs, vastuRules);

    // Set zone field accurately
    initialRooms.forEach((r) => {
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        r.zone = pickZoneForPoint(zones, cx, cy);
    });

    // Improve layout
    const improved = localImprove(initialRooms, zones, vastuRules, improveIterations, seed);
    const finalRooms = improved.rooms;

    // Generate Walls and Doors to make it "Template Style"
    const walls = generateWallsFromRooms(finalRooms);
    const doors = generateDoorsForRooms(finalRooms, walls);

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
function generateWallsFromRooms(rooms: LayoutRoom[]): any[] {
    const segments: { x1: number, y1: number, x2: number, y2: number, isExt: boolean }[] = [];

    // Get bounding box of all rooms
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rooms.forEach(r => {
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
    });

    rooms.forEach(r => {
        const left = r.x;
        const right = r.x + r.width;
        const top = r.y;
        const bottom = r.y + r.height;

        const edges = [
            { x1: left, y1: top, x2: right, y2: top }, // Top
            { x1: right, y1: top, x2: right, y2: bottom }, // Right
            { x1: right, y1: bottom, x2: left, y2: bottom }, // Bottom
            { x1: left, y1: bottom, x2: left, y2: top } // Left
        ];

        edges.forEach(e => {
            // Determine if it's an external segment
            const isExt = (
                (Math.abs(e.y1 - minY) < 0.05 && Math.abs(e.y2 - minY) < 0.05) ||
                (Math.abs(e.x1 - maxX) < 0.05 && Math.abs(e.x2 - maxX) < 0.05) ||
                (Math.abs(e.y1 - maxY) < 0.05 && Math.abs(e.y2 - maxY) < 0.05) ||
                (Math.abs(e.x1 - minX) < 0.05 && Math.abs(e.x2 - minX) < 0.05)
            );

            segments.push({ ...e, isExt });
        });
    });

    // Merge collinear segments (simplified for MVP)
    const walls: any[] = [];
    segments.forEach((s, idx) => {
        walls.push({
            id: `dyn-wall-${idx}`,
            start: { x: s.x1, y: s.y1 },
            end: { x: s.x2, y: s.y2 },
            thickness: s.isExt ? 0.23 : 0.115,
            isExternal: s.isExt,
            adjacentRooms: []
        });
    });

    return walls;
}

/**
 * Generate logical doors for the layout
 */
function generateDoorsForRooms(rooms: LayoutRoom[], walls: any[]): any[] {
    const doors: any[] = [];

    // Every room should have at least one door to another space or outside
    rooms.forEach((room, idx) => {
        // Find a suitable wall
        const wallIdx = walls.findIndex(w => {
            // Check if wall is on the boundary of this room
            const dx = Math.min(
                Math.abs(w.start.x - room.x),
                Math.abs(w.end.x - (room.x + room.width))
            );
            const dy = Math.min(
                Math.abs(w.start.y - room.y),
                Math.abs(w.end.y - (room.y + room.height))
            );
            return dx < 0.1 || dy < 0.1;
        });

        if (wallIdx >= 0) {
            doors.push({
                id: `dyn-door-${idx}`,
                wallId: walls[wallIdx].id,
                position: 0.5,
                width: room.type === 'living_room' ? 1.2 : 0.9,
                swingAngle: 90,
                swingDirection: 'left'
            });
        }
    });

    return doors;
}
