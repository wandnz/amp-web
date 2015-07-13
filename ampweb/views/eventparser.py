from ampweb.views.common import stripASName, createEventClass

import datetime, re, time, pylibmc

COMMON_EVENT_THRESHOLD=5

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

        if '?' not in groupname:
            icons.add('glyphicon-question-sign')
            return list(icons)

        changetype = groupname.split('?')[1]
        if len(changetype) < 4:
            icons.add('glyphicon-question-sign')
            return list(icons)

        if changetype[0:4] == "decr":
            icons.add('glyphicon-circle-arrow-down')

        if changetype[0:4] == "incr":
            icons.add('glyphicon-circle-arrow-up')

        for ev in events:
            if ev[3] == 'amp-astraceroute':
                icons.add('glyphicon-random')

        return list(icons)

    def _get_event_href(self, event):
        graphclass = createEventClass(event)
        start = event["ts_started"] - (1.5 * 60 * 60)
        end = event["ts_ended"] + (0.5 * 60 * 60)

        href = "eventview/%s/%s/%d/%d" % (graphclass.get_event_graphstyle(),
                event["stream"], start, end)
        return href

    def _get_event_label(self, event, streamprops):
        graphclass = createEventClass(event)
        if graphclass is None:
            dt = datetime.datetime.fromtimestamp(event["ts_started"])
            label = dt.strftime("%H:%M:%S")
            label += "  Unknown collection %s" % (event['collection'])
            if 'source' in event:
                label +=", measured by %s" % (event["source"])
            return label
        return graphclass.get_event_label(event, streamprops)

    def _parse_events(self, group):
        events = []
        summary = []

        groupevents = self.ampy.get_event_group_members(group["group_id"])
        for ev in groupevents:
            streamprops = self.ampy.get_stream_properties(ev['collection'], \
                    ev['stream'])
            
            events.insert(0, {
                "label": self._get_event_label(ev, streamprops),
                "description": ev["description"],
                "href": self._get_event_href(ev),
                "stream": ev['stream'],
                "evtype": self._get_event_type(ev['collection'], \
                        group['group_val']),
                "ts": ev['ts_started'],
            })

            summary.append((ev['stream'], ev['ts_started'], ev['event_id'], \
                ev['collection']))
        return events, summary

    def _combine_icons(self, a, b):
        icons = set(a) | set(b)

        if 'glyphicon-circle-arrow-up' in icons and \
                'glyphicon-circle-arrow-down' in icons:
            icons.remove('glyphicon-circle-arrow-up')
            icons.remove('glyphicon-circle-arrow-down')

        return list(icons)

    def _merge_groups(self, group, events):
        
        mergereq = False
        if self.lastts == group['ts_started']:
            ind = 0

            for c in self.mergecandidates:
                if events == c:
                    mergereq = True
                    break
                ind += 1

            if mergereq:
                asns = []
                endpoints = []

                if group['grouped_by'] == 'asns':
                    asns = (group['group_val'].split('?')[0]).split('-')
                else:
                    endpoints = [group['group_val'].split('?')[0]]

                newasns = list(set(asns) - set(self.groups[ind]['asns']))
                neweps = list(set(endpoints) - set(self.groups[ind]['endpoints']))
                self.groups[ind]['asns'] += newasns
                self._update_site_counts(group, newasns)
                self.groups[ind]['endpoints'] += neweps
                self._update_site_counts(group, neweps)

                
                icons = self._get_changeicon(group['group_val'], events)

                if 'glyphicon-question-sign' in icons:
                    pass

                elif 'glyphicon-question-sign' in self.groups[ind]['changeicons']:
                    self.groups[ind]['changeicons'] = icons
                else:
                    self.groups[ind]['changeicons'] = self._combine_icons(icons,
                            self.groups[ind]['changeicons'])

            else:
                self.mergecandidates.insert(0, events)
        else:
            self.lastts = group['ts_started']
            self.mergecandidates = [events]

        return mergereq
                
    def _update_site_counts(self, group, asns):

        for site in asns:
            if site in self.site_counts:
                self.site_counts[site] += group['event_count']
            else:
                self.site_counts[site] = group['event_count']

    def _get_event_type(self, collection, groupname):
        if '?' not in groupname:
            evtype = "unknown"
        else:
            changetype = groupname.split('?')[1]
            if len(changetype) < 4:
                evtype = "unknown"
            else:
                # Either 'incr' or 'decr' should be here
                evtype = changetype[0:4]

            # If this is actually a traceroute event, override the
            # event type to be a path change
            if collection == 'amp-astraceroute':
                evtype = "pathchange"

        return evtype

    def _update_event_frequency(self, ev, groupname):
        evtype = self._get_event_type(ev[3], groupname)
        key = (ev[0], evtype)
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

    def _get_badgeclass(self, group):
        if group['event_count'] <= 5:
            return "badge-1"
        elif group['event_count'] <= 10:
            return "badge-2"
        elif group['event_count'] <= 20:
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


        sites = sitecounts.keys()
        tooltips = self.ampy.get_asn_names(sites)

        for s in sites:
            if re.search('\D+', s) == None:
                sitename = "AS" + s
                ttip = stripASName(s, tooltips, True)
            else:
                sitename = s
                ttip = s
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

    def _match_event_filter(self, commevents, stream, evtype, evfilter):

        key = (stream, evtype)
       
        print evfilter, key, commevents.get(key)
        
        if key in commevents and evfilter in ['common']:
            return True
        if key not in commevents and evfilter in ['rare']:
            return True

        return False


    def parse_event_groups(self, fetched, evfilter=None, cache=True):

        self.event_timeseries = {}
        self.site_counts = {}
        self.common_events = {}
        self.rare_events = {}
        self.groups = []

        self.lastts = 0
        self.mergecandidates = []

        self.today = datetime.datetime.now()
        self.yesterday = datetime.datetime.now() - datetime.timedelta(hours=24)

        total_group_count = 0
        groups_added = 0

        for group in fetched:
            endpoints = []
            asns = []
            events, summary = self._parse_events(group)

            if self._merge_groups(group, summary):
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
                "eventcount": len(events),
                "changeicons": changeicons,
            })

            total_group_count += 1
            groups_added += 1

        self._finish_time_series()

        #if maxgroups is not None:
        #    self.groups = self.groups[0:maxgroups]

        self.groups[:] = [g for g in self.groups if self.finalise_group(g, \
                evfilter)]

        if (cache):
            self._update_cache()

        return self.groups, total_group_count, len(self.allevents)

    def finalise_group(self, g, evfilter):
        g['asns'] = self._pretty_print_asns(g['asns'])

        if evfilter is None:
            return True

        newevents = []
        newgroupstart = None

        commevents = self.get_common_events()

        for ev in g['events']:

            if self._match_event_filter(commevents, ev['stream'], \
                    ev['evtype'], evfilter):
                newevents.append( {
                        'href': ev['href'], \
                        'description': ev['description'],
                        'label': ev['label']
                        } )

                if newgroupstart is None or ev['ts'] < newgroupstart:
                    newgroupstart = ev['ts']

        if len(newevents) == 0:
            return False

        # TODO make sure we update the change icons properly

        g['events'] = newevents
        g['event_count'] = len(newevents)
        g['badgeclass'] = self._get_badgeclass(g)
        g["date"] = self._get_datestring(newgroupstart)
        return True




# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
