/* Global Variables */
var source = "";  /* The source amplet */
var dest = "";  /* The destination amplet/site */
var graph = "";  /* Graph currently displayed */
var endtime = Math.round((new Date()).getTime() / 1000); /* End timestamp on the detail graph */
var starttime = endtime - (24 * 60 * 60);  /* Start timestamp of detail graph */
var generalstart = "";  /* The startime of the bottom graph */
var generalend = "";  /* The endtime of the bottom graph */
var ajax1;  /* Ajax Request 1 (Used to request the detailed data) */
var ajax2;  /* Ajax Request 2 (Used to request the summary data) */

/*
 * Variables for processed data. These need to be global so that data
 * can be passed from ajax function to ajax function.
 */
var x = [],
    y = [],
    detailData = [x, y],
    x2 = [],
    y2 = [],
    summaryData = [x2, y2],
    rawDetailData,
    rawSummaryData;


function changeGraph(input) {
    /* TODO move the styles to CSS */
    var graphStyle = "border: 3px solid #0F0F0F; " +
	"border-left: 1px solid white; " +
	"background-color: white;";

    /* If source + dest are not set, stop */
    if (source == "" || dest == "") {
        $("#graph").empty();
        $("#sparklineLatency").empty();
        $("#sparklineLoss").empty();
        $("#sparklineJitter").empty();
        return;
    }

    /* Get currect unix timestamp */
    generalend = Math.round((new Date()).getTime() / 1000);
    /* 1 Month ago */
    generalstart = generalend - (30 * 24 * 60 * 60);

    /* Clear current graph */
    $("#graph").empty();
    $("#graph").append("<p>Loading...</p>");

    /* If undefined, set as blank */
    if (input == undefined) {
        input = {graph: "latency" };
    }

    /* Resets the styling on the tabs */
    $("#latency").removeAttr("style");
    $("#jitter").removeAttr("style");
    $("#loss").removeAttr("style");
    $("#path").removeAttr("style");

    /* Based on graph, display */
    switch (input.graph) {
        case "latency":
            graph = "latency";
            drawLatencyGraph(input);
            $("#latency").attr("style", graphStyle);
            break;
        case "jitter":
            graph = "jitter";
            drawJitterGraph(input);
            $("#jitter").attr("style", graphStyle);
            break;
        case "loss":
            graph = "loss";
            drawLossGraph(input);
            $("#loss").attr("style", graphStyle);
            break;
        case "path":
            abortAjax();
            tracerouteGraph();
            $("#path").attr("style", graphStyle);
            break;
    }

    var graphurl = input.graph;
    if (input.specificstart != undefined) {
        graphurl += "/" + input.specificstart;
        if (input.specificend != undefined) {
            graphurl += "/" + input.specificend;
            if (input.generalstart != undefined) {
                graphurl += "/" + input.generalstart;
                if (input.generalend != undefined) {
                    graphurl += "/" + input.generalend;
                }
            }
        }
    }

    /* Draw sparklines */
    drawSparkLines();

    /* Update the url */
    if (input.graph != "") {
        goToURL({"name": "graph", "value": graphurl});
    }
}

function goToURL(object) {

    /* Initialize/Set variables */
    var base = $(location).attr('href').toString().split("graph")[0] + "graph/";
    var urlparts = [];

    /* Is a source set? */
    var elements = [];
    $($(location).attr('href').toString().replace("#", "").split("graph")[1].toString().split("/")).each(
        function(index, val) {
            if (val != '') {
                elements.push(val);
            }
        });


    urlparts[0] = elements[0] + "/"; /* source */
    urlparts[1] = elements[1] + "/"; /* dest */
    urlparts[2] = elements[2] + "/"; /* graph */
    urlparts[3] = elements[3] + "/"; /* graph endtime */
    urlparts[4] = elements[4] + "/"; /* graph starttime */
    urlparts[5] = elements[5] + "/"; /* bottom graph endtime */
    urlparts[6] = elements[6] + "/"; /* bottom graph starttime */

    /* Sets based on users decision */
    switch (object.name) {
        case "source":
            urlparts[0] = object.value + "/";
            for (var i = 1; i < urlparts.length; i++) {
                urlparts[i] = "undefined/";
            }
            break;

        case "dest":
            urlparts[1] = object.value + "/";
            for (var i = 2; i < urlparts.length; i++) {
                urlparts[i] = "undefined/";
            }
            break;

        case "graph":
            urlparts[2] = object.value + "/";
            urlparts[3] = endtime + "/";
            urlparts[4] = starttime + "/";
            urlparts[5] = generalend + "/";
            urlparts[6] = generalstart + "/";
            break;
    }

    /* Build URL */
    var url = base;
    for (var i = 0; i < urlparts.length; i++) {
        if (urlparts[i] != "undefined/" && urlparts[i] != "--SELECT--/") {
                url += urlparts[i];
            } else {
                break;
            }
    }

    /* Builds Title */
    var title = "";
    if (graph != "") {
        title += graph + " - ";
    }
    title += source + " to " + dest;

    History.pushState(null, title, url);
}

