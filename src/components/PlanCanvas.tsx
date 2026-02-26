// components/PlanCanvas.tsx
// Professional CAD-style canvas with walls, doors, and Vastu zones

import { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { computeZones } from '../utils/zoneUtils';
import { extractBuiltEnvelope } from '../geometry/envelope';

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
    const PADDING = 60;

    // Calculate scale to fit plot in canvas
    const getScale = () => {
        const availableWidth = CANVAS_WIDTH - PADDING * 2;
        const availableHeight = CANVAS_HEIGHT - PADDING * 2;
        return Math.min(availableWidth / plot.width, availableHeight / plot.height);
    };

    // Get canvas offset (centering)
    const getOffset = () => {
        const scale = getScale();
        const plotWidthPx = plot.width * scale;
        const plotHeightPx = plot.height * scale;
        return {
            x: (CANVAS_WIDTH - plotWidthPx) / 2,
            y: (CANVAS_HEIGHT - plotHeightPx) / 2,
        };
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale = getScale();
        const offset = getOffset();

        // Clear canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw light grid
        drawGrid(ctx, scale, offset);

        // Draw Vastu zones (if template loaded)
        if (activeTemplate && walls.length > 0) {
            drawVastuZones(ctx, scale, offset);
        }

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
    };

    const drawGrid = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        const gridSize = 1; // 1 meter

        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 0.5;

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
    };

    const drawVastuZones = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        if (walls.length === 0) return;

        // Extract built envelope
        const envelope = extractBuiltEnvelope(walls);

        // Calculate zones on built area
        const zones = computeZones({
            width: envelope.width,
            height: envelope.height,
            orientation: plot.orientation,
        });

        // Offset zones to built envelope position
        const offsetZones = zones.map((z) => ({
            ...z,
            x: z.x + envelope.x,
            y: z.y + envelope.y,
        }));

        // Draw zone boundaries and labels
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        offsetZones.forEach((zone) => {
            const zx = offset.x + zone.x * scale;
            const zy = offset.y + zone.y * scale;
            const zw = zone.w * scale;
            const zh = zone.h * scale;

            // Zone boundary
            ctx.strokeRect(zx, zy, zw, zh);

            // Zone label
            ctx.save();
            ctx.fillStyle = '#9CA3AF';
            ctx.font = `${Math.max(10, scale * 0.5)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.id, zx + zw / 2, zy + zh / 2);
            ctx.restore();
        });

        ctx.setLineDash([]);
    };

    const drawWalls = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        walls.forEach((wall) => {
            const x1 = offset.x + wall.start.x * scale;
            const y1 = offset.y + wall.start.y * scale;
            const x2 = offset.x + wall.end.x * scale;
            const y2 = offset.y + wall.end.y * scale;

            // Wall thickness in pixels
            const thicknessPx = wall.thickness * scale;

            // Wall color: darker for external, lighter for internal
            ctx.strokeStyle = wall.isExternal ? '#1F2937' : '#6B7280';
            ctx.lineWidth = Math.max(thicknessPx, wall.isExternal ? 3 : 2);
            ctx.lineCap = 'square';

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
    };

    const drawRooms = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        rooms.forEach((room) => {
            const rx = offset.x + room.x * scale;
            const ry = offset.y + room.y * scale;
            const rw = room.width * scale;
            const rh = room.height * scale;

            const isSelected = room.id === selectedRoomId;

            // Room fill (very light)
            ctx.fillStyle = isSelected ? '#EFF6FF' : '#FFFFFF';
            ctx.fillRect(rx, ry, rw, rh);

            // Room border (compliance color)
            const borderColor =
                room.score >= 80 ? '#22C55E' :
                    room.score >= 60 ? '#F59E0B' :
                        room.score >= 30 ? '#F97316' :
                            '#EF4444';

            ctx.strokeStyle = isSelected ? '#3B82F6' : borderColor;
            ctx.lineWidth = isSelected ? 3 : 1.5;
            ctx.strokeRect(rx, ry, rw, rh);

            // Room label
            ctx.save();
            ctx.fillStyle = '#111827';
            ctx.font = `bold ${Math.max(11, scale * 0.4)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const lines = room.label.split('\n');
            const lineHeight = Math.max(13, scale * 0.5);
            const totalHeight = lines.length * lineHeight;
            const startY = ry + rh / 2 - totalHeight / 2 + lineHeight / 2;

            lines.forEach((line, i) => {
                ctx.fillText(line, rx + rw / 2, startY + i * lineHeight);
            });

            // Room dimensions
            ctx.font = `${Math.max(9, scale * 0.3)}px monospace`;
            ctx.fillStyle = '#6B7280';
            ctx.fillText(
                `${room.width.toFixed(1)}m × ${room.height.toFixed(1)}m`,
                rx + rw / 2,
                ry + rh - scale * 0.3
            );

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

                    ctx.strokeStyle = '#9CA3AF'; // gray-400
                    ctx.setLineDash([2, 2]);
                    ctx.lineWidth = 1;

                    if (f.type === 'bed') {
                        ctx.strokeRect(0, 0, fw, fh);
                        ctx.strokeRect(fw * 0.1, fh * 0.1, fw * 0.8, fh * 0.2); // pillow
                    } else if (f.type === 'sofa') {
                        ctx.beginPath();
                        ctx.roundRect(0, 0, fw, fh, 2);
                        ctx.stroke();
                    } else if (f.type === 'stove') {
                        ctx.strokeRect(0, 0, fw, fh);
                        ctx.beginPath();
                        ctx.arc(fw / 2, fh / 2, fw / 3, 0, Math.PI * 2);
                        ctx.stroke();
                    } else {
                        ctx.strokeRect(0, 0, fw, fh);
                    }

                    ctx.restore();
                });
            }

            ctx.restore();
        });
    };

    const drawWindows = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
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

            // Draw window frame (light blue CAD style)
            ctx.fillStyle = '#BFDBFE'; // blue-200
            ctx.strokeStyle = '#3B82F6'; // blue-500
            ctx.lineWidth = 1;

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
    };

    const drawDoors = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
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

            // Draw door opening (white gap)
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = Math.max(wall.thickness * scale, 3);
            ctx.beginPath();
            ctx.moveTo(-doorWidthPx / 2, 0);
            ctx.lineTo(doorWidthPx / 2, 0);
            ctx.stroke();

            // Draw door swing arc
            ctx.strokeStyle = '#9CA3AF';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);

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

            ctx.setLineDash([]);
            ctx.restore();
        });
    };

    const drawPlotBoundary = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        const plotWidthPx = plot.width * scale;
        const plotHeightPx = plot.height * scale;

        // Plot boundary line
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(offset.x, offset.y, plotWidthPx, plotHeightPx);
        ctx.setLineDash([]);

        // CAD Dimension Lines
        ctx.font = '12px Courier New';
        ctx.fillStyle = '#64748B';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 0.5;

        // Width Dimension (Bottom)
        const dimY = offset.y + plotHeightPx + 45;
        ctx.beginPath();
        ctx.moveTo(offset.x, dimY);
        ctx.lineTo(offset.x + plotWidthPx, dimY);
        ctx.stroke();
        // Ticks
        ctx.beginPath();
        ctx.moveTo(offset.x, dimY - 5); ctx.lineTo(offset.x, dimY + 5);
        ctx.moveTo(offset.x + plotWidthPx, dimY - 5); ctx.lineTo(offset.x + plotWidthPx, dimY + 5);
        ctx.stroke();
        ctx.fillText(`${plot.width.toFixed(1)}m`, offset.x + plotWidthPx / 2, dimY - 8);

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
        ctx.moveTo(-plotHeightPx / 2, -5); ctx.lineTo(-plotHeightPx / 2, 5);
        ctx.moveTo(plotHeightPx / 2, -5); ctx.lineTo(plotHeightPx / 2, 5);
        ctx.stroke();
        ctx.fillText(`${plot.height.toFixed(1)}m`, 0, -8);
        ctx.restore();
    };

    const drawNorthArrow = (ctx: CanvasRenderingContext2D, offset: { x: number; y: number }) => {
        const arrowSize = 30;
        const arrowX = offset.x + 40;
        const arrowY = offset.y - 40;

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate((plot.orientation * Math.PI) / 180);

        // Arrow
        ctx.strokeStyle = '#1F2937';
        ctx.fillStyle = '#1F2937';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -arrowSize);
        ctx.lineTo(-arrowSize / 4, 0);
        ctx.lineTo(0, -arrowSize / 2);
        ctx.lineTo(arrowSize / 4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // N label
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('N', 0, 5);

        ctx.restore();
    };

    const drawScale = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        const scaleLength = 5; // 5 meters
        const scaleLengthPx = scaleLength * scale;
        const scaleX = offset.x;
        const scaleY = offset.y + plot.height * scale + 30;

        ctx.strokeStyle = '#1F2937';
        ctx.fillStyle = '#1F2937';
        ctx.lineWidth = 2;

        // Scale line
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleY);
        ctx.lineTo(scaleX + scaleLengthPx, scaleY);
        ctx.stroke();

        // End marks
        ctx.beginPath();
        ctx.moveTo(scaleX, scaleY - 5);
        ctx.lineTo(scaleX, scaleY + 5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(scaleX + scaleLengthPx, scaleY - 5);
        ctx.lineTo(scaleX + scaleLengthPx, scaleY + 5);
        ctx.stroke();

        // Label
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${scaleLength}m`, scaleX + scaleLengthPx / 2, scaleY + 8);
    };

    useEffect(() => {
        drawCanvas();
    }, [plot, rooms, walls, activeTemplate, selectedRoomId]);

    // Set canvas ref for export
    useEffect(() => {
        if (canvasRef.current) {
            const fakeStageRef = {
                current: {
                    toDataURL: () => canvasRef.current?.toDataURL() || '',
                },
            } as any;
            setStageRef(fakeStageRef);
        }
    }, []);

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                    {activeTemplate ? activeTemplate.name : 'Floor Plan'}
                </h2>
                <div className="text-sm text-gray-500">
                    {plot.width}m × {plot.height}m • Scale: 1:{Math.round(1 / getScale())}
                </div>
            </div>

            <div ref={containerRef} className="flex justify-center">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border border-gray-300 shadow-sm cursor-crosshair"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />
            </div>

            <div className="mt-4 text-center text-xs text-gray-400">
                Professional CAD-style rendering • Walls, doors, and Vastu zones
            </div>
        </div>
    );
}
