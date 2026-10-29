/**
 * NeuroSeg 3D - API Base Client
 * Uses configurable VITE_API_BASE_URL environment variable.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Response was not JSON
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      const connErr = new Error('Cannot connect to NeuroVision AI backend server. Please verify backend is running on ' + API_BASE_URL);
      connErr.status = 503;
      throw connErr;
    }
    throw err;
  }
}

export const client = {
  get: async (endpoint) => {
    const data = await request(endpoint, { method: 'GET' });
    return { data };
  },
  post: async (endpoint, body) => {
    const data = await request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data };
  },
};

export default client;
export { API_BASE_URL };
