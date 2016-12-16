function RRDMuninbytesGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "rrd-muninbytes";
    this.graphstyle = "rrd-muninbytes";
    this.generictitle = "Munin Byte Count Graphs";
    this.modal = new MuninBytesModal();
}

RRDMuninbytesGraphPage.prototype = new CuzGraphPage();
RRDMuninbytesGraphPage.prototype.constructor = RRDMuninbytesGraphPage;

RRDMuninbytesGraphPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'rrd-muninbytes',
          'title': 'Bytes', 'selected':true}
    ];
}

RRDMuninbytesGraphPage.prototype.drawGraph = function(start, end, first, legenddata) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end ,
        firstts: first,
        legenddata: legenddata,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/rrd-muninbytes/",
        event_urlbase: API_URL + "/_event/rrd-muninbytes/",
        miny: 0,
        units: "Mbps",
        ylabel: "Mbps"
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
