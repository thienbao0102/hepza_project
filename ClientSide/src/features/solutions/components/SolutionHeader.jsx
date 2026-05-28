import React from 'react';
import { DataActions } from '@features/solutions/ui/Button';

const SolutionHeader = ({ totalItems, onImport, onExport }) => {
      return (
           <div className="flex items-center justify-between gap-4 mb-4">
               <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-semibold leading-tight">
                       {/* {viewMode === 'active' ? 'Doanh nghiệp' : 'Doanh nghiệp đã xóa'} */}
                       Quản lý giải pháp
                   </h2>
                   <span className="px-3 py-1 text-base font-semibold text-indigo-600 bg-indigo-50 rounded-xl">
                       {totalItems}
                   </span>
               </div>
               <div className="flex items-center gap-2">
                   <DataActions onImport={onImport} onExport={onExport} />
               </div>
           </div>
       );
};

export default SolutionHeader;
