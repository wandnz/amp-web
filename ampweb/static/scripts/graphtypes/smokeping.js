/*
 * Smokeping style line graph
 *
 * Plot a smokeping style line graph based on the built-in "lines" flotr2
 * type, and smokeping by Tobi Oetiker. Behaviour is based mostly on the
 * smokeping guide found at:
 *
 *      http://oss.oetiker.ch/smokeping/doc/reading.en.html
 *
 * Briefly:
 * - Draw a line segment at the median value for a block of measurements.
 * - Colour the line based on the amount of loss in that block.
 * - Draw a heatmap around the median, representing the other measurements
 *   in that block and their distribution around the median.
 *
 * TODO: extend loss colours regions to the top and bottom of graph?
 * TODO: adjust smoke opacity based on number of measurements so if there
 *	 are only a small number of tests made the smoke is still visible
 * TODO: adjust line colours based on number of measurements, so if there
 *	 are only a small number of tests made the colour is still relevant
 */

Flotr.addType('smoke', {
    options: {
        show: false,     // => setting to true will show smoke
        medianLineWidth: 3,
        verticalLineWidth: 1
    },

    /**
     * Draws lines series in the canvas element.
     * @param {Object} options
     */
    draw: function (options) {

        var context = options.context;

        context.save();

        this.plot(options, 0, false);

        context.restore();

    },

    /* in a single-series graph colour each line based on the loss */
    getLossStyle: function (loss) {
        /*
         * Colours are based on the smokeping loss colours, though the
         * ranges that they cover are slightly different. Any loss above
         * 50% (10 of the 20 packets for smokeping) gets red.
         */
        if ( loss == 0 ) {
            return "rgba(0, 255, 0, 1.0)";
        } else if ( loss <= 5 ) {
            return "rgba(0, 184, 255, 1.0)";
        } else if ( loss <= 10 ) {
            return "rgba(0, 89, 255, 1.0)";
        } else if ( loss <= 15 ) {
            return "rgba(94, 0, 255, 1.0)";
        } else if ( loss <= 25 ) {
            return "rgba(126, 0, 255, 1.0)";
        } else if ( loss <= 50 ) {
            return "rgba(221, 0, 255, 1.0)";
        }
        return "rgba(255, 0, 0, 1.0)";
    },

    /* fill is black for single series, otherwise based on series colour */
    getSeriesSmokeStyle: function (total, colourid) {
        if ( total == 1 ) {
            return "rgba(0, 0, 0, 0.2)";
        }
        return getSeriesSmokeStyle(colourid);
    },

    /**
     * Create lists (and maps) of "plots" which we can later draw to the canvas
     * in batches to help reduce browser hang time. Initially this focuses on
     * reducing the number of changes made to the canvas's internal state
     * machine by minimising the number of changes to context properties
     * such as fill and stroke style, but could be extended further in future to
     * break up rendering into chunks that would allow the UI to take control
     * in between drawing, resulting in a more fluid experience
     */
    plot: function (options, shadowOffset, hover) {

        var xScale     = options.xScale,
            yScale     = options.yScale,
            data       = hover ? options.args.data : options.data.series,
            colourid   = hover ? options.args.index : options.data.colourid;

        var smokePlots          = [],
            verticalLinePlots   = [],
            horizontalLinePlots = {};

        var horizontalStrokeStyle, verticalStrokeStyle;

        /* Skip the empty series used for storing events */
        if ( colourid == undefined) {
            return;
        }

        var count = getSeriesLineCount(options.legenddata);
        if ( count != 1 ) {
            horizontalStrokeStyle = getSeriesStyle(colourid);
        }

        for ( var i = 0; i < data.length - 1; ++i ) {
            /* To allow empty values */
            if ( data[i][1] === null || data[i+1][1] === null ) {
                continue;
            }

            /* data should have at least [timestamp,median,loss] */
            if ( data[i].length < 3 ) {
                continue;
            }

            var x1 = Math.round(xScale(data[i][0]));
            var x2 = Math.round(xScale(data[i+1][0]));
    
            var measurements = data[i].length;
            var loss = data[i][2];
            var median = data[i][1];
            var y1 = Math.round(yScale(median));
            var y2 = Math.round(yScale(data[i+1][1]));

            if (
                (y1 > options.height && y2 > options.height) ||
                (y1 < 0 && y2 < 0) ||
                (x1 < 0 && x2 < 0) ||
                (x1 > options.width && x2 > options.width)
               ) continue;

            if ( !hover ) {
                /* Plot smoke around the median if the data is available. If we
                 * draw this first then all the coloured lines get drawn on top,
                 * without being obscured. */

                /* TODO is this going to be really slow? */
                for ( j = 3; j < measurements; j++ ) {
                    var ping = data[i][j];
                    if ( ping == null ) {
                        continue;
                    }
                    /* draw a rectangle for every non-median measurement */
                    if ( ping != median ) {
                        smokePlots.push([
                            x1, y1 + shadowOffset, 
                            x2-x1, Math.round(yScale(ping) - yScale(median))
                        ]);
                    }
                }

                /* Plot a vertical line between measurements.
                 * If a single series smokeping graph, use a thin black line,
                 * otherwise continue to use the series colour */

                verticalLinePlots.push([
                    x2 + shadowOffset / 2, y1 + shadowOffset,
                    x2 + shadowOffset / 2, y2 + shadowOffset
                ]);
            }

            /* Plot a horizontal line for the current data point.
             * If a single series smokeping graph, use a colour representing
             * loss, otherwise continue to use the series colour */

            if ( count == 1 )
                horizontalStrokeStyle = this.getLossStyle(loss);
            
            if ( !(horizontalStrokeStyle in horizontalLinePlots) )
                horizontalLinePlots[horizontalStrokeStyle] = [];

            horizontalLinePlots[horizontalStrokeStyle].push([
                x1, y1 + shadowOffset,
                x2 + shadowOffset / 2, y1 + shadowOffset
            ]);
        }

        this.render(options, smokePlots, verticalLinePlots,
                horizontalLinePlots, hover);
    },

    /**
     * Draw plots to the canvas
     */
    render: function(options, smokePlots, verticalLinePlots,
            horizontalLinePlots, hover) {

        var context = options.context,
            colourid = options.data.colourid;

        var count = getSeriesLineCount(options.legenddata);
        var fillStyle = this.getSeriesSmokeStyle(count, colourid);
        /* use the appropriate colour for the line based on series count */
        if ( count == 1 ) {
            verticalStrokeStyle = "rgba(0, 0, 0, 1.0)";
        } else {
            verticalStrokeStyle = getSeriesStyle(colourid);
        }

        /* Draw smoke */
        context.beginPath();
        context.fillStyle = fillStyle;
        for ( var i = 0; i < smokePlots.length; i++ ) {
            var plot = smokePlots[i];
            context.fillRect(plot[0], plot[1], plot[2], plot[3]);
        }
        context.closePath();

        /* Draw vertical lines */
        context.beginPath();
        context.strokeStyle = verticalStrokeStyle;
        context.lineWidth = options.verticalLineWidth;
        for ( var i = 0; i < verticalLinePlots.length; i++ ) {
            var plot = verticalLinePlots[i];
            context.moveTo(plot[0], plot[1]);
            context.lineTo(plot[2], plot[3]);
        }
        context.stroke();
        context.closePath();

        /* Draw horizontal lines */
        for ( var strokeStyle in horizontalLinePlots ) {
            if ( horizontalLinePlots.hasOwnProperty(strokeStyle) ) {
                context.beginPath();
                context.fillStyle = strokeStyle;
                if ( hover ) {
                    context.shadowColor = "rgba(0, 0, 0, 0.3)";
                    context.shadowOffsetY = 1;
                    context.shadowOffsetX = 0;
                    context.shadowBlur = 2;
                }
                var plots = horizontalLinePlots[strokeStyle];
                for ( var i = 0; i < plots.length; i++ ) {
                    var plot = plots[i];
                    var strokeRadius = Math.ceil(options.medianLineWidth / 2);
                    context.rect(
                        plot[0],
                        plot[1] - strokeRadius - (hover ? 1 : 0),
                        plot[2] - plot[0],
                        plot[3] + strokeRadius + (hover ? 2 : 0) - plot[1]
                    );
                }
                context.fill();
                context.closePath();
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
            colourid = options.data.colourid,
            data = options.data.series,
            mouseX = mouse.relX,
            mouseY = mouse.relY;

        if ( colourid === undefined )
            return;

        for ( var i = 0; i < data.length - 1; ++i ) {
            /* To allow empty values */
            if ( data[i][1] === null || data[i+1][1] === null ) {
                continue;
            }

            /* data should have at least [timestamp,median,loss] */
            if ( data[i].length < 3 ) {
                continue;
            }

            var x1 = options.xScale(data[i][0]);
            var x2 = options.xScale(data[i+1][0]);
    
            var measurements = data[i].length;
            var median = data[i][1];
            var y1 = options.yScale(median);
            var y2 = options.yScale(data[i+1][1]);

            if (
                (y1 > options.height && y2 > options.height) ||
                (y1 < 0 && y2 < 0) ||
                (x1 < 0 && x2 < 0) ||
                (x1 > options.width && x2 > options.width)
               ) continue;

            if ( mouseX + 5 > x1 && mouseX - 5 < x2 &&
                    Math.round(mouseY) > Math.round(y1) - 5 &&
                    Math.round(mouseY) < Math.round(y1) + 5 ) {
                n.x = options.xInverse(mouseX);
                n.y = options.yInverse(y1);
                /* this tells us where we find our data in the array
                 * of points, so it should be unique */
                n.index = colourid;
                // seriesIndex has to be zero
                n.seriesIndex = 0;
                // this prevents overlapping event hits conflicting
                n.event = false;
                n.data = data;
                return;
            }
        }
    },

    /**
     * Highlights the data that has been 'hit' by redrawing the series
     * with the hover flag set.
     */
    drawHit: function (options) {
        if ( options.args.event )
            return;

        this.plot(options, 0, true);
    },

    /**
     * Removes the highlight drawn by drawHit() by clearing the overlay canvas.
     */
    clearHit: function (options) {
        if ( options.args.event )
            return;

        var context = options.context;
        context.clearRect(0, 0, options.width, options.height);
    }

});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
