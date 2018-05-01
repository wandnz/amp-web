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

import re
import urllib
from threading import Lock
from ampy.ampy import Ampy

from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.amplatency import AmpIcmpGraph, AmpLatencyGraph
from ampweb.views.collections.amplatency import AmpTcppingGraph, AmpDnsGraph
from ampweb.views.collections.amplatency import AmpUdpstreamLatencyGraph
from ampweb.views.collections.amploss import AmpLossGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteHopsGraph
from ampweb.views.collections.amptraceroute import AmpAsTracerouteGraph
from ampweb.views.collections.ampthroughput import AmpThroughputGraph
from ampweb.views.collections.ampudpstream import AmpUdpstreamGraph
from ampweb.views.collections.amphttp import AmpHttpGraph, AmpHttpPageSizeGraph

ampy = None
ampyLock = Lock()

def initAmpy(request):
    global ampy

    # Use a lock as we may get multiple asynchronous API requests all
    # trying to access ampy at once
    ampyLock.acquire()
    if ampy is not None:
        ampyLock.release()
        return ampy

    ampdbconfig = {}
    viewconfig = {}
    nntscconfig = {}
    eventconfig = {}
    asdbconfig = {}

    settings = request.registry.settings

    # Hideous config parsing code -- could probably do this a bit more
    # intelligently
    if 'ampweb.nntschost' in settings:
        nntscconfig['host'] = settings['ampweb.nntschost']
    if 'ampweb.nntscport' in settings:
        nntscconfig['port'] = settings['ampweb.nntscport']

    if 'ampweb.ampdb' in settings:
        ampdbconfig['name'] = settings['ampweb.ampdb']
    if 'ampweb.ampdbhost' in settings:
        ampdbconfig['host'] = settings['ampweb.ampdbhost']
    if 'ampweb.ampdbuser' in settings:
        ampdbconfig['user'] = settings['ampweb.ampdbuser']
    if 'ampweb.ampdbpwd' in settings:
        ampdbconfig['password'] = settings['ampweb.ampdbpwd']
    if 'ampweb.ampdbport' in settings:
        ampdbconfig['port'] = settings['ampweb.ampdbport']

    if 'ampweb.viewdb' in settings:
        viewconfig['name'] = settings['ampweb.viewdb']
    if 'ampweb.viewdbhost' in settings:
        viewconfig['host'] = settings['ampweb.viewdbhost']
    if 'ampweb.viewdbuser' in settings:
        viewconfig['user'] = settings['ampweb.viewdbuser']
    if 'ampweb.viewdbpwd' in settings:
        viewconfig['password'] = settings['ampweb.viewdbpwd']
    if 'ampweb.viewdbport' in settings:
        viewconfig['port'] = settings['ampweb.viewdbport']


    if 'ampweb.eventdb' in settings:
        eventconfig['name'] = settings['ampweb.eventdb']
    if 'ampweb.eventdbhost' in settings:
        eventconfig['host'] = settings['ampweb.eventdbhost']
    if 'ampweb.eventdbuser' in settings:
        eventconfig['user'] = settings['ampweb.eventdbuser']
    if 'ampweb.eventdbpwd' in settings:
        eventconfig['password'] = settings['ampweb.eventdbpwd']
    if 'ampweb.eventdbport' in settings:
        eventconfig['port'] = settings['ampweb.eventdbport']

    if 'ampweb.asdb' in settings:
        asdbconfig['name'] = settings['ampweb.asdb']
    if 'ampweb.asdbhost' in settings:
        asdbconfig['host'] = settings['ampweb.asdbhost']
    if 'ampweb.asdbuser' in settings:
        asdbconfig['user'] = settings['ampweb.asdbuser']
    if 'ampweb.asdbpwd' in settings:
        asdbconfig['password'] = settings['ampweb.asdbpwd']
    if 'ampweb.asdbport' in settings:
        asdbconfig['port'] = settings['ampweb.asdbport']

    if 'ampweb.disableevents' in settings:
        if settings['ampweb.disableevents'] in ['yes', 'true']:
            eventconfig = None

    ampy = Ampy(ampdbconfig, viewconfig, nntscconfig, eventconfig, asdbconfig)
    if ampy.start() is None:
        ampyLock.release()
        return None

    ampyLock.release()
    return ampy

