import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on app start
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (credentials) => {
    try {
      const response = await api.login(credentials)
      if (response.success) {
        setUser(response.user)
        localStorage.setItem('user', JSON.stringify(response.user))
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      return { success: false, error: 'Đăng nhập thất bại' }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.register(userData)
      if (response.success) {
        setUser(response.user)
        localStorage.setItem('user', JSON.stringify(response.user))
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      return { success: false, error: 'Đăng ký thất bại' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}