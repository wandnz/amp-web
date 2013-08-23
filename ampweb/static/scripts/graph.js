
var graphPage = undefined;
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

function createGraphPage(collection) {
    switch(collection) {
        case "rrd-smokeping":
            graphPage = new RRDSmokepingGraphPage();
            break;
        case "rrd-muninbytes":
            graphPage = new RRDMuninbytesGraphPage();
            break;
        case "lpi-bytes":
            graphPage = new LPIBytesGraphPage();
            break;
        case "lpi-flows":
            graphPage = new LPIFlowsGraphPage();
            break;
        case "lpi-packets":
            graphPage = new LPIPacketsGraphPage();
            break;
        case "lpi-users":
            graphPage = new LPIUsersGraphPage();
            break;
        case "amp-icmp":
            graphPage = new AmpIcmpGraphPage();
            break;
        case "amp-traceroute":
            graphPage = new AmpTracerouteGraphPage();
            break;
    }
    graphCollection = collection;
}

/* Functions called by dropdowns to change the current graph state */
function changeGraph(params) {
    if (params.graph != graphCollection) {
        var prevselection = graphPage.getCurrentSelection();
        createGraphPage(params.graph);
        graphPage.updateSelection(prevselection);
        graphPage.placeDropdowns(params.stream);
    }
    graphPage.changeStream(params.stream);
    saveDropdownState();
    graphPage.updatePageURL(true);
}

function updateSelectionTimes(newtimes) {
    graphPage.updateSelection(newtimes);
    graphPage.updatePageURL(false);
}

/* Callback function used by all dropdowns when a selection is made */
function dropdownCallback(selection, collection) {
    graphPage.dropdownCallback(selection);
}

function zoomButtonCallback(zoom) {
    graphPage.updateZoomLevel(zoom);
}

function saveDropdownState() {
    var stream = graphPage.getCurrentStream();

    if (stream == "-1" || stream == "")
        return;

    var key = "strm" + stream;
    var dropstate = graphPage.getDropdownState();
    stream_mappings[key] = dropstate;
}

function revertDropdownState() {
    var stream = graphPage.getCurrentStream();
    if (stream == "-1" || stream == "")
        return;

    var key = "strm" + stream;
    var state = stream_mappings[key];

    graphPage.setDropdownState(state);
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
    createGraphPage(urlparts[0]);
    
    graphPage.decomposeURL(urlparts);
    graphPage.placeDropdowns();
    graphPage.changeStream(graphPage.getCurrentStream());
    graphPage.updateTitle();

});

/* If the user clicks the back or forward buttons, we want to return them
 * to that previous view as best we can */
window.addEventListener('popstate', function(event) {
    var urlparts = splitURL();

    if (urlparts[0] != graphCollection) {
        createGraphPage(urlparts[0]);
        graphPage.decomposeURL(urlparts);
        graphPage.placeDropdowns();
    } else {
        graphPage.decomposeURL(urlparts);
    }

    revertDropdownState();
    graphPage.changeStream(graphPage.getCurrentStream());

});


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
