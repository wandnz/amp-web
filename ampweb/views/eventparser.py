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

import datetime
import re
import time
import operator
import pylibmc
from ampweb.views.common import stripASName, createEventClass, createGraphClass
from ampweb.views.common import DEFAULT_EVENT_FILTER

COMMON_EVENT_THRESHOLD = 5
GROUP_BATCH_SIZE = 20

class EventParser(object):
    def __init__(self, ampy):
        self.event_timeseries = {}
        self.site_counts = {}
        self.common_events = {}
        self.rare_events = {}
        self.allevents = set()

        self.ampy = ampy
        self.binsize = 30 * 60
        self.memcache = pylibmc.Client(
                ["127.0.0.1"],
                behaviors={
                    "tcp_nodelay": True,
                    "no_block": True,
                })
        self.mcpool = pylibmc.ThreadMappedPool(self.memcache)

    def _update_cache(self):

        with self.mcpool.reserve() as mc:
            try:
                mc.set("dashboard-event-timeseries", self.event_timeseries, 0)
            except pylibmc.SomeErrors as e:
                print "pylibmc error while storing event timeseries"
                return errorstr

            try:
                mc.set("dashboard-site-counts", self.site_counts, 0)
            except pylibmc.SomeErrors as e:
                print "pylibmc error while storing error site frequencies"
                return errorstr

            try:
                mc.set("dashboard-common-events", self.common_events, 0)
            except pylibmc.SomeErrors as e:
                print "pylibmc error while storing common event frequencies"
                return errorstr

        return None

    def _get_changeicon(self, events):
        icons = set()

        for event in events:
            evtype = event[4]
            if evtype == 'pathchange':
                icons.add('glyphicon-random')
            elif evtype == 'decr':
                icons.add('glyphicon-circle-arrow-down')
            elif evtype == 'incr':
                icons.add('glyphicon-circle-arrow-up')
            elif evtype == 'loss':
                icons.add('glyphicon-fire')
            else:
                icons.add('glyphicon-question-sign')

        return list(icons)

    def _get_event_href(self, event):
        graphclass = createEventClass(event)
        start = event["ts_started"] - (1.5 * 60 * 60)
        end = event["ts_ended"] + (0.5 * 60 * 60)

        href = "eventview/%s/%s/%d/%d" % (graphclass.get_event_graphstyle(),
                event["stream"], start, end)
        return href

    def _get_event_label(self, event, streamprops):
        start = datetime.datetime.fromtimestamp(event["ts_started"])
        label = start.strftime("%H:%M:%S")

        graphclass = createEventClass(event)
        if graphclass is None:
            label += "  Unknown collection %s" % (event['collection'])
            if 'source' in event:
                label += ", measured by %s" % (event["source"])
            return label
        return label + " " + graphclass.get_event_label(streamprops)

    def _get_event_endpoints(self, event, streamprops):

        eps = {'sources': [], 'targets': []}
        graphclass = createEventClass(event)
        if graphclass is None:
            if 'source' in event:
                eps['sources'].append(event['source'])
            return eps

        eps['sources'] += graphclass.get_event_sources(streamprops)
        eps['targets'] += graphclass.get_event_targets(streamprops)
        return eps

    def _parse_events(self, group, evfilter, groupevents):
        events = []
        summary = []
        alltraceroute = True
        groupstarted = 0

        group['source_endpoints'] = set()
        group['target_endpoints'] = set()

        for event in groupevents:
            streamprops = self.ampy.get_stream_properties(event['collection'],
                    event['stream'])

            evfilt, eveps = self._apply_event_filter(evfilter, event, group)

            if evfilt != "exclude":

                if evfilt == "highlight":
                    highlight = True
                else:
                    highlight = False

                if eveps is not None:
                    group['source_endpoints'] |= set(eveps['sources'])
                    group['target_endpoints'] |= set(eveps['targets'])

                events.insert(0, {
                    "label": self._get_event_label(event, streamprops),
                    "description": event["description"],
                    "href": self._get_event_href(event),
                    "stream": event['stream'],
                    "eventid": event['event_id'],
                    "collection": event['collection'],
                    "evtype": self._get_event_type(event, group['group_val']),
                    "ts": event['ts_started'],
                    "highlight": highlight,
                })
                if event['collection'] != 'amp-astraceroute':
                    alltraceroute = False

                summary.append((event['stream'], event['ts_started'],
                        event['event_id'], event['collection'],
                        events[0]['evtype']))
                if groupstarted == 0 or groupstarted > event['ts_started']:
                    groupstarted = event['ts_started']

        group['ts_started'] = groupstarted

        return events, summary, alltraceroute

    def _combine_icons(self, a, b):
        icons = set(a) | set(b)

        if 'glyphicon-circle-arrow-up' in icons and \
                'glyphicon-circle-arrow-down' in icons:
            icons.remove('glyphicon-circle-arrow-up')
            icons.remove('glyphicon-circle-arrow-down')

        return list(icons)

    def _can_remove_subsets(self, group, groupname, nextgroupname, newevents):

        # We can remove a group's subsets if the union of all of the
        # subsets *exactly* matches the set of events in the group, minus
        # any events that only appear in the superset group.
        #
        # In other words, could we recreate this group entirely from the
        # subsets without any subset events left over? If so, the subsets
        # probably serve no purpose -- the likely cause of the event is the
        # group that they all have in common.

        subcovered = set()
        for subset in group['subsets']:
            # The newest group isn't in mergecandidates yet, so we have to
            # pass in its name and event set
            if subset == nextgroupname:
                subcovered |= newevents
            elif subset in self.mergecandidates:
                subcovered |= self.mergecandidates[subset]['events']

        # Events that only exist in the superset group can be ignored, as
        # removing the subsets will not affect the appearance of these
        # events
        # NOTE: this only applies if the superset is not the group being
        # added right now!

        complete = False
        if nextgroupname is not None:
            evset = set()
            for event in group['events']:
                if event in newevents:
                    evset.add(event)
                if (event in self.event_map and
                        self.event_map[event] != [groupname]):
                    evset.add(event)

            if evset == group['events']:
                complete = True
        else:
            evset = group['events']
            complete = True

        if subcovered == evset:
            return True, complete
        return False, complete

    def _can_remove_superset(self, parent, parentname, possiblesubsets):

        # We can remove a superset group if all of its events are present
        # in other groups AND the union of those groups does not *exactly*
        # match the set of events for the superset group. That is, the other
        # groups contain other events that are not part of the superset group.
        #
        # Such a case would imply two separate "events" that just happened to
        # also have a third party in common for many (but not all) of the
        # observed anomalies. In that case, reporting the third party as a
        # possible cause is likely to be erroneous.

        possiblesubsets.discard(parentname)

        for event in parent['events']:
            assert(event in self.event_map)
            candidatesubs = possiblesubsets & set(self.event_map[event])
            if len(candidatesubs) == 0:
                # 'parent' is the only reference to this event so must stay
                return False

            for candidate in candidatesubs:
                # This group is not the superset, so don't remove it
                if candidate in parent['supersets']:
                    return False

        # If we get here, all of our events are covered by our subsets so
        # we can remove this superset
        return True

    def _combine_unequal_groups(self, newgroup, origgroup, newname, origname):

        newgroup['events'] |= origgroup['events']

        newgroup['fullevents'] += origgroup['fullevents']
        # TODO check for duplicates?
        newgroup['fullevents'].sort(key=operator.itemgetter('ts'),
                reverse=True)

        g = newgroup['basegroup']
        og = origgroup['basegroup']

        g['source_endpoints'] |= og['source_endpoints']
        g['target_endpoints'] |= og['target_endpoints']
        g['ts_started'] = min(g['ts_started'], og['ts_started'])
        newgroup['subsets'] = origgroup['subsets']

        # Do we need to recalc supersets, because we could still be a subset
        # just with more events?
        newgroup['supersets'] = set()
        for sup in origgroup['supersets']:

            if sup not in self.mergecandidates:
                continue

            is_super = True
            for ev in newgroup['events']:
                if ev not in self.event_map or sup not in self.event_map[ev]:
                    is_super = False

            if is_super:
                self.mergecandidates[sup]['subsets'].discard(origname)
                self.mergecandidates[sup]['subsets'].add(newname)
                newgroup['supersets'].add(sup)
            else:
                self.mergecandidates[sup]['subsets'].discard(origname)

    def _combine_equal_groups(self, newgroup, orig, events, origevents):

        asns = []
        endpoints = []

        if newgroup['grouped_by'] == 'asns':
            asns = (newgroup['group_val'].split('?')[0]).split('-')
        else:
            endpoints = [newgroup['group_val'].split('?')[0]]

        icons = self._get_changeicon(events)

        newasns = list(set(asns) | set(orig['asns']))
        neweps = list(set(endpoints) | set(orig['endpoints']))

        newgroup['asns'] = newasns

        if len(newgroup['asns']) > 0 and len(origevents) > 1:
            newgroup['endpoints'] = []
        else:
            newgroup['endpoints'] = neweps

        if 'glyphicon-question-sign' in icons:
            return

        if 'glyphicon-question-sign' in orig['changeicons']:
            newgroup['changeicons'] = icons
        else:
            newgroup['changeicons'] = self._combine_icons(icons,
                    orig['changeicons'])

    def _add_new_group(self, g, name, events, fullevents):
        asns = []
        eps = []

        if g['grouped_by'] == 'asns':
            self._update_site_counts(g, g['asns'])
        else:
            self._update_site_counts(g, g['endpoints'])
        changeicons = self._get_changeicon(events)

        self.groups.insert(0, {
            "id": g['group_id'],
            "ts_started": g['ts_started'],
            "date": self._get_datestring(g['ts_started']),
            "asns": g['asns'],
            "endpoints": g['endpoints'],
            "by": g['grouped_by'],
            "badgeclass": self._get_badgeclass(g),
            "events": fullevents,
            "event_count": len(fullevents),
            "changeicons": changeicons,
            "group_val": g["group_val"],
            "source_endpoints": g["source_endpoints"],
            "target_endpoints": g["target_endpoints"],
            "highlight": g["highlight"],
        })

    def _remove_subsets(self, group, complete):

        topurge = set()

        commonas = None
        for sset in group['subsets']:
            topurge.add(sset)

            sset_as = sset.split('?')[0].split('-')
            if commonas is None:
                commonas = sset_as
            elif len(commonas) > 0:
                newc = []
                for c in commonas:
                    if c in sset_as:
                        newc.append(c)
                commonas = newc

        if complete and commonas is not None and len(commonas) > 0 and \
                    len(group['subsets']) > 1:
            additions = "-".join(commonas) + "-"
            group['basegroup']['group_val'] = additions + group['basegroup']['group_val']
            group['basegroup']['asns'] += commonas

        if group['basegroup']['group_val'] in topurge:
            topurge.discard(group['basegroup']['group_val'])
        group['subsets'] = set()
        group['consume'] = True

        return topurge

    def _cleanse_groups(self, group, events, fullevents):
        topurge = set()
        thisgroup = {'events': set(), 'subsets': set(), 'supersets': set(),
                'consume': False, 'basegroup': group, 'fullevents': fullevents}
        nextgroupname = group['group_val']
        thisgroup['events'] = set(events)

        for name, known in self.mergecandidates.iteritems():
            # First, remove any old merging candidates
            if known['basegroup']['ts_started'] < group['ts_started'] - 300:
                topurge.add(name)
                self._add_new_group(known['basegroup'], known['events'],
                        known['fullevents'])
                continue

            asns = group['group_val'].split('?')[0].split('-')
            evtype = group['group_val'].split('?')[1].split('SRC')[0]
            knownevtype = known['basegroup']['group_val'].split('?')[1].split('SRC')[0]

            if known['events'] == thisgroup['events']:
                # Two groups with the exact same events, combine
                topurge.add(name)
                self._combine_equal_groups(group, known['basegroup'], events,
                        known['events'])
                nextgroupname = group['group_val']
                thisgroup['subsets'] = known['subsets']
                thisgroup['supersets'] = known['supersets']
                break

            if known['basegroup']['asns'] == asns and evtype == knownevtype:
                # Two groups with different events but the same AS's and
                # eventtype.
                # This can happen if an AS breaks and it contains both
                # sources and targets for AMP tests
                topurge.add(name)
                self._combine_unequal_groups(thisgroup, known,
                        group['group_val'], name)
                nextgroupname = group['group_val']
                break

        if nextgroupname is not None and nextgroupname not in topurge:
            # The newest event group is ready to be inserted
            for event in thisgroup['events']:
                if event not in self.event_map:
                    self.event_map[event] = [nextgroupname]
                else:
                    self.event_map[event].append(nextgroupname)
            self.mergecandidates[nextgroupname] = thisgroup
            g = thisgroup['basegroup']

            asns = []
            # Set the ASNs if they haven't already been set as the result
            # of merging with another group
            if g['grouped_by'] == 'asns':
                if 'asns' not in g:
                    asns = g['group_val'].split('?')[0].split('-')
                    g['asns'] = asns
            g['endpoints'] = []

            changeicons = self._get_changeicon(thisgroup['events'])

            g['changeicons'] = changeicons

        # Clean up any groups that are no longer needed as a result of
        # either being merged into other groups or because they have
        # expired.
        for p in topurge:
            if p not in self.mergecandidates:
                continue
            for event in self.mergecandidates[p]['events']:
                try:
                    self.event_map[event].remove(p)
                except ValueError:
                    pass
            if p in self.mergecandidates:
                del(self.mergecandidates[p])

    def _update_site_counts(self, group, asns):

        for site in asns:
            if site in self.site_counts:
                self.site_counts[site] += group['event_count']
            else:
                self.site_counts[site] = group['event_count']

    # XXX There is a similar function in the event cleanser code. If you
    # modify or extend this, you should probably make a similar change in
    # netevmon-python/cleanser.py!
    def _get_event_type(self, event, groupname):
        if '?' not in groupname:
            return"unknown"

        changetype = groupname.split('?')[1]
        if len(changetype) < 4:
            evtype = "unknown"
        else:
            # Either 'incr' or 'decr' should be here
            evtype = changetype[0:4]

        # If this is actually a traceroute event, override the
        # event type to be a path change
        if event['collection'] == 'amp-astraceroute':
            evtype = "pathchange"
        if event['description'].startswith("Loss Event"):
            evtype = "loss"

        return evtype

    def _update_event_frequency(self, ev, groupname):
        evtype = self._get_event_type(ev, groupname)
        key = (ev['stream'], evtype, ev['collection'])
        if key in self.common_events:
            self.common_events[key].add(ev['event_id'])
        elif key in self.rare_events:
            self.rare_events[key].add(ev['event_id'])
            if len(self.rare_events[key]) >= COMMON_EVENT_THRESHOLD:
                self.common_events[key] = self.rare_events[key]
                del self.rare_events[key]
        else:
            self.rare_events[key] = set([ev['event_id']])

    def _update_timeseries(self, events, groupval):
        for ev in events:
            if (ev['stream'], ev['event_id']) in self.allevents:
                continue

            self.allevents.add((ev['stream'], ev['event_id']))
            self._update_event_frequency(ev, groupval)
            tsbin = ev['ts_started'] - (ev['ts_started'] % self.binsize)

            if tsbin in self.event_timeseries:
                self.event_timeseries[tsbin] += 1
            else:
                self.event_timeseries[tsbin] = 1

    def _get_badgeclass(self, count):
        if count <= 5:
            return "badge-1"
        elif count <= 10:
            return "badge-2"
        elif count <= 20:
            return 'badge-3'
        return "badge-4"

    def _get_datestring(self, ts):
        dt = datetime.datetime.fromtimestamp(ts)

        if self.today.day == dt.day and self.today.month == dt.month and \
                self.today.year == dt.year:
            return dt.strftime("%H:%M:%S Today")

        if self.yesterday.day == dt.day and \
                self.yesterday.month == dt.month and \
                self.yesterday.year == dt.year:
            return dt.strftime("%H:%M:%S Yesterday")

        return dt.strftime("%H:%M:%S %a %b %d %Y")

    def _finish_time_series(self):
        now = time.time()
        nextbin = (now - 86400 - (now % self.binsize))

        while nextbin <= now:
            if nextbin not in self.event_timeseries:
                self.event_timeseries[nextbin] = 0
            nextbin += self.binsize

    def _pretty_print_asns(self, asns):
        ppasns = []
        asnames = self.ampy.get_asn_names(asns)

        if asnames is None:
            return ["AS" + x for x in asns]

        ppasns = list(set([stripASName(a, asnames, True) for a in asns]))
        return ppasns

    def get_event_sites(self):
        result = []

        with self.mcpool.reserve() as mc:
            try:
                sitecounts = mc.get('dashboard-site-counts')
                if sitecounts is None:
                    return None
            except pylibmc.SomeErrors as e:
                print "pylibmc error when searching for dashboard-site-counts: %s" % (errorstr)
                return None

        sorted_sites = sorted(sitecounts.items(), key=operator.itemgetter(1), reverse=True)

        toquery = []
        for site, count in sorted_sites[0:5]:
            if re.search('\D+', site) is None:
                toquery.append(site)
            else:
                result.append({
                    "site": site,
                    "count": count,
                    "tooltip": site
                })

        if len(toquery) > 0:
            asnames = self.ampy.get_asn_names(toquery)

            for site in toquery:
                result.append({
                    "site": "AS" + site,
                    "count": sitecounts[site],
                    "tooltip": stripASName(site, asnames, True)
                })

        result.sort(lambda x, y: y["count"] - x["count"])
        return result

    def get_common_events(self):
        with self.mcpool.reserve() as mc:
            try:
                comm = mc.get('dashboard-common-events')
                if comm is None:
                    return None
            except pylibmc.SomeErrors as e:
                print "pylibmc error when searching for dashboard-common-events: %s" % (errorstr)
                return None

        return comm

    def get_common_streams(self, maxstreams=5):
        commevents = self.get_common_events()

        if commevents is None:
            return []

        top = []
        for t in sorted(commevents, \
                key=lambda k: len(commevents[k]), reverse=True):

            if len(top) >= maxstreams:
                break

            deets = self.ampy.get_stream_properties(t[2], t[0])
            if deets is None:
                continue

            result = {}
            graphclass = createGraphClass(t[2])
            if graphclass is None:
                result['tooltip'] = 'Stream for unknown collection %s' % (t[2])
            else:
                result['tooltip'] = graphclass.get_event_label(deets)

            result['eventtype'] = t[1]
            result['count'] = len(commevents[t])

            top.append(result)

        return top

    def get_event_timeseries(self):
        result = []
        with self.mcpool.reserve() as mc:
            try:
                evts = mc.get('dashboard-event-timeseries')
                if evts is None:
                    return None
            except pylibmc.SomeErrors as e:
                print "pylibmc error when searching for dashboard-event-timeseries: %s" % (errorstr)
                return None
        tsbins = evts.keys()
        tsbins.sort()
        for ts in tsbins:
            result.append([ts * 1000, evts[ts]])
        return result

    def parse_event_groups(self, fetched, start, end, evfilter=None,
            cache=True, alreadyfetched=0):

        self.event_timeseries = {}
        self.site_counts = {}
        self.common_events = {}
        self.rare_events = {}
        self.groups = []

        self.lastts = 0
        self.mergecandidates = {}
        self.event_map = {}

        self.today = datetime.datetime.now()
        self.yesterday = datetime.datetime.now() - datetime.timedelta(hours=24)

        if evfilter is None:
            evfilter = DEFAULT_EVENT_FILTER

        total_group_count = 0

        fbin = start - (start % self.binsize)

        while fbin <= end:
            self.event_timeseries[fbin] = 0
            fbin += self.binsize

        filtered = {}

        if not cache:
            self.common_events = self.get_common_events()
            if self.common_events is None:
                self.common_events = {}


        filtered = {}
        countonly = False
        glen = 0
        earliest = 0
        maxgroups = int(evfilter['maxevents']) - alreadyfetched

        # TODO get postgres to do the descending sort for us
        fetched.sort(key=operator.itemgetter('ts_started'), reverse=True)
        for group in fetched:

            total_group_count += 1

            if countonly:
                continue

            members = self.ampy.get_event_group_members(group['group_id'])
            self._update_timeseries(members, group['group_val'])
            group['source_endpoints'] = set([])
            group['target_endpoints'] = set([])
            for ev in members:
                streamprops = self.ampy.get_stream_properties(ev['collection'],
                        ev['stream'])
                eveps = self._get_event_endpoints(ev, streamprops)

                srcs = set(eveps['sources'])
                targets = set(eveps['targets'])

                group['source_endpoints'] |= srcs
                group['target_endpoints'] |= targets

            groupcheck = self._apply_group_filter(evfilter, group)
            if groupcheck == "exclude":
                continue

            if groupcheck == "highlight":
                group['highlight'] = True
            else:
                group['highlight'] = False

            glen += 1

            events, summary, mergesubset = self._parse_events(group, evfilter,
                    members)

            if group['ts_started'] == 0:
                glen -= 1

            if int(evfilter['maxevents']) > 0 and glen >= maxgroups + 10:
                countonly = True

            if glen >= GROUP_BATCH_SIZE + 10:
                countonly = True

            filtered[(group['ts_started'], group['group_id'])] = \
                    (group, events, summary, mergesubset)


        lastep = ('foo', 0)
        keys = filtered.keys()
        keys.sort()

        for (ts, groupid) in keys:
            endpoints = []
            asns = []
            group, events, summary, mergesubset = filtered[(ts, groupid)]

            group['subsetallowed'] = mergesubset
            if group['grouped_by'] == 'asns':
                # Remove any redundant ASN groupings
                self._cleanse_groups(group, summary, events)
            else:
                eps = [group['group_val'].split('?')[0]]
                group['endpoints'] = eps
                group['asns'] = []

                if eps[0] == lastep[0] and group['ts_started'] == lastep[1]:
                    continue

                lastep = (eps[0], group['ts_started'])
                if len(events) > 1:
                    self._add_new_group(group, group['group_val'], summary,
                            events)

        for known in self.mergecandidates.itervalues():
            self._add_new_group(known['basegroup'], known['events'],
                    known['fullevents'])

        self._finish_time_series()

        self.groups.sort(key=operator.itemgetter('ts_started'), reverse=True)


        for g in self.groups:
            filtg, gstart = self.finalise_group(g)

            if gstart < earliest or earliest == 0:
                earliest = gstart

        if (cache):
            self._update_cache()

        if evfilter['maxevents'] == 0:
            maxgroups = GROUP_BATCH_SIZE

        if len(self.groups) > min(maxgroups, GROUP_BATCH_SIZE):
            self.groups = self.groups[:min(maxgroups, GROUP_BATCH_SIZE)]

        return self.groups, total_group_count, len(self.allevents), earliest

    def _include_exclude(self, members, includes, excludes, highlights):

        incls = set(includes)
        excls = set(excludes)
        highs = set(highlights)

        if len(members & excls) != 0:
            return "exclude"

        if len(incls) > 0 and len(incls & members) == 0:
            return "exclude"

        if len(members & highs) != 0:
            return "highlight"

        return "include"

    def _apply_event_filter(self, evfilter, ev, group):

        evtype = self._get_event_type(ev, group['group_val'])
        highlight = False

        if evtype == 'pathchange':
            if "showroutechange" in evfilter and not evfilter['showroutechange']:
                return "exclude", None

        if evtype == "incr":
            if "showlatencyincr" in evfilter and not evfilter['showlatencyincr']:
                return "exclude", None

        if evtype == "decr":
            if "showlatencydecr" in evfilter and not evfilter['showlatencydecr']:
                return "exclude", None

        if evtype == "loss":
            if 'showloss' in evfilter and not evfilter['showloss']:
                return "exclude", None

        if self.common_events is not None:
            if (ev['stream'], evtype, ev['collection']) in self.common_events:
                if not evfilter['showcommon']:
                    return "exclude", None

        streamprops = self.ampy.get_stream_properties(ev['collection'],
                ev['stream'])
        eveps = self._get_event_endpoints(ev, streamprops)

        srcs = set(eveps['sources'])
        targets = set(eveps['targets'])

        srccheck = self._include_exclude(srcs, evfilter['srcincludes'],
                evfilter['srcexcludes'], evfilter['srchighlights'])

        if srccheck == "exclude":
            return srccheck, None

        if srccheck == "highlight":
            highlight = True

        dstcheck = self._include_exclude(targets, evfilter['destincludes'],
                evfilter['destexcludes'], evfilter['desthighlights'])
        if dstcheck == "exclude":
            return dstcheck, None

        if dstcheck == "highlight":
            highlight = True

        if highlight:
            return "highlight", eveps

        return "include", eveps

    def _apply_group_filter(self, evfilter, group):
        highlight = False
        asns = set(group['group_val'].split('?')[0].split('-'))
        incls = set([x['number'] for x in evfilter['asincludes']])
        excls = set([x['number'] for x in evfilter['asexcludes']])
        highs = set([x['number'] for x in evfilter['ashighlights']])

        asncheck = self._include_exclude(asns, incls, excls, highs)

        if asncheck == "exclude":
            return "exclude"
        if asncheck == "highlight":
            highlight = True

        # check endpoint counters
        if len(group['source_endpoints']) < int(evfilter['minaffected']['sources']):
            return "exclude"

        if len(group['target_endpoints']) < int(evfilter['minaffected']['targets']):
            return "exclude"

        if len(group['target_endpoints']) + len(group['source_endpoints']) < int(evfilter['minaffected']['endpoints']):
            return "exclude"

        if highlight:
            return "highlight"
        return "include"

    def finalise_group(self, g):
        group['asns'] = self._pretty_print_asns(group['asns'])

        newevents = []
        newgroupstart = None
        summary = []
        highlight = g['highlight']

        for event in group['events']:
            newevents.append({
                    'href': event['href'], \
                    'description': event['description'],
                    'label': event['label'],
                    'stream': event['stream'],
                    'eventid': event['eventid']
                    })
            summary.append((event['stream'], event['ts'], \
                    0, event['collection'],
                    self._get_event_type(event, group['group_val'])))

            if newgroupstart is None or event['ts'] < newgroupstart:
                newgroupstart = event['ts']

            if event["highlight"]:
                highlight = True

        if len(newevents) == 0:
            return None, 0

        g['changeicons'] = self._get_changeicon(g['group_val'], summary)
        g['events'] = newevents
        g['src_count'] = len(g['source_endpoints'])
        g['target_count'] = len(g['target_endpoints'])
        g['srcbadgeclass'] = self._get_badgeclass(g['src_count'])
        g['targetbadgeclass'] = self._get_badgeclass(g['target_count'])
        g["date"] = self._get_datestring(newgroupstart)
        g['highlight'] = highlight
        g["ts"] = newgroupstart

        del(g["group_val"])
        del(g["source_endpoints"])
        del(g["target_endpoints"])
        return g, newgroupstart

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
