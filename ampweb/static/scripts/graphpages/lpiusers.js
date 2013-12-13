function LPIUsersGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-users";
    this.graphstyle = "lpi-users";
    this.generictitle = "Cuz - LPI Users Graphs";
}

LPIUsersGraphPage.prototype = new CuzGraphPage();
LPIUsersGraphPage.prototype.constructor = LPIUsersGraphPage;

LPIUsersGraphPage.prototype.getTabs = function() {
    return [
        { 'collection': 'lpi-bytes', 'modifier': 'none', 'title': 'Bytes'},
        { 'collection': 'lpi-packets', 'modifier': 'none', 'title': 'Packets'},
        { 'collection': 'lpi-flows', 'modifier': 'new', 'title': 'Flows (New)'},
        { 'collection': 'lpi-flows', 'modifier': 'peak', 'title': 'Flows (Peak)'},
        { 'collection': 'lpi-users', 'modifier': 'active', 'title': 'Users (Active)'},
        { 'collection': 'lpi-users', 'modifier': 'observed', 'title':'Users (Observed)'},
    ];
}   


LPIUsersGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/lpi-users/full/",
        event_urlbase: API_URL + "/_event/lpi-users/",
        miny: 0,
        ylabel: "Users",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
