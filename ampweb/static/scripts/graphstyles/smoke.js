function SmokepingGraph(params) {
    BasicTimeSeriesGraph.call(this, params);
    this.stylename = "smoke";

    /* Override the basic line style with our smokeping style */
    this.configureStyle = function() {
        this.detailgraph.options.config.smoke =
                jQuery.extend(true, {}, CuzSmokeConfig);
        this.summarygraph.options.config.smoke =
                jQuery.extend(true, {}, CuzSmokeConfig);

        this.detailgraph.options.config.smoke.legenddata = params.legenddata;
        this.summarygraph.options.config.smoke.legenddata = params.legenddata;
    }

    this._processLegend = this.processLegend;
    this.processLegend = function() {
        this._processLegend();

        if ( getSeriesLineCount(this.legenddata) === 1 ) {
            this.detailgraph.options.config.events.greyLines = false;
            this.summarygraph.options.config.events.greyLines = false;
        }
    }

    /* Maximum Y value must be calculated based on the smoke, rather than
     * just the median */
    this.findMaximumY = function(data, start, end) {
        var maxy = 0;
        var startind, i, j, series;

        for ( series = 0; series < data.length; series++ ) {
            startind = null;
            if ( data[series].length == 0 ) {
                continue;
            }
           
            var currseries = data[series].data.series;
            
            for ( i = 0; i < currseries.length; i++ ) {
                if ( startind === null ) {
                    /* ignore values until we find one in range of the graph */
                    if ( currseries[i][0] >= start * 1000 ) {
                        startind = i;

                        /*
                         * Check out the value immediately preceding the graph
                         * as we will be drawing a line to it - if it's big
                         * then we probably want to update max y.
                         */
                        if ( i != 0 ) {
                            if ( currseries[i - 1][1] != null &&
                                    currseries[i - 1][1] > maxy ) {
                                maxy = currseries[i - 1][1];
                            }
                            for (j = 3; j < currseries[i].length; j++) {
                                if ( currseries[i - 1][j] == null ) {
                                    continue;
                                }
                                if ( currseries[i - 1][j] > maxy ) {
                                    maxy = currseries[i - 1][j];
                                }
                            }
                        }
                    } else {
                        /* data still out of graph range, continue */
                        continue;
                    }
                }

                /* our data is now fully within the graph, check it all */
                if ( currseries[i][1] != null &&
                        currseries[i][1] > maxy ) {
                    maxy = currseries[i][1];
                }
                for ( j = 3; j < currseries[i].length; j++ ) {
                    if ( currseries[i][j] == null ) {
                        continue;
                    }
                    if ( currseries[i][j] > maxy ) {
                        maxy = currseries[i][j];
                    }
                }

                /*
                 * Stop *after* we have found a value outside the range of the
                 * graph so that we check the values just off the right hand
                 * side in the same way we did the left.
                 */
                if ( currseries[i][0] > end * 1000 ) {
                    break;
                }

            }
        }

        if ( maxy == 0 || maxy == null ) {
            return 1;
        }

        return maxy;
    }

    this._displayTooltip = this.displayTooltip;
    this.displayTooltip = function(o) {
        if (o.nearest.event) {
            return this._displayTooltip(o);
        }

        var legenddata = o.nearest.series.smoke.legenddata;

        /* Quick loop to count number of groups - break early if possible */
        var count = 0;
        for ( var group in legenddata ) {
            if ( legenddata.hasOwnProperty(group) ) {
                count++;
                if ( count > 1)
                    break; /* We don't care if the count is any greater */
            }
        }

        for ( var group in legenddata ) {
            if ( legenddata.hasOwnProperty(group) ) {
                for ( var i = 0; i < legenddata[group].lines.length; i++ ) {
                    var colourid = legenddata[group].lines[i][2];
                    if ( colourid === o.nearest.index ) {
                        var ip = legenddata[group].lines[i][1];
                        var colour = getSeriesStyle(colourid);
                        var key = "<em style='color:"+colour+";'>&mdash;</em>";
                        var disambiguate = "";

                        /* If there is more than one group displayed on the
                         * graph, we need to distinguish between them */
                        if ( count > 1 ) {
                            disambiguate = legenddata[group].label + "<br />";
                        }

                        return disambiguate + key + " " + ip;
                    }
                }
                
            }
        }

        return "Unknown point";
    }
}

SmokepingGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
SmokepingGraph.prototype.constructor = SmokepingGraph;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
