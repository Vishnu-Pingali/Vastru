// components/RoomConfigurator.tsx
// Interactive room selection and configuration

import { useState } from 'react';
import { useStore } from '../store/useStore';

interface RoomConfig {
    id: string;
    type: string;
    label: string;
    targetArea: number;
    hasAttachedBathroom: boolean;
    isCommon: boolean;
}

const ROOM_TYPES = [
    { type: 'master_bedroom', label: 'Master Bedroom', defaultArea: 20, canHaveBathroom: true },
    { type: 'bedroom', label: 'Bedroom', defaultArea: 14, canHaveBathroom: true },
    { type: 'living_room', label: 'Living Room', defaultArea: 25, canHaveBathroom: false },
    { type: 'kitchen', label: 'Kitchen', defaultArea: 12, canHaveBathroom: false },
    { type: 'dining', label: 'Dining Room', defaultArea: 12, canHaveBathroom: false },
    { type: 'puja', label: 'Puja Room', defaultArea: 5, canHaveBathroom: false },
    { type: 'study', label: 'Study Room', defaultArea: 10, canHaveBathroom: false },
    { type: 'toilet', label: 'Common Bathroom', defaultArea: 6, canHaveBathroom: false },
];

export function RoomConfigurator() {
    const { generateDynamicLayout } = useStore();
    const [rooms, setRooms] = useState<RoomConfig[]>([]);
    const [selectedType, setSelectedType] = useState('');

    const addRoom = () => {
        if (!selectedType) return;

        const roomType = ROOM_TYPES.find(r => r.type === selectedType);
        if (!roomType) return;

        const newRoom: RoomConfig = {
            id: `room_${Date.now()}`,
            type: roomType.type,
            label: roomType.label,
            targetArea: roomType.defaultArea,
            hasAttachedBathroom: false,
            isCommon: roomType.type === 'toilet'
        };

        setRooms([...rooms, newRoom]);
        setSelectedType('');
    };

    const removeRoom = (id: string) => {
        setRooms(rooms.filter(r => r.id !== id));
    };

    const updateRoom = (id: string, updates: Partial<RoomConfig>) => {
        setRooms(rooms.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const generatePlan = () => {
        // Convert to API format
        const roomReqs: any[] = [];
        let priority = 1;

        rooms.forEach(room => {
            // Add main room
            roomReqs.push({
                id: room.id,
                type: room.type,
                targetArea: room.targetArea,
                priority: priority++
            });

            // Add attached bathroom if selected
            if (room.hasAttachedBathroom) {
                roomReqs.push({
                    id: `${room.id}_bath`,
                    type: 'toilet',
                    targetArea: 5,
                    priority: priority++,
                    attachedTo: room.id
                });
            }
        });

        generateDynamicLayout(roomReqs);
    };

    const getRoomIcon = (type: string) => {
        const icons: Record<string, string> = {
            master_bedroom: '🛏️',
            bedroom: '🛏️',
            living_room: '🛋️',
            kitchen: '🍳',
            dining: '🍽️',
            puja: '🕉️',
            study: '📚',
            toilet: '🚽'
        };
        return icons[type] || '📦';
    };

    return (
        <div className="glass-card p-6 flex flex-col h-fit max-h-[90vh] relative z-10">
            <div className="flex items-center gap-4 pb-4 border-b border-white/10 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-pink-500/30 ring-2 ring-white/20">
                    🏗️
                </div>
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Architect</h2>
                    <p className="text-xs text-pink-300 tracking-wider uppercase">Generative Topologies</p>
                </div>
            </div>

            {/* Add Room Section */}
            <div className="space-y-3 mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Construct Room</label>
                <div className="flex gap-3">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm text-slate-200 appearance-none font-medium hover:bg-white/10 transition-colors"
                    >
                        <option value="" className="bg-slate-900">Select room class...</option>
                        {ROOM_TYPES.map(rt => (
                            <option key={rt.type} value={rt.type} className="bg-slate-900">
                                {rt.label}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={addRoom}
                        disabled={!selectedType}
                        className="px-6 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-500 transition-all text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-pink-600/20 tracking-wider uppercase"
                    >
                        + Add
                    </button>
                </div>
            </div>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Room Manifest
                    </label>
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-md font-mono">{rooms.length} Units</span>
                </div>

                {rooms.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/20 rounded-xl bg-white/5">
                        <div className="text-3xl mb-3 opacity-50">📐</div>
                        <div className="text-slate-400 text-sm font-medium">Manifest empty.</div>
                        <div className="text-slate-500 text-xs mt-1">Select classes above to begin.</div>
                    </div>
                ) : (
                    rooms.map((room, index) => {
                        const roomType = ROOM_TYPES.find(rt => rt.type === room.type);
                        return (
                            <div
                                key={room.id}
                                className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 backdrop-blur-sm hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-xl border border-white/5 shadow-inner">
                                            {getRoomIcon(room.type)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-white tracking-wide">
                                                {room.label}
                                            </div>
                                            <div className="text-[10px] text-pink-300 font-mono font-bold uppercase tracking-widest mt-0.5">
                                                Priority 0{index + 1}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeRoom(room.id)}
                                        className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
                                        title="Remove constraint"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="p-3 bg-black/30 rounded-lg border border-white/5 grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 absolute top-1.5 left-2 z-10">
                                            Area Target
                                        </label>
                                        <input
                                            type="number"
                                            value={room.targetArea}
                                            onChange={(e) => updateRoom(room.id, { targetArea: Number(e.target.value) })}
                                            min={4}
                                            max={50}
                                            className="w-full pl-2 pr-6 pt-5 pb-1 bg-white/5 rounded border border-white/10 text-sm font-mono focus:ring-2 focus:ring-pink-500 outline-none text-white transition-colors hover:bg-white/10"
                                        />
                                        <span className="absolute right-2 top-5 text-[10px] text-slate-500 font-mono">m²</span>
                                    </div>

                                    {roomType?.canHaveBathroom && (
                                        <div className="flex items-center justify-end h-full pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={room.hasAttachedBathroom}
                                                        onChange={(e) => updateRoom(room.id, { hasAttachedBathroom: e.target.checked })}
                                                        className="w-5 h-5 bg-white/10 border border-white/20 rounded cursor-pointer appearance-none checked:bg-pink-500 transition-all peer"
                                                    />
                                                    <span className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-1 top-0.5 text-xs font-bold">✓</span>
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 group-hover:text-pink-300 transition-colors">Ensuite</span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {room.hasAttachedBathroom && (
                                    <div className="text-[10px] text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-widest font-bold text-center">
                                        + Connected Bath Target (~5m²)
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Generate Button Workspace */}
            <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
                {rooms.length > 0 && (
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 px-1">
                        <span>Total Units: {rooms.length + rooms.filter(r => r.hasAttachedBathroom).length}</span>
                        {rooms.filter(r => r.hasAttachedBathroom).length > 0 && <span className="text-pink-400 text-glow">{rooms.filter(r => r.hasAttachedBathroom).length} Ensuite(s)</span>}
                    </div>
                )}

                <button
                    onClick={generatePlan}
                    disabled={rooms.length === 0}
                    className="w-full px-4 py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl hover:from-pink-500 hover:to-rose-500 transition-all text-sm font-bold shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                    <span className="text-lg">✨</span>
                    <span>Generate Topology</span>
                </button>
            </div>
        </div>
    );
}
