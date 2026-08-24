/**
 * ORCA Marine AI - Backend API Service Layer
 * Interfaces directly with FastAPI endpoints (/query, /api/marine-boundaries, /api/chat).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Sends an operational marine query to ORCA backend.
 * 
 * @param {Object} payload
 * @param {Object} payload.location - Vessel GPS coordinates { lat: number, lon: number }
 * @param {string} payload.date - Date in 'YYYY-MM-DD' format
 * @param {string} payload.question - User question or operational prompt
 * @param {string} [payload.language] - Language code ('en', 'gu', 'hi', etc.)
 * @returns {Promise<Object>} Backend QueryResponse
 */
export async function queryORCA(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to generic message
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to reach ORCA backend. Please ensure the backend server is running at ' + API_BASE_URL);
    }
    throw error;
  }
}

/**
 * Fetches real Exclusive Economic Zone (EEZ) GeoJSON from Marine Regions WFS via backend service.
 * 
 * @param {number} [mrgid=8480] - Marine Regions Geographic Identifier (8480: India)
 * @returns {Promise<Object|null>} GeoJSON FeatureCollection
 */
export async function fetchMarineBoundariesEEZ(mrgid = 8480) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marine-boundaries/eez?mrgid=${mrgid}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Could not fetch Marine Boundaries EEZ:', err);
  }
  return null;
}

/**
 * Evaluates vessel GPS location against Marine Regions EEZ boundaries.
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} [mrgid=8480] - Target MRGID
 * @returns {Promise<Object|null>} Geofence status and boundary distance
 */
export async function checkMarineBoundary(lat, lon, mrgid = 8480) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marine-boundaries/check?lat=${lat}&lon=${lon}&mrgid=${mrgid}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Could not check marine boundary:', err);
  }
  return null;
}

export default {
  queryORCA,
  fetchMarineBoundariesEEZ,
  checkMarineBoundary,
};
