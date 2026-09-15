/**
 * ORCA Marine AI - Backend API Service Layer
 * Interfaces directly with FastAPI endpoints:
 * - /query & /api/chat
 * - /api/auth/* & /api/user/*
 * - /api/location/*
 * - /api/marine/* (conditions, risk, forecast)
 * - /api/marine-boundaries/* (eez, check)
 * - /api/geofences
 * - /api/voice/* (Sarvam AI STT Saaras v3 & TTS Bulbul v3)
 */

const PRODUCTION_API_BASE_URL = 'https://orca-backend-ycue.onrender.com';

function getApiBaseUrl(): string {
  const configuredUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  const isPlaceholder = configuredUrl.includes('your-orca-backend.onrender.com');
  let url = configuredUrl;

  if (!url || isPlaceholder) {
    url = import.meta.env.PROD ? PRODUCTION_API_BASE_URL : 'http://localhost:8000';
  }
  if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = `https://${url}`;
  }
  // Auto-resolve Render service slugs that lack .onrender.com (e.g. https://orca-backend-ycue -> https://orca-backend-ycue.onrender.com)
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.hostname && !parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      parsed.hostname = `${parsed.hostname}.onrender.com`;
      url = parsed.origin;
    }
  } catch {
    // Keep original if unparseable
  }
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();
let authFailureHandler: (() => void) | null = null;
export function setAuthFailureHandler(handler: (() => void) | null) { authFailureHandler = handler; }

function authToken(): string | null {
  try {
    const s = sessionStorage.getItem('orca.auth.session');
    if (s) return s;
    const l = localStorage.getItem('orca.auth.session');
    if (l) {
      sessionStorage.setItem('orca.auth.session', l);
      return l;
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

let verificationFlight: Promise<boolean> | null = null;
async function verifyTokenStillValid(token: string): Promise<boolean> {
  if (!verificationFlight) {
    verificationFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        });
        return res.ok;
      } catch {
        // Network timeout / glitch should never wipe user session
        return true;
      } finally {
        verificationFlight = null;
      }
    })();
  }
  return verificationFlight;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = authToken();
  if (token) headers.set("Authorization", "Bearer " + token);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: init.signal ?? AbortSignal.timeout(60000), headers });
  if (response.status === 401 && token && token === authToken()) {
    // Only invoke auth failure if the token is truly invalid on verified profile check
    verifyTokenStillValid(token).then((stillValid) => {
      if (!stillValid && token === authToken()) {
        authFailureHandler?.();
      }
    });
  }
  return response;
}

export interface QueryPayload {
  location: { lat: number; lon: number };
  date: string;
  question: string;
  language?: string;
  session_id?: string;
}

export interface ChatMessagePayload {
  message: string;
  location?: { lat: number; lon: number };
  date?: string;
  language?: string;
  session_id?: string;
  history?: Array<{ role: string; text: string }>;
  request_id?: string;
}

