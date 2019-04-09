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

function LossMatrix() {

    BaseMatrix.call(this);

    this.graphstyle = "amp-loss";
    this.statecookieid = "ampwebMatrixLossState";

    this.displayname = "Loss"
    this.metricData = [
        { 'text': 'DNS Loss', 'value': 'dns' },
        { 'text': 'ICMP Loss', 'value': 'icmp' },
        { 'text': 'TCP Loss', 'value': 'tcp' },
        { 'text': 'UDPStream Loss', 'value': 'udpstream' },
        { 'text': 'ICMPStream Loss', 'value': 'fastping' },
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

    if (!('test' in parts) || parts['test'] != 'loss') {
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
             parts['metric'] != 'udpstream' &&
             parts['metric'] != 'fastping')) {
        return false;
    }

    if (!('absrel' in parts) ||
            (parts['absrel'] != 'absolute' && parts['absrel'] != 'relative')) {
        return false;
    }

    return true;
}

LossMatrix.prototype.getMatrixParameters = function() {

    var params = this.deconstructURL();

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
        dayloss = data[2],
        dayloss_sd = data[3];


    if (loss == undefined || loss == 'X')
        return 'test-none';

    if (loss < 0)
        return 'test-error';

    /* XXX If these are ever changed, make sure to update the legend labels
     * as well! */
    return getCellColour(loss, [
            loss <= dayloss || dayloss < 0,
            loss <= dayloss + (dayloss_sd * 0.5),
            loss <= dayloss + (dayloss_sd),
            loss <= dayloss + (dayloss_sd * 1.5),
            loss <= dayloss + (dayloss_sd * 2.0),
            loss <= dayloss + (dayloss_sd * 3.0)
    ]);


}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
