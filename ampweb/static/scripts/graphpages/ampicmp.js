function AmpIcmpGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-icmp";
    this.graphstyle = "amp-icmp";
    this.generictitle = "Cuz - AMP ICMP Graphs";
    this.modal = new AmpIcmpModal();
}

AmpIcmpGraphPage.prototype = new CuzGraphPage();
AmpIcmpGraphPage.prototype.constructor = AmpIcmpGraphPage;

AmpIcmpGraphPage.prototype.getTabs = function() {
    return [ 
        { 'graphstyle': 'amp-icmp',
          'title': 'Latency', 'selected':true },
        { 'graphstyle': 'amp-traceroute',
          'title': 'Hop Count', 'selected':false },
        { 'graphstyle': 'amp-traceroute-map',
          'title': 'Network Map', 'selected': false },
        /*
        { 'graphstyle': 'amp-traceroute-rainbow',
          'title': 'Path', 'selected':false },
        { 'collection': 'amp-dns', 'modifier': 'none',
          'title': 'DNS', 'selected': false },
        */
    ];
}


AmpIcmpGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-icmp/full/",
        event_urlbase: API_URL + "/_event/amp-icmp/",
        miny: 0,
        ylabel: "Latency (ms)",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