export async function sendChatMessage(payload: ChatMessagePayload) {
  const endpoint = `${API_BASE_URL}/api/chat`;
  const startTime = performance.now();
  
  try {
    const requestBody = {
      message: payload.message,
      location: payload.location || { lat: 18.9220, lon: 72.8347 },
      date: payload.date || new Date().toISOString().split('T')[0],
      language: payload.language || 'auto',
      session_id: payload.session_id,
      history: payload.history,
      request_id: payload.request_id,
    };

    const response = await apiFetch(`/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorDetail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // Non-JSON response (e.g. 502/504 gateway or proxy HTML)
        try {
          const rawText = await response.text();
          if (rawText) errorDetail += ` - ${rawText.slice(0, 150)}`;
        } catch {
          // ignore
        }
      }

      console.error(`[ORCA API Error] POST ${endpoint} failed (${response.status}) in ${elapsedMs}ms:`, errorDetail);
      if (response.status === 503 && errorDetail === 'AI_PROVIDER_UNAVAILABLE') {
        throw Object.assign(new Error('ORCA’s AI provider is temporarily unavailable. Please try again later.'), { code: 'AI_PROVIDER_UNAVAILABLE' });
      }
      throw new Error(`API route failed: ${errorDetail} (Endpoint: ${endpoint})`);
    }

    const data = await response.json();
    console.debug(`[ORCA API Success] POST ${endpoint} completed in ${elapsedMs}ms.`);
    return data;
  } catch (error: any) {
    const elapsedMs = Math.round(performance.now() - startTime);
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      console.error(`[ORCA Network Failure] Unable to reach backend at ${endpoint} (${elapsedMs}ms). Possible causes: backend offline, CORS blocked, or mixed-content (HTTPS/HTTP).`);
      throw new Error(`Unable to reach ORCA backend at ${API_BASE_URL}. Ensure the backend is active and CORS is allowed.`);
    } else if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      console.error(`[ORCA Timeout] Request to ${endpoint} timed out after ${elapsedMs}ms.`);
      throw new Error(`Request to ORCA conversation API timed out after ${elapsedMs}ms.`);
    }
    console.error(`[ORCA API Exception] Request to ${endpoint} failed:`, error);
    throw error;
  }
}

export async function fetchConversations() {
  const response = await apiFetch('/api/conversations');
  if (!response.ok) throw new Error(`Failed to load conversations (${response.status})`);
  return response.json();
}

export async function createConversation(title = 'New conversation') {
  const response = await apiFetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
  if (!response.ok) throw new Error(`Failed to create conversation (${response.status})`);
  return response.json();
}

export async function deleteConversation(id: string) {
  const response = await apiFetch(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete conversation (${response.status})`);
}

export async function fetchActiveSos() {
  const response = await apiFetch('/api/emergency/sos/active');
  if (!response.ok) throw new Error(`Failed to load SOS requests (${response.status})`);
  return response.json();
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

/* ==========================================================================
   Authentication & User Management APIs
   ========================================================================== */

export async function registerUser(payload: {
  name: string;
  email?: string;
  mobile_number?: string;
  password?: string;
  preferred_language?: string;
  role?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  return await response.json();
}

export async function loginUser(email_or_phone: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({ email_or_phone, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return await response.json();
}

export async function getUserProfile(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const response = await fetch(`${API_BASE_URL}/api/user/profile`, { headers });
  if (!response.ok) {
    throw new Error('Failed to retrieve user profile');
  }
  return await response.json();
}

export async function updateUserProfile(payload: any, token: string) {
  const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to update profile');
  }
  return await response.json();
}

/* ==========================================================================
   Location & Coastal Validation APIs
   ========================================================================== */

export async function validateLocation(lat: number, lon: number, accuracy_m?: number) {
  const response = await fetch(`${API_BASE_URL}/api/location/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, accuracy_m }),
  });
  if (!response.ok) {
    throw new Error('Location validation failed');
  }
  return await response.json();
}

export async function updateUserLocation(lat: number, lon: number, accuracy_m?: number, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const response = await fetch(`${API_BASE_URL}/api/location/update`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ lat, lon, accuracy_m }),
  });
  if (!response.ok) {
    throw new Error('Failed to update location');
  }
  return await response.json();
}

/* ==========================================================================
   Marine Weather, Risk & Forecast Telemetry APIs
   ========================================================================== */

export async function fetchMarineConditions(lat: number, lon: number, date?: string) {
  const qDate = date ? `&date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/api/marine/conditions?lat=${lat}&lon=${lon}${qDate}`);
  if (!response.ok) {
    throw new Error('Failed to fetch marine conditions');
  }

  return await response.json();
}

export async function fetchOceanAnalytics(lat: number, lon: number, region?: string) {
  const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (region) query.set("region", region);
  const response = await fetch(API_BASE_URL + "/api/analytics/ocean?" + query.toString());
  if (!response.ok) throw new Error("Failed to fetch ocean analytics");
  return await response.json();
}

export async function fetchMarineRisk(lat: number, lon: number, date?: string) {
  const qDate = date ? `&date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/api/marine/risk?lat=${lat}&lon=${lon}${qDate}`);
  if (!response.ok) {
    throw new Error('Failed to fetch marine risk');
  }
  return await response.json();
}

export async function fetchMarineForecast(lat: number, lon: number, date?: string) {
  const qDate = date ? `&date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/api/marine/forecast?lat=${lat}&lon=${lon}${qDate}`);
  if (!response.ok) {
    throw new Error('Failed to fetch marine forecast');
  }
  return await response.json();
}

export async function fetchMarineTide(lat: number, lon: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marine/tide?lat=${lat}&lon=${lon}`);
    if (!response.ok) {
      return { status: 'unavailable', high_tide_time: null, low_tide_time: null, message: 'Tide feed unavailable' };
    }
    return await response.json();
  } catch {
    return { status: 'unavailable', high_tide_time: null, low_tide_time: null, message: 'Tide feed unavailable' };
  }
}

export async function fetchPFZDataset(sector?: string, lat?: number, lon?: number, language: string = 'en') {
  const params = new URLSearchParams();
  if (sector) params.set('sector', sector);
  if (lat != null && Number.isFinite(lat)) params.set('lat', String(lat));
  if (lon != null && Number.isFinite(lon)) params.set('lon', String(lon));
  if (language) params.set('language', language);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/api/pfz${qs}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error('Failed to fetch Potential Fishing Zone dataset');
  }
  return await response.json();
}

export async function fetchPFZSectors() {
  const response = await fetch(`${API_BASE_URL}/api/pfz/sectors`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error('Failed to fetch coastal sectors');
  }
  return await response.json();
}

export async function fetchProviderHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health/providers`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error('Failed to fetch provider health');
  }
  return await response.json();
}

export async function fetchSatelliteStatus() {
  const response = await fetch(`${API_BASE_URL}/api/satellite/status`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error('Failed to fetch satellite status');
  }
  return await response.json();
}


/* ==========================================================================
   Marine Boundaries & GIS APIs
   ========================================================================== */

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

export async function fetchInternationalBoundaries(forceRefresh: boolean = false): Promise<any | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marine-boundaries/international?force_refresh=${forceRefresh}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Could not fetch International Boundaries:', err);
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

/* ==========================================================================
   Sarvam AI Voice & Speech APIs
   ========================================================================== */

export async function transcribeVoiceAudio(
  audioBlob: Blob,
  language: string = 'auto',
  filename?: string
): Promise<{
  transcript: string;
  language: string;
  language_code?: string;
  language_name?: string;
  english_transcript: string;
  source: string;
  is_mock?: boolean;
}> {
  let ext = 'webm';
  if (audioBlob.type.includes('ogg')) ext = 'ogg';
  else if (audioBlob.type.includes('mp4')) ext = 'mp4';
  else if (audioBlob.type.includes('wav')) ext = 'wav';
  else if (audioBlob.type.includes('webm')) ext = 'webm';

  const finalFilename = filename || `recording.${ext}`;
  const formData = new FormData();
  formData.append('file', audioBlob, finalFilename);
  formData.append('language', language);

  const response = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Voice transcription failed with status ${response.status}`);
  }

  return await response.json();
}

