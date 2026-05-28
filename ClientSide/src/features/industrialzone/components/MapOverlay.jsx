// src/features/industrialzone/components/MapOverlayPortal.jsx
import ReactDOM from "react-dom";
import { useMap } from "react-leaflet";

const MapOverlayPortal = ({ children }) => {
  const map = useMap();
  const overlayPane = map.getPanes().overlayPane;
  return ReactDOM.createPortal(children, overlayPane);
};

export default MapOverlayPortal;
