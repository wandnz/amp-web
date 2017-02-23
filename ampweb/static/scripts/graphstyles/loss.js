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

function LossGraph(params) {
    BasicTimeSeriesGraph.call(this, params);
    this.stylename = "basic";

    this.displayLegendTooltip = function(o, legenddata) {

        /* Quick loop to count number of groups - break early if possible */
        var count = 0;
        for (var group in legenddata) {
            if (legenddata.hasOwnProperty(group)) {
                count++;
                if (count > 1) {
                    break; /* We don't care if the count is any greater */
                }
            }
        }

        for (var group in legenddata) {
            if (legenddata.hasOwnProperty(group)) {
                for (var i = 0; i < legenddata[group].lines.length; i++) {
                    var colourid = legenddata[group].lines[i][2];
                    if (colourid === o.nearest.index) {
                        var ip = legenddata[group].lines[i][1];
                        var colour = getSeriesStyle(colourid);
                        var key = "<em style='color:"+colour+";'>&mdash;</em>";
                        var disambiguate = "";
                        var period = Math.round(this.datafreq / 60);

                        /* If there is more than one group displayed on the
                         * graph, we need to distinguish between them */
                        if (count > 1) {
                            disambiguate = legenddata[group].label;
                        }

                        var tsstr = simpleDateString(parseInt(o.x));
                        var ttip = "";
                        if (ip != disambiguate && disambiguate != "") {
                            ttip = key + " " + disambiguate + " " + ip;
                        } else {
                            ttip = key + " " + ip;
                        }

                        /* XXX can we do something better than this basic
                         * HTML here? */
                        ttip += "<br /><hr><table><tr><td>" + tsstr + "</td>";
                        ttip += "<td>" + o.y + " " + this.units;
                        ttip += "</td></tr>";
                        ttip += "<tr><td></td>";
                        ttip += "<td>(averaged over " + period;
                        ttip += " minutes)</td>";
                        ttip += "</tr></table>";
                        return ttip;
                    }
                }
            }
        }

        return "Unknown point";
    };
}

LossGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
LossGraph.prototype.constructor = LossGraph;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
