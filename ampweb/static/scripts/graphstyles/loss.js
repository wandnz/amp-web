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
