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
        { 'collection': 'lpi-bytes', 'modifier': 'none', 'title': 'Bytes'},
        { 'collection': 'lpi-packets', 'modifier': 'none', 'title': 'Packets'},
        { 'collection': 'lpi-flows', 'modifier': 'new', 'title': 'Flows (New)'},
        { 'collection': 'lpi-flows', 'modifier': 'peak', 'title': 'Flows (Peak)'},
        { 'collection': 'lpi-users', 'modifier': 'active', 'title': 'Users (Active)'},
        { 'collection': 'lpi-users', 'modifier': 'observed', 'title':'Users (Observed)'}, 
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
