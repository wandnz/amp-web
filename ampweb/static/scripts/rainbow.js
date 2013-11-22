/*
 * Rainbow style timeline graph
 */
Flotr.addType('rainbow', {
    options: {
        lineWidth: 2
    },

    hitContainers: {},
    hostCount: 0,
    legend: {},

    /**
     * Draws the rainbow graph in the canvas element.
     * @param {Object} options
     */
    draw: function (options) {
        var context = options.context;

        context.save();
        context.lineJoin = 'miter';

        this.plot(options);

        context.restore();
    },

    getFillStyle: function (host) {
        return this.getHSLA(host, false);
    },

    getStrokeStyle: function (host) {
        return this.getHSLA(host, true);
    },

    /**
     * Gets the HSLA CSS values to style each host uniquely.
     * HSLA = Hue, Saturation, Lightness, Alpha
     * Also returns specific values to represent error states.
     */
    getHSLA: function (host, stroke) {
        if ( !(host in this.legend) )
            this.legend[host] = this.hostCount++;

        /*
         * http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
         * As used in the Smokeping plugin
         */

        var h = (this.legend[host] * 222.49223594996221) % 360,
            s = host == "0.0.0.0" || host == "Error" ? 0 : 90,
            l = stroke ? 25 : (host == "Error" ? 30 : 60),
            a = 1.0;

        return "hsla("+h+", "+s+"%, "+l+"%, "+a+")";
    },

    /**
     * Plots the graph using the "plots" dictionary defined by
     * RainbowGraph.processSummaryData() in
     * scripts/graphstyles/rainbow.js
     *
     * Horizontally contiguous (joining) bars of the same host will
     * be combined into the same bar, cached and used to determine
     * (and draw) a hit on mouseover
     */
    plot: function (options) {

        var context   = options.context,
            xScale    = options.xScale,
            yScale    = options.yScale,
            minHeight = options.minHopHeight,
            plots     = options.plots,
            points    = options.points,
            data      = options.data;

        this.hitContainers = {};

        if ( points.length < 1 ) {
            return;
        }

        /*
         * It would almost be acceptable to use one way of plotting for
         * each graph (latency/hop count), but there are a couple of subtle
         * differences; particularly in the latency graph we need to worry
         * about minimum bar heights and the possibility that one bar appears
         * below another even though it should chronologically come after.
         * As such, it is easier to separate these two plotting methods out...
         */

        if ( !options.measureLatency ) {

            /*
             * If measuring hops, plot host-by-host
             */

            for ( var host in plots ) {
                if ( plots.hasOwnProperty(host) ) {
                    for ( var i = 0; i < plots[host].length; i++ ) {
                        var x0 = plots[host][i]["x0"],
                            x1 = plots[host][i]["x1"],
                            y0 = plots[host][i]["y0"],
                            y1 = plots[host][i]["y1"];

                        /*
                         * Join horizontally contiguous bars together
                         * for same hosts
                         */
                        while ( i + 1 < plots[host].length ) {
                            if ( x1 == plots[host][i+1]["x0"]
                                    && y0 == plots[host][i+1]["y0"]
                                    && y1 == plots[host][i+1]["y1"] ) {
                                x1 = plots[host][i+1]["x1"];
                                i++;
                            } else break;
                        }

                        this.plotHop(options, plots[host][i].point, x0, x1, y0, y1);
                    }
                }
            }

        } else {

            /*
             * If measuring latency, plot hop by hop (in the order of the data)
             */

            for ( var i = 0; i < points.length; i++ ) {
                var x0 = points[i].x0,
                    x1 = points[i].x1,
                    y0 = points[i].y0,
                    y1 = points[i].y1;

                this.plotHop(options, i, x0, x1, y0, y1);
            }

        }
    },

    plotHop: function(options, i, x0, x1, y0, y1) {
        var points = options.points,
            host = points[i].host,
            context = options.context,
            minHeight = options.minHopHeight,
            x = options.xScale(x0),
            y = options.yScale(y0);

        /*
         * This is a really terrible way of doing this
         * TODO additionally index hit containers by hit index so we don't
         * need to loop over all containers belonging to the host
         */
        if ( options.measureLatency && i > 0  && y1 > 0) {
            var lastHost = points[i-1].host;
            for ( var j = 0; j < this.hitContainers[lastHost].length; j++ ) {
                var hc = this.hitContainers[lastHost][j];
                if (hc.hitIndex == i - 1 && hc.top > y1) {
                    y1 = hc.top;
                    break;
                }
            }
        }

        var width = options.xScale(x1) - x,
            height = options.yScale(y1) - y;

        if ( height < minHeight ) {
            y -= (minHeight - height);
            height = minHeight;

            y0 = options.yInverse(y);
            y1 = options.yInverse(y + height);
        }

        context.fillStyle = this.getFillStyle(host);
        context.fillRect(x, y, width, height);

        if ( !(host in this.hitContainers) )
             this.hitContainers[host] = [];

        /*
         * This will cache contiguous bars in a hop count-based graph,
         * and store the dimensions of bars that have been adjusted to
         * meet minimum height requirements
         */
        this.hitContainers[host].push({
            "left": x0,
            "right": x1,
            "top": y0,
            "bottom": y1,
            "hitIndex": i
        });
    },

    /**
     * Determines whether the mouse is currently hovering over
     * (hitting) a part of the graph we want to highlight and
     * if so, sets the values of n accordingly (which are carried
     * through to drawHit() in args)
     */
    hit: function (options) {
        var args = options.args,
            mouse = args[0],
            n = args[1],
            mouseX = options.xInverse(mouse.relX),
            mouseY = options.yInverse(mouse.relY);

        // this is the only side with padding that overflows
        var minX = options.xInverse(0);

        for ( var host in this.hitContainers ) {
            if ( this.hitContainers.hasOwnProperty(host) ) {
                for ( var i = 0; i < this.hitContainers[host].length; i++ ) {
                    var hc     = this.hitContainers[host][i],
                        left   = hc["left"],
                        top    = hc["top"],
                        right  = hc["right"],
                        bottom = hc["bottom"],
                        hitIndex = hc["hitIndex"];

                    if ( mouseX > left && mouseX < right
                            && mouseY < top && mouseY > bottom
                            && mouseX > minX ) {
                        n.x = mouseX;
                        n.y = mouseY;
                        /* this tells us where we find our data in the array
                         * of points, so it should be unique */
                        n.index = hitIndex;
                        // seriesIndex has to be zero
                        n.seriesIndex = 0;
                        // this prevents overlapping event hits conflicting
                        n.event = false;
                        return;
                    }
                }
            }
        }
    },

    /**
     * Receives the values of n from hit() in args, and highlights
     * the data that has been 'hit', in this case by drawing lines
     * around all bars belonging to the host that has been hit.
     */
    drawHit: function (options) {
        if ( options.args.event )
            return;

        var context = options.context,
            host = options.points[options.args.index].host,
            xScale = options.xScale,
            yScale = options.yScale;

        context.save();
        context.fillStyle = this.getFillStyle(host);
        context.strokeStyle = this.getStrokeStyle(host);
        context.lineWidth = options.lineWidth;
        for ( var j = 0; j < this.hitContainers[host].length; j++ ) {
            var hcj = this.hitContainers[host][j],
                x = xScale(hcj["left"]),
                y = yScale(hcj["top"]),
                width = xScale(hcj["right"]) - x,
                height = yScale(hcj["bottom"]) - y;

            context.fillRect(x, y, width, height);
            context.strokeRect(x, y, width, height);
        }
        context.restore();
    },

    /**
     * Removes the highlight drawn by drawHit() by clearing the lines
     * from the bars that were just drawn. The bars are then redrawn
     * internally.
     */
    clearHit: function (options) {
        if ( options.args.event )
            return;

        var context = options.context,
            host = options.points[options.args.index].host,
            xScale = options.xScale,
            yScale = options.yScale,
            lineWidth = options.lineWidth * 2;
        
        context.save();
        for ( var j = 0; j < this.hitContainers[host].length; j++ ) {
            var hcj = this.hitContainers[host][j],
                x = xScale(hcj["left"]),
                y = yScale(hcj["top"]),
                width = xScale(hcj["right"]) - x,
                height = yScale(hcj["bottom"]) - y;

            context.clearRect(
                x - lineWidth,
                y - lineWidth,
                width + 2 * lineWidth,
                height + 2 * lineWidth
            );
        }
        context.restore();
    }

});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
