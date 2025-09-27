const API_BASE = 'http://localhost:5000'

export const api = {
  // Auth endpoints
  login: async (credentials) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
    return response.json()
  },

  register: async (userData) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    return response.json()
  },

  // Tour endpoints
  getTours: async () => {
    const response = await fetch(`${API_BASE}/tours`)
    return response.json()
  },

  createTour: async (tourData) => {
    const response = await fetch(`${API_BASE}/tours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tourData)
    })
    return response.json()
  },

  // Booking endpoints
  createBooking: async (bookingData) => {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    })
    return response.json()
  },

  getBookings: async (userId) => {
    const response = await fetch(`${API_BASE}/bookings/${userId}`)
    return response.json()
  },

  // AI Chat endpoint
  chat: async (message) => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    return response.json()
  }
}