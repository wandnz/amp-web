/*
 * GLOBALS
 */
var refresh; /* the refresh interval for the matrix */
var ajaxMeshUpdate; /* the ajax request object for changing src/dst mesh */
var ajaxTableUpdate; /* the ajax request object for the periodic update */
var ajaxPopoverUpdate; /* ajax request object for the tooltips */

/* Dirty hack variables to get around the ddSlick dropdowns automatically
 * calling the selection callback on first load */
var _metricFirstLoad = true;
var _traceFirstLoad = true;
var _httpFirstLoad = true;

function saveTabMetric() {
    var currentURL = parseURI()
    var cookieid = null;
    var metric = currentURL.metric;
    var tab = currentURL.test;

    if (tab == "hop") {
        cookieid = "lastTraceMetric";
    }

    if (tab == "latency" || tab == "loss" || tab == "absolute-latency") {
        cookieid = "lastLatencyMetric";
    }

    if (tab == "http") {
        cookieid = "lastHttpMetric";
    }

    if (cookieid) {
        $.cookie(cookieid, metric, {
            'expires': 365,
            'path': '/'
        });
    }

}

function changeTabMetric(newtab) {

    if (newtab == "hops") {
        var cookie = $.cookie("lastTraceMetric");
        if (cookie)
            return cookie;
        return 'iphops';
    }

    if (newtab == "latency" || newtab == "loss" || newtab == "absolute-latency")
    {
        var cookie = $.cookie("lastLatencyMetric");
        if (cookie)
            return cookie;
        return 'tcp';
    }

    if (newtab == "http") {
        var cookie = $.cookie("lastHttpMetric");
        if (cookie)
            return cookie;
        return 'duration';
    }


    return 'none';

}
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

    for ( var i = 0; i <= 6; i++ ) {
        segments.push(null);
    }

    var testtype = segments[1] || 'latency';

    if (testtype == 'latency' || testtype == 'loss' || 
            testtype == 'absolute-latency') {
        /* TODO make this configurable */
        defaultmetric = 'icmp';
    } else if (testtype == 'hops') {
        defaultmetric = 'iphops';
    } else if (testtype == 'http') {
        defaultmetric = 'duration';
    } else {
        defaultmetric = 'none';
    }

    /* TODO make all these defaults configurable */
    return {
        'test': (segments[1] || 'latency'),
        'family': (segments[2] || 'ipv4'),
        'source': (segments[3] || 'spark'),
        'destination': (segments[4] || 'cdn'),
        'metric': (segments[5] || defaultmetric),
        'cookie': cookie !== undefined
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
        uri += currentUrl.test + '/' + currentUrl.family + '/' +
                currentUrl.source + '/' + currentUrl.destination + '/' +
                currentUrl.metric + '/';
    } else {
        uri += (params.test || currentUrl.test) + '/';
        uri += (params.family || currentUrl.family) + '/';
        uri += (params.source || currentUrl.source) + '/';
        uri += (params.destination || currentUrl.destination) + '/';
        uri += (params.metric || currentUrl.metric) + '/';
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
    var currentTab = $('#' + params.test + "-tab");
    currentTab.addClass('current');

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

    if (params.test == "latency" || params.test == "absolute-latency" ||
            params.test == "loss") {
        $('#latency_metric').show();
        $('#traceroute_metric').hide();
        $('#http_metric').hide();
        $('#latency_metric ul.dd-options input').each(function(i) {
            if ( $(this).val() == params.metric ) {
                $('#latency_metric').ddslick('select', { index: i });
            }
        })
    } else if (params.test == 'hops') {
        $('#latency_metric').hide();
        $('#traceroute_metric').show();
        $('#http_metric').hide();
        $('#traceroute_metric ul.dd-options input').each(function(i) {
            if ( $(this).val() == params.metric ) {
                $('#traceroute_metric').ddslick('select', { index: i });
            }
        })
        
    } else if (params.test == 'http') {
        $('#latency_metric').hide();
        $('#traceroute_metric').hide();
        $('#http_metric').show();
        $('#http_metric ul.dd-options input').each(function(i) {
            if ( $(this).val() == params.metric ) {
                $('#http_metric').ddslick('select', { index: i });
            }
        })
        
    } else {
        $('#latency_metric').hide();
        $('#traceroute_metric').hide();
        $('#http_metric').hide();
    }

    /* What protocol versions are we showing? */
    if (params.test != 'http') {
        $('#show_family ul.dd-options input').each(function(i) {
            if ( $(this).val() == params.family ) {
                $('#show_family').ddslick('select', { index: i });
            }
        })
    } else {
        $('#show_family').hide();
    }

    resetRedrawInterval();
    abortTableUpdate();

    /* update the table... */
    makeTableAxis(params.source, params.destination);

    /* Get the text from the current tab to use as the legend title */
    setPageTitle("AMP " + $('a', currentTab).text() + " Measurements");
}

