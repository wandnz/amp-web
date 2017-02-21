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
 * This script is loaded directly as a web worker, which means it isn't
 * included in the main page and doesn't have easy access to constants
 * such as STATIC_URL. Instead we will load the scripts we need using
 * relative links so that they continue to work when ampweb is installed
 * in a non-standard location.
 */
importScripts('../lib/dagre.min.js');
importScripts('tracemap-common.js');

self.onmessage = function(event) {
    var graphData = event.data.data,
        start = event.data.start,
        end = event.data.end;

    var paths = createPaths(graphData, start, end);

    if (event.data.createDigraph) {
        var digraph = drawDigraph(paths);
        postMessage({ paths: paths, digraph: digraph });
    } else {
        postMessage({ paths: paths });
    }
};
