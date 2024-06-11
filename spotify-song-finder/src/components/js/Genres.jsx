import React from 'react'

function Genres(props) {
  let genres = props.genres

    const getGenres = () => {
        return genres.map((genre) => (
            <li key={genre}>{genre}</li>
        ))
    }

    if (genres) {
      return (
          <div className='genres'>
              <h1>Top 5 Genres</h1>
              <ul>
                  {getGenres()}
              </ul>
          </div>
        )
    }
}

export default Genres