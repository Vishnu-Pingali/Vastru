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
        <aside className="w-[380px] glass-card p-6 space-y-6 flex flex-col h-fit max-h-[90vh] overflow-y-auto overflow-x-hidden relative">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/30 ring-2 ring-white/20">
                    ✨
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Controls</h1>
                    <p className="text-xs text-indigo-300 tracking-wider">AESTHETIC & AI DRIVEN</p>
                </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Topology Template</h2>

                <select
                    value={activeTemplate?.id || ''}
                    onChange={(e) => e.target.value && loadTemplate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-slate-200 backdrop-blur-md transition-all hover:bg-white/10 appearance-none"
                >
                    <option value="" className="bg-slate-900 text-white">Select a baseline template...</option>
                    {templates.map((template) => (
                        <option key={template.id} value={template.id} className="bg-slate-900 text-white py-2">
                            {template.name} ({template.bedrooms}BHK - {template.facing} Facing)
                        </option>
                    ))}
                </select>

                {activeTemplate && (
                    <div className="p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-xl text-xs space-y-2 backdrop-blur-md">
                        <div className="font-bold text-indigo-200 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span> {activeTemplate.name}
                        </div>
                        <div className="text-slate-400 leading-relaxed">{activeTemplate.description}</div>
                        <div className="flex items-center gap-3 pt-2 text-indigo-300 font-medium">
                            <span>🛏️ {activeTemplate.bedrooms}BHK</span>
                            <span>🧭 {activeTemplate.facing} Facing</span>
                            <span>📐 {activeTemplate.rooms.length} Rooms</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Plot Settings */}
            <div className="space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plot Dimensions</h2>

                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider absolute top-2 left-3 z-10">Width</label>
                        <input
                            type="number"
                            value={plot.width}
                            onChange={(e) => setPlotSize(Number(e.target.value), plot.height)}
                            min={8}
                            max={50}
                            step={0.5}
                            className="w-full pl-3 pr-8 pt-6 pb-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-white font-medium hover:bg-white/10 transition-all font-mono"
                        />
                        <span className="absolute right-3 top-6 text-xs text-slate-500 font-mono">m</span>
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider absolute top-2 left-3 z-10">Length</label>
                        <input
                            type="number"
                            value={plot.height}
                            onChange={(e) => setPlotSize(plot.width, Number(e.target.value))}
                            min={8}
                            max={50}
                            step={0.5}
                            className="w-full pl-3 pr-8 pt-6 pb-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-white font-medium hover:bg-white/10 transition-all font-mono"
                        />
                        <span className="absolute right-3 top-6 text-xs text-slate-500 font-mono">m</span>
                    </div>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Compass
                        </label>
                        <span className="text-sm font-bold text-indigo-300 font-mono bg-indigo-900/30 px-2 py-0.5 rounded">{plot.orientation}°</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={359}
                        value={plot.orientation}
                        onChange={(e) => setOrientation(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">
                        <span className={plot.orientation < 45 || plot.orientation > 315 ? 'text-indigo-400' : ''}>N(0)</span>
                        <span className={plot.orientation >= 45 && plot.orientation < 135 ? 'text-indigo-400' : ''}>E(90)</span>
                        <span className={plot.orientation >= 135 && plot.orientation < 225 ? 'text-indigo-400' : ''}>S(180)</span>
                        <span className={plot.orientation >= 225 && plot.orientation <= 315 ? 'text-indigo-400' : ''}>W(270)</span>
                    </div>
                </div>
            </div>

            {/* Edit Mode */}
            <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interaction Mode</h2>
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 shadow-inner">
                    <button
                        onClick={() => setEditMode('template')}
                        disabled={!activeTemplate}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all tracking-wider uppercase ${editMode === 'template'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        [ Rigid ]
                    </button>
                    <button
                        onClick={() => setEditMode('creative')}
                        disabled={!activeTemplate}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all tracking-wider uppercase ${editMode === 'creative'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        [ Fluid ]
                    </button>
                </div>
            </div>

            <hr className="border-white/10 border-t-2" />

            {/* Vastu Mode */}
            <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                    <span>Vastu Engine</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                </h2>
                <select
                    value={vastuMode}
                    onChange={(e) => setVastuMode(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-slate-200 appearance-none font-medium hover:bg-white/10 transition-colors"
                >
                    <option value="strict" className="bg-slate-900">Strict Enforcement 🔴</option>
                    <option value="soft" className="bg-slate-900">Soft Guidelines 🟡</option>
                    <option value="off" className="bg-slate-900">Disabled ⚪</option>
                </select>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={clearAll}
                    disabled={!activeTemplate}
                    className="col-span-2 px-4 py-3 bg-white/5 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-all text-sm font-bold tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Clear Workspace
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="relative col-span-1">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={!activeTemplate}
                        className="w-full px-4 py-3 bg-indigo-600 border border-indigo-400/50 rounded-xl hover:bg-indigo-500 transition-all text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-30 text-white uppercase tracking-wider"
                    >
                        <span>📥 Export</span>
                    </button>

                    {showExportMenu && (
                        <div className="absolute bottom-full mb-2 left-0 right-[-100%] bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                            <button
                                onClick={() => handleExport('png')}
                                className="w-full px-5 py-3 text-left hover:bg-indigo-600 text-sm border-b border-white/5 text-white font-medium flex items-center gap-3 transition-colors"
                            >
                                <span className="text-lg">🖼️</span> High-Res PNG
                            </button>
                            <button
                                onClick={() => handleExport('pdf')}
                                className="w-full px-5 py-3 text-left hover:bg-indigo-600 text-sm border-b border-white/5 text-white font-medium flex items-center gap-3 transition-colors"
                            >
                                <span className="text-lg">📄</span> Blueprint PDF
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                className="w-full px-5 py-3 text-left hover:bg-indigo-600 text-sm text-white font-medium flex items-center gap-3 transition-colors"
                            >
                                <span className="text-lg">💾</span> State JSON
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-bold flex items-center justify-center gap-2 text-slate-300 uppercase tracking-wider col-span-1"
                >
                    <span>📤 Import</span>
                </button>
            </div>

            {/* Compliance Score */}
            {activeTemplate && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/30 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-slate-300 tracking-widest uppercase">Compliance Score</h2>
                        <span className={`text-3xl font-black tracking-tighter ${complianceReport.totalScore >= 80 ? 'text-emerald-400 text-glow' :
                                complianceReport.totalScore >= 60 ? 'text-amber-400 text-glow' : 'text-red-400 text-glow'
                            }`}>
                            {complianceReport.totalScore}<span className="text-lg opacity-60">%</span>
                        </span>
                    </div>

                    <div className="flex-1 bg-black/60 rounded-full h-2 overflow-hidden border border-white/5 ring-1 ring-white/5">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${complianceReport.totalScore >= 80
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                                : complianceReport.totalScore >= 60
                                    ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                                    : 'bg-gradient-to-r from-red-600 to-red-400'
                                }`}
                            style={{ width: `${complianceReport.totalScore}%` }}
                        />
                    </div>

                    <p className="text-xs text-slate-400 text-center font-medium">
                        <span className={complianceReport.totalScore >= 80 ? 'text-emerald-300' : 'text-amber-300'}>{complianceStatus.text}</span> • {complianceReport.hardViolations.length} Blockers
                    </p>
                </div>
            )}

            {/* Selected Room Info */}
            {selectedRoom && (
                <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl text-sm backdrop-blur-md shadow-lg">
                    <div className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div> Selection Matrix
                    </div>
                    <div className="font-bold text-white text-lg tracking-tight">{selectedRoom.label}</div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-black/30 p-2 rounded-lg border border-white/5">
                        <div>
                            <span className="text-slate-500 block uppercase text-[9px] font-bold">Zone</span>
                            <span className="text-indigo-300 font-bold">{selectedRoom.zone}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block uppercase text-[9px] font-bold">Resonance</span>
                            <span className={selectedRoom.score >= 80 ? 'text-emerald-400 font-bold' : selectedRoom.score >= 50 ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>{selectedRoom.score}%</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-white/5 mt-1">
                            <span className="text-slate-500 block uppercase text-[9px] font-bold">Footprint</span>
                            <span className="text-slate-300 font-mono">{selectedRoom.width.toFixed(1)}m × {selectedRoom.height.toFixed(1)}m</span>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
