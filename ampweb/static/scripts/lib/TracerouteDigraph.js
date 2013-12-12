TracerouteDigraph.prototype = new dagre.Digraph();
TracerouteDigraph.prototype.constructor = dagre.Digraph;

TracerouteDigraph.prototype.node = function(u, value) {
    var node = this._nodes[u];
    if (arguments.length === 1) {
        return node.value;
    }
    node.value = value;
};