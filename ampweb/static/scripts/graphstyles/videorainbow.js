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

function VideoRainbowGraph(params) {

    BasicTimeSeriesGraph.call(this, params);
    this.stylename = "videorainbow";

    this.configureStyle = function() {
        var detopts = this.detailgraph.options,
            sumopts = this.summarygraph.options;

        detopts.config.videorainbow =
            jQuery.extend(true, {}, CuzVideoRainbowConfig);
        sumopts.config.videorainbow =
            jQuery.extend(true, {}, CuzVideoRainbowConfig);
    };

    this.formDataURL = function() {
        // XXX do I need a separate full detail?
        var url = this.dataurl + "rainbow/" + this.lines[0].id;
        url += "/" + this.detailgraph.start + "/" + this.detailgraph.end;
        return url;
    };

    this.formSummaryURL = function() {
        // XXX do I need a separate summary detail?
        var url = this.dataurl + "rainbow-summary/" + this.lines[0].id;
        url += "/" + this.summarygraph.start + "/" + this.summarygraph.end;
        return url;
    };

    this.__processSummaryData = this.processSummaryData;
    this.__processDetailedData = this.processDetailedData;

    this.findMaximumY = function(data, start, end) {
        /* total non-playing time is at index 6 */
        return this._findMaximumYByIndex(data, start, end, 6);
    };

    this.findMinimumY = function(data, start, end) {
        return 0;
    };

    this.displayTooltip = function(o) {
        if (o.nearest.event) {
            return this.displayEventTooltip(o);
        }

        var block = o.nearest.block;
        var ttip = "";
        var tsstr = simpleDateString(parseInt(block[0]));
        var component;

        switch ( block[4] ) {
            case 0: component = "Preparing to download"; break;
            case 1: component = "Initial buffering before playback"; break;
            /*case 2: component = "Playing video from buffered data"; break;*/
            case 2: component = "Stalling to buffer more video data"; break;
            default: component = "Unknown"; break;
        };

        ttip += tsstr + "<br />";
        ttip += "<hr>";
        ttip += "<table>";
        ttip += "<tr><td>" + component + "</td></tr>";
        ttip += "<tr><td>" + (block[2] - block[1]).toFixed(3) + " " +
            this.units + "</td></tr>";
        ttip += "</table>";

        return ttip;
    };

    this.usecRound = function(number, decimals) {
        return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
    };
}

VideoRainbowGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
VideoRainbowGraph.prototype.constructor = VideoRainbowGraph;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
