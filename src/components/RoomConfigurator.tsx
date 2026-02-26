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
        <div className="bg-white rounded-lg shadow-lg p-5 space-y-4 border border-gray-200">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl">
                    🏗️
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Room Configurator</h2>
                    <p className="text-xs text-gray-500">Design your custom floor plan</p>
                </div>
            </div>

            {/* Add Room Section */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Add Room</label>
                <div className="flex gap-2">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                    >
                        <option value="">Select room type...</option>
                        {ROOM_TYPES.map(rt => (
                            <option key={rt.type} value={rt.type}>
                                {rt.label}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={addRoom}
                        disabled={!selectedType}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        + Add
                    </button>
                </div>
            </div>

            {/* Room List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                <label className="block text-sm font-semibold text-gray-700">
                    Configured Rooms ({rooms.length})
                </label>

                {rooms.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No rooms added yet. Start by selecting a room type above.
                    </div>
                ) : (
                    rooms.map((room, index) => {
                        const roomType = ROOM_TYPES.find(rt => rt.type === room.type);
                        return (
                            <div
                                key={room.id}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{getRoomIcon(room.type)}</span>
                                        <div>
                                            <div className="font-semibold text-sm text-gray-900">
                                                {room.label}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Priority: {index + 1}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeRoom(room.id)}
                                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">
                                            Target Area (m²)
                                        </label>
                                        <input
                                            type="number"
                                            value={room.targetArea}
                                            onChange={(e) => updateRoom(room.id, { targetArea: Number(e.target.value) })}
                                            min={4}
                                            max={50}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    {roomType?.canHaveBathroom && (
                                        <div className="flex items-end">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={room.hasAttachedBathroom}
                                                    onChange={(e) => updateRoom(room.id, { hasAttachedBathroom: e.target.checked })}
                                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                />
                                                <span className="text-xs text-gray-700">Attached Bath</span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {room.hasAttachedBathroom && (
                                    <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                        ✓ Will include attached bathroom (~5m²)
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Generate Button */}
            <button
                onClick={generatePlan}
                disabled={rooms.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <span>🤖</span>
                <span>Generate Floor Plan with AI</span>
            </button>

            {rooms.length > 0 && (
                <div className="text-xs text-gray-500 text-center">
                    {rooms.filter(r => r.hasAttachedBathroom).length > 0 && (
                        <div className="text-indigo-600 font-medium">
                            Including {rooms.filter(r => r.hasAttachedBathroom).length} attached bathroom(s)
                        </div>
                    )}
                    Total rooms: {rooms.length + rooms.filter(r => r.hasAttachedBathroom).length}
                </div>
            )}
        </div>
    );
}
