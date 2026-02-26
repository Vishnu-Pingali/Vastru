// components/PlanHTML.tsx
// DOM-based interactive plan for cleaner "blueprint" aesthetics
// Replaces Canvas for users who prefer HTML/CSS rendering

import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getRoomLabel } from '../utils/vastuUtils';
import { getRoomColor } from '../utils/vastuUtils';

export function PlanHTML() {
    const { plot, rooms, moveRoom, selectRoom, selectedRoomId, viewMode, setStageRef } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingInfo, setDraggingInfo] = useState<{ id: string; startX: number; startY: number; initialRoomX: number; initialRoomY: number } | null>(null);

    // Canvas dimensions (internal logical size)
    // We'll use CSS scale or just sizing to fit
    const maxWidth = 900;
    const maxHeight = 600;

    // Calculate scale to fit plot in container
    const scale = Math.min(maxWidth / plot.width, maxHeight / plot.height) * 0.95;
    const displayWidth = plot.width * scale;
    const displayHeight = plot.height * scale;

    // Handle Dragging
    const handlePointerDown = (e: React.PointerEvent, roomId: string, rx: number, ry: number) => {
        e.preventDefault();
        e.stopPropagation();
        selectRoom(roomId);

        // Only allow drag in interactive mode or if we decide blueprint is editable
        // The user wants "layout plan like this", usually static-ish, but let's allow edit.
        if (viewMode === 'interactive' || true) {
            setDraggingInfo({
                id: roomId,
                startX: e.clientX,
                startY: e.clientY,
                initialRoomX: rx,
                initialRoomY: ry
            });
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingInfo) return;
        e.preventDefault();

        const dx = (e.clientX - draggingInfo.startX) / scale;
        const dy = (e.clientY - draggingInfo.startY) / scale;

        const newX = draggingInfo.initialRoomX + dx;
        const newY = draggingInfo.initialRoomY + dy;

        // Find room to get dimensions for clamping
        const room = rooms.find(r => r.id === draggingInfo.id);
        if (room) {
            const constrainedX = Math.max(0, Math.min(newX, plot.width - room.width));
            const constrainedY = Math.max(0, Math.min(newY, plot.height - room.height));
            moveRoom(draggingInfo.id, constrainedX, constrainedY);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (draggingInfo) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            setDraggingInfo(null);
        }
    };

    // Unset stage ref since we aren't using Konva
    useEffect(() => {
        // We could potentially polyfill a "stageRef" that has toDataURL using html2canvas if needed
        // For now, allow it to be null
        // setStageRef(null); 
    }, []);

    // Blueprint Style Helpers
    const isBlueprint = true; // Always force blueprint look since user requested "like that" image

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 select-none">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-bold text-gray-800">Layout Plan (Start View)</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-white border border-black"></span>
                        <span>Wall</span>
                    </div>
                    <span>Scale: 1:{Math.round(100 / scale)}</span>
                </div>
            </div>

            <div
                className="relative bg-white border-2 border-black mx-auto overflow-hidden shadow-sm"
                style={{
                    width: displayWidth,
                    height: displayHeight,
                    boxShadow: '0 0 0 1px black' // Double line effect
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Grid/Background Patterns could go here */}

                {/* Rooms */}
                {rooms.map(room => {
                    const isSelected = room.id === selectedRoomId;

                    // Dimensions in Pixels relative to container
                    const rLeft = room.x * scale;
                    const rTop = room.y * scale;
                    const rWidth = room.width * scale;
                    const rHeight = room.height * scale;

                    // Styling
                    // Image shows: White background, Black borders, Text centralized

                    return (
                        <div
                            key={room.id}
                            onPointerDown={(e) => handlePointerDown(e, room.id, room.x, room.y)}
                            style={{
                                position: 'absolute',
                                left: rLeft,
                                top: rTop,
                                width: rWidth,
                                height: rHeight,
                                backgroundColor: 'white',
                                border: isSelected ? '2px solid #0F62FE' : '3px solid #4B5563', // Thicker greyish border like the drawing
                                zIndex: isSelected ? 10 : 1,
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px',
                                cursor: 'move',
                                transition: draggingInfo?.id === room.id ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
                            }}
                            className="group hover:bg-gray-50"
                        >
                            {/* Inner white line for "Double Wall" effect */}
                            <div className="absolute inset-0 pointer-events-none border border-white opacity-50"></div>

                            {/* Room Label */}
                            <span
                                className="text-gray-900 font-bold uppercase tracking-wider text-center leading-tight pointer-events-none whitespace-pre-line"
                                style={{
                                    fontSize: Math.max(9, Math.min(rWidth * 0.15, rHeight * 0.25)) + 'px',
                                    fontFamily: 'monospace' // more technical look
                                }}
                            >
                                {room.customLabel || getRoomLabel(room.type)}
                            </span>
                            <span className="text-[10px] font-medium text-gray-800 pointer-events-none mt-1" style={{ fontFamily: 'monospace' }}>
                                {Math.round(room.width * 2)}'-0" × {Math.round(room.height * 2)}'-0"
                            </span>

                            {/* Corner markers (Architectural style) - darker */}
                            <div className="absolute -top-[3px] -left-[3px] w-1.5 h-1.5 bg-gray-700"></div>
                            <div className="absolute -top-[3px] -right-[3px] w-1.5 h-1.5 bg-gray-700"></div>
                            <div className="absolute -bottom-[3px] -left-[3px] w-1.5 h-1.5 bg-gray-700"></div>
                            <div className="absolute -bottom-[3px] -right-[3px] w-1.5 h-1.5 bg-gray-700"></div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 text-center text-xs text-gray-400">
                Interactive Plan • Drag rooms to rearrange • {plot.width}m × {plot.height}m Plot
            </div>
        </div>
    );
}
