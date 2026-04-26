import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import '../styles/DashboardLayout.css'
import './Login.css'

function AguardandoAprovacao() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <DashboardLayout>
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="TecCampos Logo" className="login-logo" />

          <div style={{ margin: '32px 0 24px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ color: '#2469B3', marginBottom: '12px', fontSize: '22px' }}>
              Aguardando Aprovação
            </h2>
            <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6' }}>
              Seu questionário foi enviado com sucesso e está aguardando aprovação de um consultor.
              Você receberá uma notificação assim que for analisado.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#2469B3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AguardandoAprovacao