def getMatrixCellDuration(request, graphclass):

    # Determine the time period for a matrix cell. If there is an explicit
    # option in the config, use that - otherwise use the default described in
    # the collection class.
    duropt = graphclass.getMatrixCellDurationOptionName()
    if duropt in request.registry.settings:
        try:
            duration = int(request.registry.settings[duropt])
        except ValueError:
            duration = graphclass.getMatrixCellDuration()
    else:
        duration = graphclass.getMatrixCellDuration()

    return duration


def createEventClass(event):
    graphclass = None

    if event['description'].startswith("Loss Event"):
        return AmpLossGraph(event['collection'][4:])

    if event['collection'] == "amp-icmp":
        graphclass = AmpIcmpGraph()
    if event['collection'] == "amp-http":
        graphclass = AmpHttpGraph()
    if event['collection'] == "amp-dns":
        graphclass = AmpDnsGraph()
    if event['collection'] == "amp-tcpping":
        graphclass = AmpTcppingGraph()
    if event['collection'] == "amp-astraceroute":
        graphclass = AmpAsTracerouteGraph()
    if event['collection'] == "amp-traceroute":
        graphclass = AmpTracerouteGraph()

    if event['collection'] == "rrd-smokeping":
        graphclass = RRDSmokepingGraph()

    if graphclass is None:
        print event

    return graphclass



def createGraphClass(colname):
    graphclass = None

    if colname == "rrd-smokeping":
        graphclass = RRDSmokepingGraph()
    elif colname == "amp-latency":
        graphclass = AmpLatencyGraph(None)
    elif colname == "amp-loss":
        graphclass = AmpLossGraph(None)
    elif colname == "amp-icmp":
        graphclass = AmpIcmpGraph()
    elif colname == "amp-tcpping":
        graphclass = AmpTcppingGraph()
    elif colname == "amp-dns":
        graphclass = AmpDnsGraph()
    elif colname == "amp-http":
        graphclass = AmpHttpGraph()
    elif colname == "amp-httppagesize":
        graphclass = AmpHttpPageSizeGraph()
    elif colname == "amp-throughput":
        graphclass = AmpThroughputGraph()
    elif colname == "amp-astraceroute":
        graphclass = AmpAsTracerouteGraph()
    elif colname == "amp-traceroute_pathlen":
        graphclass = AmpTracerouteHopsGraph()
    elif colname == "amp-traceroute-hops":
        graphclass = AmpTracerouteHopsGraph()
    elif colname == "amp-traceroute":
        graphclass = AmpTracerouteGraph()
    elif colname == "amp-udpstream":
        graphclass = AmpUdpstreamGraph()
    elif colname == "amp-udpstream-latency":
        graphclass = AmpUdpstreamLatencyGraph()

    return graphclass

def createMatrixClass(matrixtype, metric):

    graphclass = None
    if matrixtype in ['latency', 'absolute-latency']:
        if metric == 'dns':
            graphclass = AmpDnsGraph()
        elif metric == 'icmp':
            graphclass = AmpIcmpGraph()
        elif metric == 'tcp':
            graphclass = AmpTcppingGraph()
        elif metric == "udpstream":
            graphclass = AmpUdpstreamLatencyGraph()
        else:
            graphclass = AmpLatencyGraph(metric)
    elif matrixtype == "loss":
        graphclass = AmpLossGraph(metric)
    elif matrixtype == "hops":
        graphclass = AmpTracerouteHopsGraph()
    elif matrixtype == "tput" or matrixtype == "throughput":
        graphclass = AmpThroughputGraph()
    elif matrixtype == "http":
        graphclass = AmpHttpGraph()
    elif matrixtype == "httpsize":
        graphclass = AmpHttpPageSizeGraph()

    return graphclass

def graphStyleToCollection(style):
    if style == "amp-traceroute-hops":
        return "amp-traceroute_pathlen"
    if style == "amp-loss" or style == "amp-latency":
        return "amp-latency"

    return style

