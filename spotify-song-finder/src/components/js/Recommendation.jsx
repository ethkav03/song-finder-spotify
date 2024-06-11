import React from 'react';
import '../css/Recommendation.css';

function Recommendation(props) {
    let track = props.track;
  
    if (track) {
        return (
            <div className='recommendation'>
                <img src={track.album.images[0].url} alt={track.name}/>
                <h1>{track.name}</h1>
                <h2>{track.artists.map(artist => artist.name).join(', ')}</h2>
            </div>
        )
    }
}

export default Recommendation