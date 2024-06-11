import React, { useEffect, useState } from 'react';
import { spotify } from '../../spotify';
import Navbar from './Navbar.jsx';
import '../css/Body.css';
import Songs from './Songs.jsx';
import Artists from './Artists.jsx';
import Genres from './Genres.jsx';
import Recommendations from './Recommendations.jsx';
import { getArtistIds, getTop5Genres } from '../utilities.js';

function Body() {
  const [songs, setSongs] = useState(null);
  const notsongs = !songs;
  const [artists, setArtists] = useState(null);
  const notartists = !artists

    useEffect(() => {
        spotify.getMyTopArtists({"limit":5})
        .then(artists => {
            //console.log(artists.items);
            if (artists) {
              setArtists(artists.items);
            }
        })
        .catch(err => console.log(err));
    }, [notartists])

    useEffect(() => {
        spotify.getMyTopTracks({"limit":5})
        .then(songs => {
            //console.log(songs.items);
            if (songs) {
              setSongs(songs.items);
            }
        })
        .catch(err => console.log(err));
    }, [notsongs])


  if (artists && songs) {
    return (
      <div className='body'>
          <Navbar />
          <div>
            <Recommendations artists={getArtistIds(artists)} />
          </div>
      </div>
    )
  }
}

export default Body