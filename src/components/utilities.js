export function getArtistIds(artists) {
    return artists.map(artist => artist.id);
}

export function getTrackIds(tracks) {
    return tracks.map(track => track.id);
}
