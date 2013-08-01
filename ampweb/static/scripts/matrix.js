/*
 * GLOBALS
 */
var matrix = null; /* the datatable object*/
var interval; /* the refresh interval for the matrix*/
var xhrUpdate; /* the ajax request object for the periodic update */
var xhrLoadTooltip; /* ajax request object for the tooltips */
var tabs; /* the jquery-ui tabs */
var tooltipTimeout; /* the time delay on the tooltips */
var sparklineData; /* the current sparkline data*/
var sparkline_template; /* the dynamic sparkline template */

$(document).ready(function(){
    var destinationMesh;

    startHistory(window);

    /* hide the source and destination selection divs */
    $("#sourceMesh_list").hide();
    $("#dstMesh_list").hide();

    /* intialize the jquery-ui tabs */
    tabs = $("#topTabs").tabs();

    /*
     * This function initializes the jqueryui tooltips
     * with custom content
     */
    $(function() {
        $(document).tooltip({
            items: "td, th",
            show: {
                delay: 0
            },
            content: function(callback) {

                var cellID = this.id;
                window.clearTimeout(tooltipTimeout);
                /* remove any existing tooltips */
                $(".ui-tooltip").remove();
                /* escape any dots in the ID (eg URL's) */
                var escapedID = cellID.replace(/\./g, "\\.");
                var cellObject = $('#' + escapedID);
                /* Only display tooltips for cells with content */
                if (cellObject.length > 0) {
                    if (cellObject[0].innerHTML == "") {
                        return;
                    }
                } else {
                    return;
                }

                /* 100ms timeout */
                tooltipTimeout = window.setTimeout(loadTooltip, 100);
                function loadTooltip() {
                    callback("loading...");
                    /* if there is an existing request, abort any ajax */
                    if (xhrLoadTooltip && xhrLoadTooltip != 4) {
                        xhrLoadTooltip.abort();
                    }

                    /* pull the current URL */
                    var uri = window.location.href;
                    uri = uri.replace("#", "");
                    uri = new URI(uri);
                    /* split the url path into segments */
                    var segments = uri.segment();
                    /* get the test type */
                    var test = segments[1];

                    /* ajax request for tooltip data */
                    xhrLoadTooltip = $.ajax({
                        type: "GET",
                        url: API_URL + "/_tooltip",
                        data: {
                            id: cellID,
                            test: test
                        },
                        success: function(data) {
                            /* remove any existing tooltips */
                            $(".ui-tooltip").remove();
                            /* parse the response as a JSON object */
                            var jsonObject = JSON.parse(data);
                            /* if it is a site, just return the description */
                            if (jsonObject.site == "true") {
                                callback(jsonObject.site_info);
                            }
                            /* if the data is for a cell, build the tooltip */
                            else {
                                var minY = 0;
                                var maxY = 0;
                                var maxX = Math.round((new Date()).getTime() / 1000);
                                var minX = maxX - (60 * 60 * 24);
                                /* loss sparkline */
                                if (jsonObject.test == "latency") {
                                    minY = 0;
                                    maxY = jsonObject.sparklineDataMax;
                                }
                                else if (jsonObject.test == "loss") {
                                    minY = 0;
                                    maxY = 100;
                                }
                                else if (jsonObject.test == "hops") {
                                    minY = 0;
                                    maxY = jsonObject.sparklineDataMax * 2;
                                }
                                else if (jsonObject.test == "mtu") {
                                    /* TODO: mtu */
                                }
                                /* call setSparklineTemplate with our parameters */
                                setSparklineTemplate(minX, maxX, minY, maxY);
                                /* store the sparkline data and mean in a global */
                                sparklineData = jsonObject.sparklineData;
                                /* callback with the table data */
                                callback(jsonObject.tableData);
                            }
                        }
                    });
                }
            },
            open: function(event, ui) {
                /* XXX this is the drop shadow - better styles we could use? */
                //cssSandpaper.setBoxShadow(ui.tooltip[0], "-3px -3px 10px black");
                $("#tooltip_sparkline").sparkline(sparklineData, sparkline_template);
            }
        });

        /* Setup combo boxes */

        /* What source mesh has the user selected? */
        $('#changeMesh_source > option').each(function() {
            if(this.value == segments[2]) {
                $(this).attr('selected', 'selected');
            }
        });

        /* What destination mesh has the user selected? */
        $('#changeMesh_destination > option').each(function() {
            if(this.value == segments[3]) {
                $(this).attr('selected', 'selected');
            }
        });

        /* Make pretty */

        $('#changeMesh_source').ddslick({
            width: '100px'
        });

        $('#changeMesh_destination').ddslick({
            width: '100px'
        });
    });

    /* pull the current URI and split into segments */
    var uri = window.location.href;
    uri = uri.replace("#", "");
    var URI_init = new URI(uri);
    var segments = URI_init.segment();

    /* Determine if the URL is valid. If not, make it valid. */
    /* FIXME: Works for now, but this code is horrible and repetitive */
    if (segments.length == 1) {
        URI_init.segment(0, "matrix");
        URI_init.segment(1, "latency");
        URI_init.segment(2, "nz");
        URI_init.segment(3, "nz");
    } else if (segments.length == 2) {
        if (validTestType(segments[1])) {
            selectTab(segments[1]);
        } else {
            URI_init.segment(1, "latency");
        }
        URI_init.segment(2, "nz");
        URI_init.segment(3, "nz");
    } else if (segments.length == 3) {
        if (validTestType(segments[1])) {
            selectTab(segments[1]);
        } else {
            URI_init.segment(1, "latency");
        }
        URI_init.segment(3, "nz");
    } else if (segments.length >= 4) {
        if (validTestType(segments[1])) {
            selectTab(segments[1]);
        } else {
            URI_init.segment(1, "latency");
        }
        $("#source_current").text(segments[2]);
        $("#dst_current").text(segments[3]);
    }
    History.pushState("", "", URI_init.resource().toString());
    /* Updates a cookie used to come back to this url from graphs page */
    $.cookie("last_Matrix", URI_init.resource().toString(), {
       expires : 365,
       path    : '/'
    });

    /*
     * These funtions add onclick handlers for each jqueryui tab
     * that update the url and data set, and refresh the data update period
     */
    $("#latencyTab").click(changeToTab("latency"));
    $("#lossTab").click(changeToTab("loss"));
    $("#hopsTab").click(changeToTab("hops"));
    $("#mtuTab").click(changeToTab("mtu"));

    $("#changeMesh_button").click(function() {
        if($("#dstMesh_list").is(":visible")) {
            $("#dstMesh_list").slideToggle();
        }
        if($("#sourceMesh_list").is(":visible")) {
            $("#sourceMesh_list").slideToggle();
        }
        /* get the selected source and destination */
        var srcVal = $("#changeMesh_source").data("ddslick").selectedData.value;
        var dstVal = $("#changeMesh_destination").data("ddslick").selectedData.value;
        /* pull the current URL */
        var uri = window.location.href;
        uri = uri.replace("#", "");
        uri = new URI(uri);
        /* push the src and dst to the url */
        uri.segment(2, srcVal);
        uri.segment(3, dstVal);
        History.pushState("", "", uri.resource().toString());
        /* reset the refresh interval */
        window.clearInterval(interval);
        interval = window.setInterval("reDraw()", 60000);
        if (xhrUpdate && xhrUpdate != 4) {
            /* abort the update if a new request comes in while the old data isn't ready */
            xhrUpdate.abort();
        }
        /* re-make the table */
        makeTableAxis(srcVal, dstVal);
    });

    /* on-click functions for the mesh selection utility */
    $("#source_current").click(function() {
        if($("#dstMesh_list").is(":visible")) {
            $("#dstMesh_list").hide();
        }
        $("#sourceMesh_list").slideToggle();
    });
    $("#dst_current").click(function() {
        if($("#sourceMesh_list").is(":visible")) {
            $("#sourceMesh_list").hide();
        }
        $("#dstMesh_list").slideToggle();
    });
    $(".sourceMesh_listItem").click(function() {
        $("#source_current").html($(this).attr('id'));
        $("#sourceMesh_list").hide();
    });
    $(".dstMesh_listItem").click(function() {
        $("#dst_current").html($(this).attr('id'));
        $("#dstMesh_list").hide();
    });

    /* pull the current URI and split into segments */
    var uri = window.location.href;
    uri = uri.replace("#", "");
    var URI_init = new URI(uri);
    var segments = URI_init.segment();
    /* make the table for the first time */
    makeTableAxis(segments[2], segments[3]);

    /* tells the table how often to refresh, currently 60s */
    interval = window.setInterval("reDraw()", 60000);
});

