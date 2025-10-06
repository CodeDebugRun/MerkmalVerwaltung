// API client utility to handle database configuration headers
export const getDbConfigHeaders = () => {
  const dbSettings = localStorage.getItem('dbSettings');

  if (!dbSettings) {
    return {};
  }

  try {
    const config = JSON.parse(dbSettings);
    return {
      'X-DB-Config': JSON.stringify(config)
    };
  } catch (error) {
    console.error('Error parsing database settings:', error);
    return {};
  }
};

// Wrapper for fetch with database configuration
export const fetchWithDbConfig = async (url, options = {}) => {
  const dbHeaders = getDbConfigHeaders();

  const mergedOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...dbHeaders,
      ...(options.headers || {})
    }
  };

  return fetch(url, mergedOptions);
};

// GET request with database config
export const getWithDbConfig = async (url) => {
  return fetchWithDbConfig(url, {
    method: 'GET'
  });
};

// POST request with database config
export const postWithDbConfig = async (url, data) => {
  return fetchWithDbConfig(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// PUT request with database config
export const putWithDbConfig = async (url, data) => {
  return fetchWithDbConfig(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

// DELETE request with database config
export const deleteWithDbConfig = async (url) => {
  return fetchWithDbConfig(url, {
    method: 'DELETE'
  });
};