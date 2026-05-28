import React from 'react';

const ExportChoiceModal = ({ onSelectData, onSelectInfo, onCancel }) => {
    return (
        <div className="py-2 px-1">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 leading-tight">Xác nhận loại dữ liệu</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Vui lòng chọn bộ dữ liệu bạn muốn xuất bản</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Option 1: Environmental Data */}
                <button
                    onClick={onSelectData}
                    className="group relative flex items-start gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-300 text-left"
                >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-base font-bold text-slate-800 group-hover:text-blue-700 transition-colors">Dữ liệu Môi trường</h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">Bao gồm báo cáo về Điện, Nước, Nhiên liệu, Nguyên vật liệu và Chất thải.</p>
                    </div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    </div>
                </button>

                {/* Option 2: Enterprise Info */}
                <button
                    onClick={onSelectInfo}
                    className="group relative flex items-start gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-300 text-left"
                >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M16 18h.01" /></svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-base font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">Thông tin Doanh nghiệp</h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">Hồ sơ pháp lý, vốn đầu tư, lao động và thông tin liên hệ của các doanh nghiệp.</p>
                    </div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    </div>
                </button>
            </div>

            <div className="mt-6 flex justify-center">
                <button
                    onClick={onCancel}
                    className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                    Bỏ qua
                </button>
            </div>
        </div>
    );
};

export default ExportChoiceModal;