/*
 * Create an onclick handlers for the graph selection tabs that will update
 * the URL and data set, and refresh the data update period.
 */
function changeToTab(tab) {
    return function() {
	updateURI(1, tab);
	reDraw();
	window.clearInterval(interval);
	interval = window.setInterval("reDraw()", 60000);
    }
}

/*
 * This function sets the template for a sparkline
 * TODO merge this with the latency_template in ampweb/static/scripts/graph.js
 * if they can be made similar enough
 */
function setSparklineTemplate(minX, maxX, minY, maxY) {
    sparkline_template = {
            type: "line",
            disableInteraction: "true",
            disableTooltips: "true",
            width: "300px",
            height: "60px",
            chartRangeMin: minY,
            chartRangeMax: maxY,
            spotColor: false,
            minSpotColor: false,
            maxSpotColor: false,
            highlightSpotColor: false,
            highlightLineColor: false,
            chartRangeMinX: minX,
            chartRangeMaxX: maxX,
            /* showing mean + 1 standard deviation might be nice? */
            //normalRangeMin: 0,
            //normalRangeMax: 100,
    };
}

/*
 * This function is periodically called to redraw the table
 * with new data fetched via ajax
 */
function reDraw() {
    matrix.fnReloadAjax();
}

/*
 * This function takes a position and a value, and updates the
 * given position within the URL's path, with the given value
 */
