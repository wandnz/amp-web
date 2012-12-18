/* Global Variables */
    var source = "";  /* The source amplet */
    var dest = "";  /* The destination amplet/site */
    var graph = "";  /* Graph currently displayed */
    var specificstart = "";  /* Start timestamp on the detail graph */
    var specificend = "";  /* End timestamp on the detail graph */
    var generalstart = "";  /* Start timestamp on the summary graph */
    var generalend = "";  /* End timestamp on the summary graph */


function changeGraph(graph) {
    /* If source + dest are not set, stop */
    if (source == "" || dest == "") {
        $("#graph").empty();
        $("#sparklineLatency").empty();
        $("#sparklineLoss").empty();
        $("#sparklineJitter").empty();
        return;
    }
    
    /* Clear current graph */
    $("#graph").html("");

    /* Based on graph, display */
    switch (graph.graph) {
        case "Latency":
            drawLatencyGraph(graph);
            break;
        case "Jitter":
            drawJitterGraph(graph);
            break;
        case "Loss":
            drawLossGraph(graph);
            break;
        case "Path":
            drawLatencyGraph(graph);
            break;
    }

    var graphurl = graph.graph;
    if (graph.specificstart != undefined) {
        graphurl += "/" + graph.specificstart;
        if (graph.specificend != undefined) {
            graphurl += "/" + graph.specificend;
            if (graph.generalstart != undefined) {
                graphurl += "/" + graph.generalstart;
                if (graph.generalend != undefined) {
                    graphurl += "/" + graph.generalend;
                }
            }
        }
    }
    
    /* Draw sparklines */
    drawSparkLines();

    /* Update the url */
    goToURL({"name": "graph", "value": graphurl});
}

function goToURL(object) {

    /* Initialize/Set variables */
    var base = window.location.href.toString().split("graph")[0] + "graph/";
    var urlparts = [];

    /* Is a source set? */
    var elements = [];
    window.location.href.toString().split("graph")[1].toString().split("/").forEach(
        function(p) {
            if (p != '') {
                elements.push(p);
            }
        });

    /* 0-Source, 1-Dest, 2-Graph, 3-StartTime, 4-Endtime */
    urlparts[0] = elements[0] + "/";
    urlparts[1] = elements[1] + "/";
    urlparts[2] = elements[2] + "/";
    urlparts[3] = elements[3] + "/";
    urlparts[4] = elements[4] + "/";

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
            for (var i = 3; i < urlparts.length; i++) {
                urlparts[i] = "undefined/";
            }
            break;
    }

    /* Build URL */
    var url = base;
    for (var i = 0; i < urlparts.length; i++) {
        if (urlparts[i] != "undefined/" && urlparts[i] != "--SELECT--/") {
                url += urlparts[i];
            }
            else {
                break;
            }
    }
    window.history.pushState(null, document.title, url);
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
                specificstart = "";
                specificend = "";
                generalstart = "";
                generalend = "";
            }
            else {
                source = object.value;
            }
            break;
        case "dest":
            if (object.value == "--SELECT--") {
                dest = "";
                graph = "";
                specificstart = "";
                specificend = "";
                generalstart = "";
                generalend = "";
            }
            else {
                dest = object.value;
            }
            break;
        case "graph":
            graph = object.value;
            specificstart = "";
            specificend = "";
            generalstart = "";
            generalend = "";
            break;
        case "specificstart":
            specificstart = object.value;
            specificend = "";
            generalstart = "";
            break;
        case "specificend":
            specificend = object.value;
            generalstart = "";
            generalend = "";
            break;
        case "generalstart":
            generalstart = object.value;
            generalend = "";
            break;
        case "generalend":
            generalend = object.value;
            break;
    }

    /* Second Dropdown */
    if (object.name == "source" && object.value != "--SELECT--") {
        /* Get data, update box */
        $.ajax({url: "/data/" + source + "/", success: function(data) {
            data = data.response.sites;                     
            /* Clear current destinations */
            $("#dest").empty();
            $("#dest").append("<option>--SELECT--</option>");
            $.each(data, function(index, dst){
                $("<option>" + dst + "</option>").appendTo("#dest");
            });
        /* Enable second dropdown */
        $("#dest").removeAttr('disabled');
        }});
    }

    /* Reset second dropdown */
    if (object.name == "source" && object.value == "--SELECT--") {
        $('#dest').empty();
        $('<option>--SELECT--</option>').appendTo("#dest");
        $('#dest').attr('disabled', '');
    }

    /* Update url */
    goToURL(object);
}

/*
 * Templates for Sparklines
 */
