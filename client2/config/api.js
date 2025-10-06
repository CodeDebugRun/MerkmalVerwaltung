// API Configuration - Centralized API base URL management

// Check if custom API URL is stored in localStorage (from database settings)
const getStoredApiUrl = () => {
  if (typeof window !== 'undefined') {
    const dbSettings = localStorage.getItem('dbSettings');
    if (dbSettings) {
      try {
        const parsed = JSON.parse(dbSettings);
        if (parsed.host) {
          // If database settings exist, use them to construct API URL
          const port = parsed.port || '3001';
          return `http://${parsed.host}:${port}/api`;
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
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build API URLs with cache busting for refresh operations
export const getApiUrlWithCacheBust = (endpoint = '') => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

// Default fetch configuration
export const DEFAULT_FETCH_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  }
};