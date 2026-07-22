import SpotifyWebApi from "spotify-web-api-js";

export const spotify = new SpotifyWebApi();

export const authEndpoint = "https://accounts.spotify.com/authorize";

// Set REACT_APP_SPOTIFY_CLIENT_ID (and optionally REACT_APP_SPOTIFY_REDIRECT_URI)
// in a .env file at the project root - see .env.example.
export const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
export const redirectURI = process.env.REACT_APP_SPOTIFY_REDIRECT_URI || window.location.origin;

const scopes = [
    "user-read-currently-playing",
    "user-read-recently-played",
    "user-read-playback-state",
    "user-top-read",
    "user-modify-playback-state",
    "user-library-modify"
];

export const getTokenFromUrl = () => {
    return window.location.hash.substring(1).split('&').reduce((initial, item) => {
        let parts = item.split('=');
        initial[parts[0]] = decodeURIComponent(parts[1]);

        return initial;
    }, {})
}

export const loginUrl = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectURI}&scope=${scopes.join('%20')}&response_type=token&show_dialog=true`;
