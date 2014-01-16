/*
 * GLOBALS
 */
var matrix = null; /* the datatable object*/
var refresh; /* the refresh interval for the matrix*/
var xhrUpdate; /* the ajax request object for the periodic update */
var xhrLoadTooltip; /* ajax request object for the tooltips */
var sparklineData; /* the current sparkline data*/
var sparkline_template; /* the dynamic sparkline template */

/*
 * Parse the current URI and return an object with useful information in it
 * about what the matrix should display: test, source, destination.
 */
function parseURI() {
    /* split the url path into segments */
    var segments = getURI().segment();

    /* if url is empty load matrix details from cookie */
    if ( segments.length == 1 || (segments.length == 2 && segments[1].length == 0) ) {
        var cookie = $.cookie("lastMatrix");

        if ( cookie ) {
            segments = (new URI(cookie)).segment();
        }
    }

    for ( var i = 0; i <= 4; i++ ) {
        segments.push(null);
    }

    return {
        'test': (segments[1] || 'latency'),
        'source': (segments[2] || 'nzamp'),
        'destination': (segments[3] || 'nzamp')
    };
}

/*
 * Given an information object similar to what parseURI() returns, set the
 * current URI and push it onto the history stack.
 */
function updatePageURL(params) {
    var currentUrl = parseURI();
    var uri = History.getRootUrl() + 'matrix/';

    if ( params === undefined ) {
        uri += currentUrl.test + '/' + currentUrl.source + '/' +
                currentUrl.destination + '/';
    } else {
        uri += (params.test || currentUrl.test) + '/';
        uri += (params.source || currentUrl.source) + '/';
        uri += (params.destination || currentUrl.destination) + '/';
    }
    
    if ( uri != History.getState().url ) {
        var segments = getURI().segment();
        if ( segments.length == 1 ||
                (segments.length == 2 && segments[1].length == 0) ) {

            /* If the old URL was invalid, we just want to write over it without
             * creating a new state (we don't want to be able to go back to it
             * in future) */
            History.replaceState(History.getState().data,
                    History.getState().title, uri);

        } else {
            /* Otherwise add a new state */
            History.pushState("", "", uri);
        }
    }

    $.cookie("lastMatrix", uri, {
        'expires': 365,
        'path': '/'
    });
}

function stateChange() {
    /* Setup combo boxes */
    var params = parseURI();

    /* Select the current tab */
    $('ul#topTabList li.current').removeClass('current');
    $('#' + params.test + "-tab").addClass('current');

    /* What source mesh has the user selected? */
    $('#changeMesh_source ul.dd-options input').each(function(i) {
        if ( $(this).val() == params.source ) {
            $("#changeMesh_source").ddslick('select', { index: i });
        }
    });

    /* What destination mesh has the user selected? */
    $('#changeMesh_destination ul.dd-options input').each(function(i) {
        if ( $(this).val() == params.destination ) {
            $("#changeMesh_destination").ddslick('select', { index: i });
        }
    });

    resetRedrawInterval();
    abortAjaxUpdate();

    /* update the table... */
    makeTableAxis(params.source, params.destination);
}

$(document).ready(function(){
    /* Make pretty */
    $('#changeMesh_source').ddslick({
        width: '150px'
    });
    $('#changeMesh_destination').ddslick({
        width: '150px'
    });

    $('#topTabList > li > a').click(function() {
        var id = $(this).parent().attr('id');
        var tab = id.substring(0, id.length - 4);
        updatePageURL({ test: tab });
    });

    /* Update URL to ensure it's valid and includes test/source/dest */
    updatePageURL();

    $("#changeMesh_button").click(function() {
        /* get the selected source and destination */
        var srcVal = $("#changeMesh_source").data("ddslick").selectedData.value;
        var dstVal = $("#changeMesh_destination").data("ddslick").selectedData.value;
        updatePageURL({ 'source': srcVal, 'destination': dstVal });
    });

    stateChange();
});

$(window).bind('statechange', stateChange);

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
            fillColor: false
            /* showing mean + 1 standard deviation might be nice? */
            //normalRangeMin: 0,
            //normalRangeMax: 100,
    };
}

function resetRedrawInterval() {
    window.clearInterval(refresh);
    refresh = window.setInterval("matrix.fnReloadAjax()", 60000); /* currently 60 seconds */
}