function updateURI(position, value) {
    var currentURI = window.location.href;
    currentURI = currentURI.replace("#", "");
    var newURI = new URI(currentURI);
    newURI.segment(position, value);
    History.pushState("", "", newURI.resource().toString());

    /* Updates a cookie used to come back to this url from graphs page */
    $.cookie("last_Matrix", newURI.resource().toString(), {
       expires : 365,
       path    : '/'
    });
}

/*
 * This function takes a value, and checks it against a list
 * of valid test types, and returns true or false
 * FIXME(maybe): works, but perhaps too static?
 */
function validTestType(value) {
    if (value == "latency" || value == "loss" || value == "hops" ||
            value == "mtu") {
        return true;
    }
    return false;
}

/*
 * This function takes a test type as input, and selects
 * the appropriate tab for that test. Called on page load
 */
function selectTab(test) {
    if (test == "latency") {
        tabs.tabs('select', 0);
    }
    else if (test == "loss") {
        tabs.tabs('select', 1);
    }
    else if (test == "hops") {
        tabs.tabs('select', 2);
    }
    else if (test == "mtu") {
        tabs.tabs('select', 3);
    }
}

/* This function gets the table src/dst and then passes it to makeTable */
function makeTableAxis(sourceMesh, destMesh) {
    $.ajax({
        "type": "GET",
        "url": API_URL + "/_matrix_axis",
        "data": {
            "srcMesh": sourceMesh,
            "dstMesh": destMesh
            },
        "success": function(data) {
            makeTable(data);
        }
    });
}

/*
 * TODO use standard deviation rather than fixed offsets
 */
