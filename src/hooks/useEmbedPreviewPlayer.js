import { useCallback, useEffect, useRef, useState } from 'react';

const SCRIPT_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
let iframeApiPromise = null;

// Loads Spotify's embed IFrame API script once per page and resolves with
// the IFrameAPI object it hands to window.onSpotifyIframeApiReady.
function loadIframeApi() {
    if (iframeApiPromise) return iframeApiPromise;

    iframeApiPromise = new Promise((resolve) => {
        const previousReady = window.onSpotifyIframeApiReady;
        window.onSpotifyIframeApiReady = (IFrameAPI) => {
            previousReady?.(IFrameAPI);
            resolve(IFrameAPI);
        };

        if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
            const script = document.createElement('script');
            script.src = SCRIPT_SRC;
            script.async = true;
            document.body.appendChild(script);
        }
    });

    return iframeApiPromise;
}

// Plays tracks through Spotify's own embed player instead of the Web API's
// preview_url field, which Spotify has made unreliable (null for most
// tracks on most apps). The embed doesn't need any extra OAuth scope and
// works for free accounts too. containerEl is the DOM node the (visible,
// Spotify-branded) player widget gets mounted into.
export default function useEmbedPreviewPlayer(containerEl) {
    const [isPlaying, setIsPlaying] = useState(false);
    const controllerRef = useRef(null);
    const creatingRef = useRef(false);
    // What we currently want playing - updated immediately on every call.
    const desiredUriRef = useRef(null);
    // What the live controller (if any) is actually pointed at - only
    // updated once a URI has genuinely been handed to a real controller.
    const controllerUriRef = useRef(null);

    useEffect(() => {
        return () => {
            controllerRef.current?.destroy();
            controllerRef.current = null;
        };
    }, []);

    // Points the (already-created) controller at whatever's currently desired.
    const syncController = useCallback(() => {
        const controller = controllerRef.current;
        const uri = desiredUriRef.current;
        if (!controller || !uri) return;

        if (controllerUriRef.current !== uri) {
            controllerUriRef.current = uri;
            controller.loadUri(uri);
        }
        controller.play();
    }, []);

    const loadAndPlay = useCallback((trackId) => {
        desiredUriRef.current = `spotify:track:${trackId}`;

        if (controllerRef.current) {
            syncController();
            return;
        }

        // No container to mount into yet (e.g. the very first render, before
        // the callback ref attaches) - desiredUriRef is already up to date,
        // so whichever call finds a container ready will pick it up.
        if (creatingRef.current || !containerEl) return;
        creatingRef.current = true;

        loadIframeApi().then((IFrameAPI) => {
            IFrameAPI.createController(
                containerEl,
                { uri: desiredUriRef.current, width: '100%', height: '80' },
                (controller) => {
                    controllerRef.current = controller;
                    controllerUriRef.current = desiredUriRef.current;
                    controller.addListener('playback_update', (e) => {
                        setIsPlaying(!e.data.isPaused && !e.data.isBuffering);
                    });
                    // Picks up anything requested while the API/controller
                    // was still loading, since desiredUriRef is read fresh here.
                    syncController();
                }
            );
        });
    }, [containerEl, syncController]);

    const pause = useCallback(() => controllerRef.current?.pause(), []);
    const togglePlay = useCallback(() => controllerRef.current?.togglePlay(), []);

    return { isPlaying, loadAndPlay, pause, togglePlay };
}
