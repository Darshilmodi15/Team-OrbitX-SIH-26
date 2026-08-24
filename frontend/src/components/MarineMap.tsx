import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PFZMarker from './PFZMarker';
import type { LocationCoords, PFZEvidenceItem } from '../App';
import { fetchMarineBoundariesEEZ, checkMarineBoundary } from '../services/boundariesApi';

export interface GeofenceZoneData {
  id: string;
  name: string;
  type: string;
  geometry_type: string;
  threshold_nm: number;
  severity: string;
  description: string;
  coordinates: number[][];
}

const DEFAULT_GEOFENCES: GeofenceZoneData[] = [
  {
    id: 'imbl_india_pakistan',
    name: 'India-Pakistan Maritime Boundary (IMBL)',
    type: 'IMBL',
    geometry_type: 'LineString',
    threshold_nm: 15.0,
    severity: 'WARNING',
    description: 'International boundary between India and Pakistan in Sir Creek / Arabian Sea.',
    coordinates: [
      [68.1667, 23.5000],
      [68.0000, 23.2500],
      [67.8000, 23.0000],
      [67.5000, 22.5000],
      [67.0000, 21.5000],
      [66.5000, 20.5000],
    ],
  },
  {
    id: 'imbl_india_srilanka',
    name: 'India-Sri Lanka Maritime Boundary (IMBL)',
    type: 'IMBL',
    geometry_type: 'LineString',
    threshold_nm: 10.0,
    severity: 'WARNING',
    description: 'Maritime boundary in Palk Strait and Gulf of Mannar. Naval monitoring active.',
    coordinates: [
      [79.0750, 9.1000],
      [79.2500, 9.3500],
      [79.5333, 9.6833],
      [79.8500, 10.0833],
      [80.0500, 10.4500],
      [80.3333, 10.8333],
    ],
  },
  {
    id: 'mpa_gulf_of_mannar',
    name: 'Gulf of Mannar Marine National Park',
    type: 'MPA',
    geometry_type: 'Polygon',
    threshold_nm: 5.0,
    severity: 'CRITICAL',
    description: 'Protected Marine Sanctuary and Biosphere Reserve. Commercial trawling strictly prohibited.',
    coordinates: [
      [78.5000, 8.8000],
      [79.3000, 8.8000],
      [79.3000, 9.3000],
      [78.5000, 9.3000],
      [78.5000, 8.8000],
    ],
  },
  {
    id: 'mpa_malvan_sanctuary',
    name: 'Malvan Marine Sanctuary (Sindhudurg)',
    type: 'MPA',
    geometry_type: 'Polygon',
    threshold_nm: 4.0,
    severity: 'CRITICAL',
    description: 'Coastal Marine Protected Area protecting coral reefs in southern Maharashtra.',
    coordinates: [
      [73.4000, 15.9800],
      [73.5200, 15.9800],
      [73.5200, 16.0800],
      [73.4000, 16.0800],
      [73.4000, 15.9800],
    ],
  },
];

/**
 * Creates custom glowing tactical icon for user's vessel location.
 */
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 cursor-pointer">
        <div class="absolute w-10 h-10 rounded-full bg-cyan-400/20 pulse-beacon"></div>
        <div class="absolute w-7 h-7 rounded-full bg-cyan-500/30 border border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.6)]"></div>
        <div class="relative w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-200 shadow-[0_0_10px_#22d3ee] flex items-center justify-center text-[10px]">
          📍
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

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

interface MapBoundsUpdaterProps {
  center: LocationCoords;
  pfzZones: PFZEvidenceItem[];
}

function MapBoundsUpdater({ center, pfzZones }: MapBoundsUpdaterProps) {
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
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 10, animate: true });
    } else {
      map.setView([center.lat, center.lon], 9, { animate: true });
    }
  }, [map, center, pfzZones]);

  return null;
}

export interface MarineMapProps {
  userLocation: LocationCoords;
  pfzZones: PFZEvidenceItem[];
  geofenceEvidence?: any;
}

