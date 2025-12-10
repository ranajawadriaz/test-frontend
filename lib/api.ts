// API Configuration
// Automatically uses environment variable or falls back to localhost
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ranajawadapi.duckdns.org';

// Helper function to make authenticated API calls
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
