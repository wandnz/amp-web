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

    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        urlbase: API_URL + "/_graph/amp-traceroute/" + this.streams[0],
        event_urlbase: API_URL + "/_event/amp-traceroute/" + this.streams[0],
        miny: 0,
        ylabel: "Hops to Destination",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
