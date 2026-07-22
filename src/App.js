import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import Login from './components/js/Login';
import Body from './components/js/Body';
import { getTokenFromUrl, spotify } from './spotify';

const TOKEN_KEY = 'spotify_swipe_token';
const TOKEN_EXPIRY_KEY = 'spotify_swipe_token_expiry';

function getStoredToken() {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const expiry = Number(window.localStorage.getItem(TOKEN_EXPIRY_KEY));
  return token && expiry && Date.now() < expiry ? token : null;
}

function storeToken(token, expiresInSeconds) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
}

function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

function App() {
  const [token, setToken] = useState(null);
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    const hash = getTokenFromUrl();

    if (hash.access_token || hash.error) {
      window.location.hash = '';
    }

    if (hash.access_token) {
      storeToken(hash.access_token, Number(hash.expires_in) || 3600);
      spotify.setAccessToken(hash.access_token);
      setToken(hash.access_token);
      return;
    }

    if (hash.error) {
      setLoginError('Spotify login was cancelled or failed. Please try again.');
      return;
    }

    const storedToken = getStoredToken();
    if (storedToken) {
      spotify.setAccessToken(storedToken);
      setToken(storedToken);
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    spotify.setAccessToken('');
    setToken(null);
  }, []);

  return (
    <div className="App">
      {token
        ? <Body onAuthError={logout} onLogout={logout} />
        : <Login error={loginError} />}
    </div>
  );
}

export default App;
