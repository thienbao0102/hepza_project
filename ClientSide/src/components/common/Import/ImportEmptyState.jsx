import React from 'react';
import { Loader2 } from 'lucide-react';

const ImportEmptyState = ({ isProcessing, hasFile, onCheckFile }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 h-full flex-1">
            <p className="mb-2 text-[#6B7280]">Chưa có dữ liệu để hiển thị.</p>
            <p className="mb-4 text-[#6B7280]">Vui lòng thêm <span className="font-medium text-gray-600">tệp để kiểm tra</span></p>
            <div className="relative mt-10">
                {/* Attention Grabbing Arrow & Label */}
                {hasFile && !isProcessing && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-20">
                        <span className="bg-[#10B981] text-white text-[12px] font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap border-2 border-white">
                            BƯỚC TIẾP THEO
                        </span>
                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#10B981] -mt-[2px]"></div>
                    </div>
                )}

                <button
                    onClick={onCheckFile}
                    disabled={!hasFile || isProcessing}
                    className={`text-base font-bold px-10 py-3.5 rounded-full transition-all duration-300 flex items-center justify-center gap-3 relative z-10 mx-auto
                            ${hasFile && !isProcessing
                            ? 'bg-[#4E5BA6] text-white cursor-pointer shadow-[0_0_20px_rgba(78,91,166,0.6)] hover:shadow-[0_0_30px_rgba(78,91,166,0.8)] hover:-translate-y-1 scale-105 hover:bg-[#3d4885] animate-pulse'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        }
                        `}
                >
                    {/* Pulsing ring layers */}
                    {hasFile && !isProcessing && (
                        <>
                            <span className="absolute inset-0 rounded-full border-2 border-[#4E5BA6] animate-ping opacity-75"></span>
                        </>
                    )}

                    <span className="relative z-10 flex items-center gap-2">
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-5 w-5 text-current force-spin" />
                                Đang xử lý tệp...
                            </>
                        ) : 'KIỂM TRA DỮ LIỆU FILE NÀY'}
                    </span>
                </button>
            </div>

            <style>{`
                @keyframes custom-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .force-spin {
                    animation: custom-spin 1s linear infinite !important
                }
            `}</style>
        </div >
    );
};

export default ImportEmptyState;
