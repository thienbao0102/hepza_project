import React from 'react';
import { DataActions } from '@components/ui/Button';

const EnterpriseHeader = ({ viewMode, totalItems, onImport, onExport }) => {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold leading-tight">
                    {viewMode === 'active' ? 'Doanh nghiệp' : 'Doanh nghiệp đã xóa'}
                </h2>
                <span className="py-1 px-2 text-base font-semibold text-indigo-600 bg-indigo-50 rounded-full flex justify-center items-center">
                    <p>{totalItems.toLocaleString()}</p>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <DataActions onImport={onImport} onExport={onExport} />
            </div>
        </div>
    );
};

export default EnterpriseHeader;
