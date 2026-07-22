import React, { useEffect, useRef, useState } from 'react';
import SwipeCard from './SwipeCard.jsx';
import useSwipeQueue from '../../hooks/useSwipeQueue.js';
import useEmbedPreviewPlayer from '../../hooks/useEmbedPreviewPlayer.js';
import '../css/SwipeDeck.css';

function SwipeDeck({ onAuthError }) {
    const { current, upNext, initializing, fetchError, saveError, advance, retry } = useSwipeQueue({ onAuthError });
    const topCardRef = useRef(null);

    // Callback ref (not a plain useRef) so the hook re-derives loadAndPlay
    // once React actually attaches the DOM node, instead of capturing null.
    const [embedContainer, setEmbedContainer] = useState(null);
    const { loadAndPlay, pause } = useEmbedPreviewPlayer(embedContainer);

    // Play each new card's track as it becomes the front card.
    useEffect(() => {
        if (current?.id) {
            loadAndPlay(current.id);
        } else {
            pause();
        }
    }, [current?.id, loadAndPlay, pause]);

    useEffect(() => pause, [pause]);

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

            <div ref={setEmbedContainer} className="swipe-deck__embed" />
        </div>
    );
}

export default SwipeDeck;
