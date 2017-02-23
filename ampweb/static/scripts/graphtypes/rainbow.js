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

/*
 * Rainbow style timeline graph
 */
Flotr.addType('rainbow', {
    options: {
        lineWidth: 2
    },

    hitContainers: {},
    aslabelCount: 0,
    legend: {},

    /**
     * Draws the rainbow graph in the canvas element.
     * @param {Object} options
     */
    draw: function(options) {
        var context = options.context;

        context.save();
        context.lineJoin = 'miter';

        this.plot(options);

        context.restore();
    },

    getFillStyle: function(aslabel) {
        return this.getHSLA(aslabel, false);
    },

    getStrokeStyle: function(aslabel) {
        return this.getHSLA(aslabel, true);
    },

    /**
     * Gets the HSLA CSS values to style each aslabel uniquely.
     * HSLA = Hue, Saturation, Lightness, Alpha
     * Also returns specific values to represent error states.
     */
    getHSLA: function(aslabel, stroke) {
        var h, s, l, a;

        if (aslabel == "Unknown") {
            /* Draw drab grey for failed AS lookup */
            s = 0;
            h = 0;
            if (stroke) {
                l = 25;
            } else {
                l = 40;
            }
        } else if (aslabel == "RFC 1918") {
            /* Dull white for RFC 1918 hops */
            h = 0;
            s = 0;
            if (stroke) {
                l = 55;
            } else {
                l = 70;
            }
        } else if (aslabel == "No response") {
            /* Draw black box for no response */
            s = 0;
            h = 0;
            if (stroke) {
                l = 0;    /* White outline */
            } else {
                l = 15;
            }
        } else {
            if (!(aslabel in this.legend)) {
                this.legend[aslabel] = this.aslabelCount++;
            }

            s = 90;
            h = getSeriesHue(this.legend[aslabel]);

            if (stroke) {
                l = 45;
            } else {
                l = 60;
            }
        }

        a = 1.0;
        return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")";
    },

    /**
     * Plots the graph using the "plots" dictionary defined by
     * RainbowGraph.processSummaryData() in
     * scripts/graphstyles/rainbow.js
     *
     * Horizontally contiguous (joining) bars of the same aslabel will
     * be combined into the same bar, cached and used to determine
     * (and draw) a hit on mouseover
     */
    plot: function(options) {

        var context   = options.context,
            xScale    = options.xScale,
            yScale    = options.yScale,
            minHeight = options.minHopHeight,
            plots     = options.plots,
            points    = options.points,
            data      = options.data;

        this.hitContainers = {};

        if (points == undefined || plots == undefined || points.length < 1) {
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

        if (!options.measureLatency) {

            /*
             * If measuring hops, plot aslabel-by-aslabel
             */

            for (var aslabel in plots) {
                if (plots.hasOwnProperty(aslabel)) {
                    for (var i = 0; i < plots[aslabel].length; i++) {
                        var x0 = plots[aslabel][i]["x0"],
                            x1 = plots[aslabel][i]["x1"],
                            y0 = plots[aslabel][i]["y0"],
                            y1 = plots[aslabel][i]["y1"];

                        /* This hop has already been merged with a previous
                         * one.
                         */
                        if (plots[aslabel][i]["used"] == true) {
                            continue;
                        }

                        /*
                         * Join horizontally contiguous bars together
                         * for same aslabels
                         */
                        var j = i + 1;

                        while (j < plots[aslabel].length) {
                            if (x1 < plots[aslabel][j]["x0"]) {
                                break;
                            }

                            if (x1 == plots[aslabel][j]["x0"] &&
                                    y0 == plots[aslabel][j]["y0"] &&
                                    y1 == plots[aslabel][j]["y1"]) {
                                x1 = plots[aslabel][j]["x1"];
                                plots[aslabel][j]["used"] = true;
                            }
                            j++;
                        }

                        this.plotHop(options, plots[aslabel][i].point,
                                x0, x1, y0, y1);
                    }
                }
            }
        } else {
            /*
             * If measuring latency, plot hop by hop (in the order of the data)
             */
            for (var i = 0; i < points.length; i++) {
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
            aslabel = points[i].aslabel,
            context = options.context,
            minHeight = options.minHopHeight,
            x = Math.round(options.xScale(x0)),
            y = Math.round(options.yScale(y0));

        /*
         * Get the top of the previous point's hit container so that we can see
         * whether it overlaps our y1 value. If so, make y1 that value.
         *
         * XXX This is a really terrible way of doing this - we should
         * additionally index hit containers in the order of the original data
         * so we don't need to loop over all containers belonging to the aslabel
         */
        if (options.measureLatency && i > 0 && y1 > 0) {
            var lastHost = points[i - 1].aslabel;
            for (var j = 0; j < this.hitContainers[lastHost].length; j++) {
                var hc = this.hitContainers[lastHost][j];
                if (hc.hitIndex == i - 1 && hc.top > y1) {
                    y1 = hc.top;
                    break;
                }
            }
        }

        var width = Math.round(options.xScale(x1) - x),
            height = Math.round(options.yScale(y1) - y);

        /* Don't plot anything that isn't within the bounds of the graph */
        if ((x < 0 && x + width < 0) ||
                (x > options.width && x + width > options.width)) {
            return;
        }

        /* Enforce the minimum height, if applicable (measured by latency) */
        if (height < minHeight) {
            y -= (minHeight - height);
            height = minHeight;

            y0 = options.yInverse(y);
            y1 = options.yInverse(y + height);
        }

        context.fillStyle = this.getFillStyle(aslabel);
        context.fillRect(x, y, width, height);

        if (!(aslabel in this.hitContainers))
             this.hitContainers[aslabel] = [];

        /*
         * This will cache contiguous bars in a hop count-based graph,
         * and store the dimensions of bars that have been adjusted to
         * meet minimum height requirements
         */
        this.hitContainers[aslabel].push({
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
    hit: function(options) {
        var args = options.args,
            mouse = args[0],
            n = args[1],
            mouseX = options.xInverse(mouse.relX),
            mouseY = options.yInverse(mouse.relY);

        // this is the only side with padding that overflows
        var minX = options.xInverse(0);

        for (var aslabel in this.hitContainers) {
            if (this.hitContainers.hasOwnProperty(aslabel)) {
                for (var i = 0; i < this.hitContainers[aslabel].length; i++) {
                    var hc     = this.hitContainers[aslabel][i],
                        left   = hc["left"],
                        top    = hc["top"],
                        right  = hc["right"],
                        bottom = hc["bottom"],
                        hitIndex = hc["hitIndex"];

                    if (mouseX > left && mouseX < right &&
                            mouseY < top && mouseY > bottom &&
                            mouseX > minX) {
                        n.x = Math.max(left, options.xInverse(0));
                        n.x += (Math.min(right, options.xInverse(options.width))
                                - Math.max(left, options.xInverse(0))) / 2;
                        n.y = bottom + ((top - bottom) / 2);
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
     * around all bars belonging to the aslabel that has been hit. The
     * canvas passed to this method in options is the overlay canvas
     * (not the same canvas as the one draw on in other methods).
     */
    drawHit: function(options) {
        if (options.args.event) {
            return;
        }

        var context = options.context,
            aslabel = options.points[options.args.index].aslabel,
            xScale = options.xScale,
            yScale = options.yScale;

        context.save();
        /* Use stroke colour to colour the highlighted segment -- much
         * easier than trying to draw sensible borders around the segments
         * which can intersect in tricky ways.
         */
        context.fillStyle = this.getStrokeStyle(aslabel);
        context.strokeStyle = this.getStrokeStyle(aslabel);
        context.lineWidth = options.lineWidth;
        /*
        context.shadowColor = "rgba(0, 0, 0, 0.3)";
        context.shadowOffsetY = 1;
        context.shadowOffsetX = 0;
        context.shadowBlur = 2;
        */
        var drawleft = false;
        for (var j = 0; j < this.hitContainers[aslabel].length; j++) {
            var hcj = this.hitContainers[aslabel][j],
                x = Math.round(xScale(hcj["left"])),
                y = Math.round(yScale(hcj["top"])),
                x2 = Math.round(xScale(hcj["right"])),
                y2 = Math.round(yScale(hcj["bottom"])),
                width = Math.round(xScale(hcj["right"]) - x),
                height = Math.round(yScale(hcj["bottom"]) - y);

            context.fillRect(x, y, width, height);
            //context.strokeRect(x, y, width, height);
        }
        context.restore();
    },

    /**
     * Removes the highlight drawn by drawHit() by clearing the lines
     * from the bars that were just drawn. The canvas passed to this method in
     * options is the overlay canvas (not the same canvas as the one drawn
     * on in other methods).
     */
    clearHit: function(options) {
        if (options.args.event) {
            return;
        }

        var context = options.context,
            aslabel = options.points[options.args.index].aslabel,
            xScale = options.xScale,
            yScale = options.yScale,
            lineWidth = options.lineWidth * 2;

        context.save();
        for (var j = 0; j < this.hitContainers[aslabel].length; j++) {
            var hcj = this.hitContainers[aslabel][j],
                x = Math.round(xScale(hcj["left"])),
                y = Math.round(yScale(hcj["top"])),
                width = Math.round(xScale(hcj["right"]) - x),
                height = Math.round(yScale(hcj["bottom"]) - y);

            context.clearRect(
                x - lineWidth,
                y - lineWidth,
                width + 3 * lineWidth,
                height + 3 * lineWidth
            );
        }
        context.restore();
    }
});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
