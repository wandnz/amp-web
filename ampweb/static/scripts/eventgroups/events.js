var evrequest = false

function getEvents(container, start, end, maxevents, filter) {
    /*
     * Don't make a new request if there is one outstanding. This will
     * also catch the case where the request completes but with a non-200
     * status. Is there more checking we want to do around this?
     */
    if ( evrequest ) {
        return;
    }

    if (maxevents > 0) {
        $(container).empty();
    }

    var ajaxurl = API_URL + "/_event/groups/" + start + "/" + end;

    if (filter)
        ajaxurl += "/" + filter

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

            if (maxevents != 0 && i >= maxevents)
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
   
        if (maxevents > 0)
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
            getEvents(container, start - period, start - 1, 0, filter);
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
