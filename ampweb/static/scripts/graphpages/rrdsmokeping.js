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

function RRDSmokepingGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "rrd-smokeping";
    this.graphstyle = "rrd-smokeping";
    this.generictitle = "Smokeping Graphs";
    this.modal = new SmokepingModal();
}

RRDSmokepingGraphPage.prototype = new CuzGraphPage();
RRDSmokepingGraphPage.prototype.constructor = RRDSmokepingGraphPage;

RRDSmokepingGraphPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'rrd-smokeping',
          'title': 'Latency', 'selected': true }
    ];
};


RRDSmokepingGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [{id: this.view}],
        urlbase: API_URL + "/_view/rrd-smokeping/",
        event_urlbase: API_URL + "/_event/rrd-smokeping/",
        miny: 0,
        units: "ms",
        ylabel: "Latency (ms)"
    });

    this.graph.createGraphs();
};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
