function LPIBytesGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-bytes";
    this.graphstyle = "lpi-bytes";
    this.generictitle = "LPI Bytes Graphs";
    this.modal = new LPIBytesModal();
}

LPIBytesGraphPage.prototype = new CuzGraphPage();
LPIBytesGraphPage.prototype.constructor = LPIBytesGraphPage;

LPIBytesGraphPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'lpi-bytes', 
          'title': 'Bytes', 'selected':true},
        { 'graphstyle': 'lpi-packets', 
          'title': 'Packets', 'selected':false},
        { 'graphstyle': 'lpi-flows', 
          'title': 'Flows', 'selected':false},
        { 'graphstyle': 'lpi-users', 
          'title': 'Users', 'selected':false}
    ];
}

LPIBytesGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend, 
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/lpi-bytes/",
        event_urlbase: API_URL + "/_event/lpi-bytes/",
        miny: 0,
        ylabel: "Mbps"
    });

    this.graph.createGraphs();
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
