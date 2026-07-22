import { useCallback, useEffect, useRef, useState } from 'react';
import { spotify, saveTrack } from '../spotify';

// Spotify shut down /v1/recommendations (and audio-features/related-artists)
// for apps without special "extended access" approval, which a personal
// project realistically can't get. So instead of asking Spotify to generate
// recommendations for us, we build our own feed by searching the catalog
// using the genres and artists the listener already favors.
const BATCH_SIZE = 40;
const REFILL_THRESHOLD = 3;
const MAX_EMPTY_STREAK = 3;
const EMPTY_STREAK_BACKOFF_MS = 1500;
const MAX_SEARCH_OFFSET = 200;
const GENRE_QUERY_CHANCE = 0.6;

// Used when a listener has no top artists yet (brand new account).
const FALLBACK_GENRES = ['pop', 'rock', 'hip-hop', 'indie', 'electronic'];

function sample(pool, count) {
    if (pool.length <= count) return pool;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function isAuthError(err) {
    return err?.status === 401 || err?.xhr?.status === 401;
}

// Manages a continuously-refilling queue of tracks pulled from the catalog
// search, deduplicated against everything already shown this session.
export default function useSwipeQueue({ onAuthError } = {}) {
    const [queue, setQueue] = useState([]);
    const [initializing, setInitializing] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [saveError, setSaveError] = useState('');

    const seenIds = useRef(new Set());
    const genrePool = useRef([]);
    const artistPool = useRef([]);
    const fetchingRef = useRef(false);
    const initializedRef = useRef(false);
    const emptyStreakRef = useRef(0);

    const buildQuery = useCallback(() => {
        const genres = genrePool.current.length > 0 ? genrePool.current : FALLBACK_GENRES;
        const useGenre = artistPool.current.length === 0 || Math.random() < GENRE_QUERY_CHANCE;

        if (useGenre) {
            return `genre:"${sample(genres, 1)[0]}"`;
        }
        return `artist:"${sample(artistPool.current, 1)[0]}"`;
    }, []);

    const fetchBatch = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            const response = await spotify.searchTracks(buildQuery(), {
                limit: BATCH_SIZE,
                offset: Math.floor(Math.random() * MAX_SEARCH_OFFSET),
            });

            const fresh = (response.tracks?.items || []).filter(track => {
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
                console.error('Failed to fetch tracks', err);
                setFetchError('Could not load songs from Spotify.');
            }
        } finally {
            fetchingRef.current = false;
            setInitializing(false);
        }
    }, [buildQuery, onAuthError]);

    // One-time setup: pull the listener's top artists to build genre/artist pools to search from.
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        spotify.getMyTopArtists({ limit: 50 })
            .catch(() => ({ items: [] }))
            .then((artists) => {
                const topArtists = artists.items || [];
                artistPool.current = topArtists.map(a => a.name).filter(Boolean);
                genrePool.current = Array.from(new Set(topArtists.flatMap(a => a.genres || [])));
                fetchBatch();
            });
    }, [fetchBatch]);

    // Keep the queue topped up as the user swipes through it. Backs off (and
    // eventually stops) if Spotify keeps returning nothing new, so a genuinely
    // exhausted search query doesn't turn into a request-spam loop.
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
        const timer = setTimeout(() => setSaveError(''), 6000);
        return () => clearTimeout(timer);
    }, [saveError]);

    // Pops the current track off the front of the queue, optionally saving it
    // to the user's Liked Songs first.
    const advance = useCallback((liked) => {
        setQueue(prev => {
            const [current, ...rest] = prev;
            if (liked && current) {
                saveTrack(current.id).catch(err => {
                    if (isAuthError(err)) {
                        onAuthError?.();
                    } else {
                        console.error('Failed to save track', err);
                        setSaveError(`Couldn't save "${current.name}": ${err.message}`);
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
