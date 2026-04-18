import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = api.getToken()
    const email = localStorage.getItem('userEmail')
    const isConsultant = localStorage.getItem('isConsultant') === 'true'

    if (token && email) {
      api.setToken(token)
      setIsAuthenticated(true)
      setUser({ email, token, is_consultant: isConsultant })
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      localStorage.setItem('userEmail', user.email)
      localStorage.setItem('isConsultant', user.is_consultant ? 'true' : 'false')
    } else {
      localStorage.removeItem('userEmail')
      localStorage.removeItem('isConsultant')
    }
  }, [isAuthenticated, user])

  const login = async (email, password) => {
    try {
      const response = await api.postFormData('/auth/jwt/login', {
        username: email,
        password,
      })

      const token = response.data?.access_token || response.data?.token

      if (!token) {
        throw new Error('No token received from server')
      }

      api.setToken(token)

      const meResponse = await api.get('/users/me')
      const isConsultant = meResponse.data?.is_consultant ?? false

      const userData = { email, token, is_consultant: isConsultant }
      setIsAuthenticated(true)
      setUser(userData)
      return userData
    } catch (error) {
      api.setToken(null)
      throw error
    }
  }

  const logout = () => {
    api.setToken(null)
    setIsAuthenticated(false)
    setUser(null)
  }

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
