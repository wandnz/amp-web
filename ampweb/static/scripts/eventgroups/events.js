var evrequest = false
var eventfiltering = null;
var eventfiltername = null;
var eventcontainer = null;
var fetchmore = false;
var scrolled = false;
var fetchedgroups = 0;

var dashmin = 0;
var dashmax = 0;
var oldnow;

function postNewFilter() {
    $.post( API_URL + "/_event/changefilter/",
            {
                'name': eventfiltername,
                'filter':JSON.stringify(eventfiltering)
            })
        .done(function(data) {
        })
        .fail(function(data) {
            displayAjaxAlert("Failed to update event filter on server");
         });

}

function loadDashFilter(container, name) {
    /* Fetch event filtering */
    eventcontainer = container;
    var fildef = $.getJSON(API_URL + "/_event/filters/" + name,
            function(data) {
        if (data.filtername) {
            eventfiltername = data.filtername;
            delete data['filtername'];
        } else {
            eventfiltername = name;
        }
        $.cookie('lastEventFilterName', eventfiltername);

        eventfiltering = data;
        /* Set default event time range */
        /* XXX is this something we should be remembering? */
        eventfiltering.endtime = Math.round(new Date().getTime() / 1000);
        eventfiltering.starttime = eventfiltering.endtime - (60 * 60 * 2);
        oldnow = eventfiltering.endtime;

        if (!eventfiltering.minaffected) {
            eventfiltering.minaffected = {
                'sources': 1, 'targets': 1, 'endpoints': 2
            };
        }

        postNewFilter();
        populateFilterPanel();
        fetchDashEvents(true);
    });

    $('#ASfiltername').select2({
        placeholder: "Choose an AS",
        allowClear: true,
        ajax: {
            url: API_URL + "/_event/aslist",
            dataType: "json",
            type: "GET",
            delay: 250,
            width: 'resolve',
            data: function(params) {
                return {
                    term: params.term || "",
                    page: params.page || 1
                };
            },
            processResults: function(data, params) {
                var totalasns = data.total;
                var pagesize = data.pagesize;

                params.page = params.page || 1;
                return {
                    results: data.asns,
                    pagination: {
                        more: (params.page * pagesize) < totalasns
                    }
                };
            },
            cache: true
        }
    });

    $('#Srcfiltername').select2({
        placeholder: "Choose an AMP source",
        allowClear: true,
        ajax: {
            url: API_URL + "/_event/sourcelist",
            dataType: "json",
            type: "GET",
            delay: 250,
            width: 'resolve',
            data: function(params) {
                return {
                    term: params.term || "",
                    page: params.page || 1
                };
            },
            processResults: function(data, params) {
                var totalsources = data.total;
                var pagesize = data.pagesize;

                params.page = params.page || 1;
                return {
                    results: data.sources,
                    pagination: {
                        more: (params.page * pagesize) < totalsources
                    }
                };
            },
            cache: true
        }
    });


    $('#Targetfiltername').select2({
        placeholder: "Choose an AMP destination",
        allowClear: true,
        ajax: {
            url: API_URL + "/_event/destlist",
            dataType: "json",
            type: "GET",
            delay: 250,
            width: 'resolve',
            data: function(params) {
                return {
                    term: params.term || "",
                    page: params.page || 1
                };
            },
            processResults: function(data, params) {
                var totaltargets = data.total;
                var pagesize = data.pagesize;

                params.page = params.page || 1;
                return {
                    results: data.targets,
                    pagination: {
                        more: (params.page * pagesize) < totaltargets
                    }
                };
            },
            cache: true
        }
    });


}

function toggleCommonEvents() {

    if (eventfiltering == null)
        return;
    eventfiltering.showcommon = !eventfiltering.showcommon;
    labelShowCommonButton();
    postNewFilter();
    fetchDashEvents(true);
}


function toggleEventType(evtype) {

    if (eventfiltering == null)
        return;

    if (evtype == "latency-incr") {
        eventfiltering.showlatencyincr = !eventfiltering.showlatencyincr;
        setEventTypeButton("#toggleLatencyIncr", eventfiltering.showlatencyincr);
    }

    else if (evtype == "latency-decr") {
        eventfiltering.showlatencydecr = !eventfiltering.showlatencydecr;
        setEventTypeButton("#toggleLatencyDecr", eventfiltering.showlatencydecr);
    }

    else if (evtype == "loss") {
        eventfiltering.showloss = !eventfiltering.showloss;
        setEventTypeButton("#toggleLoss", eventfiltering.showloss);
    }

    else if (evtype == "route-change") {
        eventfiltering.showroutechange = !eventfiltering.showroutechange;
        setEventTypeButton("#toggleRouteChange", eventfiltering.showroutechange);
    } else {
        return;
    }

    postNewFilter();
    fetchDashEvents(true);

}

