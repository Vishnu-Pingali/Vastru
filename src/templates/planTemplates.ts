// templates/planTemplates.ts
// Professional civil plan templates with proper wall topology

import type { PlanTemplate, Wall, RoomTemplate, Door } from '../types';

// ==================== HELPER FUNCTIONS ====================

function createWall(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    isExternal: boolean
): Wall {
    return {
        id,
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness,
        isExternal,
        adjacentRooms: [],
    };
}

// ==================== TEMPLATES ====================

/**
 * Template: 2BHK East Facing (Compact)
 * Total: ~100 sqm (10m x 10m)
 * Proper civil plan with shared walls
 */
export const template_2BHK_East: PlanTemplate = {
    id: '2bhk-east',
    name: '2BHK East Facing - Compact',
    facing: 'E',
    baseEnvelope: { width: 10, height: 10 },
    description: 'Compact 2 bedroom plan with Vastu-compliant east entrance',
    floors: 1,
    bedrooms: 2,
    walls: [
        // External walls (230mm thick)
        createWall('w-ext-n', 0, 0, 10, 0, 0.23, true), // North
        createWall('w-ext-e', 10, 0, 10, 10, 0.23, true), // East
        createWall('w-ext-s', 10, 10, 0, 10, 0.23, true), // South
        createWall('w-ext-w', 0, 10, 0, 0, 0.23, true), // West

        // Internal walls (115mm thick)
        // Horizontal dividers
        createWall('w-h1', 0, 3.5, 10, 3.5, 0.115, false), // Bedroom row
        createWall('w-h2', 0, 7, 10, 7, 0.115, false), // Living/Dining row

        // Vertical dividers
        createWall('w-v1', 5, 0, 5, 3.5, 0.115, false), // Bedroom divider
        createWall('w-v2', 7.5, 3.5, 7.5, 7, 0.115, false), // Kitchen divider
        createWall('w-v3', 2.5, 7, 2.5, 10, 0.115, false), // Stair divider
    ],
    rooms: [
        {
            id: 'r-master',
            label: 'MASTER\nBEDROOM',
            type: 'master_bedroom',
            rect: { x: 5.115, y: 0.23, width: 4.885, height: 3.27 },
            zoneIntent: ['NE', 'N'],
            forbiddenZones: ['SW'],
            anchor: 'ne',
            minSize: { width: 3, height: 2.5 },
            maxSize: { width: 6, height: 4 },
            wallIds: ['w-ext-n', 'w-ext-e', 'w-v1', 'w-h1'],
        },
        {
            id: 'r-bed2',
            label: 'BEDROOM\n02',
            type: 'bedroom',
            rect: { x: 0.23, y: 0.23, width: 4.77, height: 3.27 },
            zoneIntent: ['N', 'NW'],
            forbiddenZones: ['SE'],
            anchor: 'nw',
            minSize: { width: 3, height: 2.5 },
            maxSize: { width: 5, height: 4 },
            wallIds: ['w-ext-n', 'w-ext-w', 'w-v1', 'w-h1'],
        },
        {
            id: 'r-bath1',
            label: 'BATH\n01',
            type: 'toilet',
            rect: { x: 7.615, y: 3.615, width: 2.385, height: 3.385 },
            zoneIntent: ['E', 'NW'],
            forbiddenZones: ['NE'],
            anchor: 'ne',
            minSize: { width: 1.5, height: 2 },
            maxSize: { width: 3, height: 4 },
            wallIds: ['w-ext-e', 'w-v2', 'w-h1', 'w-h2'],
        },
        {
            id: 'r-puja',
            label: 'PUJA',
            type: 'puja',
            rect: { x: 5.115, y: 3.615, width: 2.385, height: 3.385 },
            zoneIntent: ['NE', 'E'],
            forbiddenZones: ['SW', 'S'],
            anchor: 'center',
            minSize: { width: 1.5, height: 1.5 },
            maxSize: { width: 3, height: 3 },
            wallIds: ['w-v1', 'w-v2', 'w-h1', 'w-h2'],
        },
        {
            id: 'r-living',
            label: 'LIVING\nHALL',
            type: 'living_room',
            rect: { x: 0.23, y: 3.615, width: 4.885, height: 3.385 },
            zoneIntent: ['N', 'E', 'C'],
            forbiddenZones: ['SW'],
            anchor: 'center',
            minSize: { width: 3.5, height: 3 },
            maxSize: { width: 6, height: 5 },
            wallIds: ['w-ext-w', 'w-v1', 'w-h1', 'w-h2'],
        },
        {
            id: 'r-kitchen',
            label: 'KITCHEN',
            type: 'kitchen',
            rect: { x: 7.615, y: 7.115, width: 2.385, height: 2.885 },
            zoneIntent: ['SE'],
            forbiddenZones: ['NE', 'N', 'SW'],
            anchor: 'se',
            minSize: { width: 2, height: 2 },
            maxSize: { width: 4, height: 4 },
            wallIds: ['w-ext-e', 'w-ext-s', 'w-v2', 'w-h2'],
        },
        {
            id: 'r-dining',
            label: 'DINING',
            type: 'dining',
            rect: { x: 2.615, y: 7.115, width: 4.885, height: 2.885 },
            zoneIntent: ['S', 'C'],
            forbiddenZones: ['NE'],
            anchor: 'center',
            minSize: { width: 3, height: 2.5 },
            maxSize: { width: 6, height: 4 },
            wallIds: ['w-v2', 'w-v3', 'w-h2', 'w-ext-s'],
        },
        {
            id: 'r-stair',
            label: 'STAIR',
            type: 'staircase',
            rect: { x: 0.23, y: 7.115, width: 2.27, height: 2.885 },
            zoneIntent: ['SW', 'S'],
            forbiddenZones: ['NE', 'N'],
            anchor: 'sw',
            minSize: { width: 1.5, height: 2 },
            maxSize: { width: 3, height: 4 },
            wallIds: ['w-ext-w', 'w-ext-s', 'w-v3', 'w-h2'],
        },
    ],
    doors: [
        { id: 'd-main', wallId: 'w-ext-e', position: 0.5, width: 1.2, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-master', wallId: 'w-v1', position: 0.7, width: 0.9, swingAngle: 90, swingDirection: 'right' },
        { id: 'd-bed2', wallId: 'w-v1', position: 0.3, width: 0.9, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-bath1', wallId: 'w-v2', position: 0.5, width: 0.8, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-kitchen', wallId: 'w-v2', position: 0.8, width: 0.9, swingAngle: 90, swingDirection: 'right' },
    ],
};

/**
 * Template: 3BHK South Facing (Medium)
 * Total: ~140 sqm (14m x 10m)
 */
export const template_3BHK_South: PlanTemplate = {
    id: '3bhk-south',
    name: '3BHK South Facing - Medium',
    facing: 'S',
    baseEnvelope: { width: 14, height: 10 },
    description: 'Medium 3 bedroom plan with south entrance and proper circulation',
    floors: 1,
    bedrooms: 3,
    walls: [
        // External walls
        createWall('w-ext-n', 0, 0, 14, 0, 0.23, true),
        createWall('w-ext-e', 14, 0, 14, 10, 0.23, true),
        createWall('w-ext-s', 14, 10, 0, 10, 0.23, true),
        createWall('w-ext-w', 0, 10, 0, 0, 0.23, true),

        // Internal walls
        createWall('w-h1', 0, 3.2, 14, 3.2, 0.115, false),
        createWall('w-h2', 0, 6.8, 14, 6.8, 0.115, false),
        createWall('w-v1', 4.5, 0, 4.5, 3.2, 0.115, false),
        createWall('w-v2', 9.5, 0, 9.5, 3.2, 0.115, false),
        createWall('w-v3', 10.5, 3.2, 10.5, 6.8, 0.115, false),
        createWall('w-v4', 3, 6.8, 3, 10, 0.115, false),
    ],
    rooms: [
        {
            id: 'r-master',
            label: 'MASTER\nBEDROOM',
            type: 'master_bedroom',
            rect: { x: 9.615, y: 0.23, width: 4.385, height: 2.97 },
            zoneIntent: ['NE', 'N'],
            anchor: 'ne',
            minSize: { width: 3.5, height: 2.5 },
            maxSize: { width: 5.5, height: 4 },
            wallIds: ['w-ext-n', 'w-ext-e', 'w-v2', 'w-h1'],
        },
        {
            id: 'r-bed2',
            label: 'BEDROOM\n02',
            type: 'bedroom',
            rect: { x: 4.615, y: 0.23, width: 4.885, height: 2.97 },
            zoneIntent: ['N'],
            anchor: 'center',
            minSize: { width: 3, height: 2.5 },
            maxSize: { width: 5, height: 4 },
            wallIds: ['w-ext-n', 'w-v1', 'w-v2', 'w-h1'],
        },
        {
            id: 'r-bed3',
            label: 'BEDROOM\n03',
            type: 'bedroom',
            rect: { x: 0.23, y: 0.23, width: 4.27, height: 2.97 },
            zoneIntent: ['NW', 'N'],
            anchor: 'nw',
            minSize: { width: 3, height: 2.5 },
            maxSize: { width: 5, height: 4 },
            wallIds: ['w-ext-n', 'w-ext-w', 'w-v1', 'w-h1'],
        },
        {
            id: 'r-living',
            label: 'LIVING\nHALL',
            type: 'living_room',
            rect: { x: 0.23, y: 3.315, width: 10.27, height: 3.485 },
            zoneIntent: ['C', 'E'],
            anchor: 'center',
            minSize: { width: 4, height: 3 },
            maxSize: { width: 12, height: 5 },
            wallIds: ['w-ext-w', 'w-h1', 'w-v3', 'w-h2'],
        },
        {
            id: 'r-puja',
            label: 'PUJA',
            type: 'puja',
            rect: { x: 10.615, y: 3.315, width: 3.385, height: 3.485 },
            zoneIntent: ['NE', 'E'],
            forbiddenZones: ['SW'],
            anchor: 'ne',
            minSize: { width: 1.5, height: 1.5 },
            maxSize: { width: 3, height: 3 },
            wallIds: ['w-ext-e', 'w-h1', 'w-v3', 'w-h2'],
        },
        {
            id: 'r-dining',
            label: 'DINING',
            type: 'dining',
            rect: { x: 3.115, y: 6.915, width: 7.385, height: 3.085 },
            zoneIntent: ['S', 'C'],
            anchor: 'center',
            minSize: { width: 3, height: 2.5 },
            maxSize: { width: 8, height: 4 },
            wallIds: ['w-v4', 'w-v3', 'w-h2', 'w-ext-s'],
        },
        {
            id: 'r-kitchen',
            label: 'KITCHEN',
            type: 'kitchen',
            rect: { x: 10.615, y: 6.915, width: 3.385, height: 3.085 },
            zoneIntent: ['SE'],
            forbiddenZones: ['NE', 'N'],
            anchor: 'se',
            minSize: { width: 2.5, height: 2.5 },
            maxSize: { width: 4, height: 4 },
            wallIds: ['w-ext-e', 'w-ext-s', 'w-v3', 'w-h2'],
        },
        {
            id: 'r-stair',
            label: 'STAIR',
            type: 'staircase',
            rect: { x: 0.23, y: 6.915, width: 2.77, height: 3.085 },
            zoneIntent: ['SW', 'S'],
            forbiddenZones: ['NE'],
            anchor: 'sw',
            minSize: { width: 2, height: 2.5 },
            maxSize: { width: 3, height: 4 },
            wallIds: ['w-ext-w', 'w-ext-s', 'w-v4', 'w-h2'],
        },
    ],
    doors: [
        { id: 'd-main', wallId: 'w-ext-s', position: 0.5, width: 1.2, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-master', wallId: 'w-v2', position: 0.5, width: 0.9, swingAngle: 90, swingDirection: 'right' },
        { id: 'd-bed2', wallId: 'w-v1', position: 0.6, width: 0.9, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-bed3', wallId: 'w-v1', position: 0.4, width: 0.9, swingAngle: 90, swingDirection: 'right' },
        { id: 'd-kitchen', wallId: 'w-v3', position: 0.8, width: 0.9, swingAngle: 90, swingDirection: 'left' },
    ],
};

/**
 * Template: 4BHK West Facing (Large)
 * Total: ~200 sqm (16m x 12.5m)
 */
export const template_4BHK_West: PlanTemplate = {
    id: '4bhk-west',
    name: '4BHK West Facing - Spacious',
    facing: 'W',
    baseEnvelope: { width: 16, height: 12.5 },
    description: 'Spacious 4 bedroom plan with study and large living areas',
    floors: 1,
    bedrooms: 4,
    walls: [
        // External walls
        createWall('w-ext-n', 0, 0, 16, 0, 0.23, true),
        createWall('w-ext-e', 16, 0, 16, 12.5, 0.23, true),
        createWall('w-ext-s', 16, 12.5, 0, 12.5, 0.23, true),
        createWall('w-ext-w', 0, 12.5, 0, 0, 0.23, true),

        // Internal walls
        createWall('w-h1', 0, 3.5, 16, 3.5, 0.115, false),
        createWall('w-h2', 0, 7.5, 16, 7.5, 0.115, false),
        createWall('w-h3', 0, 10, 16, 10, 0.115, false),
        createWall('w-v1', 5, 0, 5, 3.5, 0.115, false),
        createWall('w-v2', 11, 0, 11, 3.5, 0.115, false),
        createWall('w-v3', 12.5, 3.5, 12.5, 7.5, 0.115, false),
        createWall('w-v4', 8, 7.5, 8, 10, 0.115, false),
        createWall('w-v5', 3, 10, 3, 12.5, 0.115, false),
    ],
    rooms: [
        {
            id: 'r-master',
            label: 'MASTER\nBEDROOM',
            type: 'master_bedroom',
            rect: { x: 11.115, y: 0.23, width: 4.885, height: 3.27 },
            zoneIntent: ['NE', 'N'],
            anchor: 'ne',
            minSize: { width: 4, height: 3 },
            maxSize: { width: 6, height: 4.5 },
            wallIds: ['w-ext-n', 'w-ext-e', 'w-v2', 'w-h1'],
        },
        {
            id: 'r-bed2',
            label: 'BEDROOM\n02',
            type: 'bedroom',
            rect: { x: 5.115, y: 0.23, width: 5.885, height: 3.27 },
            zoneIntent: ['N'],
            anchor: 'center',
            minSize: { width: 3.5, height: 2.5 },
            maxSize: { width: 6, height: 4 },
            wallIds: ['w-ext-n', 'w-v1', 'w-v2', 'w-h1'],
        },
        {
            id: 'r-bed3',
            label: 'BEDROOM\n03',
            type: 'bedroom',
            rect: { x: 0.23, y: 0.23, width: 4.77, height: 3.27 },
            zoneIntent: ['NW', 'N'],
            anchor: 'nw',
            minSize: { width: 3.5, height: 2.5 },
            maxSize: { width: 5.5, height: 4 },
            wallIds: ['w-ext-n', 'w-ext-w', 'w-v1', 'w-h1'],
        },
        {
            id: 'r-living',
            label: 'LIVING\nHALL',
            type: 'living_room',
            rect: { x: 0.23, y: 3.615, width: 12.27, height: 3.885 },
            zoneIntent: ['C', 'E'],
            anchor: 'center',
            minSize: { width: 5, height: 3.5 },
            maxSize: { width: 14, height: 6 },
            wallIds: ['w-ext-w', 'w-h1', 'w-v3', 'w-h2'],
        },
        {
            id: 'r-puja',
            label: 'PUJA',
            type: 'puja',
            rect: { x: 12.615, y: 3.615, width: 3.385, height: 3.885 },
            zoneIntent: ['NE', 'E'],
            forbiddenZones: ['SW'],
            anchor: 'ne',
            minSize: { width: 2, height: 2 },
            maxSize: { width: 3.5, height: 4 },
            wallIds: ['w-ext-e', 'w-h1', 'w-v3', 'w-h2'],
        },
        {
            id: 'r-study',
            label: 'STUDY',
            type: 'study',
            rect: { x: 8.115, y: 7.615, width: 4.385, height: 2.385 },
            zoneIntent: ['E', 'N'],
            anchor: 'center',
            minSize: { width: 2.5, height: 2 },
            maxSize: { width: 5, height: 3.5 },
            wallIds: ['w-v4', 'w-v3', 'w-h2', 'w-h3'],
        },
        {
            id: 'r-bed4',
            label: 'GUEST\nBEDROOM',
            type: 'bedroom',
            rect: { x: 0.23, y: 7.615, width: 7.77, height: 2.385 },
            zoneIntent: ['W', 'C'],
            anchor: 'center',
            minSize: { width: 3, height: 2.5 },
            maxSize: { width: 8, height: 3.5 },
            wallIds: ['w-ext-w', 'w-h2', 'w-v4', 'w-h3'],
        },
        {
            id: 'r-kitchen',
            label: 'KITCHEN',
            type: 'kitchen',
            rect: { x: 12.615, y: 7.615, width: 3.385, height: 4.885 },
            zoneIntent: ['SE'],
            forbiddenZones: ['NE', 'SW'],
            anchor: 'se',
            minSize: { width: 3, height: 3 },
            maxSize: { width: 5, height: 6 },
            wallIds: ['w-ext-e', 'w-ext-s', 'w-v3', 'w-h2'],
        },
        {
            id: 'r-dining',
            label: 'DINING',
            type: 'dining',
            rect: { x: 3.115, y: 10.115, width: 9.385, height: 2.385 },
            zoneIntent: ['S', 'C'],
            anchor: 'center',
            minSize: { width: 4, height: 2.5 },
            maxSize: { width: 10, height: 3.5 },
            wallIds: ['w-v5', 'w-v3', 'w-h3', 'w-ext-s'],
        },
        {
            id: 'r-stair',
            label: 'STAIR',
            type: 'staircase',
            rect: { x: 0.23, y: 10.115, width: 2.77, height: 2.385 },
            zoneIntent: ['SW', 'S'],
            forbiddenZones: ['NE'],
            anchor: 'sw',
            minSize: { width: 2, height: 2.5 },
            maxSize: { width: 3.5, height: 3.5 },
            wallIds: ['w-ext-w', 'w-ext-s', 'w-v5', 'w-h3'],
        },
    ],
    doors: [
        { id: 'd-main', wallId: 'w-ext-w', position: 0.5, width: 1.2, swingAngle: 90, swingDirection: 'right' },
        { id: 'd-master', wallId: 'w-v2', position: 0.5, width: 0.9, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-bed2', wallId: 'w-v1', position: 0.6, width: 0.9, swingAngle: 90, swingDirection: 'right' },
        { id: 'd-bed3', wallId: 'w-v1', position: 0.4, width: 0.9, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-bed4', wallId: 'w-v4', position: 0.3, width: 0.9, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-kitchen', wallId: 'w-v3', position: 0.8, width: 0.9, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-study', wallId: 'w-v4', position: 0.7, width: 0.9, swingAngle: 90, swingDirection: 'right' },
    ],
};

/**
 * Template: 2BHK North Facing (Compact Variant)
 * Total: ~95 sqm (11m x 9m)
 */
export const template_2BHK_North: PlanTemplate = {
    id: '2bhk-north',
    name: '2BHK North Facing - Compact',
    facing: 'N',
    baseEnvelope: { width: 11, height: 9 },
    description: 'Compact 2 bedroom with north entrance, ideal for narrow plots',
    floors: 1,
    bedrooms: 2,
    walls: [
        createWall('w-ext-n', 0, 0, 11, 0, 0.23, true),
        createWall('w-ext-e', 11, 0, 11, 9, 0.23, true),
        createWall('w-ext-s', 11, 9, 0, 9, 0.23, true),
        createWall('w-ext-w', 0, 9, 0, 0, 0.23, true),
        createWall('w-h1', 0, 3, 11, 3, 0.115, false),
        createWall('w-h2', 0, 6.5, 11, 6.5, 0.115, false),
        createWall('w-v1', 5.5, 0, 5.5, 3, 0.115, false),
        createWall('w-v2', 8, 3, 8, 6.5, 0.115, false),
        createWall('w-v3', 3, 6.5, 3, 9, 0.115, false),
    ],
    rooms: [
        { id: 'r-master', label: 'MASTER\nBEDROOM', type: 'master_bedroom', rect: { x: 5.615, y: 0.23, width: 5.385, height: 2.77 }, zoneIntent: ['NE', 'N'], anchor: 'ne', minSize: { width: 3.5, height: 2.5 }, maxSize: { width: 6, height: 4 }, wallIds: ['w-ext-n', 'w-ext-e', 'w-v1', 'w-h1'] },
        { id: 'r-bed2', label: 'BEDROOM\n02', type: 'bedroom', rect: { x: 0.23, y: 0.23, width: 5.27, height: 2.77 }, zoneIntent: ['N', 'NW'], anchor: 'nw', minSize: { width: 3, height: 2.5 }, maxSize: { width: 5.5, height: 4 }, wallIds: ['w-ext-n', 'w-ext-w', 'w-v1', 'w-h1'] },
        { id: 'r-living', label: 'LIVING\nHALL', type: 'living_room', rect: { x: 0.23, y: 3.115, width: 7.77, height: 3.385 }, zoneIntent: ['C', 'W'], anchor: 'center', minSize: { width: 4, height: 3 }, maxSize: { width: 9, height: 5 }, wallIds: ['w-ext-w', 'w-h1', 'w-v2', 'w-h2'] },
        { id: 'r-puja', label: 'PUJA', type: 'puja', rect: { x: 8.115, y: 3.115, width: 2.885, height: 3.385 }, zoneIntent: ['NE', 'E'], forbiddenZones: ['SW'], anchor: 'ne', minSize: { width: 1.5, height: 1.5 }, maxSize: { width: 3, height: 3.5 }, wallIds: ['w-ext-e', 'w-h1', 'w-v2', 'w-h2'] },
        { id: 'r-kitchen', label: 'KITCHEN', type: 'kitchen', rect: { x: 8.115, y: 6.615, width: 2.885, height: 2.385 }, zoneIntent: ['SE'], forbiddenZones: ['NE', 'N'], anchor: 'se', minSize: { width: 2, height: 2 }, maxSize: { width: 4, height: 3.5 }, wallIds: ['w-ext-e', 'w-ext-s', 'w-v2', 'w-h2'] },
        { id: 'r-dining', label: 'DINING', type: 'dining', rect: { x: 3.115, y: 6.615, width: 4.885, height: 2.385 }, zoneIntent: ['S', 'C'], anchor: 'center', minSize: { width: 3, height: 2.5 }, maxSize: { width: 6, height: 3.5 }, wallIds: ['w-v3', 'w-v2', 'w-h2', 'w-ext-s'] },
        { id: 'r-stair', label: 'STAIR', type: 'staircase', rect: { x: 0.23, y: 6.615, width: 2.77, height: 2.385 }, zoneIntent: ['SW', 'S'], forbiddenZones: ['NE'], anchor: 'sw', minSize: { width: 2, height: 2 }, maxSize: { width: 3.5, height: 3 }, wallIds: ['w-ext-w', 'w-ext-s', 'w-v3', 'w-h2'] },
    ],
    doors: [
        { id: 'd-main', wallId: 'w-ext-n', position: 0.5, width: 1.2, swingAngle: 90, swingDirection: 'right' },
        { id: 'd-master', wallId: 'w-v1', position: 0.5, width: 0.9, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-bed2', wallId: 'w-v1', position: 0.3, width: 0.9, swingAngle: 90, swingDirection: 'right' },
    ],
};

/**
 * Template: 3BHK East Facing (Medium Variant)
 * Total: ~130 sqm (13m x 10m)
 */
export const template_3BHK_East: PlanTemplate = {
    id: '3bhk-east',
    name: '3BHK East Facing - Medium',
    facing: 'E',
    baseEnvelope: { width: 13, height: 10 },
    description: 'Medium 3 bedroom with east entrance and efficient layout',
    floors: 1,
    bedrooms: 3,
    walls: [
        createWall('w-ext-n', 0, 0, 13, 0, 0.23, true),
        createWall('w-ext-e', 13, 0, 13, 10, 0.23, true),
        createWall('w-ext-s', 13, 10, 0, 10, 0.23, true),
        createWall('w-ext-w', 0, 10, 0, 0, 0.23, true),
        createWall('w-h1', 0, 3.2, 13, 3.2, 0.115, false),
        createWall('w-h2', 0, 6.5, 13, 6.5, 0.115, false),
        createWall('w-v1', 4.3, 0, 4.3, 3.2, 0.115, false),
        createWall('w-v2', 8.7, 0, 8.7, 3.2, 0.115, false),
        createWall('w-v3', 10, 3.2, 10, 6.5, 0.115, false),
        createWall('w-v4', 3, 6.5, 3, 10, 0.115, false),
    ],
    rooms: [
        { id: 'r-master', label: 'MASTER\nBEDROOM', type: 'master_bedroom', rect: { x: 8.815, y: 0.23, width: 4.185, height: 2.97 }, zoneIntent: ['NE', 'N'], anchor: 'ne', minSize: { width: 3.5, height: 2.5 }, maxSize: { width: 5, height: 4 }, wallIds: ['w-ext-n', 'w-ext-e', 'w-v2', 'w-h1'] },
        { id: 'r-bed2', label: 'BEDROOM\n02', type: 'bedroom', rect: { x: 4.415, y: 0.23, width: 4.285, height: 2.97 }, zoneIntent: ['N'], anchor: 'center', minSize: { width: 3, height: 2.5 }, maxSize: { width: 5, height: 4 }, wallIds: ['w-ext-n', 'w-v1', 'w-v2', 'w-h1'] },
        { id: 'r-bed3', label: 'BEDROOM\n03', type: 'bedroom', rect: { x: 0.23, y: 0.23, width: 4.07, height: 2.97 }, zoneIntent: ['NW', 'N'], anchor: 'nw', minSize: { width: 3, height: 2.5 }, maxSize: { width: 5, height: 4 }, wallIds: ['w-ext-n', 'w-ext-w', 'w-v1', 'w-h1'] },
        { id: 'r-living', label: 'LIVING\nHALL', type: 'living_room', rect: { x: 0.23, y: 3.315, width: 9.77, height: 3.185 }, zoneIntent: ['C', 'E'], anchor: 'center', minSize: { width: 4, height: 3 }, maxSize: { width: 11, height: 5 }, wallIds: ['w-ext-w', 'w-h1', 'w-v3', 'w-h2'] },
        { id: 'r-puja', label: 'PUJA', type: 'puja', rect: { x: 10.115, y: 3.315, width: 2.885, height: 3.185 }, zoneIntent: ['NE', 'E'], forbiddenZones: ['SW'], anchor: 'ne', minSize: { width: 1.5, height: 1.5 }, maxSize: { width: 3, height: 3.5 }, wallIds: ['w-ext-e', 'w-h1', 'w-v3', 'w-h2'] },
        { id: 'r-dining', label: 'DINING', type: 'dining', rect: { x: 3.115, y: 6.615, width: 6.885, height: 3.385 }, zoneIntent: ['S', 'C'], anchor: 'center', minSize: { width: 3, height: 2.5 }, maxSize: { width: 8, height: 4 }, wallIds: ['w-v4', 'w-v3', 'w-h2', 'w-ext-s'] },
        { id: 'r-kitchen', label: 'KITCHEN', type: 'kitchen', rect: { x: 10.115, y: 6.615, width: 2.885, height: 3.385 }, zoneIntent: ['SE'], forbiddenZones: ['NE', 'N'], anchor: 'se', minSize: { width: 2.5, height: 2.5 }, maxSize: { width: 4, height: 4 }, wallIds: ['w-ext-e', 'w-ext-s', 'w-v3', 'w-h2'] },
        { id: 'r-stair', label: 'STAIR', type: 'staircase', rect: { x: 0.23, y: 6.615, width: 2.77, height: 3.385 }, zoneIntent: ['SW', 'S'], forbiddenZones: ['NE'], anchor: 'sw', minSize: { width: 2, height: 2.5 }, maxSize: { width: 3.5, height: 4 }, wallIds: ['w-ext-w', 'w-ext-s', 'w-v4', 'w-h2'] },
    ],
    doors: [
        { id: 'd-main', wallId: 'w-ext-e', position: 0.5, width: 1.2, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-master', wallId: 'w-v2', position: 0.5, width: 0.9, swingAngle: 90, swingDirection: 'right' },
        { id: 'd-bed2', wallId: 'w-v1', position: 0.5, width: 0.9, swingAngle: 90, swingDirection: 'left' },
    ],
};

/**
 * Template: 4BHK North Facing (Large Variant)
 * Total: ~210 sqm (15m x 14m)
 */
export const template_4BHK_North: PlanTemplate = {
    id: '4bhk-north',
    name: '4BHK North Facing - Spacious',
    facing: 'N',
    baseEnvelope: { width: 15, height: 14 },
    description: 'Spacious 4 bedroom with north entrance, luxury layout',
    floors: 1,
    bedrooms: 4,
    walls: [
        createWall('w-ext-n', 0, 0, 15, 0, 0.23, true),
        createWall('w-ext-e', 15, 0, 15, 14, 0.23, true),
        createWall('w-ext-s', 15, 14, 0, 14, 0.23, true),
        createWall('w-ext-w', 0, 14, 0, 0, 0.23, true),
        createWall('w-h1', 0, 3.5, 15, 3.5, 0.115, false),
        createWall('w-h2', 0, 8, 15, 8, 0.115, false),
        createWall('w-h3', 0, 11, 15, 11, 0.115, false),
        createWall('w-v1', 5, 0, 5, 3.5, 0.115, false),
        createWall('w-v2', 10, 0, 10, 3.5, 0.115, false),
        createWall('w-v3', 11.5, 3.5, 11.5, 8, 0.115, false),
        createWall('w-v4', 7.5, 8, 7.5, 11, 0.115, false),
        createWall('w-v5', 3, 11, 3, 14, 0.115, false),
    ],
    rooms: [
        { id: 'r-master', label: 'MASTER\nBEDROOM', type: 'master_bedroom', rect: { x: 10.115, y: 0.23, width: 4.885, height: 3.27 }, zoneIntent: ['NE', 'N'], anchor: 'ne', minSize: { width: 4, height: 3 }, maxSize: { width: 6, height: 4.5 }, wallIds: ['w-ext-n', 'w-ext-e', 'w-v2', 'w-h1'] },
        { id: 'r-bed2', label: 'BEDROOM\n02', type: 'bedroom', rect: { x: 5.115, y: 0.23, width: 4.885, height: 3.27 }, zoneIntent: ['N'], anchor: 'center', minSize: { width: 3.5, height: 2.5 }, maxSize: { width: 6, height: 4 }, wallIds: ['w-ext-n', 'w-v1', 'w-v2', 'w-h1'] },
        { id: 'r-bed3', label: 'BEDROOM\n03', type: 'bedroom', rect: { x: 0.23, y: 0.23, width: 4.77, height: 3.27 }, zoneIntent: ['NW', 'N'], anchor: 'nw', minSize: { width: 3.5, height: 2.5 }, maxSize: { width: 5.5, height: 4 }, wallIds: ['w-ext-n', 'w-ext-w', 'w-v1', 'w-h1'] },
        { id: 'r-living', label: 'LIVING\nHALL', type: 'living_room', rect: { x: 0.23, y: 3.615, width: 11.27, height: 4.385 }, zoneIntent: ['C', 'E'], anchor: 'center', minSize: { width: 5, height: 3.5 }, maxSize: { width: 13, height: 6 }, wallIds: ['w-ext-w', 'w-h1', 'w-v3', 'w-h2'] },
        { id: 'r-puja', label: 'PUJA', type: 'puja', rect: { x: 11.615, y: 3.615, width: 3.385, height: 4.385 }, zoneIntent: ['NE', 'E'], forbiddenZones: ['SW'], anchor: 'ne', minSize: { width: 2, height: 2 }, maxSize: { width: 3.5, height: 4.5 }, wallIds: ['w-ext-e', 'w-h1', 'w-v3', 'w-h2'] },
        { id: 'r-study', label: 'STUDY', type: 'study', rect: { x: 7.615, y: 8.115, width: 3.885, height: 2.885 }, zoneIntent: ['E', 'N'], anchor: 'center', minSize: { width: 2.5, height: 2 }, maxSize: { width: 5, height: 3.5 }, wallIds: ['w-v4', 'w-v3', 'w-h2', 'w-h3'] },
        { id: 'r-bed4', label: 'GUEST\nBEDROOM', type: 'bedroom', rect: { x: 0.23, y: 8.115, width: 7.27, height: 2.885 }, zoneIntent: ['W', 'C'], anchor: 'center', minSize: { width: 3, height: 2.5 }, maxSize: { width: 8, height: 3.5 }, wallIds: ['w-ext-w', 'w-h2', 'w-v4', 'w-h3'] },
        { id: 'r-kitchen', label: 'KITCHEN', type: 'kitchen', rect: { x: 11.615, y: 8.115, width: 3.385, height: 5.885 }, zoneIntent: ['SE'], forbiddenZones: ['NE', 'SW'], anchor: 'se', minSize: { width: 3, height: 3 }, maxSize: { width: 5, height: 6.5 }, wallIds: ['w-ext-e', 'w-ext-s', 'w-v3', 'w-h2'] },
        { id: 'r-dining', label: 'DINING', type: 'dining', rect: { x: 3.115, y: 11.115, width: 8.385, height: 2.885 }, zoneIntent: ['S', 'C'], anchor: 'center', minSize: { width: 4, height: 2.5 }, maxSize: { width: 10, height: 3.5 }, wallIds: ['w-v5', 'w-v3', 'w-h3', 'w-ext-s'] },
        { id: 'r-stair', label: 'STAIR', type: 'staircase', rect: { x: 0.23, y: 11.115, width: 2.77, height: 2.885 }, zoneIntent: ['SW', 'S'], forbiddenZones: ['NE'], anchor: 'sw', minSize: { width: 2, height: 2.5 }, maxSize: { width: 3.5, height: 3.5 }, wallIds: ['w-ext-w', 'w-ext-s', 'w-v5', 'w-h3'] },
    ],
    doors: [
        { id: 'd-main', wallId: 'w-ext-n', position: 0.5, width: 1.2, swingAngle: 90, swingDirection: 'left' },
        { id: 'd-master', wallId: 'w-v2', position: 0.5, width: 0.9, swingAngle: 90, swingDirection: 'right' },
        { id: 'd-bed2', wallId: 'w-v1', position: 0.5, width: 0.9, swingAngle: 90, swingDirection: 'left' },
    ],
};

// Export all templates
export const ALL_TEMPLATES: PlanTemplate[] = [
    template_2BHK_East,
    template_2BHK_North,
    template_3BHK_South,
    template_3BHK_East,
    template_4BHK_West,
    template_4BHK_North,
];

export function getTemplateById(id: string): PlanTemplate | undefined {
    return ALL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByBedrooms(bedrooms: number): PlanTemplate[] {
    return ALL_TEMPLATES.filter((t) => t.bedrooms === bedrooms);
}
