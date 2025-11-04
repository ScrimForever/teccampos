# TecCampos Frontend

A React application with bearer token authentication for API access.

## Features

- **Bearer Token Authentication**: Secure login using bearer tokens
- **Persistent Sessions**: Token stored in localStorage for persistent sessions
- **Protected Routes**: Dashboard accessible only when authenticated
- **API Service**: Centralized API service with automatic bearer token injection
- **Automatic Token Verification**: Validates token on app load and redirects accordingly

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

## API Configuration

The application is configured to connect to the API at:
- **Base URL**: `http://127.0.0.1:8888`

To change the API URL, edit `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://127.0.0.1:8888'
```

## Usage

### Login

1. Navigate to `/login`
2. Enter your bearer token
3. Click "Login"

The application will verify the token by calling `/auth/verify` endpoint.

### Making API Calls

All API calls automatically include the bearer token in the Authorization header:

```javascript
import { api } from './services/api'

// GET request
const data = await api.get('/api/endpoint')

// POST request
const result = await api.post('/api/endpoint', { key: 'value' })

// PUT request
await api.put('/api/endpoint', { key: 'value' })

// DELETE request
await api.delete('/api/endpoint')

// PATCH request
await api.patch('/api/endpoint', { key: 'value' })
```

## Project Structure

```
src/
├── components/
│   └── ProtectedRoute.jsx    # Route wrapper for authentication
├── context/
│   └── AuthContext.jsx        # Authentication context and hooks
├── pages/
│   ├── Login.jsx              # Login page
│   ├── Login.css
│   ├── Dashboard.jsx          # Protected dashboard
│   └── Dashboard.css
├── services/
│   └── api.js                 # API service with bearer token support
├── App.jsx                    # Main app component with routing
├── main.jsx                   # App entry point
└── index.css                  # Global styles
```

## Authentication Flow

1. User enters bearer token on login page
2. Token is validated against `/auth/verify` endpoint
3. Valid token is stored in localStorage
4. All subsequent API requests include token in Authorization header
5. On 401 responses, user is automatically logged out and redirected to login