function setEventTypeButton(buttonid, ischecked) {

    $(buttonid).prop("checked", ischecked);
    if (ischecked)
        $(buttonid).addClass('active');
    else
        $(buttonid).removeClass('active');


}

function _validateInt(num) {

    var n = ~~Number(num);
    return String(n) === num && n >= 0;
}


function changeMaxEvents(newmax) {

    if (eventfiltering == null)
        return;

    if (_validateInt(newmax)) {
        if (eventfiltering.maxevents != newmax) {
            eventfiltering.maxevents = newmax;
            postNewFilter();
            fetchDashEvents(true);
        }
    } else {
        displayAjaxAlert("Please specify a sensible number!");
    }

}

function changeMinAffected(which, newval) {

    if (eventfiltering == null)
        return;

    if (_validateInt(newval)) {

        if (which == 'sources' && eventfiltering.minaffected.sources !=
                newval) {
            eventfiltering.minaffected.sources = newval;
        }
        else if (which == 'targets' && eventfiltering.minaffected.targets !=
                newval) {
            eventfiltering.minaffected.targets = newval;
        }
        else if (which == 'endpoints' && eventfiltering.minaffected.endpoints
                    != newval) {
            eventfiltering.minaffected.endpoints = newval;
        } else {
            return;
        }

        postNewFilter();
        fetchDashEvents(true);
    } else {
        displayAjaxAlert("Please specify a sensible number!");
    }
}

function changeTimeRange(which, newdate) {

    var ts;
    var clearflag = true;
    if (!newdate)
        return;

    if (eventfiltering == null)
        return;
    ts = newdate.unix();

    if (newdate == oldnow * 1000) {
        clearflag = false;
    }
        
    if (which == "start") {
        eventfiltering.starttime = ts;
    }
    if (which == "end") {
        eventfiltering.endtime = ts;
    }
    postNewFilter();

    fetchDashEvents(clearflag);
}

function labelShowCommonButton() {

    if (eventfiltering.showcommon) {
        $('#commonbutton').prop('checked', true);
        $('#commonbuttonlabel').text('Showing Common Events');
    } else {
        $('#commonbutton').prop('checked', false);
        $('#commonbuttonlabel').text('Hiding Common Events');
    }

}

function generateFilterLabel(idtype, filtertype, id, label) {

    var outerspan, removespan, namespan;

    outerspan = $("<span/>");
    outerspan.addClass("filtered-name");

    removespan = $("<span/>");
    removespan.addClass("glyphicon glyphicon-remove filter-remove");
    removespan.on('click',
            {idtype: idtype, filtertype: filtertype, removeid: id},
            removeDashboardFilter);


    outerspan.append(removespan);

    namespan = $("<span/>");
    if (filtertype == "include")
        namespan.addClass("included-name");
    if (filtertype == "exclude")
        namespan.addClass("excluded-name");
    if (filtertype == "highlight")
        namespan.addClass("highlighted-name");

    namespan.html("&nbsp;" + label);
    outerspan.append(namespan);
    return outerspan;

}

function getDashFilterLabel(filtertype) {
    switch(filtertype) {
        case 'include':
            return "Including only events involving:";
        case 'exclude':
            return "Excluding events involving:";
        case 'highlight':
            return "Highlighting event groups containing:";
    }
    return "Unknown filtering mechanism:";
}

function showExistingASFilters(aslist, filtertype) {

    var incllabel;
    var inclp;

    if (aslist.length > 0) {
        incllabel = $("<label/>");
        inclp = $("<p/>");

        inclp.addClass("form-control-static asfilter-list");
        inclp.attr("id", "asfilter-" + filtertype);

        $.each(aslist, function(index, entry) {
            var labelspan = generateFilterLabel("as", filtertype, entry.number, entry.name);
            inclp.append(labelspan);

        });

        incllabel.html(getDashFilterLabel(filtertype));

        $('#ASfiltershow').append(incllabel);
        $('#ASfiltershow').append(inclp);
    }

}