/*
 * Updates the variables based on the url
 */
function updateVars() {
    /* Get url */
    var url = $(location).attr('href').toString();
    url = url.replace("#", "");
    var urlparts = url.split("graph")[1].split("/");

    /* Get rid of leading blank */
    urlparts.splice(0, 1);

    /* Make up array to at least 7 */
    for (var i = 0; i <= 7; i++) {
	    urlparts.push("");
    }

    /* Set variables */
    source = urlparts[0];
    dest = urlparts[1];
    graph = urlparts[2];

    if (urlparts[3] == "") {
        endtime = Math.round((new Date()).getTime() / 1000)
    } else {
        endtime = urlparts[3];
    }

    if (urlparts[4] == "") {
        starttime = endtime - (24 * 60 * 60)
    } else {
        starttime = urlparts[4] ;
    }
    generalend = urlparts[5];
    generalstart = urlparts[6];
}

/*
 * Updates page based on variables already stored
 */
function updatePage() {
    /* Update Destination */
    if (source != "") {
        sortSource();
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"loading...\">Loading...</option>");
        $("#drpDest").attr('disabled', '');

        /* Get data, update box */
        $.ajax({
            url: "/api/_graph/dest/" + source + "/",
            success: function(data) {
                /* Clear current destinations */
                $("#drpDest").empty();
                $("#drpDest").append(
                    "<option value=\"--SELECT--\">--SELECT--</option>");
                $.each(data, function(index, dst){
                    $("<option value=\"" + dst + "\">" + dst +
                        "</option>").appendTo("#drpDest");
                    });

                /* Enable second dropdown */
                $("#drpDest").removeAttr('disabled');
                sortDest();
            }
        });
    }
}


/*
 * Updates page based on object (generally a dropdown)
 */
function pageUpdate(object) {

    /* Set the global variables */
    switch (object.name) {
        case "source":
            if (object.value == "--SELECT--") {
                source = "";
                dest = "";
                graph = "";
                endtime = "";
                starttime = "";
            } else {
                source = object.value;
                dest = "";
                graph = "";
                endtime = "";
                starttime = "";
            }
            break;
        case "dest":
            if (object.value == "--SELECT--") {
                dest = "";
                graph = "";
                endtime = "";
                starttime = "";
            } else {
                dest = object.value;
                if (graph == "" && graph == undefined) {
                    graph = "latency";
                }
                endtime = "";
                starttime = "";
            }
            break;
        case "graph":
            graph = object.value;
            endtime = Math.round((new Date()).getTime() / 1000);
            starttime = endtime - (24 * 60 * 60);
            break;
    }

    /* Second Dropdown */
    if (object.name == "source" && object.value != "--SELECT--") {
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"loading...\">Loading...</option>");
        $("#drpDest").attr('disabled', '');

        /* Get data, update box */
        $.ajax({
            url: "/api/_graph/dest/" + source + "/",
            success: function(data) {
                /* Clear current destinations */
                $("#drpDest").empty();
                $("#drpDest").append(
                    "<option value=\"--SELECT--\">--SELECT--</option>");
                $.each(data, function(index, dst){
                    $("<option value=\"" + dst + "\">" + dst +
                        "</option>").appendTo("#drpDest");
                });

                /* Enable second dropdown */
                $("#drpDest").removeAttr('disabled');

                sortDest();
            }
        });
    }

    /* Reset second dropdown */
    if (object.name == "source" && object.value == "--SELECT--") {
        $('#drpDest').empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpDest");
        $('#drpDest').attr('disabled', '');
    }

    /* Update url */
    goToURL(object);

}

/*
 * Templates for Sparklines
 */
var sparkline_ts_template = {
            type: "line",
            disableInteraction: "true",
            disableTooltips: "true",
            width: "15em",
            height: "1.5em",
            chartRangeMin: 0,
            spotColor: false,
            minSpotColor: false,
            maxSpotColor: false,
            highlightSpotColor: false,
            highlightLineColor: false
        };
/*
 *  Updates the sparklines
 *  FIXME: Process on the server side and send the raw data back to the clients
 */
function drawSparkLines() {
    /* Initial Setup For data fetching */
    var endtime = Math.round((new Date()).getTime() / 1000);
    var starttime = endtime - (60 * 60 * 24);
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime +
        "/" +  endtime + "/900";

    /* Send request for data */
    $.getJSON(url, function(input) {

        /* Latency */
        var rawdata = input.response.data;
        var actualdata = [];
        for (var i = 0; i < rawdata.length; i++) {
            if (rawdata[i].rtt_ms.loss != 1) {
                actualdata.push(rawdata[i].rtt_ms.mean);
            }
        }
        $("#sparklineLatency").sparkline(actualdata, sparkline_ts_template);

        /* Jitter */
        actualdata = [];
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.jitter);
        }
        $("#sparklineJitter").sparkline(actualdata, sparkline_ts_template);

        /* Loss */
        actualdata =[];
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.missing /
                    (rawdata[i].rtt_ms.missing + rawdata[i].rtt_ms.count)*100);
        }
        $("#sparklineLoss").sparkline(actualdata, sparkline_ts_template);
    });
}

