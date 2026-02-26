// utils/adaptTemplate.ts
// Adaptive fitting of templates to plots (NOT scaling/distortion)

import type { PlanTemplate, PlotSettings, Room, Wall, ZoneId, Point, Rect } from '../types';
import { extractBuiltEnvelope, scaleEnvelope, getEnvelopeCenter } from '../geometry/envelope';
import { computeZones, pickZoneForPoint } from './zoneUtils';
import { calculateRoomVastuScore } from './vastuUtils';

/**
 * Adapt a template to fit a plot using uniform scaling and centering
 * This is the CORRECT way - no distortion, no breaking of aspect ratios
 */
export function adaptTemplateToPlot(
    template: PlanTemplate,
    plot: PlotSettings
): {
    rooms: Room[];
    walls: Wall[];
    scale: number;
    offset: Point;
} {
    // Step 1: Calculate uniform scale factor
    const { scale, scaledSize } = scaleEnvelope(
        template.baseEnvelope,
        { width: plot.width * 0.9, height: plot.height * 0.9 } // Leave 5% margin
    );

    // Step 2: Calculate centering offset
    const offset: Point = {
        x: (plot.width - scaledSize.width) / 2,
        y: (plot.height - scaledSize.height) / 2,
    };

    // Step 3: Transform walls
    const transformedWalls: Wall[] = template.walls.map((wall) => ({
        ...wall,
        start: {
            x: wall.start.x * scale + offset.x,
            y: wall.start.y * scale + offset.y,
        },
        end: {
            x: wall.end.x * scale + offset.x,
            y: wall.end.y * scale + offset.y,
        },
        thickness: wall.thickness * scale,
    }));

    // Step 4: Calculate zones based on BUILT ENVELOPE (not plot)
    const builtEnvelope = extractBuiltEnvelope(transformedWalls);
    const zones = computeZones({
        width: builtEnvelope.width,
        height: builtEnvelope.height,
        orientation: plot.orientation,
    });

    // Offset zones to built envelope position
    const offsetZones = zones.map((z) => ({
        ...z,
        x: z.x + builtEnvelope.x,
        y: z.y + builtEnvelope.y,
    }));

    // Step 5: Create room instances with Vastu validation
    const rooms: Room[] = template.rooms.map((roomTemplate) => {
        const transformedRect: Rect = {
            x: roomTemplate.rect.x * scale + offset.x,
            y: roomTemplate.rect.y * scale + offset.y,
            width: roomTemplate.rect.width * scale,
            height: roomTemplate.rect.height * scale,
        };

        const cx = transformedRect.x + transformedRect.width / 2;
        const cy = transformedRect.y + transformedRect.height / 2;
        const zone = pickZoneForPoint(offsetZones, cx, cy);

        const { score, violation } = calculateRoomVastuScore(roomTemplate.type, zone);

        return {
            id: roomTemplate.id,
            templateId: roomTemplate.id,
            type: roomTemplate.type,
            label: roomTemplate.label,
            x: transformedRect.x,
            y: transformedRect.y,
            width: transformedRect.width,
            height: transformedRect.height,
            zone,
            score,
            violation,
        };
    });

    return {
        rooms,
        walls: transformedWalls,
        scale,
        offset,
    };
}

/**
 * Pull rooms toward their intended Vastu zones
 * This provides gentle nudging without breaking walls
 */
