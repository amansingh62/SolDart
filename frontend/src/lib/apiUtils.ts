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
    // Get token from localStorage if available
    const token = localStorage.getItem('token');
    
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

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle authentication errors
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error('Authentication error:', error);
          
          // Get the original request configuration
          const originalRequest = error.config;
          
          // Check if we already tried to refresh the token
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              // Try to refresh the token using the refresh-token endpoint
              const refreshResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/refresh-token`, {}, { withCredentials: true });
              
              if (refreshResponse.data.success) {
                // If token refresh was successful, retry the original request
                return api(originalRequest);
              } else {
                // If refresh failed, clear token and let user re-authenticate
                localStorage.removeItem('token');
                // You could redirect to login page or show a login modal here
                // window.location.href = '/login';
              }
            } catch (refreshError) {
              console.error('Error refreshing authentication:', refreshError);
              localStorage.removeItem('token');
              return Promise.reject(error);
            }
          }
          break;
        case 404:
          console.error('Resource not found:', error);
          // Handle 404 errors - check if it's the current-user endpoint
          if (error.config.url.includes('/auth/current-user')) {
            // Redirect to the correct endpoint
            return api.get('/auth/user');
          }
          break;
        default:
          console.error(`Error with status code ${error.response.status}:`, error);
      }
    } else {
      console.error('Network error:', error);
    }
    return Promise.reject(error);
  }
);

export default api;