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
    //tabs = $("#topTabs").tabs();

    /* Setup combo boxes */
    var params = parse_uri();

    /* What source mesh has the user selected? */
    $('#changeMesh_source > option').each(function() {
        if ( this.value == params.source ) {
            $(this).attr('selected', 'selected');
        }
    });

    /* What destination mesh has the user selected? */
    $('#changeMesh_destination > option').each(function() {
        if ( this.value == params.destination ) {
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

    /* Determine if the URL is valid. If not, make it valid. */
    var params = parse_uri();
    selectTab(params.test);
    $("#source_current").text(params.source);
    $("#dst_current").text(params.destination);
    set_uri(params);

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
        var params = parse_uri();
        /* push the src and dst to the url */
        params.source = srcVal;
        params.destination = dstVal;
        set_uri(params);
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

    var params = parse_uri();
    /* make the table for the first time */
    makeTableAxis(params.source, params.destination);

    /* tells the table how often to refresh, currently 60s */
    interval = window.setInterval("reDraw()", 60000);
});

/*
 * Create an onclick handlers for the graph selection tabs that will update
 * the URL and data set, and refresh the data update period.
 */
function changeToTab(tab) {
    return function() {
        var params = parse_uri();
        params.test = tab;
        set_uri(params);
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
            //disableInteraction: true, /* if true, we can't do composite */
            disableTooltips: true,
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
            fillColor: false,
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
 * Given an information object similar to what parse_uri() returns, set the
 * current URI and push it onto the history stack.
 */
function set_uri(params) {
    var newURI = new URI();

    newURI.segment(params.prefix);
    newURI.segment(params.prefix.length, params.test);
    newURI.segment(params.prefix.length + 1, params.source);
    newURI.segment(params.prefix.length + 2, params.destination);
    save_history(newURI);
}


/*
 * Save the URI on the history stack and update the cookie to reflect it as
 * the most recent matrix URI visited.
 */
function save_history(uri) {
    History.pushState("", "", uri.resource().toString());

    /* Updates a cookie used to come back to this url from graphs page */
    $.cookie("last_Matrix", uri.resource().toString(), {
       expires : 365,
       path    : '/'
    });
}


/*
 * Parse the current URI and return an object with useful information in it
 * about what the matrix should display: test, source, destination.
 */
function parse_uri() {
    /* pull the current URL */
    var uri = window.location.href;
    var segments, prefix, index;
    var test = "latency";
    var source = "nz";
    var destination = "nz";

    uri = uri.replace("#", "");
    uri = new URI(uri);

    /* split the url path into segments */
    segments = uri.segment();

    /*
     * We only care about the last few segments that describe the matrix. It's
     * a little bit hax, but try looking for the last instance of "matrix" in
     * our segments - it should be there somewhere or we would never have got
     * to this view.
     */
    index = segments.lastIndexOf("matrix");

    if ( index >= 0 ) {
        /* split the first part of the URI from the info on what to display */
        prefix = segments.slice(0, index + 1);
        segments = segments.slice(index + 1, index + 4);

        /* purposely fall through to set the bits that aren't default values */
        switch ( segments.length ) {
            case 3:
                if ( segments[2].length > 0 ) {
                    destination = segments[2];
                }
            case 2:
                if ( segments[1].length > 0 ) {
                    source = segments[1];
                }
            case 1:
                if ( validTestType(segments[0]) ) {
                    test = segments[0];
                }
        };
    } else {
        /* How did we end up here? Try to recover semi-sensibly? */
        prefix = segments;
    }

    return {
        "test": test,
        "source": source,
        "destination": destination,
        "prefix": prefix,
    };
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
    /*if (test == "latency") {
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
    }*/
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
 * TODO deprecated
 */
function getClassForAbsoluteLatency(latency, minimum) {
    if (latency == "X") { /* untested cell */
        return "test-none";
    } else if (latency == -1) { /* no data */
        return "test-error";
    } else if (latency <= minimum) { /* The same or lower */
        return "test-colour1";
    } else if (latency < (minimum + 5)) { /* less  than min + 5ms */
        return "test-colour2";
    } else if (latency < (minimum + 10)) { /* less  than min + 10ms */
        return "test-colour3";
    } else if (latency < (minimum + 20)) { /* less  than min + 20ms */
        return "test-colour4";
    } else if (latency < (minimum + 40)) { /* less  than min + 40ms */
        return "test-colour5";
    } else if (latency < (minimum + 100)) { /* less  than min + 100ms */
        return "test-colour6";
    }
    /* more than 100ms above the daily minimum */
    return "test-colour7";
}

/*
 * Use standard deviation and mean to compare the current value and colour
 * based on how unusual the measurement is.
 */
function getClassForLatency(latency, mean, stddev) {
    if ( latency == "X" ) {
        return "test-none";
    }
    if ( latency == -1 ) {
        return "test-error";
    }
    if ( latency <= mean ) {
        return "test-colour1";//XXX why are these color and not colour?
    }
    if ( latency <= mean * (stddev * 0.5) ) {
        return "test-colour2";
    }
    if ( latency <= mean * stddev ) {
        return "test-colour3";
    }
    if ( latency <= mean * (stddev * 1.5) ) {
        return "test-colour4";
    }
    if ( latency <= mean * (stddev * 2) ) {
        return "test-colour5";
    }
    if ( latency <= mean * (stddev * 3) ) {
        return "test-colour6";
    }
    return "test-colour7";
}

function getClassForLoss(loss) {
    if ( loss == "X" ) { /* untested cell */
        return "test-none";
    } else if (loss == -1) { /* no data */
        return "test-error";
    } else if (loss == 0) { /* 0% loss  */
        return "test-colour1";
    } else if (loss < 5) { /* 0-4% loss  */
        return "test-colour2";
    } else if (loss <= 10) { /* 5-10% loss  */
        return "test-colour3";
    } else if (loss <= 20) { /* 11-20% loss  */
        return "test-colour4";
    } else if (loss <= 30) { /* 21-30% loss  */
        return "test-colour5";
    } else if (loss <= 80) { /* 31-80% loss  */
        return "test-colour6";
    }
    /* 81-100% loss */
    return "test-colour7";
}

function getClassForHops(hopcount) {
    if (hopcount == "X") { /* untested cell */
        return "test-none";
    } else if (hopcount == -1) { /* no data */
        return "test-error";
    } else if (hopcount <= 4) { /* 4 or less hops (dark green)*/
        return "test-colour1";
    } else if (hopcount <= 8) { /* 8 or less hops (light green) */
        return "test-colour2";
    } else if (hopcount <= 12) { /* 12 or less hops (yellow) */
        return "test-colour3";
    } else if (hopcount <= 16) { /* 16 or less hops (light orange) */
        return "test-colour4";
    } else if (hopcount <= 20) { /* 20 or less hops (dark orange) */
        return "test-colour5";
    } else if (hopcount <= 24) { /* 24 or less hops (red) */
        return "test-colour6";
    }
    /* greater than 16 hops (dark red) */
    return "test-colour7";
}

function getGraphLink(stream_id, graph) {
    var col = "amp-icmp";

    switch(graph) {
        case "latency":
        case "loss":
            col = "amp-icmp";
            break;
        case "hops":
            col = "amp-traceroute";
            break;
    }

    var link = jQuery('<a>').attr('href', GRAPH_URL + "/" + col + "/" +
            stream_id + '/');
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

function loadContent(cell, popover) {
    var tip = popover.tip();

    /* if there is an existing request, abort any ajax */
    if ( xhrLoadTooltip && xhrLoadTooltip != 4 ) {
        xhrLoadTooltip.abort();
    }

    var params = parse_uri();

    /* ajax request for tooltip data */
    xhrLoadTooltip = $.ajax({
        type: "GET",
        url: API_URL + "/_tooltip",
        data: {
            id: cell.id,
            test: params.test,
        },
        success: function(data) {
            var tipVisible = popover && tip && tip.is(':visible');

            /* parse the response as a JSON object */
            var jsonObject = JSON.parse(data);
            /* if it is a site, just return the description */
            if ( jsonObject.site == "true" ) {
                if ( tipVisible ) {
                    tip.find('.popover-content').html(jsonObject.site_info);
                }
            }
            /* if the data is for a cell, build the tooltip */
            else {
                var minY = 0;
                var maxY = 0;
                var maxX = Math.round((new Date()).getTime() / 1000);
                var minX = maxX - (60 * 60 * 24);
                /* loss sparkline */
                if ( jsonObject.test == "latency" ) {
                    minY = 0;
                    maxY = jsonObject.sparklineDataMax;
                } else if ( jsonObject.test == "loss" ) {
                    minY = 0;
                    maxY = 100;
                } else if ( jsonObject.test == "hops" ) {
                    minY = 0;
                    maxY = jsonObject.sparklineDataMax * 2;
                } else if ( jsonObject.test == "mtu" ) {
                    /* TODO: mtu */
                }
                /* call setSparklineTemplate with our parameters */
                setSparklineTemplate(minX, maxX, minY, maxY);
                /* store the sparkline data and mean in a global */
                sparklineData = jsonObject.sparklineData;
                /* callback with the table data */
                if ( tipVisible ) {
                    tip.find('.popover-content').html(jsonObject.tableData);
                }

                if ( !sparklineData ) {
                    return;
                }

                /*
                 * Draw all the sparklines onto the same div, composite must
                 * be false for the first one and true for all others for this
                 * to work.
                 */
                var composite = false;
                for (var series in sparklineData) {
                    if ( series.lastIndexOf("ipv4") > 0 ) {
                        sparkline_template["composite"] = composite;
                        sparkline_template["lineColor"] = "blue";
                    } else {
                        sparkline_template["composite"] = composite;
                        sparkline_template["lineColor"] = "red";
                    }
                    composite = true;
                    $("#tooltip_sparkline_combined").sparkline(
                            sparklineData[series],
                            sparkline_template);
                }
            }

            /* Reposition the popup after it has been filled with data
             * XXX This is ripped from the popover's "show" method in Bootstrap
             * - can we reduce its dependency on internal variables? */

            if ( tipVisible ) {
                var placement = typeof popover.options.placement == 'function' ?
                        popover.options.placement.call(popover, popover.$tip[0], popover.$element[0]) :
                        popover.options.placement;

                var autoToken = /\s?auto?\s?/i;
                var autoPlace = autoToken.test(placement);
                if (autoPlace)
                    placement = placement.replace(autoToken, '') || 'top';

                var pos          = popover.getPosition();
                var actualWidth  = popover.$tip[0].offsetWidth;
                var actualHeight = popover.$tip[0].offsetHeight;

                if (autoPlace) {
                    var parent = popover.$element.parent();

                    var orgPlacement = placement;
                    var docScroll    = document.documentElement.scrollTop || document.body.scrollTop;
                    var parentWidth  = popover.options.container == 'body' ? window.innerWidth  : parent.outerWidth();
                    var parentHeight = popover.options.container == 'body' ? window.innerHeight : parent.outerHeight();
                    var parentLeft   = popover.options.container == 'body' ? 0 : parent.offset().left;

                    placement = placement == 'bottom' && pos.top   + pos.height  + actualHeight - docScroll > parentHeight  ? 'top'    :
                                placement == 'top'    && pos.top   - docScroll   - actualHeight < 0                         ? 'bottom' :
                                placement == 'right'  && pos.right + actualWidth > parentWidth                              ? 'left'   :
                                placement == 'left'   && pos.left  - actualWidth < parentLeft                               ? 'right'  :
                                placement

                    popover.$tip.removeClass(orgPlacement).addClass(placement);
                }

                var calculatedOffset = popover.getCalculatedOffset(placement, pos, actualWidth, actualHeight);

                popover.applyPlacement(calculatedOffset, placement);
            }
        }
    });
}

/*
 * This function creates the table.
 * It is called once on page load, and then each time a mesh changes.
 */
function makeTable(axis) {
    /* Clean up any existing tooltips when we refresh the page.
     * This needs to be done because all of the table cells are replaced so
     * existing popover data is lost.
     * In future we should retain popover data and try to refresh any popovers
     * that are currently in the DOM (shown) */
    $('table#AMP_matrix > tbody > tr > td,' +
        'table#AMP_matrix > thead > tr > th')
    .each(function() {
        $(this).popover('destroy');
    });

    $('.popover').remove();

    /* empty the current thead element */
    $("#matrix_head").empty();
    var $thead_tr = $("<tr>");
    $thead_tr.append("<th></th>");
    for (var i = 0; i < axis.dst.length; i++) {
        var dstID = axis.dst[i];
        var dstName = getDisplayName(axis.dst[i]);
        $thead_tr.append("<th class='dstTh' id='dst__" + dstID + "'><p class='dstText'>" + dstName + "</p></th>");
    }

    $thead_tr.appendTo("#matrix_head");

    $('table#AMP_matrix > thead > tr > th').mouseenter(function() {
        $(this).addClass("cell_mouse_hover");
    }).mouseleave(function() {
        $(this).removeClass("cell_mouse_hover");
        if (xhrLoadTooltip && xhrLoadTooltip != 4) {
            xhrLoadTooltip.abort();
        }
    });

    if (matrix != null) {
        matrix.fnDestroy();
    }

    matrix = $('#AMP_matrix').dataTable({
        "bInfo": false, /* disable table information */
        "bSort": false, /* disable sorting */
        "bSortBlasses": false, /* disable the addition of sorting classes */
        "bProcessing": true, /* enabling processing indicator */
        "bAutoWidth": false, /* disable auto column width calculations */
        "oLanguage": { /* custom loading animation */
            "sProcessing": "<img src='" + STATIC_URL + "/img/ajax-loader.gif'>"
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
                    xhrLoadTooltip.abort();
                }
            });

            $('td:eq(0)', nRow).html(getDisplayName(srcNode));

            var params = parse_uri();

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
                    var escapedDst = thDstNode.replace(/\./g, "\\.");
                    $(this).addClass("cell_mouse_hover");
                    $(this).parent().find('td:eq(0)').addClass("cell_mouse_hover");
                    $("#" + escapedDst).addClass("cell_mouse_hover");
                }).mouseleave(function() {
                    var thDstNode = $('thead th:eq(' + $(this).index() + ')').attr('id');
                    var escapedDst = thDstNode.replace(/\./g, "\\.");
                    $(this).removeClass("cell_mouse_hover");
                    $(this).parent().find('td:eq(0)').removeClass("cell_mouse_hover");
                    $("#" + escapedDst).removeClass("cell_mouse_hover");
                    if (xhrLoadTooltip && xhrLoadTooltip != 4) {
                        xhrLoadTooltip.abort();
                    }
                });

                /* this is the cell element that is being updated */
                var cell = $('td:eq(' + i + ')', nRow);

                /* deal with untested data X, set it empty and grey */
                if ( aData[i][0] < 0) {
                    cell.html("");
                    cell.addClass("test-none");
                    continue;
                }

                /* looks like useful data, put it in the cell and colour it */
                var stream_id = aData[i][0];
                if ( params.test == "latency" ) {
                    var latency = aData[i][1];
                    var mean = aData[i][2];
                    var stddev = aData[i][3];
                    cell.addClass(getClassForLatency(latency, mean, stddev));
                } else if ( params.test == "loss" ) {
                    var loss = aData[i][1];
                    cell.addClass(getClassForLoss(loss));
                } else if ( params.test == "hops" ) {
                    var hops = aData[i][1];
                    cell.addClass(getClassForHops(hops));
                }
                else if ( params.test == "mtu" ) {
                    /* TODO */
                } else {
                    continue;
                }
                cell.html(getGraphLink(stream_id, params.test));
            }
            return nRow;
        },
        "sAjaxSource": API_URL + "/_matrix", /* get ajax data from this source */
        /*
         * overrides the default function for getting the data from the server,
         * so that we can pass data in the ajax request
         */
        "fnServerData": function(sSource, aoData, fnCallback) {
            var params = parse_uri();

            /* push the values into the GET data */
            aoData.push({"name": "testType", "value": params.test});
            aoData.push({"name": "source", "value": params.source});
            aoData.push({"name": "destination", "value": params.destination});

            if (xhrUpdate && xhrUpdate != 4) {
                /* abort the update if a new request comes in while the old data isn't ready */
                xhrUpdate.abort();
            }
            xhrUpdate = $.ajax({
                "dataType": "json",
                "type": "GET",
                "url": sSource,
                "data": aoData,
                "success": function(data) {
                    fnCallback(data);

                    $('table#AMP_matrix > tbody > tr > td:parent,' +
                        'table#AMP_matrix > thead > tr > th:parent')
                    .mouseenter(function() {
                        var placement = $('p', this).length > 0 ? "bottom" : "right";

                        var popover = $(this).data('bs.popover');

                        if ( !popover ) {
                            $(this).popover({
                                trigger: "manual",
                                placement: "auto " + placement,
                                content: "Loading...",
                                container: "body"
                            });

                            popover = $(this).data('bs.popover');
                        }

                        loadContent(this, popover);

                        $(this).popover('show');
                    }).mouseleave(function() {
                        $(this).popover('hide');
                    });
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
}
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
