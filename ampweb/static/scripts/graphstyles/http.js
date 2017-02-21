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

function HttpGraph(params) {
    BasicTimeSeriesGraph.call(this, params);
    this.stylename = "basic";

    this.findExtraStats = function(seriesid, ts) {
        detdata = this.detailgraph.options.data;

        for (var j = 1; j < detdata.length; j++) {
            var series = detdata[j].data;

            if (series.colourid != seriesid) {
                continue;
            }

            var maxloop = series.series.length;

            for (var i = 1; i < maxloop; i++) {
                if (series.series[i][0] > ts) {
                    return series.series[i - 1];
                }
            }
        }

        return [];
    };

    this.displayLegendTooltip = function(o, legenddata) {
        for (var group in legenddata) {
            if (legenddata.hasOwnProperty(group)) {
                for (var i = 0; i < legenddata[group].lines.length; i++) {
                    var colourid = legenddata[group].lines[i][2];
                    if (colourid === o.nearest.index) {
                        var colour = getSeriesStyle(colourid);
                        var key = "<em style='color:"+colour+";'>&mdash;</em>";
                        var url = legenddata[group].label;
                        var tsstr = simpleDateString(parseInt(o.x));
                        var ttip = key + " " + url;

                        ttip += "<br /><hr><table><tr><td>" + tsstr + "</td>";
                        ttip += "<td>" + o.y + " " + this.units + "</td>";

                        fullresult = this.findExtraStats(colourid, o.x);

                        if (fullresult.length == 5) {
                            var kbps = Math.round((fullresult[4] / fullresult[1]) * 100) / 100.0;

                            ttip += "<tr><td>Page size: ";
                            ttip += Math.round(fullresult[4]) + " KB</td>";
                            ttip += "<td>" + kbps + " KB/s</td></tr>";
                            ttip += "</table>";
                            ttip += "Fetched " + fullresult[3];
                            if (fullresult[3] == 1) {
                                ttip += " object from " + fullresult[2];
                            } else {
                                ttip += " objects from " + fullresult[2];
                            }

                            if (fullresult[2] == 1) {
                                ttip += " server";
                            } else {
                                ttip += " servers";
                            }

                        } else {
                            ttip += "</tr></table>";
                        }

                        return ttip;
                    }
                }
            }
        }
        return "Unknown point";
    };
}

HttpGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
HttpGraph.prototype.constructor = HttpGraph;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
