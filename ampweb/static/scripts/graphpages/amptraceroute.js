function AmpTracerouteGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.graphstyle = "amp-traceroute";
    this.generictitle = "Cuz - AMP Traceroute Graphs";
    this.modal = new AmpTracerouteModal();
}

function AmpTracerouteRainbowGraphPage() {
    AmpTracerouteGraphPage.call(this);
    this.graphstyle = "amp-traceroute-rainbow";
    this.modal = new AmpTracerouteRainbowModal();
}

function AmpTracerouteMapPage() {
    AmpTracerouteGraphPage.call(this);
    this.graphstyle = "amp-traceroute-map";
}


AmpTracerouteGraphPage.prototype = new CuzGraphPage();
AmpTracerouteGraphPage.prototype.constructor = AmpTracerouteGraphPage;

AmpTracerouteRainbowGraphPage.prototype = new AmpTracerouteGraphPage();
AmpTracerouteRainbowGraphPage.prototype.constructor = AmpTracerouteRainbowGraphPage;

AmpTracerouteMapPage.prototype = new AmpTracerouteGraphPage();
AmpTracerouteMapPage.prototype.constructor = AmpTracerouteMapPage;

AmpTracerouteGraphPage.prototype.getTabs = function(graphstyle) {
    graphstyle = graphstyle || this.graphstyle;
    return [ 
        {
            'graphstyle': 'amp-icmp',
            'title': 'Latency',
            'selected': graphstyle == "amp-icmp"
        },
        {
            'graphstyle': 'amp-traceroute',
            'title': 'Hop Count',
            'selected': graphstyle == "amp-traceroute"
        },
        {
            'graphstyle': 'amp-traceroute-rainbow',
            'title': 'Path',
            'selected': graphstyle == "amp-traceroute-rainbow"
        },
        {
            'graphstyle': 'amp-traceroute-map',
            'title': 'Network Map',
            'selected': graphstyle == "amp-traceroute-map"
        },
        /*
        {
            'collection': 'amp-dns',
            'title': 'DNS',
            'selected': graphstyle == "amp-dns"
        },
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
        ylabel: "Number of Hops",
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
