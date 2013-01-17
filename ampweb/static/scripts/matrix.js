var matrix; /* the datatable */
var interval; /* the refresh interval */
var xhrUpdate; /* the ajax request object for the periodic update */
var xhrLoadTooltip; /* ajax request object for the tooltips */
var tabs; /* the jquery-ui tabs */

$(document).ready(function(){
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
            History.log(State.data, State.title, State.url);
        });
    })(window);


    /* intializes the jquery-ui tabs */
    tabs = $("#topTabs").tabs();
    
    /*
     * This function initializes the jqueryui tooltips
     * with custom content
     */
    $(function() {
        $(document).tooltip({
            items: "td, th",
            show: {
                delay: 150
            },
            content: function(callback) {
                if (xhrLoadTooltip && xhrLoadTooltip != 4) {
                    xhrLoadTooltip.abort();
                    $(".ui-tooltip").remove();
                }
                /* pull the current URL */
                var uri = window.location.href;
                uri = uri.replace("#", "");
                uri = new URI(uri);
                /* split the url path into segments */
                var segments = uri.segment();
                /* get the test type */
                var test = segments[1];
                /* get the id of this cell */
                var cellID = this.id;

                xhrLoadTooltip = $.ajax({
                    type: "GET",
                    url: "/api/_tooltip",
                    data: {
                        id: cellID,
                        test: test
                    },
                    success: function(data) {
                        /* TODO: sparklines */
                        $(".ui-tooltip").remove();
                        callback(data);
                    }
                });
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
    }
    History.pushState("", "", URI_init.resource().toString());

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

    /*
     * This is the initialization code for the dataTable
     */
    matrix = $('#AMP_matrix').dataTable({
        "bInfo": false, /* disable table information */
        "bSort": false, /* disable sorting */
        "bSortBlasses": false, /* disable the addition of sorting classes */
        "bProcessing": true, /* enabling processing indicator */
        "oLanguage": { /* custom loading animation */
            "sProcessing": "<img src='/static/img/ajax-loader.gif'>"
        },
        "bStateSave": true, /* saves user table state in a cookie */
        "bPaginate": false, /* disable pagination */
        "bFilter": false, /* disable search box */
        "fnRowCallback": function( nRow, aData, iDisplayIndex) {
            var srcNode = aData[0];
            /* add class and ID to the source nodes */
            $('td:eq(0)', nRow).attr('id', srcNode);
            $('td:eq(0)', nRow).addClass('srcNode');
            
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

            for (var i = 1; i < aData.length; i++) {
                /* get the id of the corresponding th element */
                var dstNode = $('thead th:eq(' + i + ')').attr('id');
                $('td:eq(' + i + ')', nRow).addClass('cell');
                /* add the id to each sell in the format src-to-dst */
                $('td:eq(' + i + ')', nRow).attr('id', srcNode + "__to__" + dstNode);
                /* TODO: dynamic scale */
                if (test == "latency") {
                    /* create a link to the graphs page (latency) */
                    var linkObject = jQuery('<a>').attr('href', '/graph/#' + srcNode + '/' + dstNode + '/latency/').text(aData[i]);
                    if (aData[i] == "X") { /* untested cell */
                        $('td:eq(' + i + ')', nRow).addClass('test-none');
                        $('td:eq(' + i + ')', nRow).html("");
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
                    $(".ui-tooltip").remove();
                    fnCallback(data);
                }
            });
        }
    });
    /* tells the table how often to refresh, currently 60s */
    interval = window.setInterval("reDraw()", 60000);
});

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
