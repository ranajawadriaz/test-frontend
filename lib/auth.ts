/**
 * Authentication utility functions
 * Handles token management, validation, and expiry checks
 */

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthData {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/**
 * Store authentication data in localStorage
 */
export const setAuthData = (data: AuthData): void => {
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('expiresAt', String(Date.now() + data.expires_in * 1000));
  localStorage.setItem('user', JSON.stringify(data.user));
};

/**
 * Get authentication token
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Get user data from localStorage
 */
export const getUser = (): User | null => {
  const userData = localStorage.getItem('user');
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (): boolean => {
  const expiresAt = localStorage.getItem('expiresAt');
  if (!expiresAt) return true;
  return Date.now() > parseInt(expiresAt);
};

/**
 * Check if user is authenticated (token exists and not expired)
 */
export const isAuthenticated = (): boolean => {
  const token = getToken();
  return !!token && !isTokenExpired();
};

/**
 * Clear all authentication data
 */
export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('expiresAt');
  localStorage.removeItem('user');
};

/**
 * Get time remaining until token expires (in seconds)
 */
export const getTimeUntilExpiry = (): number => {
  const expiresAt = localStorage.getItem('expiresAt');
  if (!expiresAt) return 0;
  const remaining = parseInt(expiresAt) - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
};

/**
 * Format time remaining in human-readable format
 */
export const formatTimeRemaining = (): string => {
  const seconds = getTimeUntilExpiry();
  if (seconds <= 0) return 'Expired';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
};

/**
 * Make authenticated API request
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getToken();
  
  if (!token || isTokenExpired()) {
    throw new Error('Authentication required');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers,
  });
};
