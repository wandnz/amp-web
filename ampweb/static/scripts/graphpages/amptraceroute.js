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

function AmpTracerouteHopsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute_pathlen";
    this.graphstyle = "amp-traceroute-hops";
    this.generictitle = "AMP Traceroute Graphs";
    this.modal = new AmpTracerouteModal();
}

function AmpTracerouteRainbowGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-astraceroute";
    this.graphstyle = "amp-astraceroute";
    this.generictitle = "AMP AS Traceroute Graphs";
    this.modal = new AmpTracerouteRainbowModal();
}

function AmpTracerouteMapPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.graphstyle = "amp-traceroute";
    this.generictitle = "AMP Traceroute Graphs";
    this.modal = new AmpTracerouteMapModal();
}


AmpTracerouteHopsGraphPage.prototype = new CuzGraphPage();
AmpTracerouteHopsGraphPage.prototype.constructor = AmpTracerouteHopsGraphPage;

AmpTracerouteRainbowGraphPage.prototype = new CuzGraphPage();
AmpTracerouteRainbowGraphPage.prototype.constructor = AmpTracerouteRainbowGraphPage;

AmpTracerouteMapPage.prototype = new CuzGraphPage();
AmpTracerouteMapPage.prototype.constructor = AmpTracerouteMapPage;

AmpTracerouteHopsGraphPage.prototype.getTabs = function() {
    return [];
};

AmpTracerouteRainbowGraphPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'amp-astraceroute',
          'title': 'AS Path', 'selected': true},
        { 'graphstyle': 'amp-traceroute',
          'title': 'Path Map', 'selected': false}
    ];
};

AmpTracerouteMapPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'amp-astraceroute',
          'title': 'AS Path', 'selected': false},
        { 'graphstyle': 'amp-traceroute',
          'title': 'Path Map', 'selected': true}
    ];
};

AmpTracerouteRainbowGraphPage.prototype.drawGraph = function(start, end,
        first, legend) {
    this.graph = new RainbowGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [{id: this.view}], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-astraceroute/",
        event_urlbase: API_URL + "/_event/amp-astraceroute/",
        miny: 0,
        drawEventsBehind: false,
        units: "hops",
        ylabel: "Number of Hops",
        measureLatency: false,
        minHopHeight: 5
    });

    this.graph.createGraphs();
};

AmpTracerouteHopsGraphPage.prototype.drawGraph = function(start, end, first,
        legend) {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [{id: this.view}], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute_pathlen/",
        event_urlbase: API_URL + "/_event/amp-astraceroute/",
        miny: 0,
        units: "hops",
        ylabel: "Number of Hops"
    });

    this.graph.createGraphs();
};

AmpTracerouteMapPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new TracerouteMap({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [{id: this.view}], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute/",
        event_urlbase: API_URL + "/_event/amp-astraceroute/"
    });

    this.graph.createGraphs();
};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
