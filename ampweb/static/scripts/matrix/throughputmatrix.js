function ThroughputMatrix() {

    BaseMatrix.call(this);
    this.graphstyle = "amp-throughput";
    this.defaultmetric = "bps";
    this.statecookieid = "ampwebMatrixThroughputState";
    this.displayname = "Throughput";

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

ThroughputMatrix.prototype.getLegendItems = function(params) {

    var theomax = 1000;

    if (params.absrel == "absolute") {
        return [
            {'colour': 'test-colour1', 'label': "> " + 0.9 * theomax + " Mbps"},
            {'colour': 'test-colour2', 'label': 0.15 * theomax + " - " +
                    0.9 * theomax + " Mbps"},
            {'colour': 'test-colour3', 'label': 0.08 * theomax + " - " +
                    0.15 * theomax + " Mbps"},
            {'colour': 'test-colour4', 'label': 0.05 * theomax + " - " +
                    0.08 * theomax + " Mbps"},
            {'colour': 'test-colour5', 'label': 0.02 * theomax + " - " +
                    0.05 * theomax + " Mbps"},
            {'colour': 'test-colour6', 'label': 0.01 * theomax + " - " +
                    0.02 * theomax + " Mbps"},
            {'colour': 'test-colour7', 'label': "< " + 0.01 * theomax + " Mbps"},
        ];
    } else if (params.absrel == "relative") {
        return [
            {'colour': 'test-colour1', 'label':"At or above mean"},
            {'colour': 'test-colour2', 'label':"0 - 0.5 standard deviations"},
            {'colour': 'test-colour3', 'label':"0.5 - 1.0 standard deviations"},
            {'colour': 'test-colour4', 'label':"1.0 - 1.5 standard deviations"},
            {'colour': 'test-colour5', 'label':"1.5 - 2.0 standard deviations"},
            {'colour': 'test-colour6', 'label':"2.0 - 3.0 standard deviations"},
            {'colour': 'test-colour7', 'label': "> 3.0 standard deviations"},
        ];
    }

    return [];
}

ThroughputMatrix.prototype.getGraphStyle = function(params) {
    return "amp-throughput";
}

ThroughputMatrix.prototype.getLegendTitle = function(params) {

    if (params.absrel == "absolute") {
        return "Throughput";
    } else {
        return "Decrease relative to the daily mean";
    }

}

ThroughputMatrix.prototype.colourCell = function(cellData, params, src, dest) {

    var cellcols = ['test-none', 'test-none']

    cellcols[0] = getThroughputCellColour(cellData['down'], params);
    cellcols[1] = getThroughputCellColour(cellData['up'], params);

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
    var index = segments.indexOf("matrix");

    for (var i = segments.length; i <= 8; i++) {
        segments.push(null);
    }

    return {
        'prefix': (index == 0 ? "" : segments.slice(0, index).join("/") + "/"),
        'test': (segments[index + 1] || 'tput'),
        'split': (segments[index + 2] || 'bothdirs'),
        'source': (segments[index + 3] || undefined),
        'destination': (segments[index + 4] || undefined),
        'metric': (segments[index + 5] || 'bps'),
        'family': (segments[index + 6] || 'ipv4'),
        'absrel': (segments[index + 7] || 'absolute'),
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
    url += (params.absrel || current.absrel) + '/';

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
        split: params.split,
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


function getThroughputCellColour(cellData, params) {

    if (!cellData)
        return 'test-none';

    if (cellData == -1)
        return 'test-error';

    var bps = cellData[1];
    var bps_day = cellData[2];
    var bps_day_sd = cellData[3];

    if (bps == null || bps < 0) {
        return 'test-error';
    }

    if (params.absrel == "absolute") {
        /* Just assume Gb as default for now
         * TODO make configurable somehow
         */
        var theomax = 1000;

        cellclass = getCellColour(bps, [
            bps > 0.9 * theomax,
            bps > 0.15 * theomax,
            bps > 0.08 * theomax,
            bps > 0.05 * theomax,
            bps > 0.02 * theomax,
            bps > 0.01 * theomax,
        ]);
    } else {
        cellclass = getCellColour(bps, [
            bps >= bps_day || bps_day_sd < 0,
            bps >= bps_day - (bps_day_sd * 0.5),
            bps >= bps_day - (bps_day_sd * 1.0),
            bps >= bps_day - (bps_day_sd * 1.5),
            bps >= bps_day - (bps_day_sd * 2.0),
            bps >= bps_day - (bps_day_sd * 3.0),
        ]);
    }

    return cellclass;


}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
