
var graphObject = undefined;
var graphCollection = undefined;
var stream_mappings = new Array();

/* Internal functions for avoiding code duplication */
function splitURL() {
    var url = $(location).attr('href').toString();
    url = url.replace("#", "");
    var urlparts = url.split("graph")[1].split("/");
    /* Get rid of leading blank */
    urlparts.splice(0, 1);

    return urlparts;
}

function createGraphObject(collection) {
    switch(collection) {
        case "rrd-smokeping":
            graphObject = new RRDSmokepingGraph();
            break;
        case "rrd-muninbytes":
            graphObject = new RRDMuninbytesGraph();
            break;
        case "lpi-bytes":
            graphObject = new LPIBytesGraph();
            break;
        case "lpi-flows":
            graphObject = new LPIFlowsGraph();
            break;
        case "lpi-packets":
            graphObject = new LPIPacketsGraph();
            break;
        case "lpi-users":
            graphObject = new LPIUsersGraph();
            break;
        case "amp-icmp":
            graphObject = new AmpIcmpGraph();
            break;
        case "amp-traceroute":
            graphObject = new AmpTracerouteGraph();
            break;
    }
    graphCollection = collection;
}

/* Functions called by dropdowns to change the current graph state */
function changeGraph(params) {
    if (params.graph != graphCollection) {
        var prevselection = graphObject.getCurrentSelection();
        createGraphObject(params.graph);
        graphObject.updateSelection(prevselection);
        graphObject.placeDropdowns(params.stream);
    }
    graphObject.changeStream(params.stream);
    saveDropdownState();
    graphObject.updatePageURL(true);
}

function changeCollection(newcol) {
    document.location.href = GRAPH_URL + "/" + newcol;
}

function updateSelectionTimes(newtimes) {
    graphObject.updateSelection(newtimes);
    graphObject.updatePageURL(false);
}

/* Callback function used by all dropdowns when a selection is made */
function dropdownCallback(selection, collection) {
    graphObject.dropdownCallback(selection);
}

function zoomButtonCallback(zoom) {
    graphObject.updateZoomLevel(zoom);
}

function saveDropdownState() {
    var stream = graphObject.getCurrentStream();

    if (stream == "-1" || stream == "")
        return;

    var key = "strm" + stream;
    var dropstate = graphObject.getDropdownState();
    stream_mappings[key] = dropstate;
}

function revertDropdownState() {
    var stream = graphObject.getCurrentStream();
    if (stream == "-1" || stream == "")
        return;

    var key = "strm" + stream;
    var state = stream_mappings[key];

    graphObject.setDropdownState(state);
}

/*
 * This is called whenever the graph page is first loaded. As such, it needs
 * to extract any user-provided info from the URL and then render the page
 * components appropriately.
 */
$(document).ready(function() {
    /* Solves problem of no slash on the end of the url */
        /* Only a problem with Hashbangs */
    startHistory(window);

    if ($(location).attr("href").slice(-5) == "graph") {
        window.location = "/graph/";
    }

    var urlparts = splitURL();
    createGraphObject(urlparts[0]);
    
    graphObject.decomposeURL(urlparts);
    graphObject.placeDropdowns();
    graphObject.changeStream(graphObject.getCurrentStream());
    graphObject.updateTitle();

});

/* If the user clicks the back or forward buttons, we want to return them
 * to that previous view as best we can */
window.addEventListener('popstate', function(event) {
    var urlparts = splitURL();

    if (urlparts[0] != graphCollection) {
        createGraphObject(urlparts[0]);
        graphObject.decomposeURL(urlparts);
        graphObject.placeDropdowns();
    } else {
        graphObject.decomposeURL(urlparts);
    }

    revertDropdownState();
    graphObject.changeStream(graphObject.getCurrentStream());

});


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
