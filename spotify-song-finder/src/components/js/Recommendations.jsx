import React, { useEffect, useMemo, useState } from 'react';
import { spotify } from '../../spotify';
import Recommendation from './Recommendation';
import '../css/Recommendations.css';

function Recommendations(props) {
    const [recommendations, setRecommendations] = useState(null);

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

    const getRecommendations = () => {
        return recommendations.map(recommendation => (
            <Recommendation key={recommendation.id} track={recommendation} />
        ))
    }

    if (recommendations) {
        return (
            <div className='recommendations'>
                <h1>Song Recommendations</h1>
                <div className='recommendationsList'>
                    {getRecommendations()}
                </div>
            </div>
        )
    }
}

export default Recommendations