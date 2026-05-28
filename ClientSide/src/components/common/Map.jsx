import React, { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, useMap, Polyline } from "react-leaflet";
import { Compass, Route } from "lucide-react";
import { Tooltip } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import ZoneDetailPopup from "@features/industrialzone/components/ZoneDeatailPopup";
import MarkerLabel from "@features/industrialzone/components/MarkerLabel";
import "leaflet/dist/leaflet.css";
import toast from "@/utils/toast";

// ========================= ROUTING COMPONENT =========================
const Routing = ({ start, end, onRouteCalculated }) => {
  const map = useMap();
  const stableOnRouteCalculated = useCallback(onRouteCalculated, [onRouteCalculated]);

  useEffect(() => {
    if (!start || !end) return;

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
          const distance = (route.distance / 1000).toFixed(2);
          const duration = Math.round(route.duration / 60);
          stableOnRouteCalculated({ coordinates, distance, duration });
          map.fitBounds(coordinates, { padding: [50, 50] });
        }
      } catch (error) {
        console.error("Lỗi khi lấy lộ trình:", error);
      }
    };

    fetchRoute();
  }, [start, end, map, stableOnRouteCalculated]);

  return null;
};

// ========================= CHANGE VIEW =========================
const ChangeView = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom);
      const timer = setTimeout(() => map.invalidateSize(), 400);
      return () => clearTimeout(timer);
    }
  }, [center, zoom, map]);

  return null;
};

// ========================= MAIN MAP COMPONENT =========================
export const MapComponent = ({
  selectedZone,
  allZones = [],
  onClose,
  defaultCenter = [10.7769, 106.7009],
  defaultZoom = 10,
}) => {
  const [userLocation, setUserLocation] = useState(null);
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const [showRouteButton, setShowRouteButton] = useState(false);
  const [route, setRoute] = useState(null);
  const [showRoute, setShowRoute] = useState(false);
  const [activeZone, setActiveZone] = useState(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false); // 👈 mới thêm

  const isValidCoordinates = (lat, lon) => {
    return typeof lat === "number" && typeof lon === "number" && !isNaN(lat) && !isNaN(lon);
  };

  const handleFindUserLocation = () => {
    setIsFindingLocation(true);
    setShowRouteButton(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lon: longitude });
          setTimeout(() => setShowRouteButton(true), 300);
          setIsFindingLocation(false);
        },
        (err) => {
          toast.error("Lỗi định vị", err.message);
          setIsFindingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toast.error("Không hỗ trợ", "Trình duyệt không hỗ trợ định vị.");
      setIsFindingLocation(false);
    }
  };

  const handleShowRoute = () => {
    if (userLocation && selectedZone) {
      setShowRoute(true);
    }
  };

  const handleRouteCalculated = useCallback((routeInfo) => {
    setRoute(routeInfo);
  }, []);

  // ✅ Center map khi chọn zone mới từ danh sách
  const center = useMemo(
    () =>
      selectedZone && isValidCoordinates(selectedZone.latitude, selectedZone.longitude)
        ? [selectedZone.latitude, selectedZone.longitude]
        : defaultCenter,
    [selectedZone, defaultCenter]
  );

  const zoom = useMemo(
    () =>
      selectedZone && isValidCoordinates(selectedZone.latitude, selectedZone.longitude)
        ? 13
        : defaultZoom,
    [selectedZone, defaultZoom]
  );

  const routeEnd = useMemo(
    () =>
      selectedZone
        ? { lat: selectedZone.latitude, lon: selectedZone.longitude }
        : null,
    [selectedZone]
  );

  useEffect(() => {
  if (selectedZone) {
    // 🧭 Chỉ fly đến zone, KHÔNG mở popup
    setIsUserInteracting(false);
  }
}, [selectedZone]);

  return (
    <div className="relative w-full h-full bg-white rounded-xl shadow-lg">
      {/* ========================= BUTTONS ========================= */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Tooltip title="Đóng bản đồ" placement="left">
          <button
            onClick={onClose}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
          >
            <span className="font-bold">✕</span>
          </button>
        </Tooltip>

        <Tooltip title="Tìm vị trí của tôi" placement="left">
          <button
            onClick={handleFindUserLocation}
            className={`bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition-colors ${
              isFindingLocation ? "animate-pulse" : ""
            }`}
            disabled={isFindingLocation}
          >
            <Compass size={20} className="text-gray-700" />
          </button>
        </Tooltip>

        <AnimatePresence>
          {userLocation && selectedZone && showRouteButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <Tooltip title="Xem lộ trình" placement="left">
                <button
                  onClick={handleShowRoute}
                  className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100 transition-colors"
                >
                  <Route size={20} className="text-blue-600" />
                </button>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========================= ROUTE INFO ========================= */}
      {route && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-white py-2 px-4 rounded-lg shadow-lg text-center">
          <p className="font-bold text-gray-800">Khoảng cách: {route.distance} km</p>
          <p className="text-sm text-gray-600">Thời gian di chuyển: ~{route.duration} phút</p>
        </div>
      )}

      {/* ========================= MAP ========================= */}
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} className="rounded-xl">
        {!isUserInteracting && <ChangeView center={center} zoom={zoom} />}

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* ✅ Hiển thị popup label + chi tiết */}
        {allZones
          .filter((z) => isValidCoordinates(z.latitude, z.longitude))
          .map((zone) => {
            const isActive = activeZone?.zone_id === zone.zone_id;
            const showDetail = isActive;

            return (
              <MarkerLabel
                key={zone.zone_id}
                zone={zone}
                isActive={isActive}
                showDetail={showDetail}
                onClick={(z) => {
                  setIsUserInteracting(true);
                  setActiveZone((prev) => (prev?.zone_id === z.zone_id ? null : z));
                }}
              />
            );
          })}

        {/* ✅ Vẽ lộ trình */}
        {showRoute && userLocation && routeEnd && (
          <Routing start={userLocation} end={routeEnd} onRouteCalculated={handleRouteCalculated} />
        )}

        {route && <Polyline positions={route.coordinates} color="#007BFF" weight={5} />}
      </MapContainer>
    </div>
  );
};
