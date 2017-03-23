#
# This file is part of amp-web.
#
# Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
#
# Authors: Shane Alcock
#          Brendon Jones
#
# All rights reserved.
#
# This code has been developed by the WAND Network Research Group at the
# University of Waikato. For further information please see
# http://www.wand.net.nz/
#
# amp-web is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 2 as
# published by the Free Software Foundation.
#
# amp-web is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with amp-web; if not, write to the Free Software Foundation, Inc.
# 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# Please report any bugs, questions or comments to contact@wand.net.nz
#

import time
import string
import random
import copy
import json
import fcntl
from pyramid.security import authenticated_userid
from ampweb.views.common import DEFAULT_EVENT_FILTER
from ampweb.views.eventparser import EventParser


AS_PAGE_SIZE = 30
EP_PAGE_SIZE = 20

GUEST_USERNAME = "AMP-WEB-GUEST"

def count_events(ampy):
    """ Count and bin at 1/2 hour intervals the number of events in a period """
    evparser = EventParser(ampy)
    return evparser.get_event_timeseries()

def count_sites(ampy):
    """ Count the number of events per site in a time period """
    evparser = EventParser(ampy)
    return evparser.get_event_sites()

def writeEventRating(filename, user, stream, evid, rating, reasonfixed,
        reasonfree):

    try:
        f = open(filename, "a+")
    except IOError as e:
        print "Failed to open file for storing event ratings (%s)" % (filename), e
        return

    # This locking is aimed at preventing two apache worker processes/threads
    # from writing to the rating file at the same time. Not really sure if it
    # works, but this should hopefully be a fairly rare case anyway.
    fcntl.lockf(f, fcntl.LOCK_EX)
    try:
        f.write("%s %s %s %s %s %s\n" % (user, stream, evid, rating, \
                reasonfixed, reasonfree))
    except IOError as e:
        print "Failed to write to file for storing event ratings (%s)" % (filename), e
    fcntl.lockf(f, fcntl.LOCK_SH)
    f.close()

def find_groups(ampy, evfilter, start, end, already):
    """ Get all the event groups within a time period """
    data = ampy.get_event_groups(start, end)
    if data is None:
        print "Error while fetching event groups"
        return None

    evparser = EventParser(ampy)
    groups, total, _, earliest = evparser.parse_event_groups(data, start, end,
            evfilter, False, already)

    return {'groups': groups, 'total': total, 'earliest': earliest}

def find_common_events(ampy, maxstreams=5):
    evparser = EventParser(ampy)
    return evparser.get_common_streams(maxstreams)

def fetch_filter(ampy, username, fname):
    if username == GUEST_USERNAME and fname == "default":
        chars = string.ascii_uppercase + string.digits
        randfiltername = ''.join(random.choice(chars) for _ in range(16))
        f = copy.deepcopy(DEFAULT_EVENT_FILTER)

        ampy.modify_event_filter("del", username, randfiltername, None)
        ampy.modify_event_filter("add", username, randfiltername,
                json.dumps(f))

        f['filtername'] = randfiltername
        return f

    evfilter = None
    while evfilter is None:
        evfilter = ampy.get_event_filter(username, fname)

        if evfilter is not None:
            f = json.loads(evfilter[2])
            break

        if username == GUEST_USERNAME:
            return DEFAULT_EVENT_FILTER

        if fname == "default":
            f = copy.deepcopy(DEFAULT_EVENT_FILTER)
            ampy.modify_event_filter("add", username, fname, json.dumps(f))
            break

        fname = "default"

    f['filtername'] = fname
    return f

