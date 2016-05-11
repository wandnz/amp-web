from ampweb.views.common import stripASName, createEventClass, createGraphClass
from ampweb.views.common import DEFAULT_EVENT_FILTER

import datetime, re, time, pylibmc, operator

COMMON_EVENT_THRESHOLD=5
GROUP_BATCH_SIZE=20

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

    def _get_changeicon(self, groupname, events):

        icons = set()

        for ev in events:
            evtype = ev[4]
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
        dt = datetime.datetime.fromtimestamp(event["ts_started"])
        label = dt.strftime("%H:%M:%S")
    
        graphclass = createEventClass(event)
        if graphclass is None:
            label += "  Unknown collection %s" % (event['collection'])
            if 'source' in event:
                label +=", measured by %s" % (event["source"])
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

    def _parse_events(self, group, evfilter):
        events = []
        summary = []
        alltraceroute = True

        groupevents = self.ampy.get_event_group_members(group["group_id"])
        groupstarted = 0

        group['source_endpoints'] = set()
        group['target_endpoints'] = set()

        for ev in groupevents:
            streamprops = self.ampy.get_stream_properties(ev['collection'], \
                    ev['stream'])

            evfilt, eveps = self._apply_event_filter(evfilter, ev, group)

            if evfilt != "exclude":

                if evfilt == "highlight":
                    highlight = True
                else:
                    highlight = False

                if eveps is not None:
                    group['source_endpoints'] |= set(eveps['sources'])
                    group['target_endpoints'] |= set(eveps['targets'])

                events.insert(0, {
                    "label": self._get_event_label(ev, streamprops),
                    "description": ev["description"],
                    "href": self._get_event_href(ev),
                    "stream": ev['stream'],
                    "collection": ev['collection'],
                    "evtype": self._get_event_type(ev, \
                            group['group_val']),
                    "ts": ev['ts_started'],
                    "highlight": highlight,
                })
                if ev['collection'] != 'amp-astraceroute':
                    alltraceroute = False;

                summary.append((ev['stream'], ev['ts_started'],
                        ev['event_id'], ev['collection'], events[0]['evtype']))
                if groupstarted == 0 or groupstarted > ev['ts_started']:
                    groupstarted = ev['ts_started']

        group['ts_started'] = groupstarted

        return events, summary, alltraceroute

    def _combine_icons(self, a, b):
        icons = set(a) | set(b)

        if 'glyphicon-circle-arrow-up' in icons and \
                'glyphicon-circle-arrow-down' in icons:
            icons.remove('glyphicon-circle-arrow-up')
            icons.remove('glyphicon-circle-arrow-down')

        return list(icons)

    def _merge_groups(self, group, events, fullevents):

        mergereq = False
        submerge = False
        thisgby = group['group_val'].split('?')[0]
        if self.lastts == group['ts_started']:
            ind = 0

            for (c, suballowed, groupby) in self.mergecandidates:
                if events == c:
                    mergereq = True
                    break
                if groupby==thisgby and (group['subsetallowed'] or suballowed):
                    a = set(events)
                    b = set(c)

                    if a <= b: 
                        # If a is a subset of b or b is a subset of a, merge
                        submerge = True
                        events = list(a | b)
                        subgroupval = self.groups[ind]['group_val']
                        break
                    if b <= a:
                        submerge = True
                        events = list(a | b)
                        subgroupval = group['group_val']
                        break
		
                ind += 1

            if mergereq or submerge:
                asns = []
                endpoints = []

                if group['grouped_by'] == 'asns':
                    asns = (group['group_val'].split('?')[0]).split('-')
                else:
                    endpoints = [group['group_val'].split('?')[0]]

                icons = self._get_changeicon(group['group_val'], events)

                if submerge:
                    result = []
                    fullevents.extend(self.groups[ind]['events'])
                    for md in fullevents:
                        if md not in result:
                            result.append(md)
                    self.groups[ind]['events'] = result
                    self.groups[ind]['event_count'] = len(result)
                    self.groups[ind]['group_val'] = subgroupval
                else:
                    newasns = list(set(asns) - set(self.groups[ind]['asns']))
                    neweps = list(set(endpoints) -
                            set(self.groups[ind]['endpoints']))
                    self.groups[ind]['asns'] += newasns
                    self._update_site_counts(group, newasns)
                    if len(self.groups[ind]['asns']) > 0 and len(self.groups[ind]['events']) > 1:
                        self.groups[ind]['endpoints'] = []
                    else:
                        self.groups[ind]['endpoints'] += neweps
                        self._update_site_counts(group, neweps)

                if 'glyphicon-question-sign' in icons:
                    pass

                elif 'glyphicon-question-sign' in self.groups[ind]['changeicons']:
                    self.groups[ind]['changeicons'] = icons
                else:
                    self.groups[ind]['changeicons'] = self._combine_icons(icons,
                            self.groups[ind]['changeicons'])

                if self.groups[ind]['subsetallowed'] and group['subsetallowed']:
                    self.groups[ind]['subsetallowed'] = True
                else:
                    self.groups[ind]['subsetallowed'] = False

            else:
                self.mergecandidates.insert(0, (events, group['subsetallowed'],
                        thisgby))
        else:
            self.lastts = group['ts_started']
            self.mergecandidates = [(events, group['subsetallowed'], thisgby)]

        return mergereq or submerge
                
    def _update_site_counts(self, group, asns):

        for site in asns:
            if site in self.site_counts:
                self.site_counts[site] += group['event_count']
            else:
                self.site_counts[site] = group['event_count']

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
        evtype = ev[4]
        key = (ev[0], evtype, ev[3])
        if key in self.common_events:
            self.common_events[key].add(ev[2])
        elif key in self.rare_events:
            self.rare_events[key].add(ev[2])
            if len(self.rare_events[key]) >= COMMON_EVENT_THRESHOLD:
                self.common_events[key] = self.rare_events[key]
                del self.rare_events[key]
        else:
            self.rare_events[key] = set([ev[2]])
        

    def _update_timeseries(self, events, groupval):
        for ev in events:
            if (ev[0], ev[2]) in self.allevents:
                continue

            self.allevents.add((ev[0], ev[2]))
            self._update_event_frequency(ev, groupval)
            tsbin = ev[1] - (ev[1] % self.binsize)

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

        return dt.strftime("%H:%M:%S %A %B %d %Y")

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

        ppasns = [stripASName(a, asnames, True) for a in asns]
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
       
        for s, count in sorted_sites[0:5]:
            if re.search('\D+', s) == None:
                toquery.append(s)
            else:
                result.append({"site": s, "count": count,
                        "tooltip": s})


        if len(toquery) > 0:
            tooltips = self.ampy.get_asn_names(toquery)

            for s in toquery:
                sitename = "AS" + s
                ttip = stripASName(s, tooltips, True)
                result.append({"site": sitename, "count": sitecounts[s], \
                        "tooltip":ttip})

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
            cache=True, alreadyfetched = 0):

        self.event_timeseries = {}
        self.site_counts = {}
        self.common_events = {}
        self.rare_events = {}
        self.groups = []

        self.lastts = 0
        self.mergecandidates = []

        self.today = datetime.datetime.now()
        self.yesterday = datetime.datetime.now() - datetime.timedelta(hours=24)

        if evfilter is None:
            evfilter = DEFAULT_EVENT_FILTER

        total_group_count = 0
        groups_added = 0

        fbin = start - (start % self.binsize)

        while (fbin <= end):
            self.event_timeseries[fbin] = 0
            fbin += self.binsize

        filtered = {}

        if not cache:
            self.common_events = self.get_common_events()
            if self.common_events is None:
                self.common_events = {}

        # Remove events from groups that are not wanted.
        # Because event removal can change group start times etc., we need
        # to re-sort our groups so that we can correctly merge groups that
        # have become identical due to event removal.
        for group in fetched:
            events, summary, mergesubset = self._parse_events(group, evfilter)

            if group['ts_started'] != 0:
                filtered[(group['ts_started'], group['group_id'])] = \
                        (group, events, summary, mergesubset)

        keys = filtered.keys()
        keys.sort()

        for (ts,groupid) in keys:
            endpoints = []
            asns = []
            group, events, summary, mergesubset = filtered[(ts, groupid)]

            group['subsetallowed'] = mergesubset
            if self._merge_groups(group, summary, events):
                continue

            self._update_timeseries(summary, group['group_val'])

            if group['grouped_by'] == 'asns':
                asns = group['group_val'].split('?')[0].split('-')
                self._update_site_counts(group, asns)
            else:
                endpoints = [group['group_val'].split('?')[0]]
                self._update_site_counts(group, endpoints)

            changeicons = self._get_changeicon(group['group_val'], summary)

            self.groups.insert(0, {
                "id": group["group_id"],
                "date": self._get_datestring(group['ts_started']),
                "asns": asns,
                "endpoints": endpoints,
                "by": group['grouped_by'],
                "badgeclass": self._get_badgeclass(group),
                "events": events,
                "event_count": len(events),
                "changeicons": changeicons,
                "group_val": group["group_val"],
                "subsetallowed": group['subsetallowed'],
                "source_endpoints": group['source_endpoints'],
                "target_endpoints": group['target_endpoints'],
            })

            total_group_count += 1
            groups_added += 1

        self._finish_time_series()

        #if maxgroups is not None:
        #    self.groups = self.groups[0:maxgroups]

        filteredgroups = []
        glen = 0
        earliest = 0
        maxgroups = int(evfilter['maxevents']) - alreadyfetched

        for g in self.groups:
            filtg, gstart = self.finalise_group(g, evfilter)
            if filtg is None:
                total_group_count -= 1
                continue
            filteredgroups.append(filtg)
            glen += 1

            if gstart < earliest or earliest == 0:
                earliest = gstart

            if int(evfilter['maxevents']) > 0 and glen >= maxgroups:
                break
            if glen >= GROUP_BATCH_SIZE:
                break

        if (cache):
            self._update_cache()

        return filteredgroups, total_group_count, len(self.allevents), earliest

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
            if not evfilter['showroutechange']:
                return "exclude", None

        if evtype == "incr":
            if not evfilter['showlatencyincr']:
                return "exclude", None

        if evtype == "decr":
            if not evfilter['showlatencydecr']:
                return "exclude", None

        if evtype == "loss":
            if not evfilter['showloss']:
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
        asns = set(group['asns'])
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


    def finalise_group(self, g, evfilter):

        highlight = False

        groupcheck = self._apply_group_filter(evfilter, g)
        if groupcheck == "exclude":
            return None, 0
        if groupcheck == "highlight":
            highlight = True

        g['asns'] = self._pretty_print_asns(g['asns'])

        if evfilter is None:
            return g, 0

        newevents = []
        newgroupstart = None
        summary = []

        for ev in g['events']:
            newevents.append( {
                    'href': ev['href'], \
                    'description': ev['description'],
                    'label': ev['label']
                    } )
            summary.append((ev['stream'], ev['ts'], \
                    0, ev['collection'],
                    self._get_event_type(ev, g['group_val'])))

            if newgroupstart is None or ev['ts'] < newgroupstart:
                newgroupstart = ev['ts']

            if ev["highlight"]:
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
        g["highlight"] = highlight
        g["ts"] = newgroupstart

        del(g["group_val"])
        del(g["source_endpoints"])
        del(g["target_endpoints"])
        return g, newgroupstart




# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
