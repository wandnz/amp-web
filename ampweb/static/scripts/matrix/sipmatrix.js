/*
 * This file is part of amp-web.
 *
 * Copyright (C) 2013-2020 The University of Waikato, Hamilton, New Zealand.
 *
 * Authors: Shane Alcock
 *          Brendon Jones
 *
 * All rights reserved.
 *
 * This code has been developed by the WAND Network Research Group at the
 * University of Waikato. For further information please see
 * http://www.wand.net.nz/
 *
 * amp-web is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 *
 * amp-web is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with amp-web; if not, write to the Free Software Foundation, Inc.
 * 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Please report any bugs, questions or comments to contact@wand.net.nz
 */

function SipMatrix() {
    BaseMatrix.call(this);
    this.graphstyle = "amp-sip";
    this.defaultmetric = "mos";
    this.statecookieid = "ampwebMatrixSipState";
    this.displayname = "SIP/RTP";

    this.metricData = [
        {'text': 'MOS', 'value': 'mos'},
        {'text': 'RTT', 'value': 'rtt_mean'},
        {'text': 'Initial Response Time', 'value': 'response_time'},
        {'text': 'Connect Time', 'value': 'connect_time'},
    ];

    this.splitData = [
        {'text': 'Both transmit and receive', 'value': 'bothdirs', 'shortlabel': 'Both'},
        {'text': 'Receive only', 'value': 'rx', 'shortlabel': 'Receive'},
        {'text': 'Transmit only', 'value': 'tx', 'shortlabel': 'Transmit'},
    ];
}


SipMatrix.prototype = new BaseMatrix();
SipMatrix.prototype.constructor = SipMatrix;


SipMatrix.prototype.getLegendItems = function(params) {
    if ( params.absrel == "relative" ) {
        return [
            {'colour': 'test-colour1', 'label': 'At or above mean'},
            {'colour': 'test-colour2', 'label': '0 - 0.5 standard deviations'},
            {'colour': 'test-colour3', 'label': '0.5 - 1.0 standard deviations'},
            {'colour': 'test-colour4', 'label': '1.0 - 1.5 standard deviations'},
            {'colour': 'test-colour5', 'label': '1.5 - 2.0 standard deviations'},
            {'colour': 'test-colour6', 'label': '2.0 - 3.0 standard deviations'},
            {'colour': 'test-colour7', 'label': '> 3.0 standard deviations'},
        ];
    }

    switch ( params.metric ) {
        case 'mos':
            return [
                {'colour': 'test-colour1', 'label': 'MOS >= 4.5'},
                {'colour': 'test-colour2', 'label': 'MOS 4.0 to 4.5'},
                {'colour': 'test-colour3', 'label': 'MOS 3.5 to 4.0'},
                {'colour': 'test-colour4', 'label': 'MOS 3.0 to 3.5'},
                {'colour': 'test-colour5', 'label': 'MOS 2.5 to 3.0'},
                {'colour': 'test-colour6', 'label': 'MOS 2.0 to 2.5'},
                {'colour': 'test-colour7', 'label': 'MOS < 2'},
            ];

        case 'rtt_mean':
        case 'response_time':
        case 'connect_time':
            return [
                {'colour': 'test-colour1', 'label': 'Latency < 5ms'},
                {'colour': 'test-colour2', 'label': 'Latency 5 - 25ms'},
                {'colour': 'test-colour3', 'label': 'Latency 25 - 50ms'},
                {'colour': 'test-colour4', 'label': 'Latency 50 - 100ms'},
                {'colour': 'test-colour5', 'label': 'Latency 100 - 200ms'},
                {'colour': 'test-colour6', 'label': 'Latency 200 - 300ms'},
                {'colour': 'test-colour7', 'label': 'Latency >= 300ms'},
            ];
    }

    return [];
};


SipMatrix.prototype.getGraphStyle = function(params) {
    return "amp-sip";
};


SipMatrix.prototype.getLegendTitle = function(params) {
    if ( params.absrel == "relative" ) {
        return "Decrease relative to the daily mean";
    }

    switch ( params.metric ) {
        case "mos": return "Mean Opinion Score";
        case "rtt_mean": return "Mean RTT";
        case "response_time": return "Initial Response Time";
        case "connect_time": return "Connect Time";
    }

    return "Legend";
};


SipMatrix.prototype.colourCell = function(cellData, params, src, dest) {
    var cellcols = ['test-none', 'test-none'];

    cellcols[0] = getSipCellColour(cellData['rx'], params);
    cellcols[1] = getSipCellColour(cellData['tx'], params);

    if ( params.split == 'rx' ) {
        return [cellcols[0]];
    }

    if ( params.split == 'tx' ) {
        return [cellcols[1]];
    }

    return cellcols;
};


SipMatrix.prototype.isValidURL = function() {
    var parts = this.deconstructURL();

    if (!('test' in parts) || parts['test'] != 'sip') {
        return false;
    }

    if (!('family' in parts) ||
            (parts['family'] != 'ipv4' &&
             parts['family'] != "ipv6")) {
        return false;
    }

    if (!('metric' in parts) ||
            (parts['metric'] != 'mos' &&
             parts['metric'] != 'rtt_mean' &&
             parts['metric'] != 'response_time' &&
             parts['metric'] != 'connect_time')) {
        return false;
    }

    if (!('split' in parts) ||
            (parts['split'] != 'bothdirs' &&
             parts['split'] != 'rx' &&
             parts['split'] != 'tx')) {
        return false;
    }

    if (!('absrel' in parts) ||
            (parts['absrel'] != 'absolute' && parts['absrel'] != 'relative')) {
        return false;
    }

    return true;
};


