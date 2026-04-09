import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.token) {
        config.headers.Authorization = `Bearer ${userData.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth endpoints
export const register = (userData) => api.post('/register', userData);
export const login = (credentials) => api.post('/login', credentials);

// Parking endpoints
export const addParking = (parkingData) => api.post('/add_parking', parkingData);
export const getNearbyParking = (lat, lng, radius) => api.get(`/nearby_parking?lat=${lat}&lng=${lng}&radius=${radius}`);
export const getParkingById = (id) => api.get(`/parking/${id}`);

// Booking endpoints
export const createBooking = (bookingData) => api.post('/book', bookingData);
export const confirmBooking = (id, status) => api.put(`/confirm_booking/${id}`, status);
export const getUserBookings = (userId) => api.get(`/my_bookings?user_id=${userId}`);
export const getOwnerBookings = (ownerId) => api.get(`/owner_bookings/${ownerId}`);

export default api;