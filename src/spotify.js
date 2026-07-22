import SpotifyWebApi from "spotify-web-api-js";

export const spotify = new SpotifyWebApi();

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const CODE_VERIFIER_KEY = "spotify_pkce_code_verifier";
const STATE_KEY = "spotify_pkce_state";

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

function base64UrlEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function randomToken() {
    const array = new Uint8Array(64);
    window.crypto.getRandomValues(array);
    return base64UrlEncode(array.buffer);
}

async function sha256Challenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
}

// Spotify no longer allows the old Implicit Grant flow (response_type=token)
// for apps, so login uses Authorization Code + PKCE instead - the standard
// flow for a browser-only app with no backend to hold a client secret.
export async function redirectToSpotifyLogin() {
    const verifier = randomToken();
    const state = randomToken().slice(0, 16);
    window.sessionStorage.setItem(CODE_VERIFIER_KEY, verifier);
    window.sessionStorage.setItem(STATE_KEY, state);
    const challenge = await sha256Challenge(verifier);

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectURI,
        scope: scopes.join(' '),
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state,
    });

    window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
}

// Confirms the `state` Spotify returned matches what we sent (basic CSRF
// protection) and hands back the PKCE verifier for this login attempt.
function consumePkceSession(returnedState) {
    const expectedState = window.sessionStorage.getItem(STATE_KEY);
    const verifier = window.sessionStorage.getItem(CODE_VERIFIER_KEY);
    window.sessionStorage.removeItem(STATE_KEY);
    window.sessionStorage.removeItem(CODE_VERIFIER_KEY);

    if (!verifier || !expectedState || expectedState !== returnedState) {
        return null;
    }
    return verifier;
}

// Reads Spotify's {error, error_description} body so failures are debuggable
// instead of just "something went wrong".
async function describeTokenError(response) {
    try {
        const body = await response.json();
        return body.error_description || body.error || `HTTP ${response.status}`;
    } catch {
        return `HTTP ${response.status}`;
    }
}

// Exchanges the ?code= Spotify redirected back with for an access/refresh token pair.
export async function exchangeCodeForToken(code, state) {
    const verifier = consumePkceSession(state);
    if (!verifier) {
        throw new Error('Login could not be verified (missing or mismatched PKCE session) - please try again.');
    }

    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectURI,
            code_verifier: verifier,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to exchange authorization code for a token: ${await describeTokenError(response)}`);
    }

    return response.json();
}

// Uses a stored refresh token to get a new access token without a full re-login.
export async function refreshAccessToken(refreshToken) {
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to refresh access token: ${await describeTokenError(response)}`);
    }

    return response.json();
}