var latency_template = {
            type: "line",
            tooltipSuffix: "ms",
            width: "15em",
            height: "1.5em"
        },
    loss_template = {
            type: "line",
            tooltipSuffix: "% loss",
            width: "15em",
            height: "1.5em"
        };
/*
 *  Updates the sparklines
 */
function drawSparkLines() {
    /* Initial Setup For data fetching */
    var endtime = Math.round((new Date()).getTime() / 1000);
    var starttime = endtime - (60 * 60 * 24);
    var url = "/data/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" +  endtime + "/480/";

    /* Send request for data */
    $.getJSON(url, function(input) {
        
        /* Latency */
        var rawdata = input.response.data;
        var actualdata = [];
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.mean);
        }
        $("#sparklineLatency").sparkline(actualdata, latency_template);
        
        /* Jitter */
        actualdata = [];
        var mean = 0;
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.mean);
            mean += rawdata[i].rtt_ms.mean;
        }
        mean = mean / rawdata.length;
        var processed = [];
        for (var i = 0; i < actualdata.length; i++) {
            if (mean - actualdata[i] < 0) {
                processed.push((mean - actualdata[i]) * -1);
            }
            else {
                processed.push(mean - actualdata[i]);
            }
        }
        $("#sparklineJitter").sparkline(processed, latency_template);
        
        /* Loss */
        actualdata =[];
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.missing / (rawdata[i].rtt_ms.missing + rawdata[i].rtt_ms.count) * 100);    
        }
        $("#sparklineLoss").sparkline(actualdata, loss_template);
    });
    
}

/* FIXME: There is definitely a better way of coding this so that only one json function is needed instead of three */
/*
 *  Latency Graph
 */
function drawLatencyGraph(graph) {
    /* Get current unix timestamp */
    var endtime = Math.round((new Date()).getTime() / 1000);
    /* 1 day ago */
    var starttime = endtime - (60 * 60 * 24);
    
    /* Where to put the graph + where to get the data from */
    var container = $("#graph");
    var url = "/data/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" +  endtime;

    /* Make the request for data */
    $.getJSON(url, function(da) {
        /* Get raw data */
        var rawdata = da.response.data;

        /* Extract Data */
        var x = [],
            y = [],
            actualdata = [x, y];
        
        for (var i = 0; i < rawdata.length; i++) {
            x.push(rawdata[i].time * 1000);
            y.push(rawdata[i].rtt_ms.mean);
        } 
        /* Draw graph */
        Latency({summarydata: actualdata, detaildata: actualdata, container: container});
    });
}

/*
 *  Loss graph
 */
function drawLossGraph(graph){
    /* Get currect unix timestamp */   
    var endtime = Math.round((new Date()).getTime() / 1000);
    /* 1 day ago */
    var starttime = endtime - (60 * 60 * 24);

    /* Where to put the graph + where to get the data from */
    var container = $("#graph");
    var url = "/data/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" + endtime;

    /* Make the request for the data */
    $.getJSON(url, function(da) {
        /* Get raw data */
        var rawdata = da.response.data;

        /* Extract */
        var x = [],
            y = [],
            actualdata = [x, y];

        for (var i = 0; i < rawdata.length; i++) {
            x.push(rawdata[i].time * 1000);
            y.push(rawdata[i].rtt_ms.missing / (rawdata[i].rtt_ms.missing + rawdata[i].rtt_ms.count) * 100);
        }
        
        Loss({summarydata: actualdata, detaildata: actualdata, container: container});
    });
}

/*
 *  Jitter graph
 */
function drawJitterGraph(graph) {
    /* Get current unix timestamp */
    var endtime = Math.round((new Date()).getTime() / 1000);
    /* 1 day ago */
    var starttime = endtime - (60 * 60 * 24);

    /* Where to put the graph in the page + get data from */
    var container = $("#graph");
    var url = "/data/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" + endtime;

    /* Make the request for the data */
    $.getJSON(url, function(da) {
        /* Get raw data */
        var rawdata = da.response.data;        

        /* Get the mean of the values */
        $.getJSON(url + "/" + (endtime - starttime).toString(), function(daa) {
            var mean = daa.response.data[0].rtt_ms.mean;
         
            var x = [],
                y = [],
                actualdata = [x, y];

            /* Calculate Jitter, then put into data array */
            for (var i = 0; i < rawdata.length; i++) {
                var jitter = rawdata[i].rtt_ms.mean - mean;
                if (jitter < 0) {
                    jitter *= -1;
                }
                x.push(rawdata[i].time * 1000);
                y.push(jitter);
            }
            
            /* Graph */
            Latency({summarydata: actualdata, detaildata: actualdata, container: container});
        });
    });
}
