function RRDMuninbytesGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "rrd-muninbytes";
    this.generictitle = "Cuz - Munin Byte Count Graphs";
}

RRDMuninbytesGraphPage.prototype = new CuzGraphPage();
RRDMuninbytesGraphPage.prototype.constructor = RRDMuninbytesGraphPage;

RRDMuninbytesGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new MuninDropdown(stream);
}

RRDMuninbytesGraphPage.prototype.drawGraph = function(start, end, first) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end ,
        firstts: first,
        lines: this.streams,
        urlbase: API_URL + "/_graph/rrd-muninbytes/",
        event_urlbase: API_URL + "/_event/rrd-muninbytes/",
        miny: 0,
        ylabel: "Mbps",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