function showExistingSrcFilters(srclist, filtertype) {

    var incllabel;
    var inclp;

    if (srclist.length > 0) {
        incllabel = $("<label/>");
        inclp = $("<p/>");

        inclp.addClass("form-control-static asfilter-list");
        inclp.attr("id", "srcfilter-" + filtertype);

        $.each(srclist, function(index, entry) {
            var labelspan = generateFilterLabel("src", filtertype, entry, entry);
            inclp.append(labelspan);

        });

        incllabel.html(getDashFilterLabel(filtertype));

        $('#Srcfiltershow').append(incllabel);
        $('#Srcfiltershow').append(inclp);
    }

}

function showExistingDestFilters(destlist, filtertype) {

    var incllabel;
    var inclp;

    if (destlist.length > 0) {
        incllabel = $("<label/>");
        inclp = $("<p/>");

        inclp.addClass("form-control-static asfilter-list");
        inclp.attr("id", "destfilter-" + filtertype);

        $.each(destlist, function(index, entry) {
            var labelspan = generateFilterLabel("dest", filtertype, entry, entry);
            inclp.append(labelspan);

        });

        incllabel.html(getDashFilterLabel(filtertype));

        $('#Destfiltershow').append(incllabel);
        $('#Destfiltershow').append(inclp);
    }

}

function populateFilterPanel() {

    if (eventfiltering == null)
        return;

    $("#dashstarttime").datetimepicker(
        { format: "ddd, MMM Do YYYY, H:mm:ss",
          showTodayButton: true,
          showClear: true,
          showClose: true,
        }
    );
    $("#dashendtime").datetimepicker(
        { format: "ddd, MMM Do YYYY, H:mm:ss",
          showTodayButton: true,
          showClear: true,
          showClose: true,
          useCurrent: false
        }
    );

    $("#dashstarttime").on("dp.change", function(e) {
        $("#dashendtime").data("DateTimePicker").minDate(e.date);
        changeTimeRange("start", e.date);
    });

    $("#dashendtime").on("dp.change", function(e) {
        $("#dashstarttime").data("DateTimePicker").maxDate(e.date);
        changeTimeRange("end", e.date);
    });

    $("#dashstarttime").data("DateTimePicker").date(moment.unix(eventfiltering.starttime));
    $("#dashendtime").data("DateTimePicker").date(moment.unix(eventfiltering.endtime));


    labelShowCommonButton();
    if (eventfiltering.showcommon) {
        $('#commonbuttonlabel').addClass('active');
    }

    // prevent pressing Enter from submitting our form
    $('form input').on('keyup keypress', function(e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode === 13) {
            e.preventDefault();
            return false;
        }
    });

    $('#maxgroups').val(eventfiltering.maxevents);
    $('#maxgroups').change(function() {
        changeMaxEvents($('#maxgroups').val());
    });

    /* If the user pushes enter while this field has focus, update
     * the value.
     */
    $('#maxgroups').on('keyup', function(e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode === 13) {
            changeMaxEvents($('#maxgroups').val());
        }
    });

    $('#minsources').val(eventfiltering.minaffected.sources);
    $('#mintargets').val(eventfiltering.minaffected.targets);
    $('#minendpoints').val(eventfiltering.minaffected.endpoints);

    $('#minsources').change(function() {
        changeMinAffected('sources', $('#minsources').val());
    });
    $('#minsources').on('keyup', function(e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode === 13) {
            changeMinAffected('sources', $('#minsources').val());
        }
    });


    $('#mintargets').change(function() {
        changeMinAffected('targets', $('#mintargets').val());
    });
    $('#mintargets').on('keyup', function(e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode === 13) {
            changeMinAffected('targets', $('#mintargets').val());
        }
    });

    $('#minendpoints').change(function() {
        changeMinAffected('endpoints', $('#minendpoints').val());
    });
    $('#minendpoints').on('keyup', function(e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode === 13) {
            changeMinAffected('endpoints', $('#minendpoints').val());
        }
    });


    if (eventfiltering.showloss == undefined)
        eventfiltering.showloss = true;

    setEventTypeButton("#toggleLatencyIncr", eventfiltering.showlatencyincr);
    setEventTypeButton("#toggleLatencyDecr", eventfiltering.showlatencydecr);
    setEventTypeButton("#toggleRouteChange", eventfiltering.showroutechange);
    setEventTypeButton("#toggleLoss", eventfiltering.showloss);

    $("#ASfiltershow").empty();
    showExistingASFilters(eventfiltering.asincludes, "include");
    showExistingASFilters(eventfiltering.asexcludes, "exclude");
    showExistingASFilters(eventfiltering.ashighlights, "highlight");

    $("#Srcfiltershow").empty();
    showExistingSrcFilters(eventfiltering.srcincludes, "include");
    showExistingSrcFilters(eventfiltering.srcexcludes, "exclude");
    showExistingSrcFilters(eventfiltering.srchighlights, "highlight");

    $("#Destfiltershow").empty();
    showExistingDestFilters(eventfiltering.destincludes, "include");
    showExistingDestFilters(eventfiltering.destexcludes, "exclude");
    showExistingDestFilters(eventfiltering.desthighlights, "highlight");


}