function getClassForAbsoluteLatency(latency, minimum) {
    if (latency == "X") { /* untested cell */
        return "test-none";
    } else if (latency == -1) { /* no data */
        return "test-error";
    } else if (latency <= minimum) { /* The same or lower */
        return "test-color1";
    } else if (latency < (minimum + 5)) { /* less  than min + 5ms */
        return "test-color2";
    } else if (latency < (minimum + 10)) { /* less  than min + 10ms */
        return "test-color3";
    } else if (latency < (minimum + 20)) { /* less  than min + 20ms */
        return "test-color4";
    } else if (latency < (minimum + 40)) { /* less  than min + 40ms */
        return "test-color5";
    } else if (latency < (minimum + 100)) { /* less  than min + 100ms */
        return "test-color6";
    }
    /* more than 100ms above the daily minimum */
    return "test-color7";
}

function getClassForLatency(latency, mean, stddev) {
    if ( latency == "X" ) {
        return "test-none";
    }
    if ( latency == -1 ) {
        return "test-error";
    }
    if ( latency <= mean ) {
        return "test-color1";//XXX wtf are these color and not colour?
    }
    if ( latency <= mean * (stddev * 0.5) ) {
        return "test-color2";
    }
    if ( latency <= mean * stddev ) {
        return "test-color3";
    }
    if ( latency <= mean * (stddev * 1.5) ) {
        return "test-color4";
    }
    if ( latency <= mean * (stddev * 2) ) {
        return "test-color5";
    }
    if ( latency <= mean * (stddev * 3) ) {
        return "test-color6";
    }
    return "test-color7";
}

function getClassForLoss(loss) {
    if ( loss == "X" ) { /* untested cell */
        return "test-none";
    } else if (loss== -1) { /* no data */
        return "test-error";
    } else if (loss== 0) { /* 0% loss  */
        return "test-color1";
    } else if (loss< 5) { /* 0-4% loss  */
        return "test-color2";
    } else if (loss<= 10) { /* 5-10% loss  */
        return "test-color3";
    } else if (loss <= 20) { /* 11-20% loss  */
        return "test-color4";
    } else if (loss <= 30) { /* 21-30% loss  */
        return "test-color5";
    } else if (loss <= 80) { /* 31-80% loss  */
        return "test-color6";
    }
    /* 81-100% loreturn */
    return "test-color7";
}

function getClassForHops(hopcount) {
    if (hopcount == "X") { /* untested cell */
        return "test-none";
    } else if (hopcount == -1) { /* no data */
        return "test-error";
    } else if (hopcount <= 4) { /* 4 or less hops (dark green)*/
        return "test-color1";
    } else if (hopcount <= 6) { /* 6 or less hops (light green) */
        return "test-color2";
    } else if (hopcount <= 8) { /* 8 or less hops (yellow) */
        return "test-color3";
    } else if (hopcount <= 10) { /* 10 or less hops (light orange) */
        return "test-color4";
    } else if (hopcount <= 13) { /* 13 or less hops (dark orange) */
        return "test-color5";
    } else if (hopcount <= 16) { /* 16 or less hops (red) */
        return "test-color6";
    }
    /* greater than 16 hops (dark red) */
    return "test-color7";
}

function getGraphLink(stream_id, graph) {
    var link = jQuery('<a>').attr('href', GRAPH_URL + "/amp-icmp/" +
            stream_id + '/30/');
    link.append('\xA0');
    return link;
}

/*
 * Trim any ampz- or www. prefix from a name for display purposes.
 */
function getDisplayName(name) {
    if (name.search("ampz-") == 0) {
        return name.slice(5);
    }
    if (name.search("www.") == 0) {
        return name.slice(4);
    }
    return name;
}

/*
 * This function creates the table.
 * It is called once on page load, and then each time a mesh changes.
 */
