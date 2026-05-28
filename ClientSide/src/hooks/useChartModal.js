import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useChartCompare } from '../components/ui/ChartCompareContext';

export const useChartModal = (defaultColors = ['#3B82F6', '#60A5FA', '#F97316', '#10B981', '#8B5CF6', '#F43F5E']) => {
  const location = useLocation();
  const { pinChart, pinnedCharts, maxPins } = useChartCompare();

  const [chartModalConfig, setChartModalConfig] = useState({
    open: false, title: '', chartType: 'pie', data: [], unit: '', description: '', stackedKeys: [], colors: defaultColors, chartId: '',
  });

  const handleChartViewClick = useCallback((chartType, data, title, unit = '', description = '', stackedKeys = [], customColors = null) => {
    const chartId = `${location.pathname}-${title}`;
    setChartModalConfig({ open: true, title, chartType, data, unit, description, stackedKeys, colors: customColors || defaultColors, chartId });
  }, [location.pathname, defaultColors]);

  const closeChartModal = useCallback(() => {
    setChartModalConfig(prev => ({ ...prev, open: false }));
  }, []);

  const chartModalProps = {
    chartType: chartModalConfig.chartType,
    colors: chartModalConfig.colors,
    data: chartModalConfig.data,
    description: chartModalConfig.description,
    height: 500,
    width: 1100,
    chartId: chartModalConfig.chartId,
    isPinned: pinnedCharts.some(p => p.chartId === chartModalConfig.chartId),
    open: chartModalConfig.open,
    stackedKeys: chartModalConfig.stackedKeys,
    title: chartModalConfig.title,
    unit: chartModalConfig.unit,
    onClose: closeChartModal,
    onPin: pinnedCharts.length < maxPins ? pinChart : undefined
  };

  return {
    handleChartViewClick,
    chartModalProps,
  };
};
