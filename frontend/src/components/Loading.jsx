import React from 'react'
import '../styles/Loading.css'

function Loading({ message = 'Carregando...', isError = false }) {
  return (
    <div className="loading-overlay">
      <div className={`loading-spinner ${isError ? 'error' : ''}`}>
        <div className={`spinner ${isError ? 'error' : ''}`}></div>
        <p>{message}</p>
      </div>
    </div>
  )
}

export default Loading