/* FIXME: There is definitely a better way of coding this so that only one json function is needed instead of three */

/*
 *  Latency Graph
 */
function drawLatencyGraph(graph) {
    $("#graph").empty();
    Latency({
        container: $("#graph"),
        /* TODO do something sensible with start and end times, urls */
        start: starttime * 1000,
        end: endtime * 1000
    });
}

/*
 *  Jitter graph
 */
function drawJitterGraph(graph) {
    $("#graph").empty();
    Latency({
        container: $("#graph"),
        start: starttime * 1000,
        end: endtime * 1000,
    });
}

/*
 *  Loss graph
 */
function drawLossGraph(graph){
    $("#graph").empty();
    Loss({
        container: $("#graph"),
        start: starttime * 1000,
        end: endtime * 1000,
    });
}


/*
 * Sorts the source listbox
 */
function sortSource() {
    var r1 = $("#drpSource option");
    r1.sort( function(a, b) {
        if (a.text < b.text) return -1;
        if (a.text == b.text) return 0;
        return 1;
    });
    $(r1).remove();
    $("#drpSource").append($(r1));
    /* Currently Selected Source */
    if (source != "") {
        var index = $("#drpSource > option:contains("+source+")").index();
        $("#drpSource").prop("selectedIndex", index);
    } else {
        var index = $("#drpSource > option:contains(--SELECT--)").index();
        $("#drpSource").prop("selectedIndex",index);
    }
}

/*
 * Sorts the destination listbox
 */
function sortDest() {
    var r1 = $("#drpDest option");
    r1.sort( function(a, b) {
        if (a.text < b.text) return -1;
        if (a.text == b.text) return 0;
        return 1;
    });
    $(r1).remove();
    $("#drpDest").append($(r1));

    /* Currently Selected Destination */
    if (dest != "") {
        var index = $("#drpDest > option:contains("+dest+")").index();
        $("#drpDest").prop("selectedIndex",index);
    } else {
        var index = $("#drpDest > option:contains(--SELECT--)").index();
        $("#drpDest").prop("selectedIndex",index);
    }
}

/*
 * Goes to the last visited matrix page
 */
function backToMatrix() {
    /* Get the cookies */
    var last_Matrix = $.cookie("last_Matrix").replace("matrix", "#matrix");

    /* Redirect */
    if (last_Matrix) {
        window.location = last_Matrix;
    } else {
        window.location = "/matrix/latency/nz/nz";
    }
}

/*
 * Abort Any Outstanding Ajax Requests
 */
function abortAjax() {
    /* Check for ajax requests */
    if (ajax1 && ajax1.readyState != 4) {
        ajax1.abort();
    }
    if (ajax2 && ajax2.readyState != 4) {
        ajax2.abort();
    }
}


/*
 * Function that deals with traceroute graphs
 */
function tracerouteGraph() {
    $("#graph").append("<p>(This will take a while)</p>");
    ajax1 = $.getJSON("/api/_graph/tracemap/" + source +"/" + dest + "/", function(data) {
        $("#graph").empty()
        $.amptraceview($('#graph'), data , "right", "pruned");
    });
}


$(document).ready(function() {
    /* Solves problem of no slash on the end of the url */
        /* Only a problem with Hashbangs */

    if ($(location).attr("href").slice(-5) == "graph") {
        window.location = "/graph/";
    }

    var urlparts = [];
    var isHashbang = false;

    /* Split URL into parts */
    urlparts = $(location).attr('href').toString().replace("#", "").split("graph")[1].split("/");

    /* Remove leading blank */
    urlparts.splice(0, 1);

    /* Add blanks to the end of the array to cover missing url parts */
    for (var i = 0; i < 7; i++) {
        urlparts.push("");
    }

    /* Set Variables */
    source = urlparts[0];
    dest = urlparts[1];
    graph = urlparts[2];
    if (urlparts[3] == "") {
        endtime = Math.round((new Date()).getTime() / 1000)
    } else {
        endtime = urlparts[3];
    }

    if (urlparts[4] == "") {
        starttime = endtime - (24 * 60 * 60)
    } else {
        starttime = urlparts[4] ;
    }

    /* Update page variables, and draw graph */
    updateVars();
    updatePage();
    if (dest != "" || dest != undefined) {
        changeGraph({graph: graph});
    }

    sortSource();
    sortDest();
});

/* Get's history.js running */
(function(window,undefined) {
    /* Prepare */
    var History = window.History;
    if (!History.enabled) {
         /*
          * History.js is disabled for this browser.
          * This is because we can optionally choose to support HTML4 browsers or not.
          */
        return false;
    }
})(window);