function removeDashboardFilter(removeevent) {

    var list = null;

    var idtype = removeevent.data.idtype;
    var filttype = removeevent.data.filtertype;
    var removeid = removeevent.data.removeid;

    if (!idtype || !filttype || !removeid)
        return;

    if (!eventfiltername || !eventfiltering)
        return;

    if (filttype == "include" && idtype == 'as')
        list = eventfiltering.asincludes;
    if (filttype == "exclude" && idtype == 'as')
        list = eventfiltering.asexcludes;
    if (filttype == "highlight" && idtype == 'as')
        list = eventfiltering.ashighlights;

    if (filttype == "include" && idtype == 'src')
        list = eventfiltering.srcincludes;
    if (filttype == "exclude" && idtype == 'src')
        list = eventfiltering.srcexcludes;
    if (filttype == "highlight" && idtype == 'src')
        list = eventfiltering.srchighlights;

    if (filttype == "include" && idtype == 'dest')
        list = eventfiltering.destincludes;
    if (filttype == "exclude" && idtype == 'dest')
        list = eventfiltering.destexcludes;
    if (filttype == "highlight" && idtype == 'dest')
        list = eventfiltering.desthighlights;


    if (!list)
        return;

    $.each(list, function(index, data) {
        if (idtype == 'as' && data.number == removeid) {
            list.splice(index, 1);
            postNewFilter();
            $("#ASfiltershow").empty();
            showExistingASFilters(eventfiltering.asincludes, "include");
            showExistingASFilters(eventfiltering.asexcludes, "exclude");
            showExistingASFilters(eventfiltering.ashighlights, "highlight");
            fetchDashEvents(true);
            return false;
        }
        if (idtype == 'src' && data == removeid) {
            list.splice(index, 1);
            postNewFilter();
            $("#Srcfiltershow").empty();
            showExistingSrcFilters(eventfiltering.srcincludes, "include");
            showExistingSrcFilters(eventfiltering.srcexcludes, "exclude");
            showExistingSrcFilters(eventfiltering.srchighlights, "highlight");
            fetchDashEvents(true);
            return false;
        }
        if (idtype == 'dest' && data == removeid) {
            list.splice(index, 1);
            postNewFilter();
            $("#Destfiltershow").empty();
            showExistingDestFilters(eventfiltering.destincludes, "include");
            showExistingDestFilters(eventfiltering.destexcludes, "exclude");
            showExistingDestFilters(eventfiltering.desthighlights, "highlight");
            fetchDashEvents(true);
            return false;
        }
    });

}

function updateDestFilter() {
    var destname;
    var filttype;
    var changed = false;
    var list = null;

    /* Get the new target and the filter type */
    destname = $("#Targetfiltername").val();
    filttype = $("#Targetfiltertype").val();

    if (destname == null || filttype == null)
        return;

    if (eventfiltername == null || eventfiltering == null)
        return;

    if (filttype == "include") {
        list = eventfiltering.destincludes;
    }

    if (filttype == "exclude") {
        list = eventfiltering.destexcludes;
    }

    if (filttype == "highlight") {
        list = eventfiltering.desthighlights;
    }

    if (list == null)
        return;


    if (list.indexOf(destname) == -1) {
        list.push(destname);
        changed = true;

    }

    if (changed) {
        postNewFilter();
        $("#Destfiltershow").empty();
        showExistingDestFilters(eventfiltering.destincludes, "include");
        showExistingDestFilters(eventfiltering.destexcludes, "exclude");
        showExistingDestFilters(eventfiltering.desthighlights, "highlight");
        fetchDashEvents(true);
    }

    $("#Destfiltername").empty().trigger('change');
}

