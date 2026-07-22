import SpotifyWebApi from "spotify-web-api-js";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export const spotify = new SpotifyWebApi();

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";
const CODE_VERIFIER_KEY = "spotify_pkce_code_verifier";
const STATE_KEY = "spotify_pkce_state";

export const isNativePlatform = Capacitor.isNativePlatform();

// Spotify requires https:// (or a 127.0.0.1 loopback, which isn't meaningful
// on-device) - there's no real server at this address, it exists purely so
// AndroidManifest.xml's intent-filter (scheme="https" host="com.songswiper.app")
// can intercept the redirect and hand it back to the app instead of it 404ing
// in a browser. This mirrors the pattern Spotify's own Android SDK docs use.
const NATIVE_REDIRECT_URI = "https://com.songswiper.app/callback";

// Set REACT_APP_SPOTIFY_CLIENT_ID (and optionally REACT_APP_SPOTIFY_REDIRECT_URI)
// in a .env file at the project root - see .env.example.
export const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
export const redirectURI = isNativePlatform
    ? NATIVE_REDIRECT_URI
    : (process.env.REACT_APP_SPOTIFY_REDIRECT_URI || window.location.origin);

const scopes = [
    "user-read-currently-playing",
    "user-read-recently-played",
    "user-read-playback-state",
    "user-top-read",
    "user-modify-playback-state",
    "user-library-modify"
];

// Bump this whenever `scopes` changes. App.js compares it against what was
// stored at login time and forces a fresh login (with a fresh consent
// screen) if they don't match - otherwise a session from before a scope was
// added would keep silently refreshing without ever actually having it.
export const SCOPE_VERSION = String(scopes.length) + ':' + scopes.slice().sort().join(',');

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
        // Force the consent screen every time. Without this, Spotify can
        // silently reuse a prior grant and skip re-prompting - if that grant
        // predates a scope being added (e.g. user-library-modify), the new
        // token comes back without it and library writes fail with no
        // obvious cause.
        show_dialog: 'true',
    });

    const url = `${AUTH_ENDPOINT}?${params.toString()}`;

    if (isNativePlatform) {
        // Login inside the app's own WebView is unreliable (Spotify's login
        // page can behave oddly or refuse to complete embedded) and is a
        // legitimate phishing red flag for an OAuth provider to block, so
        // open it in the system browser / Custom Tabs instead. The redirect
        // back is caught by the appUrlOpen listener in App.js.
        await Browser.open({ url });
    } else {
        window.location.href = url;
    }
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

// Reads Spotify's Web API {error: {status, message}} body (a different
// shape than the token endpoint's {error, error_description}).
async function describeApiError(response) {
    try {
        const body = await response.json();
        return body?.error?.message || `HTTP ${response.status}`;
    } catch {
        return `HTTP ${response.status}`;
    }
}

// spotify-web-api-js's addToMySavedTracks() PUTs a bare JSON array
// ([id1, id2]) as the body, which Spotify's API now rejects with
// "Missing required field: ids" - it wants {"ids": [id1, id2]}. Bypass the
// library for this one call and hit the endpoint with the body it expects.
export async function saveTrack(trackId) {
    const response = await fetch(`${API_BASE}/me/tracks`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${spotify.getAccessToken()}`,
        },
        body: JSON.stringify({ ids: [trackId] }),
    });

    if (!response.ok) {
        const error = new Error(`Failed to save track: ${await describeApiError(response)}`);
        error.status = response.status;
        throw error;
    }
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
