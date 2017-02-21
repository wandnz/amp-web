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

function JitterPercentileGraph(params) {

    BasicTimeSeriesGraph.call(this, params);
    this.stylename = "jitterrainbow";

    this.configureStyle = function() {
        var detopts = this.detailgraph.options,
            sumopts = this.summarygraph.options;

        detopts.config.jitterrainbow = jQuery.extend(true, {}, CuzJitterRainbowConfig);
        sumopts.config.jitterrainbow = jQuery.extend(true, {}, CuzJitterRainbowConfig);

    };

    this.formDataURL = function() {
        var url = this.dataurl + "jitter/" + this.lines[0].id;
        url += "/" + this.detailgraph.start + "/" + this.detailgraph.end;
        return url;
    };

    this.formSummaryURL = function() {
        var url = this.dataurl + "jitter-summary/" + this.lines[0].id;
        url += "/" + this.summarygraph.start + "/" + this.summarygraph.end;
        return url;
    };

    this.__processSummaryData = this.processSummaryData;
    this.__processDetailedData = this.processDetailedData;

    this.findMaximumY = function(data, start, end) {
        return this._findMaximumYByIndex(data, start, end, 11);
    };

    this.findMinimumY = function(data, start, end) {
        var min = this._findMinimumYByIndex(data, start, end, 1);
        var min10 = this._findMinimumYByIndex(data, start, end, 2);

        if (min < min10) {
            return min;
        }
        return min10;
    };

    this.displayTooltip = function(o) {
        if (o.nearest.event) {
            return this.displayEventTooltip(o);
        }

        var block = o.nearest.block;
        var ttip = "";
        var tsstr = simpleDateString(parseInt(block[0]));

        ttip += tsstr + "<br /><hr><table><tr><td>";

        ttip += ((block[4] + 1) * 10) + "th percentile</td>";
        ttip += "<td>" + this.usecRound(block[2], 1) + " " + this.units;
        ttip += "</td></tr><td>";
        ttip += (block[4] * 10) + "th percentile</td>";
        ttip += "<td>" + this.usecRound(block[1], 1) + " " + this.units;
        ttip += "</td></tr>";
        ttip += "</table>";

        return ttip;
    };

    this.usecRound = function(number, decimals) {
        return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
    };

}

JitterPercentileGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
JitterPercentileGraph.prototype.constructor = JitterPercentileGraph;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
