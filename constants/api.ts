/** Backend base URL — login and API must use the same host for JWT to be valid. */
export const API_BASE_URL = "https://mmes-sep490.onrender.com";

export const SIGNALR_HUB_URL = `${API_BASE_URL}/hubs/realtime`;
