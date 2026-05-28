import React, { createContext, useContext, useState, useCallback } from 'react';
import { BarChart3, X } from 'lucide-react';
import ChartComparePanel from './ChartComparePanel';

const ChartCompareContext = createContext(null);

const MAX_PINS = 3;
let pinIdCounter = 0;

export const ChartCompareProvider = ({ children }) => {
    const [pinnedCharts, setPinnedCharts] = useState([]);
    const [isCompareOpen, setIsCompareOpen] = useState(false);

    const pinChart = useCallback((config) => {
        setPinnedCharts(prev => {
            if (prev.length >= MAX_PINS) return prev;
            const id = ++pinIdCounter;
            return [...prev, {
                id,
                chartId: config.chartId || config.title,
                title: config.title || 'Biểu đồ',
                chartType: config.chartType || 'pie',
                data: config.data || [],
                colors: config.colors,
                unit: config.unit || '',
                description: config.description || '',
                stackedKeys: config.stackedKeys || [],
                xAxisKey: config.xAxisKey || 'name',
            }];
        });
    }, []);

    const unpinChart = useCallback((id) => {
        setPinnedCharts(prev => prev.filter(c => c.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setPinnedCharts([]);
        setIsCompareOpen(false);
    }, []);

    const openCompare = useCallback(() => setIsCompareOpen(true), []);
    const closeCompare = useCallback(() => setIsCompareOpen(false), []);

    return (
        <ChartCompareContext.Provider value={{
            pinnedCharts,
            pinChart,
            unpinChart,
            clearAll,
            isCompareOpen,
            openCompare,
            closeCompare,
            maxPins: MAX_PINS,
        }}>
            {children}

            {/* Floating badge */}
            {pinnedCharts.length > 0 && !isCompareOpen && (
                <div className="fixed bottom-6 right-6 z-[1050] flex items-center gap-2">
                    <button
                        onClick={openCompare}
                        className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 group"
                    >
                        <div className="relative">
                            <BarChart3 className="w-5 h-5" />
                            <span className="absolute -top-2 -right-2.5 bg-amber-400 text-amber-900 text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm">
                                {pinnedCharts.length}
                            </span>
                        </div>
                        <span className="text-sm font-medium">So sánh</span>
                    </button>
                    <button
                        onClick={clearAll}
                        className="p-2 bg-white/90 backdrop-blur border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl shadow-lg transition-colors"
                        title="Xóa tất cả"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Compare Panel */}
            <ChartComparePanel
                open={isCompareOpen}
                onClose={closeCompare}
                charts={pinnedCharts}
                onRemove={unpinChart}
                onClearAll={clearAll}
            />
        </ChartCompareContext.Provider>
    );
};

export const useChartCompare = () => {
    const ctx = useContext(ChartCompareContext);
    if (!ctx) throw new Error('useChartCompare must be used within ChartCompareProvider');
    return ctx;
};
