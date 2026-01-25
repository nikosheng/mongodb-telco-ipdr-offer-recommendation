import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import OfferDashboard from './OfferDashboard';

// Component to handle map re-centering
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom DivIcon for users
const createPulseIcon = (msisdn, isLatest) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-10 h-10 ${isLatest ? 'bg-red-500' : 'bg-blue-500'} rounded-full animate-ping opacity-20"></div>
        <div class="relative w-10 h-10 ${isLatest ? 'bg-red-600 border-red-200 text-white' : 'bg-white border-blue-600 text-blue-700'} border-2 rounded-full flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform duration-300">
          <span class="text-[10px] font-black">${msisdn.slice(-2)}</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

const Map = ({ markers, center }) => {
  return (
    <div className="h-full w-full relative">
      <OfferDashboard />
      <MapContainer 
        center={center} 
        zoom={13} 
        zoomControl={false}
        style={{ height: "100%", width: "100%", background: "#e2e8f0" }}
      >
        <ChangeView center={center} zoom={13} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ZoomControl position="bottomright" />
        {markers.map((marker, idx) => (
          marker.position && (
            <Marker 
              key={marker.id || `${marker.msisdn}-${marker.position[0]}-${marker.position[1]}-${idx}`} 
              position={marker.position}
              icon={marker.msisdn ? createPulseIcon(marker.msisdn, marker.isLatest) : DefaultIcon}
            >
              <Popup className="custom-popup">
                {marker.content}
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
