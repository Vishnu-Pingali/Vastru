import { useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PlanCanvas } from './components/PlanCanvas';
import { RoomConfigurator } from './components/RoomConfigurator';
import { useStore } from './store/useStore';

function App() {
    const { showToast, toastMessage, hideToast, getProjectState, loadProject } = useStore();

    useEffect(() => {
        const saveInterval = setInterval(() => {
            const projectState = getProjectState();
            localStorage.setItem('vastucad-autosave', JSON.stringify(projectState));
        }, 1000);

        return () => clearInterval(saveInterval);
    }, [getProjectState]);

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
        <div className="min-h-screen px-4 py-4 md:px-5 md:py-6 text-[#4f4428] font-['Outfit']">
            {showToast && (
                <div className="fixed top-6 right-6 z-50 animate-fadeIn">
                    <div className="glass px-5 py-3 rounded-2xl flex items-center gap-3">
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#146d71]">
                            Notice
                        </span>
                        <span className="font-medium">{toastMessage}</span>
                        <button
                            onClick={hideToast}
                            className="ml-2 text-[#8a7b53] hover:text-[#4f4428] transition-colors"
                        >
                            x
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-[1880px] mx-auto animate-fadeIn relative z-10">
                <div className="grid grid-cols-1 2xl:grid-cols-[340px_minmax(0,1fr)_390px] gap-4 lg:gap-6 items-start">
                    <div className="2xl:sticky 2xl:top-6">
                        <ControlPanel />
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card p-7">
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.35em] text-[#8a7b53] font-semibold mb-3">
                                        Residential Planning Studio
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-extrabold text-[#4f4428] tracking-tight">
                                        VastuCAD
                                    </h1>
                                    <p className="text-[#7a6d46] mt-3 font-medium text-lg max-w-2xl">
                                        Professional floor-plan drafting with guided AI-assisted layout generation,
                                        cleaner sheet presentation, and architectural room composition.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:min-w-[320px]">
                                    <div className="rounded-2xl border border-[#d6c8a6] bg-[#fbf6e6] px-4 py-4">
                                        <div className="text-[11px] uppercase tracking-[0.25em] text-[#8a7b53] font-semibold">
                                            Engine
                                        </div>
                                        <div className="mt-2 text-xl font-bold text-[#146d71]">Gemini</div>
                                        <div className="text-sm text-[#7a6d46]">Layout assist enabled</div>
                                    </div>
                                    <div className="rounded-2xl border border-[#d6c8a6] bg-[#fbf6e6] px-4 py-4">
                                        <div className="text-[11px] uppercase tracking-[0.25em] text-[#8a7b53] font-semibold">
                                            Output
                                        </div>
                                        <div className="mt-2 text-xl font-bold text-[#4f4428]">Draft Sheet</div>
                                        <div className="text-sm text-[#7a6d46]">Architectural presentation</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <PlanCanvas />

                        <div className="glass-card p-5">
                            <h3 className="font-bold text-[#4f4428] mb-3 tracking-wide">Workflow</h3>
                            <div className="grid md:grid-cols-3 gap-4 text-sm text-[#7a6d46]">
                                <div className="rounded-2xl border border-[#d8cab0] bg-[#fbf6e8] p-4">
                                    <span className="font-semibold text-[#146d71] text-lg">1. Base</span>
                                    <p className="text-xs mt-2 leading-relaxed">
                                        Select a template or build a room program from the Architect panel.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-[#d8cab0] bg-[#fbf6e8] p-4">
                                    <span className="font-semibold text-[#146d71] text-lg">2. Refine</span>
                                    <p className="text-xs mt-2 leading-relaxed">
                                        Tune plot size, orientation, and interaction mode to shape the layout.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-[#d8cab0] bg-[#fbf6e8] p-4">
                                    <span className="font-semibold text-[#146d71] text-lg">3. Deliver</span>
                                    <p className="text-xs mt-2 leading-relaxed">
                                        Export the final sheet as PNG, PDF, or JSON once the plan reads cleanly.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center text-sm text-[#8a7b53] py-2">
                            <p className="font-medium tracking-[0.3em] text-xs uppercase opacity-80">
                                VastuCAD Studio
                            </p>
                        </div>
                    </div>

                    <div className="w-full 2xl:sticky 2xl:top-6">
                        <RoomConfigurator />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
