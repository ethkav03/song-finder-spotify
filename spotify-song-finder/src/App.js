import React, { useEffect, useState } from 'react';
import './App.css';
import Login from './components/js/Login';
import { getTokenFromUrl } from './spotify';
import Body from './components/js/Body';
import { spotify } from './spotify';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const hash = getTokenFromUrl();
    window.location.hash = "";

    const _token = hash.access_token;

    if (_token) {
      setToken(_token);

      spotify.setAccessToken(_token);
    }

    //console.log("TOKEN ", token);
  }, [token]);

  return (
    <div className="App">
      {
        token ? (
          <Body />
        ) : (
          <Login />
        )
      }
    </div>
  );
}

export default App;
