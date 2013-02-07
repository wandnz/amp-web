/*
 * GLOBALS
 */
var matrix; /* the datatable object*/
var interval; /* the refresh interval for the matrix*/
var xhrUpdate; /* the ajax request object for the periodic update */
var xhrLoadTooltip; /* ajax request object for the tooltips */
var tabs; /* the jquery-ui tabs */
var tooltipTimeout; /* the time delay on the tooltips */
var sparklineData; /* the current sparkline data */
var sparkline_template; /* the dynamic sparkline template */

$(document).ready(function(){
    var destinationMesh;
    (function(window,undefined) {
        /* Prepare History.js */
        var History = window.History; 
        if (!History.enabled) {
            /*
             * History.js is disabled for this browser.
             * This is because we can optionally choose to support HTML4 browsers or not.
             */
            return false;
        }

        /* Bind to StateChange Event */
        History.Adapter.bind(window,'statechange',function() { 
            var State = History.getState(); 
        });
    })(window);


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
                tooltipTimeout = window.setTimeout(loadTooltip, 250);
                
                function loadTooltip() {
                    /* if there is still an existing tooltip, abort any ajax and remove any tooltips */
                    if (xhrLoadTooltip && xhrLoadTooltip != 4) {
                        xhrLoadTooltip.abort();
                        $(".ui-tooltip").remove();
                    }
                    /* escape any dots in the ID (eg URL's) */
                    escapedID = cellID.replace(/\./g, "\\.");
                    var cellObject = $('#' + escapedID);
                    /* check if the cell has content - we don't want tooltips for untested cells */
                    if (cellObject.length > 0) {
                        if (cellObject[0].innerHTML == "X") {
                            return;
                        }
                    }
                    else {
                        return;
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
                        url: "/api/_tooltip",
                        data: {
                            id: cellID,
                            test: test
                        },
                        success: function(data) {
                            /* remove any existing tooltips */
                            $(".ui-tooltip").remove();
                            /* parse the response as a JSON object */
                            var jsonObject = JSON.parse(data);
                            
                            /* if the data is a site, just return the description data */
                            if (jsonObject.site == "true") {
                                callback(jsonObject.data);
                            }
                            /* if the data is for a cell, build the tooltip */
                            else {
                                /* minimum sparkline view = 60% of mean */
                                var minView = jsonObject.sparklineDataMean * 0.6;
                                /* maximum sparkline view = 120% of mean */
                                var maxView = jsonObject.sparklineDataMean * 1.2;
                                /* normal = mean +/- 3 st dev's (95% of values) */
                                var minNorm = jsonObject.sparklineDataMean - (jsonObject.sparklineDataStdev * 3);
                                var maxNorm = jsonObject.sparklineDataMean + (jsonObject.sparklineDataStdev * 3);
    
                                /* check if the lowest data point is lower than our min view */
                                if (jsonObject.sparklineDataMin < minView) {
                                    minView = jsonObject.sparklineDataMin;
                                }
                                /* check if the highest data point is higher than our max view */
                                if (jsonObject.sparklineDataMax > maxView) {
                                    maxView = jsonObject.sparklineDataMax;
                                }
                                /* call setSparklineTemplate with our parameters */
                                setSparklineTemplate(minView, maxView, minNorm, maxNorm);
                                /* store the sparkline data in a global */
                                sparklineData = jsonObject.sparklineData;
                                /* callback with the table data */
                                callback(jsonObject.tableData);
                            }
                        }
                    });
                }
            },
            open: function(event, ui) {
                cssSandpaper.setBoxShadow(ui.tooltip[0], "-3px -3px 10px black");
                $("#td_sparkline").sparkline(sparklineData, sparkline_template);
            }
        });
    });

    /* pull the current URI and split into segments */
    var uri = window.location.href;
    uri = uri.replace("#", "");
    var URI_init = new URI(uri);
    var segments = URI_init.segment();

    /* FIXME: Works for now, but this code is horrible and repetitive */
    if (segments.length == 1) {
        URI_init.segment(0, "matrix");
        URI_init.segment(1, "latency");
        URI_init.segment(2, "nz");
        URI_init.segment(3, "nz");
    }
    else if (segments.length == 2) {
        if (validTestType(segments[1])) {
            selectTab(segments[1]);
        }
        else {
            URI_init.segment(1, "latency");
        }
        URI_init.segment(2, "nz");
        URI_init.segment(3, "nz");
    }
    else if (segments.length == 3) {
        if (validTestType(segments[1])) {
            selectTab(segments[1]);
        }
        else {
            URI_init.segment(1, "latency");
        }
        URI_init.segment(3, "nz");
    }
    else if (segments.length >= 4) {
        if (validTestType(segments[1])) {
            selectTab(segments[1]);
        }
        else {
            URI_init.segment(1, "latency");
        }
        $("#changeMesh_source").attr("value", segments[2]);
        $("#changeMesh_destination").attr("value", segments[3]);
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
    $("#latencyTab").click(function() {
        updateURI(1, "latency");
        reDraw();
        window.clearInterval(interval);
        interval = window.setInterval("reDraw()", 60000);
    });

    $("#lossTab").click(function() {
        updateURI(1, "loss");
        reDraw();
        window.clearInterval(interval);
        interval = window.setInterval("reDraw()", 60000);
    });

    $("#hopsTab").click(function() {
        updateURI(1, "hops");
        reDraw();
        window.clearInterval(interval);
        interval = window.setInterval("reDraw()", 60000);
    });

    $("#mtuTab").click(function() {
        updateURI(1, "mtu");
        reDraw();
        window.clearInterval(interval);
        interval = window.setInterval("reDraw()", 60000);
    });

    $("#changeMesh_button").click(function() {
        /* get the selected source and destination */
        var srcVal = $("#changeMesh_source :selected").val();
        var dstVal = $("#changeMesh_destination :selected").val();
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
        makeTableHeader(dstVal);
    });

    $('.cell').mouseenter(function() {
        $(this).toggleClass("cell_mouse_hover");
        alert("enter");
    }).mouseleave(function() {
        $(this).toggleClass("cell_mouse_hover");
        alert("leave");
    });

    /* pull the current URI and split into segments */
    var uri = window.location.href;
    uri = uri.replace("#", "");
    var URI_init = new URI(uri);
    var segments = URI_init.segment();
    /* make the table for the first time */
    makeTableHeader(segments[3]);

    /* tells the table how often to refresh, currently 60s */
    interval = window.setInterval("reDraw()", 60000);
});

