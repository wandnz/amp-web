var evrequest = false
var eventfiltering = null;
var eventfiltername = null;

function postNewFilter() {
    $.post( API_URL + "/_event/changefilter/",
            {
                'name': eventfiltername,
                'filter':JSON.stringify(eventfiltering)
            })
        .fail(function(data) {
            alert("Failed to update event filter on server");
         });

}

function loadDashFilter(container, name) {
    /* Fetch event filtering */
    var fildef = $.getJSON(API_URL + "/_event/filters/" + name,
            function(data) {
        eventfiltering = data;
        eventfiltername = name;

        /* Set default event time range */
        /* XXX is this something we should be remembering? */
        eventfiltering.endtime = Math.round(new Date().getTime() / 1000);
        eventfiltering.starttime = eventfiltering.endtime - (60 * 60 * 2);

        populateFilterPanel();
        fetchDashEvents(container, name);
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
        placeholder: "Choose an AMP monitor",
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
        placeholder: "Choose an AMP target",
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
}


function toggleEventType(evtype) {

    if (eventfiltering == null)
        return;

    if (evtype == "latency-incr") {
        eventfiltering.showlatencyincr = !eventfiltering.showlatencyincr;
        setEventTypeButton("#toggleLatencyIncr", eventfiltering.showlatencyincr);
        postNewFilter();
    }

    if (evtype == "latency-decr") {
        eventfiltering.showlatencydecr = !eventfiltering.showlatencydecr;
        setEventTypeButton("#toggleLatencyDecr", eventfiltering.showlatencydecr);
        postNewFilter();
    }

    if (evtype == "route-change") {
        eventfiltering.showroutechange = !eventfiltering.showroutechange;
        setEventTypeButton("#toggleRouteChange", eventfiltering.showroutechange);
        postNewFilter();
    }


}

function setEventTypeButton(buttonid, ischecked) {

    $(buttonid).prop("checked", ischecked);
    if (ischecked)
        $(buttonid).addClass('active');
    else
        $(buttonid).removeClass('active');


}


function changeMaxEvents(newmax) {

    if (eventfiltering == null)
        return;

    if (eventfiltering.maxevents != newmax) {
        eventfiltering.maxevents = newmax;
        postNewFilter();
    }

}

function changeTimeRange(which, newdate) {

    var ts = newdate.unix();

    if (eventfiltering == null)
        return;

    if (which == "start") {
        eventfiltering.starttime = ts;
    }
    if (which == "end") {
        eventfiltering.endtime = ts;
    }
    postNewFilter();
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

    $('#maxgroups').val(eventfiltering.maxevents);
    $('#maxgroups').change(function() {
        changeMaxEvents($('#maxgroups').val());
    });

    setEventTypeButton("#toggleLatencyIncr", eventfiltering.showlatencyincr);
    setEventTypeButton("#toggleLatencyDecr", eventfiltering.showlatencydecr);
    setEventTypeButton("#toggleRouteChange", eventfiltering.showroutechange);

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
            return false;
        }
        if (idtype == 'src' && data == removeid) {
            list.splice(index, 1);
            postNewFilter();
            $("#Srcfiltershow").empty();
            showExistingSrcFilters(eventfiltering.srcincludes, "include");
            showExistingSrcFilters(eventfiltering.srcexcludes, "exclude");
            showExistingSrcFilters(eventfiltering.srchighlights, "highlight");
            return false;
        }
        if (idtype == 'dest' && data == removeid) {
            list.splice(index, 1);
            postNewFilter();
            $("#Destfiltershow").empty();
            showExistingDestFilters(eventfiltering.destincludes, "include");
            showExistingDestFilters(eventfiltering.destexcludes, "exclude");
            showExistingDestFilters(eventfiltering.desthighlights, "highlight");
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
    }

    $("#Srcfiltername").empty().trigger('change');
}

function updateASFilter() {
    var asn, asname;
    var filttype;
    var changed = false;
    var list = null;

    /* Get the new ASN and the filter type */
    asn = $("#ASfiltername").val();
    asname = $("#ASfiltername").text().trim();
    filttype = $("#ASfiltertype").val();

    if (asn == null || filttype == null)
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
    }

    $("#ASfiltername").empty().trigger('change');
}