function updateSrcFilter() {
    var srcname;
    var filttype;
    var changed = false;
    var list = null;

    /* Get the new source and the filter type */
    srcname = $("#Srcfiltername").val();
    filttype = $("#Srcfiltertype").val();

    if (srcname == null || filttype == null)
        return;

    if (eventfiltername == null || eventfiltering == null)
        return;

    if (filttype == "include") {
        list = eventfiltering.srcincludes;
    }

    if (filttype == "exclude") {
        list = eventfiltering.srcexcludes;
    }

    if (filttype == "highlight") {
        list = eventfiltering.srchighlights;
    }

    if (list == null)
        return;


    if (list.indexOf(srcname) == -1) {
        list.push(srcname);
        changed = true;

    }

    if (changed) {
        postNewFilter();
        $("#Srcfiltershow").empty();
        showExistingSrcFilters(eventfiltering.srcincludes, "include");
        showExistingSrcFilters(eventfiltering.srcexcludes, "exclude");
        showExistingSrcFilters(eventfiltering.srchighlights, "highlight");
        fetchDashEvents(true);
    }

    $("#Srcfiltername").empty().trigger('change');
}

function updateASFilter() {
    var asn, asname;
    var filttype;
    var changed = false;
    var list = null;
    var data = $("#ASfiltername").select2('data');


    asname = null;

    /* Get the new ASN and the filter type */
    asn = $("#ASfiltername").val();
    if (data[0] && data[0].text != "") {
        asname = data[0].text;
    }

    filttype = $("#ASfiltertype").val();

    if (asn == null || filttype == null || asname == null)
        return;

    if (eventfiltername == null || eventfiltering == null)
        return;

    if (filttype == "include") {
        list = eventfiltering.asincludes;
    }

    if (filttype == "exclude") {
        list = eventfiltering.asexcludes;
    }

    if (filttype == "highlight") {
        list = eventfiltering.ashighlights;
    }

    if (list == null)
        return;


    if (list.indexOf(asn) == -1) {
        list.push(
            { number: asn,
              name: asname
            });
        changed = true;

    }

    if (changed) {
        postNewFilter();
        $("#ASfiltershow").empty();
        showExistingASFilters(eventfiltering.asincludes, "include");
        showExistingASFilters(eventfiltering.asexcludes, "exclude");
        showExistingASFilters(eventfiltering.ashighlights, "highlight");
        fetchDashEvents(true);
    }

    $("#ASfiltername").empty().trigger('change');
}


