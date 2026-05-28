import React from "react";

const ZoneDetailPopup = ({ zone, loading = false, error = null }) => {
  if (!zone && !loading) return null;

  // Helper để hiển thị trạng thái giống IndustrialZoneCard
  const getStatusLabel = (status) => {
    if (!status) return "Chưa có trạng thái";
    const s = String(status).toLowerCase();
    if (s.includes("active") || s.includes("hoạt động")) return "Đang hoạt động";
    if (s.includes("off") || s.includes("ngưng") || s.includes("tạm ngưng")) return "Ngưng hoạt động";
    return status;
  };

  const getStatusStyle = (status) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = String(status).toLowerCase();
    if (s.includes("active") || s.includes("hoạt động")) return "bg-green-100 text-green-800 border-green-300";
    if (s.includes("off") || s.includes("ngưng") || s.includes("tạm ngưng")) return "bg-red-100 text-red-800 border-red-300";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="zone-detail-popup w-[280px] rounded-xl shadow-lg overflow-hidden bg-white border border-gray-200">
      {loading ? (
        <div className="flex items-center justify-center h-36">Đang tải...</div>
      ) : error ? (
        <div className="p-4 text-red-500 text-sm">{error}</div>
      ) : (
        <>
          {zone.image_url && (
            <img
              src={zone.image_url}
              alt={zone.zone_name}
              className="w-full h-32 object-cover border-b"
            />
          )}
          <div className="p-3 space-y-2">
            <h3 className="text-[15px] font-semibold text-[#4E5BA6] truncate">
              {zone.zone_name}
            </h3>

            {zone.zone_id && (
              <p className="text-xs text-gray-500 flex justify-between">
                <span className="font-medium">Mã số:</span> <span>{zone.zone_id}</span>
              </p>
            )}

            {zone.location && (
              <p className="text-xs text-gray-500 flex flex-nowrap items-center gap-1">
                <span className="font-medium flex-shrink-0">Địa chỉ:</span>
                <span className="truncate" title={zone.location}>{zone.location}</span>
              </p>
            )}

            {zone.status && (
              <p className="text-xs text-gray-500 flex justify-between">
                <span className="font-medium">Trạng thái:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(zone.status)}`}>
                  {getStatusLabel(zone.status)}
                </span>
              </p>
            )}

            {zone.factories && (
              <p className="text-xs flex justify-between">
                <span className="font-medium">Số lượng nhà máy:</span>
                <span className="truncate">{zone.factories} nhà máy</span>
              </p>
            )}

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${zone.latitude},${zone.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-blue-600 hover:underline pt-1"
            >
              Xem trên Google Maps →
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export default ZoneDetailPopup;
