import React from 'react';
import { Button, DatePicker } from 'antd';
import { Check, Download } from 'lucide-react';
import dayjs from 'dayjs';
import ButtonFilter from '@/components/ui/ButtonFilter';
import ExportScopeSelector from '@/features/enterprises/components/ExportHelper/ExportScopeSelector';

const ExportToolbar = ({
    tabs,
    selectedTabs,
    handleTabClick,
    selectedFilters,
    setSelectedFilters,
    handleExport,
    loading,
    user,
    zones,
    companies
}) => {
    return (
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-medium text-[#22262B]">Chọn thông tin cần xuất dữ liệu</h2>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => {
                        const isActive = selectedTabs.includes(tab.id);
                        return (
                            <React.Fragment key={tab.id}>
                                <button
                                    type="button"
                                    onClick={() => handleTabClick(tab.id)}
                                    className={`flex h-7 cursor-pointer items-center rounded-full px-4 text-sm font-medium transition-colors ${isActive ? 'bg-[#4E5BA6]/10 text-[#4E5BA6]' : 'bg-[#4E5BA6]/10 text-gray-400'} hover:bg-gray-200`}
                                >
                                    <span
                                        className={`inline-flex h-4 items-center justify-center transition-all duration-150 ${isActive ? 'w-4' : 'w-0 overflow-hidden'}`}
                                    >
                                        {isActive && <Check size={16} />}
                                    </span>
                                    <span className={`transition-all duration-150 ${isActive ? 'pl-1' : 'pl-0'}`}>
                                        {tab.label}
                                    </span>
                                </button>
                                {tab.id === 'info' && (
                                    <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="h-6 w-[2px] bg-gray-200 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 ">
                        <span className="shrink-0 text-gray-500">tháng:</span>
                        <DatePicker.RangePicker
                            picker="month"
                            bordered={false}
                            suffixIcon={null}
                            value={selectedFilters?.date_range?.from && selectedFilters?.date_range?.to
                                ? [dayjs(selectedFilters.date_range.from), dayjs(selectedFilters.date_range.to)]
                                : null
                            }
                            onChange={(dates) => {
                                setSelectedFilters(prev => ({
                                    ...prev,
                                    date_range: dates ? { from: dates[0], to: dates[1] } : {}
                                }));
                            }}
                            format="MM/YYYY"
                            className={`p-0 w-35 bg-transparent ${selectedFilters?.date_range?.from && selectedFilters?.date_range?.to
                                ? '[&_input]:!text-[#4E5BA6] !text-[#4E5BA6]'
                                : ''
                                }`}
                            allowClear={false}
                        />
                    </div>

                    <ButtonFilter
                        onFilter={(filters) => console.log('Filtering:', filters)}
                        filterOptions={{
                            period: ['Quý 1', 'Quý 2', 'Quý 3', 'Quý 4'],
                            date_range: []
                        }}
                        fieldLabels={{
                            period: 'Kỳ',
                            date_range: 'Khoảng thời gian'
                        }}
                        selectedFilters={selectedFilters}
                        setSelectedFilters={setSelectedFilters}
                    />

                    <ExportScopeSelector
                        value={selectedFilters?.exportScope}
                        onChange={(value) => {
                            setSelectedFilters(prev => ({
                                ...prev,
                                exportScope: value
                            }));
                        }}
                        user={user}
                        zones={zones}
                        companies={companies}
                    />

                    <Button
                        type="primary"
                        className="bg-[#4E5BA6] hover:bg-[#3d4885] flex items-center gap-2 h-[36px] rounded-[12px]"
                        icon={<Download size={16} />}
                        onClick={handleExport}
                    >
                        Xuất dữ liệu
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExportToolbar;
