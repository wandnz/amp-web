
var refresh;
var matrixTab = undefined;
var matrixTabName = undefined
var ajaxMeshFetch;
var firststart = true;

function createMatrixTab(tabname) {

    if (tabname == matrixTabName)
        return matrixTab;

    switch (tabname) {
        case 'latency':
        case 'loss':
        case 'absolute-latency':
            return new LatencyMatrix(tabname);
        case 'hops':
            return new HopsMatrix();
        case 'http':
            return new HttpMatrix();
        case 'tput':
            return new ThroughputMatrix();
    }

    return null;
}

function getTestFromURL() {
    var segments = getURI().segment();
    
    if ( segments.length == 1 || (segments[1].length == 0) ) {
        var cookie = $.cookie("lastMatrix");

        if (cookie) {
            segments = (new URI(cookie)).segment();
        }
    }

    if (segments[1] == null || segments[1] == undefined) 
        return 'latency'

    return segments[1];

}

function updatePageURL(params) {
    
    var baseuri = History.getRootUrl() + 'matrix/';
    var newurl;
    var validurl;
    var tab;
    var current = matrixTab.deconstructURL();

    if (params == undefined) {
        return; 
    }

    /* Check if our current URL is invalid, as we want to overwrite invalid
     * URLs in the history */
    if (matrixTab && matrixTab.isValidURL()) {
        validurl = true;
    } else {
        validurl = false;
    }

    /* If the test has changed, we'll need to use the new test type to
     * construct our next URL. Otherwise, we can carry on using the same
     * object.
     */
    if (params.test && params.test != matrixTabName) {
        tab = createMatrixTab(params.test);
    } else {
        tab = matrixTab;
    }
    
    newurl = tab.constructURL(params, current, baseuri);

    if (newurl != History.getState().url) {
        if (validurl) {
            History.pushState("", "", newurl);
        } else {
            History.replaceState(History.getState().data,
                    History.getState().title, newurl);
        }
    }

    $.cookie("lastMatrix", newurl, {
        'expires': 365,
        'path': '/'
    });

}

function loadTableData() {

    if (matrixTab == undefined)
        return;

    matrixTab.fetchTableData();

}

function fetchMatrixMeshes(testtype, selected, lastsel) {

    var node = "#changeMesh_destination";
    $(node).prop('disabled', true);
    $(node).ddslick('destroy');
    $(node).empty();

    if (ajaxMeshFetch != null && ajaxMeshFetch != 4) {
        ajaxMeshFetch.abort();
    }

    /* XXX if we need to add more special cases here, consider making
     * the testtype parameter something that is derived from the matrixTab
     * object.
     */
    if (testtype == "absolute-latency" || testtype == "loss")
        testtype = "latency"

    ajaxMeshFetch = $.ajax({
        url: API_URL + "/_matrix_mesh",
        cache: false,
        dataType: 'json',
        data: {
            testType: testtype
        },
        success: function(data) {
            updateDestinationMeshDropdown(data, selected, lastsel);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }
            displayAjaxAlert("Failed to fetch destination meshes",
                textStatus, errorThrown);
        }
    });
}

function updateDestinationMeshDropdown(meshes, selected, lastsel) {

    var node = "#changeMesh_destination";
    var selthere = false;
    var isSelected = false;
    var ddData = [];
    var newdest = undefined;

    meshes.sort();
    $.each(meshes, function(index, value) {
        if (value.ampname == selected) {
            selthere = true;
            isSelected = true;
            newdest = selected;
        } else if (!selthere && lastsel == value.ampname) {
            selthere = true;
            isSelected = true;
            newdest = lastsel;
        } else {
            isSelected = false;
        }

        ddData.push( { text: value.longname, value: value.ampname,
                selected: isSelected
        });

    });

    /* If the last selected mesh is present, automatically select it. 
     * Otherwise, select the first available mesh.
     * TODO remember last selected mesh for each test type?
     */
    if (!selthere) {
        ddData[0].selected = true;
        updatePageURL({'destination':ddData[0].value});
    } else {
        updatePageURL({'destination':newdest});
    }


    $(node).ddslick({
        data: ddData,
        width: '150px'
    });

    $(node).prop('disabled', false);

}


function stateChange() {

    var test = getTestFromURL();
    var currentdst;
    var currentsplit;
    var prev = matrixTab;
    var lasttabstate;
    var params = undefined;
   
    if (firststart || test != matrixTabName) {
        
        params = prev.deconstructURL();
        currentdst = params['destination'];
        currentsplit = params['split'];
       
        matrixTab = createMatrixTab(test);
        matrixTab.populateMetricDropdown(params['metric']);
        matrixTab.populateSplitDropdown(currentsplit);
    
        lasttabstate = matrixTab.loadTabState();
        
        if (firststart || $.inArray(test, prev.members) == -1) { 
            fetchMatrixMeshes(test, currentdst, lasttabstate['destination']);
            firststart = false;
        }

        // Change which tab is currently selected
        $('ul#topTabList li.current').removeClass('current');
        var newtab = $('#' + test + "-tab");
        newtab.addClass('current');
        
    } else {
        params = matrixTab.deconstructURL();
   
    }
     
    matrixTabName = test;

   
    var currentsrc = params.source;
    var selsource = false;

    /* What source mesh has the user selected? */
    $('#changeMesh_source ul.dd-options input').each(function(i) {
        if ( $(this).val() == currentsrc ) {
            $("#changeMesh_source").ddslick('select', { index: i });
            selsource = true;
        }
    });

    if (!selsource) {
        $("#changeMesh_source").ddslick('select', {index: 0});
    }

    if (currentsrc != params.source) {
        updatePageURL({'source': $("#changeMesh_source").data('ddslick').
                selectedData.value});
    }
    /* What destination mesh has the user selected? */
    $('#changeMesh_destination ul.dd-options input').each(function(i) {
        if ( $(this).val() == params.destination ) {
            $("#changeMesh_destination").ddslick('select', { index: i });
        }
    });
 
    resetRedrawInterval();
    matrixTab.saveTabState();    
    matrixTab.showMatrix();

}

function resetRedrawInterval() {
    window.clearInterval(refresh);
    refresh = window.setInterval("loadTableData()", 60000);
}

function tabClickCallback() {
    var id = $(this).parent().attr('id');
    var tab = id.substring(0, id.length - 4);
    
    updatePageURL({ test: tab });    
}

function changeMeshCallback() {
    var srcVal = $("#changeMesh_source").data("ddslick").selectedData.value;
    var dstVal = $("#changeMesh_destination").data("ddslick").selectedData.value;
    updatePageURL({ 'source': srcVal, 'destination': dstVal });
}

$(document).ready(function() {
    var test = getTestFromURL();
    $('#changeMesh_source').ddslick({
        width: '150px'
    });
    
    $('#topTabList > li > a').click(tabClickCallback);
    $("#changeMesh_button").click(changeMeshCallback);

    //updatePageURL({'test': getTestFromURL()});
    matrixTab = createMatrixTab(test, null);
    matrixTabName = test;
    
    var urlparams = matrixTab.deconstructURL();
    
    if (!urlparams['source'] || !urlparams['destination']) {
        var laststate = matrixTab.loadTabState();
        laststate['test'] = matrixTabName;

        if (!laststate['source']) {
            /* Grab the first known source mesh */
            $("#changeMesh_source").ddslick('select', {index: 0});
            laststate['source'] = 
                    $("#changeMesh_source").data("ddslick").selectedData.value;

        }
        updatePageURL(laststate);
    } else {
        stateChange();
    }
    
});
$(window).bind('statechange', stateChange);
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

