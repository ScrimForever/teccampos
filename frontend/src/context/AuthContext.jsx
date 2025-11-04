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

    if (token && email) {
      // If token and email exist in localStorage, restore the session
      // Token will be validated automatically when making API calls
      api.setToken(token)
      setIsAuthenticated(true)
      setUser({ email, token })
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      localStorage.setItem('userEmail', user.email)
    } else {
      localStorage.removeItem('userEmail')
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

      // Verify login
      const verifyResponse = await api.get('/verification/verify-login')

      // Always authenticate the user regardless of verification response
      // Both true and false responses should allow access to questionario
      setIsAuthenticated(true)
      setUser({ email, token })
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