export async function synthesizeVoiceAudio(
  text: string,
  language: string = 'en',
  speaker: string = 'kavya'
): Promise<{
  audio_base64: string | null;
  audio_format: string;
  speaker: string;
  source: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/voice/speak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language,
      speaker,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voice synthesis failed with status ${response.status}`);
  }

  return await response.json();
}

/* ==========================================================================
   Safety Notifications & Alerts APIs
   ========================================================================== */

export async function fetchNotifications(userId?: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const query = userId ? `?user_id=${userId}` : '';
  const response = await fetch(`${API_BASE_URL}/api/notifications${query}`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return await response.json();
}

export async function markNotificationAsRead(notificationId: string) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
  return await response.json();
}

export async function markAllNotificationsAsRead(userId?: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const query = userId ? `?user_id=${userId}` : '';
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all${query}`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
  return await response.json();
}

export async function checkLocationSafetyAlerts(
  lat: number,
  lon: number,
  previousLat?: number,
  previousLon?: number,
  userId?: string
) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat,
      lon,
      previous_lat: previousLat,
      previous_lon: previousLon,
      user_id: userId || 'anonymous_session',
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to check location safety alerts');
  }
  return await response.json();
}

/* ==========================================================================
   Emergency Services & SOS APIs
   ========================================================================== */

export async function fetchEmergencyContacts(region?: string) {
  const query = region ? `?region=${encodeURIComponent(region)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/emergency/contacts${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch emergency contacts');
  }
  return await response.json();
}

export async function broadcastSOS(payload: {
  vessel_name?: string;
  registration_no?: string;
  lat: number;
  lon: number;
  crew_count?: number;
  emergency_nature: string;
  notes?: string;
  contact_phone?: string;
}) {
  const response = await apiFetch('/api/emergency/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to dispatch SOS broadcast');
  }
  return await response.json();
}

export async function fetchActiveSOS() {
  const response = await apiFetch('/api/emergency/sos/active');
  if (!response.ok) {
    throw new Error('Failed to fetch active SOS broadcasts');
  }
  return await response.json();
}

/* ==========================================================================
   Government Announcements & Policy Documents APIs
   ========================================================================== */

export async function fetchGovernmentAnnouncements(
  state?: string,
  category?: string,
  urgentOnly?: boolean
) {
  const params = new URLSearchParams();
  if (state) params.append('state', state);
  if (category) params.append('category', category);
  if (urgentOnly) params.append('urgent_only', 'true');

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/api/government/announcements${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch government announcements');
  }
  return await response.json();
}

export async function fetchGovernmentAnnouncementDetails(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/government/announcements/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch announcement details');
  }
  return await response.json();
}

export async function publishGovernmentAnnouncement(payload: any) {
  const response = await apiFetch(`/api/government/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to publish announcement');
  }
  return await response.json();
}

