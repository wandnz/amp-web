from ampy.ampy import Ampy
from threading import Lock

from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.amplatency import AmpIcmpGraph, AmpLatencyGraph
from ampweb.views.collections.amplatency import AmpTcppingGraph, AmpDnsGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteHopsGraph
from ampweb.views.collections.amptraceroute import AmpAsTracerouteGraph
from ampweb.views.collections.ampthroughput import AmpThroughputGraph
from ampweb.views.collections.amphttp import AmpHttpGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

import re

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

    # Hideous config parsing code -- could probably do this a bit more
    # intelligently
    if 'ampweb.nntschost' in request.registry.settings:
        nntscconfig['host'] = request.registry.settings['ampweb.nntschost']
    if 'ampweb.nntscport' in request.registry.settings:
        nntscconfig['port'] = request.registry.settings['ampweb.nntscport']

    if 'ampweb.ampdb' in request.registry.settings:
        ampdbconfig['name'] = request.registry.settings['ampweb.ampdb']
    if 'ampweb.ampdbhost' in request.registry.settings:
        ampdbconfig['host'] = request.registry.settings['ampweb.ampdbhost']
    if 'ampweb.ampdbuser' in request.registry.settings:
        ampdbconfig['user'] = request.registry.settings['ampweb.ampdbuser']
    if 'ampweb.ampdbpwd' in request.registry.settings:
        ampdbconfig['password'] = request.registry.settings['ampweb.ampdbpwd']
    if 'ampweb.ampdbport' in request.registry.settings:
        ampdbconfig['port'] = request.registry.settings['ampweb.ampdbport']

    if 'ampweb.viewdb' in request.registry.settings:
        viewconfig['name'] = request.registry.settings['ampweb.viewdb']
    if 'ampweb.viewdbhost' in request.registry.settings:
        viewconfig['host'] = request.registry.settings['ampweb.viewdbhost']
    if 'ampweb.viewdbuser' in request.registry.settings:
        viewconfig['user'] = request.registry.settings['ampweb.viewdbuser']
    if 'ampweb.viewdbpwd' in request.registry.settings:
        viewconfig['password'] = request.registry.settings['ampweb.viewdbpwd']
    if 'ampweb.viewdbport' in request.registry.settings:
        viewconfig['port'] = request.registry.settings['ampweb.viewdbport']

    if 'ampweb.eventdb' in request.registry.settings:
        eventconfig['name'] = request.registry.settings['ampweb.eventdb']
    if 'ampweb.eventdbhost' in request.registry.settings:
        eventconfig['host'] = request.registry.settings['ampweb.eventdbhost']
    if 'ampweb.eventdbuser' in request.registry.settings:
        eventconfig['user'] = request.registry.settings['ampweb.eventdbuser']
    if 'ampweb.eventdbpwd' in request.registry.settings:
        eventconfig['password'] = request.registry.settings['ampweb.eventdbpwd']
    if 'ampweb.eventdbport' in request.registry.settings:
        eventconfig['port'] = request.registry.settings['ampweb.eventdbport']

    ampy = Ampy(ampdbconfig, viewconfig, nntscconfig, eventconfig)
    if ampy.start() == None:
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


def createGraphClass(colname):
    graphclass = None

    if colname == "rrd-smokeping":
        graphclass = RRDSmokepingGraph()
    elif colname == "rrd-muninbytes":
        graphclass = RRDMuninbytesGraph()
    elif colname == "lpi-bytes":
        graphclass = LPIBytesGraph()
    elif colname == "amp-latency":
        graphclass = AmpLatencyGraph()
    elif colname == "amp-icmp":
        graphclass = AmpIcmpGraph()
    elif colname == "amp-tcpping":
        graphclass = AmpTcppingGraph()
    elif colname == "amp-dns":
        graphclass = AmpDnsGraph()
    elif colname == "amp-http":
        graphclass = AmpHttpGraph()
    elif colname == "amp-throughput":
        graphclass = AmpThroughputGraph()
    elif colname  == "amp-astraceroute":
        graphclass = AmpAsTracerouteGraph()
    elif colname  == "amp-traceroute-hops":
        graphclass = AmpTracerouteHopsGraph()
    elif colname  == "amp-traceroute":
        graphclass = AmpTracerouteGraph()
    elif colname == "lpi-flows":
        graphclass = LPIFlowsGraph()
    elif colname == "lpi-packets":
        graphclass = LPIPacketsGraph()
    elif colname == "lpi-users":
        graphclass = LPIUsersGraph()

    return graphclass

def createMatrixClass(matrixtype, metric):

    graphclass = None
    if matrixtype in ['latency', 'loss', 'absolute-latency']:
        if metric == 'dns':
            graphclass = AmpDnsGraph()
        elif metric == 'icmp':
            graphclass = AmpIcmpGraph()
        elif metric == 'tcp':
            graphclass = AmpTcppingGraph()
        else:
            graphclass = AmpLatencyGraph()

    elif matrixtype == "hops":
        graphclass = AmpTracerouteHopsGraph()
    elif matrixtype == "tput" or matrixtype == "throughput":
        graphclass = AmpThroughputGraph()
    elif matrixtype == "http":
        graphclass = AmpHttpGraph()

    return graphclass

def graphStyleToCollection(style):
    if style == "amp-traceroute-hops":
        return "amp-astraceroute"
    
    return style

def collectionToGraphStyle(collection):
    if collection in ['amp-icmp', 'amp-dns', 'amp-tcpping']:
        return 'amp-latency'

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
        'util.js'
    ]

def getBannerOptions(request):
    banopts = {'showdash':False, 'title': 'Active Measurement Project'}
    settings = request.registry.settings
    if 'ampweb.showdash' in settings:
        if settings['ampweb.showdash'] in ['yes', 'true']:
            banopts['showdash'] = True
    if 'ampweb.projecttitle' in settings:
        banopts['title'] = settings['ampweb.projecttitle']

    return banopts

def stripASName(asn, asnames, islast):

    # Dirty hackery to try and get a nice name to print
    # XXX May not always work for all AS names :/

    # An AS name is usually something along the lines of:
    # ABBREVIATED-NAME Detailed nicer name,COUNTRY

    # There can be a few extra characters between the abbreviated name
    # and the detailed name.
    # (example: CACHENETWORKS - CacheNetworks, Inc.,US)

    if asn not in asnames:
        if islast:
            return "AS%s" % (asn)
        return "AS%s" % (asn) + " | "

    # First step, remove the abbreviated name and any extra cruft before
    # the name we want.
    regex = "[A-Z0-9\-]+ \W*(?P<name>[ \S]*)$"
    parts = re.match(regex, asnames[asn])
    if parts is None:
        if islast:
            return "AS%s" % (asn)
        return "AS%s" % (asn) + " | "

    # A detailed name can have multiple commas in it, so we just want to
    # find the last one (i.e. the one that preceeds the country.
    # XXX Are all countries 2 letters? In that case, we would be better off
    # just trimming the last 3 chars.
    k = parts.group('name').rfind(',')
    if islast:
        return parts.group('name')[:k]
    return parts.group('name')[:k] + " | "


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

