import React, { useEffect, useState } from 'react';
import { spotify } from '../../spotify';

function Songs() {
    const [songs, setSongs] = useState(null);
    const notsongs = !songs;

    useEffect(() => {
        spotify.getMyTopTracks({"limit":5})
        .then(songs => {
            console.log(songs.items);
            if (songs) {
              setSongs(songs.items);
            }
        })
    }, [notsongs])

    const getSongs = () => {
        return songs.map((song) => (
            <li>{song.name} by {song.artists[0].name}</li>
        ))
    }

  if (songs) {
    return (
        <div className='songs'>
            <h1>Top 5 Songs</h1>
            <ul>
                {getSongs()}
            </ul>
        </div>
      )
  }
}

export default Songs