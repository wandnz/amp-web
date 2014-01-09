function LPIUsersGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-users";
    this.graphstyle = "lpi-users";
    this.generictitle = "Cuz - LPI Users Graphs";
    this.modal = new LPIUsersModal();
}

LPIUsersGraphPage.prototype = new CuzGraphPage();
LPIUsersGraphPage.prototype.constructor = LPIUsersGraphPage;

LPIUsersGraphPage.prototype.getTabs = function() {
    return [
        { 'collection': 'lpi-bytes', 'graphstyle': 'lpi-bytes', 
          'title': 'Bytes', 'selected':false},
        { 'collection': 'lpi-packets', 'graphstyle': 'lpi-packets', 
          'title': 'Packets', 'selected':false},
        { 'collection': 'lpi-flows', 'graphstyle': 'lpi-flows', 
          'title': 'Flows', 'selected':false},
        { 'collection': 'lpi-users', 'graphstyle': 'lpi-users', 
          'title': 'Users', 'selected':true},
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
