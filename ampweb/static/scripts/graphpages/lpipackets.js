function LPIPacketsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-packets";
    this.graphstyle = "lpi-packets";
    this.generictitle = "Cuz - LPI Packets Graphs";
}

LPIPacketsGraphPage.prototype = new CuzGraphPage();
LPIPacketsGraphPage.prototype.constructor = LPIPacketsGraphPage;

LPIPacketsGraphPage.prototype.getTabs = function() {
    return [
        { 'collection': 'lpi-bytes', 'modifier': 'none', 
          'title': 'Bytes', 'selected':false},
        { 'collection': 'lpi-packets', 'modifier': 'none', 
          'title': 'Packets', 'selected':true},
        { 'collection': 'lpi-flows', 'modifier': 'none', 
          'title': 'Flows', 'selected':false},
        { 'collection': 'lpi-users', 'modifier': 'none', 
          'title': 'Users', 'selected':false},
    ];
}   


LPIPacketsGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/lpi-packets/full/",
        event_urlbase: API_URL + "/_event/lpi-packets/",
        miny: 0,
        ylabel: "Packets",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
