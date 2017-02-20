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
};

AmpHttpGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new HttpGraph({
        container: $('#graph '),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [{id: this.view}],
        urlbase: API_URL + "/_view/amp-http/",
        event_urlbase: API_URL + "/_event/amp-http/",
        miny: 0,
        units: "secs",
        ylabel: "Duration (Seconds)"
    });

    this.graph.createGraphs();
};

function AmpHttpPageSizeGraphPage(style) {

    CuzGraphPage.call(this);
    this.colname = "amp-http";
    this.graphstyle = "amp-httppagesize";
    this.generictitle = "AMP HTTP Page Size Graphs";
    this.modal = new AmpHttpModal(style);
}

AmpHttpPageSizeGraphPage.prototype = new CuzGraphPage();
AmpHttpPageSizeGraphPage.prototype.constructor = AmpHttpPageSizeGraphPage;

AmpHttpPageSizeGraphPage.prototype.getTabs = function() {
    return [];
};

AmpHttpPageSizeGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $('#graph '),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [{id: this.view}],
        urlbase: API_URL + "/_view/amp-httppagesize/",
        event_urlbase: API_URL + "/_event/amp-http/",
        miny: 0,
        units: "KBs",
        ylabel: "Page Size (KBs)"
    });

    this.graph.createGraphs();
};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
