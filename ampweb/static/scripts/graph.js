
var graphPage = undefined;
var graphCollection = undefined;
var stream_mappings = new Array();
var currentstream = "";

/* Internal functions for avoiding code duplication */
function splitURL() {
    var url = $(location).attr('href').toString();
    url = url.replace("#", "");
    var urlparts = url.split("graph")[1].split("/");
    /* Get rid of leading blank */
    urlparts.splice(0, 1);

    return urlparts;
}

function decomposeURL(url) {
    var urlparts = splitURL();
    var urlobj = {};

    for (var i = 0; i <= 4; i++) {
        urlparts.push("");
    }

    urlobj.collection = urlparts[0];
    urlobj.stream = urlparts[1];
    
    if (urlparts[2] == "") {
        urlobj.sumscale = 30;
    } else {
        urlobj.sumscale = urlparts[2];
    }

    if (urlparts[3] == "") {
        urlobj.starttime = null;
    } else {
        urlobj.starttime = parseInt(urlparts[3]);
    }

    if (urlparts[4] == "") {
        urlobj.endtime = null;
    } else {
        urlobj.endtime = parseInt(urlparts[4]);
    }
    
    return urlobj;

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
    var selected = graphPage.getCurrentSelection();    
    var start = null;
    var end = null;

    if (selected != null) {
        start = selected.start;
        end = selected.end;
    }
    
    if (params.graph != graphCollection) {
        createGraphPage(params.graph);
        graphPage.placeDropdowns(params.stream);
    }
    currentstream = params.stream;
    graphPage.changeStream(params.stream, start, end);
    saveDropdownState();
    updatePageURL(true);
}

function setTitle(newtitle) {
    /* Despite appearances, the title argument of 
     * History.replaceState isn't guaranteed to have any effect on 
     * the current page title so we have to explicitly set the 
     * page title */
    document.getElementsByTagName('title')[0].innerHTML=newtitle;

    /* Change the current entry in the History to match new title */
    History.replaceState(History.getState().data, newtitle,
            History.getState().url);
 
}

function updatePageURL(changedGraph) {
    var selected = graphPage.getCurrentSelection();   
    var base = $(location).attr('href').toString().split("graph")[0] +
            "graph/";
    var newurl = base + graphCollection + "/" + currentstream + "/";
    var start = null;
    var end = null;

    if (selected != null) {
        start = selected.start;
        end = selected.end;
    }

    if (start != null && end != null) {
        newurl += "30/" + start + "/" + end;
    }

    /* If this function has been called as a result of the graph showing a
     * different stream (e.g. the user has selected a new stream via the
     * dropdowns), we need to push a new History entry and generate a new
     * title.
     */
    if (changedGraph) {
        History.pushState(null, "CUZ - Loading", newurl);
        graphPage.updateTitle();
    } else {
        /* Otherwise, just replace the existing URL with the new one */
        History.replaceState(History.getState().data,
                History.getState().title, newurl);
    }
}

/* Callback function used by all dropdowns when a selection is made */
function dropdownCallback(selection, collection) {
    graphPage.dropdownCallback(selection);
}

function saveDropdownState() {
    var stream = currentstream;

    if (stream == "-1" || stream == "")
        return;

    var key = "strm" + stream;
    var dropstate = graphPage.getDropdownState();
    stream_mappings[key] = dropstate;
}

function revertDropdownState() {
    var stream = currentstream;
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

    var urlparts = decomposeURL();
    createGraphPage(urlparts.collection);
    currentstream = urlparts.stream;

    graphPage.changeStream(currentstream, urlparts.starttime, urlparts.endtime);
    graphPage.placeDropdowns();
    graphPage.updateTitle();

});

/* If the user clicks the back or forward buttons, we want to return them
 * to that previous view as best we can */
window.addEventListener('popstate', function(event) {
    var urlparts = decomposeURL();

    if (urlparts.collection != graphCollection) {
        createGraphPage(urlparts.collection);
        currentstream = urlparts.stream;
        graphPage.placeDropdowns();
    } else {
        currentstream = urlparts.stream;
        revertDropdownState();
    }

    graphPage.changeStream(currentstream, urlparts.starttime, urlparts.endtime);

});


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