function fetchDashEvents(container, filtername) {


    /* If this is the first page load, we'll need to grab all the filtering
     * stuff and prepare the select2 dropdowns.
     */
    if (eventfiltername == null) {
        loadDashFilter(container, filtername);
        return;
    }

    /* Once that is done, we can fetch some events until we've either run
     * out of time period or hit our max event count.
     */

    /*
     * Don't make a new request if there is one outstanding. This will
     * also catch the case where the request completes but with a non-200
     * status. Is there more checking we want to do around this?
     */
    if ( evrequest ) {
        return;
    }

    /* Note, if this is the scrollable never-ending event list, then the
     * previous conditions don't apply - just load a decent period's worth
     * and set the scroll callback.
     */

}


function getEvents(container, start, end, filtering) {

    /*
     * Don't make a new request if there is one outstanding. This will
     * also catch the case where the request completes but with a non-200
     * status. Is there more checking we want to do around this?
     */
    if ( evrequest ) {
        return;
    }

    if (filtering.maxgroups > 0) {
        $(container).empty();
    }

    var ajaxurl = API_URL + "/_event/groups/" + start + "/" + end;

    if (filtering.showcommon == true || filtering.showcommon == undefined)
        ajaxurl += "/";
    else
        ajaxurl += "/rare";

    evrequest = $.getJSON(ajaxurl, function(data) {

        for ( var i = 0; i < data.length; i++ ) {
            var group = data[i],
                groupId = group.id;

            var panel = $('<div/>');
            var heading = $('<div/>');
            var headh4 = $('<h4/>');
            var date = $('<div/>');
            var asns = $('<div/>');
            var asnsul = $('<ul/>');
            var badge = $('<div/>');
            var badgespan = $('<span/>');
            var link = $('<a/>');

            var panelclass;

            if (filtering.maxgroups != 0 && i >= filtering.maxgroups)
                break;

            if (i % 2 == 0) 
                panelclass = 'panel-colour-a';
            else
                panelclass = 'panel-colour-b';


            panel.addClass('panel panel-default ' + panelclass);
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

            link.append(badge);
            badge.addClass('pull-right headingblock');

            badge.append(badgespan);
            badgespan.addClass('badge pull-right ' + group.badgeclass);
            badgespan.html(group.event_count);

            for (var j = 0; j < group.changeicons.length; j++) {
                var iconclass = group.changeicons[j];
                var iconspan = $("<span/>");
                var icondiv = $('<div/>');

                link.append(icondiv);
                icondiv.addClass('pull-right headingblock');

                icondiv.append(iconspan);
                iconspan.addClass('groupicon glyphicon ' + iconclass);
                iconspan.attr('aria-hidden', true);
            }

            var evpanel = $('<div/>');
            var evbody = $('<div/>');
            var evul = $('<ul/>');
            panel.append(evpanel);
            evpanel.attr('id', 'events' + groupId);
            evpanel.addClass('panel-collapse collapse');
            evpanel.attr('role', 'tabpanel');
            evpanel.attr('aria-labelledby', 'heading' + groupId);

            evpanel.append(evbody);
            evbody.addClass('panel-body');

            evbody.append(evul);
            evul.attr('id', 'members_' + groupId)
                        
            for (var j = 0; j < group.events.length; j++) {
                var ev = group.events[j];
                var eventLi = $('<li/>'),
                    eventA = $('<a/>');

                evul.append(eventLi);
                eventA.attr('href', ev.href);
                eventA.html(ev.label + "<br />" + ev.description);
                eventLi.append(eventA);
            }

            /*
             * TODO would it be nice here to have some sort of marker
             * between days in this list? Would it make it easier to read?
             */

            container.append(panel);
        }
        evrequest = false;
   
        if (filtering.maxgroups > 0)
            return;
        
        /* Save last-start in a cookie for future scroll events */
        $.cookie("lastEventListScroll", start);

        if (data.length == 0)
            return;
        /* If we get here, we have no limit on fetched events so we should
         * at least try to fetch as many to enable a scrollbar. If we don't
         * have a scrollbar, we can't get scroll events to trigger future
         * fetches.
         */
        if ( $(document).height() <= $(window).height() ) {
            getEvents(container, start - period, start - 1, filtering);
        }

        

    }).fail(function(jqXHR, textStatus, errorThrown) {
        /* Don't error on user aborted requests */
        if (globalVars.unloaded || errorThrown == 'abort') {
            return;
        }
        displayAjaxAlert("Failed to fetch events", textStatus, errorThrown);
    });


}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