function makeTable(axis) {
    /* empty the current thead element */
    if (matrix != null) {
        matrix.fnDestroy();
    }
    $("#matrix_head").empty();
    var $thead_tr = $("<tr>");
    $thead_tr.append("<th></th>");
    for (var i = 0; i < axis.dst.length; i++) {
        var dstID = axis.dst[i];
        var dstName = getDisplayName(axis.dst[i]);
        $thead_tr.append("<th class='dstTh' id='dst__" + dstID + "'><p class='dstText'>" + dstName + "</p></th>");
    }

    $thead_tr.appendTo("#matrix_head");

    for (var i = 0; i < axis.src.length; i++) {
        var $tr = $("<tr>");
        var srcID = axis.src[i];
        var srcName = getDisplayName(axis.src[i]);

        $tr.append("<td class='srcNode' id='src__" + srcID + "'>" + srcName + "</td>");
        for (var x = 0; x < axis.dst.length; x++) {
            $tr.append("<td class='cell test-none'></td>");
        }
        $tr.appendTo("#matrix_body");
    }

    var dstText = $(".dstText");
    for (var i = 0; i < dstText.length; i++) {
        cssSandpaper.setTransform(dstText[i], "rotate(-45deg)");
    }
    $('th').mouseenter(function() {
        $(this).children().addClass("cell_mouse_hover");
    }).mouseleave(function() {
        window.clearTimeout(tooltipTimeout);
        $(this).children().removeClass("cell_mouse_hover");
        if (xhrLoadTooltip && xhrLoadTooltip != 4) {
            xhrLoadTooltip.abort();
        }
        $(".ui-tooltip").remove();
    });

    matrix = $('#AMP_matrix').dataTable({
        "bInfo": false, /* disable table information */
        "bSort": false, /* disable sorting */
        "bSortBlasses": false, /* disable the addition of sorting classes */
        "bProcessing": true, /* enabling processing indicator */
        "bAutoWidth": false, /* disable auto column width calculations */
        "oLanguage": { /* custom loading animation */
            "sProcessing": "<img src='/static/img/ajax-loader.gif'>"
        },
        "bStateSave": true, /* saves user table state in a cookie */
        "bPaginate": false, /* disable pagination */
        "bFilter": false, /* disable search box */
        "fnRowCallback": function( nRow, aData, iDisplayIndex) {
            var srcNode = aData[0];
            /* add class and ID to the source nodes */
            $('td:eq(0)', nRow).attr('id', "src__" + srcNode);
            $('td:eq(0)', nRow).addClass('srcNode');
            $('td:eq(0)', nRow).mouseenter(function() {
                $(this).addClass("cell_mouse_hover");
            }).mouseleave(function() {
                $(this).removeClass("cell_mouse_hover");
                if (xhrLoadTooltip && xhrLoadTooltip != 4) {
                    window.clearTimeout(tooltipTimeout);
                    xhrLoadTooltip.abort();
                }
                $(".ui-tooltip").remove();
            });

            $('td:eq(0)', nRow).html(getDisplayName(srcNode));

            /* pull the current URL */
            var uri = window.location.href;
            uri = uri.replace("#", "");
            uri = new URI(uri);
            /* split the url path into segments */
            var segments = uri.segment();
            /* get the test type */
            var test = segments[1];

            var srcNodeID = "src__" + srcNode;
            for (var i = 1; i < aData.length; i++) {
                /* get the id of the corresponding th element */
                /* Math.floor((i+1)/2) */
                var dstNode = $('thead th:eq(' + i + ')').attr('id');
                /* make the current cell part of the cell class */
                $('td:eq(' + i + ')', nRow).addClass('cell');
                /* add the id to each cell in the format src__to__dst */
                $('td:eq(' + i + ')', nRow).attr('id', srcNodeID + "__to__" + dstNode);
                /* trim the dst__ off the dst ID, as it's not needed anymore */
                dstNode = dstNode.slice(5);
                $('td:eq(' + i + ')', nRow).mouseenter(function() {
                    var thDstNode = $('thead th:eq('+ $(this).index() + ')').attr('id');
                    var escapedID = thDstNode.replace(/\./g, "\\.");
                    $(this).addClass("cell_mouse_hover");
                    $("#" + srcNodeID).addClass("cell_mouse_hover");
                    $("#" + escapedID).children().addClass("cell_mouse_hover");
                }).mouseleave(function() {
                    var thDstNode = $('thead th:eq(' + $(this).index() + ')').attr('id');
                    var escapedID = thDstNode.replace(/\./g, "\\.");
                    $(this).removeClass("cell_mouse_hover");
                    $("#" + srcNodeID).removeClass("cell_mouse_hover");
                    $("#" + escapedID).children().removeClass("cell_mouse_hover");
                    if (xhrLoadTooltip && xhrLoadTooltip != 4) {
                        window.clearTimeout(tooltipTimeout);
                        xhrLoadTooltip.abort();
                        $(".ui-tooltip").remove();
                    }
                });

                /* this is the cell element that is being updated */
                var cell = $('td:eq(' + i + ')', nRow);

                /* deal with untested data X, set it empty and grey */
                if ( aData[i] == null || aData[i].len <= 1 ) {
                    cell.html("");
                    cell.addClass("test-none");
                    aData[i] = [-1, -1];
                    continue;
                }

                /* looks like useful data, put it in the cell and colour it */
                var stream_id = aData[i][0];
                if (test == "latency") {
                    var latency = aData[i][1];
                    var mean = aData[i][2];
                    var stddev = aData[i][3];
                    cell.addClass(getClassForLatency(latency, mean, stddev));
                } else if ( test == "loss" ) {
                    var loss = aData[i][1];
                    cell.addClass(getClassForLoss(loss));
                } else if (test == "hops") {
                    var hops = aData[i][1];
                    cell.addClass(getClassForHops(hops));
                }
                else if (test == "mtu") {
                    /* TODO */
                } else {
                    continue;
                }
                cell.html(getGraphLink(stream_id, test));
            }
            return nRow;
        },
        "sAjaxSource": API_URL + "/_matrix", /* get ajax data from this source */
        /*
         * overrides the default function for getting the data from the server,
         * so that we can pass data in the ajax request
         */
        "fnServerData": function(sSource, aoData, fnCallback) {
            /* load up some default values, in-case none are specified */
            var src = "nz";
            var dst = "nz";
            var test = "latency";
            /* pull the current url */
            var uri = window.location.href;
            uri = uri.replace("#", "");
            uri = new URI(uri);
            /* split the url path into segments */
            var segments = uri.segment();

            /* FIXME: works, but not happy with how this is done */
            if((segments[1] != undefined) && (segments[1] != "")) {
                test = segments[1];
                if((segments[2] != undefined) && (segments[2] != "")) {
                    src = segments[2];
                    if((segments[3] != undefined) && (segments[3] !=  "")) {
                        dst = segments[3];
                    }
                }
            }

            /* push the values into the GET data */
            aoData.push({"name": "testType", "value": test});
            aoData.push({"name": "source", "value": src});
            aoData.push({"name": "destination", "value": dst});

            if (xhrUpdate && xhrUpdate != 4) {
                /* abort the update if a new request comes in while the old data isn't ready */
                xhrUpdate.abort();
            }
            xhrUpdate = $.ajax({
                "dataType": "json",
                "type": "GET",
                "url": sSource,
                "data": aoData,
                /* remove any existing tooltips before displaying new data */
                "success": function(data) {
                    /* remove any existing tooltips */
                    $(".ui-tooltip").remove();
                    fnCallback(data);
                }
            });
        }
    });
    $("#matrix_body").empty();
    for (var i = 0; i < axis.src.length; i++) {
        var $tr = $("<tr>");
        var srcID = axis.src[i];
        var srcName = getDisplayName(axis.src[i]);

        $tr.append("<td class='srcNode' id='src__" + srcID + "'>" + srcName + "</td>");
        for (var x = 0; x < axis.dst.length; x++) {
            $tr.append("<td class='cell test-none'></td>");
        }
        $tr.appendTo("#matrix_body");
    }
    $('td').mouseenter(function() {
        $(this).addClass("cell_mouse_hover");
    }).mouseleave(function() {
        window.clearTimeout(tooltipTimeout);
        $(this).removeClass("cell_mouse_hover");
        if (xhrLoadTooltip && xhrLoadTooltip != 4) {
            xhrLoadTooltip.abort();
        }
        $(".ui-tooltip").remove();
    });
}
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
