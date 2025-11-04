import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import Loading from '../components/Loading'
import DashboardLayout from '../components/DashboardLayout'
import '../styles/DashboardLayout.css'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)

    try {
      // Step 1: Login
      console.log('🔐 Logging in...')
      await login(username, password)
      console.log('✅ Login successful')

      // Step 2: Check user status BEFORE any other action
      console.log('🔄 Checking /users/me endpoint...')
      const userResponse = await api.get('/users/me')
      console.log('📦 Response from /users/me:', userResponse.data)

      // Check user type FIRST
      const isConsultor = userResponse.data?.is_consultor === true
      console.log('👨‍💼 is_consultor:', isConsultor)

      // If is_consultor, redirect directly to dashboard
      if (isConsultor === true) {
        console.log('✅ User is consultor - Redirecting to DASHBOARD')
        navigate('/dashboard', { replace: true })
        return
      }

      // Otherwise, check questionario status
      const questionarioFinalizado = userResponse.data?.questionario_finalizado === true
      console.log('📋 questionario_finalizado:', questionarioFinalizado)

      // Step 3: Redirect based on questionnaire status
      if (questionarioFinalizado === true) {
        console.log('✅ Questionnaire is finalized - Redirecting to DASHBOARD')
        navigate('/dashboard', { replace: true })
      } else {
        console.log('⏳ Questionnaire is NOT finalized - Redirecting to QUESTIONNAIRE FORM')
        navigate('/questionario-form', { replace: true })
      }
    } catch (err) {
      console.error('❌ Login error:', err)

      // Handle HTTP errors specifically
      if (err.message.includes('HTTP error') || err.message.includes('status: 400')) {
        setError('Não foi possível realizar login')
      } else if (err.message.includes('Unauthorized')) {
        setError('Credenciais inválidas')
      } else {
        setError(err.message || 'Não foi possível realizar login')
      }
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <>
        {loading && <Loading message="Autenticando..." />}
        <div className="login-container">
        <div className="login-card">
          <img src="/logo.png" alt="TecCampos Logo" className="login-logo" />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Email</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Insira seu email"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Insira a sua senha."
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>

          <div className="register-link">
            Não tem conta? <a href="/register">Registre-se</a>
          </div>
        </form>
        </div>
        </div>
      </>
    </DashboardLayout>
  )
}

export default Login