$(document).ready(function(){
    /* Make pretty */
    $('#changeMesh_source').ddslick({
        width: '150px'
    });
    $('#changeMesh_destination').ddslick({
        width: '150px'
    });

    var params = parseURI();
    var famSelectedIndex = 0;
    var traceSelectedIndex = 0;
    var metricSelectedIndex = 0;
    var httpSelectedIndex = 0;
    
    if ( params.family == 'ipv4' ) {
        famSelectedIndex = 1;
    } else if ( params.family == 'ipv6' ) {
        famSelectedIndex = 2;
    }

    var metricSelected = 0;
    if ( params.test == "latency" || params.test == "absolute-latency" || 
            params.test == "loss") {
        $('#latency_metric').show();
        $('#traceroute_metric').hide();
        $('#http_metric').hide();

        if (params.metric == "dns") {
            metricSelectedIndex = 0;
        } else if (params.metric == "icmp") {
            metricSelectedIndex = 1;
        } else {
            metricSelectedIndex = 2;
        }
    } else if (params.test == "hops") {
        $('#traceroute_metric').show();
        $('#latency_metric').hide();
        $('#http_metric').hide();

        if (params.metric == "iphops") {
            traceSelectedIndex = 0;
        }
    } else if (params.test == "http") {
        $('#traceroute_metric').hide();
        $('#latency_metric').hide();
        $('#http_metric').show();

        if (params.metric == "duration") {
            httpSelectedIndex = 0;
        }
    } else {
        $('#latency_metric').hide();
        $('#traceroute_metric').hide();
        $('#http_metric').hide();
    }
    
    $('#latency_metric').ddslick({
        width: '100%',
        defaultSelectedIndex: metricSelectedIndex,
        onSelected: function(data) {
            if (_metricFirstLoad) {
                _metricFirstLoad = false;
                return;
            }
            var params = parseURI();
            if ( !params.cookie && 
                    data.selectedData.value != params.metric ) {
                updatePageURL({ 'metric': data.selectedData.value });
            }
        }
    });
    
    $('#traceroute_metric').ddslick({
        width: '100%',
        defaultSelectedIndex: traceSelectedIndex,
        onSelected: function(data) {
            if (_traceFirstLoad) {
                _traceFirstLoad = false;
                return;
            }
            var params = parseURI();
            if ( !params.cookie && 
                    data.selectedData.value != params.metric ) {
                updatePageURL({ 'metric': data.selectedData.value });
            }
        }
    });

    $('#http_metric').ddslick({
        width: '100%',
        defaultSelectedIndex: httpSelectedIndex,
        onSelected: function(data) {
            if (_httpFirstLoad) {
                _httpFirstLoad = false;
                return;
            }
            var params = parseURI();
            if ( !params.cookie && 
                    data.selectedData.value != params.metric ) {
                updatePageURL({ 'metric': data.selectedData.value });
            }
        }
    });

    $('#show_family').ddslick({
        width: '100%',
        defaultSelectedIndex: famSelectedIndex,
        onSelected: function(data) {
            var params = parseURI();
            if ( !params.cookie && data.selectedData.value != params.family ) {
                updatePageURL({ 'family': data.selectedData.value });
            }
        }
    });

    /* Update URL to ensure it's valid and includes test/source/dest */
    updatePageURL();

    $('#topTabList > li > a').click(function() {
        var id = $(this).parent().attr('id');
        var tab = id.substring(0, id.length - 4);
        saveTabMetric();
        var nextmetric = changeTabMetric(tab);
        updatePageURL({ test: tab, metric: nextmetric });
    });

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
    refresh = window.setInterval("loadTableData()", 60000);
}

/**
 * Abort an update to the matrix data table if intending to make a new request
 * before a response to a previous request is received
 */
function abortTableUpdate() {
    if ( ajaxMeshUpdate && ajaxMeshUpdate != 4 ) {
        ajaxMeshUpdate.abort();
    }

    if ( ajaxTableUpdate && ajaxTableUpdate != 4 ) {
        ajaxTableUpdate.abort();
    }

    stopLoading();
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
        case 'http':
        case 'mtu':
            return true;
    }

    return false;
}

