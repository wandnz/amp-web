/*
 * GLOBALS
 */
var matrix = null; /* the datatable object */
var refresh; /* the refresh interval for the matrix */
var ajaxTableUpdate; /* the ajax request object for the periodic update */
var ajaxPopoverUpdate; /* ajax request object for the tooltips */

/**
 * Parse the current URI and return an object with useful information in it
 * about what the matrix should display: test, source, destination.
 * @returns {Object} Parameters from the current URI (populated with defaults
 *      if not all required parameters exist)
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

/**
 * Given an information object similar to what parseURI() returns, set the
 * current URI and push it onto the history stack.
 * @param {Object} params Parameters that will replace existing URL parameters
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

/**
 * Return the page to a particular state based on the current URL.
 * This method is called when the page is first loaded, when a new state is
 * pushed onto the stack, and when an existing state is navigated to.
 */
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
    abortTableUpdate();

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

/**
 * Clear the current redraw interval and schedule a new 60 second interval
 */
function resetRedrawInterval() {
    window.clearInterval(refresh);
    refresh = window.setInterval("matrix.fnReloadAjax()", 60000);
}

/**
 * Abort an update to the matrix data table if intending to make a new request
 * before a response to a previous request is received
 */
function abortTableUpdate() {
    if (ajaxTableUpdate && ajaxTableUpdate != 4) {
        ajaxTableUpdate.abort();
    }
}

/**
 * Abort an update to a cell popover if intending to make a new request before a
 * response to a previous request is received */
function abortPopoverUpdate() {
    if ( ajaxPopoverUpdate && ajaxPopoverUpdate != 4 ) {
        ajaxPopoverUpdate.abort();
    }
}

/**
 * Check a test type against a list of valid test types
 * @param {String} value A test type (e.g. obtained from the URI)
 * @returns {Boolean} true if the given test type is valid, otherwise false
 */
function validTestType(value) {
    switch (value) {
        case 'latency':
        case 'absolute-latency':
        case 'loss':
        case 'hops':
        case 'mtu':
            return true;
    }

    return false;
}

/* --------------------------------------------------------------------------
 * Methods to determine a cell's CSS class (its colour)
 * -------------------------------------------------------------------------- */

/**
 * A helper function that iterates through a list of Boolean values and returns
 * a CSS class based on the first position in the list containing a true value
 * @param {String|Number} metric A value such as latency, loss, hop count
 * @param {Array} arr An array of Boolean values
 * @returns {String} A CSS class: either test-none, test-error or test-colour*
 *      where * is a number starting from 1
 */
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

    if ( graph == 'hops' )
        col = 'amp-traceroute';

    return $('<a/>').attr('href', GRAPH_URL+"/"+col+"/"+stream_id+'/');
}

/**
 * Trim any ampz- or www. prefix from a name for display purposes
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

/* --------------------------------------------------------------------------
 * Methods to initialise and load popovers
 * -------------------------------------------------------------------------- */

/**
 * Initialise popovers
 */
function initPopovers() {
    $('table#amp-matrix > tbody > tr > td:parent,' +
        'table#amp-matrix > thead > tr > th:parent')

    /* Unbind left over event handlers */
    .off('mouseenter').off('mouseleave')

    /* Bind new mouseenter event handler */
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

        loadPopoverContent(this.id, popover);

        $(this).popover('show');
    })

    /* Bind new mouseleave event handler */
    .mouseleave(function() {
        $(this).popover('hide');
    });
}

/**
 * Load the content of a popover with AJAX and insert it into the popover when
 * the content is received
 * @param {String} cellId The ID attribute of the cell for which we want to load
 *      a popover
 * @param {Popover} popover The popover that has been initialised for this cell
 */
