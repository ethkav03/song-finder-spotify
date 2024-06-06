import React from 'react';
import Navbar from './Navbar.jsx';
import '../css/Body.css';

function Body() {
  return (
    <div className='body'>
        <Navbar />
        <h1>Logged In</h1>
    </div>
  )
}

export default Body