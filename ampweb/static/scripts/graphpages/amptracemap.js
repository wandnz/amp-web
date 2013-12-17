function AmpTracerouteMapPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.graphstyle = "amp-traceroute";
    this.generictitle = "Cuz - AMP Traceroute Maps";
    this.modal = new AmpTracerouteModal();
}

AmpTracerouteMapPage.prototype = new CuzGraphPage();
AmpTracerouteMapPage.prototype.constructor = AmpTracerouteMapPage;

AmpTracerouteMapPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new AmpTracerouteMapDropdown(stream);
}

AmpTracerouteMapPage.prototype.getTabs = function() {
    return [ 
        { 'collection': 'amp-tracemap', 'modifier': 'none', 
          'title': 'Network Map', 'selected':true }
    ];
}

AmpTracerouteMapPage.prototype.drawGraph = function(start, end, first, legend) {

    this.graph = new TracerouteMap({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-tracemap/",
        event_urlbase: API_URL + "/_event/amp-tracemap/"
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
