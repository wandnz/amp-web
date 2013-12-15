importScripts('/static/scripts/lib/dagre.min.js');
importScripts('/static/scripts/lib/TracerouteDigraph.js');

self.onmessage = function(event) {
    var graphData = event.data.data,
        start = event.data.start,
        end = event.data.end;

    var paths = TracerouteDigraph.prototype.createPaths(graphData, start, end);

    if ( event.data.createDigraph ) {
        var digraph = TracerouteDigraph.prototype.drawDigraph(paths);
        postMessage({ paths: paths, digraph: digraph });
    } else {
        postMessage({ paths: paths });
    }
}