/*
 * This function sets the template for a sparkline
 */
function setSparklineTemplate(minView, maxView, minNormal, maxNormal) {
    sparkline_template = {
            type: "line",
            lineColor: "#680000",
            fillColor: "#F9E5D1",
            disableInteraction: "true",
            disableTooltips: "true",
            width: "300px",
            height: "60px",
            chartRangeMin: 0,
            normalRangeMin: minNormal,
            normalRangeMax: maxNormal,
            chartRangeMin: minView,
            chartRangeMax: maxView,
            normalRangeColor: "#FF5656",
            drawNormalOnTop: true,
            spotRadius: 3,
            spotColor: false,
            minSpotColor: false,
            maxSpotColor: "#0000BF",
            highlightSpotColor: false,
            highlightLineColor: false
    };
}

/*
 * This function adds a mouse leave funtion to the th elements
 * that will clean up or remove any tooltips that might still be active
 */
function thTooltipMouseleave() {
$('th').mouseleave(function() {
        window.clearTimeout(tooltipTimeout);
        if (xhrLoadTooltip && xhrLoadTooltip != 4) {
            xhrLoadTooltip.abort();
            $(".ui-tooltip").remove();
        }
    });
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
    if (value == "latency" || value == "loss" || value == "hops" || value == "mtu") {
        return true;
    }
    else {
        return false;
    }
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

function makeTableHeader(destMesh) {
    $.ajax({
        "type": "GET",
        "url": "/api/_matrix_header",
        "data": {"dstMesh": destMesh},
        "success": function(data) {
            makeTable(data);
        }
    }); 
}

/*
 * This function creates the table.
 * It is called once on page load, and then each time a mesh changes.
 */
function makeTable(destMesh) {
    /* empty the current thead element */
    $("#matrix_head").empty();
    var $thead_tr = $("<tr>");
    $thead_tr.append("<th></th>");

    for (var i = 0; i < destMesh.length; i++) {
        var dstID = destMesh[i];
        var dstName;
        /* if the node has "ampz-" in front of it, trim it off */
        if (destMesh[i].search("ampz-") == 0) {
            dstName = destMesh[i].slice(5);
        }
        else {
            dstName = destMesh[i];
        }
        $thead_tr.append("<th class='dstTh' id='dst__" + dstID +"'><p class='dstText'>" + dstName + "</p></th>");
    }
    
    $thead_tr.appendTo("#matrix_head");
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
            $(".ui-tooltip").remove();
        }
    });

    matrix = $('#AMP_matrix').dataTable({
        "bInfo": false, /* disable table information */
        "bSort": false, /* disable sorting */
        "bSortBlasses": false, /* disable the addition of sorting classes */
        "bDestroy": true, /* destory the table if it already exists */
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
                    $(".ui-tooltip").remove();
                }
            });

            /* check if the source has "ampz-" in front of it, and trim */
            if (srcNode.search("ampz-") == 0) {
                $('td:eq(0)', nRow).html(srcNode.slice(5));
            }
            
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
                /* TODO: dynamic scale */
                if (test == "latency") {
                    /* create a link to the graphs page (latency) */
                    var linkObject = jQuery('<a>').attr('href', '/graph/#' + srcNode + '/' + dstNode + '/latency/').text(aData[i]);
                    if (aData[i] == "X") { /* untested cell */
                        $('td:eq(' + i + ')', nRow).addClass('test-none');
                        /*$('td:eq(' + i + ')', nRow).html("");*/
                    }
                    else if (aData[i] == -1) { /* no data */
                        $('td:eq(' + i + ')', nRow).addClass('test-error');
                        /* create a link to the graphs page for the cell with no *current* data */
                        var noDataLinkObject = jQuery('<a>').attr('href', '/graph/#' + srcNode + '/' + dstNode + '/latency/').text("--");
                        $('td:eq(' + i + ')', nRow).html(noDataLinkObject);
                    }
                    else if (aData[i] < 20) { /* 0-19ms */
                        $('td:eq(' + i + ')', nRow).addClass('test-color1');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] < 40) { /* 20-39ms */
                        $('td:eq(' + i + ')', nRow).addClass('test-color2');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] < 60) { /* 40-59ms */
                        $('td:eq(' + i + ')', nRow).addClass('test-color3');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] < 80) { /* 60-79ms */
                        $('td:eq(' + i + ')', nRow).addClass('test-color4');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] < 150) { /* 80-149ms */
                        $('td:eq(' + i + ')', nRow).addClass('test-color5');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] < 250) { /* 150-249ms */
                        $('td:eq(' + i + ')', nRow).addClass('test-color6');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else { /* 250ms + */
                        $('td:eq(' + i + ')', nRow).addClass('test-color7');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                }
                /* static scale for loss */
                else if (test == "loss") {
                    /* create a link to the graphs page (loss) */
                    var linkObject = jQuery('<a>').attr('href', '/graph/#' + srcNode + '/' + dstNode + '/loss/').text(aData[i]);
                    if (aData[i] == "X") { /* untested cell */
                        $('td:eq(' + i + ')', nRow).addClass('test-none');
                        $('td:eq(' + i + ')', nRow).html("");
                    }
                    else if (aData[i] === -1) { /* no data */
                        var noDataLinkObject = jQuery('<a>').attr('href', '/graph/#' + srcNode + '/' + dstNode + '/loss/').text("--");
                        $('td:eq(' + i + ')', nRow).addClass('test-error');
                        $('td:eq(' + i + ')', nRow).html(noDataLinkObject);
                    }
                    else if (aData[i] == 0) { /* 0% loss */
                    var thIndex = $(this).index() - 1;
                    var thIndex = $(this).index() - 1;
                        $('td:eq(' + i + ')', nRow).addClass('test-color1');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] < 5) { /* 0-4% loss */
                        $('td:eq(' + i + ')', nRow).addClass('test-color2');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] <= 10) { /* 5-10% loss */
                        $('td:eq(' + i + ')', nRow).addClass('test-color3');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] <= 20) { /* 11-20% loss */
                        $('td:eq(' + i + ')', nRow).addClass('test-color4');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] <= 50) { /* 21-50% loss */
                        $('td:eq(' + i + ')', nRow).addClass('test-color5');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else if (aData[i] <= 90) { /* 51-90% loss */
                        $('td:eq(' + i + ')', nRow).addClass('test-color6');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                    else { /* 91-100% loss*/
                        $('td:eq(' + i + ')', nRow).addClass('test-color7');
                        $('td:eq(' + i + ')', nRow).html(linkObject);
                    }
                }
                /* TODO: more test types */
            }
            return nRow;
        },
        "sAjaxSource": "/api/_matrix", /* get ajax data from this source */
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
}
