function AmpIcmpGraph() {
    NNTSCGraph.call(this);
    this.colname = "amp-icmp";
}

AmpIcmpGraph.prototype = new NNTSCGraph();
AmpIcmpGraph.prototype.constructor = AmpIcmpGraph;

AmpIcmpGraph.prototype.initDropdowns = function(stream) {
    this.dropdowns = new AmpIcmpDropdown(stream);
}

AmpIcmpGraph.prototype.drawGraph = function() {
    BasicTimeSeries({
        container: $("#graph"),
        start: this.starttime * 1000,
        end: this.endtime * 1000,
        generalstart: this.generalstart * 1000,
        generalend: this.generalend * 1000,
        urlbase: API_URL + "/_graph/amp-icmp/" + this.stream,
        event_urlbase: API_URL + "/_event/amp-icmp/" + this.stream,
        xticlabels: this.generateSummaryXTics(),
        miny: 0,
        ylabel: "Latency (ms)",
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
