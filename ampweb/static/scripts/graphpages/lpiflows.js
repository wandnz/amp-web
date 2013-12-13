function LPIFlowsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-flows";
    this.graphstyle = "lpi-flows";
    this.generictitle = "Cuz - LPI Flows Graphs";
}

LPIFlowsGraphPage.prototype = new CuzGraphPage();
LPIFlowsGraphPage.prototype.constructor = LPIFlowsGraphPage;

LPIFlowsGraphPage.prototype.getTabs = function() {
    return [
        { 'collection': 'lpi-bytes', 'modifier': 'none', 'title': 'Bytes'},
        { 'collection': 'lpi-packets', 'modifier': 'none', 'title': 'Packets'},
        { 'collection': 'lpi-flows', 'modifier': 'new', 'title': 'Flows (New)'},
        { 'collection': 'lpi-flows', 'modifier': 'peak', 'title': 'Flows (Peak)'},
        { 'collection': 'lpi-users', 'modifier': 'active', 'title': 'Users (Active)'},
        { 'collection': 'lpi-users', 'modifier': 'observed', 'title':'Users (Observed)'},
 
    ];
}   

LPIFlowsGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/lpi-flows/full/",
        event_urlbase: API_URL + "/_event/lpi-flows/",
        miny: 0,
        ylabel: "Flows",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
