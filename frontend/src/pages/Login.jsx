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
      const loggedUser = await login(username, password)

      if (loggedUser?.is_consultant) {
        navigate('/dashboard', { replace: true })
        return
      }

      // Usuário comum: verificar status do questionário
      const statusResponse = await api.get('/status')
      const statusType = statusResponse.data?.status_type

      if (statusType === 'waiting_approve') {
        navigate('/aguardando-aprovacao', { replace: true })
      } else if (statusType === 'completed') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/questionario-form', { replace: true })
      }
    } catch (err) {
      console.error('❌ Login error:', err)
      setError(err.message || 'Não foi possível realizar login')
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
