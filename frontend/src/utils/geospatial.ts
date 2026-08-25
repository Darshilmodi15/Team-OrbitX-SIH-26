/**
 * ORCA Marine AI — Geospatial & Coastline Intelligence Utility
 * Provides client-side real geodesic distance calculation to India's coastline,
 * nearest port matching, coastal region identification, and far-from-coast detection.
 */

export interface CoastalPoint {
  lat: number;
  lon: number;
  name: string;
  region: string;
}

export const EARTH_RADIUS_KM = 6371.0;

/**
 * Authoritative Indian Coastline Reference Points (West Coast, South Coast, East Coast, Islands)
 */
export const INDIA_COASTLINE_POINTS: CoastalPoint[] = [
  // GUJARAT (West Coast)
  { lat: 23.6800, lon: 68.2000, name: 'Kori Creek / Sir Creek', region: 'Gujarat (Kutch)' },
  { lat: 23.2500, lon: 68.5500, name: 'Jakhau Port', region: 'Gujarat (Kutch)' },
  { lat: 22.8395, lon: 69.7257, name: 'Mundra Port', region: 'Gujarat (Kutch)' },
  { lat: 23.0333, lon: 70.2167, name: 'Kandla / Deendayal Port', region: 'Gujarat (Kutch)' },
  { lat: 22.4667, lon: 69.0667, name: 'Okha Point', region: 'Gujarat (Saurashtra)' },
  { lat: 22.2400, lon: 68.9600, name: 'Dwarka Coast', region: 'Gujarat (Saurashtra)' },
  { lat: 21.6417, lon: 69.6093, name: 'Porbandar Port', region: 'Gujarat (Saurashtra)' },
  { lat: 21.1500, lon: 70.0800, name: 'Mangrol Harbor', region: 'Gujarat (Saurashtra)' },
  { lat: 20.9077, lon: 70.3678, name: 'Veraval Fishing Harbor', region: 'Gujarat (Saurashtra)' },
  { lat: 20.7100, lon: 70.9800, name: 'Diu Coast', region: 'Daman & Diu' },
  { lat: 20.9000, lon: 71.5000, name: 'Jafrabad Coast', region: 'Gujarat (Saurashtra)' },
  { lat: 21.1702, lon: 72.8311, name: 'Hazira / Surat Coast', region: 'Gujarat (South)' },
  { lat: 20.4000, lon: 72.8300, name: 'Daman Coastal Station', region: 'Daman & Diu' },
  { lat: 20.1500, lon: 72.7500, name: 'Umbergaon Coast', region: 'Gujarat (South)' },

  // MAHARASHTRA (West Coast)
  { lat: 19.9700, lon: 72.7300, name: 'Dahanu Port', region: 'Maharashtra (Palghar)' },
  { lat: 19.7000, lon: 72.7500, name: 'Palghar Satpati Harbor', region: 'Maharashtra (Palghar)' },
  { lat: 19.3300, lon: 72.7800, name: 'Vasai Coast', region: 'Maharashtra (Thane)' },
  { lat: 18.9220, lon: 72.8347, name: 'Mumbai Sassoon Dock', region: 'Maharashtra (Mumbai)' },
  { lat: 18.7500, lon: 72.9000, name: 'Alibaug / JNPT Coast', region: 'Maharashtra (Raigad)' },
  { lat: 18.2500, lon: 72.9500, name: 'Murud Janjira Coast', region: 'Maharashtra (Raigad)' },
  { lat: 17.9500, lon: 73.0500, name: 'Shrivardhan Coast', region: 'Maharashtra (Raigad)' },
  { lat: 17.5000, lon: 73.1800, name: 'Dabhol / Guhagar Coast', region: 'Maharashtra (Ratnagiri)' },
  { lat: 16.9902, lon: 73.3120, name: 'Ratnagiri Mirkarwada Harbor', region: 'Maharashtra (Ratnagiri)' },
  { lat: 16.5000, lon: 73.3300, name: 'Devgad Harbor', region: 'Maharashtra (Sindhudurg)' },
  { lat: 16.0353, lon: 73.4735, name: 'Malvan Coral Coast', region: 'Maharashtra (Sindhudurg)' },
  { lat: 15.7500, lon: 73.6800, name: 'Vengurla Coast', region: 'Maharashtra (Sindhudurg)' },

  // GOA
  { lat: 15.4909, lon: 73.8278, name: 'Panaji / Mandovi Estuary', region: 'Goa' },
  { lat: 15.4167, lon: 73.8000, name: 'Mormugao Port', region: 'Goa' },
  { lat: 15.0000, lon: 73.9500, name: 'Cabo de Rama / Canacona Coast', region: 'Goa' },

  // KARNATAKA (West Coast)
  { lat: 14.8185, lon: 74.1300, name: 'Karwar Baithkol Harbor', region: 'Karnataka (Uttara Kannada)' },
  { lat: 14.5300, lon: 74.3100, name: 'Kumta Coast', region: 'Karnataka (Uttara Kannada)' },
  { lat: 14.2800, lon: 74.4300, name: 'Honnavar Harbor', region: 'Karnataka (Uttara Kannada)' },
  { lat: 13.9800, lon: 74.5800, name: 'Bhatkal Harbor', region: 'Karnataka (Uttara Kannada)' },
  { lat: 13.6300, lon: 74.6800, name: 'Kundapura Coast', region: 'Karnataka (Udupi)' },
  { lat: 13.3409, lon: 74.7421, name: 'Malpe Harbor / Udupi', region: 'Karnataka (Udupi)' },
  { lat: 12.8596, lon: 74.8364, name: 'New Mangalore Port', region: 'Karnataka (Dakshina Kannada)' },

  // KERALA (Southwest Coast)
  { lat: 12.5000, lon: 74.9800, name: 'Kasaragod Coast', region: 'Kerala' },
  { lat: 11.8745, lon: 75.3704, name: 'Kannur / Mopla Bay', region: 'Kerala' },
  { lat: 11.2588, lon: 75.7804, name: 'Kozhikode / Beypore Harbor', region: 'Kerala' },
  { lat: 10.7800, lon: 75.9200, name: 'Ponnani Harbor', region: 'Kerala' },
  { lat: 10.2000, lon: 76.1800, name: 'Munambam Harbor', region: 'Kerala' },
  { lat: 9.9312, lon: 76.2673, name: 'Cochin / Thoppumpady Harbor', region: 'Kerala' },
  { lat: 9.4900, lon: 76.3200, name: 'Alappuzha Coast', region: 'Kerala' },
  { lat: 8.8932, lon: 76.6141, name: 'Kollam / Sakthikulangara Harbor', region: 'Kerala' },
  { lat: 8.5241, lon: 76.9366, name: 'Thiruvananthapuram / Vizhinjam Port', region: 'Kerala' },

  // TAMIL NADU (South & Southeast Coast)
  { lat: 8.0883, lon: 77.5385, name: 'Kanyakumari / Cape Comorin', region: 'Tamil Nadu' },
  { lat: 8.4800, lon: 78.1300, name: 'Tiruchendur Coast', region: 'Tamil Nadu' },
  { lat: 8.7642, lon: 78.1348, name: 'V.O. Chidambaranar / Tuticorin', region: 'Tamil Nadu' },
  { lat: 9.2800, lon: 79.1300, name: 'Mandapam / Gulf of Mannar', region: 'Tamil Nadu' },
  { lat: 9.2876, lon: 79.3129, name: 'Rameswaram / Pamban Island', region: 'Tamil Nadu' },
  { lat: 10.3500, lon: 79.8500, name: 'Muthupet / Point Calimere', region: 'Tamil Nadu' },
  { lat: 10.7600, lon: 79.8400, name: 'Nagapattinam Fishing Port', region: 'Tamil Nadu' },
  { lat: 11.1500, lon: 79.8500, name: 'Karaikal Port', region: 'Puducherry' },
  { lat: 11.7500, lon: 79.7700, name: 'Cuddalore Harbor', region: 'Tamil Nadu' },
  { lat: 11.9416, lon: 79.8083, name: 'Puducherry Harbor', region: 'Puducherry' },
  { lat: 12.5000, lon: 80.1500, name: 'Mahabalipuram Coast', region: 'Tamil Nadu' },
  { lat: 13.0827, lon: 80.2707, name: 'Chennai / Royapuram Fishing Harbor', region: 'Tamil Nadu' },
  { lat: 13.3000, lon: 80.3500, name: 'Ennore / Kamarajar Port', region: 'Tamil Nadu' },

  // ANDHRA PRADESH (East Coast)
  { lat: 13.7000, lon: 80.2000, name: 'Pulicat Lake / Sriharikota Coast', region: 'Andhra Pradesh' },
  { lat: 14.2500, lon: 80.1200, name: 'Krishnapatnam Port', region: 'Andhra Pradesh' },
  { lat: 15.5000, lon: 80.0500, name: 'Ongole / Vadarevu Coast', region: 'Andhra Pradesh' },
  { lat: 15.8000, lon: 80.8500, name: 'Nizampatnam Harbor', region: 'Andhra Pradesh' },
  { lat: 16.1800, lon: 81.1300, name: 'Machilipatnam Harbor', region: 'Andhra Pradesh' },
  { lat: 16.9891, lon: 82.2475, name: 'Kakinada Deep Water Port', region: 'Andhra Pradesh' },
  { lat: 17.6868, lon: 83.2185, name: 'Visakhapatnam Harbor', region: 'Andhra Pradesh' },
  { lat: 18.2500, lon: 83.9000, name: 'Bhavanapadu / Kalingapatnam', region: 'Andhra Pradesh' },

  // ODISHA (East Coast)
  { lat: 19.3000, lon: 84.9000, name: 'Gopalpur Port', region: 'Odisha' },
  { lat: 19.8135, lon: 85.8312, name: 'Puri Coast / Chilika Lake', region: 'Odisha' },
  { lat: 20.2644, lon: 86.6714, name: 'Paradip Port', region: 'Odisha' },
  { lat: 20.8000, lon: 86.9500, name: 'Dhamra Port / Wheeler Island', region: 'Odisha' },
  { lat: 21.4900, lon: 87.0500, name: 'Chandipur Coast / Balasore', region: 'Odisha' },

  // WEST BENGAL (East Coast)
  { lat: 21.6200, lon: 87.5000, name: 'Digha / Shankarpur Harbor', region: 'West Bengal' },
  { lat: 21.8000, lon: 88.0000, name: 'Sagar Island / Gangasagar', region: 'West Bengal' },
  { lat: 22.0300, lon: 88.0800, name: 'Haldia Port', region: 'West Bengal' },
  { lat: 21.6000, lon: 88.2500, name: 'Kakdwip / Namkhana Harbor', region: 'West Bengal' },
  { lat: 21.7500, lon: 88.8500, name: 'Sundarbans Marine Sector', region: 'West Bengal' },

  // ISLANDS
  { lat: 11.6234, lon: 92.7265, name: 'Port Blair Harbor', region: 'Andaman & Nicobar Islands' },
  { lat: 10.5667, lon: 72.6417, name: 'Kavaratti Island', region: 'Lakshadweep' },
];

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return EARTH_RADIUS_KM * c;
}

export interface CoastDistanceResult {
  distanceKm: number;
  nearestPoint: CoastalPoint;
  isCoastalSupported: boolean;
  isFarFromCoast: boolean;
  coastalRegion: string;
}

/**
 * Computes exact geodesic distance from any coordinate to India's coastline.
 * @param lat Latitude
 * @param lon Longitude
 * @param thresholdKm Threshold in km beyond which a "far from coast" warning triggers (default: 100 km)
 */
export function computeCoastDistance(
  lat: number,
  lon: number,
  thresholdKm = 100.0
): CoastDistanceResult {
  let minDistance = Infinity;
  let nearest = INDIA_COASTLINE_POINTS[0];

  for (const pt of INDIA_COASTLINE_POINTS) {
    const dist = calculateHaversineDistance(lat, lon, pt.lat, pt.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = pt;
    }
  }

  const roundedDist = Math.round(minDistance * 10) / 10;
  const isSupported = roundedDist <= thresholdKm;
  const isFar = roundedDist > thresholdKm;

  return {
    distanceKm: roundedDist,
    nearestPoint: nearest,
    isCoastalSupported: isSupported,
    isFarFromCoast: isFar,
    coastalRegion: nearest.region,
  };
}
