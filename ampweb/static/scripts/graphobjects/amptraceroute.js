function AmpTracerouteGraph() {
    NNTSCGraph.call(this);
    this.colname = "amp-traceroute";
}

AmpTracerouteGraph.prototype = new NNTSCGraph();
AmpTracerouteGraph.prototype.constructor = AmpTracerouteGraph;

AmpTracerouteGraph.prototype.initDropdowns = function(stream) {
    this.dropdowns = new AmpTracerouteDropdown(stream);
}

AmpTracerouteGraph.prototype.drawGraph = function() {

    // XXX Placeholder graph -- we should eventually replace this with
    // the nice rainbow traceroute graph

    BasicTimeSeries({
        container: $("#graph"),
        start: this.starttime * 1000,
        end: this.endtime * 1000,
        generalstart: this.generalstart * 1000,
        generalend: this.generalend * 1000,
        urlbase: API_URL + "/_graph/amp-traceroute/" + this.stream,
        event_urlbase: API_URL + "/_event/amp-traceroute/" + this.stream,
        xticlabels: this.generateSummaryXTics(),
        miny: 0,
        ylabel: "Hops to Destination",
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
