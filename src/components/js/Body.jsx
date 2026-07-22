import React from 'react';
import Navbar from './Navbar.jsx';
import SwipeDeck from './SwipeDeck.jsx';
import '../css/Body.css';

function Body({ onAuthError, onLogout }) {
  return (
    <div className='body'>
      <Navbar onLogout={onLogout} />
      <SwipeDeck onAuthError={onAuthError} />
    </div>
  );
}

export default Body;
