import { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  GeoJSON,
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
  type CoastalCity,
} from '../data/maritimeData';
<<<<<<< HEAD
import { Navigation, Satellite, Globe } from 'lucide-react';
import { fetchMarineBoundariesEEZ, checkMarineBoundary } from '../services/api';
=======
import { Satellite, Globe } from 'lucide-react';
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76

/**
 * Custom vessel GPS station icon.
 */
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-vessel-marker',
    html: `
<<<<<<< HEAD
      <div class="relative flex items-center justify-center w-9 h-9">
        <div class="absolute w-9 h-9 rounded-full bg-teal-500/25 animate-ping"></div>
        <div class="absolute w-7 h-7 rounded-full bg-teal-600/30 border-2 border-teal-400"></div>
        <div class="relative w-4 h-4 rounded-full bg-[#0F766E] border-2 border-white shadow-md flex items-center justify-center text-[10px]">
          ⚓
=======
      <div class="relative flex items-center justify-center w-11 h-11 cursor-pointer">
        <div class="absolute w-11 h-11 rounded-full bg-teal-400/30 pulse-beacon"></div>
        <div class="absolute w-8 h-8 rounded-full bg-[#0F766E]/40 border-2 border-teal-300 shadow-[0_0_16px_rgba(15,118,110,0.8)]"></div>
        <div class="relative w-5 h-5 rounded-full bg-gradient-to-tr from-[#0F766E] to-[#0284C7] shadow-md flex items-center justify-center text-white text-[10px] font-bold border border-white">
          🚢
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

/**
<<<<<<< HEAD
 * Custom city label marker icon with priority badge styling.
 */
const createCityLabelIcon = (city: CoastalCity) => {
  const isPriority = city.priority;
  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div class="flex items-center gap-1 bg-white/90 backdrop-blur-sm border ${
        isPriority ? 'border-teal-600 shadow-sm' : 'border-slate-300 shadow-2xs'
      } px-1.5 py-0.5 rounded-md text-[10px] font-sans font-bold text-slate-800 whitespace-nowrap cursor-pointer hover:border-teal-700 hover:scale-105 transition-all">
        <span class="w-1.5 h-1.5 rounded-full ${isPriority ? 'bg-teal-600' : 'bg-slate-400'}"></span>
=======
 * Creates subtle label icon for coastal port cities.
 */
const createCityLabelIcon = (city: CoastalCity) => {
  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div class="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-slate-700/60 shadow-sm text-slate-200 text-[10px] font-medium whitespace-nowrap">
        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
        <span>${city.name}</span>
      </div>
    `,
    iconSize: [80, 20],
    iconAnchor: [40, 10],
<<<<<<< HEAD
    popupAnchor: [0, -10],
=======
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
  });
};

/**
<<<<<<< HEAD
 * Invalidate map size on window resize so tiles always render properly.
=======
 * Helper component that forces Leaflet to invalidate container size
 * and re-render tiles smoothly on mount and window resize.
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
 */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
<<<<<<< HEAD
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
=======
    if (!map) return;

    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
  }, [map]);
  return null;
}

/**
<<<<<<< HEAD
 * Handles map click to relocate vessel and tracks zoom level.
=======
 * Map click handler to relocate vessel GPS station.
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
 */
function MapClickHandler({ onRelocateVessel }: { onRelocateVessel?: (coords: LocationCoords) => void }) {
  useMapEvents({
    click(e) {
      if (onRelocateVessel) {
        onRelocateVessel({
          lat: Number(e.latlng.lat.toFixed(4)),
          lon: Number(e.latlng.lng.toFixed(4)),
        });
      }
    },
  });
  return null;
}

<<<<<<< HEAD
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
=======
interface MapBoundsUpdaterProps {
  center: LocationCoords;
  pfzZones: PFZEvidenceItem[];
}

function MapBoundsUpdater({ center, pfzZones }: MapBoundsUpdaterProps) {
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
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
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10, animate: true });
    } else {
      map.setView([center.lat, center.lon], 9, { animate: true });
    }
  }, [map, center, pfzZones]);

  return null;
}

export interface MarineMapProps {
  userLocation: LocationCoords;
<<<<<<< HEAD
  pfzZones?: PFZEvidenceItem[];
=======
  pfzZones: PFZEvidenceItem[];
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
  layers?: GisLayerState;
  onRelocateVessel?: (coords: LocationCoords) => void;
  geofenceEvidence?: any;
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
  const [baseMapType, setBaseMapType] = useState<'satellite' | 'standard'>('satellite');
<<<<<<< HEAD
  const [currentZoom, setCurrentZoom] = useState<number>(8);
  const userIcon = createUserIcon();
  const [eezGeoJson, setEezGeoJson] = useState<any>(null);
  const [boundaryCheck, setBoundaryCheck] = useState<any>(null);

