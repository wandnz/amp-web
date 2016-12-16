import time
from ampweb.views.common import createMatrixClass, getMatrixCellDuration

def site_info_tooltip(ampy, site):
    """ Generate the HTML for a tooltip describing a single site """
    info = ampy.get_amp_site_info(site)
    if info is None:
        print "Error while fetching AMP site info"
        return {}

    if len(info) > 0:
        return {
            "site": True,
            "longname": info["longname"],
            "location": info["location"],
            "description": info["description"],
            "ampname": info["ampname"],
        }
    return {}

def _duration_label(d):
    """ Converts a duration 'd' into a suitable label for display on the
        tooltip.
    """
    if d < 60:
        if int(d) == 1:
            plural = ""
        else:
            plural = "s"
        return "%d second%s" % (int(d), plural)

    elif d < 60 * 60:
        if int(d / 60.0) == 1:
            plural = ""
        else:
            plural = "s"
        return "%d minute%s" % (int(d / 60.0), plural)

    else:
        if int(d / 60.0 / 60.0) == 1:
            plural = ""
        else:
            plural = "s"
        return "%d hour%s" % (int(d / 60.0 / 60.0), plural)

    return "Unknown duration"

def get_full_name(ampy, site):
    """ Get the full name of a site """
    info = ampy.get_amp_site_info(site)
    if info is None:
        print "Error while fetching AMP site info"
        return "Unknown"
    
    if len(info) > 0:
        return info["longname"]
    return site

def generate_sparklines(gc, rawdata, test, metric):
    lines = {}
    linemax = 0

    for label, datapoints in rawdata.iteritems():
        if len(datapoints) == 0:
            continue
        thisline = []
        for dp in datapoints:
            nextval = gc.generateSparklineData(dp, test, metric)

            if nextval is not None and nextval > linemax:
                linemax = nextval
            thisline.append([dp['binstart'], nextval])
          
        lines[label] = thisline

    return {'sparklineDataMax': linemax, 'sparklineData': lines} 

def build_data_tooltip(ampy, gc, view_id, basedur, test, metric):
    """ Build a tooltip showing data between a pair of sites for one metric """
    data = {}
    now = int(time.time())

    # Sparkline is based on the last 24 hours of data
    rawsparkdata = ampy.get_historic_data(gc.get_matrix_viewstyle(), view_id, 
            now - (60 * 60 * 24), now, "spark")

    if rawsparkdata is not None:
        data = generate_sparklines(gc, rawsparkdata, test, metric)

        #data = gc.generateSparklineData(rawsparkdata, test)


    # Generate the tooltip text
    durations = [basedur]

    if basedur < 60 * 30:
        durations.append(60 * 60)
    else:
        durations.append(60 * 60 * 6)

    durations.append(60 * 60 * 24)

    data['stats'] = []
    for d in durations:
        resulttuple = ampy.get_recent_data(gc.get_matrix_viewstyle(),
                view_id, d, "tooltiptext")

        if resulttuple is None:
            result = None
        else:
            result = resulttuple[0]

        nextttip = {'class':''}
        nextttip['value'] = gc.formatTooltipText(result, test, metric)
        nextttip['label'] = _duration_label(d)
        data['stats'].append(nextttip)

    if len(data['stats']) != 0:
        data['stats'][-1]['class'] = "bottom"

    return data

def tooltip(ampy, request):
    """ Internal tooltip specific API """
    urlparts = request.GET

    cell_id = urlparts['id']

    if cell_id.startswith("src__") or cell_id.startswith("dst__"):
        cell_id = cell_id.replace("src__", "").replace("dst__", "")
        return site_info_tooltip(ampy, cell_id)

    if "test" not in urlparts:
        return {}

    if "metric" not in urlparts:
        return {}

    test = urlparts["test"]
    metric = urlparts["metric"]
    
    gc = createMatrixClass(test, None)
    if gc is None:
        return {}

    basedur = getMatrixCellDuration(request, gc)

    idsplit = cell_id.split("__")
    view_id = idsplit[0]
    src = idsplit[1]
    dst = idsplit[2]

    data = build_data_tooltip(ampy, gc, view_id, basedur, test, metric)
    if data is None:
        print "Unable to create tooltip for matrix cell"
    
    source = get_full_name(ampy, src)
    if source is None:
        return None
    data['source'] = source

    dest = get_full_name(ampy, dst)
    if dest is None:
        return None
    data['destination'] = dest

    data['test'] = test
    data['site'] = False
    return data

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
