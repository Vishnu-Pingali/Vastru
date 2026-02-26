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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-6">
            {/* Toast notification */}
            {showToast && (
                <div className="fixed top-6 right-6 z-50 animate-fadeIn">
                    <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                        <span className="text-lg">✓</span>
                        <span className="font-medium">{toastMessage}</span>
                        <button
                            onClick={hideToast}
                            className="ml-2 text-gray-400 hover:text-white"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="max-w-[1800px] mx-auto">
                <div className="flex gap-6 items-start">
                    {/* Left Sidebar - Control Panel */}
                    <ControlPanel />

                    {/* Center - Canvas Area */}
                    <div className="flex-1 space-y-4">
                        {/* Header */}
                        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        VāstuCAD
                                    </h1>
                                    <p className="text-gray-600 mt-1">
                                        Professional Civil-Grade Floor Plan Generator with Vastu Compliance
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Template-driven • Civil topology</div>
                                    <div className="text-xs text-gray-400 mt-1">Auto-saves every second</div>
                                </div>
                            </div>
                        </div>

                        {/* Plan View */}
                        <PlanCanvas />

                        {/* Instructions */}
                        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                            <h3 className="font-semibold text-gray-800 mb-2">Quick Start</h3>
                            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                    <span className="font-medium text-brand">1. Select Template</span>
                                    <p className="text-xs mt-1">Choose a pre-designed civil plan (2BHK, 3BHK, 4BHK)</p>
                                </div>
                                <div>
                                    <span className="font-medium text-brand">2. Adjust Plot</span>
                                    <p className="text-xs mt-1">Set plot size - template adapts automatically</p>
                                </div>
                                <div>
                                    <span className="font-medium text-brand">3. Export</span>
                                    <p className="text-xs mt-1">Download as PNG or PDF with Vastu report</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center text-sm text-gray-500">
                            <p>
                                VāstuCAD — Civil-Engineering-Grade Planning Tool • Vastu-Aware Templates
                            </p>
                            <p className="text-xs mt-1">
                                All processing happens in your browser — your data never leaves your device
                            </p>
                        </div>
                    </div>

                    {/* Right Sidebar - Room Configurator */}
                    <div className="w-96">
                        <RoomConfigurator />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
