import React, { useEffect, useState } from 'react';
import '../css/Profile.css';
import { spotify } from '../../spotify';

function Profile() {
    const [profile, setProfile] = useState(null);
    const notprofile = !profile

    useEffect(() => {
        spotify.getMe()
        .then(user => {
            //console.log(user);
            if (user) {
              setProfile(user);
            }
        })
    }, [notprofile]);

  if (profile) {
    return (
      <a className='profile' href={profile.external_urls.spotify} target='blank'>
          <h1>{profile.display_name}</h1>
          <img src={profile.images[0].url} alt='Profile' />
      </a>
    )
  }
}

export default Profile