export const API_CONFIG = {
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com'
    : 'http://localhost:3001'
};
