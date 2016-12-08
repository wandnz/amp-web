function HopsMatrix()  {
    BaseMatrix.call(this);

    this.graphstyle = "amp-traceroute_pathlen";
    this.defaultmetric = "hops";
    this.statecookieid = "ampwebMatrixHopState";
    this.displayname = "Path Length";
    this.legendtitle = "Number of hops in path";
    this.legendlabels = [
        "1 - 4 Hops",
        "5 - 8 Hops",
        "9 - 12 Hops",
        "13 - 16 Hops",
        "17 - 20 Hops",
        "21 - 24 Hops",
        "> 24 Hops"
    ];

    this.metricData = [
        {'text': 'Hops', 'value': 'hops'}
    ];

    this.splitData = [
        {'text': 'Show both IPv4 and IPv6', 'value': 'both',
                'shortlabel': "Both" },
        {'text': 'Show IPv4 only', 'value': 'ipv4', 'shortlabel': 'IPv4' },
        {'text': 'Show IPv6 only', 'value': 'ipv6', 'shortlabel': 'IPv6' },
    ];

    this.members = ['hops'];

    this.extralegend = [
        {'colour': 'test-incomplete', 'label': 'Target Unreachable' }
    ];
}

HopsMatrix.prototype = new BaseMatrix();
HopsMatrix.prototype.constructor = HopsMatrix;

HopsMatrix.prototype.getDisplayName = function(name) {
    if (name.search("www.") == 0) {
        return name.slice(4);
    }

    return BaseMatrix.prototype.getDisplayName.call(this, name);
}

HopsMatrix.prototype.isValidURL = function() {

    var parts = this.deconstructURL();

    if (parts.length != 5)
        return false;

    if (parts[0] != 'hops')
        return false;

    if (parts[1] != 'both' && parts[1] != 'ipv4' && parts[1] != 'ipv6')
        return false;

    if (parts[4] != 'hops')
        return false;

    return true;

}

HopsMatrix.prototype.constructURL = function(params, current, base) {

    var url = base;
    var laststate = this.loadTabState();

    url += (params.test || current.test) + '/';

    /* splits are not common across all matrix types so convert back to
     * 'both' if this is not a split we support */
    if (current.split != 'ipv4' && current.split != 'ipv6' &&
            current.split != 'both') {
        if (laststate.split)
            current.split = laststate.split;
        else
            current.split = "both";
    }

    if (current.metric != 'hops') {
        if (laststate.metric)
            current.metric = laststate.metric;
        else
            current.metric = 'hops';
    }
    url += (params.split || current.split) + "/";
    url += (params.source || current.source) + '/';
    url += (params.destination || current.destination) + '/';
    url += (params.metric || current.metric) + '/';

    return url;



}

HopsMatrix.prototype.colourCell = function(cellData, params, src, dest) {

    var cellcolours = ['test-none', 'test-none'];

    cellcolours[0] = getClassForHops(cellData['ipv4']);
    cellcolours[1] = getClassForHops(cellData['ipv6']);

    if (params.split == "ipv4")
        return [cellcolours[0]]
    if (params.split == "ipv6")
        return [cellcolours[1]]

    return cellcolours;
}

HopsMatrix.prototype.getSparklineYRange = function(sparkmax) {

    return [0, sparkmax * 2];
}

HopsMatrix.prototype.formatTooltipStats = function(stats, content) {

    var table = BaseMatrix.prototype.formatTooltipStats(stats, content);
    var needfoot = false;

    /* Add a footer to the stats table to explain the meaning of a hop
     * count ending in '*'.
     */

    for ( var i = 0; i < stats.length; i++ ) {
        var values = stats[i].value.split('/');
        if (values[0].endsWith('*') || values[1].endsWith('*')) {
            needfoot = true;
        }
    }

    if (!needfoot)
        return;

    $('<tfoot/>').appendTo(table).append('<tr><td align=center colspan=3>' +
            '* = target was unreachable</td></tr>');
    

}

function getClassForHops(data) {
    
    var hopcount = data[1];

    if (hopcount == undefined || hopcount == 'X')
        return 'test-none';

    if (hopcount == "Unreachable")
        return 'test-incomplete';

    if (hopcount < 0)
        return 'test-error';


    return getCellColour(hopcount, [
        hopcount <= 4, hopcount <= 8, hopcount <= 12,
        hopcount <= 16, hopcount <= 20, hopcount <= 24
    ]);
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
