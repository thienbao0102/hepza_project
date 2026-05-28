import React, { useState } from 'react';
import ImportUploadZone from '@/components/common/Import/ImportUploadZone';
import { Calendar } from 'lucide-react';

const ResourceLeftPanel = ({
  file,
  onFileSelect,
  onRemoveFile,
  selectedPeriod,
  onPeriodChange,
}) => {
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  // Generate period options (last 12 months)
  const generatePeriodOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const periodKey = parseInt(`${year}${month}`);
      const label = `Tháng ${month}/${year}`;
      options.push({ value: periodKey, label });
    }
    return options;
  };

  const periodOptions = generatePeriodOptions();

  // Handle period change - mark as visited after interaction
  const handlePeriodChange = value => {
    setIsFirstVisit(false);
    onPeriodChange(value);
  };

  return (
    <div className='flex flex-col gap-4 h-full lg:col-span-2'>
      {/* Period Selector - Priority */}
      <div
        className={`
                relative rounded-lg border p-4 transition-all duration-200 cursor-pointer lg:col-span-2
                ${isFirstVisit
            ? 'bg-[#4E5BA6] border-[#7B8CD6] shadow-lg'
            : 'bg-white border-gray-200 hover:shadow-md'
          }
            `}
      >
        {/* Corner Badge */}
        {isFirstVisit && (
          <div className='absolute -top-2.5 right-4 flex items-center gap-1.5 bg-white text-[#4E5BA6] px-3 py-1 rounded-full text-xs font-bold shadow-md'>
            <span className='w-2 h-2 bg-red-500 rounded-full animate-pulse'></span>
            BẮT BUỘC
          </div>
        )}

        <div className='flex items-center gap-4'>
          <div
            className={`p-3 rounded-lg ${isFirstVisit ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            <Calendar size={28} />
          </div>
          <div className='flex-1'>
            <div
              className={`text-sm font-bold uppercase ${isFirstVisit ? 'text-white/90' : 'text-gray-700'}`}
            >
              Kỳ báo cáo
            </div>
            <select
              value={selectedPeriod}
              onChange={e => handlePeriodChange(parseInt(e.target.value))}
              className={`w-full mt-1 text-lg font-semibold bg-transparent border-none outline-none cursor-pointer py-1
                                ${isFirstVisit ? 'text-white placeholder-white/70' : 'text-gray-600'}
                            `}
            >
              {periodOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="text-gray-900 bg-white text-base font-medium">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <ImportUploadZone
        file={file}
        onFileSelect={onFileSelect}
        onRemoveFile={onRemoveFile}
        accept='.xlsx,.xls'
        hint='Hỗ trợ .xlsx, .xls. Giới hạn 10MB.'
      />

      {/* Import Rules */}
      <div className='bg-white rounded-lg border border-gray-200 p-4 shadow-sm'>
        <h3 className='font-bold text-sm text-[#4B5563] uppercase tracking-wider mb-2'>
          Quy định đồng bộ dữ liệu
        </h3>
        <ul className='text-sm text-gray-700 space-y-2 list-disc pl-4'>
          <li>Dữ liệu cùng khóa trong tháng sẽ được cập nhật thay vì tạo trùng.</li>
          <li>Các dòng không còn xuất hiện trong file sẽ được giữ lại trong hệ thống.</li>
          <li>Các dòng trùng trong cùng file sẽ được gộp và cộng dồn số lượng.</li>
        </ul>
      </div>
    </div>
  );
};

export default ResourceLeftPanel;