SipMatrix.prototype.deconstructURL = function() {
    var segments = getURI().segment();
    var index = segments.indexOf("matrix");

    for (var i = segments.length; i <= 8; i++) {
        segments.push(null);
    }

    return {
        'prefix': (index == 0 ? "" : segments.slice(0, index).join("/") + "/"),
        'test': (segments[index + 1] || 'tput'),
        'family': (segments[index + 2] || 'ipv4'),
        'source': (segments[index + 3] || undefined),
        'destination': (segments[index + 4] || undefined),
        'metric': (segments[index + 5] || this.defaultmetric),
        'split': (segments[index + 6] || 'bothdirs'),
        'absrel': (segments[index + 7] || 'absolute'),
    };
};


SipMatrix.prototype.constructURL = function(params, current, base) {
    var url = base;
    var laststate = this.loadTabState();

    url += (params.test || current.test) + '/';

    /* splits are not common across all matrix types so convert back to
     * 'bothdirs' if this is not a split we support */
    if ( current.split != 'rx' && current.split != 'tx' &&
            current.split != 'bothdirs' ) {
        if ( laststate.split ) {
            current.split = laststate.split;
        } else {
            current.split = 'bothdirs';
        }
    }

    if ( current.metric != this.defaultmetric ) {
        if ( laststate.metric ) {
            current.metric = laststate.metric;
        } else {
            current.metric = this.defaultmetric;
        }
    }

    if ( current.family != 'ipv4' && current.family != 'ipv6' ) {
        if ( laststate.family ) {
            current.family = laststate.family;
        } else {
            current.family = 'ipv4';
        }
    }

    url += (params.family || current.family) + '/';
    /* don't save a url in the cookie with broken, undefined source mesh */
    if ( params.source == undefined && current.source == undefined ) {
        return url;
    }
    url += (params.source || current.source) + '/';
    /* don't save a url in the cookie with broken, undefined destination mesh */
    if ( params.destination == undefined && current.destination == undefined ) {
        return url;
    }
    url += (params.destination || current.destination) + '/';
    url += (params.metric || current.metric) + '/';
    url += (params.split || current.split) + "/";
    url += (params.absrel || current.absrel) + '/';

    return url;
};


SipMatrix.prototype.getMatrixParameters = function() {
    var params = this.deconstructURL();

    return {
        testType: params.test,
        source: params.source,
        destination: params.destination,
        metric: params.metric,
        family: params.family,
        split: params.split,
        absrel: params.absrel,
    };
};


SipMatrix.prototype.getSparklineYRange = function(sparkmax) {
    return [0, sparkmax * 1.25];
};


SipMatrix.prototype.getSparklineColour = function(series) {
    if ( series.toLowerCase().lastIndexOf("_rx_ipv4") > 0 ) {
        return "blue";
    }

    if ( series.toLowerCase().lastIndexOf("_rx_ipv6") > 0 ) {
        return "blue";
    }

    return "red";
};


SipMatrix.prototype.formatTooltipStats = function(stats, content,
        split, metric) {
    var thead = "";
    var tbody = "";
    var table = $('<table/>').appendTo(content);

    thead = "<tr><th>Time period</th>";

    if ( split == "rx" || split == "bothdirs" ) {
        thead += "<th class='firsthalf'>Receive</th>";
    }

    if ( split == "tx" || split == "bothdirs" ) {
        thead += "<th class='secondhalf'>Transmit</th>";
    }

    thead += "</tr>";
    $('<thead/>').appendTo(table).append(thead);

    tbody = $('<tbody/>').appendTo(table);

    for ( var i = 0; i < stats.length; i++ ) {
        var values = stats[i].value.split('/');

        td = "<td>" + stats[i].label + "</td>";

        if ( split == "rx" || split == "bothdirs" ) {
            td += "<td>" + values[0] + "</td>";
        }

        if ( split == "tx" || split == "bothdirs" ) {
            td += "<td>" + values[1] + "</td>";
        }

        $("<tr/>").appendTo(tbody).append(td);
    }

    return table;
};


function getSipCellColour(cellData, params) {
    var index = {
        "mos": 1,
        "rtt_mean": 4,
        "response_time": 7,
        "connect_time": 10,
    };

    if ( !(params.metric in index) ) {
        return "test-error";
    }

    var offset = index[params.metric];
    var value = cellData[offset];
    var value_day = cellData[offset + 1];
    var value_day_sd = cellData[offset + 2];

    /* undefined values means the test is not performed */
    if ( value == undefined ) {
        return "test-none";
    }

    if ( value < 0 || value == null ) {
        return "test-error";
    }

    if ( params.absrel == "relative" ) {
        return getCellColour(value, [
            value >= value_day || value_day_sd < 0,
            value >= value_day - (value_day_sd * 0.5),
            value >= value_day - (value_day_sd * 1.0),
            value >= value_day - (value_day_sd * 1.5),
            value >= value_day - (value_day_sd * 2.0),
            value >= value_day - (value_day_sd * 3.0),
        ]);
    }

    switch ( params.metric ) {
        case "mos":
            return getCellColour(value, [
                    value >= 4.5,
                    value >= 4.0,
                    value >= 3.5,
                    value >= 3.0,
                    value >= 2.5,
                    value >= 2.0,
            ]);

        case "rtt_mean":
        case "response_time":
        case "connect_time":
            return getCellColour(value, [
                    value <= 5000,
                    value <= 25000,
                    value <= 50000,
                    value <= 100000,
                    value <= 200000,
                    value <= 300000
            ]);
    }

    return "test-error";
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