  // Load official Marine Regions EEZ GeoJSON on mount
  useEffect(() => {
    let isMounted = true;
    fetchMarineBoundariesEEZ(8480).then((data: any) => {
      if (isMounted && data) {
        setEezGeoJson(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Update real-time spatial geofence calculation when vessel location changes
  useEffect(() => {
    let isMounted = true;
    checkMarineBoundary(userLocation.lat, userLocation.lon, 8480).then((data: any) => {
      if (isMounted && data) {
        setBoundaryCheck(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userLocation.lat, userLocation.lon]);

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
    const midLat = (userLocation.lat + nearestPFZ.latitude) / 2 + 0.04;
    const midLon = (userLocation.lon + nearestPFZ.longitude) / 2 - 0.05;
=======
  const userIcon = useMemo(() => createUserIcon(), []);

  // Compute waypoint corridor for weather-safe navigation route
  const targetPfz = pfzZones[0] || { latitude: 19.1200, longitude: 72.6200, name: 'Chlorophyll Plume Sector Charlie' };
  const safeRouteWaypoints = useMemo(() => {
    const midLat = (userLocation.lat + targetPfz.latitude) / 2 + 0.05;
    const midLon = (userLocation.lon + targetPfz.longitude) / 2 - 0.04;
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
    return [
      [userLocation.lat, userLocation.lon] as [number, number],
      [midLat, midLon] as [number, number],
      [targetPfz.latitude, targetPfz.longitude] as [number, number],
    ];
<<<<<<< HEAD
  }, [userLocation, nearestPFZ]);

  // Filter coastal city labels by zoom level
  const visibleCities = useMemo(() => {
    return COASTAL_CITIES.filter((city) => {
      if (currentZoom < 7) {
        return city.priority;
      } else if (currentZoom < 10) {
        return city.priority || city.minZoom <= 7;
      }
      return true;
    });
  }, [currentZoom]);
=======
  }, [userLocation, targetPfz]);
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#b0c8df]">
      {/* 1. Base Map Switcher: Satellite vs Standard Map */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setBaseMapType('satellite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            baseMapType === 'satellite'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setBaseMapType('standard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            baseMapType === 'standard'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Standard Map</span>
        </button>
      </div>

      {/* 2. Interactive Leaflet Map Container */}
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={9}
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full z-0"
      >
<<<<<<< HEAD
        {/* BASE LAYER 1: SATELLITE (DEFAULT) */}
=======
        {/* Base Map Tile Layers */}
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
        {baseMapType === 'satellite' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics, ISRO Oceansat'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
        )}

        <MapResizer />
        <MapClickHandler onRelocateVessel={onRelocateVessel} />
        <MapBoundsUpdater center={userLocation} pfzZones={pfzZones} />

<<<<<<< HEAD
        {/* 1. LAYER: SST HEATMAP (Thermal Shelf Bands) */}
        {layers?.sst && (
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
        {layers?.chlorophyll && (
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
        {layers?.waves && (
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
        {layers?.wind && (
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
        {layers?.geofence &&
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

        {/* Real Marine Regions Exclusive Economic Zone (EEZ) Layer */}
        {eezGeoJson && (
          <GeoJSON
            key={`eez-layer-${eezGeoJson.features?.length || 0}`}
            data={eezGeoJson}
            style={{
              color: '#0284c7',
              weight: 2,
              dashArray: '6, 6',
              fillColor: '#0284c7',
              fillOpacity: 0.06,
            }}
          />
        )}

        {/* 6. LAYER: WEATHER-SAFE NAVIGATION ROUTE */}
        {layers?.route && safeRouteCoords.length > 0 && nearestPFZ && (
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
        {layers?.pfz &&
          activePFZs.map((zone, idx) => (
            <PFZMarker
              key={(zone as any).id || `${zone.latitude}-${zone.longitude}-${idx}`}
              zone={zone}
            />
          ))}

        {/* 8. COASTAL CITY LABELS (Smart Zoom Visibility) */}
        {visibleCities.map((city) => (
=======
        {/* Coastal City Labels */}
        {COASTAL_CITIES.map((city) => (
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
          <Marker
            key={city.id}
            position={[city.lat, city.lon]}
            icon={createCityLabelIcon(city)}
            interactive={false}
          />
        ))}

        {/* User Vessel Marker */}
        <Marker
          position={[userLocation.lat, userLocation.lon]}
          icon={userIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              if (onRelocateVessel) {
                onRelocateVessel({
                  lat: Number(position.lat.toFixed(4)),
                  lon: Number(position.lng.toFixed(4)),
                });
              }
            },
          }}
        >
          <Popup className="orca-custom-popup">
            <div className="p-2 min-w-[200px] text-xs font-sans">
              <div className="font-bold text-teal-800 text-sm flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-2">
                <span>🚢</span>
                <span>Active Vessel GPS Position</span>
              </div>
              <div className="space-y-1 text-slate-700 font-mono text-[11px]">
                <div className="flex justify-between bg-slate-50 px-2 py-1 rounded">
                  <span className="text-slate-500 font-sans">Latitude:</span>
                  <span className="font-bold">{userLocation.lat.toFixed(4)}°N</span>
                </div>
                <div className="flex justify-between bg-slate-50 px-2 py-1 rounded">
                  <span className="text-slate-500 font-sans">Longitude:</span>
                  <span className="font-bold">{userLocation.lon.toFixed(4)}°E</span>
                </div>
<<<<<<< HEAD
                {boundaryCheck && (
                  <div className="flex justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100 text-teal-700">
                    <span className="text-slate-500">EEZ Boundary:</span>
                    <span>{boundaryCheck.distance_to_boundary_km} km ({boundaryCheck.geofence_status.toUpperCase()})</span>
                  </div>
                )}
                <div className="text-emerald-700 font-semibold pt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                  <span>Live AIS Telemetry Synchronized</span>
=======
                <div className="text-teal-700 font-sans font-semibold text-[10px] pt-1">
                  💡 Drag icon or click sea to relocate vessel
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
<<<<<<< HEAD
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
=======

        {/* 3. GIS LAYER: Weather-Safe Navigational Route Polyline */}
        {layers.route && (
          <Polyline
            positions={safeRouteWaypoints}
            pathOptions={{
              color: '#06b6d4',
              weight: 3.5,
              dashArray: '8, 8',
              opacity: 0.9,
            }}
          />
        )}

        {/* 4. GIS LAYER: Potential Fishing Zones (PFZ) & Concentric Yield Rings */}
        {layers.pfz && (
          <>
            {pfzZones.map((zone, idx) => (
              <PFZMarker key={zone.id || `${zone.latitude}-${zone.longitude}-${idx}`} zone={zone} />
            ))}

            {/* Simulated Yield Potential Circles around Mumbai/Maharashtra coast */}
            <Circle
              center={[19.1200, 72.6200]}
              radius={24000}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.18,
                weight: 1.5,
              }}
            />
            <Circle
              center={[18.7200, 72.5800]}
              radius={28000}
              pathOptions={{
                color: '#14b8a6',
                fillColor: '#14b8a6',
                fillOpacity: 0.14,
                weight: 1.5,
                dashArray: '6, 6',
              }}
            />
            <Circle
              center={[18.9850, 72.4500]}
              radius={20000}
              pathOptions={{
                color: '#06b6d4',
                fillColor: '#06b6d4',
                fillOpacity: 0.16,
                weight: 1.5,
              }}
            />
          </>
        )}

        {/* 5. GIS LAYER: IMBL & MPA Geofence Boundaries */}
        {layers.geofence && (
          <>
            {GEOFENCE_ZONES.map((zone) => (
              <Polyline
                key={zone.id}
                positions={zone.coordinates}
                pathOptions={{
                  color: zone.color || '#ef4444',
                  weight: 3,
                  dashArray: '6, 6',
                  opacity: 0.85,
                }}
              >
                <Popup>
                  <div className="p-1.5 text-xs">
                    <div className="font-bold text-rose-700">{zone.name}</div>
                    <div className="text-slate-600 text-[11px] mt-1">{zone.description}</div>
                  </div>
                </Popup>
              </Polyline>
            ))}

            {/* High Hazard Offshore Sector Buffer */}
            <Circle
              center={[19.3500, 72.2500]}
              radius={32000}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '8, 8',
              }}
            />
            <Circle
              center={[19.1800, 72.4200]}
              radius={22000}
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 4',
              }}
            />
          </>
        )}

        {/* 6. GIS LAYER: SST Heatmap Thermal Circles */}
        {layers.sst && (
          <Circle
            center={[18.8500, 72.5000]}
            radius={35000}
            pathOptions={{
              color: '#f59e0b',
              fillColor: '#f59e0b',
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
        )}

        {/* 7. GIS LAYER: Chlorophyll-a Bloom Plumes */}
        {layers.chlorophyll && (
          <Circle
            center={[19.0500, 72.5500]}
            radius={28000}
            pathOptions={{
              color: '#22c55e',
              fillColor: '#22c55e',
              fillOpacity: 0.15,
              weight: 1,
            }}
          />
        )}
      </MapContainer>

      {/* 8. Bottom Helper Prompt */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-md text-[11px] font-sans font-medium text-slate-700 pointer-events-none whitespace-nowrap hidden sm:flex items-center gap-1.5">
        <span className="text-teal-600">💡</span>
        <span>Click anywhere on the sea to relocate vessel GPS | Drag 🚢 icon to simulate position</span>
      </div>

      {/* 9. Bottom Left Tactical Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-md text-[10px] font-sans">
        <div className="font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[9px]">
          Tactical Map Legend
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block"></span>
            <span>Your Vessel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>PFZ Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-500 inline-block"></span>
            <span>Safe Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500 border-b border-dashed inline-block"></span>
            <span>IMBL Boundary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>MPA Reserve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
            <span>Hazard Zone</span>
          </div>
        </div>
>>>>>>> 5fd7c4a999b00da775a59a7cf0487a86ecfd9c76
      </div>
    </div>
  );
}
