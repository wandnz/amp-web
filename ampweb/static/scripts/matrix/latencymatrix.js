/*
 * This file is part of amp-web.
 *
 * Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
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

function LatencyMatrix(tabname) {

    BaseMatrix.call(this);
    this.statecookieid = "ampwebMatrixLatencyState";
    this.metricData = [
        { 'text': 'DNS Latency', 'value': 'dns' },
        { 'text': 'ICMP Latency', 'value': 'icmp' },
        { 'text': 'TCP Latency', 'value': 'tcp' },
        { 'text': 'UDPStream Latency', 'value': 'udpstream' },
    ];

    this.splitData = [
        {'text': 'Show both IPv4 and IPv6', 'value': 'both',
                'shortlabel': "Both" },
        {'text': 'Show IPv4 only', 'value': 'ipv4', 'shortlabel': 'IPv4' },
        {'text': 'Show IPv6 only', 'value': 'ipv6', 'shortlabel': 'IPv6' },
    ];

    this.displayname = "Latency";
}

LatencyMatrix.prototype = new BaseMatrix();
LatencyMatrix.prototype.constructor = LatencyMatrix;

LatencyMatrix.prototype.getDisplayName = function(name) {

    if (name.search("www.") == 0) {
        return name.slice(4);
    }

    return BaseMatrix.prototype.getDisplayName.call(this, name);

}

LatencyMatrix.prototype.getLegendItems = function(params) {

    if (params.absrel == "relative") {
        return [
            {'colour': 'test-colour1', 'label':"Below or at mean"},
            {'colour': 'test-colour2', 'label':"0 - 0.5 standard deviations"},
            {'colour': 'test-colour3', 'label':"0.5 - 1.0 standard deviations"},
            {'colour': 'test-colour4', 'label':"1.0 - 1.5 standard deviations"},
            {'colour': 'test-colour5', 'label':"1.5 - 2.0 standard deviations"},
            {'colour': 'test-colour6', 'label':"2.0 - 3.0 standard deviations"},
            {'colour': 'test-colour7', 'label':"> 3.0 standard deviations"},
        ];
    } else {
        return [
            {'colour': 'test-colour1', 'label':"Latency < 5ms"},
            {'colour': 'test-colour2', 'label':"Latency 5 - 25ms"},
            {'colour': 'test-colour3', 'label':"Latency 25 - 50ms"},
            {'colour': 'test-colour4', 'label':"Latency 50 - 100ms"},
            {'colour': 'test-colour5', 'label':"Latency 100 - 200ms"},
            {'colour': 'test-colour6', 'label':"Latency 200 - 300ms"},
            {'colour': 'test-colour7', 'label':"Latency >= 300ms"},
        ];
    }
}

LatencyMatrix.prototype.isValidURL = function() {
    var parts = this.deconstructURL();

    if (!('test' in parts) ||
            (parts['test'] != 'latency' &&
             parts['test'] != 'absolute-latency' &&
             parts['test'] != 'loss')) {
        return false;
    }

    if (!('split' in parts) ||
            (parts['split'] != 'both' &&
             parts['split'] != 'ipv4' &&
             parts['split'] != "ipv6")) {
        return false;
    }

    if (!('metric' in parts) ||
            (parts['metric'] != 'icmp' &&
             parts['metric'] != 'tcp' &&
             parts['metric'] != 'dns' &&
             parts['metric'] != 'udpstream')) {
        return false;
    }

    if (!('absrel' in parts) ||
            (parts['absrel'] != 'absolute' && parts['absrel'] != 'relative')) {
        return false;
    }

    return true;
}

LatencyMatrix.prototype.getMatrixParameters = function() {

    var params = this.deconstructURL();

    if (params.metric == "udpstream") {
        return {
            testType: params.test,
            source: params.source,
            destination: params.destination,
            metric: params.metric,
            direction: "out",
            split: params.split,
            absrel: params.absrel,
        }
    }

    return {
        testType: params.test,
        source: params.source,
        destination: params.destination,
        metric: params.metric,
        split: params.split,
        absrel: params.absrel,
    }
}

LatencyMatrix.prototype.getLegendTitle = function(params) {

    if (params.absrel == "relative") {
        return "Increase relative to daily mean";
    } else if (params.test == "latency") {
        return "Recent latency";
    }

    return "Legend";
}



LatencyMatrix.prototype.colourCell = function(cellData, params, src, dest) {
    var cellcolours = ['test-none', 'test-none'];

    if (params.test == "latency" && params.absrel == "relative") {
        cellcolours[0] = getClassForRelativeLatency(cellData['ipv4']);
        cellcolours[1] = getClassForRelativeLatency(cellData['ipv6']);
    } else if (params.test == "latency" && params.absrel == "absolute") {
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
            stddev < 0 || latency - mean <= 1000.0,
            latency <= mean + (stddev * 0.5) || latency - mean <= 5000.0,
            latency <= mean + stddev,
            latency <= mean + (stddev * 1.5),
            latency <= mean + (stddev * 2),
            latency <= mean + (stddev * 3)
    ]);

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
