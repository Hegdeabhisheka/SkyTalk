import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => {
    console.log('Calling register API');
    return api.post('/auth/register', data);
  },
  requestOTP: (data) => {
    console.log('Calling request-otp API');
    return api.post('/auth/request-otp', data);
  },
  verifyOTP: (data) => {
    console.log('Calling verify-otp API with:', data);
    return api.post('/auth/verify-otp', data);
  },
  getCurrentUser: () => {
    console.log('Calling getCurrentUser API');
    return api.get('/auth/me');
  },
};

// Friends endpoints
export const friendsAPI = {
  searchUsers: (query) => api.get(`/friends/search?query=${query}`),
  sendRequest: (receiverId) => api.post('/friends/request', { receiverId }),
  getPendingRequests: () => api.get('/friends/requests/pending'),
  getSentRequests: () => api.get('/friends/requests/sent'),
  acceptRequest: (requestId) => api.post(`/friends/request/accept/${requestId}`),
  rejectRequest: (requestId) => api.post(`/friends/request/reject/${requestId}`),
  getFriendsList: () => api.get('/friends/list'),
  removeFriend: (friendId) => api.delete(`/friends/${friendId}`),
};

// Chat endpoints
export const chatAPI = {
  getConversation: (friendId) => api.get(`/chat/conversation/${friendId}`),
  getConversations: () => api.get('/chat/conversations'),
  uploadImage: (formData) => api.post('/chat/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  uploadFile: (formData) => api.post('/chat/upload-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  deleteMessage: (messageId) => api.post(`/chat/delete-message/${messageId}`),
};

export default api;
