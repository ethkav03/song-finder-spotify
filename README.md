# Song Swiper

A Tinder-style way to discover music: swipe right on a song to add it to your
Spotify Liked Songs, swipe left to skip it. The feed is a continuous stream of
catalog tracks pulled via search, seeded from your own top artists and their
genres, refilled automatically as you swipe.

## Setup

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. In the app's Settings, add a Redirect URI of `http://127.0.0.1:3000` (or
   an `https://` URL wherever you'll run this from). Spotify only allows
   plain `http://` for the literal loopback address `127.0.0.1` — it rejects
   `localhost` with a "redirect_uri: Insecure" error.
3. Copy `.env.example` to `.env` and fill in your Client ID:

   ```
   REACT_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   REACT_APP_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000
   ```

   `REACT_APP_SPOTIFY_REDIRECT_URI` is optional — it defaults to the page's
   own origin — but for local dev set it explicitly so it matches what you
   registered above.
4. Install dependencies and start the app:

   ```
   npm install
   npm start
   ```
5. Open the app at **`http://127.0.0.1:3000`**, not `http://localhost:3000`
   — they're the same server, but the redirect URI has to match exactly what
   you registered.
6. Log in with Spotify. Your account needs *some* listening history so the
   app has top artists/genres to search from; brand new accounts fall back to
   a small set of general genre seeds.

Auth uses the Authorization Code flow with PKCE — the flow Spotify requires
for browser-only apps now that Implicit Grant is disabled for apps. No
backend or client secret is needed; a code verifier is generated in-browser
and everything happens over `fetch`. Access + refresh tokens are cached in
`localStorage`, so a page refresh doesn't force a re-login, and an expired
access token (or a 401 from Spotify mid-session) triggers a silent refresh
before falling back to the login screen.

## How it works

- **`src/spotify.js`** — Spotify API client (`spotify-web-api-js`) plus the
  Authorization Code + PKCE login/token-exchange/refresh helpers and scopes.
  Client ID and redirect URI come from environment variables rather than a
  committed secrets file.
- **`src/hooks/useSwipeQueue.js`** — owns the feed. Spotify shut down
  `/v1/recommendations` (along with related-artists and audio-features) for
  apps without special "extended access" approval, which isn't realistically
  available for a personal project, so this builds its own feed instead: on
  login it pulls up to 50 of your top artists to build a genre pool and an
  artist-name pool, then repeatedly calls the catalog search endpoint
  (`genre:"..."` most of the time, `artist:"..."` the rest) at a random
  offset, filtering out any track already seen this session. It automatically
  fetches another batch whenever the queue drops below 3 songs, with backoff
  if Spotify stops returning anything new, so the feed keeps flowing without
  hammering the API.
- **`src/components/js/SwipeCard.jsx`** — a single draggable card using
  Pointer Events (mouse + touch + pen in one code path). Dragging past ~100px
  commits the swipe and animates the card off-screen; releasing short of that
  springs it back to center. Direction can also be triggered programmatically
  (used by the Like/Nope buttons and arrow keys) via a small imperative
  handle.
- **`src/hooks/useEmbedPreviewPlayer.js`** — plays each card's track through
  Spotify's [embed IFrame player](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api)
  instead of the Web API's `preview_url` field, which Spotify has made
  unreliable (null for most tracks on most apps now). No extra OAuth scope
  needed, works on free accounts. It lazily creates one embed controller and
  redirects it (`loadUri` + `play`) to the new track whenever the front card
  changes; the docked player bar at the bottom of the deck is the actual
  Spotify-branded widget.
- **`src/components/js/SwipeDeck.jsx`** — renders the current + next card as a
  stack, wires up the buttons/keyboard shortcuts (← skip, → like), and saves
  liked tracks to the user's library on a right swipe via `saveTrack()`
  (`src/spotify.js`) - a direct `fetch` PUT to `/me/tracks`, bypassing
  `spotify-web-api-js`'s `addToMySavedTracks`, which sends a bare array body
  Spotify's API now rejects ("Missing required field: ids") instead of the
  `{"ids": [...]}` shape it actually wants.
- **`src/App.js`** — handles the OAuth redirect (code exchange), persists
  access/refresh tokens, silently refreshes on expiry/401, and logs the user
  out when that fails or via the navbar button.

Everything else (`Navbar`, `Profile`, `Login`) is largely as it was, restyled
to match. The old static "top 5 songs/artists/genres" panels and the
button-only recommendation list were removed in favor of the swipe deck.

## Known limitations

- Browsers block audio autoplay without a user gesture, so the very first
  card of a session may need one manual play tap on the embedded player
  before playback starts automatically for the rest of the session.
- Spotify can silently reuse an old consent grant on login and skip
  re-prompting, so a session from before a scope was added to
  `src/spotify.js` wouldn't actually have it (and refreshing never re-grants
  scopes either). Login forces the consent screen (`show_dialog=true`) so
  this only bites existing sessions, and `App.js` fingerprints the granted
  scope list (`SCOPE_VERSION`) against what's stored, discarding the session
  automatically if they don't match instead of leaving it silently broken.

## Available scripts

- `npm start` — run in development mode at [http://127.0.0.1:3000](http://127.0.0.1:3000).
- `npm test` — run the test suite.
- `npm run build` — production build to `build/`.

This project was originally bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
