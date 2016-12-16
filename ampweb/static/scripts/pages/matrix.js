
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
            return new LatencyMatrix(tabname);
        case 'loss':
            return new LossMatrix();
        case 'hops':
            return new HopsMatrix();
        case 'http':
            return new HttpMatrix();
        case 'httpsize':
            return new HttpPageSizeMatrix();
        case 'tput':
            return new ThroughputMatrix();
    }

    return null;
}

function getTestFromURL() {
    var segments = getURI().segment();
    segments = segments.slice(segments.indexOf("matrix"));
    
    if ( segments.length == 1 || (segments[1].length == 0) ) {
        var cookie = $.cookie("lastMatrix");

        if (cookie) {
            segments = (new URI(cookie)).segment();
            segments = segments.slice(segments.indexOf("matrix"));
        }
    }

    if (segments[1] == null || segments[1] == undefined) 
        return 'latency'

    return segments[1];
}

function updatePageURL(params) {
    
    var current = matrixTab.deconstructURL();
    var baseuri = History.getRootUrl() + current.prefix + 'matrix/';
    var newurl;
    var validurl;
    var tab;

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
    $(node).empty();

    if (ajaxMeshFetch != null && ajaxMeshFetch != 4) {
        ajaxMeshFetch.abort();
    }

    /* XXX if we need to add more special cases here, consider making
     * the testtype parameter something that is derived from the matrixTab
     * object.
     */
    if (testtype == "loss")
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
    var data = [];
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

        data.push({
            id: value.ampname,
            text: value.longname,
            selected: isSelected
        });

    });

    /* If the last selected mesh is present, automatically select it. 
     * Otherwise, select the first available mesh.
     * TODO remember last selected mesh for each test type?
     */
    if (!selthere) {
        /*
         * Only select something if there are options available otherwise the
         * dropdown looks stupid. Not selecting anything with no options leaves
         * a nice "No results found" message
         */
        if ( data.length > 0 ) {
            data[0].selected = true;
            updatePageURL({'destination':data[0].id});
        }
    } else {
        updatePageURL({'destination':newdest});
    }

    prettifySelect($(node), {
        'data': data,
        'width': '180px',
        'theme': undefined
    });
    $(node).data('select2')
        .$container.find('.select2-selection--single')
        .addClass('changeMesh-selection--single');
    $(node).data('select2')
        .$container.find('.select2-selection__rendered')
        .addClass('changeMesh-selection__rendered');
    $(node).on("select2:select", function() { changeMeshCallback(); });
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

    } else {
        params = matrixTab.deconstructURL();
   
    }
     
    matrixTabName = test;

    $('#changeMetric').val(matrixTabName + "-tab").trigger('change');

    var currentsrc = params.source;

    /* What source mesh has the user selected? */
    if ($("#changeMesh_source").find("option[value='"+currentsrc+"']").length) {
        $('#changeMesh_source').val(currentsrc).trigger('change');
    } else {
        $('#changeMesh_source').val(
            $('#changeMesh_source option:eq(0)').val()
        ).trigger('change');
    }

    if (currentsrc != params.source) {
        updatePageURL({'source': $("#changeMesh_source").val()});
    }
    /* What destination mesh has the user selected? */
    $('#changeMesh_destination').val(params.destination).trigger('change');

    $("#changeAbsRel").val(params.absrel).trigger('change');

    resetRedrawInterval();
    matrixTab.saveTabState();
    matrixTab.showMatrix();

}

function resetRedrawInterval() {
    window.clearInterval(refresh);
    refresh = window.setInterval("loadTableData()", 60000);
}

function changeMetricCallback() {
    var testid = $("#changeMetric").val().slice(0, -4);
    updatePageURL({ 'test': testid });
}

function changeAbsRelCallback() {
    var absrel = $("#changeAbsRel").val();
    updatePageURL({ 'absrel': absrel });
}

function changeMeshCallback() {
    var srcVal = $("#changeMesh_source").val();
    var dstVal = $("#changeMesh_destination").val();
    console.log(srcVal);
    updatePageURL({ 'source': srcVal, 'destination': dstVal });
}

$(document).ready(function() {
    var test = getTestFromURL();
    prettifySelect($('#changeAbsRel'), {
        'width': '100px',
        'theme': undefined
    });
    $('#changeAbsRel').data('select2')
        .$container.find('.select2-selection--single')
        .addClass('changeMesh-selection--single');
    $('#changeAbsRel').data('select2')
        .$container.find('.select2-selection__rendered')
        .addClass('changeMesh-selection__rendered');
    $('#changeAbsRel').on("select2:select", function() { changeAbsRelCallback(); });

    prettifySelect($('#changeMetric'), {
        'width': '100px',
        'theme': undefined
    });
    $('#changeMetric').data('select2')
        .$container.find('.select2-selection--single')
        .addClass('changeMesh-selection--single');
    $('#changeMetric').data('select2')
        .$container.find('.select2-selection__rendered')
        .addClass('changeMesh-selection__rendered');
    $('#changeMetric').on("select2:select", function() { changeMetricCallback(); });

    prettifySelect($('#changeMesh_source'), {
        'width': '180px',
        'theme': undefined
    });
    $('#changeMesh_source').data('select2')
        .$container.find('.select2-selection--single')
        .addClass('changeMesh-selection--single');
    $('#changeMesh_source').data('select2')
        .$container.find('.select2-selection__rendered')
        .addClass('changeMesh-selection__rendered');
    $('#changeMesh_source').on("select2:select", function() { changeMeshCallback(); });

    matrixTab = createMatrixTab(test, null);
    matrixTabName = test;
    
    $('#changeMetric').val(matrixTabName + "-tab").trigger('change');
    var urlparams = matrixTab.deconstructURL();
    var laststate = matrixTab.loadTabState();

    if (!urlparams['source'] || !urlparams['destination']) {
        laststate['test'] = matrixTabName;

        if (!laststate['source']) {
            /* Grab the first known source mesh */
            laststate['source'] = $('#changeMesh_source option:eq(0)').val();
            $('#changeMesh_source').val(laststate['source']).trigger('change');
        }
        if (!laststate['absrel']) {
            laststate['absrel'] = 'absolute';
        }
        updatePageURL(laststate);
    } else {
        stateChange();
    }
    
});
$(window).bind('statechange', stateChange);
// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

