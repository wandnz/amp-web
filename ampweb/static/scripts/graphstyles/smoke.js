function SmokepingGraph(params) {
    BasicTimeSeriesGraph.call(this, params);
   
    /* Override the basic line style with our smokeping style */ 
    this.configureStyle = function() {
        this.detailgraph.options.config.smoke = 
                jQuery.extend(true, {}, CuzSmokeConfig);
        this.summarygraph.options.config.smoke = 
                jQuery.extend(true, {}, CuzSmokeConfig);
    }

    /* Maximum Y value must be calculated based on the smoke, rather than
     * just the median */
    this.findMaximumY = function(data, start, end) {
        var maxy = 0;
        var startind, i, j;

        startind = null;
        for (i = 0; i < data.length; i++) {
            if (startind === null) {
                if (data[i][0] >= start * 1000) {
                    startind = i;

                    if (i != 0) {
                        for (j = 3; j < data[i].length; j++) {
                            if (data[i - 1][j] == null)
                                continue
                            if (data[i - 1][j] > maxy)
                                maxy = data[i - 1][j];
                        }
                    }
                } else {
                    continue;
                }
            }

            for (j = 3; j < data[i].length; j++) {
                if (data[i][j] == null)
                    continue
                if (data[i][j] > maxy)
                    maxy = data[i][j];
            }

            if (data[i][0] > end * 1000)
                break;
        }
        if (maxy == 0 || maxy == null)
            return 1;

        return maxy;
    }
}

SmokepingGraph.prototype = inherit(BasicTimeSeriesGraph.prototype);
SmokepingGraph.prototype.constructor = SmokepingGraph;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
