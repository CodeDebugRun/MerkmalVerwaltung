// API Configuration - Centralized API base URL management

// Check if custom API URL is stored in localStorage (from database settings)
const getStoredApiUrl = () => {
  if (typeof window !== 'undefined') {
    const dbSettings = localStorage.getItem('dbSettings');
    if (dbSettings) {
      try {
        const parsed = JSON.parse(dbSettings);
        if (parsed.host) {
          // API server is always on port 3001, not the database port
          // Database port (parsed.port) is for SQL Server connection
          return `http://localhost:3001/api`;
        }
      } catch (e) {
        console.error('Error parsing stored database settings:', e);
      }
    }
  }
  return null;
};

export const API_CONFIG = {
  // Base URL for backend API - check stored settings first
  BASE_URL: getStoredApiUrl() || (process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL || 'https://your-production-api.com/api'
    : 'http://localhost:3001/api'),

  // API endpoints
  ENDPOINTS: {
    MERKMALSTEXTE: '/merkmalstexte',
    IDENTNRS: '/identnrs',
    FILTER: '/merkmalstexte/filter',
    DATABASE_TEST: '/database/test',
    DATABASE_INFO: '/database/info'
  }
};

// Helper function to build full API URLs
export const getApiUrl = (endpoint = '') => {
  // Always check for stored API URL dynamically
  const storedUrl = getStoredApiUrl();
  const baseUrl = storedUrl || API_CONFIG.BASE_URL;
  return `${baseUrl}${endpoint}`;
};

// Helper function to build API URLs with cache busting for refresh operations
export const getApiUrlWithCacheBust = (endpoint = '') => {
  const url = getApiUrl(endpoint);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

// Default fetch configuration
export const DEFAULT_FETCH_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  }
};