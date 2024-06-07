import React, { useEffect, useState } from 'react';
import { spotify } from '../../spotify';

function Artists() {
    const [artists, setArtists] = useState(null);
    const notartists = !artists

    useEffect(() => {
        spotify.getMyTopArtists({"limit":5})
        .then(artists => {
            console.log(artists.items);
            if (artists) {
              setArtists(artists.items);
            }
        })
    }, [notartists])

    const getArtists = () => {
        return artists.map((artist) => (
            <li>{artist.name}</li>
        ))
    }

  if (artists) {
    return (
        <div className='artists'>
            <h1>Top 5 Artists</h1>
            <ul>
                {getArtists()}
            </ul>
        </div>
      )
  }
}

export default Artists