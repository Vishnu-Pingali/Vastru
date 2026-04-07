// components/PlanCanvas.tsx
// Professional CAD-style canvas with walls, doors, and Vastu zones

import { useRef, useEffect, useCallback } from 'react';
import type { ExportableStage } from '../types';
import { useStore } from '../store/useStore';

const PALETTE = {
    page: '#E7DECC',
    sheet: '#F6F0D9',
    plotFill: '#FBF6E6',
    roomFill: '#FFFBEF',
    roomHighlight: '#FFF3C7',
    roomStroke: '#2C888A',
    wall: '#146D71',
    wallShadow: '#C9C0A0',
    opening: '#FFFDF7',
    gridMajor: 'rgba(145, 129, 87, 0.14)',
    gridMinor: 'rgba(145, 129, 87, 0.07)',
    textPrimary: '#4F4428',
    textSecondary: '#7A6D46',
    dimension: '#8A7B53',
    border: '#CFC4A4',
    titleFill: '#EFE6C5',
};

export function PlanCanvas() {
    const {
        plot,
        rooms,
        walls,
        activeTemplate,
        selectedRoomId,
        setStageRef,
    } = useStore();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Canvas configuration
    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 800;
    const PADDING = 90;
    const formatRoomLabel = useCallback((label: string) => {
        return label
            .split('\n')
            .map((part) => part.trim())
            .filter(Boolean)
            .join('\n');
    }, []);

    // Calculate scale to fit plot in canvas
    const getScale = useCallback(() => {
        const availableWidth = CANVAS_WIDTH - PADDING * 2;
        const availableHeight = CANVAS_HEIGHT - PADDING * 2;
        return Math.min(availableWidth / plot.width, availableHeight / plot.height);
    }, [plot.height, plot.width]);

    // Get canvas offset (centering)
    const getOffset = useCallback(() => {
        const scale = getScale();
        const plotWidthPx = plot.width * scale;
        const plotHeightPx = plot.height * scale;
        return {
            x: (CANVAS_WIDTH - plotWidthPx) / 2,
            y: (CANVAS_HEIGHT - plotHeightPx) / 2,
        };
    }, [getScale, plot.height, plot.width]);

    const drawGrid = useCallback((ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        const gridSize = 1; // 1 meter

        ctx.strokeStyle = PALETTE.gridMajor;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= plot.width; x += gridSize) {
            const px = offset.x + x * scale;
            ctx.beginPath();
            ctx.moveTo(px, offset.y);
            ctx.lineTo(px, offset.y + plot.height * scale);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= plot.height; y += gridSize) {
            const py = offset.y + y * scale;
            ctx.beginPath();
            ctx.moveTo(offset.x, py);
            ctx.lineTo(offset.x + plot.width * scale, py);
            ctx.stroke();
        }

        // Micro-grid
        ctx.strokeStyle = PALETTE.gridMinor;
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= plot.width; x += 0.2) {
            const px = offset.x + x * scale;
            ctx.beginPath();
            ctx.moveTo(px, offset.y);
            ctx.lineTo(px, offset.y + plot.height * scale);
            ctx.stroke();
        }
        for (let y = 0; y <= plot.height; y += 0.2) {
            const py = offset.y + y * scale;
            ctx.beginPath();
            ctx.moveTo(offset.x, py);
            ctx.lineTo(offset.x + plot.width * scale, py);
            ctx.stroke();
        }
    }, [plot.height, plot.width]);

    const drawHatchFill = useCallback((
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        options?: {
            spacing?: number;
            angle?: number;
            color?: string;
            lineWidth?: number;
        }
    ) => {
        const spacing = options?.spacing ?? 10;
        const angle = options?.angle ?? -Math.PI / 4;
        const color = options?.color ?? 'rgba(123, 111, 72, 0.35)';
        const lineWidth = options?.lineWidth ?? 1;
        const diagonal = Math.sqrt(width * width + height * height);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate(angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;

        for (let pos = -diagonal; pos <= diagonal; pos += spacing) {
            ctx.beginPath();
            ctx.moveTo(pos, -diagonal);
            ctx.lineTo(pos, diagonal);
            ctx.stroke();
        }

        ctx.restore();
    }, []);

    const drawWalls = useCallback((ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        walls.forEach((wall) => {
            const x1 = offset.x + wall.start.x * scale;
            const y1 = offset.y + wall.start.y * scale;
            const x2 = offset.x + wall.end.x * scale;
            const y2 = offset.y + wall.end.y * scale;

            // Wall thickness in pixels
            const thicknessPx = wall.thickness * scale;

            ctx.strokeStyle = PALETTE.wall;
            ctx.lineWidth = Math.max(thicknessPx, wall.isExternal ? 7 : 4);
            ctx.lineCap = 'square';
            ctx.shadowColor = wall.isExternal ? PALETTE.wallShadow : 'transparent';
            ctx.shadowBlur = wall.isExternal ? 1 : 0;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.shadowBlur = 0; // reset
        });
    }, [walls]);

    const drawRooms = useCallback((ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        rooms.forEach((room) => {
            const rx = offset.x + room.x * scale;
            const ry = offset.y + room.y * scale;
            const rw = room.width * scale;
            const rh = room.height * scale;

            const isSelected = room.id === selectedRoomId;

            ctx.fillStyle = isSelected ? PALETTE.roomHighlight : PALETTE.roomFill;
            ctx.fillRect(rx, ry, rw, rh);

            if (room.type === 'balcony') {
                drawHatchFill(ctx, rx, ry, rw, rh, {
                    spacing: Math.max(8, scale * 0.16),
                    angle: 0,
                    color: 'rgba(123, 111, 72, 0.32)',
                });
            }

            if (room.type === 'utility') {
                drawHatchFill(ctx, rx, ry, rw, rh, {
                    spacing: Math.max(8, scale * 0.16),
                    angle: -Math.PI / 4,
                    color: 'rgba(123, 111, 72, 0.28)',
                });
                drawHatchFill(ctx, rx, ry, rw, rh, {
                    spacing: Math.max(8, scale * 0.16),
                    angle: Math.PI / 4,
                    color: 'rgba(123, 111, 72, 0.18)',
                });
            }

            ctx.strokeStyle = isSelected ? '#B68B2C' : PALETTE.roomStroke;
            ctx.lineWidth = isSelected ? 2.5 : 1.2;
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.shadowBlur = 0;

            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(rx + 2, ry + 2, Math.max(0, rw - 4), Math.max(0, rh - 4));

            // Room label
            ctx.save();
            ctx.fillStyle = PALETTE.textPrimary;
            ctx.font = `600 ${Math.max(10, scale * 0.28)}px Georgia, serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const lines = formatRoomLabel(room.label).split('\n');
            const lineHeight = Math.max(12, scale * 0.26);
            const dimensionOffset = Math.max(14, scale * 0.24);
            const totalHeight = lines.length * lineHeight + dimensionOffset;
            const startY = ry + rh / 2 - totalHeight / 2 + lineHeight / 2;

            lines.forEach((line, i) => {
                ctx.fillText(line, rx + rw / 2, startY + i * lineHeight);
            });

            // Room dimensions
            ctx.font = `${Math.max(8, scale * 0.18)}px Georgia, serif`;
            ctx.fillStyle = PALETTE.textSecondary;
            ctx.fillText(
                `${room.width.toFixed(1)}m × ${room.height.toFixed(1)}m`,
                rx + rw / 2,
                startY + lines.length * lineHeight + Math.max(8, scale * 0.08)
            );

            if (room.type === 'entrance') {
                ctx.strokeStyle = 'rgba(123, 111, 72, 0.7)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(rx + rw / 2, ry + rh / 2 + lineHeight * 0.85, Math.min(rw, rh) * 0.16, 0, Math.PI);
                ctx.stroke();

                ctx.strokeRect(
                    rx + rw * 0.28,
                    ry + rh * 0.66,
                    rw * 0.44,
                    Math.max(10, rh * 0.08)
                );
            }

            if (room.type === 'utility') {
                ctx.strokeStyle = 'rgba(91, 80, 48, 0.45)';
                ctx.lineWidth = 1;
                ctx.strokeRect(rx + rw * 0.14, ry + rh * 0.68, rw * 0.72, Math.max(8, rh * 0.12));
            }

            // Furniture rendering (CAD symbols)
            if (room.furniture) {
                room.furniture.forEach((f) => {
                    const fx = offset.x + f.x * scale;
                    const fy = offset.y + f.y * scale;
                    const fw = f.width * scale;
                    const fh = f.height * scale;

                    ctx.save();
                    ctx.translate(fx, fy);
                    ctx.rotate((f.rotation * Math.PI) / 180);

                    ctx.strokeStyle = PALETTE.textSecondary;
                    ctx.setLineDash([3, 2]);
                    ctx.lineWidth = 1;

                    if (f.type === 'bed') {
                        ctx.strokeRect(0, 0, fw, fh);
                        ctx.strokeRect(fw * 0.1, fh * 0.1, fw * 0.8, fh * 0.2); // pillow
                    } else if (f.type === 'sofa') {
                        ctx.beginPath();
                        ctx.roundRect(0, 0, fw, fh, 2);
                        ctx.stroke();
                    } else if (f.type === 'coffee_table' || f.type === 'console') {
                        ctx.strokeRect(0, 0, fw, fh);
                    } else if (f.type === 'dining_table') {
                        ctx.strokeRect(0, 0, fw, fh);
                        const chair = Math.min(fw, fh) * 0.16;
                        ctx.strokeRect(-chair * 0.7, fh * 0.18, chair, chair);
                        ctx.strokeRect(fw - chair * 0.3, fh * 0.18, chair, chair);
                        ctx.strokeRect(-chair * 0.7, fh - chair * 1.2, chair, chair);
                        ctx.strokeRect(fw - chair * 0.3, fh - chair * 1.2, chair, chair);
                    } else if (f.type === 'counter' || f.type === 'wardrobe') {
                        ctx.strokeRect(0, 0, fw, fh);
                        ctx.beginPath();
                        ctx.moveTo(fw * 0.5, 0);
                        ctx.lineTo(fw * 0.5, fh);
                        ctx.stroke();
                    } else if (f.type === 'stove') {
                        ctx.strokeRect(0, 0, fw, fh);
                        ctx.beginPath();
                        ctx.arc(fw / 2, fh / 2, fw / 3, 0, Math.PI * 2);
                        ctx.stroke();
                    } else if (f.type === 'wc') {
                        ctx.beginPath();
                        ctx.ellipse(fw * 0.55, fh * 0.55, fw * 0.28, fh * 0.35, 0, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.strokeRect(0, 0, fw * 0.55, fh * 0.28);
                    } else if (f.type === 'basin') {
                        ctx.beginPath();
                        ctx.arc(fw / 2, fh / 2, Math.min(fw, fh) * 0.35, 0, Math.PI * 2);
                        ctx.stroke();
                    } else if (f.type === 'shower') {
                        ctx.strokeRect(0, 0, fw, fh);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(fw, fh);
                        ctx.moveTo(fw, 0);
                        ctx.lineTo(0, fh);
                        ctx.stroke();
                    } else {
                        ctx.strokeRect(0, 0, fw, fh);
                    }

                    ctx.restore();
                });
            }

            ctx.restore();
        });
    }, [drawHatchFill, formatRoomLabel, rooms, selectedRoomId]);

    const drawWindows = useCallback((ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        if (!activeTemplate?.windows) return;

        activeTemplate.windows.forEach((win) => {
            const wall = walls.find((w) => w.id === win.wallId);
            if (!wall) return;

            const t = win.position;
            const winX = wall.start.x + (wall.end.x - wall.start.x) * t;
            const winY = wall.start.y + (wall.end.y - wall.start.y) * t;

            const px = offset.x + winX * scale;
            const py = offset.y + winY * scale;

            const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
            const winWidthPx = win.width * scale;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);

            ctx.fillStyle = PALETTE.opening;
            ctx.strokeStyle = PALETTE.roomStroke;
            ctx.lineWidth = 2;

            const frameThickness = wall.thickness * scale;
            ctx.fillRect(-winWidthPx / 2, -frameThickness / 2, winWidthPx, frameThickness);
            ctx.strokeRect(-winWidthPx / 2, -frameThickness / 2, winWidthPx, frameThickness);

            // Add center line for standard CAD window symbol
            ctx.beginPath();
            ctx.moveTo(-winWidthPx / 2, 0);
            ctx.lineTo(winWidthPx / 2, 0);
            ctx.stroke();

            ctx.restore();
        });
    }, [activeTemplate?.windows, walls]);

    const drawDoors = useCallback((ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        if (!activeTemplate) return;

        activeTemplate.doors.forEach((door) => {
            const wall = walls.find((w) => w.id === door.wallId);
            if (!wall) return;

            // Calculate door position on wall
            const t = door.position;
            const doorX = wall.start.x + (wall.end.x - wall.start.x) * t;
            const doorY = wall.start.y + (wall.end.y - wall.start.y) * t;

            const px = offset.x + doorX * scale;
            const py = offset.y + doorY * scale;

            // Wall angle
            const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);

            // Door width in pixels
            const doorWidthPx = door.width * scale;

            // Draw door opening
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);

            ctx.strokeStyle = PALETTE.opening;
            ctx.lineWidth = Math.max(wall.thickness * scale + 2, 4);
            ctx.beginPath();
            ctx.moveTo(-doorWidthPx / 2, 0);
            ctx.lineTo(doorWidthPx / 2, 0);
            ctx.stroke();

            // Draw door swing arc
            ctx.strokeStyle = PALETTE.dimension;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([]);

            const swingRadius = doorWidthPx * 0.8;
            const swingAngleRad = (door.swingAngle * Math.PI) / 180;
            const swingDirection = door.swingDirection === 'left' ? 1 : -1;

            ctx.beginPath();
            ctx.arc(
                door.swingDirection === 'left' ? -doorWidthPx / 2 : doorWidthPx / 2,
                0,
                swingRadius,
                swingDirection === 1 ? 0 : -swingAngleRad,
                swingDirection === 1 ? swingAngleRad : 0
            );
            ctx.stroke();

            // Draw solid door line
            ctx.setLineDash([]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = PALETTE.roomStroke;
            ctx.beginPath();
            ctx.moveTo(door.swingDirection === 'left' ? -doorWidthPx / 2 : doorWidthPx / 2, 0);

            // Calculate end point of the open door
            const originX = door.swingDirection === 'left' ? -doorWidthPx / 2 : doorWidthPx / 2;
            const endX = originX + swingRadius * Math.cos(swingDirection === 1 ? swingAngleRad : -swingAngleRad);
            const endY = swingRadius * Math.sin(swingDirection === 1 ? swingAngleRad : -swingAngleRad);

            ctx.lineTo(endX, endY);
            ctx.stroke();

            ctx.restore();
        });
    }, [activeTemplate, walls]);

    const drawPlotBoundary = useCallback((ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        const plotWidthPx = plot.width * scale;
        const plotHeightPx = plot.height * scale;

        // Plot boundary line
        ctx.strokeStyle = PALETTE.border;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);
        ctx.strokeRect(offset.x, offset.y, plotWidthPx, plotHeightPx);
        ctx.setLineDash([]);

        // CAD Dimension Lines
        ctx.font = '600 12px Georgia';
        ctx.fillStyle = PALETTE.dimension;
        ctx.textAlign = 'center';
        ctx.strokeStyle = PALETTE.dimension;
        ctx.lineWidth = 1;

        // Width Dimension (Bottom)
        const dimY = offset.y + plotHeightPx + 45;
        ctx.beginPath();
        ctx.moveTo(offset.x, dimY);
        ctx.lineTo(offset.x + plotWidthPx, dimY);
        ctx.stroke();
        // Ticks
        ctx.beginPath();
        ctx.moveTo(offset.x, dimY - 8); ctx.lineTo(offset.x, dimY + 8);
        ctx.moveTo(offset.x + plotWidthPx, dimY - 8); ctx.lineTo(offset.x + plotWidthPx, dimY + 8);
        ctx.stroke();
        ctx.fillText(`${plot.width.toFixed(1)}m`, offset.x + plotWidthPx / 2, dimY - 10);

        // Height Dimension (Left)
        const dimX = offset.x - 45;
        ctx.save();
        ctx.translate(dimX, offset.y + plotHeightPx / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-plotHeightPx / 2, 0);
        ctx.lineTo(plotHeightPx / 2, 0);
        ctx.stroke();
        // Ticks
        ctx.beginPath();
        ctx.moveTo(-plotHeightPx / 2, -8); ctx.lineTo(-plotHeightPx / 2, 8);
        ctx.moveTo(plotHeightPx / 2, -8); ctx.lineTo(plotHeightPx / 2, 8);
        ctx.stroke();
        ctx.fillText(`${plot.height.toFixed(1)}m`, 0, -10);
        ctx.restore();
    }, [plot.height, plot.width]);

    const drawSheetFrame = useCallback((ctx: CanvasRenderingContext2D) => {
        const margin = 24;
        ctx.fillStyle = PALETTE.page;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = PALETTE.sheet;
        ctx.fillRect(margin, margin, CANVAS_WIDTH - margin * 2, CANVAS_HEIGHT - margin * 2);

        ctx.strokeStyle = PALETTE.border;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(margin, margin, CANVAS_WIDTH - margin * 2, CANVAS_HEIGHT - margin * 2);

        ctx.strokeStyle = 'rgba(138, 123, 83, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(margin + 10, margin + 10, CANVAS_WIDTH - (margin + 10) * 2, CANVAS_HEIGHT - (margin + 10) * 2);
    }, []);

    const drawTitleBlock = useCallback((ctx: CanvasRenderingContext2D) => {
        const blockWidth = 260;
        const blockHeight = 82;
        const x = CANVAS_WIDTH - blockWidth - 34;
        const y = CANVAS_HEIGHT - blockHeight - 34;

        ctx.fillStyle = PALETTE.titleFill;
        ctx.fillRect(x, y, blockWidth, blockHeight);
        ctx.strokeStyle = PALETTE.border;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x, y, blockWidth, blockHeight);

        ctx.beginPath();
        ctx.moveTo(x, y + 28);
        ctx.lineTo(x + blockWidth, y + 28);
        ctx.moveTo(x + 166, y + 28);
        ctx.lineTo(x + 166, y + blockHeight);
        ctx.stroke();

        ctx.fillStyle = PALETTE.textPrimary;
        ctx.font = '700 15px Georgia';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeTemplate ? activeTemplate.name : 'Residential Floor Plan', x + 12, y + 16);

        ctx.font = '600 10px Georgia';
        ctx.fillStyle = PALETTE.textSecondary;
        ctx.fillText('Project', x + 12, y + 43);
        ctx.fillText('Scale', x + 12, y + 63);
        ctx.fillText('North', x + 178, y + 43);
        ctx.fillText('Plot', x + 178, y + 63);

        ctx.fillStyle = PALETTE.textPrimary;
        ctx.fillText('VastuCAD Layout Study', x + 62, y + 43);
        ctx.fillText(`1:${Math.max(1, Math.round(1 / getScale()))}`, x + 62, y + 63);
        ctx.fillText(`${plot.orientation}°`, x + 213, y + 43);
        ctx.fillText(`${plot.width}m × ${plot.height}m`, x + 213, y + 63);
    }, [activeTemplate, getScale, plot.height, plot.orientation, plot.width]);

    const drawNorthArrow = useCallback((ctx: CanvasRenderingContext2D, offset: { x: number; y: number }) => {
        const arrowSize = 35;
        const arrowX = offset.x + 50;
        const arrowY = offset.y - 50;

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate((plot.orientation * Math.PI) / 180);

        // Arrow
        ctx.strokeStyle = PALETTE.roomStroke;
        ctx.fillStyle = PALETTE.roomStroke;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -arrowSize);
        ctx.lineTo(-arrowSize / 4, 0);
        ctx.lineTo(0, -arrowSize / 3);
        ctx.lineTo(arrowSize / 4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Compass ring
        ctx.beginPath();
        ctx.arc(0, -arrowSize / 2, arrowSize * 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = PALETTE.dimension;
        ctx.stroke();

        // N label
        ctx.fillStyle = PALETTE.roomStroke;
        ctx.font = '700 16px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('N', 0, 8);

        ctx.restore();
    }, [plot.orientation]);

    const drawScale = useCallback((ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        const scaleLength = 5; // 5 meters
        const scaleLengthPx = scaleLength * scale;
        const scaleX = offset.x;
        const scaleY = offset.y + plot.height * scale + 30;

        ctx.strokeStyle = PALETTE.dimension;
        ctx.fillStyle = PALETTE.dimension;
        ctx.lineWidth = 2;

        // Scale line
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleY);
        ctx.lineTo(scaleX + scaleLengthPx, scaleY);
        ctx.stroke();

        // End marks
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleY - 6);
        ctx.lineTo(scaleX, scaleY + 6);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(scaleX + scaleLengthPx, scaleY - 6);
        ctx.lineTo(scaleX + scaleLengthPx, scaleY + 6);
        ctx.stroke();

        // Fill middle
        ctx.fillRect(scaleX, scaleY - 2, scaleLengthPx / 2, 4);

        // Label
        ctx.font = '600 12px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = PALETTE.textPrimary;
        ctx.fillText(`Scale: ${scaleLength}m`, scaleX + scaleLengthPx / 2, scaleY + 12);
    }, [plot.height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale = getScale();
        const offset = getOffset();

        drawSheetFrame(ctx);
        ctx.fillStyle = PALETTE.plotFill;
        ctx.fillRect(offset.x, offset.y, plot.width * scale, plot.height * scale);

        // Draw light grid
        drawGrid(ctx, scale, offset);

        // Draw walls
        if (walls.length > 0) {
            drawWalls(ctx, scale, offset);
        }

        // Draw rooms
        drawRooms(ctx, scale, offset);

        // Draw doors (if template loaded)
        if (activeTemplate?.doors) {
            drawDoors(ctx, scale, offset);
        }

        // Draw windows (if template loaded)
        if (activeTemplate?.windows) {
            drawWindows(ctx, scale, offset);
        }

        // Draw plot boundary
        drawPlotBoundary(ctx, scale, offset);

        // Draw north arrow
        drawNorthArrow(ctx, offset);

        // Draw scale indicator
        drawScale(ctx, scale, offset);
        drawTitleBlock(ctx);
    }, [
        plot,
        rooms,
        walls,
        activeTemplate,
        selectedRoomId,
        getScale,
        getOffset,
        drawGrid,
        drawHatchFill,
        drawWalls,
        drawRooms,
        drawWindows,
        drawDoors,
        drawPlotBoundary,
        drawSheetFrame,
        drawTitleBlock,
        drawNorthArrow,
        drawScale,
    ]);

    // Set canvas ref for export
    useEffect(() => {
        if (canvasRef.current) {
            const fakeStageRef = {
                current: {
                    toDataURL: () => canvasRef.current?.toDataURL() || '',
                },
            } as React.RefObject<ExportableStage>;
            setStageRef(fakeStageRef);
        }
    }, [setStageRef]);

    return (
        <div className="rounded-[28px] p-4 md:p-6 flex flex-col relative z-10 w-full overflow-hidden bg-[#efe8d4] border border-[#d8ccb0] shadow-[0_24px_70px_rgba(91,80,48,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6 border-b border-[#d7ccb0] pb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#146d71] border border-[#0f5d61] flex items-center justify-center text-xl text-[#fff8d8] shadow-sm">
                        ▣
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-[#4D4428] tracking-wide truncate">
                            {activeTemplate ? activeTemplate.name : 'Professional Floor Plan'}
                        </h2>
                        <div className="text-[11px] md:text-xs text-[#867A54] uppercase tracking-[0.18em] md:tracking-[0.22em] mt-1 break-words">
                            {plot.width}m × {plot.height}m / <span className="opacity-70">Scale 1:{Math.max(1, Math.round(1 / getScale()))}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 self-start lg:self-auto">
                    <div className="px-3 py-1.5 bg-[#fff6d8] rounded-lg border border-[#d8cca0] text-[10px] font-mono text-[#146d71] font-bold">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#146d71] mr-2"></span>
                        ARCHITECTURAL VIEW
                    </div>
                </div>
            </div>

            <div ref={containerRef} className="flex justify-center w-full bg-[#ddd4bf] rounded-2xl p-2 sm:p-3 md:p-4 border border-[#d1c4a6] relative">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border border-[#c8bea2] shadow-[0_20px_50px_rgba(91,80,48,0.12)] rounded-xl cursor-crosshair object-contain w-full h-[54vh] sm:h-[58vh] lg:h-[64vh] xl:h-[70vh] bg-[#f6f0d9]"
                />
            </div>

            <div className="mt-5 text-center text-[10px] sm:text-xs text-[#867A54] uppercase tracking-[0.18em] sm:tracking-widest font-bold flex flex-wrap justify-center items-center gap-3 sm:gap-6">
                <span><span className="w-3 h-3 inline-block bg-[#0F6D73] align-middle mr-2 rounded-sm"></span> Walls</span>
                <span><span className="w-3 h-3 inline-block bg-[#FFFDF1] border border-[#0F6D73] align-middle mr-2 rounded-sm"></span> Openings</span>
                <span><span className="w-3 h-3 inline-block border border-[#2C888A] align-middle mr-2 rounded-sm"></span> Rooms</span>
            </div>
        </div>
    );
}
