import React from 'react';
import '../css/Navbar.css';
import Profile from './Profile';

function Navbar({ onLogout }) {
  return (
    <div className='navbar'>
        <Profile />
        <button className='navbar__logout' onClick={onLogout}>Log out</button>
    </div>
  )
}

export default Navbar