/* --------------------------------------------------------------------------
 * Methods to determine a cell's CSS class (its colour)
 * -------------------------------------------------------------------------- */

/**
 * A helper function that queries the appropriate getClass...() based on its
 * input parameters
 * @param {String} test The test type (typically from the URI)
 * @param {Object} cellData Data associated with a cell in the matrix
 * @param {String} family Either ipv4 or ipv6
 * @returns {String} A CSS class if the test type is recognised (which will be
 *      either test-none, test-error or test-colour*) otherwise null 
 */
function getClassForFamily(test, cellData, family) {
    if ( test == "latency" || test == "absolute-latency" ) {
        var latency = cellData[family][1];
        var mean = cellData[family][2];
        var stddev = cellData[family][3];
        return (test == "latency"
            ? getClassForLatency(latency, mean, stddev)
            : getClassForAbsoluteLatency(latency));
    } else if ( test == "loss" ) {
        var loss = cellData[family][1];
        return getClassForLoss(loss);
    } else if ( test == "hops" ) {
        var hops = cellData[family][1];
        return getClassForHops(hops);
    } else if ( test == "http" ) {
        var duration = cellData[family][1];
        return getClassForHttp(duration);
    } else if ( test == "mtu" ) {
        /* TODO */
    }
    return null;
}

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

