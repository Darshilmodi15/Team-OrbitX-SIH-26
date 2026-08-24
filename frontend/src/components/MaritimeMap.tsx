import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { GEOFENCE_ZONES, COASTAL_CITIES, TRANSLATIONS } from '../data/maritimeData';
import type { PFZZone } from '../data/maritimeData';
import type { IncoisPFZZone } from '../services/apiService';
import { Layers } from 'lucide-react';

interface MapProps {
  vesselLat: number;
  vesselLon: number;
  onVesselMove: (lat: number, lon: number) => void;
  pfzZones: PFZZone[];
  incoisPfzZones?: IncoisPFZZone[];
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
  currentLang?: string;
}

export const MaritimeMap: React.FC<MapProps> = ({
  vesselLat,
  vesselLon,
  onVesselMove,
  pfzZones,
  incoisPfzZones,
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
  currentLang = 'en',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vesselMarkerRef = useRef<L.Marker | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const citiesGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [baseMapType, setBaseMapType] = useState<'satellite' | 'standard'>('satellite');
  const satelliteTileRef = useRef<L.TileLayer | null>(null);
  const standardTileRef = useRef<L.TileLayer | null>(null);

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // Render smart zoom-based coastal city labels
  const updateCoastalCityLabels = useCallback(() => {
    const map = mapInstanceRef.current;
    const citiesGroup = citiesGroupRef.current;
    if (!map || !citiesGroup) return;

    citiesGroup.clearLayers();
    const currentZoom = map.getZoom();

    COASTAL_CITIES.forEach((city) => {
      if (currentZoom >= city.minZoom) {
        const isPriority = city.tier === 1;
        const iconHtml = isPriority
          ? `
            <div class="pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white font-bold text-[11px] shadow-lg border border-teal-400/80 backdrop-blur-xs whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-teal-400 shrink-0"></span>
              <span class="tracking-wide">${city.name}</span>
            </div>
          `
          : `
            <div class="pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-100 font-semibold text-[10px] shadow-md border border-slate-600/70 backdrop-blur-xs whitespace-nowrap">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-300 shrink-0"></span>
              <span>${city.name}</span>
            </div>
          `;

        const cityIcon = L.divIcon({
          className: 'coastal-city-label',
          html: iconHtml,
          iconSize: [isPriority ? 110 : 90, 24],
          iconAnchor: [isPriority ? 55 : 45, 12],
        });

        L.marker([city.lat, city.lon], {
          icon: cityIcon,
          interactive: false,
          zIndexOffset: isPriority ? 500 : 300,
        }).addTo(citiesGroup);
      }
    });
  }, []);

  const onVesselMoveRef = useRef(onVesselMove);
  useEffect(() => {
    onVesselMoveRef.current = onVesselMove;
  }, [onVesselMove]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [vesselLat, vesselLon],
      zoom: 8,
      zoomControl: false,
      attributionControl: true,
    });

    // 1. Esri Satellite Imagery Base Map (DEFAULT BASEMAP)
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community | ISRO Oceansat',
      }
    );

    // 2. Standard / Nautical Map Base Layer
    const standardLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO | ISRO Oceansat & Copernicus Data',
      }
    );

    satLayer.addTo(map);
    satelliteTileRef.current = satLayer;
    standardTileRef.current = standardLayer;

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layerGroup;

    const citiesGroup = L.layerGroup().addTo(map);
    citiesGroupRef.current = citiesGroup;

    // Create custom pulsing vessel marker icon
    const vesselIcon = L.divIcon({
      className: 'vessel-marker-container',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-9 h-9 rounded-full bg-cyan-400 opacity-80 pulse-radar"></div>
          <div class="w-6 h-6 rounded-full bg-teal-600 border-2 border-white shadow-xl flex items-center justify-center text-xs">
            🚢
          </div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    const marker = L.marker([vesselLat, vesselLon], {
      icon: vesselIcon,
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(map);

    marker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      onVesselMoveRef.current(position.lat, position.lon);
    });

    marker.bindPopup(`
      <div class="p-1.5 font-sans">
        <h4 class="font-bold text-teal-800 flex items-center gap-1.5 text-xs">
          🚢 Active Fishing Vessel
        </h4>
        <p class="text-[11px] text-slate-600 mt-1">
          Drag marker anywhere or click the map to relocate vessel GPS coordinates.
        </p>
      </div>
    `);

    vesselMarkerRef.current = marker;

    // Allow clicking map to relocate vessel
    map.on('click', (e: L.LeafletMouseEvent) => {
      onVesselMoveRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    // Listen to zoom changes for smart coastal city visibility
    map.on('zoomend', () => {
      updateCoastalCityLabels();
    });

    updateCoastalCityLabels();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [updateCoastalCityLabels, vesselLat, vesselLon]);

  // Update coastal city labels when callback is ready
  useEffect(() => {
    updateCoastalCityLabels();
  }, [updateCoastalCityLabels]);

  // Handle Basemap Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !satelliteTileRef.current || !standardTileRef.current) return;

    if (baseMapType === 'satellite') {
      if (map.hasLayer(standardTileRef.current)) {
        map.removeLayer(standardTileRef.current);
      }
      if (!map.hasLayer(satelliteTileRef.current)) {
        satelliteTileRef.current.addTo(map);
      }
    } else {
      if (map.hasLayer(satelliteTileRef.current)) {
        map.removeLayer(satelliteTileRef.current);
      }
      if (!map.hasLayer(standardTileRef.current)) {
        standardTileRef.current.addTo(map);
      }
    }
  }, [baseMapType]);

  // Update vessel position smoothly
  useEffect(() => {
    if (vesselMarkerRef.current) {
      vesselMarkerRef.current.setLatLng([vesselLat, vesselLon]);
    }
  }, [vesselLat, vesselLon]);

  // Render Dynamic Map Overlays (SST, Chlorophyll, Waves, Wind, Geofences, PFZs, Safe Route)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Sea Surface Temperature (SST) Thermal Gradients
    if (showSST) {
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
          fillOpacity: 0.22,
          weight: 2,
          dashArray: '5, 8',
        }).addTo(group);

        circle.bindTooltip(`🌡️ SST Thermal Front: ${front.temp}`, {
          sticky: true,
          className: 'bg-white text-slate-900 border border-slate-200 text-xs px-2 py-1 rounded-md shadow-md',
        });
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
          fillOpacity: 0.25,
          weight: 2,
        }).addTo(group);

        circle.bindTooltip(`🌿 High Chlorophyll Bloom: ${b.value} (Pelagic Forage Area)`, {
          sticky: true,
          className: 'bg-white text-slate-900 border border-slate-200 text-xs px-2 py-1 rounded-md shadow-md',
        });
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
          fillOpacity: 0.20,
          weight: 2,
          dashArray: '6, 6',
        }
      ).addTo(group);

      waveCorridor.bindTooltip('🌊 Swell Sector: Significant Wave Height 2.2m – 2.8m', {
        sticky: true,
        className: 'bg-white text-slate-900 border border-slate-200 text-xs px-2 py-1 rounded-md shadow-md',
      });
    }

    // 4. Wind Vector Streamline Indicators
    if (showWind) {
      const windVectors = [
        { lat: vesselLat + 0.5, lon: vesselLon - 0.5, speed: '42 km/h WSW' },
        { lat: vesselLat - 0.4, lon: vesselLon - 0.2, speed: '38 km/h WSW' },
        { lat: vesselLat + 0.2, lon: vesselLon - 0.8, speed: '45 km/h WSW' },
      ];

      windVectors.forEach((w) => {
        const windIcon = L.divIcon({
          className: 'wind-vector-marker',
          html: `
            <div class="flex items-center gap-1 bg-white/95 border border-cyan-400/80 px-2 py-0.5 rounded-full shadow-sm text-[10px] font-bold text-cyan-800">
              <span>💨</span>
              <span>${w.speed}</span>
            </div>
          `,
          iconSize: [110, 24],
          iconAnchor: [55, 12],
        });

        L.marker([w.lat, w.lon], { icon: windIcon }).addTo(group);
      });
    }

    // 5. Geofencing Zones (IMBL & MPAs)
    if (showGeofence) {
      GEOFENCE_ZONES.forEach((zone) => {
        if (zone.category === 'IMBL') {
          const polyline = L.polyline(zone.coordinates, {
            color: zone.color,
            weight: 4,
            dashArray: '8, 6',
            opacity: 0.95,
          }).addTo(group);

          polyline.bindTooltip(
            `<div class="p-1"><b class="text-rose-600">🛑 ${zone.name}</b><br/><span class="text-slate-600 text-xs">${zone.description}</span></div>`,
            {
              sticky: true,
              className: 'bg-white text-slate-900 border border-rose-300 text-xs px-2 py-1 rounded-lg shadow-lg',
            }
          );
        } else {
          const polygon = L.polygon(zone.coordinates, {
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.22,
            weight: 2,
          }).addTo(group);

          polygon.bindTooltip(
            `<div class="p-1"><b class="text-amber-600">⚠️ ${zone.name}</b><br/><span class="text-slate-600 text-xs">${zone.description}</span></div>`,
            {
              sticky: true,
              className: 'bg-white text-slate-900 border border-amber-300 text-xs px-2 py-1 rounded-lg shadow-lg',
            }
          );
        }
      });
    }

    // 6. Potential Fishing Zones (PFZs) Markers
    if (showPFZ) {
      // 6a. Render Real INCOIS PFZ Markers if available
      if (incoisPfzZones && incoisPfzZones.length > 0) {
        incoisPfzZones.forEach((zone) => {
          const incoisIcon = L.divIcon({
            className: 'incois-pfz-marker',
            html: `
              <div class="cursor-pointer transition-transform hover:scale-125" title="INCOIS PFZ: ${zone.landing_centre}">
                <div class="w-8 h-8 rounded-full bg-teal-600 border-2 border-white shadow-xl flex items-center justify-center text-xs ring-2 ring-teal-400/80">
                  🎯
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([zone.latitude, zone.longitude], { icon: incoisIcon }).addTo(group);

          marker.bindPopup(`
            <div class="p-2 space-y-1.5 text-slate-900 min-w-[220px] font-sans">
              <div class="flex items-center justify-between border-b border-teal-200 pb-1">
                <h4 class="font-bold text-teal-800 text-xs flex items-center gap-1">
                  🐟 Potential Fishing Zone
                </h4>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">${zone.id.toUpperCase()}</span>
              </div>
              <div class="text-[11px] space-y-1 text-slate-600">
                <p><strong>Landing centre:</strong> <span class="text-slate-900 font-medium">${zone.landing_centre}</span></p>
                <p><strong>Direction:</strong> <span class="text-slate-900 font-medium">${zone.direction}</span></p>
                <p><strong>Bearing:</strong> <span class="text-slate-900 font-medium">${zone.bearing_deg}°</span></p>
                <p><strong>Distance range:</strong> <span class="text-teal-700 font-semibold">${zone.distance_km.min} - ${zone.distance_km.max} km</span></p>
                <p><strong>Depth range:</strong> <span class="text-slate-800">${zone.depth_m.min} - ${zone.depth_m.max} m</span></p>
                <p><strong>Coordinates:</strong> ${zone.latitude.toFixed(4)}°N, ${zone.longitude.toFixed(4)}°E</p>
              </div>
              <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span class="text-teal-800 font-bold">Source: INCOIS</span>
                <span>Official Advisory</span>
              </div>
            </div>
          `);
        });
      }

      // 6b. Render Mock/Calibrated PFZ zones
      pfzZones.forEach((zone) => {
        const isSelected = selectedPfz?.id === zone.id;
        const pfzIcon = L.divIcon({
          className: 'pfz-marker',
          html: `
            <div class="cursor-pointer transition-transform hover:scale-125 ${isSelected ? 'scale-125' : ''}">
              <div class="w-8 h-8 rounded-full ${isSelected ? 'bg-emerald-600 ring-4 ring-emerald-400/60' : 'bg-emerald-600'} border-2 border-white shadow-xl flex items-center justify-center text-sm">
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
          <div class="p-2 space-y-1.5 font-sans min-w-[210px]">
            <div class="flex items-center justify-between gap-2 border-b border-emerald-200 pb-1">
              <h4 class="font-bold text-emerald-800 text-xs">${zone.name}</h4>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">${zone.confidence}% Match</span>
            </div>
            <div class="text-[11px] text-slate-600 space-y-0.5">
              <p><strong>Dominant Species:</strong> <span class="text-slate-900">${zone.dominant_species}</span></p>
              <p><strong>Depth:</strong> ~${zone.depth_m}m | <strong>SST:</strong> ${zone.sst_c}°C</p>
              <p><strong>Chlorophyll:</strong> ${zone.chlorophyll_mg_m3} mg/m³</p>
              <p><strong>Recommended Gear:</strong> ${zone.recommended_gear}</p>
              <p class="text-teal-700 font-semibold pt-0.5">📍 Distance: ${zone.distance_km || '--'} km from vessel</p>
            </div>
          </div>
        `);
      });
    }

    // 7. Weather-Safe Navigation Route Line (A* Path)
    if (showRoute && routeWaypoints && routeWaypoints.length >= 2) {
      if (routePolylineRef.current) {
        group.removeLayer(routePolylineRef.current);
      }

      const routeLine = L.polyline(routeWaypoints, {
        color: '#0d9488',
        weight: 3.5,
        dashArray: '6, 6',
        opacity: 0.95,
      }).addTo(group);

      routeLine.bindTooltip('🧭 Weather-Optimized Safe Navigation Corridor (A* Pathfinding)', {
        sticky: true,
        className: 'bg-white text-slate-900 border border-teal-300 text-xs px-2 py-1 rounded-md shadow-md',
      });
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
    incoisPfzZones,
    selectedPfz,
    onSelectPfz,
    routeWaypoints,
    vesselLat,
    vesselLon,
  ]);

  return (
    <div className="relative flex-1 w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
      {/* Central Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Basemap Switcher (Satellite vs Standard Map) */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-1.5 shadow-md flex items-center gap-1 text-xs font-sans">
        <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-teal-700" />
          {t.baseMapTitle || 'BASE MAP'}:
        </span>
        <button
          onClick={() => setBaseMapType('satellite')}
          className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
            baseMapType === 'satellite'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🛰️ {t.baseMapSatellite || 'Satellite'}
        </button>
        <button
          onClick={() => setBaseMapType('standard')}
          className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
            baseMapType === 'standard'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🗺️ {t.baseMapStandard || 'Standard Map'}
        </button>
      </div>

      {/* Geofence Breach Alert Banner */}
      {isGeofenceAlert && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-rose-600 text-white border border-rose-700 px-5 py-2 rounded-full shadow-xl flex items-center gap-2.5 animate-bounce">
          <span className="text-lg">🚨</span>
          <p className="text-xs md:text-sm font-bold tracking-wide">
            CRITICAL GEOFENCE WARNING: Vessel approaching International Maritime Boundary Line (IMBL)!
          </p>
        </div>
      )}

      {/* Interactive Map Hint at Bottom */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 px-3.5 py-1.5 rounded-xl text-[11px] text-slate-600 flex items-center gap-2 shadow-sm pointer-events-none">
        <span className="text-teal-700 text-sm">💡</span>
        <span>{t.mapHint || 'Click anywhere on the sea to relocate vessel GPS | Drag 🚢 icon to simulate position'}</span>
      </div>
    </div>
  );
};

