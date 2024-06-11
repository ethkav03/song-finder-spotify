import React, { useEffect, useMemo, useState } from 'react';
import { spotify } from '../../spotify';
import Recommendation from './Recommendation';
import '../css/Recommendations.css';

function Recommendations(props) {
    const [recommendations, setRecommendations] = useState(null);
    const [index, setIndex] = useState(0);

    let artists = props.artists;

    const params = useMemo(() => ({
        limit: 100,
        seed_artists: artists.join(','),
    }), [artists]);

    useEffect(() => {
        spotify.getRecommendations(params)
            .then(recommendations => {
                // console.log(recommendations);
                if (recommendations) {
                    setRecommendations(recommendations.tracks);
                }
            })
            .catch(err => console.error(err));
    }, [params]);

    const saveTrack = () => {
        //console.log(track.id);
        spotify.addToMySavedTracks([recommendations[index].id])
        .catch((err) => console.log(err));
    }

    if (recommendations) {
        return (
            <div className='recommendations'>
                <h1>Song Recommendations</h1>
                <div className='recommendationsList'>
                    <button onClick={() => setIndex(index + 1)}>Discard</button>
                    <Recommendation key={recommendations[index].id} track={recommendations[index]} />
                    <button onClick={() => {
                        setIndex(index + 1);
                        saveTrack();
                    }}>Save</button>
                </div>
            </div>
        )
    }
}

export default Recommendations