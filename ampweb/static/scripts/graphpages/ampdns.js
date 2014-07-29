function AmpDnsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-latency";
    this.graphstyle = "amp-dns";
    this.generictitle = "AMP DNS Graphs";
    this.modal = new AmpDnsModal();
}

AmpDnsGraphPage.prototype = new CuzGraphPage();
AmpDnsGraphPage.prototype.constructor = AmpDnsGraphPage;

AmpDnsGraphPage.prototype.getTabs = function() {

    return [
    /*
        { 'graphstyle': 'amp-dns',
          'title': 'DNS', 'selected': true }
    */
    ];


}

AmpDnsGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-latency/",
        event_urlbase: API_URL + "/_event/amp-latency/",
        miny: 0,
        ylabel: "Latency (ms)"
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