function createEventPanel(group, nonhigh, earliest, panelopen) {

    var groupId = group.id;

    var panel = $('<div/>');
    var heading = $('<div/>');
    var headh4 = $('<h4/>');
    var date = $('<div/>');
    var asns = $('<div/>');
    var asnsul = $('<ul/>');
    var srcbadge = $('<div/>');
    var srcbadgespan = $('<span/>');
    var tarbadge = $('<div/>');
    var tarbadgespan = $('<span/>');
    var link = $('<a/>');

    var panelclass;

    if (group.highlight) {
        panelclass = 'panel-colour-highlight';
    }
    else if (nonhigh % 2 == 0) {
        panelclass = 'panel-colour-a';
        nonhigh += 1;
    }
    else {
        panelclass = 'panel-colour-b';
        nonhigh += 1;
    }


    panel.addClass('panel panel-default ' + panelclass);
    if (!panelopen) {
        panel.addClass('collapsed');
    }
    panel.attr('id', "grouppanel" + groupId);
    panel.attr('data-toggle', 'collapse')
        panel.attr('data-target', '#events' + groupId);
    panel.append(heading);

    heading.addClass('panel-heading collapsed ' + panelclass);

    heading.attr('role', 'tab');
    heading.attr('id', 'heading' + groupId);

    heading.append(headh4);
    headh4.addClass('panel-title eventgroupheading');
    headh4.append(link);

    link.append(date);
    date.addClass('headingblock');
    date.html(group.date);

    link.append(asns);
    asns.addClass('headingblock');

    asns.append(asnsul);
    asnsul.addClass('asnames');

    for (var j = 0; j < group.asns.length; j++) {
        var asname = group.asns[j];
        var asLi = $('<li/>');

        asnsul.append(asLi);
        asLi.html(asname);
    }

    for (var j = 0; j < group.endpoints.length; j++) {
        var epname = group.endpoints[j];
        var epLi = $('<li/>');

        asnsul.append(epLi);
        epLi.html(epname);
    }

    link.append(tarbadge);
    tarbadge.addClass('pull-right headingblock');

    tarbadge.append(tarbadgespan);
    tarbadgespan.addClass('badge pull-right ' + group.targetbadgeclass);
    tarbadgespan.html(group.target_count);
    srcbadgespan.attr('id', 'targetbadge' + group.id);
    tarbadgespan.attr('data-toggle', 'tooltip');
    tarbadgespan.attr('data-placement', 'bottom');
    tarbadgespan.attr('title', 'Targets Affected');

    link.append(srcbadge);
    srcbadge.addClass('pull-right headingblock');

    srcbadge.append(srcbadgespan);
    srcbadgespan.addClass('badge pull-right ' + group.srcbadgeclass);
    srcbadgespan.attr('id', 'srcbadge' + group.id);
    srcbadgespan.attr('data-toggle', 'tooltip');
    srcbadgespan.attr('data-placement', 'bottom');
    srcbadgespan.attr('title', 'Sources Affected');
    srcbadgespan.html(group.src_count);

    for (var j = 0; j < group.changeicons.length; j++) {
        var iconclass = group.changeicons[j];
        var iconspan = $("<span/>");
        var icondiv = $('<div/>');

        link.append(icondiv);
        icondiv.addClass('pull-right headingblock');

        icondiv.append(iconspan);
        iconspan.addClass('groupicon glyphicon ' + iconclass);
        iconspan.attr('aria-hidden', true);
        iconspan.attr('data-toggle', 'tooltip');
        iconspan.attr('data-placement', 'bottom');

        if (iconclass == 'glyphicon-random') {
            iconspan.attr('title', 'Route Changed');
        } else if (iconclass == 'glyphicon-circle-arrow-up') {
            iconspan.attr('title', 'Latency Increased');
        } else if (iconclass == 'glyphicon-circle-arrow-down') {
            iconspan.attr('title', 'Latency Decreased');
        } else if (iconclass == 'glyphicon-fire') {
            iconspan.attr('title', 'Packet Loss');
        } else {
            iconspan.attr('title', 'Unknown Event Type');
        }

    }

    var evpanel = $('<div/>');
    var evbody = $('<div/>');
    var evul = $('<ul/>');
    panel.append(evpanel);
    evpanel.attr('id', 'events' + groupId);
    evpanel.addClass('panel-collapse collapse');
    evpanel.attr('role', 'tabpanel');
    evpanel.attr('aria-labelledby', 'heading' + groupId);
    if (panelopen) {
        evpanel.attr('aria-expanded', true);
        evpanel.addClass('in');
    }

    evpanel.append(evbody);
    evbody.addClass('panel-body container');

    evbody.append(evul);
    evul.attr('id', 'members_' + groupId);

    for (var j = 0; j < group.events.length; j++) {

        var ev = group.events[j];
        var eventLi = $('<li/>'),
            eventA = $('<a/>');

        var wrapper = $('<div/>');
        var textdiv = $('<div/>');
        var ratediv = $('<div/>');
        var ratebadge = $('<span/>');
        wrapper.addClass('row eventwrapper');
        ratebadge.addClass('groupicon glyphicon glyphicon-comment');
        ratebadge.attr('aria-hidden', true);
        ratebadge.attr('data-toggle', 'tooltip');
        ratebadge.attr('data-placement', 'bottom');
        ratebadge.attr('title', 'Rate this Event');
        ratebadge.click(function(e) {
            e.stopPropagation();
            rateDashEvent(ev.stream, ev.eventid);
        });

        textdiv.addClass('eventtext-div pull-left col-md-11');
        ratediv.addClass('eventrate-div pull-right col-md-1');
        evul.append(eventLi);
        eventA.attr('href', ev.href);
        eventA.attr('target', '_blank');    // open event view in new tab
        eventA.html(ev.label + "<br />" + ev.description);
        //eventLi.append(textdiv);
        //eventLi.append(ratediv);
        eventLi.append(wrapper);
        wrapper.append(textdiv);
        wrapper.append(ratediv);
        textdiv.append(eventA);
        ratediv.append(ratebadge);
    }


    return {
        'panel': panel,
        'earliest': earliest,
        'nonhigh': nonhigh
    };
}

