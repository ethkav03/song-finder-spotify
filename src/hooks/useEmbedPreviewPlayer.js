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
    const loadedUriRef = useRef(null);

    useEffect(() => {
        return () => {
            controllerRef.current?.destroy();
            controllerRef.current = null;
        };
    }, []);

    const loadAndPlay = useCallback((trackId) => {
        const uri = `spotify:track:${trackId}`;

        if (loadedUriRef.current === uri) {
            controllerRef.current?.play();
            return;
        }
        loadedUriRef.current = uri;

        if (controllerRef.current) {
            controllerRef.current.loadUri(uri);
            controllerRef.current.play();
            return;
        }

        if (creatingRef.current || !containerEl) return;
        creatingRef.current = true;

        loadIframeApi().then((IFrameAPI) => {
            // A newer track may have been requested while this was loading;
            // always create pointed at whatever's most current.
            const initialUri = loadedUriRef.current || uri;
            IFrameAPI.createController(
                containerEl,
                { uri: initialUri, width: '100%', height: '80' },
                (controller) => {
                    controllerRef.current = controller;
                    controller.addListener('playback_update', (e) => {
                        setIsPlaying(!e.data.isPaused && !e.data.isBuffering);
                    });
                    if (loadedUriRef.current !== initialUri) {
                        controller.loadUri(loadedUriRef.current);
                    }
                    controller.play();
                }
            );
        });
    }, [containerEl]);

    const pause = useCallback(() => controllerRef.current?.pause(), []);
    const togglePlay = useCallback(() => controllerRef.current?.togglePlay(), []);

    return { isPlaying, loadAndPlay, pause, togglePlay };
}
