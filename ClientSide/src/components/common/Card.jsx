import React from "react";
import { Button, Tooltip } from "antd";
import { MapPin, Trash2, CheckCircle2, RotateCcw } from "lucide-react";

export const IndustrialZoneCard = ({
    image,
    name,
    zone_id,
    activityType,
    field,
    companyIds = [],
    onDetailClick,
    onMapClick,
    onDeleteClick,
    isSelectMode = false, // ADDED
    isSelected = false, // ADDED
    onSelect, // ADDED
    isTrashMode = false,
    onRestoreClick,
    onHardDeleteClick,
}) => {
    const formattedCompanyCount = Array.isArray(companyIds) ? companyIds.length : Number.isFinite(companyIds) ? companyIds : 0;

    // Helper function to get status label in Vietnamese
    const getStatusLabel = (status) => {
        if (!status) {
            return 'Chưa có trạng thái';
        }

        const statusLower = String(status || '').toLowerCase();

        if (statusLower.includes('active') || statusLower.includes('hoạt động')) {
            return 'Đang hoạt động';
        } else if (statusLower.includes('off') || statusLower.includes('ngưng') || statusLower.includes('tạm ngưng')) {
            return 'Ngưng hoạt động';
        }
        return status;
    };

    // Helper function to get status styling
    const getStatusStyle = (status) => {
        if (!status) {
            return 'bg-gray-100 text-gray-800';
        }

        const statusLower = String(status || '').toLowerCase();

        if (statusLower.includes('active') || statusLower.includes('hoạt động')) {
            return 'bg-green-100 text-green-800';
        } else if (statusLower.includes('off') || statusLower.includes('ngưng') || statusLower.includes('tạm ngưng')) {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div
            className={`flex flex-col rounded-xl transition-all duration-300 overflow-hidden bg-white h-full w-full border ${isSelected ? (isTrashMode ? 'border-[#4E5BA6] ring-2 ring-[#4E5BA6]/30 shadow-md' : 'border-red-500 ring-2 ring-red-500/30 shadow-md') : 'border-black/20 hover:border-[#4E5BA6]/50 hover:shadow-lg'}`}
            onClick={isSelectMode ? onSelect : undefined}
            style={{ cursor: isSelectMode ? 'pointer' : 'default' }}
        >
            <div className="relative flex-shrink-0 w-full h-auto overflow-hidden aspect-video bg-gray-50">
                {isSelectMode && (
                    <div
                        className="absolute top-3 left-3 z-10 bg-white/90 rounded-full p-1 shadow-sm transition-colors duration-200"
                        onClick={(e) => e.stopPropagation()} // Prevent card's onClick from firing when clicking the icon directly
                    >
                        <CheckCircle2
                            size={22}
                            className={`transition-colors duration-200 ${isSelected ? (isTrashMode ? 'text-[#4E5BA6] fill-blue-50' : 'text-red-500 fill-red-50') : 'text-gray-300'}`}
                        />
                    </div>
                )}

                {image ? (
                    <img
                        src={image}
                        alt={name}
                        className="object-cover w-full h-full"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 bg-indigo-200 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="text-xs text-indigo-600 font-medium">Khu công nghiệp</span>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex flex-col flex-1 p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="m-0 text-lg font-semibold text-gray-800 line-clamp-2">
                        {name}
                    </h3>
                    <Tooltip title="Xem bản đồ" placement="top">
                        <button
                            onClick={onMapClick}
                            className="ml-2 text-gray-500 hover:text-blue-600 cursor-pointer"
                        >
                            <MapPin size={18} />
                        </button>
                    </Tooltip>
                </div>
                <div className="mt-2 space-y-1.5 text-sm text-gray-600">
                    <p className="flex justify-between">
                        <span className="font-medium">Mã số:</span>
                        <span className="truncate">{zone_id || "--"}</span>
                    </p>
                    {activityType && (
                        <p className="flex justify-between gap-2">
                            <span className="font-medium whitespace-nowrap">Địa chỉ:</span>
                            <Tooltip title={activityType} placement="top">
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate cursor-pointer text-blue-600 hover:underline"
                                >
                                    {activityType}
                                </a>
                            </Tooltip>
                        </p>
                    )}
                    {field && (
                        <p className="flex justify-between">
                            <span className="font-medium">Trạng thái:</span>
                            <span className="truncate">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(field)}`}>
                                    {getStatusLabel(field)}
                                </span>
                            </span>
                        </p>
                    )}
                    <p className="flex justify-between">
                        <span className="font-medium">Số lượng nhà máy:</span>
                        <span className="truncate">
                            <span className={`inline-flex gap-1 items-center px-2 py-0.5 rounded-full text-xs font-medium`}>
                                <span className="text-[#4E5BA6]">{formattedCompanyCount.toLocaleString()}</span> nhà máy
                            </span>
                        </span>
                    </p>
                    <p className="flex justify-between">
                        <span className="font-medium">Lĩnh vực:</span>
                        <span className="truncate">
                            <span className={`inline-flex gap-1 items-center px-2 py-0.5 rounded-full text-xs font-medium`}>
                                Chưa có
                            </span>
                        </span>
                    </p>
                </div>
                <div className="flex justify-end items-center gap-2 mt-4">
                    {!isSelectMode && isTrashMode && (
                        <>
                            {onRestoreClick && (
                                <Tooltip title="Khôi phục">
                                    <Button
                                        icon={<RotateCcw size={16} />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRestoreClick();
                                        }}
                                        className="text-green-600 border-green-200 hover:bg-green-50 focus:text-green-600 rounded-lg h-9 px-4 flex items-center gap-1.5"
                                    >
                                        Khôi phục
                                    </Button>
                                </Tooltip>
                            )}
                            {onHardDeleteClick && (
                                <Tooltip title="Xóa vĩnh viễn">
                                    <Button
                                        danger
                                        icon={<Trash2 size={16} />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onHardDeleteClick();
                                        }}
                                        className="rounded-lg h-9 px-4 flex items-center gap-1.5"
                                    >
                                        Xóa vĩnh viễn
                                    </Button>
                                </Tooltip>
                            )}
                        </>
                    )}

                    {!isSelectMode && !isTrashMode && (
                        <>
                            {onDeleteClick && (
                                <Tooltip title="Vô hiệu hóa">
                                    <Button
                                        danger
                                        icon={<Trash2 size={16} />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteClick();
                                        }}
                                        className="flex items-center justify-center p-2 rounded-lg"
                                    />
                                </Tooltip>
                            )}
                            <Button
                                type="primary"
                                onClick={onDetailClick}
                                className="bg-[#4E5BA6] hover:bg-[#4E5BA6] text-white text-sm h-9 px-5 rounded-lg"
                            >
                                Chi tiết
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
