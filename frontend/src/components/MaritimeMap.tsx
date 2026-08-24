import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GEOFENCE_ZONES } from '../data/maritimeData';
import type { PFZZone } from '../data/maritimeData';

interface MapProps {
  vesselLat: number;
  vesselLon: number;
  onVesselMove: (lat: number, lon: number) => void;
  pfzZones: PFZZone[];
  selectedPfz: PFZZone | null;
  onSelectPfz: (zone: PFZZone) => void;
  showSST: boolean;
  showChlorophyll: boolean;
  showWaves: boolean;
  showWind: boolean;
  showGeofence: boolean;
  showPFZ: boolean;
  showRoute: boolean;
  routeWaypoints?: [number, number][];
  isGeofenceAlert: boolean;
}

export const MaritimeMap: React.FC<MapProps> = ({
  vesselLat,
  vesselLon,
  onVesselMove,
  pfzZones,
  selectedPfz,
  onSelectPfz,
  showSST,
  showChlorophyll,
  showWaves,
  showWind,
  showGeofence,
  showPFZ,
  showRoute,
  routeWaypoints,
  isGeofenceAlert,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vesselMarkerRef = useRef<L.Marker | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [vesselLat, vesselLon],
      zoom: 8,
      zoomControl: false,
      attributionControl: true,
    });

    // Dark Matter nautical style basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO | ISRO Oceansat & Copernicus Data',
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layerGroup;

    // Create custom pulsing vessel marker icon
    const vesselIcon = L.divIcon({
      className: 'vessel-marker-container',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-cyan-400 opacity-75 pulse-radar"></div>
          <div class="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center text-xs">
            🚢
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([vesselLat, vesselLon], {
      icon: vesselIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      onVesselMove(position.lat, position.lon);
    });

    marker.bindPopup(`
      <div class="p-1">
        <h4 class="font-bold text-cyan-400 flex items-center gap-1">🚢 Active Vessel</h4>
        <p class="text-xs text-slate-300 mt-1">Drag marker anywhere to simulate real-time vessel relocation & safety telemetry.</p>
      </div>
    `);

    vesselMarkerRef.current = marker;

    // Allow clicking map to relocate vessel
    map.on('click', (e: L.LeafletMouseEvent) => {
      onVesselMove(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update vessel position smoothly
  useEffect(() => {
    if (vesselMarkerRef.current) {
      vesselMarkerRef.current.setLatLng([vesselLat, vesselLon]);
    }
  }, [vesselLat, vesselLon]);

  // Render Dynamic Map Layers (SST, Chlorophyll, Waves, Geofences, PFZs)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Sea Surface Temperature (SST) Thermal Gradients
    if (showSST) {
      // Draw thermal front circles with heat gradient
      const sstFronts = [
        { lat: vesselLat + 0.35, lon: vesselLon - 0.45, temp: '28.4°C', radius: 45000, color: '#f97316' },
        { lat: vesselLat - 0.25, lon: vesselLon - 0.65, temp: '27.6°C', radius: 55000, color: '#06b6d4' },
        { lat: vesselLat + 0.70, lon: vesselLon - 0.90, temp: '29.1°C', radius: 60000, color: '#ef4444' },
      ];

      sstFronts.forEach((front) => {
        const circle = L.circle([front.lat, front.lon], {
          radius: front.radius,
          color: front.color,
          fillColor: front.color,
          fillOpacity: 0.18,
          weight: 1.5,
          dashArray: '4, 8',
        }).addTo(group);

        circle.bindTooltip(`🌡️ SST Thermal Front: ${front.temp}`, { sticky: true, className: 'glass-panel text-xs text-cyan-300' });
      });
    }

    // 2. Chlorophyll-a Phytoplankton Bloom Layer
    if (showChlorophyll) {
      const blooms = [
        { lat: vesselLat + 0.15, lon: vesselLon - 0.35, value: '2.45 mg/m³', radius: 35000 },
        { lat: vesselLat - 0.45, lon: vesselLon - 0.50, value: '1.95 mg/m³', radius: 40000 },
      ];

      blooms.forEach((b) => {
        const circle = L.circle([b.lat, b.lon], {
          radius: b.radius,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.22,
          weight: 2,
        }).addTo(group);

        circle.bindTooltip(`🌿 High Chlorophyll Bloom: ${b.value} (Optimal Pelagic Forage)`, { sticky: true });
      });
    }

    // 3. High Waves & Swell Warning Contours
    if (showWaves) {
      const waveCorridor = L.polygon(
        [
          [vesselLat + 0.9, vesselLon - 1.2],
          [vesselLat + 1.2, vesselLon - 0.7],
          [vesselLat + 0.6, vesselLon - 0.3],
          [vesselLat + 0.3, vesselLon - 0.8],
        ],
        {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: '5, 5',
        }
      ).addTo(group);

      waveCorridor.bindTooltip('🌊 Swell Sector: Significant Wave Height 2.2m – 2.8m', { sticky: true });
    }

    // 4. Geofencing Zones (IMBL & MPAs)
    if (showGeofence) {
      GEOFENCE_ZONES.forEach((zone) => {
        if (zone.category === 'IMBL') {
          const polyline = L.polyline(zone.coordinates, {
            color: zone.color,
            weight: 3.5,
            dashArray: '8, 6',
            opacity: 0.9,
          }).addTo(group);

          polyline.bindTooltip(`🛑 <b>${zone.name}</b><br/><span style="color:#ef4444">${zone.description}</span>`, {
            sticky: true,
            className: 'glass-panel text-xs',
          });
        } else {
          const polygon = L.polygon(zone.coordinates, {
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.2,
            weight: 2,
          }).addTo(group);

          polygon.bindTooltip(`⚠️ <b>${zone.name}</b><br/>${zone.description}`, { sticky: true });
        }
      });
    }

    // 5. Potential Fishing Zones (PFZs) Markers
    if (showPFZ) {
      pfzZones.forEach((zone) => {
        const isSelected = selectedPfz?.id === zone.id;
        const pfzIcon = L.divIcon({
          className: 'pfz-marker',
          html: `
            <div class="cursor-pointer transition-transform hover:scale-125 ${isSelected ? 'scale-125' : ''}">
              <div class="w-8 h-8 rounded-full ${isSelected ? 'bg-emerald-400 ring-4 ring-emerald-500/50' : 'bg-emerald-500/90'} border-2 border-white shadow-xl flex items-center justify-center text-sm">
                🐟
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([zone.lat, zone.lon], { icon: pfzIcon }).addTo(group);

        marker.on('click', () => {
          onSelectPfz(zone);
        });

        marker.bindPopup(`
          <div class="p-2 space-y-1">
            <div class="flex items-center justify-between gap-2 border-b border-cyan-500/30 pb-1">
              <h4 class="font-bold text-emerald-400 text-sm">${zone.name}</h4>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">${zone.confidence}% Match</span>
            </div>
            <p class="text-xs text-slate-200"><strong>Dominant Species:</strong> ${zone.dominant_species}</p>
            <p class="text-xs text-slate-300"><strong>Depth:</strong> ~${zone.depth_m}m | <strong>SST:</strong> ${zone.sst_c}°C</p>
            <p class="text-xs text-slate-300"><strong>Chlorophyll:</strong> ${zone.chlorophyll_mg_m3} mg/m³</p>
            <p class="text-xs text-slate-300"><strong>Recommended Gear:</strong> ${zone.recommended_gear}</p>
            <p class="text-xs text-cyan-400 font-medium">📍 Distance: ${zone.distance_km || '--'} km from vessel</p>
          </div>
        `);
      });
    }

    // 6. Weather-Safe Navigation Route Line
    if (showRoute && routeWaypoints && routeWaypoints.length >= 2) {
      if (routePolylineRef.current) {
        group.removeLayer(routePolylineRef.current);
      }

      const routeLine = L.polyline(routeWaypoints, {
        color: '#00f0ff',
        weight: 3.5,
        dashArray: '6, 6',
        opacity: 0.95,
      }).addTo(group);

      routeLine.bindTooltip('🧭 Weather-Optimized Safe Navigation Corridor (A* Pathfinding)', { sticky: true });
      routePolylineRef.current = routeLine;
    }
  }, [
    showSST,
    showChlorophyll,
    showWaves,
    showWind,
    showGeofence,
    showPFZ,
    showRoute,
    pfzZones,
    selectedPfz,
    routeWaypoints,
    vesselLat,
    vesselLon,
  ]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Geofence Breach Banner overlay if vessel is in danger */}
      {isGeofenceAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-rose-950/90 border border-rose-500/80 px-6 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 animate-bounce">
          <span className="text-xl">🚨</span>
          <p className="text-xs md:text-sm font-bold text-rose-300 tracking-wide">
            CRITICAL GEOFENCE WARNING: Vessel approaching International Maritime Boundary Line (IMBL)!
          </p>
        </div>
      )}

      {/* Interactive Map Controls Help Tip */}
      <div className="absolute bottom-4 left-4 z-10 glass-panel px-3 py-1.5 rounded-lg text-[11px] text-slate-400 flex items-center gap-2 pointer-events-none">
        <span className="text-cyan-400">💡</span>
        <span>Click anywhere on the sea to relocate vessel GPS | Drag 🚢 icon to simulate position</span>
      </div>
    </div>
  );
};
