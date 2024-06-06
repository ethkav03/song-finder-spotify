import React, { useEffect, useState } from 'react';
import '../css/Profile.css';
import { spotify } from '../../App';

function Profile() {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        spotify.getMe()
        .then(user => {
            //console.log(user);
            if (user) {
              setProfile(user);
            }
        })
    }, [!profile]);

  if (profile) {
    return (
      <a className='profile' href={profile.external_urls.spotify} target='blank'>
          <h1>{profile.display_name}</h1>
          <img src={profile.images[0].url} />
      </a>
    )
  }
}

export default Profile