def event(ampy, request):
    """ Internal event fetching API """
    start = None
    end = None
    result = []
    urlparts = request.matchdict['params']
    username = authenticated_userid(request)

    if username is None:
        username = GUEST_USERNAME


    if urlparts[1] == "filters":
        fname = urlparts[2]
        return fetch_filter(ampy, username, fname)

    if urlparts[1] == "changefilter":
        if 'filter' not in request.POST or 'name' not in request.POST:
            return None
        newfilter = request.POST['filter']
        if username is None:
            username = GUEST_USERNAME
        return ampy.modify_event_filter('update', username,
                request.POST['name'], newfilter)

    if urlparts[1] == "aslist":
        params = request.GET
        return ampy.get_matching_asns(params['page'], AS_PAGE_SIZE,
                params['term'])

    if urlparts[1] == "sourcelist":
        params = request.GET
        return ampy.get_matching_sources(params['page'], EP_PAGE_SIZE,
                params['term'])

    if urlparts[1] == "destlist":
        params = request.GET
        return ampy.get_matching_targets(params['page'], EP_PAGE_SIZE,
                params['term'])

    if urlparts[1] == "rating":
        if 'ampweb.eventratingfile' not in request.registry.settings:
            return

        if 'eventid' not in request.POST or 'rating' not in request.POST \
                or 'streamid' not in request.POST:
            return

        filename = request.registry.settings['ampweb.eventratingfile']
        evid = request.POST['eventid']
        rating = request.POST['rating']
        stream = request.POST['streamid']
        if 'reasondrop' in request.POST:
            reason1 = request.POST['reasondrop']
        else:
            reason1 = " "

        if 'reasonfree' in request.POST:
            reason2 = request.POST['reasonfree']
        else:
            reason2 = " "

        if username != GUEST_USERNAME:
            writeEventRating(filename, username, stream, evid, rating,
                    reason1, reason2)

    if urlparts[1] == "groups":
        fname = urlparts[2]
        if username is None:
            username = GUEST_USERNAME
        evfilterrow = ampy.get_event_filter(username, fname)

        if evfilterrow is None:
            evfilter = DEFAULT_EVENT_FILTER
        else:
            evfilter = json.loads(evfilterrow[2])

        alreadyfetched = 0
        if len(urlparts) == 4:
            evfilter['starttime'] = int(urlparts[3])
            evfilter['endtime'] = time.time()

        elif len(urlparts) > 4:
            evfilter['endtime'] = int(urlparts[3])
            alreadyfetched = int(urlparts[4])

        elif 'endtime' not in evfilter:
            now = time.time()
            evfilter['endtime'] = now

        if 'starttime' not in evfilter:
            evfilter['starttime'] = evfilter['endtime'] - (2 * 60 * 60)

        return find_groups(ampy, evfilter, evfilter['starttime'],
                evfilter['endtime'], alreadyfetched)

    # if it's only 4 parts then assume it's a statistic, a start time and an
    # end time, and that we are only after high level statistics, not the
    # individual events
    if len(urlparts) == 4:
        # count of events over the time period, currently with fixed 30m bins
        if urlparts[1] == "count":
            return count_events(ampy)

        # per source/target event counts for the time period, for bar graphs
        if urlparts[1] == "asns" or urlparts[1] == "target":
            return count_sites(ampy)

    # if it didn't match any of the short forms, then it has to be a longer
    # url with more information or it is invalid.
    if len(urlparts) < 4:
        return {}

    if urlparts[1] == "commons":
        start = int(urlparts[2])
        end = int(urlparts[3])
        if len(urlparts) == 4:
            return find_common_events(ampy)
        else:
            return find_common_events(ampy, int(urlparts[4]))

    try:
        datatype = urlparts[1]
        view_id = urlparts[2]
        start = int(urlparts[3])
        end = int(urlparts[4])
    except IndexError:
        return {}
    except ValueError:
        return {}

    if datatype == "amp-loss":
        datatype = "amp-latency"
        lossfilter = True
    else:
        lossfilter = False

    events = ampy.get_view_events(datatype, view_id, start, end)
    if events is None:
        print "Error while fetching events for view %s" % (view_id)
        return None

    leglabels = ampy.get_view_legend(datatype, view_id)
    if leglabels is None:
        print "Error while fetching legend labels for view %s" % (view_id)
        return None

    groups = {}

    for datapoint in events:

        if 'groupid' not in datapoint or datapoint['groupid'] is None:
            streamlabel = None
        else:
            streamlabel = None
            for ll in leglabels:
                if ll['group_id'] == datapoint['groupid']:
                    streamlabel = ll['label']
                    break

        if lossfilter and "Loss Event" not in datapoint["description"]:
            continue

        result.append({"metric_name": datapoint['metric'],
                       "tooltip": datapoint["description"],
                       "severity": datapoint["magnitude"],
                       "ts": datapoint["ts_started"] * 1000.0,
                       "grouplabel": streamlabel,
                       "eventid": datapoint['event_id'],
                       "streamid": datapoint['stream'],
                       "detectors": datapoint["detection_count"]
        })

    keys = groups.keys()
    keys.sort()

    for k in keys:
        result.append(groups[k])

    return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
