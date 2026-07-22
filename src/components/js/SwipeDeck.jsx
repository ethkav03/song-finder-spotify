import React, { useCallback, useEffect, useRef, useState } from 'react';
import SwipeCard from './SwipeCard.jsx';
import useSwipeQueue from '../../hooks/useSwipeQueue.js';
import '../css/SwipeDeck.css';

function SwipeDeck({ onAuthError }) {
    const { current, upNext, initializing, fetchError, saveError, advance, retry } = useSwipeQueue({ onAuthError });
    const topCardRef = useRef(null);
    const audioRef = useRef(null);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

    const stopPreview = useCallback(() => {
        audioRef.current?.pause();
        setIsPreviewPlaying(false);
    }, []);

    // Reset any playing preview whenever the front card changes.
    useEffect(() => {
        stopPreview();
    }, [current?.id, stopPreview]);

    useEffect(() => stopPreview, [stopPreview]);

    const togglePreview = () => {
        if (!current?.preview_url) return;

        if (!audioRef.current || audioRef.current.src !== current.preview_url) {
            audioRef.current?.pause();
            audioRef.current = new Audio(current.preview_url);
            audioRef.current.onended = () => setIsPreviewPlaying(false);
        }

        if (isPreviewPlaying) {
            audioRef.current.pause();
            setIsPreviewPlaying(false);
        } else {
            audioRef.current.play();
            setIsPreviewPlaying(true);
        }
    };

    const triggerSwipe = (direction) => {
        topCardRef.current?.swipe(direction);
    };

    const handleExit = (direction) => {
        advance(direction === 'right');
    };

    useEffect(() => {
        if (!current) return undefined;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') triggerSwipe('left');
            if (e.key === 'ArrowRight') triggerSwipe('right');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [current]);

    if (initializing) {
        return (
            <div className="swipe-deck swipe-deck--status">
                <p>Finding songs you might like…</p>
            </div>
        );
    }

    if (!current) {
        return (
            <div className="swipe-deck swipe-deck--status">
                <p>{fetchError || "You're all caught up — no more recommendations right now."}</p>
                <button className="swipe-deck__retry" onClick={retry}>Try again</button>
            </div>
        );
    }

    return (
        <div className="swipe-deck">
            {saveError && <div className="swipe-deck__banner">{saveError}</div>}

            <div className="swipe-deck__stack">
                {upNext && (
                    <SwipeCard key={upNext.id} track={upNext} isTop={false} onExit={() => {}} />
                )}
                <SwipeCard
                    key={current.id}
                    ref={topCardRef}
                    track={current}
                    isTop
                    onExit={handleExit}
                    isPreviewPlaying={isPreviewPlaying}
                    onTogglePreview={togglePreview}
                />
            </div>

            <div className="swipe-deck__actions">
                <button
                    className="swipe-deck__btn swipe-deck__btn--nope"
                    onClick={() => triggerSwipe('left')}
                    aria-label="Skip song"
                >
                    ✕
                </button>
                <button
                    className="swipe-deck__btn swipe-deck__btn--like"
                    onClick={() => triggerSwipe('right')}
                    aria-label="Like song"
                >
                    ♥
                </button>
            </div>
        </div>
    );
}

export default SwipeDeck;
