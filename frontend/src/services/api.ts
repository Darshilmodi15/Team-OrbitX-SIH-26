/**
 * ORCA Marine AI - Backend API Service Layer
 * Interfaces directly with FastAPI endpoints (/query, /api/marine-boundaries, /api/chat, /api/geofences).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface QueryPayload {
  location: { lat: number; lon: number };
  date: string;
  question: string;
  language?: string;
  session_id?: string;
}

export async function queryORCA(payload: QueryPayload) {
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
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      throw new Error('Unable to reach ORCA backend. Please ensure the backend server is running at ' + API_BASE_URL);
    }
    throw error;
  }
}

export async function fetchMarineBoundariesEEZ(mrgid: number = 8480): Promise<any | null> {
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

export async function checkMarineBoundary(lat: number, lon: number, mrgid: number = 8480): Promise<any | null> {
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

export async function fetchGeofences(lat?: number, lon?: number): Promise<any | null> {
  try {
    const query = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : '';
    const response = await fetch(`${API_BASE_URL}/api/geofences${query}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Could not fetch geofences:', err);
  }
  return null;
}

export default {
  queryORCA,
  fetchMarineBoundariesEEZ,
  checkMarineBoundary,
  fetchGeofences,
};
