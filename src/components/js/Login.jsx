import React from 'react';
import '../css/Login.css';
import { loginUrl, clientId } from '../../spotify.js';

function Login({ error }) {
  const configured = Boolean(clientId);

  return (
    <div className='login'>
        <div className='login__card'>
            <h1 className='login__logo'>Song Swiper</h1>
            <p className='login__tagline'>
                Swipe right to like, left to skip. A constant feed of new songs
                pulled from your Spotify recommendations.
            </p>

            {error && <p className='login__error'>{error}</p>}

            {configured ? (
                <a className='login__button' href={loginUrl}>Log in with Spotify</a>
            ) : (
                <p className='login__error'>
                    Missing Spotify credentials. Copy <code>.env.example</code> to <code>.env</code> and
                    set <code>REACT_APP_SPOTIFY_CLIENT_ID</code> before starting the app.
                </p>
            )}
        </div>
    </div>
  )
}

export default Login