def collectionToGraphStyle(collection):
    if collection in ['amp-icmp', 'amp-dns', 'amp-tcpping',
            'amp-udpstream-latency']:
        return 'amp-latency'

    if collection in ['amp-traceroute_pathlen']:
        return 'amp-traceroute-hops'
    return collection

def getCommonScripts():
    return [
        'lib/jquery.min.js',
        'lib/modernizr.min.js',
        'lib/history.min.js',
        'lib/jquery-cookie.js',
        'lib/bootstrap.min.js',
        'lib/bean.min.js',
        'lib/underscore.min.js',
        'lib/flotr2.min.js',
        'lib/envision.min.js',
        'lib/uri.min.js',
        'lib/jstz.min.js',
        'lib/dagre.min.js',
        'lib/select2.min.js',
        'lib/moment.min.js',
        'util.js',
        'modals/modal.js',
        'modals/user_modal.js',
    ]

def getBannerOptions(request):
    banopts = {'showdash':False, 'title': 'Active Measurement Project',
            'showmatrix': False}
    settings = request.registry.settings
    if 'ampweb.showdash' in settings:
        if settings.get('ampweb.disableevents') in ['yes', 'true']:
            # If no event database, then there's no point in having an
            # event dashboard
            banopts['showdash'] = False
        elif settings['ampweb.showdash'] in ['yes', 'true']:
            banopts['showdash'] = True

    if 'ampweb.showmatrix' in settings:
        if settings.get('ampweb.showmatrix') in ['yes', 'true']:
            banopts['showmatrix'] = True

    if 'ampweb.projecttitle' in settings:
        banopts['title'] = settings['ampweb.projecttitle']

    return banopts

def getAuthOptions(request):
    opts = {'tos':False, 'public':True}
    settings = request.registry.settings
    if 'auth.showtos' in settings:
        if settings.get('auth.showtos') in ['yes', 'true']:
            opts['tos'] = True
    if 'auth.publicdata' in settings:
        if settings.get('auth.publicdata') in ['yes', 'true']:
            opts['public'] = True
    return opts

def getGATrackingID(request):
    settings = request.registry.settings
    return settings.get('ampweb.gtag', None)

def stripASName(asn, asnames, islast):

    # Dirty hackery to try and get a nice name to print
    # XXX May not always work for all AS names :/

    # An AS name is usually something along the lines of:
    # ABBREVIATED-NAME Detailed nicer name, COUNTRY

    # There can be a few extra characters between the abbreviated name
    # and the detailed name.
    # (example: CACHENETWORKS - CacheNetworks, Inc., US)

    final = "Unknown"

    if asn not in asnames:
        final = "AS%s" % (asn)
    elif asn == "Private":
        final = "Private Address Space"
    else:
        # split out the short and long AS names, if present
        regex = "(?P<short>[A-Z0-9\-]+) \W*(?P<name>[ \S]*), [A-Z]{2}$"
        parts = re.match(regex, asnames[asn])

        if parts is None:
            # No regex match - someone has broken whois data, just return ASN
            final = "AS%s" % (asn)
        elif len(parts.group('name')) > 0:
            # long form name exists, use it as given
            final = parts.group('name')
        else:
            # no long form name, use the abbreviated one instead
            final = parts.group('short')

    if islast:
        return final

    return final + " | "

DEFAULT_EVENT_FILTER = {
    'showcommon': True,
    'maxevents': 0,
    'asincludes': [],
    'ashighlights': [],
    'asexcludes': [],
    'srcincludes': [],
    'srcexcludes': [],
    'srchighlights': [],
    'destincludes': [],
    'destexcludes': [],
    'desthighlights': [],
    'showlatencyincr': True,
    'showlatencydecr': True,
    'showroutechange': True,
    'showloss': True,
    'endtime': -1,
    'starttime': -1,
    'minaffected': {'sources': 1, 'targets': 1, 'endpoints': 2}
}


def escapeURIComponent(component):
    AMPNAME_RESERVED_CHARS = '~()*!.\''
    return urllib.quote(component, safe=AMPNAME_RESERVED_CHARS)


def doubleEscapeURIComponent(component):
    return escapeURIComponent(escapeURIComponent(component))

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
