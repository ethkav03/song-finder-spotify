import { useCallback, useEffect, useRef, useState } from 'react';
import { spotify } from '../spotify';
import { getArtistIds, getTrackIds } from '../components/utilities';

// Spotify's /recommendations endpoint accepts at most 5 seeds total
// (any mix of seed_artists / seed_tracks / seed_genres).
const MAX_SEEDS = 5;
const MAX_SEED_ARTISTS = 3;
const BATCH_SIZE = 40;
const REFILL_THRESHOLD = 3;
const MAX_EMPTY_STREAK = 3;
const EMPTY_STREAK_BACKOFF_MS = 1500;

// Used only when a listener has no top artists/tracks yet (brand new account).
const FALLBACK_GENRES = ['pop', 'rock', 'hip-hop', 'indie', 'electronic'];

function sample(pool, count) {
    if (pool.length <= count) return pool;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function isAuthError(err) {
    return err?.status === 401 || err?.xhr?.status === 401;
}

// Manages a continuously-refilling queue of Spotify recommendations,
// deduplicated against everything already shown this session.
export default function useSwipeQueue({ onAuthError } = {}) {
    const [queue, setQueue] = useState([]);
    const [initializing, setInitializing] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [saveError, setSaveError] = useState('');

    const seenIds = useRef(new Set());
    const seedArtistIds = useRef([]);
    const seedTrackIds = useRef([]);
    const fetchingRef = useRef(false);
    const initializedRef = useRef(false);
    const emptyStreakRef = useRef(0);

    const fetchBatch = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            const hasArtistSeeds = seedArtistIds.current.length > 0;
            const hasTrackSeeds = seedTrackIds.current.length > 0;
            const params = { limit: BATCH_SIZE };

            if (hasArtistSeeds || hasTrackSeeds) {
                const artistCount = Math.min(MAX_SEED_ARTISTS, seedArtistIds.current.length);
                const trackCount = Math.min(MAX_SEEDS - artistCount, seedTrackIds.current.length);

                if (artistCount > 0) {
                    params.seed_artists = sample(seedArtistIds.current, artistCount).join(',');
                }
                if (trackCount > 0) {
                    params.seed_tracks = sample(seedTrackIds.current, trackCount).join(',');
                }
            } else {
                params.seed_genres = sample(FALLBACK_GENRES, MAX_SEEDS).join(',');
            }

            const response = await spotify.getRecommendations(params);
            const fresh = (response.tracks || []).filter(track => {
                if (!track || !track.id || seenIds.current.has(track.id)) return false;
                seenIds.current.add(track.id);
                return true;
            });

            emptyStreakRef.current = fresh.length > 0 ? 0 : emptyStreakRef.current + 1;
            setQueue(prev => [...prev, ...fresh]);
            setFetchError('');
        } catch (err) {
            if (isAuthError(err)) {
                onAuthError?.();
            } else {
                console.error('Failed to fetch recommendations', err);
                setFetchError('Could not load recommendations from Spotify.');
            }
        } finally {
            fetchingRef.current = false;
            setInitializing(false);
        }
    }, [onAuthError]);

    // One-time setup: pull a broad pool of top artists/tracks to seed recommendations from.
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        Promise.all([
            spotify.getMyTopArtists({ limit: 50 }).catch(() => ({ items: [] })),
            spotify.getMyTopTracks({ limit: 50 }).catch(() => ({ items: [] })),
        ]).then(([artists, tracks]) => {
            seedArtistIds.current = getArtistIds(artists.items || []);
            seedTrackIds.current = getTrackIds(tracks.items || []);
            fetchBatch();
        });
    }, [fetchBatch]);

    // Keep the queue topped up as the user swipes through it. Backs off (and
    // eventually stops) if Spotify keeps returning nothing new, so a genuinely
    // exhausted recommendation pool doesn't turn into a request-spam loop.
    useEffect(() => {
        if (initializing) return;
        if (queue.length >= REFILL_THRESHOLD) return;
        if (emptyStreakRef.current >= MAX_EMPTY_STREAK) return;

        const delay = emptyStreakRef.current > 0 ? EMPTY_STREAK_BACKOFF_MS : 0;
        const timer = setTimeout(() => fetchBatch(), delay);
        return () => clearTimeout(timer);
    }, [queue, initializing, fetchBatch]);

    useEffect(() => {
        if (!saveError) return;
        const timer = setTimeout(() => setSaveError(''), 3000);
        return () => clearTimeout(timer);
    }, [saveError]);

    // Pops the current track off the front of the queue, optionally saving it
    // to the user's Liked Songs first.
    const advance = useCallback((liked) => {
        setQueue(prev => {
            const [current, ...rest] = prev;
            if (liked && current) {
                spotify.addToMySavedTracks([current.id]).catch(err => {
                    if (isAuthError(err)) {
                        onAuthError?.();
                    } else {
                        console.error('Failed to save track', err);
                        setSaveError("Couldn't save that song — check your connection.");
                    }
                });
            }
            return rest;
        });
    }, [onAuthError]);

    const retry = useCallback(() => {
        emptyStreakRef.current = 0;
        setFetchError('');
        fetchBatch();
    }, [fetchBatch]);

    return {
        current: queue[0] || null,
        upNext: queue[1] || null,
        initializing,
        fetchError,
        saveError,
        advance,
        retry,
    };
}
