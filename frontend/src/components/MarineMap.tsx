import { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PFZMarker from './PFZMarker';
import type { LocationCoords, PFZEvidenceItem } from '../App';
import type { GisLayerState } from './GisLayersPanel';
import {
  COASTAL_CITIES,
  GEOFENCE_ZONES,
  MOCK_PFZ_ZONES,
  type CoastalCity,
} from '../data/maritimeData';
import { Navigation, Satellite, Globe } from 'lucide-react';

/**
 * Creates custom glowing tactical icon for user's vessel location.
 */
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center w-11 h-11 cursor-pointer">
        <div class="absolute w-11 h-11 rounded-full bg-teal-400/30 pulse-beacon"></div>
        <div class="absolute w-8 h-8 rounded-full bg-[#0F766E]/40 border-2 border-teal-300 shadow-[0_0_16px_rgba(15,118,110,0.8)]"></div>
        <div class="relative w-5 h-5 rounded-full bg-gradient-to-tr from-[#0F766E] to-[#0284C7] shadow-md flex items-center justify-center text-white text-[10px] font-bold border border-white">
          ⚓
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

/**
 * Creates clean high-visibility halo badge for coastal cities.
 */
const createCityLabelIcon = (city: CoastalCity) => {
  const isPriority = city.priority;
  const badgeClass = isPriority
    ? 'bg-[#0F766E] text-white border-white font-extrabold shadow-md'
    : 'bg-white/95 text-slate-800 border-slate-300 font-bold shadow-sm';

  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${badgeClass} text-[11px] whitespace-nowrap select-none">
        <span class="text-[10px]">${isPriority ? '⚓' : '📍'}</span>
        <span>${city.name}</span>
      </div>
    `,
    iconSize: [100, 24],
    iconAnchor: [50, 12],
    popupAnchor: [0, -12],
  });
};

/**
 * Map resizer component ensuring Leaflet smoothly adjusts to container dimensions.
 */
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 400);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

/**
 * Handles map click to relocate vessel and tracks zoom level for smart city label visibility.
 */
interface MapControllerProps {
  center: LocationCoords;
  onMapClick?: (coords: LocationCoords) => void;
  onZoomChange: (zoom: number) => void;
}

function MapController({ onMapClick, onZoomChange }: MapControllerProps) {
  const map = useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng });
      }
    },
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

/**
 * Bounds updater that focuses on vessel and active PFZ markers.
 */
function MapBoundsUpdater({
  center,
  pfzZones,
}: {
  center: LocationCoords;
  pfzZones: PFZEvidenceItem[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (pfzZones && pfzZones.length > 0) {
      const bounds = L.latLngBounds([[center.lat, center.lon]]);
      pfzZones.forEach((z) => {
        if (typeof z.latitude === 'number' && typeof z.longitude === 'number') {
          bounds.extend([z.latitude, z.longitude]);
        }
      });
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 11, animate: true });
    }
  }, [map, center, pfzZones]);

  return null;
}

export interface MarineMapProps {
  userLocation: LocationCoords;
  pfzZones?: PFZEvidenceItem[];
  layers?: GisLayerState;
  onRelocateVessel?: (coords: LocationCoords) => void;
}

export default function MarineMap({
  userLocation,
  pfzZones = [],
  layers = {
    pfz: true,
    geofence: true,
    route: true,
    sst: true,
    chlorophyll: true,
    waves: true,
    wind: true,
  },
  onRelocateVessel,
}: MarineMapProps) {
  // Default to Satellite Base Map
  const [baseMapType, setBaseMapType] = useState<'satellite' | 'standard'>('satellite');
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const userIcon = createUserIcon();

  // Combine backend PFZ zones with mock PFZs if backend returned empty
  const activePFZs = useMemo(() => {
    if (pfzZones && pfzZones.length > 0) return pfzZones;
    return MOCK_PFZ_ZONES.map((z) => ({
      name: z.name,
      latitude: z.lat,
      longitude: z.lon,
      distance_km: z.distance_km || 28.5,
      depth_m: z.depth_m,
      species: [z.dominant_species],
      source: 'INCOIS_PFZ_ADVISORY',
    }));
  }, [pfzZones]);

  // Find nearest PFZ zone to vessel for the Safe Route Corridor
  const nearestPFZ = useMemo(() => {
    if (!activePFZs || activePFZs.length === 0) return null;
    let closest = activePFZs[0];
    let minDistance = Infinity;

    activePFZs.forEach((z) => {
      const d = Math.hypot(z.latitude - userLocation.lat, z.longitude - userLocation.lon);
      if (d < minDistance) {
        minDistance = d;
        closest = z;
      }
    });
    return closest;
  }, [activePFZs, userLocation]);

  // Generate safe route waypoints between userLocation and nearest PFZ
  const safeRouteCoords = useMemo(() => {
    if (!nearestPFZ) return [];
    // Midpoint curved waypoint for marine navigation fairway
    const midLat = (userLocation.lat + nearestPFZ.latitude) / 2 + 0.04;
    const midLon = (userLocation.lon + nearestPFZ.longitude) / 2 - 0.05;
    return [
      [userLocation.lat, userLocation.lon] as [number, number],
      [midLat, midLon] as [number, number],
      [nearestPFZ.latitude, nearestPFZ.longitude] as [number, number],
    ];
  }, [userLocation, nearestPFZ]);

  // Filter coastal city labels by zoom level
  const visibleCities = useMemo(() => {
    return COASTAL_CITIES.filter((city) => {
      if (currentZoom < 7) {
        return city.priority; // Only priority cities (Mumbai, Surat, Panaji, Mangaluru, Kochi)
      } else if (currentZoom < 10) {
        return city.priority || city.minZoom <= 7; // Priority + regional cities
      }
      return true; // All coastal towns
    });
  }, [currentZoom]);

  return (
    <div className="relative w-full h-full min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-900">
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={8}
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full z-0"
      >
        {/* BASE LAYER 1: SATELLITE (DEFAULT) */}
        {baseMapType === 'satellite' ? (
          <TileLayer
            key="esri-satellite"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          /* BASE LAYER 2: STANDARD / VOYAGER */
          <TileLayer
            key="carto-voyager"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
        )}

        <MapResizer />
        <MapController
          center={userLocation}
          onMapClick={onRelocateVessel}
          onZoomChange={setCurrentZoom}
        />
        <MapBoundsUpdater center={userLocation} pfzZones={pfzZones} />

        {/* 1. LAYER: SST HEATMAP (Thermal Shelf Bands) */}
        {layers.sst && (
          <>
            <Circle
              center={[userLocation.lat - 0.25, userLocation.lon - 0.35]}
              radius={24000}
              pathOptions={{
                color: '#f97316',
                fillColor: '#ea580c',
                fillOpacity: 0.18,
                weight: 1.5,
                dashArray: '4, 4',
              }}
            >
              <Popup>
                <div className="p-1.5 text-xs">
                  <div className="font-bold text-orange-600">🌡️ Sea Surface Temp Front</div>
                  <div className="text-slate-600 mt-1">SST: 28.2°C • Continental Shelf Upwelling</div>
                </div>
              </Popup>
            </Circle>
            <Circle
              center={[userLocation.lat + 0.3, userLocation.lon - 0.45]}
              radius={30000}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#d97706',
                fillOpacity: 0.14,
                weight: 1.5,
              }}
            />
          </>
        )}

        {/* 2. LAYER: CHLOROPHYLL-A BLOOM (Upwelling Plumes) */}
        {layers.chlorophyll && (
          <>
            <Circle
              center={[userLocation.lat + 0.15, userLocation.lon - 0.22]}
              radius={18000}
              pathOptions={{
                color: '#10b981',
                fillColor: '#059669',
                fillOpacity: 0.22,
                weight: 1.5,
              }}
            >
              <Popup>
                <div className="p-1.5 text-xs">
                  <div className="font-bold text-emerald-600">🌿 Chlorophyll-a Bloom</div>
                  <div className="text-slate-600 mt-1">Density: 2.15 mg/m³ • High Primary Productivity</div>
                </div>
              </Popup>
            </Circle>
          </>
        )}

        {/* 3. LAYER: WAVE / SWELL CONTOURS */}
        {layers.waves && (
          <>
            <Polyline
              positions={[
                [userLocation.lat - 0.5, userLocation.lon - 0.8],
                [userLocation.lat, userLocation.lon - 0.6],
                [userLocation.lat + 0.5, userLocation.lon - 0.8],
              ]}
              pathOptions={{
                color: '#3b82f6',
                weight: 2,
                opacity: 0.65,
                dashArray: '6, 6',
              }}
            />
            <Polyline
              positions={[
                [userLocation.lat - 0.6, userLocation.lon - 0.5],
                [userLocation.lat - 0.1, userLocation.lon - 0.35],
                [userLocation.lat + 0.4, userLocation.lon - 0.5],
              ]}
              pathOptions={{
                color: '#60a5fa',
                weight: 1.5,
                opacity: 0.5,
                dashArray: '4, 4',
              }}
            />
          </>
        )}

        {/* 4. LAYER: WIND VECTOR STREAMLINES */}
        {layers.wind && (
          <>
            <Polyline
              positions={[
                [userLocation.lat - 0.3, userLocation.lon - 0.7],
                [userLocation.lat - 0.15, userLocation.lon - 0.45],
              ]}
              pathOptions={{
                color: '#818cf8',
                weight: 2.5,
                opacity: 0.7,
              }}
            />
            <Polyline
              positions={[
                [userLocation.lat + 0.1, userLocation.lon - 0.6],
                [userLocation.lat + 0.25, userLocation.lon - 0.35],
              ]}
              pathOptions={{
                color: '#818cf8',
                weight: 2.5,
                opacity: 0.7,
              }}
            />
          </>
        )}

        {/* 5. LAYER: IMBL & MPA GEOFENCES */}
        {layers.geofence &&
          GEOFENCE_ZONES.map((zone) => {
            const isCritical = zone.risk === 'CRITICAL_DANGER';
            if (zone.category === 'IMBL') {
              return (
                <Polyline
                  key={zone.id}
                  positions={zone.coordinates}
                  pathOptions={{
                    color: '#EF4444',
                    weight: 3.5,
                    dashArray: '8, 6',
                    opacity: 0.9,
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[220px] text-xs font-sans">
                      <div className="font-bold text-rose-600 flex items-center gap-1 pb-1 mb-1 border-b border-rose-200">
                        <span>🚨</span>
                        <span>{zone.name}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{zone.description}</p>
                      <div className="mt-2 text-[10px] text-rose-700 font-bold uppercase bg-rose-50 p-1.5 rounded border border-rose-200">
                        ⚠️ High Risk: Detention / Firing Alert
                      </div>
                    </div>
                  </Popup>
                </Polyline>
              );
            }
            return (
              <Polygon
                key={zone.id}
                positions={zone.coordinates}
                pathOptions={{
                  color: isCritical ? '#EF4444' : '#F59E0B',
                  fillColor: isCritical ? '#EF4444' : '#F59E0B',
                  fillOpacity: 0.18,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[220px] text-xs font-sans">
                    <div className="font-bold text-amber-700 flex items-center gap-1 pb-1 mb-1 border-b border-amber-200">
                      <span>🛡️</span>
                      <span>{zone.name}</span>
                    </div>
                    <p className="text-slate-700 mt-1">{zone.description}</p>
                    <div className="mt-2 text-[10px] text-amber-800 font-semibold bg-amber-50 p-1.5 rounded border border-amber-200">
                      Restricted Marine Reserve: No bottom trawling
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 6. LAYER: WEATHER-SAFE NAVIGATION ROUTE */}
        {layers.route && safeRouteCoords.length > 0 && nearestPFZ && (
          <>
            <Polyline
              positions={safeRouteCoords}
              pathOptions={{
                color: '#0284C7',
                weight: 3.5,
                dashArray: '6, 6',
                opacity: 0.9,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px] text-xs font-sans">
                  <div className="font-bold text-sky-700 flex items-center gap-1 pb-1 mb-1 border-b border-sky-200">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Weather-Safe Navigation Route</span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-slate-700 mt-1">
                    <div>Destination: {nearestPFZ.name}</div>
                    <div>Distance: {nearestPFZ.distance_km || 28.5} km</div>
                    <div>Recommended Speed: 8.5 knots</div>
                    <div>Estimated Time: ~1 hr 45 min</div>
                  </div>
                </div>
              </Popup>
            </Polyline>

            {/* Waypoint marker on route midpoint */}
            <Marker
              position={safeRouteCoords[1]}
              icon={L.divIcon({
                className: 'custom-wp-marker',
                html: '<div class="w-3 h-3 rounded-full bg-sky-500 border-2 border-white shadow-md"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6],
              })}
            />
          </>
        )}

        {/* 7. LAYER: PFZ EVIDENCE MARKERS */}
        {layers.pfz &&
          activePFZs.map((zone, idx) => (
            <PFZMarker
              key={(zone as any).id || `${zone.latitude}-${zone.longitude}-${idx}`}
              zone={zone}
            />
          ))}

        {/* 8. COASTAL CITY LABELS (Smart Zoom Visibility) */}
        {visibleCities.map((city) => (
          <Marker
            key={city.id}
            position={[city.lat, city.lon]}
            icon={createCityLabelIcon(city)}
            eventHandlers={{
              click: () => {
                if (onRelocateVessel) {
                  onRelocateVessel({ lat: city.lat, lon: city.lon });
                }
              },
            }}
          >
            <Popup>
              <div className="p-2 text-xs font-sans">
                <div className="font-bold text-slate-900 flex items-center gap-1">
                  <span>⚓</span>
                  <span>{city.name}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {city.state} • {city.type}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {city.lat.toFixed(4)}°N, {city.lon.toFixed(4)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 9. USER VESSEL POSITION MARKER */}
        <Marker
          position={[userLocation.lat, userLocation.lon]}
          icon={userIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              if (onRelocateVessel) {
                onRelocateVessel({ lat: position.lat, lon: position.lng });
              }
            },
          }}
        >
          <Popup className="orca-user-popup">
            <div className="p-2.5 min-w-[220px] text-xs font-sans text-slate-800">
              <div className="font-bold text-[#0F766E] text-sm flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-2">
                <span>📍</span>
                <span>Active Vessel GPS Station</span>
              </div>
              <div className="text-[11px] text-slate-700 font-mono space-y-1">
                <div className="flex justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-slate-500">Latitude:</span>
                  <span className="font-bold">{userLocation.lat.toFixed(4)}°N</span>
                </div>
                <div className="flex justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span className="text-slate-500">Longitude:</span>
                  <span className="font-bold">{userLocation.lon.toFixed(4)}°E</span>
                </div>
                <div className="text-emerald-700 font-semibold pt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                  <span>Live AIS Telemetry Synchronized</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating Map Controls & Basemap Switcher */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-1 shadow-md flex items-center gap-1 text-xs font-sans">
          <button
            onClick={() => setBaseMapType('satellite')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              baseMapType === 'satellite'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>
          <button
            onClick={() => setBaseMapType('standard')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              baseMapType === 'standard'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Standard</span>
          </button>
        </div>
      </div>

      {/* Floating Tactical Layer Status Card */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-3 py-2 shadow-md text-xs font-sans hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
          <span className="font-extrabold text-slate-800 tracking-tight">TACTICAL GIS</span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
          {activePFZs.length} PFZ Zones
        </span>
      </div>
    </div>
  );
}
