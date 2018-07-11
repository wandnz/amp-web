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

(function($) {

/**
 * Sets up UI elements around a traceroute monitor map
 */
function TracerouteView(container, tree, treeDirection) {
    var _container = container;
    var _tree = tree;
    var _map;
    var _treeDir = treeDirection;

    var _initialise = function() {
        _map = $.monitormap(_container.attr('id'), _tree,
            { width: 800, treeDirection: _treeDir, startType: "pruned" });
        var div, form, key, toggle;

        div = $('<div></div>').css({ "margin-left": 150, "margin-right": 150 });
        form = $('<div id="tracerouteCheckboxes"></div>').css(
            { "text-align": "left", float: "left" });
        key = $('<div id="monmap-key"></div>').css({ float: "right" });
        div.append(form).append(key);

        toggle = $(document.createElement("input")).attr({
            id: 'collapseToggle',
            type: 'checkbox'
        }).click(function (event) {
            _map.toggleCollapse();
        });

        form.append(toggle).append("<label>Collapse consecutive hops</label>");

        toggle = $(document.createElement("input")).attr({
            id: 'pruneToggle',
            type: 'checkbox'
        }).click(function (event) {
            _map.togglePrune();
        });

        form.append('<br />').append(toggle).append(
                "<label>Show all paths</label>");

        _container.prepend(div);
        _map.drawKey(key.attr('id'), 350, 170);
    };

    _initialise();
}

/**
 * Creates a new TracerouteView instance
 */
$.amptraceview = function(container, tree, treeDirection) {
        return new TracerouteView(container, tree, treeDirection);
};

})(jQuery);
