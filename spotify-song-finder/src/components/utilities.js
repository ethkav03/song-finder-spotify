export function getArtistIds(artists) {
    return artists.map(artist => artist.id);
}

export function getTrackIds(songs) {
    return songs.map(song => song.id);
}

export function getTop5Genres(artists) {

    let allGenres = artists.map(artist => artist.genres).flat(2);

    let sortedGenres = sortByFrequency(allGenres);

    // console.log(sortedGenres);
    return sortedGenres.slice(0, 5);
}

function sortByFrequency(arr) {
    // Create a frequency map
    const frequencyMap = {};
    arr.forEach(item => {
      frequencyMap[item] = (frequencyMap[item] || 0) + 1;
    });
  
    // Sort the array based on the frequency map
    let sortedArr = arr.sort((a, b) => {
      const freqDiff = frequencyMap[b] - frequencyMap[a];
      // If frequencies are the same, sort by the value
      return freqDiff === 0 ? a - b : freqDiff;
    });

    return sortedArr.filter((item, index) => arr.indexOf(item) === index);
  }