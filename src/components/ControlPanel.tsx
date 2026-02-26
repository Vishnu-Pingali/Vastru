// components/ControlPanel.tsx
// Control panel for template selection, plot settings, and exports

import React, { useRef, useState } from 'react';
import { useStore, getAvailableTemplates } from '../store/useStore';
import { getComplianceStatus } from '../utils/vastuUtils';
import { exportPNG, exportPDF, exportJSON, importJSON } from '../utils/exportUtils';

export function ControlPanel() {
    const {
        plot,
        vastuMode,
        rooms,
        complianceReport,
        stageRef,
        activeTemplate,
        editMode,
        setEditMode,
        loadTemplate,
        setPlotSize,
        setOrientation,
        setVastuMode,
        clearAll,
        getProjectState,
        loadProject,
        showToastMessage,
        selectedRoomId,
    } = useStore();

    const [showExportMenu, setShowExportMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const templates = getAvailableTemplates();

    const handleExport = async (format: 'png' | 'pdf' | 'json') => {
        setShowExportMenu(false);

        try {
            if (format === 'png') {
                await exportPNG(stageRef!);
                showToastMessage('PNG exported successfully!');
            } else if (format === 'pdf') {
                const projectState = getProjectState();
                await exportPDF(stageRef!, projectState, complianceReport);
                showToastMessage('PDF exported successfully!');
            } else if (format === 'json') {
                const projectState = getProjectState();
                exportJSON(projectState);
                showToastMessage('JSON exported successfully!');
            }
        } catch (error) {
            showToastMessage('Export failed: ' + (error as Error).message);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const projectState = await importJSON(file);
            loadProject(projectState);
        } catch (error) {
            showToastMessage('Import failed: ' + (error as Error).message);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
    const complianceStatus = getComplianceStatus(complianceReport.totalScore);

    return (
        <aside className="w-96 bg-white rounded-lg shadow-lg p-5 space-y-5 border border-gray-200 h-fit max-h-screen overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-gray-900 flex items-center justify-center text-white text-2xl">
                    🏛️
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">VāstuCAD</h1>
                    <p className="text-xs text-gray-500">Civil-grade planning tool</p>
                </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Template</h2>

                <select
                    value={activeTemplate?.id || ''}
                    onChange={(e) => e.target.value && loadTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
                >
                    <option value="">Select a template...</option>
                    {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                            {template.name} ({template.bedrooms}BHK - {template.facing})
                        </option>
                    ))}
                </select>

                {activeTemplate && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="font-semibold text-slate-900">{activeTemplate.name}</div>
                        <div className="text-slate-600">{activeTemplate.description}</div>
                        <div className="text-slate-500">
                            {activeTemplate.bedrooms}BHK • {activeTemplate.facing} Facing • {activeTemplate.rooms.length} rooms
                        </div>
                    </div>
                )}
            </div>

            {/* Plot Settings */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Plot Settings</h2>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Width (m)</label>
                        <input
                            type="number"
                            value={plot.width}
                            onChange={(e) => setPlotSize(Number(e.target.value), plot.height)}
                            min={8}
                            max={50}
                            step={0.5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Height (m)</label>
                        <input
                            type="number"
                            value={plot.height}
                            onChange={(e) => setPlotSize(plot.width, Number(e.target.value))}
                            min={8}
                            max={50}
                            step={0.5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Orientation: {plot.orientation}°
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={359}
                        value={plot.orientation}
                        onChange={(e) => setOrientation(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0° (N)</span>
                        <span>90° (E)</span>
                        <span>180° (S)</span>
                        <span>270° (W)</span>
                    </div>
                </div>
            </div>

            {/* Edit Mode */}
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Edit Mode</h2>
                <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                    <button
                        onClick={() => setEditMode('template')}
                        disabled={!activeTemplate}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${editMode === 'template'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        🔒 Template
                    </button>
                    <button
                        onClick={() => setEditMode('creative')}
                        disabled={!activeTemplate}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${editMode === 'creative'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        🎨 Creative
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    {editMode === 'template'
                        ? 'Resize rooms within limits'
                        : 'Move walls (advanced)'}
                </p>
            </div>

            {/* Separation/Whitespace */}
            <div className="py-2"></div>

            {/* Vastu Mode */}
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Vastu Mode</h2>
                <select
                    value={vastuMode}
                    onChange={(e) => setVastuMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none text-sm"
                >
                    <option value="strict">Strict (Block forbidden placements)</option>
                    <option value="soft">Soft (Warn but allow)</option>
                    <option value="off">Off (No validation)</option>
                </select>
            </div>

            {/* Actions */}
            <div className="space-y-2">
                <button
                    onClick={clearAll}
                    disabled={!activeTemplate}
                    className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear Template
                </button>
            </div>

            {/* Export/Import */}
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Export / Import</h2>

                <div className="relative">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={!activeTemplate}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>📥</span>
                        <span>Export Plan</span>
                    </button>

                    {showExportMenu && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <button
                                onClick={() => handleExport('png')}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100"
                            >
                                🖼️ Export as PNG
                            </button>
                            <button
                                onClick={() => handleExport('pdf')}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100"
                            >
                                📄 Export as PDF
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                            >
                                💾 Export as JSON
                            </button>
                        </div>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                    <span>📤</span>
                    <span>Import JSON</span>
                </button>
            </div>

            {/* Compliance Score */}
            {activeTemplate && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Vastu Compliance</h2>
                        <span className={`text-2xl font-bold ${complianceStatus.color}`}>
                            {complianceReport.totalScore}%
                        </span>
                    </div>

                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${complianceReport.totalScore >= 80
                                ? 'bg-green-500'
                                : complianceReport.totalScore >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                            style={{ width: `${complianceReport.totalScore}%` }}
                        />
                    </div>

                    <p className="text-xs text-gray-600 text-center">
                        {complianceStatus.text} - {complianceReport.hardViolations.length} violation(s)
                    </p>

                    {complianceReport.hardViolations.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            ⚠️ {complianceReport.hardViolations.length} room(s) in forbidden zones
                        </div>
                    )}
                </div>
            )}

            {/* Selected Room Info */}
            {selectedRoom && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    <div className="font-semibold text-slate-900 mb-1">Selected Room</div>
                    <div className="text-slate-700">{selectedRoom.label}</div>
                    <div className="text-xs text-slate-600 mt-1">
                        Zone: {selectedRoom.zone} • Score: {selectedRoom.score}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {selectedRoom.width.toFixed(1)}m × {selectedRoom.height.toFixed(1)}m
                    </div>
                </div>
            )}
        </aside>
    );
}
