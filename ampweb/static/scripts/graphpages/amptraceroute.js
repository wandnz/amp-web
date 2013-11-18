function AmpTracerouteGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.generictitle = "Cuz - AMP Traceroute Graphs";
}

AmpTracerouteGraphPage.prototype = new CuzGraphPage();
AmpTracerouteGraphPage.prototype.constructor = AmpTracerouteGraphPage;

AmpTracerouteGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new AmpTracerouteDropdown(stream);
}

AmpTracerouteGraphPage.prototype.drawGraph = function(start, end, first) {

    // XXX Placeholder graph -- we should eventually replace this with
    // the nice rainbow traceroute graph

    this.graph = new RainbowGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        lines: this.streams,
        urlbase: API_URL + "/_graph/amp-traceroute/",
        event_urlbase: API_URL + "/_event/amp-traceroute/",
        miny: 0,
        ylabel: "Number of Hops"
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
