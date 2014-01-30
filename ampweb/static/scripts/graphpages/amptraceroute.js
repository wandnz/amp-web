function AmpTracerouteGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.graphstyle = "amp-traceroute";
    this.generictitle = "AMP Traceroute Graphs";
    this.modal = new AmpTracerouteModal();
}

function AmpTracerouteRainbowGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.graphstyle = "amp-traceroute-rainbow";
    this.generictitle = "AMP Traceroute Graphs";
    this.modal = new AmpTracerouteRainbowModal();
}

function AmpTracerouteMapPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.graphstyle = "amp-traceroute-map";
    this.generictitle = "Cuz - AMP Traceroute Graphs";
    this.modal = new AmpTracerouteModal();
}


AmpTracerouteGraphPage.prototype = new CuzGraphPage();
AmpTracerouteGraphPage.prototype.constructor = AmpTracerouteGraphPage;

AmpTracerouteRainbowGraphPage.prototype = new CuzGraphPage();
AmpTracerouteRainbowGraphPage.prototype.constructor = AmpTracerouteRainbowGraphPage;

AmpTracerouteMapPage.prototype = new CuzGraphPage();
AmpTracerouteMapPage.prototype.constructor = AmpTracerouteMapPage;

AmpTracerouteGraphPage.prototype.getTabs = function() {
    return [ 
        { 'graphstyle': 'amp-icmp',
          'title': 'Latency', 'selected': false },
        { 'graphstyle': 'amp-traceroute',
          'title': 'Hop Count', 'selected': true },
        { 'graphstyle': 'amp-traceroute-map',
          'title': 'Network Map', 'selected': false }
        /*
        { 'graphstyle': 'amp-traceroute-rainbow',
          'title': 'Path', 'selected':false },
        { 'collection': 'amp-dns', 'modifier': 'none',
          'title': 'DNS', 'selected': false },
        */
    ];
}

AmpTracerouteRainbowGraphPage.prototype.getTabs = function() {
    return [ 
        { 'graphstyle': 'amp-traceroute-rainbow',
          'title': 'Path', 'selected': true}
        /*
        { 'graphstyle': 'amp-icmp',
          'title': 'Latency', 'selected': false },
        { 'graphstyle': 'amp-traceroute',
          'title': 'Hop Count', 'selected':false },
        { 'collection': 'amp-dns', 'modifier': 'none',
          'title': 'DNS', 'selected': false },
        */
    ];
}

AmpTracerouteMapPage.prototype.getTabs = function() {
    return [ 
        { 'graphstyle': 'amp-icmp',
          'title': 'Latency', 'selected': false },
        { 'graphstyle': 'amp-traceroute',
          'title': 'Hop Count', 'selected': false },
        { 'graphstyle': 'amp-traceroute-map',
          'title': 'Network Map', 'selected': true }
        /*
        { 'graphstyle': 'amp-traceroute-rainbow',
          'title': 'Path', 'selected':false },
        { 'collection': 'amp-dns', 'modifier': 'none',
          'title': 'DNS', 'selected': false },
        */
    ];
}

AmpTracerouteRainbowGraphPage.prototype.drawGraph = function(start, end,
        first, legend) {
    this.graph = new RainbowGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute/hops/",
        event_urlbase: API_URL + "/_event/amp-traceroute/",
        miny: 0,
        drawEventsBehind: false,
        ylabel: "Number of Hops",
        measureLatency: false,
        minHopHeight: 5
    });

    this.graph.createGraphs();
}

AmpTracerouteGraphPage.prototype.drawGraph = function(start, end, first,
        legend) {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute/full/",
        event_urlbase: API_URL + "/_event/amp-traceroute/",
        miny: 0,
        ylabel: "Number of Hops"
    });

    this.graph.createGraphs();
}

AmpTracerouteMapPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new TracerouteMap({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute/hops/",
        event_urlbase: API_URL + "/_event/amp-traceroute/"
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