export async function fetchGovernmentDocuments() {
  const response = await fetch(`${API_BASE_URL}/api/government/documents`);
  if (!response.ok) {
    throw new Error('Failed to fetch government policy documents');
  }
  return await response.json();
}

/* ==========================================================================
   Super Admin & Historical Marine Comparison APIs
   ========================================================================== */

export async function fetchSystemHealth() {
  const response = await apiFetch(`/api/admin/system-health`);
  if (!response.ok) {
    throw new Error('Failed to fetch system health');
  }
  return await response.json();
}

export async function fetchAdminUsers() {
  const response = await apiFetch(`/api/admin/users`);
  if (!response.ok) {
    throw new Error('Failed to fetch user list');
  }
  return await response.json();
}

export async function updateUserRole(userId: string, role: string) {
  const response = await apiFetch(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error('Failed to update user role');
  }
  return await response.json();
}

export async function fetchHistoricalComparison(lat: number, lon: number, periodHours: number = 24) {
  const response = await fetch(
    `${API_BASE_URL}/api/marine/historical-comparison?lat=${lat}&lon=${lon}&period_hours=${periodHours}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch historical marine comparison');
  }
  return await response.json();
}

export type UserProfile = any;
export type GovernmentAnnouncement = any;
export type GovernmentDocument = any;
export type SystemHealth = any;
export const createGovernmentAnnouncement = publishGovernmentAnnouncement;
export const updateLocation = updateUserLocation;

export async function runKillerDemo(language: string = 'en') {
  const response = await fetch(`${API_BASE_URL}/api/demo/dahanu?language=${language}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Killer demo failed (${response.status})`);
  }
  return await response.json();
}

export async function getGeofences(lat: number, lon: number) {
  const response = await fetch(`${API_BASE_URL}/api/geofences?lat=${lat}&lon=${lon}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch geofences (${response.status})`);
  }
  return await response.json();
}

export async function getHazardAlerts(lat: number, lon: number, date?: string) {
  let url = `${API_BASE_URL}/api/alerts?lat=${lat}&lon=${lon}`;
  if (date) url += `&date=${date}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch hazard alerts (${response.status})`);
  }
  return await response.json();
}

export default {
  queryORCA,
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  validateLocation,
  updateUserLocation,
  fetchMarineConditions,
  fetchOceanAnalytics,
  fetchMarineRisk,
  fetchMarineForecast,
  fetchMarineTide,
  fetchPFZDataset,
  fetchMarineBoundariesEEZ,
  fetchInternationalBoundaries,
  checkMarineBoundary,
  fetchGeofences,
  transcribeVoiceAudio,
  synthesizeVoiceAudio,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkLocationSafetyAlerts,
  fetchEmergencyContacts,
  broadcastSOS,
  fetchActiveSOS,
  fetchGovernmentAnnouncements,
  fetchGovernmentAnnouncementDetails,
  publishGovernmentAnnouncement,
  fetchGovernmentDocuments,
  fetchSystemHealth,
  fetchAdminUsers,
  updateUserRole,
  fetchHistoricalComparison,
  getHazardAlerts,
};

export async function fetchSavedLocation() {
  const response = await apiFetch('/api/location/current');
  if (!response.ok) throw new Error('LOCATION_UNAVAILABLE');
  return response.json();
}
export async function saveSelectedLocation(lat: number, lon: number, accuracy_m?: number) {
  const response = await apiFetch('/api/location/update', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({lat, lon, accuracy_m}) });
  if (!response.ok) throw new Error('LOCATION_SAVE_FAILED');
  return response.json();
}

export async function updateSOSDetails(id: string, notes: string) {
  const response = await apiFetch(`/api/emergency/sos/${encodeURIComponent(id)}/details`, {method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({notes})});
  if (!response.ok) throw new Error("SOS_DETAILS_UNAVAILABLE");
  return response.json();
}


export async function logoutSession(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok && response.status !== 401) throw new Error('Session revocation failed');
}


export async function fetchConversation(id: string) {
  const response = await apiFetch(`/api/conversations/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`Conversation unavailable (${response.status})`);
  return response.json();
}

export interface DeviceSessionInfo {
  id: string;
  device_name: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_seen_at: string | null;
  expires_at: string;
  current: boolean;
}

export async function fetchActiveSessions(): Promise<DeviceSessionInfo[]> {
  const response = await apiFetch('/api/auth/sessions');
  if (!response.ok) throw new Error(`Failed to load sessions (${response.status})`);
  return response.json();
}

export async function revokeSessionById(sessionId: string): Promise<void> {
  const response = await apiFetch(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Session revocation failed (${response.status})`);
}

export async function revokeAllSessions(): Promise<void> {
  const response = await apiFetch('/api/auth/sessions', { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to revoke all sessions (${response.status})`);
}