function fetchDashEvents(clear, endtime) {

    if ( evrequest ) {
        evrequest.abort()
        evrequest = null;
    }

    if (!eventcontainer)
        return;


    var ajaxurl = API_URL + "/_event/groups/" + eventfiltername;

    if (clear || fetchedgroups == 0) {
        $(eventcontainer).empty();
        fetchedgroups = 0;
        dashmin = 0;
        dashmax = 0;
    }

    if (!clear && !endtime) {
        if (dashmax == 0) {
            var now = Math.round(new Date().getTime() / 1000);
            ajaxurl += "/" + (now - (60 * 20));
        } else {
            ajaxurl += "/" + (dashmax - (60 * 20));
        }
    }

    if (endtime) {
        ajaxurl += "/" + endtime + "/" + fetchedgroups;
    }


    evrequest = $.getJSON(ajaxurl, function(data) {

        var nonhigh = 0;
        var earliest = 0;


        var lastgroup = null;
        var addedgroups = 0;
        for ( var i = 0; i < data.groups.length; i++ ) {
            var group = data.groups[i];
            var panelid = "#grouppanel" + group.id;
            var panelopen = false;

            if (group.ts < eventfiltering.starttime)
                continue;

            if (dashmin == 0) {
                dashmin = group.ts;
                dashmax = group.ts;
            }
            /*
             * TODO would it be nice here to have some sort of marker
             * between days in this list? Would it make it easier to read?
             */

            if ($(panelid).length && !($(panelid).hasClass("collapsed"))) {
                panelopen = true;
            }

            result = createEventPanel(group, nonhigh, earliest, panelopen);
            nonhigh = result.nonhigh;
            earliest = result.earliest;
            if (!($(panelid).length)) {
                addedgroups += 1;
                if (group.ts <= dashmin) {
                    eventcontainer.append(result.panel);
                    dashmin = group.ts;
                }
                else if (group.ts >= dashmax) {
                    eventcontainer.prepend(result.panel);
                    dashmax = group.ts;
                }
                else {
                    if (lastgroup) {
                        result.panel.insertAfter(lastgroup);
                    }
                }
            } else {
                /* Group already exists -- if it has changed, we should
                 * try to update it */

                $("#grouppanel" + group.id).replaceWith(result.panel);
            }
            lastgroup = panelid;
        }
        fetchedgroups += addedgroups;

        if (fetchedgroups == 0) {

            var msg = $('<h4/>');

            msg.addClass('empty-event-msg');
            msg.html("No events match the specified filters");
            $(eventcontainer).append(msg);

        }

        if ((eventfiltering.maxevents == 0 ||
                    fetchedgroups < eventfiltering.maxevents) &&
                    data.groups.length < data.total) {
            fetchmore = true;
            $.cookie("lastEventListScroll", data.earliest);
        } else {
            fetchmore = false;
        }
        $('[data-toggle="tooltip"]').tooltip();
        evrequest = false;

    }).fail(function(jqXHR, textStatus, errorThrown) {
        /* Don't error on user aborted requests */
        if (globalVars.unloaded || errorThrown == 'abort') {
            return;
        }
        displayAjaxAlert("Failed to fetch events", textStatus, errorThrown);
    });


}

/*
 * On every scroll event, mark the page as having scrolled. This is about
 * the bare minimum we can do in the scroll handler, so should be nice and
 * lightweight. Doing too much here would hurt performance.
 */
$(window).scroll(function() {
    scrolled = true;
});

/*
 * Check regularly if the page has scrolled and if so, check if it is near
 * the bottom of the page. If so, fetch new data. The frequency of these
 * checks is a tradeoff between performance and responsiveness.
 */
setInterval(function() {
    if ( scrolled && fetchmore) {
        scrolled = false;
        if ( $(document).height() - 50 <=
                $(window).scrollTop() + $(window).height()) {

            /* Grab our last start cookie */
            var last_start = $.cookie("lastEventListScroll");
            if (!last_start || !eventfiltername)
                return;
            fetchDashEvents(false, last_start - 1);
        }
    }
}, 500);

setInterval(function() {

    if (eventfiltering.endtime < oldnow)
        return;

    var showing = fetchedgroups;
    //var bottom_distance = $(document).height() - scrollt;
    var lastfetch = dashmin;

    eventfiltering.endtime = Math.round(new Date().getTime() / 1000);
    oldnow = eventfiltering.endtime;
    $("#dashendtime").data("DateTimePicker").date(moment.unix(eventfiltering.endtime));

}, 60000);

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
