import React from 'react';

function Artists(props) {
    let artists = props.artists

    const getArtists = () => {
        return artists.map((artist) => (
            <li key={artist.id}>{artist.name}</li>
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