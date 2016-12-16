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
        this.detailgraph.options.config.smoke.isdetail = true;
        this.summarygraph.options.config.smoke.legenddata = params.legenddata;
        this.summarygraph.options.config.smoke.isdetail = false;
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

            if (startind === null) {
                for (i = 0; i < currseries.length; i++) {
                    if (currseries[i][0] >= start * 1000) {
                        startind = i;
                        break;
                    } else {
                        continue;
                    }
                }
            }

            if (startind > 0) {
                i = startind;
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

            if (startind === null)
                continue;

            for (i = startind; i < currseries.length; i++) {
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

    this.displayTooltip = function(o) {
        if (o.nearest.event) {
            return this.displayEventTooltip(o);
        }

        var legenddata = o.nearest.series.smoke.legenddata;
        return this.displayLegendTooltip(o, legenddata);
    }

}

SmokepingGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
SmokepingGraph.prototype.constructor = SmokepingGraph;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
