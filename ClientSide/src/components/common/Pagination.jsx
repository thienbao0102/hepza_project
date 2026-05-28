import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const handlePrevious = () => {
        if (currentPage > 0) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages - 1) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
            <div className="flex items-center gap-4">
                <span className="text-sm font-normal text-gray-700">
                    Trang {currentPage + 1} trên {totalPages}
                </span>
            </div>

            <div className="flex gap-2 mt-2 md:mt-0">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 0}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border transition ${currentPage === 0
                        ? 'text-gray-400 border-gray-200 bg-white cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 border-gray-300 bg-white hover:shadow'
                        }`}
                >
                    <span className="text-sm">←</span>
                    <span className="text-sm font-normal cursor-pointer">Trang trước</span>
                </button>

                <button
                    onClick={handleNext}
                    disabled={currentPage >= totalPages - 1}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border transition ${currentPage >= totalPages - 1
                        ? 'text-gray-400 border-gray-200 bg-white cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 border-gray-300 bg-white hover:shadow'
                        }`}
                >
                    <span className="text-sm font-normal cursor-pointer">Trang kế</span>
                    <span className="text-sm">→</span>
                </button>
            </div>
        </div>
    );
};

export default Pagination;