export function nudgeRoomsToIntent(
    rooms: Room[],
    template: PlanTemplate,
    zones: { id: ZoneId; x: number; y: number; w: number; h: number }[],
    maxNudge: number = 0.5
): Room[] {
    return rooms.map((room) => {
        const roomTemplate = template.rooms.find((rt) => rt.id === room.templateId);
        if (!roomTemplate || !roomTemplate.zoneIntent || roomTemplate.zoneIntent.length === 0) {
            return room;
        }

        // Find the closest intended zone
        const targetZones = zones.filter((z) => roomTemplate.zoneIntent.includes(z.id));
        if (targetZones.length === 0) return room;

        const roomCenter = {
            x: room.x + room.width / 2,
            y: room.y + room.height / 2,
        };

        // Find closest target zone center
        let closestZone = targetZones[0];
        let minDist = Infinity;

        for (const zone of targetZones) {
            const zoneCenterX = zone.x + zone.w / 2;
            const zoneCenterY = zone.y + zone.h / 2;
            const dist = Math.hypot(roomCenter.x - zoneCenterX, roomCenter.y - zoneCenterY);

            if (dist < minDist) {
                minDist = dist;
                closestZone = zone;
            }
        }

        // Calculate nudge vector
        const targetX = closestZone.x + closestZone.w / 2;
        const targetY = closestZone.y + closestZone.h / 2;

        let nudgeX = (targetX - roomCenter.x) * 0.3;
        let nudgeY = (targetY - roomCenter.y) * 0.3;

        // Clamp nudge amount
        nudgeX = Math.max(-maxNudge, Math.min(maxNudge, nudgeX));
        nudgeY = Math.max(-maxNudge, Math.min(maxNudge, nudgeY));

        return {
            ...room,
            x: room.x + nudgeX,
            y: room.y + nudgeY,
        };
    });
}

/**
 * Validate template fit
 */
export function validateTemplateFit(
    template: PlanTemplate,
    plot: PlotSettings
): { fits: boolean; reason?: string } {
    const targetSize = { width: plot.width * 0.9, height: plot.height * 0.9 };
    const { scale } = scaleEnvelope(template.baseEnvelope, targetSize);

    if (scale < 0.5) {
        return {
            fits: false,
            reason: 'Template is too large for this plot (would be scaled down too much)',
        };
    }

    if (scale > 2.0) {
        return {
            fits: false,
            reason: 'Template is too small for this plot (would be scaled up too much)',
        };
    }

    return { fits: true };
}

/**
 * Resize a room within its allowed bounds
 */
export function resizeRoom(
    room: Room,
    template: PlanTemplate,
    newWidth: number,
    newHeight: number
): { room: Room; valid: boolean; reason?: string } {
    const roomTemplate = template.rooms.find((rt) => rt.id === room.templateId);

    if (!roomTemplate) {
        return { room, valid: false, reason: 'Room template not found' };
    }

    // Check bounds
    if (newWidth < roomTemplate.minSize.width) {
        return {
            room,
            valid: false,
            reason: `Width too small (min: ${roomTemplate.minSize.width}m)`,
        };
    }

    if (newWidth > roomTemplate.maxSize.width) {
        return {
            room,
            valid: false,
            reason: `Width too large (max: ${roomTemplate.maxSize.width}m)`,
        };
    }

    if (newHeight < roomTemplate.minSize.height) {
        return {
            room,
            valid: false,
            reason: `Height too small (min: ${roomTemplate.minSize.height}m)`,
        };
    }

    if (newHeight > roomTemplate.maxSize.height) {
        return {
            room,
            valid: false,
            reason: `Height too large (max: ${roomTemplate.maxSize.height}m)`,
        };
    }

    // Apply resize based on anchor point
    let newX = room.x;
    let newY = room.y;

    switch (roomTemplate.anchor) {
        case 'nw':
            // Top-left stays fixed
            break;
        case 'ne':
            // Top-right stays fixed
            newX = room.x + room.width - newWidth;
            break;
        case 'sw':
            // Bottom-left stays fixed
            newY = room.y + room.height - newHeight;
            break;
        case 'se':
            // Bottom-right stays fixed
            newX = room.x + room.width - newWidth;
            newY = room.y + room.height - newHeight;
            break;
        case 'center':
            // Center stays fixed
            newX = room.x + (room.width - newWidth) / 2;
            newY = room.y + (room.height - newHeight) / 2;
            break;
    }

    return {
        room: {
            ...room,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
        },
        valid: true,
    };
}
