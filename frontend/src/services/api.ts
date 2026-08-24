/**
 * ORCA Marine AI - Backend API Service Layer
 * Interfaces directly with FastAPI endpoints:
 * - /query & /api/chat
 * - /api/marine/* (conditions, risk, forecast)
 * - /api/marine-boundaries/* (eez, check)
 * - /api/geofences
 * - /api/voice/* (Sarvam AI STT Saaras v3 & TTS Bulbul v3)
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

/**
 * Transcribes audio blob using Sarvam Saaras v3 STT.
 */
export async function transcribeVoiceAudio(audioBlob: Blob, language: string = 'auto'): Promise<{
  transcript: string;
  language: string;
  english_transcript: string;
  source: string;
}> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
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

/**
 * Synthesizes text to voice using Sarvam Bulbul v3 neural voices.
 */
export async function synthesizeVoiceAudio(
  text: string,
  language: string = 'en',
  speaker: string = 'meera'
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

export default {
  queryORCA,
  fetchMarineBoundariesEEZ,
  checkMarineBoundary,
  fetchGeofences,
  transcribeVoiceAudio,
  synthesizeVoiceAudio,
};
