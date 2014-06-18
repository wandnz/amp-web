function AmpThroughputGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-throughput";
    this.graphstyle = "amp-throughput";
    this.generictitle = "AMP Throughput Graphs";
    this.modal = new AmpThroughputModal();

}

AmpThroughputGraphPage.prototype = new CuzGraphPage();
AmpThroughputGraphPage.prototype.constructor = AmpThroughputGraphPage;

AmpThroughputGraphPage.prototype.getTabs = function() {
    return [
        {'graphstyle':'amp-throughput',
         'title': 'Throughput', 'selected':true}
    ];
}

AmpThroughputGraphPage.prototype.drawGraph = function(start, end, first, 
        legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/amp-throughput/",
        event_urlbase: API_URL + "/_event/amp-throughput/",
        miny: 0,
        ylabel: "Mbps"
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
