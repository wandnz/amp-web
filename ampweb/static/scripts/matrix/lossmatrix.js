function LossMatrix() {

    BaseMatrix.call(this);

    this.graphstyle = "amp-loss";
    this.statecookieid = "ampwebMatrixLossState";

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

    this.metricData = [
        { 'text': 'DNS Loss', 'value': 'dns' },
        { 'text': 'ICMP Loss', 'value': 'icmp' },
        { 'text': 'TCP Loss', 'value': 'tcp' },
        { 'text': 'UDPStream Loss', 'value': 'udpstream' },
    ];

    this.splitData = [
        {'text': 'Show both IPv4 and IPv6', 'value': 'both',
                'shortlabel': "Both" },
        {'text': 'Show IPv4 only', 'value': 'ipv4', 'shortlabel': 'IPv4' },
        {'text': 'Show IPv6 only', 'value': 'ipv6', 'shortlabel': 'IPv6' },
    ];

    this.members = ['loss'];
}

LossMatrix.prototype = new BaseMatrix();
LossMatrix.prototype.constructor = LossMatrix;

LossMatrix.prototype.getLegendItems = function(params) {
    if (params.absrel == "relative") {
        return [
            {'colour': 'test-colour1', 'label':"Loss has decreased"},
            {'colour': 'test-colour2', 'label':"Loss has increased by < 5%"},
            {'colour': 'test-colour3', 'label':"Loss has increased by 5 - 10%"},
            {'colour': 'test-colour4', 'label':"Loss has increased by 10 - 20%"},
            {'colour': 'test-colour5', 'label':"Loss has increased by 20 - 30%"},
            {'colour': 'test-colour6', 'label':"Loss has increased by 30 - 50%"},
            {'colour': 'test-colour7', 'label':"Loss has increased by > 50%"},
        ];
    } else {
        return [
            {'colour': 'test-colour1', 'label':"No loss"},
            {'colour': 'test-colour2', 'label':"0 - 5% loss"},
            {'colour': 'test-colour3', 'label':"5 - 10% loss"},
            {'colour': 'test-colour4', 'label':"10 - 20% loss"},
            {'colour': 'test-colour5', 'label':"20 - 30% loss"},
            {'colour': 'test-colour6', 'label':"30 - 75% loss"},
            {'colour': 'test-colour7', 'label':"> 75% loss"},
        ];
    }
}

LossMatrix.prototype.getLegendTitle = function(params) {

    if (params.absrel == "relative") {
        return "Increase relative to daily mean";
    } else if (params.test == "latency") {
        return "Recent loss";
    }
    return "Legend";
}


LossMatrix.prototype.getDisplayName = function(name) {

    if (name.search("www.") == 0) {
        return name.slice(4);
    }

    return BaseMatrix.prototype.getDisplayName.call(this, name);

}

LossMatrix.prototype.isValidURL = function() {
    var parts = this.deconstructURL();

    if (parts.length != 5)
        return false;

    if (parts[0] != 'loss') {
        return false;
    }

    if (parts[1] != 'both' && parts[1] != 'ipv4' && parts[1] != 'ipv6') {
        return false;
    }

    if (parts[4] != 'tcp' && parts[4] != 'dns' && parts[4] != 'icmp' &&
            parts[4] != "udpstream") {
        return false;
    }

    return true;

}

LossMatrix.prototype.getMatrixParameters = function() {

    params = this.deconstructURL();

    if (params.metric == "udpstream") {
        return {
            testType: params.test,
            source: params.source,
            destination: params.destination,
            metric: params.metric,
            direction: "out",
            split: params.split
        }
    }

    return {
        testType: params.test,
        source: params.source,
        destination: params.destination,
        metric: params.metric,
        split: params.split
    }
}


LossMatrix.prototype.colourCell = function(cellData, params, src, dest) {
    var cellcolours = ['test-none', 'test-none'];

    if (params.absrel == "absolute") {
        cellcolours[0] = getClassForLoss(cellData['ipv4']);
        cellcolours[1] = getClassForLoss(cellData['ipv6']);
    } else {
        cellcolours[0] = getClassForRelativeLoss(cellData['ipv4']);
        cellcolours[1] = getClassForRelativeLoss(cellData['ipv6']);
    }

    if (params.split == "ipv4")
        return [cellcolours[0]];
    if (params.split == "ipv6")
        return [cellcolours[1]];

    return cellcolours;
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

function getClassForRelativeLoss(data) {
    var loss = data[1],
        dayloss = data[2];

    if (loss == undefined || loss == 'X')
        return 'test-none';

    if (loss < 0)
        return 'test-error';

    /* XXX If these are ever changed, make sure to update the legend labels
     * as well! */
    return getCellColour(loss, [
            loss <= dayloss || dayloss < 0,
            loss <= dayloss + 5.0,
            loss <= dayloss + 10.0,
            loss <= dayloss + 20.0,
            loss <= dayloss + 30.0,
            loss <= dayloss + 50.0
    ]);


}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
