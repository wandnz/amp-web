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

function AmpLossGraphPage(style) {
    CuzGraphPage.call(this);
    this.colname = "amp-latency";
    this.graphstyle = "amp-loss";
    this.generictitle = "AMP Loss Graphs";
    this.modal = new AmpLossModal(style);
}

AmpLossGraphPage.prototype = new CuzGraphPage();
AmpLossGraphPage.prototype.constructor = AmpLossGraphPage;

AmpLossGraphPage.prototype.getTabs = function() {
    return [];
};

AmpLossGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new LossGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [{id: this.view}], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-latency/",
        event_urlbase: API_URL + "/_event/amp-loss/",
        miny: 0,
        maxy: 105,
        dataindex: 2,
        units: "%",
        ylabel: "Loss (%)"
    });

    this.graph.createGraphs();
};

AmpLossGraphPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'amp-latency', 'title': 'Latency', 'selected': false},
        { 'graphstyle': 'amp-loss', 'title': 'Loss', 'selected': true},
        { 'graphstyle': 'amp-astraceroute', 'title': 'AS Path', 'selected': false},
    ];
};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
