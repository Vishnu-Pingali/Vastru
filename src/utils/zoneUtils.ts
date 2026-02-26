// utils/zoneUtils.ts
// Zone calculation and mapping utilities

import type { Zone, ZoneId, PlotSettings } from '../types';

/**
 * Compute 3x3 Vastu grid zones for a plot
 * Returns zones in unrotated plot coordinates (origin at top-left)
 */
export function computeZones(plot: PlotSettings): Zone[] {
    const { width: W, height: H } = plot;
    const w = W / 3;
    const h = H / 3;

    const zones: Zone[] = [
        { id: 'NW', x: 0, y: 0, w, h },
        { id: 'N', x: w, y: 0, w, h },
        { id: 'NE', x: 2 * w, y: 0, w, h },
        { id: 'W', x: 0, y: h, w, h },
        { id: 'C', x: w, y: h, w, h },
        { id: 'E', x: 2 * w, y: h, w, h },
        { id: 'SW', x: 0, y: 2 * h, w, h },
        { id: 'S', x: w, y: 2 * h, w, h },
        { id: 'SE', x: 2 * w, y: 2 * h, w, h },
    ];

    return zones;
}

/**
 * Determine which zone a point (x, y) falls into
 * Uses center point of room for zone determination
 */
export function pickZoneForPoint(zones: Zone[], x: number, y: number): ZoneId {
    const zone = zones.find(
        (z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h
    );
    return zone ? zone.id : 'C';
}

/**
 * Get zone label for display
 */
export function getZoneLabel(zoneId: ZoneId): string {
    const labels: Record<ZoneId, string> = {
        NE: 'North-East',
        N: 'North',
        NW: 'North-West',
        E: 'East',
        C: 'Center',
        W: 'West',
        SE: 'South-East',
        S: 'South',
        SW: 'South-West',
    };
    return labels[zoneId];
}

/**
 * Get zone color based on Vastu significance
 */
export function getZoneColor(zoneId: ZoneId): string {
    const colors: Record<ZoneId, string> = {
        NE: '#ECFDF5', // Most auspicious - light green
        N: '#EFF6FF', // Auspicious - light blue
        E: '#FEF3C7', // Auspicious - light yellow
        NW: '#F3F4F6', // Neutral - gray
        C: '#FFFBEB', // Neutral - light amber
        W: '#F3F4F6', // Neutral - gray
        SE: '#FEE2E2', // Caution - light red
        S: '#F3F4F6', // Neutral - gray
        SW: '#FDF4FF', // Important - light purple
    };
    return colors[zoneId];
}

/**
 * Calculate the direction angle from center to a zone
 * Used for compass visualization
 */
export function getZoneDirection(zoneId: ZoneId): number {
    const directions: Record<ZoneId, number> = {
        N: 0,
        NE: 45,
        E: 90,
        SE: 135,
        S: 180,
        SW: 225,
        W: 270,
        NW: 315,
        C: 0,
    };
    return directions[zoneId];
}
