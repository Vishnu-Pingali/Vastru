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

        // Clear canvas (Dark Cyberpunk Blueprint Theme)
        ctx.fillStyle = '#060B19';
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

        ctx.strokeStyle = '#1E293B'; // Dark slate
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
        ctx.strokeStyle = '#0F172A';
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
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]);

        offsetZones.forEach((zone) => {
            const zx = offset.x + zone.x * scale;
            const zy = offset.y + zone.y * scale;
            const zw = zone.w * scale;
            const zh = zone.h * scale;

            // Zone boundary
            ctx.strokeRect(zx, zy, zw, zh);

            // Zone label
            ctx.save();
            ctx.fillStyle = '#64748B';
            ctx.font = `bold ${Math.max(12, scale * 0.5)}px 'Outfit', sans-serif`;
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

            // Wall color: brighter blue for external, dimmer for internal
            ctx.strokeStyle = wall.isExternal ? '#38BDF8' : '#0284C7';
            ctx.lineWidth = Math.max(thicknessPx, wall.isExternal ? 3 : 2);
            ctx.lineCap = 'square';

            // Neon glow for external walls
            if (wall.isExternal) {
                ctx.shadowColor = '#38BDF8';
                ctx.shadowBlur = 10;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.shadowBlur = 0; // reset
        });
    };

    const drawRooms = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        rooms.forEach((room) => {
            const rx = offset.x + room.x * scale;
            const ry = offset.y + room.y * scale;
            const rw = room.width * scale;
            const rh = room.height * scale;

            const isSelected = room.id === selectedRoomId;

            // Room fill (transparent dark blue)
            ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.03)';
            ctx.fillRect(rx, ry, rw, rh);

            // Room border (compliance color)
            let borderRGB = room.score >= 80 ? '52, 211, 153' : // emerald
                room.score >= 60 ? '251, 191, 36' : // amber
                    room.score >= 30 ? '249, 115, 22' : // orange
                        '2ef, 68, 68'; // red

            ctx.strokeStyle = isSelected ? '#38BDF8' : `rgb(${borderRGB})`;
            ctx.lineWidth = isSelected ? 3 : 1.5;

            if (isSelected) {
                ctx.shadowColor = '#38BDF8';
                ctx.shadowBlur = 15;
            }
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.shadowBlur = 0;

            // Room label
            ctx.save();
            ctx.fillStyle = '#F8FAFC';
            ctx.font = `bold ${Math.max(12, scale * 0.4)}px 'Outfit', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const lines = room.label.split('\n');
            const lineHeight = Math.max(14, scale * 0.5);
            const totalHeight = lines.length * lineHeight;
            const startY = ry + rh / 2 - totalHeight / 2 + lineHeight / 2;

            lines.forEach((line, i) => {
                ctx.fillText(line.toUpperCase(), rx + rw / 2, startY + i * lineHeight);
            });

            // Room dimensions
            ctx.font = `${Math.max(10, scale * 0.3)}px monospace`;
            ctx.fillStyle = '#94A3B8';
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

                    ctx.strokeStyle = '#3B82F6'; // blue-500
                    ctx.setLineDash([2, 2]);
                    ctx.lineWidth = 1.5;

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

            // Draw window frame (cyberpunk style)
            ctx.fillStyle = '#0284C7';
            ctx.strokeStyle = '#7DD3FC';
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

            // Draw door opening (dark gap)
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);

            ctx.strokeStyle = '#060B19'; // background color to create gap
            ctx.lineWidth = Math.max(wall.thickness * scale + 2, 4);
            ctx.beginPath();
            ctx.moveTo(-doorWidthPx / 2, 0);
            ctx.lineTo(doorWidthPx / 2, 0);
            ctx.stroke();

            // Draw door swing arc
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);

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
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#F8FAFC'; // white door
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
    };

    const drawPlotBoundary = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        const plotWidthPx = plot.width * scale;
        const plotHeightPx = plot.height * scale;

        // Plot boundary line
        ctx.strokeStyle = '#818CF8';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 10]);
        ctx.strokeRect(offset.x, offset.y, plotWidthPx, plotHeightPx);
        ctx.setLineDash([]);

        // CAD Dimension Lines
        ctx.font = 'bold 12px Courier New';
        ctx.fillStyle = '#A5B4FC';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#4F46E5';
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
    };

    const drawNorthArrow = (ctx: CanvasRenderingContext2D, offset: { x: number; y: number }) => {
        const arrowSize = 35;
        const arrowX = offset.x + 50;
        const arrowY = offset.y - 50;

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate((plot.orientation * Math.PI) / 180);

        // Arrow
        ctx.strokeStyle = '#E2E8F0';
        ctx.fillStyle = '#E2E8F0';
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
        ctx.strokeStyle = '#475569';
        ctx.stroke();

        // N label
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 16px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('N', 0, 8);

        ctx.restore();
    };

    const drawScale = (ctx: CanvasRenderingContext2D, scale: number, offset: { x: number; y: number }) => {
        const scaleLength = 5; // 5 meters
        const scaleLengthPx = scaleLength * scale;
        const scaleX = offset.x;
        const scaleY = offset.y + plot.height * scale + 30;

        ctx.strokeStyle = '#94A3B8';
        ctx.fillStyle = '#94A3B8';
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
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(`Scale: ${scaleLength}m`, scaleX + scaleLengthPx / 2, scaleY + 12);
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
        <div className="glass-card p-6 flex flex-col relative z-10 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl">
                        📐
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">
                            {activeTemplate ? activeTemplate.name : 'Topology Blueprint'}
                        </h2>
                        <div className="text-xs text-indigo-300 uppercase tracking-widest mt-1">
                            {plot.width}m × {plot.height}m / <span className="opacity-70">Scale 1:{Math.round(1 / getScale())}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 text-[10px] font-mono text-emerald-400 font-bold">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                        LIVE RENDER
                    </div>
                </div>
            </div>

            <div ref={containerRef} className="flex justify-center w-full bg-black/50 rounded-2xl p-4 border border-white/5 relative group">
                {/* Scanner line effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-50 animate-[float_3s_ease-in-out_infinite] blur-sm"></div>

                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border border-white/10 shadow-2xl rounded-xl cursor-crosshair object-contain w-full h-[65vh]"
                />
            </div>

            <div className="mt-5 text-center text-xs text-slate-500 uppercase tracking-widest font-bold flex justify-center items-center gap-6">
                <span><span className="w-3 h-3 inline-block bg-sky-400 align-middle mr-2 rounded-sm blur-[1px]"></span> Structure</span>
                <span><span className="w-3 h-3 inline-block bg-white align-middle mr-2 rounded-sm"></span> Acess points</span>
                <span><span className="w-3 h-3 inline-block border border-dashed border-slate-500 align-middle mr-2 rounded-sm"></span> Vastu Grid / Energy field</span>
            </div>
        </div>
    );
}
