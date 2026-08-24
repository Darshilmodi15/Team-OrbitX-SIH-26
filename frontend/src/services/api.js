/**
 * ORCA Marine AI - Backend API Service Layer
 * Interfaces directly with FastAPI /query endpoint.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Sends an operational marine query to ORCA backend.
 * 
 * @param {Object} payload
 * @param {Object} payload.location - Vessel GPS coordinates { lat: number, lon: number }
 * @param {string} payload.date - Date in 'YYYY-MM-DD' format
 * @param {string} payload.question - User question or operational prompt
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

export default {
  queryORCA,
};
