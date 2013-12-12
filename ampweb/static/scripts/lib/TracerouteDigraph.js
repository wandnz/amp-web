function TracerouteDigraph() {
    dagre.Digraph.call(this);
}

TracerouteDigraph.prototype = new dagre.Digraph();
TracerouteDigraph.prototype.constructor = TracerouteDigraph;

TracerouteDigraph.prototype.node = function(u, value) {
    var node = this._nodes[u];
    if (arguments.length === 1) {
        return node.value;
    }
    node.value = value;
};