export default function MarineMap({ userLocation, pfzZones = [], geofenceEvidence }: MarineMapProps) {
  const userIcon = createUserIcon();
  const [geofences, setGeofences] = useState<GeofenceZoneData[]>(DEFAULT_GEOFENCES);
  const [eezGeoJson, setEezGeoJson] = useState<any>(null);
  const [showEEZ, setShowEEZ] = useState<boolean>(true);
  const [boundaryCheck, setBoundaryCheck] = useState<any>(null);

  // Load official Marine Regions EEZ GeoJSON on mount
  useEffect(() => {
    let isMounted = true;
    fetchMarineBoundariesEEZ(8480).then((data) => {
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
    checkMarineBoundary(userLocation.lat, userLocation.lon, 8480).then((data) => {
      if (isMounted && data) {
        setBoundaryCheck(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userLocation.lat, userLocation.lon]);

  useEffect(() => {
    fetch('http://localhost:8000/api/geofences')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.geofences && Array.isArray(data.geofences) && data.geofences.length > 0) {
          setGeofences(data.geofences);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative w-full h-full min-h-0 flex-1 overflow-hidden bg-[#020617]">
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={9}
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | Marine Regions (VLIZ)'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapResizer />
        <MapBoundsUpdater center={userLocation} pfzZones={pfzZones} />

        {/* Real Marine Regions Exclusive Economic Zone (EEZ) Layer */}
        {showEEZ && eezGeoJson && (
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
            onEachFeature={(feature, layer) => {
              const p = feature.properties || {};
              const name = p.geoname || 'Indian Exclusive Economic Zone';
              const territory = p.territory1 || p.sovereign1 || 'India';
              const polType = p.pol_type || '200NM';
              const mrgid = p.mrgid || 8480;
              const area = p.area_km2 ? `${Number(p.area_km2).toLocaleString()} km²` : '1,659,500 km²';

              layer.bindPopup(`
                <div style="font-family: sans-serif; font-size: 11px; padding: 4px; min-width: 220px; color: #0f172a;">
                  <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; font-weight: bold; color: #0369a1; display: flex; align-items: center; gap: 4px;">
                    <span>🛡️</span>
                    <span>${name}</span>
                  </div>
                  <div style="line-height: 1.6; color: #334155;">
                    <div><strong>Country / Territory:</strong> ${territory}</div>
                    <div><strong>Zone Type:</strong> ${polType}</div>
                    <div><strong>MRGID:</strong> ${mrgid}</div>
                    <div><strong>Area:</strong> ${area}</div>
                    <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #e2e8f0; font-size: 10px; color: #64748b;">
                      <div><strong>Source:</strong> Marine Regions / VLIZ</div>
                      <div><strong>Dataset:</strong> World EEZ v12 (WFS)</div>
                    </div>
                  </div>
                </div>
              `);
            }}
          />
        )}

        {/* Vessel Position Marker */}
        <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon}>
          <Popup className="orca-user-popup">
            <div className="p-2 min-w-[220px] text-xs font-sans">
              <div className="font-bold text-[#22d3ee] text-sm flex items-center gap-1.5 border-b border-slate-700/80 pb-1.5 mb-2">
                <span>📍</span>
                <span>Vessel GPS Station</span>
              </div>
              <div className="text-[11px] text-slate-200 font-mono space-y-1">
                <div className="flex justify-between bg-slate-900/60 px-2 py-1 rounded">
                  <span className="text-slate-400">Position:</span>
                  <span>{userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E</span>
                </div>
                {boundaryCheck && (
                  <div className="flex justify-between bg-slate-900/60 px-2 py-1 rounded text-cyan-300">
                    <span className="text-slate-400">EEZ Boundary:</span>
                    <span>{boundaryCheck.distance_to_boundary_km} km ({boundaryCheck.geofence_status.toUpperCase()})</span>
                  </div>
                )}
                <div className="text-emerald-400 font-semibold pt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                  <span>AIS Telemetry & Marine Regions Active</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* INCOIS PFZ Evidence Markers */}
        {pfzZones.map((zone, idx) => (
          <PFZMarker key={zone.id || `${zone.latitude}-${zone.longitude}-${idx}`} zone={zone} />
        ))}

        {/* Geofence Maritime Boundaries (IMBL & MPAs) */}
        {geofences.map((gf) => {
          if (gf.geometry_type === 'Polygon') {
            const positions: [number, number][] = gf.coordinates.map((c) => [c[1], c[0]]);
            return (
              <Polygon
                key={gf.id}
                positions={positions}
                pathOptions={{
                  color: '#fbbf24',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.2,
                  weight: 2,
                  dashArray: '6, 6',
                }}
              >
                <Popup>
                  <div className="p-2 text-xs font-sans">
                    <div className="font-bold text-amber-400 text-sm flex items-center gap-1.5 border-b border-slate-700 pb-1 mb-1.5">
                      <span>🛡️</span>
                      <span>{gf.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mb-1">{gf.description}</p>
                    <div className="text-[10px] font-mono text-amber-300 font-bold">
                      PROTECTED SANCTUARY • NO TRAWLING
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          } else {
            const positions: [number, number][] = gf.coordinates.map((c) => [c[1], c[0]]);
            return (
              <Polyline
                key={gf.id}
                positions={positions}
                pathOptions={{
                  color: '#f43f5e',
                  weight: 3,
                  dashArray: '8, 8',
                }}
              >
                <Popup>
                  <div className="p-2 text-xs font-sans">
                    <div className="font-bold text-rose-400 text-sm flex items-center gap-1.5 border-b border-slate-700 pb-1 mb-1.5">
                      <span>🛑</span>
                      <span>{gf.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mb-1">{gf.description}</p>
                    <div className="text-[10px] font-mono text-rose-300 font-bold">
                      INTERNATIONAL MARITIME BORDER LINE
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          }
        })}
      </MapContainer>

      {/* Floating Tactical Map Overlay / Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-slate-950/85 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3.5 shadow-2xl text-xs font-mono max-w-[290px]">
        <div className="text-slate-200 font-bold text-[11px] mb-2.5 flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]"></span>
            <span className="tracking-wider">TACTICAL GIS RADAR</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/90 text-cyan-300 border border-cyan-500/30">
            {pfzZones.length} PFZ • {geofences.length} Borders
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] inline-block shrink-0"></span>
            <span>Vessel Station ({userLocation.lat.toFixed(2)}°, {userLocation.lon.toFixed(2)}°)</span>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] inline-block shrink-0"></span>
            <span>INCOIS Potential Fishing Zones</span>
          </div>

          {/* Marine Boundaries EEZ Layer Toggle */}
          <div className="flex items-center justify-between gap-2.5 pt-1.5 border-t border-slate-800/80 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#0284c7] inline-block shrink-0"></span>
              <span title="Marine Regions / VLIZ World EEZ v12">EEZ Boundaries</span>
            </div>
            <button
              onClick={() => setShowEEZ(!showEEZ)}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold cursor-pointer transition ${
                showEEZ
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {showEEZ ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-3.5 h-1 bg-[#f43f5e] inline-block shrink-0"></span>
            <span>International Border (IMBL)</span>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-3.5 h-3 bg-amber-500/40 border border-amber-400 inline-block shrink-0 rounded-xs"></span>
            <span>Protected Sanctuaries (MPA)</span>
          </div>

          {/* Dynamic Boundary Proximity Status */}
          {boundaryCheck && (
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px]">
              <div className="flex justify-between items-center text-slate-400">
                <span>Jurisdiction:</span>
                <span className="text-slate-200 font-semibold">{boundaryCheck.country}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>EEZ Outer Limit:</span>
                <span className={`font-semibold ${boundaryCheck.geofence_status === 'safe' ? 'text-emerald-400' : boundaryCheck.geofence_status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                  {boundaryCheck.distance_to_boundary_km} km ({boundaryCheck.geofence_status.toUpperCase()})
                </span>
              </div>
            </div>
          )}
        </div>

        {geofenceEvidence?.active_alerts && geofenceEvidence.active_alerts.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-rose-900/60 text-rose-300 font-bold text-[10px] flex items-center gap-1.5 animate-pulse">
            <span>🚨</span>
            <span>{geofenceEvidence.active_alerts.length} Active Boundary Warning!</span>
          </div>
        )}
      </div>
    </div>
  );
}
