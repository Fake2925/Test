/**
 * Nuvio Provider for RogMovies (https://rogmovies.rest/)
 * Pre-formatted for Hermes runtime (No build script required)
 */

function getTMDBDetails(tmdbId, mediaType) {
    var url = 'https://api.themoviedb.org/3/' + mediaType + '/' + tmdbId + '?api_key=2d65dcb0f7797a7a59f5b61b4a8e29a3';
    return fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            return {
                title: data.title || data.name,
                year: (data.release_date || data.first_air_date || '').split('-')[0]
            };
        })
        .catch(function(err) {
            console.error("Failed to fetch TMDB details:", err);
            return null;
        });
}

function getStreams(tmdbId, mediaType, season, episode) {
    return getTMDBDetails(tmdbId, mediaType).then(function(details) {
        if (!details || !details.title) return [];

        var searchQuery = mediaType === 'tv'
            ? details.title + ' S' + String(season).padStart(2, '0')
            : details.title + ' ' + details.year;

        var searchUrl = 'https://rogmovies.rest/?s=' + encodeURIComponent(searchQuery);

        return fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        })
        .then(function(res) { return res.text(); })
        .then(function(htmlText) {
            var postLinkRegex = /<h[23][^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
            var match;
            var matchingPosts = [];

            while ((match = postLinkRegex.exec(htmlText)) !== null) {
                matchingPosts.push({ url: match[1], title: match[2] });
            }

            if (matchingPosts.length === 0) return [];

            return fetch(matchingPosts[0].url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            })
            .then(function(res) { return res.text(); })
            .then(function(postHtml) {
                var streams = [];
                var linkRegex = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
                var linkMatch;

                while ((linkMatch = linkRegex.exec(postHtml)) !== null) {
                    var href = linkMatch[1];
                    var text = linkMatch[2].replace(/<[^>]*>?/gm, '').trim();

                    if (
                        href.includes('gofile.io') ||
                        href.includes('pixeldrain') ||
                        href.includes('drive.google') ||
                        href.includes('hubdrive') ||
                        href.includes('vflix') ||
                        text.match(/480p|720p|1080p|4K|HEVC|HDR/i)
                    ) {
                        var quality = '1080p';
                        if (/480p/i.test(text)) quality = '480p';
                        else if (/720p/i.test(text)) quality = '720p';
                        else if (/1080p/i.test(text)) quality = '1080p';
                        else if (/4K|2160p/i.test(text)) quality = '4K';

                        streams.push({
                            name: "RogMovies",
                            title: details.title + ' (' + (text || quality) + ')',
                            url: href,
                            quality: quality,
                            headers: { 'User-Agent': 'Mozilla/5.0' }
                        });
                    }
                }
                return streams;
            });
        });
    }).catch(function(err) {
        console.error("Error scraping RogMovies:", error);
        return [];
    });
}

