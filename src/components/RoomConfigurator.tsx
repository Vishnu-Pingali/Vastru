import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { RoomReq } from '../utils/autoLayout';
import type { RoomType } from '../types';
import { generateWithHouseDiffusion } from '../utils/houseDiffusion';

interface RoomConfig {
    id: string;
    type: RoomType;
    label: string;
    targetArea: number;
    hasAttachedBathroom: boolean;
    isCommon: boolean;
}

const ROOM_TYPES: Array<{ type: RoomType; label: string; defaultArea: number; canHaveBathroom: boolean }> = [
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
    const { generateDynamicLayout, plot } = useStore();
    const [rooms, setRooms] = useState<RoomConfig[]>([]);
    const [selectedType, setSelectedType] = useState('');
    const [houseDiffusionText, setHouseDiffusionText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const addRoom = () => {
        if (!selectedType) return;
        const roomType = ROOM_TYPES.find((r) => r.type === selectedType);
        if (!roomType) return;

        setRooms([
            ...rooms,
            {
                id: `room_${Date.now()}`,
                type: roomType.type,
                label: roomType.label,
                targetArea: roomType.defaultArea,
                hasAttachedBathroom: false,
                isCommon: roomType.type === 'toilet',
            },
        ]);
        setSelectedType('');
    };

    const removeRoom = (id: string) => setRooms(rooms.filter((r) => r.id !== id));
    const updateRoom = (id: string, updates: Partial<RoomConfig>) =>
        setRooms(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));

    const generatePlan = () => {
        const roomReqs: RoomReq[] = [];
        let priority = 1;

        rooms.forEach((room) => {
            roomReqs.push({
                id: room.id,
                type: room.type,
                targetArea: room.targetArea,
                priority: priority++,
            });

            if (room.hasAttachedBathroom) {
                roomReqs.push({
                    id: `${room.id}_bath`,
                    type: 'toilet',
                    targetArea: 5,
                    priority: priority++,
                });
            }
        });

        generateDynamicLayout(roomReqs);
    };

    const generateExamplePlan = () => {
        generateDynamicLayout([
            { id: 'ai_master', type: 'master_bedroom', targetArea: 20, priority: 1 },
            { id: 'ai_bedroom', type: 'bedroom', targetArea: 14, priority: 2 },
            { id: 'ai_living', type: 'living_room', targetArea: 24, priority: 3 },
            { id: 'ai_kitchen', type: 'kitchen', targetArea: 10, priority: 4 },
            { id: 'ai_dining', type: 'dining', targetArea: 10, priority: 5 },
            { id: 'ai_puja', type: 'puja', targetArea: 5, priority: 6 },
            { id: 'ai_toilet', type: 'toilet', targetArea: 6, priority: 7 },
        ]);
    };

    const generateWithHouseDiffusionAI = async () => {
        if (!houseDiffusionText.trim()) return;

        setIsGenerating(true);
        try {
            await generateWithHouseDiffusion(houseDiffusionText);
            alert('HouseDiffusion generation completed! Check the backend for the generated floorplan.');
        } catch (error) {
            alert(`HouseDiffusion generation failed: ${error}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const getRoomIcon = (type: string) => {
        const icons: Record<string, string> = {
            master_bedroom: 'MB',
            bedroom: 'BR',
            living_room: 'LV',
            kitchen: 'KT',
            dining: 'DN',
            puja: 'PJ',
            study: 'ST',
            toilet: 'WC',
        };
        return icons[type] || 'RM';
    };

    return (
        <div className="glass-card p-5 md:p-6 flex flex-col h-fit 2xl:max-h-[calc(100vh-3rem)] relative z-10">
            <div className="flex items-center gap-4 pb-4 border-b border-[#d9ceb3] mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#4f4428] flex items-center justify-center text-[#fff8da] text-lg font-bold shadow-sm">
                    AI
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-[#4f4428]">Architect</h2>
                    <p className="text-xs text-[#8a7b53] tracking-[0.28em] uppercase">Generative Topologies</p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <label className="block text-xs font-bold text-[#8a7b53] uppercase tracking-widest">Construct Room</label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="flex-1 px-4 py-3 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl focus:ring-2 focus:ring-[#146d71] outline-none text-sm text-[#4f4428] appearance-none font-medium"
                    >
                        <option value="" className="bg-[#fbf6e8]">Select room class...</option>
                        {ROOM_TYPES.map((rt) => (
                            <option key={rt.type} value={rt.type} className="bg-[#fbf6e8]">
                                {rt.label}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={addRoom}
                        disabled={!selectedType}
                        className="px-6 py-3 bg-[#146d71] text-white rounded-xl hover:bg-[#0f5d61] transition-all text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed tracking-wider uppercase sm:min-w-[120px]"
                    >
                        Add
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#8a7b53] uppercase tracking-widest">Room Manifest</label>
                    <span className="text-xs bg-[#efe6c6] text-[#146d71] px-2 py-1 rounded-md font-mono">{rooms.length} Units</span>
                </div>

                {rooms.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-[#d8cab0] rounded-xl bg-[#fbf6e8]">
                        <div className="text-[#7a6d46] text-sm font-medium">Manifest empty.</div>
                        <div className="text-[#8a7b53] text-xs mt-1">Select classes above to begin.</div>
                    </div>
                ) : (
                    rooms.map((room, index) => {
                        const roomType = ROOM_TYPES.find((rt) => rt.type === room.type);
                        return (
                            <div key={room.id} className="p-4 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#efe6c6] flex items-center justify-center text-xs font-bold border border-[#d8cab0] shadow-inner text-[#4f4428]">
                                            {getRoomIcon(room.type)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-[#4f4428] tracking-wide">{room.label}</div>
                                            <div className="text-[10px] text-[#8a7b53] font-mono font-bold uppercase tracking-widest mt-0.5">
                                                Priority 0{index + 1}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeRoom(room.id)}
                                        className="w-8 h-8 rounded-full bg-[#efe6c6] text-[#8a5b42] flex items-center justify-center hover:bg-[#d4b48f] hover:text-white transition-all"
                                        title="Remove constraint"
                                    >
                                        x
                                    </button>
                                </div>

                                <div className="p-3 bg-[#f4ecda] rounded-lg border border-[#e0d5b9] grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-[9px] text-[#8a7b53] uppercase tracking-widest font-bold mb-1.5 absolute top-1.5 left-2 z-10">
                                            Area Target
                                        </label>
                                        <input
                                            type="number"
                                            value={room.targetArea}
                                            onChange={(e) => updateRoom(room.id, { targetArea: Number(e.target.value) })}
                                            min={4}
                                            max={50}
                                            className="w-full pl-2 pr-6 pt-5 pb-1 bg-[#fbf6e8] rounded border border-[#d8cab0] text-sm font-mono focus:ring-2 focus:ring-[#146d71] outline-none text-[#4f4428] transition-colors"
                                        />
                                        <span className="absolute right-2 top-5 text-[10px] text-[#8a7b53] font-mono">m²</span>
                                    </div>

                                    {roomType?.canHaveBathroom && (
                                        <div className="flex items-center justify-end h-full pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={room.hasAttachedBathroom}
                                                        onChange={(e) => updateRoom(room.id, { hasAttachedBathroom: e.target.checked })}
                                                        className="w-5 h-5 bg-white border border-[#d8cab0] rounded cursor-pointer appearance-none checked:bg-[#146d71] transition-all peer"
                                                    />
                                                    <span className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-1 top-0.5 text-xs font-bold">✓</span>
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-[#8a7b53] group-hover:text-[#146d71] transition-colors">
                                                    Ensuite
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {room.hasAttachedBathroom && (
                                    <div className="text-[10px] text-[#146d71] bg-[#efe6c6] px-3 py-1.5 rounded-lg border border-[#d8cab0] uppercase tracking-widest font-bold text-center">
                                        + Connected Bath Target (~5m²)
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#d9ceb3] space-y-3">
                <div className="space-y-3">
                    <label className="block text-xs font-bold text-[#8a7b53] uppercase tracking-widest">AI Floorplan Generation</label>
                    <textarea
                        value={houseDiffusionText}
                        onChange={(e) => setHouseDiffusionText(e.target.value)}
                        placeholder="Describe your dream home... e.g., '3 bedroom house with kitchen next to living room'"
                        className="w-full px-4 py-3 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl focus:ring-2 focus:ring-[#146d71] outline-none text-sm text-[#4f4428] resize-none transition-colors"
                        rows={3}
                    />
                    <button
                        onClick={generateWithHouseDiffusionAI}
                        disabled={!houseDiffusionText.trim() || isGenerating}
                        className="w-full px-4 py-3 bg-[#4f4428] text-white rounded-xl hover:bg-[#3f351e] transition-all text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest"
                    >
                        <span>{isGenerating ? 'Generating...' : 'Generate with HouseDiffusion'}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] uppercase tracking-widest text-[#8a7b53] font-bold">
                    <div className="p-3 bg-[#fbf6e8] rounded-xl border border-[#d8cab0]">
                        Current Plot
                        <br />
                        <span className="text-[#4f4428] text-sm font-medium">{plot.width}m × {plot.height}m</span>
                    </div>
                    <div className="p-3 bg-[#fbf6e8] rounded-xl border border-[#d8cab0]">
                        Orientation
                        <br />
                        <span className="text-[#4f4428] text-sm font-medium">{plot.orientation}°</span>
                    </div>
                </div>

                {rooms.length > 0 && (
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[#8a7b53] tracking-widest mb-1 px-1">
                        <span>Total Units: {rooms.length + rooms.filter((r) => r.hasAttachedBathroom).length}</span>
                        {rooms.filter((r) => r.hasAttachedBathroom).length > 0 && (
                            <span className="text-[#146d71] text-glow">
                                {rooms.filter((r) => r.hasAttachedBathroom).length} Ensuite(s)
                            </span>
                        )}
                    </div>
                )}

                <button
                    onClick={generatePlan}
                    disabled={rooms.length === 0}
                    className="w-full px-4 py-4 bg-[#146d71] text-white rounded-xl hover:bg-[#0f5d61] transition-all text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                    <span>Generate Topology</span>
                </button>

                <button
                    onClick={generateExamplePlan}
                    className="w-full px-4 py-4 bg-[#fbf6e8] text-[#4f4428] rounded-xl border border-[#d8cab0] hover:bg-[#f4ebd7] transition-all text-sm font-semibold shadow-inner flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                    <span>Generate Example AI Plan</span>
                </button>
            </div>
        </div>
    );
}
