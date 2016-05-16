/*
 * This script is loaded directly as a web worker, which means it isn't
 * included in the main page and doesn't have easy access to constants
 * such as STATIC_URL. Instead we will load the scripts we need using
 * relative links so that they continue to work when ampweb is installed
 * in a non-standard location.
 */
importScripts('../lib/dagre.min.js');
importScripts('tracemap-common.js');

self.onmessage = function(event) {
    var graphData = event.data.data,
        start = event.data.start,
        end = event.data.end;

    var paths = createPaths(graphData, start, end);

    if ( event.data.createDigraph ) {
        var digraph = drawDigraph(paths);
        postMessage({ paths: paths, digraph: digraph });
    } else {
        postMessage({ paths: paths });
    }
}
