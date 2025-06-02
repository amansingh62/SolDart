import axios from 'axios';

// Create a base axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  withCredentials: true, // Always send cookies with requests
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to handle authentication
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    console.log('API Request - Token:', token); // Add logging
    
    // If token exists, add it to the headers
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to handle logout
function handleLogout() {
  localStorage.removeItem('token');
  // Dispatch a custom event instead of hard reload
  window.dispatchEvent(new Event('forceLogout'));
}

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 errors silently
    if (error.response && error.response.status === 401) {
      // Don't show error for refresh token failures
      if (!error.config.url.includes('/auth/refresh-token')) {
        console.error('API Error:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default api;