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
                await exportPDF(stageRef!, getProjectState(), complianceReport);
                showToastMessage('PDF exported successfully!');
            } else {
                exportJSON(getProjectState());
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
            loadProject(await importJSON(file));
        } catch (error) {
            showToastMessage('Import failed: ' + (error as Error).message);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
    const complianceStatus = getComplianceStatus(complianceReport.totalScore);

    return (
        <aside className="w-full glass-card p-5 md:p-6 space-y-6 flex flex-col h-fit 2xl:max-h-[calc(100vh-3rem)] overflow-y-auto overflow-x-hidden relative">
            <div className="flex items-center gap-4 pb-4 border-b border-[#d9ceb3]">
                <div className="w-14 h-14 rounded-2xl bg-[#146d71] flex items-center justify-center text-[#fff8da] text-lg font-bold shadow-sm">
                    CT
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[#4f4428]">Controls</h1>
                    <p className="text-xs text-[#8a7b53] tracking-[0.28em] uppercase">Sheet Settings</p>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-xs font-bold text-[#8a7b53] uppercase tracking-widest">Topology Template</h2>
                <select
                    value={activeTemplate?.id || ''}
                    onChange={(e) => e.target.value && loadTemplate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl focus:ring-2 focus:ring-[#146d71] outline-none text-sm text-[#4f4428] appearance-none"
                >
                    <option value="" className="bg-[#fbf6e8] text-[#4f4428]">
                        Select a baseline template...
                    </option>
                    {templates.map((template) => (
                        <option key={template.id} value={template.id} className="bg-[#fbf6e8] text-[#4f4428]">
                            {template.name} ({template.bedrooms}BHK - {template.facing} Facing)
                        </option>
                    ))}
                </select>

                {activeTemplate && (
                    <div className="p-4 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl text-xs space-y-2">
                        <div className="font-bold text-[#146d71] text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#146d71]"></span>
                            {activeTemplate.name}
                        </div>
                        <div className="text-[#7a6d46] leading-relaxed">{activeTemplate.description}</div>
                        <div className="flex items-center gap-3 pt-2 text-[#8a7b53] font-medium">
                            <span>{activeTemplate.bedrooms}BHK</span>
                            <span>{activeTemplate.facing} Facing</span>
                            <span>{activeTemplate.rooms.length} Rooms</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h2 className="text-xs font-bold text-[#8a7b53] uppercase tracking-widest">Plot Dimensions</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="block text-[10px] font-semibold text-[#8a7b53] uppercase tracking-wider absolute top-2 left-3 z-10">
                            Width
                        </label>
                        <input
                            type="number"
                            value={plot.width}
                            onChange={(e) => setPlotSize(Number(e.target.value), plot.height)}
                            min={8}
                            max={50}
                            step={0.5}
                            className="w-full pl-3 pr-8 pt-6 pb-2 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl focus:ring-2 focus:ring-[#146d71] outline-none text-sm text-[#4f4428] font-medium font-mono"
                        />
                        <span className="absolute right-3 top-6 text-xs text-[#8a7b53] font-mono">m</span>
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] font-semibold text-[#8a7b53] uppercase tracking-wider absolute top-2 left-3 z-10">
                            Length
                        </label>
                        <input
                            type="number"
                            value={plot.height}
                            onChange={(e) => setPlotSize(plot.width, Number(e.target.value))}
                            min={8}
                            max={50}
                            step={0.5}
                            className="w-full pl-3 pr-8 pt-6 pb-2 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl focus:ring-2 focus:ring-[#146d71] outline-none text-sm text-[#4f4428] font-medium font-mono"
                        />
                        <span className="absolute right-3 top-6 text-xs text-[#8a7b53] font-mono">m</span>
                    </div>
                </div>

                <div className="bg-[#fbf6e8] p-4 rounded-xl border border-[#d8cab0]">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-[#8a7b53] uppercase tracking-widest">
                            Compass
                        </label>
                        <span className="text-sm font-bold text-[#146d71] font-mono bg-[#efe6c6] px-2 py-0.5 rounded">
                            {plot.orientation}°
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={359}
                        value={plot.orientation}
                        onChange={(e) => setOrientation(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#d9cfb8] rounded-lg appearance-none cursor-pointer accent-[#146d71]"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-[#8a7b53] mt-2 uppercase tracking-widest">
                        <span className={plot.orientation < 45 || plot.orientation > 315 ? 'text-[#146d71]' : ''}>N(0)</span>
                        <span className={plot.orientation >= 45 && plot.orientation < 135 ? 'text-[#146d71]' : ''}>E(90)</span>
                        <span className={plot.orientation >= 135 && plot.orientation < 225 ? 'text-[#146d71]' : ''}>S(180)</span>
                        <span className={plot.orientation >= 225 && plot.orientation <= 315 ? 'text-[#146d71]' : ''}>W(270)</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-xs font-bold text-[#8a7b53] uppercase tracking-widest">Interaction Mode</h2>
                <div className="flex bg-[#e6dcc5] rounded-xl p-1 border border-[#d8cab0] shadow-inner">
                    <button
                        onClick={() => setEditMode('template')}
                        disabled={!activeTemplate}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all tracking-wider uppercase ${
                            editMode === 'template'
                                ? 'bg-[#146d71] text-white shadow-sm'
                                : 'text-[#8a7b53] hover:text-[#4f4428] hover:bg-[#f7f1de]'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        Rigid
                    </button>
                    <button
                        onClick={() => setEditMode('creative')}
                        disabled={!activeTemplate}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all tracking-wider uppercase ${
                            editMode === 'creative'
                                ? 'bg-[#4f4428] text-white shadow-sm'
                                : 'text-[#8a7b53] hover:text-[#4f4428] hover:bg-[#f7f1de]'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        Fluid
                    </button>
                </div>
            </div>

            <div className="space-y-3 pt-1 border-t border-[#d9ceb3]">
                <h2 className="text-xs font-bold text-[#8a7b53] uppercase tracking-widest">Vastu Engine</h2>
                <select
                    value={vastuMode}
                    onChange={(e) => setVastuMode(e.target.value as any)}
                    className="w-full px-4 py-3 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl focus:ring-2 focus:ring-[#146d71] outline-none text-sm text-[#4f4428] appearance-none font-medium"
                >
                    <option value="strict">Strict Enforcement</option>
                    <option value="soft">Soft Guidelines</option>
                    <option value="off">Disabled</option>
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    onClick={clearAll}
                    disabled={!activeTemplate}
                    className="sm:col-span-2 px-4 py-3 bg-[#fbf6e8] border border-[#c9b08c] text-[#8a5b42] rounded-xl hover:bg-[#f4ebd7] transition-all text-sm font-bold tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Clear Workspace
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={!activeTemplate}
                        className="w-full px-4 py-3 bg-[#146d71] border border-[#0f5d61] rounded-xl hover:bg-[#0f5d61] transition-all text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-30 text-white uppercase tracking-wider"
                    >
                        Export
                    </button>

                    {showExportMenu && (
                        <div className="absolute bottom-full mb-2 left-0 right-0 sm:right-[-100%] bg-[#f8f2e1] border border-[#d8cab0] rounded-xl shadow-2xl z-50 overflow-hidden">
                            <button
                                onClick={() => handleExport('png')}
                                className="w-full px-5 py-3 text-left hover:bg-[#efe6c6] text-sm border-b border-[#e2d7bd] text-[#4f4428] font-medium transition-colors"
                            >
                                High-Res PNG
                            </button>
                            <button
                                onClick={() => handleExport('pdf')}
                                className="w-full px-5 py-3 text-left hover:bg-[#efe6c6] text-sm border-b border-[#e2d7bd] text-[#4f4428] font-medium transition-colors"
                            >
                                Blueprint PDF
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                className="w-full px-5 py-3 text-left hover:bg-[#efe6c6] text-sm text-[#4f4428] font-medium transition-colors"
                            >
                                State JSON
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
                    className="w-full px-4 py-3 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl hover:bg-[#f4ebd7] transition-all text-sm font-bold flex items-center justify-center gap-2 text-[#4f4428] uppercase tracking-wider"
                >
                    Import
                </button>
            </div>

            {activeTemplate && (
                <div className="p-5 rounded-xl bg-[#fbf6e8] border border-[#d8cab0] space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-[#8a7b53] tracking-widest uppercase">Compliance Score</h2>
                        <span
                            className={`text-3xl font-black tracking-tighter ${
                                complianceReport.totalScore >= 80
                                    ? 'text-[#146d71] text-glow'
                                    : complianceReport.totalScore >= 60
                                      ? 'text-[#b6892d] text-glow'
                                      : 'text-[#a85c4d] text-glow'
                            }`}
                        >
                            {complianceReport.totalScore}
                            <span className="text-lg opacity-60">%</span>
                        </span>
                    </div>

                    <div className="flex-1 bg-[#e7dcc4] rounded-full h-2 overflow-hidden border border-[#ddd1b6]">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                complianceReport.totalScore >= 80
                                    ? 'bg-gradient-to-r from-[#146d71] to-[#2c888a]'
                                    : complianceReport.totalScore >= 60
                                      ? 'bg-gradient-to-r from-[#b6892d] to-[#d3ab4e]'
                                      : 'bg-gradient-to-r from-[#a85c4d] to-[#d17b67]'
                            }`}
                            style={{ width: `${complianceReport.totalScore}%` }}
                        />
                    </div>

                    <p className="text-xs text-[#7a6d46] text-center font-medium">
                        <span className={complianceReport.totalScore >= 80 ? 'text-[#146d71]' : 'text-[#b6892d]'}>
                            {complianceStatus.text}
                        </span>{' '}
                        • {complianceReport.hardViolations.length} Blockers
                    </p>
                </div>
            )}

            {selectedRoom && (
                <div className="p-4 bg-[#fbf6e8] border border-[#d8cab0] rounded-xl text-sm shadow-sm">
                    <div className="text-[10px] font-bold text-[#8a7b53] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#146d71]"></div>
                        Selection Matrix
                    </div>
                    <div className="font-bold text-[#4f4428] text-lg tracking-tight">{selectedRoom.label}</div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-[#f4ecda] p-2 rounded-lg border border-[#e0d5b9]">
                        <div>
                            <span className="text-[#8a7b53] block uppercase text-[9px] font-bold">Zone</span>
                            <span className="text-[#146d71] font-bold">{selectedRoom.zone}</span>
                        </div>
                        <div>
                            <span className="text-[#8a7b53] block uppercase text-[9px] font-bold">Resonance</span>
                            <span
                                className={
                                    selectedRoom.score >= 80
                                        ? 'text-[#146d71] font-bold'
                                        : selectedRoom.score >= 50
                                          ? 'text-[#b6892d] font-bold'
                                          : 'text-[#a85c4d] font-bold'
                                }
                            >
                                {selectedRoom.score}%
                            </span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-[#e0d5b9] mt-1">
                            <span className="text-[#8a7b53] block uppercase text-[9px] font-bold">Footprint</span>
                            <span className="text-[#4f4428] font-mono">
                                {selectedRoom.width.toFixed(1)}m × {selectedRoom.height.toFixed(1)}m
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
