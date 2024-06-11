import React from 'react';

function Songs(props) {
    let songs = props.songs

    const getSongs = () => {
        return songs.map((song) => (
            <li key={song.id}>{song.name} by {song.artists[0].name}</li>
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