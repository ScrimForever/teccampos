import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import Loading from '../components/Loading'
import DashboardLayout from '../components/DashboardLayout'
import '../styles/DashboardLayout.css'
import './Register.css'

function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOk, setShowOk] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [failureCount, setFailureCount] = useState(0)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess('')

    if (failureCount >= 3) {
      setShowOfflineModal(true)
      return
    }

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      return
    }

    if (password !== confirmPassword) {
      return
    }

    if (password.length < 6) {
      return
    }

    setLoading(true)
    setShowOk(false)
    setErrorMessage('')

    try {
      const response = await api.post('/auth/register', {
        email,
        password,
      })

      if (response.status === 201) {
        setSuccessMessage('Registro realizado com sucesso!')
        // Show message for 1 second, then change to OK
        setTimeout(() => {
          setShowOk(true)
        }, 1000)
        // Redirect after 3 seconds total
        setTimeout(() => {
          setLoading(false)
          navigate('/login')
        }, 3000)
      } else {
        setSuccessMessage('Registro realizado com sucesso!')
        setTimeout(() => {
          setLoading(false)
          navigate('/login')
        }, 3000)
      }
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao registrar. Tente novamente.')
      const newFailureCount = failureCount + 1
      setFailureCount(newFailureCount)

      // Show error in spinner for 2 seconds, then return to form
      setTimeout(() => {
        setLoading(false)
        if (newFailureCount >= 3) {
          setShowOfflineModal(true)
        }
      }, 2000)
    }
  }

  return (
    <DashboardLayout>
      <>
        {loading && (
          <Loading
          message={
            errorMessage
              ? "Erro ao registrar"
              : showOk
                ? "✓ OK"
                : successMessage || "Registrando..."
          }
          isError={!!errorMessage}
        />
      )}

      {showOfflineModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>⚠️ Servidor Offline</h2>
            <p>O servidor está indisponível no momento. Tente novamente mais tarde.</p>
            <button
              className="modal-button"
              onClick={() => setShowOfflineModal(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="register-container">
        <div className="register-card">
        <img src="/logo.png" alt="TecCampos Logo" className="register-logo" />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="Insira sua senha"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Senha</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua senha"
              disabled={loading}
            />
          </div>

          {success && <div className="success-message">{success}</div>}

          <button type="submit" disabled={loading || failureCount >= 3}>
            {failureCount >= 3
              ? 'Servidor Indisponível'
              : loading
                ? 'Registrando...'
                : 'Registrar'}
          </button>

          <div className="login-link">
            Já tem conta? <a href="/login">Entrar</a>
          </div>
        </form>
        </div>
      </div>
      </>
    </DashboardLayout>
  )
}

export default Register