function getClassForAbsoluteLatency(latency) {
    if ( latency >= 0 )
        latency = latency / 1000;

    return getCellClass(latency, [
        /* test-colour1 */  latency < 5,
        /* test-colour2 */  latency < 25,
        /* test-colour2 */  latency < 50,
        /* test-colour3 */  latency < 100,
        /* test-colour4 */  latency < 200,
        /* test-colour5 */  latency < 300,
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

function getClassForHttp(duration) {

    if ( duration >= 0 )
        duration = duration / 1000;

    return getCellClass(duration, [
        duration < 0.5,
        duration < 1.0,
        duration < 2.5,
        duration < 5.0,
        duration < 7.5,
        duration < 10.0,
    ]);
}

function getClassForLoss(loss) {
    return getCellClass(loss, [
        /* test-colour1 */  loss == 0,
        /* test-colour2 */  loss <= 5,
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
    var col = "amp-latency";

    if ( graph == 'hops' )
        col = 'amp-astraceroute';

    if ( graph == "http" )
        col = 'amp-http';

    return $('<a/>').attr('href', GRAPH_URL+"/"+col+"/"+stream_id+'/');
}

/**
 * Trim any ampz- or www. prefix from a name for display purposes
 */
function getDisplayName(name) {
    if (name.search("www.") != 0) {
        name = name.replace(".amp.wand.net.nz", "");
    }
    if (name.search("ampz-") == 0) {
        return name.slice(5);
    }
    if (name.search("www.") == 0) {
        return name.slice(4);
    }
    if (name.search("http://") == 0 || name.search("https://") == 0) {
        return name.replace(/^(https?:\/\/)([^\/]+).*$/, '$2');

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
    var uri = parseURI();
    if ( validTestType(uri.test) ) {

        var thead = $('#amp-matrix thead');
        var rows = $('#amp-matrix > tbody > tr, #amp-matrix > thead > tr');

        rows.each(function() {
            var cells = $('td, th', this);
            cells.each(function(index) {

                if ( !$(this).is(':parent') )
                    return;

                /* Unbind left over event handlers */
                $(this).off('mouseenter').off('mouseleave')

                /* Bind new mouseenter event handler */
                .mouseenter(function() {
                    $(this).parent().find('td:eq(0)').addClass('hover');
                    $('th:eq(' + index + ')', thead).addClass('hover');
                    $(this).addClass('hover');

                    var position = $('p', this).length > 0 ? "bottom" : "right";

                    var popover = $(this).data('bs.popover');

                    if ( !popover ) {
                        $(this).popover({
                            trigger: "manual",
                            placement: "auto " + position,
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
                    $(this).parent().find('td:eq(0)').removeClass('hover');
                    $('th:eq(' + index + ')', thead).removeClass('hover');
                    $(this).removeClass('hover');

                    abortPopoverUpdate();

                    $(this).popover('hide');
                });

            });
        });

    }
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

    ajaxPopoverUpdate = $.ajax({
        url: API_URL + '/_tooltip',
        /* Disabling caching is necessary here but not quite ideal; it would be
         * nice if we could force site descriptions to be cached */
        cache: false,
        dataType: 'json',
        data: {
            id: cellId,
            test: (params.test == 'absolute-latency' ? 'latency' : params.test)
        },
        success: function(data) {
            var tip = popover.tip();

            /* If the popover we want to insert data into is still visible */
            if ( popover && tip && tip.is(':visible') ) {
                var content = tip.find('.popover-content');

                if ( data.site == true ) {
                    var div = $('<div/>');

                    /* if it is a site, just return info about the site */
                    var siteInfo = data.longname;
                    if ( data.location )
                        siteInfo += ' (' + data.location + ')';
                    siteInfo += "<br>" + data.ampname;

                    div.append('<p>' + siteInfo + '</p>');

                    if ( data.description &&
                            data.longname.indexOf(data.description) == -1 )
                        div.append('<p>' + data.description + '</p>');

                    content.html(div);
                } else {
                    content.empty();
                    var thead = "";

                    /* otherwise build a table for popover data */
                    $('<h4/>').appendTo(content)
                            .html('<strong>' + data.source + '</strong>' +
                                '<br />to<br />' +
                                '<strong>' + data.destination + '</strong>');
                    
                    var table = $('<table/>').appendTo(content);
                    
                    if (params.test == "http") {
                        thead = $('<thead/>').appendTo(table)
                                .append('<tr><th>Time period</th>' +
                                    '<th>Page Fetch Time</th></tr>');
                    } else {
                        thead = $('<thead/>').appendTo(table)
                                .append('<tr><th>Time period</th>' +
                                    '<th class="ipv4">IPv4</th>' +
                                    '<th class="ipv6">IPv6</th></tr>');
                    }
                    var tbody = $('<tbody/>').appendTo(table);

                    for ( var i = 0; i < data.stats.length; i++ ) {
                        /* Separate IPv4 and IPv6 values */
                        var values = data.stats[i].value.split('/');

                        if (params.test == "http") {

                            $('<tr/>').appendTo(tbody)
                                .append('<td>' + data.stats[i].label + '</td>')
                                .append('<td>' + values[0] + '</td>');
                        } else {

                            $('<tr/>').appendTo(tbody)
                                .append('<td>' + data.stats[i].label + '</td>')
                                .append('<td>' + values[0] + '</td>')
                                .append('<td>' + values[1] + '</td>');
                        }
                    }

                    var dataPointsExist = false;
                    checkDataPointsExist:
                    if ( data.sparklineData ) {
                        for ( var sid in data.sparklineData ) {
                            if ( data.sparklineData.hasOwnProperty(sid) ) {
                                /* Great, we found a series - but let's check
                                 * to make sure we have data points we can
                                 * actually plot (check at least one point is
                                 * not null) */
                                var series = data.sparklineData[sid];
                                for ( var i = 0; i < series.length; i++ ) {
                                    if ( series[i].length > 1 &&
                                            series[i][1] != null ) {
                                        dataPointsExist = true;
                                        break checkDataPointsExist;
                                    }
                                }
                            }
                        }
                    }

                    $('<h5/>').appendTo(content).html(
                        dataPointsExist
                        ? 'Last 24 hours'
                        : '<em>No data available for the last 24 hours</em>'
                    );
                    
                    if ( dataPointsExist ) {
                        /* Draw the sparkline */
                        var container = $('<div class="sparkline" />')
                                .appendTo(content);
                        drawSparkline(container, data);
                    }
                }

                /* Reposition the popover since its size has changed */
                repositionPopover(popover);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }
            var tip = popover.tip();
            if ( popover && tip && tip.is(':visible') ) {
                var errorstr = buildAjaxErrorString(
                    "Failed to fetch tooltip data",
                    textStatus,
                    errorThrown
                );
                tip.find('.popover-content')
                        .html('<div>' + errorstr + '</div>');
                repositionPopover(popover);
            }
        }
    });
}

/**
 * Draw sparkline using data from a JSON object
 * @param {Object} container A jQuery element on which to draw the sparkline
 * @param {Object} data An object containing sparkline data
 */
function drawSparkline(container, data) {
    var minY = 0;
    var maxY = 0;
    var maxX = Math.round((new Date()).getTime() / 1000);
    var minX = maxX - (60 * 60 * 24);
    /* loss sparkline */
    if ( data.test == "latency" || data.test == "absolute-latency" || 
                data.test == "http") {
        minY = 0;
        maxY = data.sparklineDataMax;
    } else if ( data.test == "loss" ) {
        minY = 0;
        maxY = 100;
    } else if ( data.test == "hops" ) {
        minY = 0;
        maxY = data.sparklineDataMax * 2;
    } else if ( data.test == "mtu" ) {
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

    if ( !data.sparklineData ) {
        return;
    }

    /*
     * Draw all the sparklines onto the same div, composite must
     * be false for the first one and true for all others for this
     * to work.
     */
    var composite = false;
    for ( var series in data.sparklineData ) {
        if ( data.sparklineData.hasOwnProperty(series) ) {
            if ( series.toLowerCase().lastIndexOf("ipv4") > 0 ) {
                template["composite"] = composite;
                template["lineColor"] = "blue";
            } else {
                template["composite"] = composite;
                template["lineColor"] = "red";
            }
            composite = true;
            container.sparkline(data.sparklineData[series], template);
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
                .css('font-size', '10.5px').css('font-weight', 'bold')
                .appendTo(document.body);
    }
    $.fn.textWidth.fakeEl.text(this.text());
    return $.fn.textWidth.fakeEl.width();
};

/**
 * Get the table src/dst and pass it to makeTable
 */
function makeTableAxis(sourceMesh, destMesh) {
    startLoading();

    ajaxMeshUpdate = $.ajax({
        url: API_URL + '/_matrix_axis',
        cache: true, /* We assume the axes won't really change */
        dataType: 'json',
        data: {
            srcMesh: sourceMesh,
            dstMesh: destMesh
        },
        success: function(data) {
            makeTable(data);
            makeLegend();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }
            displayAjaxAlert("Failed to fetch matrix description",
                textStatus, errorThrown);
        }
    });
}

/**
 * Create the table. Called once on page load and then each time a mesh changes.
 * @param {Object} axis
 */
function makeTable(axis) {
    var thead = $('#amp-matrix thead');
    var tbody = $('#amp-matrix tbody');

    /* Clean up any existing tooltips when we refresh the page.
     * This needs to be done because all of the table cells are replaced so
     * existing popover data is lost.
     * In future we should retain popover data and try to refresh any popovers
     * that are currently in the DOM (shown) */
    $('> tr > th', thead).popover('destroy');
    $('> tr > td', tbody).popover('destroy');

    thead.empty();
    tbody.empty();

    var thead_tr = $("<tr/>").appendTo(thead).append("<th/>");

    var maxTextWidth = 0;
    for ( var i = 0; i < axis.dst.length; i++ ) {
        var dst = axis.dst[i],
            dstName = getDisplayName(axis.dst[i]);
        var th = $('<th/>')
                .appendTo(thead_tr)
                .attr('id', "dst__" + dst)
                .data('destination', dst)
                .append('<p><span>' + dstName + '</span></p>');
        maxTextWidth = Math.max(maxTextWidth, $('p span', th).textWidth());
    }

    /* Make the height of the thead element equal to the height of the largest
     * bounding box out of all the rotated text elements. The text width
     * multiplied by sin PI/4 gives an approximation of the text's bounding box.
     */
    thead_tr.css('height', '' + (maxTextWidth * Math.sin(Math.PI/4)) + 'px');

    /* Hack for IE8 and below who don't support CSS transforms */
    $('.lt-ie9 table#amp-matrix tr:first-child th p')
            .css('width', '' + maxTextWidth + 'px');

    for ( var i = 0; i < axis.src.length; i++ ) {
        var src = axis.src[i];
        var srcName = getDisplayName(axis.src[i]);

        var tbody_tr = $('<tr/>').appendTo(tbody);
        var th = $('<td>' + srcName + '</td>')
                .appendTo(tbody_tr)
                .attr('id', "src__" + src)
                .data('source', src);
        for (var x = 0; x < axis.dst.length; x++) {
            tbody_tr.append('<td class="cell test-none"></td>');
        }
    }

    loadTableData();
}

/**
 * Create the legend, which is unique for each test type (latency, loss, hops,
 * etc). The legend maps colours used in the matrix to their value ranges.
 */
function makeLegend() {
    $('#colour-key > table, #colour-key > hr').remove();

    var params = parseURI();
    if ( !validTestType(params.test) )
        return;

    var table = $('<table/>').appendTo('#colour-key');

    function addRow(testClass, label) {
        var tr = $('<tr/>').appendTo(table);
        $('<td/>').appendTo(tr).text(label);
        $('<td class="cell" />').appendTo(tr).addClass(testClass);
        return tr;
    }

    if (params.test != 'http') {
        var tr = addRow('', 'IPv4');
        $('<b><span class="ipv4 test-colour1" /></b>').appendTo($('td.cell', tr));
        
        tr = addRow('', 'IPv6');
        $('<b><span class="ipv6 test-colour1" /></b>').appendTo($('td.cell', tr));
    }

    $('<hr/>').appendTo('#colour-key');

    table = $('<table/>').appendTo('#colour-key');

    /* Get the tooltip title from the current tab to use as the legend title */
    var currentTab = $('#' + params.test + '-tab a');
    var testTitle = currentTab.attr('title') || currentTab.text();
    $('<tr><th colspan="2">'+testTitle+'</th></tr>').appendTo(table);

    addRow('test-none', 'Not tested');
    addRow('test-error', 'Missing data');

    var labels = [];

    if ( params.test == 'latency' ) {
        /*
         * The mean is the mean of the last 24 hours, but I can't think of a
         * concise and accurate way to write that.
         */
        labels = [
            'Latency <= Mean',
            'L <= mean + (stddev * 0.5)',
            'L <= mean + stddev',
            'L <= mean + (stddev * 1.5)',
            'L <= mean + (stddev * 2)',
            'L <= mean + (stddev * 3)',
            'L > mean + (stddev * 3)'
        ];
    } else if ( params.test == 'absolute-latency' ) {
        labels = [
            'Latency < 5ms',
            'Latency < 25ms',
            'Latency < 50ms',
            'Latency < 100ms',
            'Latency < 200ms',
            'Latency < 300ms',
            'Latency >= 300ms'
        ];
    } else if ( params.test == 'loss' ) {
        labels = [
            '0% Loss',
            '<= 5% Loss',
            '<= 10% Loss',
            '<= 20% Loss',
            '<= 30% Loss',
            '<= 80% Loss',
            '> 80% Loss'
        ];
    } else if ( params.test == 'hops' ) {
        labels = [
            '<= 4 Hops',
            '<= 8 Hops',
            '<= 12 Hops',
            '<= 16 Hops',
            '<= 20 Hops',
            '<= 24 Hops',
            '> 24 Hops'
        ];
    } else if ( params.test == 'http' ) {
        labels = [
            'Fetch Time < 0.5 sec',
            'Fetch Time < 1.0 sec',
            'Fetch Time < 2.5 sec',
            'Fetch Time < 5.0 sec',
            'Fetch Time < 7.5 sec',
            'Fetch Time < 10 sec',
            'Fetch Time >= 10 sec',
        ];
    }

    for ( var i = 0; i < labels.length; i++ ) {
        addRow('test-colour' + (i+1), labels[i]);
    }
}

/**
 * Load data with which to populate the table through an AJAX call, and populate
 * the table in a callback. This method is called when a mesh changes, and every
 * 60 seconds (currently) to update the data in the matrix.
 */
function loadTableData() {
    var params = parseURI();

    var test = params.test;

    /* Don't even try to load something we know won't work */
    if ( !validTestType(test) )
        return;

    abortTableUpdate();
    startLoading();
    ajaxTableUpdate = $.ajax({
        url: API_URL + '/_matrix',
        cache: false,
        dataType: 'json',
        data: {
            testType: test,
            source: params.source,
            destination: params.destination,
            metric: params.metric,
        },
        success: function(data) {
            populateTable(data);
            initPopovers();
            stopLoading();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            var message = errorThrown;
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }
            
            if (textStatus == "error") {
                parsed = jQuery.parseJSON(jqXHR.responseText);
                if ("error" in parsed)
                    message = parsed['error'];
            }

            displayAjaxAlert("Failed to fetch matrix data",
                    textStatus, message);
        }
    });
}

/**
 * Populate the matrix with data.
 * @param {Object} data An object containing data returned from an AJAX response
 */
function populateTable(data) {
    var thead = $('#amp-matrix thead');
    var tbody = $('#amp-matrix tbody');

    for ( var rowIndex = 0; rowIndex < data.length; rowIndex++ ) {
        var row = $('tr:eq(' + rowIndex + ')', tbody),
            src = data[rowIndex][0];

        var params = parseURI();

        for (var colIndex = 1; colIndex < data[rowIndex].length; colIndex++) {
            var cellData = data[rowIndex][colIndex],
                cell = $('td:eq(' + colIndex + ')', row),
                dstCell = $('th:eq(' + colIndex + ')', thead);

            var viewID = cellData.both;
            var dest = dstCell.data('destination');
            cell.attr('id', viewID + "__" + src + "__" + dest);

            /* Get the stream ID for both IPv4 and IPv6 data */
            if ( viewID < 0 ) {
                cell.empty().attr('class', 'cell test-none');
                continue;
            }

            /* If we've got this far, we have either IPv4 data, IPv6 data, or
             * both. Set the cell's link to be to the graph for both: */
            if ( params.family == 'both' ||
                    (params.family == 'ipv4' && cellData.ipv4[0] >= 0) ||
                    (params.family == 'ipv6' && cellData.ipv6[0] >= 0) ) {
                cell.html(getGraphLink(viewID, params.test));
            }

            /* If the class for IPv4 is the same as IPv6, don't bother drawing
             * two separate triangles; just colour the cell itself */
            if ( cellData.ipv4[0] >= 0 && cellData.ipv6[0] >= 0 &&
                    getClassForFamily(params.test, cellData, 'ipv4') ==
                    getClassForFamily(params.test, cellData, 'ipv6')) {
                cell.attr('class', 'cell ' +
                        getClassForFamily(params.test, cellData, 'ipv4'));
                continue;
            }

            /* Should be a list of ipv4 and ipv6, or a list containing just one
             * of the two */
            var families = params.family == 'ipv4' || params.family == 'ipv6'
                    ? [ params.family ] : [ 'ipv4', 'ipv6' ];

            /* Colour the indicator for each family (either the cell itself if
             * showing only one family, or each family's triangle) */
            for ( var i = 0; i < families.length; i++ ) {
                var family = families[i];

                var indicator = cell;
                if ( families.length > 1 ) {
                    indicator = $('<span/>').addClass(family);
                    $('a', cell).append(indicator);
                }

                cell.removeClass('test-none');

                var streamID = cellData[family][0];
                /* If we have some data, style the cell accordingly */
                if ( streamID >= 0 ) {
                    indicator.addClass(
                            getClassForFamily(params.test, cellData, family));
                } else {
                    indicator.addClass('test-none');
                }
            }
        }
    }
}

function startLoading() {
    $('#loading').css('visibility', 'visible');
}

function stopLoading() {
    $('#loading').css('visibility', 'hidden');
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
