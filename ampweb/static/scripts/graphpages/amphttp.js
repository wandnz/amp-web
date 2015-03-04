function AmpHttpGraphPage(style) {

    CuzGraphPage.call(this);
    this.colname = "amp-http";
    this.graphstyle = "amp-http";
    this.generictitle = "AMP HTTP Graphs";
    this.modal = new AmpHttpModal(style);

}

AmpHttpGraphPage.prototype = new CuzGraphPage();
AmpHttpGraphPage.prototype.constructor = AmpHttpGraphPage;

AmpHttpGraphPage.prototype.getTabs = function() {
    return [];
}

AmpHttpGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new HttpGraph({
        container: $('#graph '),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/amp-http/",
        event_urlbase: API_URL + "/_event/amp-http/",
        miny: 0,
        units: "secs",
        ylabel: "Duration (Seconds)"
    });


    this.graph.createGraphs();
}
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
