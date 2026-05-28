import React from "react";
import { useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import ZoneDetailPopup from "@features/industrialzone/components/ZoneDeatailPopup";

const MarkerLabel = ({ zone, isActive, showDetail, onHover, onLeave, onClick }) => {
  const map = useMap();
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!map) return;
    const updatePosition = () => {
      const point = map.latLngToContainerPoint([zone.latitude, zone.longitude]);
      setPosition({ x: point.x, y: point.y });
    };
    updatePosition();
    map.on("move", updatePosition);
    map.on("zoom", updatePosition);
    return () => {
      map.off("move", updatePosition);
      map.off("zoom", updatePosition);
    };
  }, [map, zone.latitude, zone.longitude]);

  const handleClick = () => {
    onClick(zone);
    if (map && zone.latitude && zone.longitude) {
      map.flyTo([zone.latitude, zone.longitude], map.getZoom(), { duration: 1.2 });
    }
  };

  const isActiveZone =
    zone.status?.toLowerCase() === "đang hoạt động" ||
    zone.status?.toLowerCase() === "active";

  const statusColor = isActiveZone ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300";
  const statusText = isActiveZone ? "Đang hoạt động" : "Ngưng hoạt động";

  return (
    <div
      className="absolute z-[900]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)", // nổi trên vị trí marker
      }}
      onMouseEnter={() => onHover?.(zone)}
      onMouseLeave={onLeave}
      onClick={handleClick}
    >
      {/* 🎈 Balloon-style Label */}
      <motion.div
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className={`relative w-[200px] text-[13px] rounded-xl shadow-lg border transition-all
        ${isActive ? "border-blue-400 ring-1 ring-blue-100" : "border-gray-200"} 
        bg-white text-gray-800 cursor-pointer`}
      >
        <div className="p-2.5 space-y-1">
          <div className="font-semibold text-sm line-clamp-1">{zone.zone_name}</div>
          <div className="text-gray-600 text-xs">
            Mã số: <span className="font-medium">{zone.zone_id || "—"}</span>
          </div>

          {/* 🟢 Trạng thái */}
          <div
            className={`inline-block text-[11px] font-medium px-2 py-[2px] rounded-full border ${statusColor}`}
          >
            {statusText}
          </div>
        </div>

        {/* ⬇️ Mũi nhọn */}
        <div
          className="absolute left-1/2 -bottom-[12px] w-0 h-0 
          border-l-[12px] border-l-transparent 
          border-r-[12px] border-r-transparent 
          border-t-[12px] border-t-white drop-shadow-sm"
          style={{ transform: "translateX(-50%)" }}
        />
      </motion.div>

      {/* 📍 Popup chi tiết */}
      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 -translate-x-1/2 mt-3 "
          >
            <ZoneDetailPopup zone={zone} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarkerLabel;
