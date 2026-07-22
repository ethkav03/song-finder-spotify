import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import '../css/SwipeCard.css';

const SWIPE_THRESHOLD = 100;
const EXIT_DISTANCE = 600;

// A single draggable recommendation card. Only the top card in the deck is
// interactive (isTop); parent components can also trigger a swipe
// programmatically (e.g. from Like/Nope buttons) via the forwarded ref.
const SwipeCard = forwardRef(function SwipeCard({ track, isTop, onExit }, ref) {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    // Starts true so a card promoted from "behind" to "top" eases into the
    // centered position instead of snapping there instantly.
    const [animated, setAnimated] = useState(true);
    const [exiting, setExiting] = useState(null);
    const dragOrigin = useRef(null);
    const posRef = useRef(pos);
    posRef.current = pos;

    const startExit = (direction) => {
        setAnimated(true);
        setExiting(direction);
        setPos(p => ({ x: direction === 'right' ? EXIT_DISTANCE : -EXIT_DISTANCE, y: p.y }));
    };

    useImperativeHandle(ref, () => ({
        swipe: (direction) => {
            if (exiting) return;
            startExit(direction);
        },
    }));

    const handlePointerDown = (e) => {
        if (!isTop || exiting) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragOrigin.current = { x: e.clientX, y: e.clientY };
        setAnimated(false);
    };

    const handlePointerMove = (e) => {
        if (!dragOrigin.current || exiting) return;
        setPos({
            x: e.clientX - dragOrigin.current.x,
            y: e.clientY - dragOrigin.current.y,
        });
    };

    const endDrag = () => {
        if (!dragOrigin.current || exiting) return;
        dragOrigin.current = null;

        if (Math.abs(posRef.current.x) > SWIPE_THRESHOLD) {
            startExit(posRef.current.x > 0 ? 'right' : 'left');
        } else {
            setAnimated(true);
            setPos({ x: 0, y: 0 });
        }
    };

    const handleTransitionEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        if (exiting) onExit(exiting);
    };

    const topStyle = isTop
        ? {
            transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x / 20}deg)`,
            transition: animated ? 'transform 0.35s ease, opacity 0.35s ease' : 'none',
            opacity: exiting ? 0 : 1,
        }
        : undefined;

    const likeOpacity = Math.min(Math.max(pos.x / SWIPE_THRESHOLD, 0), 1);
    const nopeOpacity = Math.min(Math.max(-pos.x / SWIPE_THRESHOLD, 0), 1);
    const artUrl = track.album?.images?.[0]?.url;

    return (
        <div
            className={`swipe-card ${isTop ? 'swipe-card--top' : 'swipe-card--behind'}`}
            style={topStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onTransitionEnd={handleTransitionEnd}
        >
            {isTop && (
                <>
                    <span className="swipe-card__stamp swipe-card__stamp--like" style={{ opacity: likeOpacity }}>LIKE</span>
                    <span className="swipe-card__stamp swipe-card__stamp--nope" style={{ opacity: nopeOpacity }}>NOPE</span>
                </>
            )}

            <div className="swipe-card__art">
                {artUrl
                    ? <img src={artUrl} alt={track.name} draggable={false} />
                    : <div className="swipe-card__art-placeholder">♪</div>}
            </div>

            <div className="swipe-card__info">
                <h2>{track.name}</h2>
                <p>{track.artists.map(artist => artist.name).join(', ')}</p>
                <p className="swipe-card__album">{track.album?.name}</p>
            </div>
        </div>
    );
});

export default SwipeCard;
