// App.tsx
// Main application component for VāstuCAD

import { useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PlanCanvas } from './components/PlanCanvas';
import { RoomConfigurator } from './components/RoomConfigurator';
import { useStore } from './store/useStore';

function App() {
    const { showToast, toastMessage, hideToast, getProjectState, loadProject } = useStore();

    // Auto-save to localStorage
    useEffect(() => {
        const saveInterval = setInterval(() => {
            const projectState = getProjectState();
            localStorage.setItem('vastucad-autosave', JSON.stringify(projectState));
        }, 1000);

        return () => clearInterval(saveInterval);
    }, [getProjectState]);

    // Auto-load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('vastucad-autosave');
        if (saved) {
            try {
                const projectState = JSON.parse(saved);
                loadProject(projectState);
            } catch (error) {
                console.error('Failed to load autosave:', error);
            }
        }
    }, [loadProject]);

    return (
        <div className="min-h-screen text-slate-100 p-6 font-['Outfit']">
            {/* Toast notification */}
            {showToast && (
                <div className="fixed top-6 right-6 z-50 animate-fadeIn">
                    <div className="glass px-6 py-3 rounded-xl flex items-center gap-3 border border-indigo-500/30">
                        <span className="text-xl text-green-400">✓</span>
                        <span className="font-medium">{toastMessage}</span>
                        <button
                            onClick={hideToast}
                            className="ml-2 text-gray-400 hover:text-white transition-colors"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="max-w-[1800px] mx-auto animate-fadeIn relative z-10">
                <div className="flex gap-6 items-start">
                    {/* Left Sidebar - Control Panel */}
                    <ControlPanel />

                    {/* Center - Canvas Area */}
                    <div className="flex-1 space-y-6">
                        {/* Header */}
                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight">
                                        VāstuCAD
                                    </h1>
                                    <p className="text-indigo-200 mt-2 font-medium">
                                        Generative Artificial Intelligence Floor Plan Design
                                    </p>
                                </div>
                                <div className="text-right glass px-4 py-2 rounded-lg">
                                    <div className="text-sm text-indigo-100 font-semibold tracking-wide">GEMINI INTEGRATED</div>
                                    <div className="text-xs text-indigo-300 mt-1 flex items-center justify-end gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Auto-sync active</div>
                                </div>
                            </div>
                        </div>

                        {/* Plan View */}
                        <PlanCanvas />

                        {/* Instructions */}
                        <div className="glass-card p-5">
                            <h3 className="font-bold text-indigo-200 mb-3 tracking-wide">QUICK START</h3>
                            <div className="grid grid-cols-3 gap-6 text-sm text-slate-300">
                                <div className="glass p-4 rounded-xl border-t border-t-white/10">
                                    <span className="font-semibold text-indigo-400 text-lg">1. Template</span>
                                    <p className="text-xs mt-2 text-slate-400 leading-relaxed">Choose a pre-designed civil plan (2BHK, 3BHK, 4BHK) or start blank.</p>
                                </div>
                                <div className="glass p-4 rounded-xl border-t border-t-white/10">
                                    <span className="font-semibold text-purple-400 text-lg">2. Configure</span>
                                    <p className="text-xs mt-2 text-slate-400 leading-relaxed">Set plot size and utilize AI Gemini to automatically generate optimal layouts.</p>
                                </div>
                                <div className="glass p-4 rounded-xl border-t border-t-white/10">
                                    <span className="font-semibold text-pink-400 text-lg">3. Export</span>
                                    <p className="text-xs mt-2 text-slate-400 leading-relaxed">Download precise architectural blueprints in transparent PNG or detailed PDF formats.</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center text-sm text-slate-500 py-4">
                            <p className="font-medium tracking-widest text-xs uppercase opacity-50">
                                VāstuCAD ✦ Next-Generation Architecture
                            </p>
                        </div>
                    </div>

                    {/* Right Sidebar - Room Configurator */}
                    <div className="w-[420px] shrink-0">
                        <RoomConfigurator />
                    </div>
                </div>
            </div>

            {/* Background elements */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-glow"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
        </div>
    );
}

export default App;
