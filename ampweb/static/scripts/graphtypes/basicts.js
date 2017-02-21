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

/* Standard line graph
 *
 * Unfortunately, we need to define our own Flotr plugin so that we can
 * utilise our own colour allocation scheme.
 *
 * It might be possible to do this without a separate plugin, but our colour
 * allocation scheme is hsla and the standard colour config in flotr is
 * rgb so we'd have to do a lot of conversions to get everything to match up.
 * Maybe someone who is better at flotr / javascript than me could do better.
 *
 */

Flotr.addType('basicts', {
    options: {
        lineWidth: 2
    },

    draw: function(options) {
        var context = options.context;
        context.save();
        context.lineJoin = 'round';
        this.plot(options, 0, true, false);
        context.restore();
    },

    hit: function(options) {
        var args = options.args,
            mouse = args[0],
            n = args[1],
            colourid = options.data.colourid,
            data = options.data.series;

        if (colourid === undefined) {
            return;
        }

        /* This function is in util.js */
        var hitcheck = isMouseHitOnSeries(data, mouse, options);
        if (hitcheck.isHit) {
            n.x = hitcheck.x;
            n.y = hitcheck.y;
            n.index = colourid;
            n.seriesIndex = 0;
            n.event = false;
            n.data = data;
            n.dataindex = options.data.dataindex;
        }
    },

    drawHit: function(options) {
        if (options.args.event)
            return;
        this.plot(options, 0, true, true);
    },

    clearHit: function(options) {
        if (options.args.event)
            return;
        options.context.clearRect(0, 0, options.width, options.height);
    },

    plot: function(options, shadowOffset, incStack, hover) {
        var
            context   = options.context,
            width     = options.width,
            height    = options.height,
            xScale    = options.xScale,
            yScale    = options.yScale,
            data      = hover ? options.args.data : options.data.series,
            lineWidth = hover ? options.lineWidth + 1 : options.lineWidth,
            legend    = options.legenddata,
            colourid  = hover ? options.args.index : options.data.colourid,
            prevx     = null,
            prevy     = null,
            x1, x2, y1, y2, i, count, length,
            mindist = 0,
            lasti = 0;

        var lineColour;
        var dataindex = hover ? options.args.dataindex : options.data.dataindex;

        if (colourid == undefined) {
            return;
        }
        if (dataindex == undefined) {
            dataindex = 1;
        }

        /*
        if ( hover ) {
            context.shadowColor = "rgba(0, 0, 0, 0.3)";
            context.shadowOffsetY = 1;
            context.shadowOffsetX = 0;
            context.shadowBlur = 2;
        }
        */

        count = getSeriesLineCount(legend);
        context.beginPath();
        lineColour = getSeriesStyle(colourid);
        length    = data.length - 1;

        for (i = 0; i < length; ++i) {
            /* Basic TS should all be [timestamp, value] */
            if (data[i].length < dataindex + 1) {
                continue;
            }

            /* Allow empty values */
            if (data[i][dataindex] === null || data[i+1][dataindex] === null) {
                continue;
            }

            x1 = xScale(data[i][0]);
            x2 = xScale(data[i + 1][0]);

            y1 = yScale(data[i][dataindex]);
            y2 = yScale(data[i + 1][dataindex]);

            if (mindist == 0 || data[i + 1][0] - data[i][0] < mindist) {
                mindist = data[i+1][0] - data[i][0];
            }
            lasti = i + 1;

            if (y1 > height || y1 < 0 || (x1 < 0 && x2 < 0) ||
                    (x1 > width && x2 > width)) {
                continue;
            }

            if (prevx != x1 || prevy != y1 + shadowOffset) {
                context.moveTo(x1, y1 + shadowOffset);
            }

            prevx = x2;
            prevy = y2 + shadowOffset;

            context.beginPath();
            context.lineWidth = lineWidth;
            context.strokeStyle = lineColour;

            context.moveTo(x1, y1 + shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, y1 + shadowOffset);
            context.stroke();

            context.beginPath();
            context.lineWidth = lineWidth;
            context.strokeStyle = lineColour;
            context.moveTo(prevx + shadowOffset / 2, y1 + shadowOffset);
            context.lineTo(prevx + shadowOffset / 2, prevy);
            context.stroke();
        }

        /* Add an extra stroke for the last datapoint, otherwise it won't
         * be visible on the graph.
         */
        var lastpoint = data[lasti];

        /* Limit stroke for last datapoint to 150s, so we don't draw
         * misleadingly large lines.
         */
        if (mindist > 150000) {
            mindist = 150000;
        }
        if (options.isdetail && lastpoint && lastpoint[dataindex] != null) {
            var x1 = Math.round(xScale(lastpoint[0]));
            var x2 = Math.round(xScale(lastpoint[0] + mindist));
            var y1 = Math.round(yScale(lastpoint[dataindex]));

            context.beginPath();
            context.lineWidth = lineWidth;
            context.strokeStyle = lineColour;

            context.moveTo(x1, y1 + shadowOffset);
            context.lineTo(x2 + shadowOffset / 2, y1 + shadowOffset);
            context.stroke();
        }
    }
});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
