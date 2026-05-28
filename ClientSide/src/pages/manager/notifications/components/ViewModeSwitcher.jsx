import React from 'react';

const ViewModeSwitcher = ({ isSentMode, setViewMode, setPage }) => {
    return (
        <div className="flex gap-2">
            <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium border ${!isSentMode ? 'bg-[#4E5BA6] text-white border-[#4E5BA6]' : 'bg-white text-gray-700 border-gray-200'}`}
                onClick={() => {
                    setViewMode('received');
                    setPage(1);
                }}
            >
                HEPZA gửi
            </button>
            <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium border ${isSentMode ? 'bg-[#4E5BA6] text-white border-[#4E5BA6]' : 'bg-white text-gray-700 border-gray-200'}`}
                onClick={() => {
                    setViewMode('sent');
                    setPage(1);
                }}
            >
                Lịch sử thông báo cho doanh nghiệp
            </button>
        </div>
    );
};

export default ViewModeSwitcher;
