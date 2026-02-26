// utils/vastuUtils.ts
// Vastu validation and scoring logic

import type { Room, RoomType, ZoneId, VastuRules, ComplianceReport, VastuMode } from '../types';
import vastuRulesData from '../vastu_rules.json';

const vastuRules = vastuRulesData as VastuRules;

/**
 * Calculate Vastu score for a single room in a specific zone
 * Returns score (0-100) and violation status
 */
export function calculateRoomVastuScore(
    roomType: RoomType,
    zoneId: ZoneId
): { score: number; violation: string | null } {
    const rules = vastuRules.room_rules[roomType];

    if (!rules) {
        return { score: 50, violation: null };
    }

    // Check forbidden zones (hard violation)
    if (rules.forbidden?.includes(zoneId)) {
        return { score: 0, violation: 'forbidden' };
    }

    // Check preferred zones (high score)
    if (rules.preferred?.includes(zoneId)) {
        return { score: 100, violation: null };
    }

    // Check allowed zones (medium score)
    if (rules.allowed?.includes(zoneId)) {
        return { score: 60, violation: null };
    }

    // Neutral zone (low score but not forbidden)
    return { score: 30, violation: null };
}

/**
 * Validate a room placement against Vastu rules
 */
export function validateRoom(
    room: Room,
    vastuMode: VastuMode
): { isValid: boolean; message: string; score: number } {
    if (vastuMode === 'off') {
        return { isValid: true, message: 'Vastu validation disabled', score: 100 };
    }

    const { score, violation } = calculateRoomVastuScore(room.type, room.zone);

    if (violation === 'forbidden') {
        if (vastuMode === 'strict') {
            return {
                isValid: false,
                message: `${getRoomLabel(room.type)} cannot be placed in ${room.zone} zone (forbidden)`,
                score: 0,
            };
        } else {
            return {
                isValid: true,
                message: `Warning: ${getRoomLabel(room.type)} in ${room.zone} zone is not recommended`,
                score,
            };
        }
    }

    return {
        isValid: true,
        message: score >= 60 ? 'Good placement' : 'Acceptable placement',
        score,
    };
}

/**
 * Calculate overall compliance report for all rooms
 */
export function calculateComplianceReport(rooms: Room[]): ComplianceReport {
    const roomScores = rooms.map((room) => {
        const { score, violation } = calculateRoomVastuScore(room.type, room.zone);
        return {
            id: room.id,
            type: room.type,
            zone: room.zone,
            score,
            violation,
        };
    });

    const hardViolations = roomScores
        .filter((rs) => rs.violation === 'forbidden')
        .map((rs) => ({
            roomId: rs.id,
            reason: `${getRoomLabel(rs.type)} is forbidden in ${rs.zone} zone`,
        }));

    // Calculate total score (average of all room scores)
    const totalScore =
        rooms.length > 0
            ? Math.round(roomScores.reduce((sum, rs) => sum + rs.score, 0) / rooms.length)
            : 100;

    return {
        totalScore,
        roomScores,
        hardViolations,
    };
}

/**
 * Get human-readable room label
 */
export function getRoomLabel(roomType: RoomType): string {
    const labels: Record<RoomType, string> = {
        living_room: 'Living Room',
        kitchen: 'Kitchen',
        master_bedroom: 'Master Bedroom',
        bedroom: 'Bedroom',
        toilet: 'Toilet',
        puja: 'Puja Room',
        staircase: 'Staircase',
        dining: 'Dining Room',
        study: 'Study Room',
        entrance: 'Entrance',
        utility: 'Utility',
        balcony: 'Balcony',
        passage: 'Passage'
    };
    return labels[roomType];
}

/**
 * Get room icon emoji
 */
export function getRoomIcon(roomType: RoomType): string {
    const icons: Record<RoomType, string> = {
        living_room: '🛋️',
        kitchen: '🍳',
        master_bedroom: '🛏️',
        bedroom: '🛌',
        toilet: '🚽',
        puja: '🕉️',
        staircase: '🪜',
        dining: '🍽️',
        study: '📚',
        entrance: '🚪',
        utility: '🧺',
        balcony: '🌿',
        passage: '🚶'
    };
    return icons[roomType];
}

/**
 * Get room color based on compliance score
 */
export function getRoomColor(score: number): { fill: string; stroke: string } {
    if (score >= 80) {
        return { fill: '#ECFDF5', stroke: '#10B981' }; // Green
    } else if (score >= 60) {
        return { fill: '#FFFBEB', stroke: '#F59E0B' }; // Yellow
    } else if (score >= 30) {
        return { fill: '#FEF3C7', stroke: '#F97316' }; // Orange
    } else {
        return { fill: '#FEF2F2', stroke: '#EF4444' }; // Red
    }
}

/**
 * Get compliance status text and color
 */
export function getComplianceStatus(score: number): { text: string; color: string } {
    if (score >= 85) {
        return { text: 'Excellent', color: 'text-green-600' };
    } else if (score >= 70) {
        return { text: 'Good', color: 'text-blue-600' };
    } else if (score >= 50) {
        return { text: 'Fair', color: 'text-yellow-600' };
    } else {
        return { text: 'Poor', color: 'text-red-600' };
    }
}

/**
 * Get Vastu rules for export/display
 */
export function getVastuRules(): VastuRules {
    return vastuRules;
}
