function LatencyMatrix(tabname) {

    BaseMatrix.call(this);
    
    this.statecookieid = "ampwebMatrixLatencyState";
    
    switch(tabname) {
        case 'absolute-latency':
            this.displayname = "Latency";
            this.legendtitle = "Absolute Latency";
            this.legendlabels = [
                'Latency < 5ms',
                'Latency 5 - 25ms',
                'Latency 25 - 50ms',
                'Latency 50 - 100ms',
                'Latency 100 - 200ms',
                'Latency 200 - 300ms',
                'Latency >= 300ms'
            ];

            break;
        case 'latency':
            this.displayname = "Relative Latency Increase"
            this.legendtitle = "Increase relative to daily mean";
            this.legendlabels = [
                'Latency below or at mean',
                '0 - 0.5 standard deviations',
                '0.5 - 1 standard deviations',
                '1 - 1.5 standard deviations',
                '1.5 - 2.0 standard deviations',
                '2.0 - 3.0 standard deviations',
                '> 3.0 standard deviations',
            ];
            break;
        case 'loss':
            this.displayname = "Loss"
            this.legendtitle = "Packet loss rate";
            this.legendlabels = [
                'No loss',
                '0 - 5% loss',
                '5 - 10% loss',
                '10 - 20% loss',
                '20 - 30% loss',
                '30 - 75% loss',
                '> 75% loss',
            ];
            break;
    }

    this.metricData = [
        { 'text': 'DNS Latency', 'value': 'dns' },
        { 'text': 'ICMP Latency', 'value': 'icmp' },
        { 'text': 'TCP Latency', 'value': 'tcp' },
    ];

    this.splitData = [
        {'text': 'Show both IPv4 and IPv6', 'value': 'both',
                'shortlabel': "Both" },
        {'text': 'Show IPv4 only', 'value': 'ipv4', 'shortlabel': 'IPv4' },
        {'text': 'Show IPv6 only', 'value': 'ipv6', 'shortlabel': 'IPv6' },
    ];

    this.members = ['latency', 'absolute-latency', 'loss'];
}

LatencyMatrix.prototype = new BaseMatrix();
LatencyMatrix.prototype.constructor = LatencyMatrix;

LatencyMatrix.prototype.getDisplayName = function(name) {

    if (name.search("www.") == 0) {
        return name.slice(4);
    }

    return BaseMatrix.prototype.getDisplayName.call(this, name);

}

LatencyMatrix.prototype.isValidURL = function() {
    var parts = this.deconstructURL();

    if (parts.length != 5)
        return false;

    if (parts[0] != 'latency' && parts[0] != 'absolute-latency' &&
            parts[0] != 'loss') {
        return false;
    }

    if (parts[1] != 'both' && parts[1] != 'ipv4' && parts[1] != 'ipv6') {
        return false;
    }

    if (parts[4] != 'tcp' && parts[4] != 'udp' && parts[4] != 'icmp') {
        return false;
    }

    return true;

}

LatencyMatrix.prototype.colourCell = function(cellData, params, src, dest) {
    var cellcolours = ['test-none', 'test-none'];
    
    if (params.test == "latency") {
        cellcolours[0] = getClassForRelativeLatency(cellData['ipv4']);
        cellcolours[1] = getClassForRelativeLatency(cellData['ipv6']);
    } else if (params.test == "loss") {
        cellcolours[0] = getClassForLoss(cellData['ipv4']);
        cellcolours[1] = getClassForLoss(cellData['ipv6']);
    } else {
        cellcolours[0] = getClassForAbsoluteLatency(cellData['ipv4']);
        cellcolours[1] = getClassForAbsoluteLatency(cellData['ipv6']);
    }

    if (params.split == "ipv4")
        return [cellcolours[0]];
    if (params.split == "ipv6")
        return [cellcolours[1]];

    return cellcolours;
}

function getClassForAbsoluteLatency(data) {

    var latency = data[1];

    if (latency == undefined || latency == 'X')
        return 'test-none';

    if (latency < 0)
        return 'test-error';

    /* XXX If these are ever changed, make sure to update the legend labels
     * as well! */
    return getCellColour(latency, [
            latency <= 5000,
            latency <= 25000,
            latency <= 50000,
            latency <= 100000,
            latency <= 200000,
            latency <= 300000
    ]); 

}

function getClassForLoss(data) {

    var loss = data[1];

    if (loss == undefined || loss == 'X')
        return 'test-none';

    if (loss < 0)
        return 'test-error';

    /* XXX If these are ever changed, make sure to update the legend labels
     * as well! */
    return getCellColour(loss, [
            loss == 0,
            loss <= 5,
            loss <= 10,
            loss <= 20,
            loss <= 30,
            loss <= 75
    ]); 

}

function getClassForRelativeLatency(data) {

    var latency = data[1],
        mean = data[2],
        stddev = data[3];

    if (latency == undefined || latency == 'X')
        return 'test-none';

    if (latency < 0)
        return 'test-error';

    /* XXX If these are ever changed, make sure to update the legend labels
     * as well! */
    return getCellColour(latency, [
            latency <= mean,
            latency <= mean * (stddev * 0.5),
            latency <= mean * stddev,
            latency <= mean * (stddev * 1.5),
            latency <= mean * (stddev * 2),
            latency <= mean * (stddev * 3)
    ]); 

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
