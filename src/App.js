import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import Login from './components/js/Login';
import Body from './components/js/Body';
import { exchangeCodeForToken, refreshAccessToken, spotify } from './spotify';

const ACCESS_TOKEN_KEY = 'spotify_swipe_access_token';
const REFRESH_TOKEN_KEY = 'spotify_swipe_refresh_token';
const EXPIRY_KEY = 'spotify_swipe_token_expiry';

function readSession() {
  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
    expiry: Number(window.localStorage.getItem(EXPIRY_KEY)),
  };
}

// Spotify only returns a new refresh_token sometimes; keep the old one when it doesn't.
function writeSession(tokenResponse, fallbackRefreshToken) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokenResponse.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refresh_token || fallbackRefreshToken || '');
  window.localStorage.setItem(EXPIRY_KEY, String(Date.now() + (tokenResponse.expires_in || 3600) * 1000));
}

function clearSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(EXPIRY_KEY);
}

function App() {
  const [token, setToken] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  // Authorization codes are single-use; guard against React StrictMode's
  // dev-only double effect invocation trying to exchange the same code twice.
  const exchangeStartedRef = useRef(false);

  const logout = useCallback(() => {
    clearSession();
    spotify.setAccessToken('');
    setToken(null);
  }, []);

  // Called when a Spotify API request comes back 401 mid-session: try a
  // silent refresh before giving up and sending the user back to login.
  const handleAuthError = useCallback(() => {
    const { refreshToken } = readSession();
    if (!refreshToken) {
      logout();
      return;
    }

    refreshAccessToken(refreshToken)
      .then(tokenResponse => {
        writeSession(tokenResponse, refreshToken);
        spotify.setAccessToken(tokenResponse.access_token);
        setToken(tokenResponse.access_token);
      })
      .catch(err => {
        console.error('Silent token refresh failed:', err);
        logout();
      });
  }, [logout]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const state = params.get('state');

    if (code || error) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (code) {
      if (exchangeStartedRef.current) return;
      exchangeStartedRef.current = true;

      exchangeCodeForToken(code, state)
        .then(tokenResponse => {
          writeSession(tokenResponse);
          spotify.setAccessToken(tokenResponse.access_token);
          setToken(tokenResponse.access_token);
        })
        .catch(err => {
          console.error('Spotify login failed:', err);
          setLoginError(err.message || 'Could not complete Spotify login. Please try again.');
        })
        .finally(() => setCheckingSession(false));
      return;
    }

    if (error) {
      setLoginError('Spotify login was cancelled or failed. Please try again.');
      setCheckingSession(false);
      return;
    }

    const { accessToken, refreshToken, expiry } = readSession();
    if (accessToken && expiry && Date.now() < expiry) {
      spotify.setAccessToken(accessToken);
      setToken(accessToken);
      setCheckingSession(false);
      return;
    }

    if (refreshToken) {
      refreshAccessToken(refreshToken)
        .then(tokenResponse => {
          writeSession(tokenResponse, refreshToken);
          spotify.setAccessToken(tokenResponse.access_token);
          setToken(tokenResponse.access_token);
        })
        .catch(err => {
          console.error('Startup token refresh failed:', err);
          clearSession();
        })
        .finally(() => setCheckingSession(false));
      return;
    }

    setCheckingSession(false);
  }, []);

  if (checkingSession) {
    return <div className="App" />;
  }

  return (
    <div className="App">
      {token
        ? <Body onAuthError={handleAuthError} onLogout={logout} />
        : <Login error={loginError} />}
    </div>
  );
}

export default App;
