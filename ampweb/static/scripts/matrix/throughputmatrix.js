function ThroughputMatrix() {

    BaseMatrix.call(this);
    this.collection = "amp-throughput";
    this.defaultmetric = "bps";
    this.statecookieid = "ampwebMatrixThroughputState";
    this.displayname = "Throughput";
    this.legendtitle = "Observed Throughput";
    this.legendlabels = [
        '> 90% of expected',
        '75 - 90% of expected',
        '50 - 75% of expected',
        '25 - 50% of expected',
        '10 - 25% of expected',
        '2 - 10% of expected',
        '< 2% of expected'
    ];

    this.metricData = [
        { 'text': 'Bitrate', 'value': 'bps' }
    ];

    this.splitData = [
        { 'text': 'Both download and upload', 'value': 'bothdirs', 'shortlabel': 'Both'},
        { 'text': 'Download only', 'value': 'down', 'shortlabel': 'Download' },
        { 'text': 'Upload only', 'value': 'up', 'shortlabel': 'Upload' },
    ];

    this.members = ['tput'];

}

ThroughputMatrix.prototype = new BaseMatrix();
ThroughputMatrix.prototype.constructor = ThroughputMatrix;

ThroughputMatrix.prototype.colourCell = function(cellData, params, src, dest) {

    var cellcols = ['test-none', 'test-none']

    cellcols[0] = getThroughputCellColour(cellData['down'], src, 'down');
    cellcols[1] = getThroughputCellColour(cellData['up'], src, 'up');

    if (params.split == 'down') {
        return [cellcols[0]];
    } 
    if (params.split == 'up') {
        return [cellcols[1]];
    }
    return cellcols;


}

ThroughputMatrix.prototype.isValidURL = function() {

    var parts = this.deconstructURL();

    if (parts.length != 6)
        return false;

    if (parts[0] != 'tput')
        return false;

    if (parts[1] != 'bothdirs' && parts[1] != 'down' && parts[1] != 'up') {
        return false;
    }

    if (parts[4] != 'bps')
        return false;

    if (parts[5] != 'ipv4' && parts[5] != 'ipv6')
        return false;

    return true;
}

ThroughputMatrix.prototype.deconstructURL = function() {
    var segments = getURI().segment();

    for (var i = segments.length; i <= 7; i++) {
        segments.push(null);
    }

    return {
        'test': (segments[1] || 'tput'),
        'split': (segments[2] || 'bothdirs'),
        'source': (segments[3] || undefined),
        'destination': (segments[4] || undefined),
        'metric': (segments[5] || 'bps'),
        'family': (segments[6] || 'ipv4'),
    };

}

ThroughputMatrix.prototype.constructURL = function(params, current, base) {
    var url = base;
    var laststate = this.loadTabState();

    url += (params.test || current.test) + '/';

    /* splits are not common across all matrix types so convert back to
     * 'bothdirs' if this is not a split we support */
    if (current.split != 'down' && current.split != 'up' &&
            current.split != 'bothdirs') {
        if (laststate.split)
            current.split = laststate.split;
        else
            current.split = 'bothdirs';
    }

    if (current.metric != 'bps') {
        if (laststate.metric)
            current.metric = laststate.metric;
        else
            current.metric = "bps";
    } 

    if (current.family != 'ipv4' && current.family != 'ipv6') {
        if (laststate.family)
            current.family = laststate.family;
        else
            current.family = 'ipv4';
    }

    
    url += (params.split || current.split) + "/";
    url += (params.source || current.source) + '/';
    url += (params.destination || current.destination) + '/';
    url += (params.metric || current.metric) + '/';
    url += (params.family || current.family) + '/';

    return url;
}

ThroughputMatrix.prototype.getMatrixParameters = function() {
    params = this.deconstructURL();

    return {
        testType: params.test,
        source: params.source,
        destination: params.destination,
        metric: params.metric,
        family: params.family,
        split: params.split
    }
}

ThroughputMatrix.prototype.getSparklineYRange = function(sparkmax) {
    return [0, sparkmax * 1.25];
}

ThroughputMatrix.prototype.getSparklineColour = function(series) {

    if (series.toLowerCase().lastIndexOf("_in_ipv4") > 0)
        return "blue";
    return "red";
}

ThroughputMatrix.prototype.formatTooltipStats = function(stats, content) {

    /* Format tooltip assuming an IPv4, IPv6 split. Collections that do
     * something different can override this function. */
    var thead = "";
    var tbody = "";
    var table = $('<table/>').appendTo(content);

    thead = $('<thead/>').appendTo(table).append(
        '<tr><th>Time period</th>' + '<th class="firsthalf">Download</th>' +
        '<th class="secondhalf">Upload</th></tr>');

    tbody = $('<tbody/>').appendTo(table);
    for ( var i = 0; i < stats.length; i++ ) { 
        var values = stats[i].value.split('/');

        $('<tr/>').appendTo(tbody).append('<td>' + stats[i].label + '</td>')
                .append('<td>' + values[0] + '</td>')
                .append('<td>' + values[1] + '</td>');
    }

    return table;
}


function getThroughputCellColour(cellData, source, direction) {

    if (!cellData)
        return 'test-none';

    if (cellData == -1)
        return 'test-error';

    if (cellData[1] < 0) 
        return 'test-error';
    
    var bps = cellData[1];

    /* Just assume Gb as default for now -- we'll need some way of knowing more
     * about expected throughput to do this properly in the future */
    var theomax = 1000;

    /* XXX Hack for BTM, all sources describe the type of connection in
     * their name so we can compare throughput against a theoretical maximum.
     *
     * The numbers are broad approximations, as real maximums will differ from 
     * plan to plan. Basically, we just want to distinguish easily between
     * "good" ADSL vs "awful" ADSL rather than our matrix always showing that
     * ADSL sucks compared with fibre.
     */

    if (source.search('-f$') != -1) {
        /* Fibre : 100 / */
        if (direction == "down")
            theomax = 100.0;
        else
            theomax = 20.0;

    } else if (source.search('-a$') != -1) {
        /* ADSL */
        if (direction == "down")
            theomax = 20.0;
        else
            theomax = 1.0;

    } else if (source.search('-v$') != -1) {
        /* VDSL */
        if (direction == "down")
            theomax = 65.0;
        else
            theomax = 10.0;

    }

    cellclass = getCellColour(bps, [
        bps > 0.9 * theomax,
        bps > 0.75 * theomax,
        bps > 0.5 * theomax,
        bps > 0.25 * theomax,
        bps > 0.1 * theomax,
        bps > 0.02 * theomax,
    ]);
    //console.log(cellclass);
    return cellclass;


}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