function abortAjaxUpdate() {
    if (xhrUpdate && xhrUpdate != 4) {
        /* abort the update if a new request comes in while the old data isn't ready */
        xhrUpdate.abort();
    }
}


/*
 * This function takes a value, and checks it against a list
 * of valid test types, and returns true or false
 * FIXME(maybe): works, but perhaps too static?
 */
function validTestType(value) {
    if (value == "latency" || value == "absolute-latency" || value == "loss" ||
            value == "hops" || value == "mtu") {
        return true;
    }
    return false;
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

function getCellClass(metric, arr) {
    if ( metric == 'X' )
        return 'test-none';
    
    if ( metric == -1 )
        return 'test-error';

    for ( var i = 0; i < arr.length; i++ ) {
        if ( arr[i] ) {
            return 'test-colour' + (i+1); // start numbering from 1
        }
    }

    return 'test-colour7';
}

function getClassForAbsoluteLatency(latency, minimum) {
    if ( latency >= 0 )
        latency = latency / 1000;

    return getCellClass(latency, [
        /* test-colour1 */  latency <= minimum,
        /* test-colour2 */  latency < (minimum + 5),
        /* test-colour3 */  latency < (minimum + 10),
        /* test-colour4 */  latency < (minimum + 20),
        /* test-colour5 */  latency < (minimum + 40),
        /* test-colour6 */  latency < (minimum + 100)
    ]);
}

/*
 * Use standard deviation and mean to compare the current value and colour
 * based on how unusual the measurement is.
 */
function getClassForLatency(latency, mean, stddev) {
    return getCellClass(latency, [
        /* test-colour1 */  latency <= mean,
        /* test-colour2 */  latency <= mean * (stddev * 0.5),
        /* test-colour3 */  latency <= mean * stddev,
        /* test-colour4 */  latency <= mean * (stddev * 1.5),
        /* test-colour5 */  latency <= mean * (stddev * 2),
        /* test-colour6 */  latency <= mean * (stddev * 3)
    ]);
}

function getClassForLoss(loss) {
    return getCellClass(loss, [
        /* test-colour1 */  loss == 0,
        /* test-colour2 */  loss < 5,
        /* test-colour3 */  loss <= 10,
        /* test-colour4 */  loss <= 20,
        /* test-colour5 */  loss <= 30,
        /* test-colour6 */  loss <= 80
    ]);
}

function getClassForHops(hopcount) {
    return getCellClass(hopcount, [
        /* test-colour1 */  hopcount <= 4,
        /* test-colour2 */  hopcount <= 8,
        /* test-colour3 */  hopcount <= 12,
        /* test-colour4 */  hopcount <= 16,
        /* test-colour5 */  hopcount <= 20,
        /* test-colour6 */  hopcount <= 24
    ]);
}

function getGraphLink(stream_id, graph) {
    var col = "amp-icmp";

    switch(graph) {
        case "latency":
        case "absolute-latency":
        case "loss":
            col = "amp-icmp";
            break;
        case "hops":
            col = "amp-traceroute";
            break;
    }

    return $('<a/>').attr('href', GRAPH_URL+"/"+col+"/"+stream_id+'/');
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

    var params = parseURI();

    /* ajax request for tooltip data */
    xhrLoadTooltip = $.ajax({
        type: "GET",
        url: API_URL + "/_tooltip",
        data: {
            id: cell.id,
            test: (params.test == 'absolute-latency' ? 'latency' : params.test)
        },
        success: function(data) {
            var tipVisible = popover && tip && tip.is(':visible');

            /* Remove any popovers that have got stuck in an update */
            $('.popover').each(function() {
                if ($(this)[0] != tip[0])
                    $(this).detach();
            });

            /* parse the response as a JSON object */
            var jsonObject = JSON.parse(data);
            /* if it is a site, just return the description */
            if ( jsonObject.site == "true" ) {
                if ( tipVisible ) {
                    tip.find('.popover-content')
                            .html('<div>'+jsonObject.site_info+'</div>');
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

// Calculate width of text from DOM element or string. By Phil Freo <http://philfreo.com>
$.fn.textWidth = function() {
    if (!$.fn.textWidth.fakeEl) {
        // XXX we should not have to re-apply styles here in the JS
        $.fn.textWidth.fakeEl = $('<span>').hide()
                .css('font-size', '75%').css('font-weight', 'bold')
                .appendTo(document.body);
    }
    $.fn.textWidth.fakeEl.text(this.text());
    return $.fn.textWidth.fakeEl.width();
};

/*
 * This function creates the table.
 * It is called once on page load, and then each time a mesh changes.
 */
function makeTable(axis) {
    /* empty the current thead element */
    $("#matrix_head").empty();
    var $thead_tr = $("<tr>");
    $thead_tr.append("<th></th>");
    var max = 0;
    for (var i = 0; i < axis.dst.length; i++) {
        var dstID = axis.dst[i];
        var dstName = getDisplayName(axis.dst[i]);
        var th = $('<th class="dstTh" id="dst__'+dstID+'"/>');
        th.append('<p><span>' + dstName + '</span></p>');
        $thead_tr.append(th);
        max = Math.max(max, $('p span', th).textWidth());
    }
    $thead_tr.css('height', '' + (max * Math.sin(Math.PI/4)) + 'px');

    $thead_tr.appendTo("#matrix_head");
    $('.lt-ie9 table#amp-matrix tr:first-child th p').css('width', '' + max + 'px');

    $('table#amp-matrix > thead > tr > th').mouseenter(function() {
        $(this).addClass("hover");
    }).mouseleave(function() {
        $(this).removeClass("hover");
        if (xhrLoadTooltip && xhrLoadTooltip != 4) {
            xhrLoadTooltip.abort();
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

    if (matrix != null) {
        matrix.fnDestroy();
    }

    matrix = $('#amp-matrix').dataTable({
        "bInfo": false, /* disable table information */
        "bSort": false, /* disable sorting */
        "bSortBlasses": false, /* disable the addition of sorting classes */
        "bProcessing": true, /* enabling processing indicator */
        "bAutoWidth": false, /* disable auto column width calculations */
        "oLanguage": { /* custom loading animation */
            "sProcessing": ''
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
                $(this).addClass("hover");
            }).mouseleave(function() {
                $(this).removeClass("hover");
                if (xhrLoadTooltip && xhrLoadTooltip != 4) {
                    xhrLoadTooltip.abort();
                }
            });

            $('td:eq(0)', nRow).html(getDisplayName(srcNode));

            var params = parseURI();

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
                    $(this).addClass("hover");
                    $(this).parent().find('td:eq(0)').addClass("hover");
                    $("#" + escapedDst).addClass("hover");
                }).mouseleave(function() {
                    var thDstNode = $('thead th:eq(' + $(this).index() + ')').attr('id');
                    var escapedDst = thDstNode.replace(/\./g, "\\.");
                    $(this).removeClass("hover");
                    $(this).parent().find('td:eq(0)').removeClass("hover");
                    $("#" + escapedDst).removeClass("hover");
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
                if ( params.test == "latency" ||
                        params.test == "absolute-latency" ) {
                    var latency = aData[i][1];
                    var mean = aData[i][2];
                    var stddev = aData[i][3];
                    cell.addClass(
                        params.test == "latency"
                        ? getClassForLatency(latency, mean, stddev)
                        : getClassForAbsoluteLatency(latency, 0)
                    );
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
            /* Clean up any existing tooltips when we refresh the page.
             * This needs to be done because all of the table cells are replaced so
             * existing popover data is lost.
             * In future we should retain popover data and try to refresh any popovers
             * that are currently in the DOM (shown) */
            $('table#amp-matrix > tbody > tr > td,' +
                'table#amp-matrix > thead > tr > th')
            .each(function() {
                $(this).popover('destroy');
            });

            var params = parseURI();

            var test = params.test == 'absolute-latency'
                    ? 'latency' : params.test;

            /* push the values into the GET data */
            aoData.push({"name": "testType", "value": test});
            aoData.push({"name": "source", "value": params.source});
            aoData.push({"name": "destination", "value": params.destination});

            abortAjaxUpdate();
            xhrUpdate = $.ajax({
                "dataType": "json",
                "type": "GET",
                "url": sSource,
                "data": aoData,
                "success": function(data) {
                    fnCallback(data);

                    $('table#amp-matrix > tbody > tr > td:parent,' +
                        'table#amp-matrix > thead > tr > th:parent')
                    .mouseenter(function() {
                        var placement = $('p', this).length > 0 ? "bottom" : "right";

                        var popover = $(this).data('bs.popover');

                        if ( !popover ) {
                            $(this).popover({
                                trigger: "manual",
                                placement: "auto " + placement,
                                content: "<div>Loading...</div>",
                                html: true,
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
}
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
