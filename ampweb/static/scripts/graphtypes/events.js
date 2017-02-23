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
 * Draw event markings onto a graph. Can be included with any other graph
 * type and will merge the two together to give a time series graph with
 * event markings.
 *
 * Will try to merge events that occur within the same bin in order not to
 * fill the entire graph with overlapping event lines. The bin size is
 * currently pretty arbitrary at twice the size (divisor 150) of the data
 * binning (divisor 300) - any smaller and the lines overlap/touch. Any
 * merged events are marked by a number at the top of the event line that
 * describes how many events are represented.
 *
 * One possible drawback of the binning is that nearby events can be in
 * different bins if they fall slightly outside the boundary, while events that
 * are further apart but in the same bin will be aggregated. At the moment
 * this seems an acceptable way to reduce the clutter.
 *
 * TODO can we do something smart here that means it is only drawn once rather
 * than for every single series that has it enabled? Would be nice to enable
 * it globally and not have to disable it on every series except an empty
 * dummy series.
 */
Flotr.addType('events', {
    options: {
        show: false,
        lineWidth: 2,
        fontSize: Flotr.defaultOptions.fontSize,
        binDivisor: 50.0,
        drawBehind: true,
        categoriseSeverity: true, // separate into severity levels
        severityColours: true,
        greyLines: true,
        greyMarkers: false,
        greyscale: false // overrides greyLines and greyMarkers if true
    },

    /**
     * We don't want to do anything in this function because all our
     * preliminary drawing is done by the eventsOverlay plugin.
     * @param {Object} options
     */
    draw: function(options) {
        return;
    },

    /*
     * Check for a mouse hit on one of the event markers. If we get a hit we
     * can highlight it and show some more detailed information.
     */
    hit: function(options) {
        Flotr.EventAdapter.fire(options.element, 'flotr:eventhit', [options]);
    },

    /*
     * Draw the result of the mouse hit, highlighting the currently selected
     * event line.
     */
    drawHit: function(options) {
        if (options.args.event)
            Flotr.EventAdapter.fire(options.element, 'flotr:eventdrawhit', [options]);
    },

    /*
     * Clear the highlighting on the currently selected event.
     */
    clearHit: function(options) {
        if (options.args.event)
            Flotr.EventAdapter.fire(options.element, 'flotr:eventclearhit', [options]);
    },
});
