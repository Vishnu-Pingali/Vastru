// geometry/wallGraph.ts
// Wall topology and connectivity management

import type { Wall, Point, RuntimeWall } from '../types';

/**
 * Calculate distance from point to line segment
 */
export function pointToLineDistance(
    point: Point,
    lineStart: Point,
    lineEnd: Point
): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if two walls are connected
 */
export function areWallsConnected(wall1: Wall, wall2: Wall): boolean {
    const threshold = 0.01; // 1cm tolerance

    const dist1 = Math.hypot(
        wall1.start.x - wall2.start.x,
        wall1.start.y - wall2.start.y
    );
    const dist2 = Math.hypot(
        wall1.start.x - wall2.end.x,
        wall1.start.y - wall2.end.y
    );
    const dist3 = Math.hypot(
        wall1.end.x - wall2.start.x,
        wall1.end.y - wall2.start.y
    );
    const dist4 = Math.hypot(
        wall1.end.x - wall2.end.x,
        wall1.end.y - wall2.end.y
    );

    return (
        dist1 < threshold ||
        dist2 < threshold ||
        dist3 < threshold ||
        dist4 < threshold
    );
}

/**
 * Get all walls connected to a given wall
 */
export function getConnectedWalls(targetWall: Wall, allWalls: Wall[]): Wall[] {
    return allWalls.filter(
        (w) => w.id !== targetWall.id && areWallsConnected(targetWall, w)
    );
}

/**
 * Validate wall topology (no gaps, no overlaps)
 */
export function validateTopology(walls: Wall[]): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Check for disconnected walls
    const externalWalls = walls.filter((w) => w.isExternal);
    if (externalWalls.length > 0) {
        for (const wall of externalWalls) {
            const connected = getConnectedWalls(wall, externalWalls);
            if (connected.length < 2) {
                errors.push(`External wall ${wall.id} is not properly connected`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Calculate wall length
 */
export function getWallLength(wall: Wall): number {
    return Math.hypot(
        wall.end.x - wall.start.x,
        wall.end.y - wall.start.y
    );
}

/**
 * Get wall midpoint
 */
export function getWallMidpoint(wall: Wall): Point {
    return {
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2,
    };
}

/**
 * Calculate wall angle in radians
 */
export function getWallAngle(wall: Wall): number {
    return Math.atan2(
        wall.end.y - wall.start.y,
        wall.end.x - wall.start.x
    );
}

/**
 * Check if wall is horizontal or vertical (within tolerance)
 */
export function isWallAxisAligned(wall: Wall): boolean {
    const angle = getWallAngle(wall);
    const threshold = Math.PI / 180 * 2; // 2 degrees

    const normalized = angle % (Math.PI / 2);
    return Math.abs(normalized) < threshold || Math.abs(normalized - Math.PI / 2) < threshold;
}

/**
 * Snap point to nearest position on wall
 */
export function snapToWall(point: Point, wall: Wall): Point {
    const A = point.x - wall.start.x;
    const B = point.y - wall.start.y;
    const C = wall.end.x - wall.start.x;
    const D = wall.end.y - wall.start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return { ...wall.start };

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    return {
        x: wall.start.x + param * C,
        y: wall.start.y + param * D,
    };
}

/**
 * Move a wall maintaining topology
 */
export function moveWall(
    wall: Wall,
    offset: Point,
    allWalls: Wall[]
): { success: boolean; updatedWalls: Wall[] } {
    const updatedWalls = allWalls.map((w) => ({ ...w }));
    const targetWall = updatedWalls.find((w) => w.id === wall.id);

    if (!targetWall) {
        return { success: false, updatedWalls: allWalls };
    }

    // Move the wall
    targetWall.start.x += offset.x;
    targetWall.start.y += offset.y;
    targetWall.end.x += offset.x;
    targetWall.end.y += offset.y;

    // Update connected walls to maintain topology
    const connected = getConnectedWalls(wall, allWalls);
    for (const connWall of connected) {
        const updatedConn = updatedWalls.find((w) => w.id === connWall.id);
        if (!updatedConn) continue;

        // Check which endpoint was connected and update it
        const threshold = 0.01;
        if (
            Math.hypot(
                connWall.start.x - wall.start.x,
                connWall.start.y - wall.start.y
            ) < threshold
        ) {
            updatedConn.start.x = targetWall.start.x;
            updatedConn.start.y = targetWall.start.y;
        } else if (
            Math.hypot(
                connWall.start.x - wall.end.x,
                connWall.start.y - wall.end.y
            ) < threshold
        ) {
            updatedConn.start.x = targetWall.end.x;
            updatedConn.start.y = targetWall.end.y;
        } else if (
            Math.hypot(
                connWall.end.x - wall.start.x,
                connWall.end.y - wall.start.y
            ) < threshold
        ) {
            updatedConn.end.x = targetWall.start.x;
            updatedConn.end.y = targetWall.start.y;
        } else if (
            Math.hypot(
                connWall.end.x - wall.end.x,
                connWall.end.y - wall.end.y
            ) < threshold
        ) {
            updatedConn.end.x = targetWall.end.x;
            updatedConn.end.y = targetWall.end.y;
        }
    }

    return { success: true, updatedWalls };
}
