// geometry/envelope.ts
// Extract built footprint from external walls

import type { Wall, Rect, Point, Size } from '../types';

/**
 * Extract built envelope (bounding box) from external walls
 * This is critical: Vastu grid applies to the BUILT AREA, not the plot
 */
export function extractBuiltEnvelope(walls: Wall[]): Rect {
    const externalWalls = walls.filter((w) => w.isExternal);

    if (externalWalls.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const wall of externalWalls) {
        minX = Math.min(minX, wall.start.x, wall.end.x);
        minY = Math.min(minY, wall.start.y, wall.end.y);
        maxX = Math.max(maxX, wall.start.x, wall.end.x);
        maxY = Math.max(maxY, wall.start.y, wall.end.y);
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

/**
 * Get envelope center point
 */
export function getEnvelopeCenter(envelope: Rect): Point {
    return {
        x: envelope.x + envelope.width / 2,
        y: envelope.y + envelope.height / 2,
    };
}

/**
 * Calculate envelope area
 */
export function getEnvelopeArea(envelope: Rect): number {
    return envelope.width * envelope.height;
}

/**
 * Check if point is inside envelope
 */
export function isPointInEnvelope(point: Point, envelope: Rect): boolean {
    return (
        point.x >= envelope.x &&
        point.x <= envelope.x + envelope.width &&
        point.y >= envelope.y &&
        point.y <= envelope.y + envelope.height
    );
}

/**
 * Clamp rectangle to fit within envelope
 */
export function clampToEnvelope(rect: Rect, envelope: Rect): Rect {
    const result = { ...rect };

    // Clamp position
    result.x = Math.max(envelope.x, Math.min(envelope.x + envelope.width - rect.width, rect.x));
    result.y = Math.max(envelope.y, Math.min(envelope.y + envelope.height - rect.height, rect.y));

    // Clamp size if necessary
    if (result.width > envelope.width) {
        result.width = envelope.width;
        result.x = envelope.x;
    }

    if (result.height > envelope.height) {
        result.height = envelope.height;
        result.y = envelope.y;
    }

    return result;
}

/**
 * Scale envelope uniformly (maintaining aspect ratio)
 */
export function scaleEnvelope(
    baseSize: Size,
    targetSize: Size
): { scale: number; scaledSize: Size } {
    const scaleX = targetSize.width / baseSize.width;
    const scaleY = targetSize.height / baseSize.height;

    // Use uniform scaling (smaller dimension to maintain aspect ratio)
    const scale = Math.min(scaleX, scaleY);

    return {
        scale,
        scaledSize: {
            width: baseSize.width * scale,
            height: baseSize.height * scale,
        },
    };
}

/**
 * Calculate setback margins
 * Returns the available built envelope considering plot setbacks
 */
export function calculateBuildableEnvelope(
    plotSize: Size,
    setbacks: { front: number; rear: number; left: number; right: number }
): Rect {
    return {
        x: setbacks.left,
        y: setbacks.front,
        width: plotSize.width - setbacks.left - setbacks.right,
        height: plotSize.height - setbacks.front - setbacks.rear,
    };
}

/**
 * Check if envelope fits within buildable area
 */
export function fitsWithinBuildable(
    envelope: Size,
    buildable: Rect
): boolean {
    return envelope.width <= buildable.width && envelope.height <= buildable.height;
}
