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

Flotr.addType('jitterrainbow', {

    options: {
        lineWidth: 2
    },

    legend: {},
    Xhitcontainers: [],
    Yhitcontainers: {},

    draw: function(options) {
        var context = options.context;
        context.save();
        context.lineJoin = 'miter';
        this.plot(options);
        context.restore();
    },

    getHSLA: function(percentileno, stroke) {
        var h, s, l, a;

        h = getSeriesHue(percentileno);
        s = 90;
        if (stroke)
            l = 45;
        else
            l = 60;
        a = 1.0;

        return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")";
    },

    getStrokeStyle: function(percentileno) {
        return this.getHSLA(percentileno, true);
    },

    getFillStyle: function(percentileno) {
        return this.getHSLA(percentileno, false);
    },

    plot: function(options) {
        var nextts;
        this.Xhitcontainers = [];
        this.Yhitcontainers = {};
        if (!options.data.series) {
            return;
        }

        for (var i = 0; i < options.data.series.length; i++) {
            var meas = options.data.series[i];
            var ts = meas[0];
            var nextts = ts + 150000;

            if (i + 1 < options.data.series.length) {
                nextts = options.data.series[i + 1][0];
            }

            var addedX = false;
            for (var j = 1; j < meas.length - 1; j++) {
                var y0 = meas[j];
                var y1 = meas[j + 1];

                if (y0 == null || y1 == null)
                    continue;
                this.plotPercentile(options, j - 1, ts, nextts, y0, y1);

                if (!addedX) {
                    this.Xhitcontainers.push(ts);
                    this.Yhitcontainers[ts] = [];
                    addedX = true;
                }

                this.Yhitcontainers[ts].push([y0, y1, nextts]);
            }
        }
    },

    plotPercentile: function(options, i, x0, x1, y0, y1) {
        var x = Math.round(options.xScale(x0));
        var y = Math.round(options.yScale(y0));
        var width = Math.round(options.xScale(x1) - x);
        var height = Math.round(options.yScale(y1) - y);

        options.context.fillStyle = this.getFillStyle(i);
        options.context.fillRect(x, y, width, height);
    },

    findNearestBlock: function(mouseX, mouseY) {
        var xval = null;
        var array = this.Xhitcontainers;
        var high = array.length, low = -1;

        while (high - low > 1) {
            var mid = Math.floor((high + low) / 2);

            if (array[mid] < mouseX) {
                low = mid;
            } else {
                high = mid;
            }
        }

        if (array[high] == mouseX) {
            xval = mouseX;
        } else if (high > 0) {
            xval = array[high - 1];
        } else {
            return null;
        }

        var yposs = this.Yhitcontainers[xval];

        if (yposs.length == 0) {
            return null;
        }
        if (mouseX > yposs[0][2]) {
            return null;
        }

        for (var i = 0; i < yposs.length; i++) {
            if (!yposs.hasOwnProperty(i)) {
                continue;
            }

            if (yposs[i][0] <= mouseY && yposs[i][1] >= mouseY) {
                return [xval, yposs[i][0], yposs[i][1], yposs[i][2], i, high];
            }
            if (yposs[i][0] > mouseY) {
                return null;
            }
        }

        return null;
    },

    hit: function(options) {
        var mouse = options.args[0];
        var n = options.args[1];

        if (mouse.relX < 0.5) {
            return;
        }

        var blockhit = this.findNearestBlock(options.xInverse(mouse.relX),
                options.yInverse(mouse.relY));

        if (!blockhit) {
            return;
        }

        n.block = blockhit;
        n.event = false;
        n.x = (blockhit[0] + blockhit[3]) / 2;
        n.y = blockhit[2];
        n.seriesIndex = 0;

        /* This has to be a unique number per hittable segment, otherwise
         * flotr won't recognise when we've moved the mouse from one segment
         * to another :(
         *
         * Since we have 10 percentiles per xvalue, use 20 as a multiplier
         * on the xindex just to be safe.
         */

        n.index = blockhit[5] * 20 + blockhit[4];
    },

    drawHit: function(options) {
        if (options.args.event) {
            return;
        }

        var context = options.context;
        var block = options.args.block;
        var x = Math.round(options.xScale(block[0]));
        var y = Math.round(options.yScale(block[1]));
        var width = Math.round(options.xScale(block[3])) - x;
        var height = Math.round(options.yScale(block[2])) - y;

        context.save();
        context.fillStyle = this.getStrokeStyle(block[4]);
        context.strokeStyle = this.getStrokeStyle(block[4]);
        context.lineWidth = options.lineWidth;

        context.fillRect(x, y, width, height);
        context.restore();
    },

    clearHit: function(options) {
        if (options.args.event) {
            return;
        }

        var context = options.context;
        var block = options.args.block;
        var x = Math.round(options.xScale(block[0]));
        var y = Math.round(options.yScale(block[1]));
        var width = Math.round(options.xScale(block[3])) - x;
        var height = Math.round(options.yScale(block[2])) - y;

        context.save();
        context.clearRect(x, y, width, height);
        context.restore();
    }
});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
