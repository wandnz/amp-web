var evrequest = false
var eventfiltering = null;
var eventfiltername = null;


function loadDashFilter(container, name) {
    /* Fetch event filtering */
    var fildef = $.getJSON(API_URL + "/_event/filters/" + name,
            function(data) {
        eventfiltering = data;
        eventfiltername = name;
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


    $.when(fildef).done(function() {
        fetchDashEvents(container, name);

        /* Enable the change filter button */
    });

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


function toggleEventType(evtype) {



}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
