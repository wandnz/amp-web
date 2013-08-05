function RRDMuninbytesGraph() {
    NNTSCGraph.call(this);
    this.colname = "rrd-muninbytes";
}

RRDMuninbytesGraph.prototype = new NNTSCGraph();
RRDMuninbytesGraph.prototype.constructor = RRDMuninbytesGraph;

RRDMuninbytesGraph.prototype.initDropdowns = function() {
    this.dropdowns = new MuninDropdown();
}

RRDMuninbytesGraph.prototype.drawGraph = function() {
    BasicTimeSeries({
        container: $("#graph"),
        start: this.starttime * 1000,
        end: this.endtime * 1000,
        generalstart: this.generalstart * 1000,
        generalend: this.generalend * 1000,
        urlbase: API_URL + "/_graph/rrd-muninbytes/" + this.stream,
        event_urlbase: API_URL + "/_event/rrd-muninbytes/" + this.stream,
        xticlabels: this.generateSummaryXTics(),
        miny: 0,
        ylabel: "Mbps",
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
