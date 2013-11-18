/*
 * Rainbow style timeline graph
 */
var hitContainers;

var hostCount = 0;
var legend = {};
Flotr.addType('rainbow', {
    options: {
        lineWidth: 2
    },

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

    getFillStyle: function (host, legend) {
        return this.getHSLA(host, legend, false);
    },

    getStrokeStyle: function (host, legend) {
        return this.getHSLA(host, legend, true);
    },

    /**
     * Gets the HSLA CSS values to style each host uniquely.
     * HSLA = Hue, Saturation, Lightness, Alpha
     * Also returns specific values to represent error states.
     */
    getHSLA: function (host, legend, stroke) {
        if ( !(host in legend) )
            legend[host] = hostCount++;

        /*
         * http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
         * As used in the Smokeping plugin
         */

        var h = (legend[host] * 222.49223594996221) % 360,
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
            plots     = options.plots;

        hitContainers = {};

        if ( plots.length < 1 ) {
            return;
        }

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

                    var x = xScale(x0),
                        y = yScale(y0),
                        width = xScale(x1) - x,
                        height = yScale(y1) - y;

                    context.fillStyle = this.getFillStyle(host, legend);
                    context.fillRect(x, y, width, height);
                    
                    if ( !(host in hitContainers) )
                        hitContainers[host] = [];

                    /*
                     * Cache contiguous bars so that fewer comparisons
                     * are required to be made when determining hits
                     */
                    hitContainers[host].push({
                        "left": x0,
                        "right": x1,
                        "top": y0,
                        "bottom": y1
                    });
                }
            }
        }
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

        for ( var host in hitContainers ) {
            if ( hitContainers.hasOwnProperty(host) ) {
                for ( var i = 0; i < hitContainers[host].length; i++ ) {
                    var hc     = hitContainers[host][i],
                        left   = hc["left"],
                        top    = hc["top"],
                        right  = hc["right"],
                        bottom = hc["bottom"];

                    if ( mouseX > left && mouseX < right
                            && mouseY < top && mouseY > bottom ) {
                        n.x = mouseX;
                        n.y = mouseY;
                        // this has to be unique for every unique hover
                        n.index = host + " " + left + " " + top;
                        // seriesIndex has to be zero
                        n.seriesIndex = 0;
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
        var context = options.context,
            host = options.args.index.split(" ")[0],
            xScale = options.xScale,
            yScale = options.yScale;

        if ( options.args.event )
            return;

        context.save();
        context.strokeStyle = this.getStrokeStyle(host, legend);
        context.lineWidth = options.lineWidth;
        for ( var j = 0; j < hitContainers[host].length; j++ ) {
            var hcj = hitContainers[host][j],
                x = xScale(hcj["left"]),
                y = yScale(hcj["top"]),
                width = xScale(hcj["right"]) - x,
                height = yScale(hcj["bottom"]) - y;

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
        var context = options.context,
            host = options.args.index.split(" ")[0],
            xScale = options.xScale,
            yScale = options.yScale,
            lineWidth = options.lineWidth * 2;

        if ( options.args.event )
            return;

        context.save();
        for ( var j = 0; j < hitContainers[host].length; j++ ) {
            var hcj = hitContainers[host][j],
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
