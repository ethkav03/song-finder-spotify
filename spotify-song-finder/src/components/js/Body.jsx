import React from 'react';
import Navbar from './Navbar.jsx';
import '../css/Body.css';
import Songs from './Songs.jsx';
import Artists from './Artists.jsx';

function Body() {
  return (
    <div className='body'>
        <Navbar />
        <div>
          <Songs />
          <Artists />
        </div>
    </div>
  )
}

export default Body