function loadPopoverContent(cellId, popover) {
    abortPopoverUpdate();

    var params = parseURI();

    /* ajax request for tooltip data */
    ajaxPopoverUpdate = $.ajax({
        type: "GET",
        url: API_URL + "/_tooltip",
        data: {
            id: cellId,
            test: (params.test == 'absolute-latency' ? 'latency' : params.test)
        },
        success: function(data) {
            var tip = popover.tip();
            var tipVisible = popover && tip && tip.is(':visible');

            /* Remove any popovers that have got stuck in an update */
            $('.popover').each(function() {
                if ($(this)[0] != tip[0])
                    $(this).detach();
            });

            if ( tipVisible ) {
                /* parse the response as a JSON object */
                var jsonObject = JSON.parse(data);

                var content = tip.find('.popover-content');

                if ( jsonObject.site == "true" ) {
                    /* if it is a site, just return the description */
                    content.html('<div>' + jsonObject.site_info + '</div>');
                } else {
                    /* otherwise fill the popover with table data */
                    content.html(jsonObject.tableData);
                    /* draw the sparkline */
                    drawSparkline(jsonObject);
                }

                /* Reposition the popover since its size has changed */
                repositionPopover(popover);
            }
        }
    });
}

/**
 * Draw sparkline using data from a JSON object
 * @param {Object} jsonObject Data obtained via AJAX
 */
function drawSparkline(jsonObject) {
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

    var template = {
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

    if ( !jsonObject.sparklineData ) {
        return;
    }

    /*
     * Draw all the sparklines onto the same div, composite must
     * be false for the first one and true for all others for this
     * to work.
     */
    var composite = false;
    for ( var series in jsonObject.sparklineData ) {
        if ( jsonObject.sparklineData.hasOwnProperty(series) ) {
            if ( series.lastIndexOf("ipv4") > 0 ) {
                template["composite"] = composite;
                template["lineColor"] = "blue";
            } else {
                template["composite"] = composite;
                template["lineColor"] = "red";
            }
            composite = true;
            $("#tooltip_sparkline_combined").sparkline(
                    jsonObject.sparklineData[series], template);
        }
    }
}

/**
 * Function to reposition a popover after it has been filled with data
 * @param {Popover} popover The popover to reposition
 */
function repositionPopover(popover) {
    /* XXX This is ripped from the popover's "show" method in Bootstrap
     * - can we reduce its dependence on internal variables? */

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

/* --------------------------------------------------------------------------
 * Methods to load the main matrix table
 * -------------------------------------------------------------------------- */

/**
 * Calculate width of text from DOM element or string.
 * By Phil Freo <http://philfreo.com>
 *
 * Used to measure the width of the text in a table header so that we can take
 * an educated guess at the width of its bounding box after we've rotated it 
 */
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

/**
 * Get the table src/dst and pass it to makeTable
 */
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

/**
 * Create the table. Called once on page load and then each time a mesh changes.
 * @param {Object} axis
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
        abortPopoverUpdate();
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

    if ( matrix != null ) {
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
        "fnRowCallback": function(nRow, aData, iDisplayIndex) {
            var srcNode = aData[0];
            /* add class and ID to the source nodes */
            $('td:eq(0)', nRow).attr('id', "src__" + srcNode);
            $('td:eq(0)', nRow).addClass('srcNode');
            $('td:eq(0)', nRow).mouseenter(function() {
                $(this).addClass("hover");
            }).mouseleave(function() {
                $(this).removeClass("hover");
                abortPopoverUpdate();
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
                    abortPopoverUpdate();
                });

                /* this is the cell element that is being updated */
                var cell = $('td:eq(' + i + ')', nRow);

                /* deal with untested data X, set it empty and grey */
                if ( aData[i][0] < 0 ) {
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

            abortTableUpdate();
            ajaxTableUpdate = $.ajax({
                "dataType": "json",
                "type": "GET",
                "url": sSource,
                "data": aoData,
                "success": function(data) {
                    fnCallback(data);

                    initPopovers();
                }
            });
        }
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
