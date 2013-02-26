(function($) {

    /**
    * Takes a traceroute tree and builds up a visual map.
    *
    */
    function TracerouteMap(container, trees, options) {
        var _options = options;
        var _container = container;
        var _trees = trees;
        var _paper = Raphael(container);
        var _handlers = [];
        var _altPaths = _paper.set();
        var _clickedLeaf;

        /**
        * Merges in the default and given options and sets all
        * of the required values.
        */
        var _processOptions = function() {
            var DEFAULT_OPTIONS = {
                spacingText: 15,
                root: {
                    extension: 10,
                },
                leaf: {
                    text: { font: "10px Arial, Helvetica", fill: "rgb(0,0,0)" },
                    style: { stroke: "rgb(80,184,72)", "stroke-width": 4 }
                },
                branch: {
                    style: { stroke: "rgb(80,184,72)", "stroke-width": 2 }
                },
                node: {
                    style: { stroke: "rgb(80,184,72)", "stroke-width": 2 },
                    hoverTol: 5
                },
                collapseTails: false,
                treeDirection: "right",
                startType: "full"
            };

            _options = $.extend(true, {}, DEFAULT_OPTIONS, _options);

            if (!_options.width) throw "A width must be supplied";

            // fill in the text anchor position
            if (_options.treeDirection == "right") {
                _options.leaf.anchor = "start";
                _options.root.anchor = "end";
            } else {
                _options.leaf.anchor = "end";
                _options.root.anchor = "start";

                // restore the spacing values
                if (_options.spacingText < 0) _invertSpacings();
            }

            _calculateDimensions();
            _options.collapseHopSpace = _options.spacingHorCol / 20;

            // now that we know the size - set it
            _paper.setSize(_options.width, _options.height);
        };

        /**
        * Get the bounding box of a printed string
        */
        var _getPrintLength = function(text, font) {
            var bb, txt;
            var txt = _paper.text(0, 0, text).attr({ font: font });

            bb = txt.getBBox();
            txt.remove();

            return { width: bb.width, height: bb.height };
        };

        /**
        *  Calculates the dimensions of the map.
        *  To be used when there is no width and height given.
        *
        *  Determine the width and height based on the node spacing.
        */
        var _calculateDimensions = function() {
            var txtLen, other, sizes;

            // calculate horizontal spacing
            txtLen = _getPrintLength(_tree.deepestNode.name, _options.leaf.text.font).width +
                _getPrintLength(_tree.root.name, _options.leaf.text.font).width;
            other = txtLen + _options.spacingText * 3 + 10;

            sizes = _simulateDraw(_tree.root);
            _options.spacingHor = (_options.width - other) / (sizes.extended + 1);
            _options.spacingHorCol = (_options.width - other) / (sizes.collapsed + 1);

            // calculate vertical spacing
            _options.spacingVer = _options.spacingHor;
            if (_options.spacingVer > 20) _options.spacingVer = 20;

            // calculate map height
            _options.height = _tree.root.width * _options.spacingVer + _options.root.extension;
        };

        /**
        * Inverts the spacings such that the tree can be drawn in the opposite direction.
        */
        var _invertSpacings = function() {
            _options.spacingHor *= -1;
            _options.spacingText *= -1;
            _options.spacingHorCol *= -1;
            _options.collapseHopSpace *= -1;
        }

        /**
        * Simulates the drawing of a tree.
        *
        * @return the collapsed and expanded height of tree
        */
        var _simulateDraw = function(root) {
            var maxX = 0, sizes = {};

            var process = function(x, y, node, collapse, collapseTails) {
                var yspace = 0, branch;

                if (node.branches.length == 0) {
                    maxX = Math.max(maxX, x);
                } else if (node.branches.length == 1) {
                    if (!collapseTails) {
                        process(x + 1, y, node.branches[0], collapse, collapseTails);
                    } else {
                        if (node.collapseEnd) x += 1;
                        if (!node.collapsing) x += 1;
                        process(x, y, node.branches[0], collapse, collapseTails);
                    }
                } else {
                    branch = node.branches[0];
                    process(x + 1, y, branch, collapse, collapseTails);

                    if (node.direction == 1) yspace = branch.above;
                    else yspace = branch.below;

                    for (var i = 1; i < node.branches.length; i++) {
                        branch = node.branches[i];

                        if (node.direction == 1) yspace += branch.below + 1;
                        else yspace += branch.above + 1;

                        if (node.direction == 1) {
                            y = y + yspace * 1;
                            yspace = branch.above;
                        } else {
                            y = y - yspace * 1;
                            yspace = branch.below;
                        }

                        process(x + 1, y, branch, collapse, collapseTails);
                    }
                }
            }

            process(0, 0, root, undefined, false);
            sizes.extended = maxX;
            maxX = 0;
            process(0, 0, root, undefined, true);
            sizes.collapsed = maxX;
            return sizes;
        };

        /**
        * Shows a tooltip for a hop at a given position.
        */
        var _showTooltip = function(x, y, node, type){
            var offset = $("#" + _container + "> svg").offset();
            var tooltip = $('<div></div>').appendTo('body');
            var desc = "";
            var collapsedNodes;

            // convert to screen coordinates
            x += offset.left;
            y += offset.top;

            // output collapsed node block differently
            switch (type) {
            case "collapsed":
                desc += "<strong>Collapsed Hops: </strong><br />";
                collapsedNodes = node.collapsedNodes;

                // left trees count in the other direction
                if (_options.treeDirection == "left") collapsedNodes = $.extend([], collapsedNodes).reverse();

                $.each(collapsedNodes, function(index, val) {
                    desc += (index + 1) + ". " + val.name + "<br />";
                });
                break;
            case "hop":
                desc += "<strong>Hostname: </strong>" + node.name + "<br />" +
                    "<strong>IP: </strong>" + node.data.ip + "<br />" +
                    "<strong>Latency: </strong>" + node.data.latency + "<br />" +
                    "<strong>Path MTU: </strong>" + node.data.mtu + "<br />" +
                    "<strong>Path MTU Discovery: </strong>" + node.data.pmtud;
                break;
            case "althop":
                desc += "<strong>Alternative Path Hop:</strong><br />" +
                    "<strong>Hostname: </strong>" + node.hostname + "<br />" +
                    "<strong>IP: </strong>" + node.ip + "<br />" +
                    "<strong>Latency: </strong>" + node.latency + "<br />" +
                    "<strong>Path MTU: </strong>" + node.mtu + "<br />" +
                    "<strong>Path MTU Discovery: </strong>" + node.pmtud;
                break;
            case "leaf":
                var _format = function(name, value) {
                    switch (name) {
                        case "time":
                            return [];
                        case "median":
                            return [];
                        case "count":
                            return [];
                        case "loss":
                            return ["<strong>" + name + "</strong>", Math.round(value * 1000) / 10 + "%"];
                        default:
                            return ["<strong>" + name + "</strong>", Math.round(value * 10) / 10];
                    }
                };

                desc += "<table><tr><td width='50'><strong>Hostname: </strong></td><td>" + node.name + "</td></tr>";

                if (_tree.leaves[node.name].icmp) {
                    $.each(_tree.leaves[node.name].icmp, function(key, val) {
                        var format = _format(key, val);
                        if (!format || format.length < 1 || format[1] == 0) return;
                        desc += "<tr><td width='50'>" + format[0] + "</td><td>" + format[1] + "</td></tr>";
                    });
                }
                desc += "</table>";

                break;
            case "altpath":
                desc += "<strong>Alternative path hops: </strong><br/ >";

                if (node.length < 1) desc += "Skipped the underlying nodes";

                // left trees count in the other direction
                if (_options.treeDirection == "left") $.extend(true, [], node).reverse();

                $.each(node, function(index, hop) {
                    desc += (index + 1) + ". " + hop.hostname + "<br />";
                });
                break;
            }

            $('<div id="description">' + desc + '</div>').appendTo(tooltip);

            tooltip.css({
                position: "absolute",
                display: "none",
                border: "1px solid #fdd",
                padding: 2,
                "background-color": "#fee",
                opacity: 0.80,
                "font-size": "smaller",
                "white-space": "nowrap"
            }).fadeIn(200);

            // keep the tooltip on the page, without expanding boundaries
            if (x + tooltip.width() + 5 > $(document).width())
                x -= tooltip.width();
            if (y - tooltip.height() - 5 < $(window).scrollTop())
                y += tooltip.height() + 25;

            tooltip.css({
                top: y - tooltip.height(),
                left: x,
            });
            return tooltip;
        };

        /**
        * Visits every node in the tree.
        *
        * @param nodeFunction
        *          a function to run on each node
        */
        var _traverseTree = function(node, nodeFunction) {

            var traverse = function(node) {
                nodeFunction(node);

                $.each(node.branches, function(index, val) {
                    traverse(val);
                });
            };

            traverse(node);
        };

        /**
        * Traverses the tree, removing all of the mouse events.
        */
        var _clearEvents = function() {
            $.each(_handlers, function(index, val) {
                if (val.click) val.node.unclick(val.click);
                if (val.out) val.node.unmouseout(val.out);
                if (val.over) val.node.unmouseover(val.over);
            });

            _handlers = [];
        };

        /**
        * Traverses the tree, adding mouse events along the way.
        */
        var _addEvents = function() {

            var eventsFunction = function(node) {
                var over, out;

                if (node.height == 0) {
                    // currently not adding anything to the head node

                // add tooltips to collapsed areas
                } else if (node.collapsedNodes && node.visual.node.getCollapsed()) {
                    over = function() {
                        var bb = node.visual.node.getBBox(), text = "";

                        text += "<strong>Collapsed Hops:</strong><br />";

                        $.each(node.collapsedNodes, function(index, n) {
                            text += n.name + "<br />";
                        });

                        this.popup = _showTooltip(bb.x, bb.y, node, "collapsed");
                    };

                    out = function() {
                        this.popup.fadeOut(200);
                    };

                    _handlers.push({ node: node.visual.node.rv(), over: over, out: out });
                    node.visual.node.rv().hover(over, out);

                // add tooltips to non root, leaf and collapsed nodes
                } else if (!node.isLeaf && (!node.collapsedNodes || !node.visual.node.getCollapsed())) {
                    over = function() {
                        var bb = node.visual.node.getBBox();
                        this.popup = _showTooltip(bb.x, bb.y, node, "hop");
                    };

                    out = function() {
                        this.popup.fadeOut(200);
                    };

                    _handlers.push({ node: node.visual.node.r(), over: over, out: out });
                    node.visual.node.r().hover(over, out);

                }

                // add tool tips to the leaf names
                if (node.isLeaf) {
                    over = function() {
                        var bb = node.visual.text.r().getBBox();
                        this.popup = _showTooltip(bb.x, bb.y, node, "leaf");
    //                    if (!_tree.collapsed && _tree.leaves[node.name].allPaths.others) {
    //                        _processAltPaths(_tree.leaves[node.name].allPaths.mostCommon,
    //                            _tree.leaves[node.name].allPaths.others
    //                        );
    //                    }
                    };

                    out = function() {
                        this.popup.fadeOut(200);
    //                    if (!_clickedLeaf) _altPaths.remove();
                    };

                    _handlers.push({ node: node.visual.text.r(), over: over, out: out });
                    node.visual.text.r().hover(over, out);

                    if (!_tree.collapsed) {
                        over = function() {
                            if (_clickedLeaf) {
                                _clickedLeaf.attr(_options.leaf.text);
                                _altPaths.remove();
                            }

                            if (_clickedLeaf != node.visual.text.r()) {
                                _clickedLeaf = node.visual.text.r();
                                _clickedLeaf.attr({ fill: "#00f" });
                                if (_tree.leaves[node.name].allPaths && _tree.leaves[node.name].allPaths.others) {
                                    _processAltPaths(_tree.leaves[node.name].allPaths.mostCommon,
                                        _tree.leaves[node.name].allPaths.others, node
                                    );
                                }
                            } else {
                                _clickedLeaf = undefined;
                            }

                        };

                        _handlers.push({ node: node.visual.text.r(), click: over });
                        node.visual.text.r().click(over);
                    }
                }
            };

            _traverseTree(_tree.root, eventsFunction);
        };

        /**
        * Find the last point in an array where two paths are the same
        */
        var _findLastCommonHop = function(path1, path2) {
            var common;
            for (var i = 0; i < path1.length; i++) {
                if (!path2[i]) return common;
                if (path1[i].ip == path2[i].ip) {
                    common = { index: i, hop: path1[i] };
                } else {
                    if (i == 0) return { index: -1, hop: { hostname: _tree.root.name } };
                    if (common) return common;
                }
            }

            return common;
        };

        /**
        * Find the first time that two paths are the same
        */
        var _findFirstCommonHop = function(path1, path2) {
            var common;
            for (var i = 0; i < path2.length; i++) {
                // try to find a common hop
                for (var j = 0; j < path1.length; j++) {
                    // we can't deal will hop timeouts unfortunately
                    if (path2[i].ip == path1[j].ip
                        && path1[j].ip != "0.0.0.0"
                        && path1[j].ip != "::"
                    ) {
                        return { path1: j, path2: i, hop: path1[j] };
                    }
                }
            }
        };

        /**
        * Converts a given node name and path to a node
        */
        var _ipToNode = function(node, name, path) {
            var found;

            var _traverse = function(node, name, path, pos) {
                // leaf nodes
                if (node.branches.length == 0) {
                    if (node.name = name) return node;

                // other nodes
                } else {
                    for (var i in node.branches) {
                        var branch = node.branches[i];
                        if (branch.name == path[pos].hostname) {
                            if (name == pos) {
                                found = branch;
                                return;
                            }
                            _traverse(branch, name, path, ++pos);
                            return;
                        }
                    }
                }
            }

            _traverse(node, name, path, 0);

            return found;
        };

        /**
         * Clear and left over alternative paths
         */
        var _clearAltPaths = function() {
            if (_clickedLeaf) {
                _altPaths.remove();
                _clickedLeaf.attr(_options.leaf.text);
                _clickedLeaf = undefined;
            }
        };

        /**
        * Draws an alternative path between a given start and end node
        */
        var _drawAltPath = function(start, end, hops) {
            var sb = start.visual.node.r().getBBox(), eb = end.visual.node.r().getBBox();
            var cx = (sb.x + sb.width + eb.x) / 2;
            var cy = (sb.y + eb.y) / 2
            var cr = 5;

            var over = function(event) {
                this.tooltip = _showTooltip(cx, cy - cr, hops, "altpath");
            };

            var out = function(event) {
                this.tooltip.remove();
            };

            _altPaths.push(_paper.path(
                "M" + (sb.x + sb.width) + " " + sb.y +
                "L" + eb.x + " " + eb.y
            ).attr({ stroke: "#00f" }));

            _altPaths.push(_paper.circle(cx, cy, cr
            ).attr({ fill: "#00f" }).hover(over, out));
        };

        /**
        * Process and then draw alternative paths
        */
        var _processAltPaths = function(mainPath, altPaths, leaf) {
            var altPath, start, end, startNode, endNode, nextNode, gap = _options.spacingVer / 3,
                startX, startY, nextX, nextY, bb, hops, pathDetails,
                branchStyle = { stroke: "#00f", "stroke-width": _options.branch.style["stroke-width"] };

            var debug = function(startX, startY, startNode, endNode, hops) {
                console.log(_tree, startNode, endNode, hops);
                _altPaths.push(_paper.circle(startX, startY, 10, 10));
                _altPaths.push(_paper.circle(endNode.visual.node.r().getBBox().x, endNode.visual.node.r().getBBox().y, 10, 10));
            };

            var follow = function(startNode, endNode, curNode, mainPath, altPath, startIndex, startX, startY, pathDetails, gap) {
                    var pos = startIndex + 1, x, y, coords,
                    width = _options.node.style['stroke-width'],
                    nodeIter = curNode, nextNode, bb, type, over, out, rect,
                    pathDifference = pathDetails.altLen - pathDetails.mainLen;

                var drawCollapsed = function(pathDifference, over, out) {
                    var altPathPart, left, space = Math.abs(_options.collapseHopSpace);

                    // draw the rest as collapsed hops
                    altPathPart = altPath.slice(pos - 1, pos + pathDifference);
                    left = x - (space * (altPathPart.length - 1)) / 2;

                    // SVG hack to centre the line around 1 pixel
                    left = Math.round(left - 0.5) + 0.5;

                    $.each(altPathPart, function(index, altHop) {
                        _altPaths.push(_paper.path(_linePath(left, y, left, y + _options.spacingVer / 4))
                            .attr({ stroke: "#00f" }));
                        left += space;
                    });

                    // event sensitive block
                    rect = _paper.rect(x - (space * (altPathPart.length - 1)) / 2, y,
                        left - x + (space * (altPathPart.length - 1)) / 2, Math.abs(_options.spacingVer) / 4)
                        .attr({ fill: "#fff", opacity: 0.00001, stroke: "#fff", "stroke-opacity": 0.00001, "stroke-width": 2 })
                        .hover(over, out);
                    rect.altHops = altPathPart;
                    _altPaths.push(rect);
                };

                var drawRamp = function(x, y, endY, gap, type, style) {
                    var rampEnd = {};

                    switch (type) {
                        // on ramp: /----
                        case "on":
                            gap *= -1;
                            _altPaths.push(_paper.path(_linePath(
                                x, y, x + _options.spacingHor / 4, y + gap)).attr(style));
                            _altPaths.push(_paper.path(_linePath(
                                x + _options.spacingHor / 4, y + gap, x + _options.spacingHor, y + gap)).attr(style));
                            x += _options.spacingHor;
                            y += gap;
                            break;

                        // off ramp: ----\
                        case "off":
                            _altPaths.push(_paper.path(_linePath(
                                x, y, x + _options.spacingHor * 3 / 4, y)).attr(style));
                            _altPaths.push(_paper.path(_linePath(
                                x + _options.spacingHor * 3 / 4, y, x + _options.spacingHor, y + gap)).attr(style));
                            x += _options.spacingHor;
                            y += gap;
                            break;

                        // onoff ramp: /----\
                        case "onoff":
                            // TODO: implement
                            _altPaths.push(_paper.path(_linePath(x, y, x + _options.spacingHor / 4, y - gap)).attr(style));
                            _altPaths.push(_paper.path(
                                _linePath(x + _options.spacingHor / 4, y - gap, x + _options.spacingHor * 3 / 4, y - gap)).attr(style));
                            _altPaths.push(_paper.path(
                                _linePath(x + _options.spacingHor * 3 / 4, y - gap, x + _options.spacingHor, y)).attr(style));
                            x += _options.spacingHor;
                            break;

                        // onoff branching ramp:
                        //
                        // |----\
                        // |
                        //
                        case "onoffbranch":
                            _altPaths.push(_paper.path(_linePath(x, y, x, endY - gap)).attr(style));
                            y = endY - gap;
                            _altPaths.push(_paper.path(
                                _linePath(x, y, x + _options.spacingHor * 3 / 4, y)).attr(style));
                            _altPaths.push(_paper.path(
                                _linePath(x + _options.spacingHor * 3 / 4, y, x + _options.spacingHor, y + gap)).attr(style));
                            y += gap;
                            x += _options.spacingHor;
                            break;

                        // on branching ramp:
                        //
                        // |----
                        // |
                        //
                        case "onbranch":
                            _altPaths.push(_paper.path(_linePath(x, y, x, endY - gap)).attr(style));
                            y = endY - gap;
                            _altPaths.push(_paper.path(_linePath(x, y, x + _options.spacingHor, y)).attr(style));
                            x += _options.spacingHor;
                            break;
                    }

                    rampEnd.x = x;
                    rampEnd.y = y;

                    return rampEnd;
                };

                // difference is the root or a 1 branch node
                if (startNode.height == 0 || startNode.branches.length == 1) {
                    // hop added into one branch spacing
                    if (curNode == endNode) type = "onoff";
                    else type = "on"

                    coords = drawRamp(startX, startY, curNode.visual.node.r().getBBox().y, gap, type, branchStyle);

                // difference has >1 branches
                } else if (startNode.branches.length > 1) {
                    bb = startNode.visual.node.r().getBBox();
                    if (curNode.visual.node.r().getBBox().y == bb.y) {
                        type = "on";
                    } else {
                        // check if the end is one hop away
                        if (curNode == endNode) type = "onoffbranch";
                        else type = "onbranch";
                    }
                    coords = drawRamp(startX, startY, curNode.visual.node.r().getBBox().y, gap, type, branchStyle);

                // difference has no branches
                } else {
                    // TODO: implement
                }

                x = coords.x;
                y = coords.y;

                // begin following the nodes
                while (nodeIter != endNode) {
                    nextNode = _ipToNode(_tree.root, pos, mainPath);
                    bb = nextNode.visual.node.r().getBBox();

                    // add tool tips to alternative hops
                    over = function() {
                        if (this.altHops) {
                            this.tooltip = _showTooltip(
                                this.getBBox().x, this.getBBox().y, this.altHops, "altpath");
                        } else {
                            this.tooltip = _showTooltip(
                                this.getBBox().x, this.getBBox().y, this.altHop, "althop");
                        }
                    };
                    out = function() {
                        if (this.tooltip) this.tooltip.remove();
                    };

                    // add in some hops
                    if (pathDifference > 0 && nextNode == endNode) {
                        // draw the rest as collapsed hops
                        drawCollapsed(pathDifference, over, out);

                    // skips some hops
                    } else if (pathDifference < 0 && nextNode == endNode) {
                        rect = _paper.rect(x - width / 2, y, width, _options.spacingVer / 5)
                            .attr({ fill: "#00f", "stroke-width": _options.node.hoverTol, "stroke-opacity": 0.00001, stroke: "#fff" })
                            .hover(over, out);
                        rect.altHops = [];
                        _altPaths.push(rect);

                    // same number of hops
                    } else {
                        rect = _paper.rect(x - width / 2, y, width, _options.spacingVer / 5)
                            .attr({ fill: "#00f", "stroke-width": _options.node.hoverTol, "stroke-opacity": 0.00001, stroke: "#fff" })
                            .hover(over, out);
                        rect.altHop = altPath[pos - 1];
                        _altPaths.push(rect);
                    }

                    // check if the next node is a leaf
                    if (!mainPath[pos]) break;

                    // draw differently for branching areas
                    if (nodeIter.branches.length > 1) {
                        // draw a vertical line
                        _altPaths.push(_paper.path(_linePath(x, y, x, bb.y - gap)).attr(branchStyle));
                        y = bb.y - gap;

                    // only 1 branch
                    } else if (nextNode != endNode) {
                        // draw the next hor connector
                        _altPaths.push(_paper.path(_linePath(x, y, x + _options.spacingHor, y)).attr(branchStyle));
                        x += _options.spacingHor;
                    }

                    nodeIter = _ipToNode(_tree.root, pos++, mainPath);
                }

                // draw off-ramp
                if (curNode != endNode) {
                    drawRamp(x, y, nodeIter.visual.node.r().getBBox().y, gap, "off", branchStyle);

                // only one branch difference
                } else {
                    // TODO: reverse
                    x -= _options.spacingHor / 2;
                    y -= gap;

                    over = function() {
                        // more than one hop difference
                        if (pathDifference > 0) {
                            this.tooltip = _showTooltip(
                                this.getBBox().x, this.getBBox().y, pathDetails.hops, "altpath");

                        // less than one hop difference
                        } else {
                            this.tooltip = _showTooltip(
                                this.getBBox().x, this.getBBox().y, altPath[pos - pathDetails.mainLen - 1], "althop");
                        }
                    };
                    out = function() {
                        this.tooltip.remove();
                    };

                    // draw collapsed blocks or normal nodes
                    if (pathDifference > 0) {
                        drawCollapsed(pathDifference, over, out);
                    } else {
                        _altPaths.push(_paper.rect(x - width / 2, y, width, _options.spacingVer / 5)
                            .attr({ fill: "#00f", "stroke-width": _options.node.hoverTol, "stroke-opacity": 0.00001, stroke: "#fff" })
                            .hover(over, out));
                    }
                }
            };

            mainPath = $.extend([], mainPath);

            if (_options.treeDirection == "left") mainPath.reverse();

            mainPath.push({ hostname: leaf.name, ip: leaf.data.ip, latency: leaf.data.latency, mtu: leaf.data.mtu, pmtud: leaf.data.pmtud });

            $.each(altPaths, function(i, altPath) {
                altPath = $.extend([], altPath.trace);

                if (_options.treeDirection == "left") altPath.reverse();

                altPath.push({ hostname: leaf.name, ip: leaf.data.ip, latency: leaf.data.latency, mtu: leaf.data.mtu, pmtud: leaf.data.pmtud });

                // find the start and end points of difference
                start = _findLastCommonHop(mainPath, altPath);
                end = _findFirstCommonHop(
                    mainPath.slice(start.index + 1), altPath.slice(start.index + 1));

                // check if the starting point is the root
                if (start.index == -1) startNode = _tree.root;
                else startNode = _ipToNode(_tree.root, start.index, mainPath);

                endNode = _ipToNode(_tree.root, end.path1 + start.index + 1, mainPath);
                hops = altPath.slice(start.index + 1, end.path2 + start.index + 1);

                // get the starting coordinates
                bb = startNode.visual.node.r().getBBox();
                startX = bb.x;
                startY = bb.y;

                // get the next nodes coordinates
                nextNode = _ipToNode(_tree.root, start.index + 1, mainPath);
                bb = nextNode.visual.node.r().getBBox();
                nextX = bb.x;
                nextY = bb.y;

                // difference is the root
                if (startNode.height == 0) {
                    bb = startNode.visual.edges[0].r().getBBox();
                    startX = bb.x;
                    startY = nextY;
                }

                pathDetails = { hops: hops, mainLen: end.path1, altLen: end.path2 };

                follow(startNode, endNode, nextNode, mainPath, altPath, start.index + 1, startX, startY, pathDetails, gap);
                gap += _options.spacingVer / 3;
            });
        };

        /**
        * Creates a root node element and draws it
        *
        * @return an ElementNode object representing the root
        */
        var _drawRoot = function(node, treeDirection) {
            var bb = node.visual.node.getBBox();
            var max = Number.NEGATIVE_INFINITY;
            var set = _paper.set();
            var en;

            $.each(node.branches, function(index, val) {
                max = Math.max(val.visual.node.getBBox().y, max);
            });
            set.push(_paper.path(_linePath(
                bb.x, bb.y - _options.root.extension,
                bb.x, max + _options.root.extension)
            ).attr(_options.leaf.style));

            set.push(_paper.text(bb.x - _options.spacingText, bb.y + (max - bb.y) / 2, node.name).attr({ "text-anchor": _options.root.anchor }));

            en = new ElementNode(0, 0, 0, 0, node);
            en.setupCollapse(0, 0, 0, 0, false);
            en.setVisual(set);

            return en;
        };

        /**
        * Traverses over a tree and draws the nodes and branches.
        */
        var _drawTree = function() {
            var prevNode = _tree.root;
            var lossColor = function(loss) {
                loss = Math.round(loss * 1000) / 1000;
                if (loss == 0) return _options.branch.style.stroke;
                return "rgb(230," + ((1 - loss) * 230) + ",0)";
            };
            var collapseParents = [];

            var traverse = function(node) {
                // draw the root hop bar
                if (node.height == 0) {
                    node.visual.node = _drawRoot(node, _options.treeDirection);

                // draw the rest of the nodes
                } else {
                    node.visual.node.draw(_paper, _options);
                }

                // indicate loss on leaf nodes
                if (node.branches.length > 1) collapseParents.push(node);
                if (node.isLeaf && _tree.leaves[node.name].icmp) {
                    var icmp = _tree.leaves[node.name].icmp;

                    if (node.collapsing) {
                        node.visual.node.rv().attr({ stroke: lossColor(icmp.loss) });
                        node.visual.node.r().attr({ stroke: lossColor(icmp.loss) });

                        // color the expanded nodes too
                        $.each(node.collapsedNodes, function(index, val) {
                            if (val.isLeaf) {
                                val.visual.node.r().attr({ stroke: lossColor(icmp.loss) });
                                return;
                            }
                            val.visual.node.r().attr({ fill: lossColor(icmp.loss) });
                            val.visual.edges[0].r().attr({ stroke: lossColor(icmp.loss) });
                        });
                    } else {
                        node.visual.node.r().attr({ stroke: lossColor(icmp.loss) });
                    }
                }

                // style the edges
                $.each(node.visual.edges, function(index, edge) {
                    edge.draw(_paper, _options).attr(_options.branch.style);
                });

                // draw the text
                if (node.visual.text) {
                    node.visual.text.draw(_paper, _options);
                }

                prevNode = node;
            };
            _traverseTree(_tree.root, traverse);

            $.each(collapseParents, function(index, node) {
                var leafNode = node.branches[1];

                var checkPath = function(node) {
                    // continue till we reach the leaf node
                    while (!node.isLeaf) {
                        // if multiple branches along path, do not colour it
                        if (node.branches.length > 1) return undefined;

                        node = node.branches[0];
                    }
                    return node;
                };

                leafNode = checkPath(leafNode);

                $.each(node.visual.connectors, function(index, connector) {
                    var color = connector.node.visual.node.r().attr().fill;

                    // get the colour from either the fill or stroke
                    if (color == "none")
                        color = connector.node.visual.node.r().attr().stroke;

                    // colour the connecting vertical line
                    connector.edge.r().attr({ stroke: color });
                });
            });
        };

        /**
        * Creates a path string from the given coordinates
        */
        var _linePath = function(x1, y1, x2, y2) {
            return "M" + x1 + " " + y1 + "L" + x2 + " " + y2;
        };

        /**
        *  Calculates tree properties for use when drawing
        */
        var _processTree = function(x, y, node) {

            var process = function(x, y, node, collapse, collapseTails) {
                var yspace = 0, branch, rtt;

                if (!node.visual) node.visual = { edges: [] };
                if (!node.visual.connectors) node.visual.connectors = [];

                if (!collapseTails) {
                    node.visual.node = new ElementNode(x, y, x, y + _options.spacingVer / 4, node);

                    if (node.isLeaf) {
                        rtt = _tree.leaves[node.name].rtt;
                        node.visual.text = new ElementText(
                            x + _options.spacingText, y, 0, 0, _options.leaf.text.font,
                            { name: node.name, rtt: rtt }, node
                        );
                    }
                } else {
                    node.visual.node.setupCollapse(x, y, x, y + _options.spacingVer / 4, node.collapsing && !node.collapseEnd);

                    if (node.isLeaf) {
                        node.visual.text.setupCollapse(x + _options.spacingText, y, 0, 0, false);
                    }

                    if (node.collapsing) {
                        // draw the collapsed block
                        if (node.collapseEnd) {
                            collapse.push(node);

                            // don't output the leaf name in the hop list
                            if (node.isLeaf)
                                collapse.splice(collapse.length - 1, 1);

                            node.collapsedNodes = collapse;
                            collapse = undefined;
                        } else if (collapse) {
                            collapse.push(node);
                        } else {
                            collapse = [ node ];
                        }
                    }
                }

                if (node.branches.length == 0) {
                    return;
                } else if (node.branches.length == 1) {
                    if (!collapseTails) {
                        node.visual.edges.push(new ElementEdge(x, y, x + _options.spacingHor, y));
                        process(x + _options.spacingHor, y, node.branches[0], collapse, collapseTails);
                    } else {
                        if (node.collapseEnd) {
                            x += _options.spacingHorCol;
                        }

                        node.visual.edges[0].setupCollapse(
                            x, y, x + _options.spacingHorCol, y, node.collapsing, !node.collapseEnd && !node.collapsing);

                        if (!node.collapsing) {
                            x += _options.spacingHorCol;
                        }
                        process(x, y, node.branches[0], collapse, collapseTails);
                    }
                } else {
                    branch = node.branches[0];

                    if (!collapseTails) {
                        node.visual.edges.push(new ElementEdge(x, y, x + _options.spacingHor, y));
                        node.visual.connectors.push({ node: branch, edge: node.visual.edges[node.visual.edges.length - 1] });
                        process(x + _options.spacingHor, y, branch, collapse, collapseTails);
                    } else {
                        node.visual.edges[0].setupCollapse(x, y, x + _options.spacingHorCol, y, branch.collapseStart, !branch.collapsing);
                        process(x + _options.spacingHorCol, y, branch, collapse, collapseTails);
                    }

                    if (node.direction == 1)
                        yspace = branch.above;
                    else
                        yspace = branch.below;

                    var j = 1;
                    for (var i = 1; i < node.branches.length; i++) {
                        branch = node.branches[i];

                        if (node.direction == 1)
                            yspace += branch.below + 1;
                        else
                            yspace += branch.above + 1;

                        if (!collapseTails) {
                            node.visual.edges.push(new ElementEdge(x, y, x, y + node.direction * yspace * _options.spacingVer));
                        } else {
                            node.visual.edges[j].setupCollapse(x, y, x, y + node.direction * yspace * _options.spacingVer, false);
                        }
                        j++;

                        if (node.direction == 1) {
                            y = y + yspace * _options.spacingVer;
                            yspace = branch.above;
                        } else {
                            y = y - yspace * _options.spacingVer;
                            yspace = branch.below;
                        }

                        if (!collapseTails) {
                            node.visual.edges.push(new ElementEdge(x, y, x + _options.spacingHor, y));
                            node.visual.connectors.push({ node: branch, edge: node.visual.edges[node.visual.edges.length - 1] });
                            j++;
                            process(x + _options.spacingHor, y, branch, collapse, collapseTails);
                        } else {
                            node.visual.edges[j].setupCollapse(x, y, x + _options.spacingHorCol, y, branch.collapsing, !branch.collapsing);
                            j++;
                            process(x + _options.spacingHorCol, y, branch, collapse, collapseTails);
                        }
                    }
                }
            }

            process(x, y, node, undefined, false);
            process(x, y, node, undefined, true);
            _tree.processed = true;
        };

        var _draw = function() {
            _drawTree();
            _addEvents();
        };

        var _redraw = function() {
            _clearEvents();
            _clearAltPaths();
            _addEvents();
            _processOptions();
        };

        /**
        * Traverses the tree and collapses the appropriate nodes.
        */
        var _collapse = function(node) {
            var traverse = function(node) {
                node.visual.node.toggleCollapse(_paper, _options);

                if (node.isLeaf) node.visual.text.toggleCollapse(_paper, _options);

                $.each(node.visual.edges, function(index, val) {
                    val.toggleCollapse(_paper, _options);
                });
            }

            _traverseTree(_tree.root, traverse);
            _tree.collapsed = !_tree.collapsed;

            _redraw();
        }

        var _hideTree = function() {
            var traverse = function(node) {
                if (node.visual.node) node.visual.node.hide();
                if (node.visual.text) node.visual.text.hide();
                if (node.visual.edges) {
                    $.each(node.visual.edges, function(index, val) {
                        val.hide();
                    });
                }

            };

            _traverseTree(_tree.root, traverse);
        };

        var _showTree = function() {
            var traverse = function(node) {
                if (node.visual.node) node.visual.node.show();
                if (node.visual.text) node.visual.text.show();
                if (node.visual.edges) {
                    $.each(node.visual.edges, function(index, val) {
                        val.show();
                    });
                }

            };

            _traverseTree(_tree.root, traverse);
        };

        /**
        * Swtiches the current tree for a pruned or full version
        */
        var _togglePrune = function() {
            if (!_trees.treePruned) return false;

            var prevTree = _tree, textWidth, x;

            _hideTree();

            if (_tree.pruned) {
                _tree = _trees.treeFull;
            } else {
                _tree = _trees.treePruned;
            }

            _displayTree(_tree.processed)

            if (prevTree.collapsed != _tree.collapsed) {
                _collapse();
            }

            _clearAltPaths();
            _clearEvents();
            _addEvents();

            return true;
        }

        /**
        * Starts the tree building process or unhides an existing tree
        */
        var _displayTree = function(unhide) {
            _processOptions();
            textWidth = _getPrintLength(_tree.root.name, _options.leaf.text.font).width;

            if (_options.treeDirection == "left") {
                _invertSpacings();
                x = _options.width + _options.spacingText * 2 - 5 - textWidth;

                // draw in the tree right
            } else {
                x = _options.spacingText + textWidth;
            }

            // check if the tree has been processed yet
            if (!unhide) {
                _processTree(x, _options.spacingVer * (_tree.root.below + 0.5), _tree.root);
                _draw();
            } else {
                _showTree();
            }
        }

        var _initialise = function() {
            // setup the tree
            if (_trees.treeFull) {
                _trees.treeFull.collapsed = false;
            } else {
                throw "No tree data found";
            }

            if (_trees.treePruned) {
                _trees.treePruned.collapsed = false;
            }

            // start with the right type of tree
            if (_options.startType == "pruned") {
                _tree = _trees.treePruned;
            } else {
                _tree = _trees.treeFull;
            }

            _displayTree(false);

            if (_options.collapseTails) _collapse(_tree.root);
        };

        _initialise();

        this.draw = _draw;
        this.toggleCollapse = function () { _collapse(_tree.root); };
        this.togglePrune = _togglePrune;
        this.drawKey = function(container, width, height) {
            var paper = Raphael(container, width, height), objRight = 100, descLeft = 120, gap = 20,
                offset = { top: 20, left: 10, bottom: 10, right: 10 }, bb, visual, maxWidth,
                font = { font: "12px Arial, Helvetica", fill: "rgb(0,0,0)" };

            var altSymbol = function(x, y, width, height) {
                return paper.path(
                    "M" + x + " " + y +
                    "L" + (x + width) + " " + y +
                    "M" + (x + width) + " " + y +
                    "L" + (x + width / 2) + " " + (y - height) +
                    "M" + (x + width / 2) + " " + (y - height) +
                    "L" + x + " " + y
                ).attr({ stroke: "#000" });
            };

            // draw the src / dst node item
            visual = paper.text(descLeft, offset.top, "Source / Destination Hop")
                .attr(font).attr({ "text-anchor": "start" });
            bb = visual.getBBox();
            maxWidth = Math.max(0, bb.width);
            paper.path(_linePath(objRight - 5, bb.y + bb.height, objRight - 5, bb.y + bb.height - 12))
                .attr(_options.leaf.style);

            // draw the collapsed hops item
            visual = paper.text(descLeft, offset.top + gap, "Collapsed Hops")
                .attr(font).attr({ "text-anchor": "start" });
            bb = visual.getBBox();
            maxWidth = Math.max(maxWidth, bb.width);
            paper.path(_linePath(objRight - 5, bb.y + bb.height, objRight - 5, bb.y + bb.height - 8))
                .attr(_options.node.style);
            paper.path(_linePath(objRight - 10, bb.y + bb.height, objRight - 10, bb.y + bb.height - 8))
                .attr(_options.node.style);
            paper.path(_linePath(objRight - 15, bb.y + bb.height, objRight - 15, bb.y + bb.height - 8))
                .attr(_options.node.style);

            // draw the path loss item
            visual = paper.text(descLeft, offset.top + gap * 2, "Path Loss (%)")
                .attr(font).attr({ "text-anchor": "start" });
            bb = visual.getBBox();
            maxWidth = Math.max(maxWidth, bb.width);
            paper.path(_linePath(objRight - 80, bb.y + bb.height / 2, objRight - 70, bb.y + bb.height / 2))
                .attr(_options.node.style);
            visual = paper.text(objRight - 68, offset.top + gap * 2, "0")
                .attr(_options.leaf.text).attr({ "text-anchor": "start" });

            paper.path(_linePath(objRight - 55, bb.y + bb.height / 2, objRight - 45, bb.y + bb.height / 2))
                .attr(_options.node.style).attr({ stroke: "rgb(230,207,0)" });
            visual = paper.text(objRight - 45, offset.top + gap * 2, "10")
                .attr(_options.leaf.text).attr({ "text-anchor": "start" });

            paper.path(_linePath(objRight - 30, bb.y + bb.height / 2, objRight - 20, bb.y + bb.height / 2))
                .attr(_options.node.style).attr({ stroke: "rgb(230,0,0)" });
            visual = paper.text(objRight - 20, offset.top + gap * 2, "100")
                .attr(_options.leaf.text).attr({ "text-anchor": "start" });

            // draw the src / dst name
            visual = paper.text(descLeft, offset.top + gap * 3, "Source / Destination Name")
                .attr(font).attr({ "text-anchor": "start" });
            bb = visual.getBBox();
            maxWidth = Math.max(maxWidth, bb.width);
            visual = paper.text(objRight, offset.top + gap * 3, "ampz-waikato")
                .attr(_options.leaf.text).attr({ "text-anchor": "end" });

            // draw the RTT item
            visual = paper.text(descLeft, offset.top + gap * 4, "Average RTT, Recent RTT")
                .attr(font).attr({ "text-anchor": "start" });
            bb = visual.getBBox();
            maxWidth = Math.max(maxWidth, bb.width);
            visual = paper.text(objRight, offset.top + gap * 4, "10.5, 11")
                .attr(_options.leaf.text).attr({ "text-anchor": "end" });

            // draw the alternative paths item
            visual = paper.text(descLeft, offset.top + gap * 5, "Alternative Paths (click to activate)")
                .attr(font).attr({ "text-anchor": "start" });
            bb = visual.getBBox();
            maxWidth = Math.max(maxWidth, bb.width);
            altSymbol(objRight - 10, bb.y + bb.height, 10, 10);

            // draw the alt path branch item
            visual = paper.text(descLeft, offset.top + gap * 6, "Alternative Branch")
                .attr(font).attr({ "text-anchor": "start" });
            bb = visual.getBBox();
            maxWidth = Math.max(maxWidth, bb.width);
            paper.path(_linePath(objRight - 40, bb.y + bb.height / 2, objRight, bb.y + bb.height / 2))
                .attr(_options.node.style).attr({ stroke: "#00F" });

            // draw a rectangle box
            paper.rect(0, 0, descLeft + maxWidth + offset.right, bb.y + bb. height + offset.bottom);
        };
    }

    function Element(x1, y1, x2, y2, node) {
        var _visual, _colVisual, _colPos, _collapsed = false, _colHide = false, _expHide = false, _redraw = false;
        var _pos = { x1: x1, y1: y1, x2: x2, y2: y2 };
        var _ctrlNode = node;

        this.getPos = function() { return _pos; };
        this.getColPos = function() { return _colPos; };
        this.getCollapsed = function() { return _collapsed; };
        this.getCtrlNode = function() { return _ctrlNode; };
        this.setVisual = function(visual) { _visual = visual; };
        this.setColVisual = function(visual) { _colVisual = visual; };
        this.rv = function() { return _colVisual; };
        this.r = function() { return _visual; };

        this.hide = function() {
            if (_colVisual) _colVisual.hide();
            if (_visual) _visual.hide();
        };

        this.show = function() {
            if (_collapsed) {
                if (_colVisual) _colVisual.show()
                else if (_visual && !_colHide) _visual.show();
            } else {
                _visual.show();
                if (_colVisual) _colVisual.hide();
            }
        };

        this.setupCollapse = function (x1, y1, x2, y2, hide, redraw) {
            _colPos = { x1: x1, y1: y1, x2: x2, y2: y2 };
            _colHide = hide;
            _redraw = redraw;
        };

        this.getBBox = function() {
            var p;

            if (_collapsed) {
                p = _colPos;
            } else {
                p = _pos;
            }

            return { x: p.x1, y: p.y1, width: Math.abs(p.x2 - p.x1), height: Math.abs(p.y2 - p.y1) }
        };

        this.toggleCollapse = function(paper, options) {
            // switching from expanded to collapsed
            if (!_collapsed) {
                // switch visuals
                if (_colVisual) {
                    _colVisual.show();
                    _visual.hide();
                } else {
                    // hide or translate the visual
                    if (_colHide) {
                        _visual.hide();
                    } else {
                        _visual.translate(_colPos.x1 - _pos.x1, _colPos.y1 - _pos.y1);
                    }
                }

                // special case for scaling edges
                if (_redraw) {
                    _visual.remove();
                    var visual = paper.path(
                        "M" + _colPos.x1 + " " + _colPos.y1 +
                        "L" + _colPos.x2 + " " + _colPos.y2
                    ).attr(options.branch.style
                    ).toBack();

                    this.setVisual(visual);
                }

            // switch from collapsed to expanded
            } else {
                // show or translate the visual
                if (_colVisual) _colVisual.hide();
                if (_colHide || _colVisual) {
                    _visual.show();
                } else {
                    _visual.translate(_pos.x1 - _colPos.x1, _pos.y1 - _colPos.y1);
                }

                // special case for scaling edges
                if (_redraw) {
                    _visual.remove();
                    var visual = paper.path(
                        "M" + _pos.x1 + " " + _pos.y1 +
                        "L" + _pos.x2 + " " + _pos.y2
                    ).attr(options.branch.style
                    ).toBack();

                    this.setVisual(visual);
                }
            }

            _collapsed = !_collapsed;
        };
    }

    function ElementText(x1, y1, x2, y2, font, text, node) {
        Element.call(this, x1, y1, x2, y2, node);
        this.text = text;
        this.font = font;
    }
    ElementText.prototype = new Element();
    ElementText.prototype.draw = function(paper, options) {
        var pos = this.getPos();
        var x = pos.x1, y = pos.y1, word, bb, hasAlt;
        var set = paper.set();
        var node = this.getCtrlNode();
        var left = pos.x1 - options.spacingText;
        var name = this.text.name;
        var temp;

        var altSymbol = function(x, y, width, height) {
            return paper.path(
                "M" + x + " " + y +
                "L" + (x + width) + " " + y +
                "M" + (x + width) + " " + y +
                "L" + (x + width / 2) + " " + (y - height) +
                "M" + (x + width / 2) + " " + (y - height) +
                "L" + x + " " + y
            ).attr({ stroke: "#000" });
        };

        // indicate if a path has alternative paths
        if (_tree.leaves[node.name].allPaths &&
            _tree.leaves[node.name].allPaths.others.length) {
            hasAlt = true;
        }

        word = paper.text(
            x, y, name
        ).attr({ "fill": options.leaf.text.fill, "text-anchor": options.leaf.anchor, font: this.font });
        bb = word.getBBox();
        set.push(word);

        if (options.treeDirection == "right") {
            if (hasAlt) set.push(altSymbol(x + bb.width + 2, y + bb.height / 4, bb.height / 2, bb.height / 2));
            x += set[0].getBBox().width + options.spacingText;
        } else {
            if (hasAlt) set.push(altSymbol(x + 2, y + bb.height / 4, bb.height / 2, bb.height / 2));
            x += -set[0].getBBox().width + options.spacingText;
        }

        // if there is rtt data
        if (this.text.rtt && this.text.rtt.average != -1) {
            set.push(paper.text(
                x, y, Math.round(this.text.rtt.average * 10) / 10 + ", " + Math.round(this.text.rtt.recent * 10) / 10
            ).attr({ "fill": options.leaf.text.fill, "text-anchor": options.leaf.anchor, font: this.font }));
        }

        temp = left;
        left = Math.min(left, x);
        x = Math.max(temp, x);

        // push on the event trigger sensitive block
        set.push(paper.rect(
            left, y - set[0].getBBox().height / 2, x - left, set[0].getBBox().height
        ).attr({ fill: "#fff", opacity: 0.00001 }));

        this.setVisual(set);
        return word;
    }

    function ElementNode(x1, y1, x2, y2, node) {
        Element.call(this, x1, y1, x2, y2, node);
    }
    ElementNode.prototype = new Element();
    ElementNode.prototype.draw = function(paper, options) {
        var pos = this.getPos(), colPos = this.getColPos(), visual, colVisual,
            left, right, set, len, temp, branchWidth;
        var node = this.getCtrlNode();
        var colStyle = { stroke: options.node.style.stroke, "stroke-width": 1 };

        // draw the expanded hop
        if (!node.isLeaf) {
            var width = options.node.style['stroke-width'];
            visual = paper.rect(
                pos.x1 - width / 2, pos.y1, width, options.spacingVer / 4
            ).attr({ fill: options.node.style.stroke, "stroke-width": options.node.hoverTol, "stroke-opacity": 0.00001, stroke: "#fff" });
        } else {
            visual = paper.path(
                "M" + pos.x1 + " " + (pos.y1 - options.branch.style['stroke-width'] / 2) +
                "L" + pos.x2 + " " + (pos.y1 + options.spacingVer / 2)
            ).attr(options.leaf.style);
        }
        this.setVisual(visual);

        // draw the collapsed block
        if (node.collapseEnd) {
            var space = options.collapseHopSpace;
            set = paper.set();
            len = node.collapsedNodes.length;

            // leaf collapses are drawn in a different position
            if (node.isLeaf) {
                right = colPos.x1;
                left = colPos.x1 - space;
            } else {
                right = colPos.x1 + ( (space * (node.collapsedNodes.length - 1)) / 2 );
                left = right;
            }
            // SVG hack to centre the line around 1 pixel
            left = Math.round(left - 0.5) + 0.5;

            for (var i = len - 1; i >= 0; i--) {
                set.push(paper.path(
                    "M" + left + " " + colPos.y1 +
                    "L" + left + " " + (colPos.y1 + 5)
                ).attr(colStyle));
                left -= space;
            }

            // push on the block connectors
            if (!node.isLeaf) {
                set.push(paper.path(
                    "M" + (colPos.x1 - options.spacingHorCol) + " " + colPos.y1 +
                    "L" + (colPos.x1 + options.spacingHorCol) + " " + colPos.y1
                ).attr(options.branch.style));
            } else {
                branchWidth = options.branch.style['stroke-width'];
                if (options.treeDirection == "left") branchWidth *= -1;

                set.push(paper.path(
                    "M" + (colPos.x1 - options.spacingHorCol) + " " + colPos.y1 +
                    "L" + (colPos.x1 + branchWidth) + " " + colPos.y1
                ).attr(options.branch.style));
                set.push(paper.path(
                    "M" + (colPos.x1 + space / 2) + " " + (colPos.y1 - options.branch.style['stroke-width'] / 2) +
                    "L" + (colPos.x1 + space / 2) + " " + (colPos.y1 + options.spacingVer / 2)
                ).attr(options.leaf.style));
            }

            // make sure the rectangle is drawn the right way
            temp = left;
            left = Math.min(left, right);
            right = Math.max(temp, right);

            // push on the event trigger sensitive block
            set.push(paper.rect(
                left, colPos.y1, right - left, 5
            ).attr({ "stroke-width": options.node.hoverTol, "stroke-opacity": 0.00001, stroke: "#fff" }));

            set.hide();
            this.setColVisual(set);
        }

        return [ visual, set ];
    };

    function ElementEdge(x1, y1, x2, y2, node) {
        Element.call(this, x1, y1, x2, y2, node);
    }
    ElementEdge.prototype = new Element();
    ElementEdge.prototype.draw = function(paper, options) {
        var pos = this.getPos();
        var visual = paper.path(
            "M" + pos.x1 + " " + pos.y1 +
            "L" + pos.x2 + " " + pos.y2
        ).attr(options.branch.style
        ).toBack();

        this.setVisual(visual);
        return visual;
    };

    /**
     * Creates a new TracerouteMap instance
     */
    $.monitormap = function(container, trees, options) {
            return new TracerouteMap(container, trees, options);
    };
})(jQuery);
