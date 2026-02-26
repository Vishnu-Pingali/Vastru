// utils/vastuValidator.ts
// Vastu validation for template-driven layouts

import type { Room, PlanTemplate, ZoneId, RoomType } from '../types';
import { calculateRoomVastuScore, getRoomLabel } from './vastuUtils';

export interface VastuViolation {
    roomId: string;
    roomLabel: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    currentZone: ZoneId;
    recommendedZones: ZoneId[];
}

export interface VastuValidationReport {
    score: number;
    compliance: 'excellent' | 'good' | 'fair' | 'poor';
    violations: VastuViolation[];
    suggestions: string[];
}

/**
 * Comprehensive Vastu validation for a template-based layout
 */
export function validateLayout(
    rooms: Room[],
    template: PlanTemplate
): VastuValidationReport {
    const violations: VastuViolation[] = [];
    const suggestions: string[] = [];
    let totalScore = 0;

    for (const room of rooms) {
        const roomTemplate = template.rooms.find((rt) => rt.id === room.templateId);
        if (!roomTemplate) continue;

        const { score, violation } = calculateRoomVastuScore(room.type, room.zone);
        totalScore += score;

        // Critical violation (forbidden zone)
        if (violation === 'forbidden') {
            violations.push({
                roomId: room.id,
                roomLabel: room.label,
                severity: 'critical',
                message: `${room.label} is in a forbidden zone (${room.zone})`,
                currentZone: room.zone,
                recommendedZones: roomTemplate.zoneIntent,
            });
        }
        // Warning (not in preferred or allowed)
        else if (score < 60) {
            violations.push({
                roomId: room.id,
                roomLabel: room.label,
                severity: 'warning',
                message: `${room.label} placement could be improved (current: ${room.zone})`,
                currentZone: room.zone,
                recommendedZones: roomTemplate.zoneIntent,
            });
        }
    }

    const avgScore = rooms.length > 0 ? Math.round(totalScore / rooms.length) : 100;

    // Generate compliance level
    let compliance: 'excellent' | 'good' | 'fair' | 'poor';
    if (avgScore >= 85) compliance = 'excellent';
    else if (avgScore >= 70) compliance = 'good';
    else if (avgScore >= 50) compliance = 'fair';
    else compliance = 'poor';

    // Generate suggestions
    if (violations.length > 0) {
        const criticalCount = violations.filter((v) => v.severity === 'critical').length;
        if (criticalCount > 0) {
            suggestions.push(
                `You have ${criticalCount} critical Vastu violation(s). Consider using a different template or plot orientation.`
            );
        }

        const warningCount = violations.filter((v) => v.severity === 'warning').length;
        if (warningCount > 0) {
            suggestions.push(
                `${warningCount} room(s) could be better placed. Try adjusting plot orientation or selecting an alternate template.`
            );
        }
    } else {
        suggestions.push('Your layout has excellent Vastu compliance!');
    }

    return {
        score: avgScore,
        compliance,
        violations,
        suggestions,
    };
}

/**
 * Check specific Vastu principles
 */
export function checkVastuPrinciples(rooms: Room[]): string[] {
    const issues: string[] = [];

    // Kitchen must not be in NE
    const kitchen = rooms.find((r) => r.type === 'kitchen');
    if (kitchen && kitchen.zone === 'NE') {
        issues.push('⚠️ Kitchen in Northeast (Ishaan) is strictly forbidden');
    }

    // Puja room should be in NE
    const puja = rooms.find((r) => r.type === 'puja');
    if (puja && puja.zone !== 'NE' && puja.zone !== 'N' && puja.zone !== 'E') {
        issues.push('⚠️ Puja room should ideally be in Northeast, North, or East');
    }

    // Master bedroom should not be in NE
    const master = rooms.find((r) => r.type === 'master_bedroom');
    if (master && (master.zone === 'NE' || master.zone === 'N' || master.zone === 'E')) {
        issues.push('⚠️ Master bedroom in Northeast/North/East is not recommended');
    }

    // Staircase should not be in NE
    const stair = rooms.find((r) => r.type === 'staircase');
    if (stair && (stair.zone === 'NE' || stair.zone === 'N')) {
        issues.push('⚠️ Staircase in Northeast or North blocks positive energy');
    }

    // Toilet should not be in NE
    const toiletsInNE = rooms.filter(
        (r) => r.type === 'toilet' && (r.zone === 'NE' || r.zone === 'E')
    );
    if (toiletsInNE.length > 0) {
        issues.push('⚠️ Toilet in Northeast/East is highly unfavorable');
    }

    return issues;
}

/**
 * Suggest alternate templates based on validation
 */
export function suggestAlternateTemplates(
    currentTemplate: PlanTemplate,
    allTemplates: PlanTemplate[],
    validationReport: VastuValidationReport
): PlanTemplate[] {
    // If current layout is good, no need to suggest alternates
    if (validationReport.compliance === 'excellent' || validationReport.compliance === 'good') {
        return [];
    }

    // Suggest templates with same bedroom count but different facing
    const alternates = allTemplates.filter(
        (t) =>
            t.id !== currentTemplate.id &&
            t.bedrooms === currentTemplate.bedrooms &&
            t.facing !== currentTemplate.facing
    );

    return alternates;
}

/**
 * Get Vastu compliance color
 */
export function getComplianceColor(score: number): {
    fill: string;
    stroke: string;
    text: string;
} {
    if (score >= 85) {
        return {
            fill: '#F0FDF4',
            stroke: '#22C55E',
            text: 'text-green-600',
        };
    } else if (score >= 70) {
        return {
            fill: '#F0F9FF',
            stroke: '#3B82F6',
            text: 'text-blue-600',
        };
    } else if (score >= 50) {
        return {
            fill: '#FFFBEB',
            stroke: '#F59E0B',
            text: 'text-yellow-600',
        };
    } else {
        return {
            fill: '#FEF2F2',
            stroke: '#EF4444',
            text: 'text-red-600',
        };
    }
}
