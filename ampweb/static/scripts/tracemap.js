/*
 * Traceroute Map graph type (less of a graph and more of a visualisation)
 */
Flotr.addType('tracemap', {
    options: {
        show: false,
    },

    hostCount: 0,
    legend: {},
    pathHitContainers: {},
    hostHitContainers: {},
    mostFrequentlyTakenPath: null,

    getFillStyle: function (host) {
        return this.getHSLA(host, false, false);
    },

    getStrokeStyle: function (host) {
        return this.getHSLA(host, true, false);
    },

    getShadowStyle: function (host) {
        return this.getHSLA(host, true, true);
    },

    /**
     * getHSLA method from the Rainbow graph.
     *
     * Gets the HSLA CSS values to style each host uniquely.
     * HSLA = Hue, Saturation, Lightness, Alpha
     * Also returns specific values to represent error states.
     */
    getHSLA: function (host, stroke, shadow) {
        if ( !(host in this.legend) )
            this.legend[host] = this.hostCount++;

        var h = (this.legend[host] * 222.49223594996221) % 360,
            s = host == "0.0.0.0" || host == "Error" ? 0 : 90,
            l = stroke ? 25 : (host == "Error" ? 30 : 60),
            a = shadow ? 0.5 : 1.0;

        return "hsla("+h+", "+s+"%, "+l+"%, "+a+")";
    },

    /**
     * Perform a traversal of the tree, applying a function at each node
     */
    traverse: function(root, node, func) {
        func(root, node);
        if ( "branches" in node ) {
            for ( var i = 0; i < node.branches.length; i++ ) {
                this.traverse(node, node.branches[i], func);
            }
        }
    },

    /**
     * Draws the detailed graph if the plot height is greater than 150 pixels,
     * otherwise draws a summary graph.
     * @param {Object} options
     */
    draw: function (options) {
        var context = options.context;

        context.save();
        context.lineJoin = 'round';

        if (options.height > 150)
            this.plotGraph(options);
        else
            this.plotSummary(options);

        context.restore();
    },

    /**
     * Plot the traceroute map using data processed in graphstyles/tracemap.js.
     * N.B.: nodes are paths, not hops. Paths branch to other paths and their
     * joins are precaculated in their "difference" properties. (Hops do not
     * branch to hops as would be a traditional view of a tree).
     * In brief:
     * - Find the length of the longest path (determines spacing of hops)
     * - Find the most frequently taken path (use as trunk)
     * - Traverse the tree, starting from the most frequently taken path
     */
    plotGraph: function (options) {
        var graph = this,
            context = options.context,
            paths = options.paths;

        // clear hit containers
        this.pathHitContainers = {};
        this.hostHitContainers = {};

        if ( paths === undefined || paths.length == 0 )
            return;

        context.fillStyle = "#333";
        context.strokeStyle = "#666";
        context.lineWidth = 1;

        /* Save the most frequently taken path (the only one we care about when
         * ordered in this way because all other paths should be branches) */
        this.mostFrequentlyTakenPath = paths[0];

        /* Sort by each path's hop count in descending order. This is done only
         * to be able to obtain the length of the longest path. */
        paths.sort(function(a,b) {
            if (a.hops.length == b.hops.length) return 0;
            return b.hops.length - a.hops.length;
        });

        var padding = 10,
            width = paths[0].hops.length - 1,
            height = paths.length - 1,
            canvasWidth = options.width - padding,
            canvasHeight = options.height - padding,
            plotOffset = padding / 2,
            xScale = canvasWidth / width,
            yScale = height > 0 ? canvasHeight / height : 0;

        /* Draw the tree */
        var y = 0;
        this.traverse(null, this.mostFrequentlyTakenPath, function(root, node) {
            node.y = y++;

            var path = y;
            if ( !(path in graph.pathHitContainers) ) {
                graph.pathHitContainers[path] = {
                    "node": node,
                    "unique": [] // lines used for this path's hit container
                };
            }

            var diff = [ 0, node.hops.length ];
            if ( "difference" in node ) {
                diff = node.difference;
            }

            var yScaled = node.y * yScale + plotOffset;

            var maxLen = diff[1] != null ? diff[1] : node.hops.length;
            for ( var i = diff[0]; i < maxLen; i++ ) {                
                if ( i + 1 < maxLen ) {
                    var x0 = i * xScale + plotOffset,
                        x1 = (i+1) * xScale + plotOffset;

                    context.beginPath();
                    context.moveTo(x0, yScaled);
                    context.lineTo(x1, yScaled);
                    context.closePath();
                    context.stroke();

                    graph.pathHitContainers[path].unique.push([
                        [x0, yScaled],
                        [x1, yScaled]
                    ]);
                }
            }

            if ( root != null ) {
                node.parent = root;

                // draw deviation
                var x0 = (diff[0]-1) * xScale + plotOffset,
                    x1 = diff[0] * xScale + plotOffset,
                    yScaledRoot = root.y * yScale + plotOffset;

                context.beginPath();
                context.moveTo(x0, yScaledRoot);
                context.lineTo(x1, yScaled);
                context.closePath();
                context.stroke();

                graph.pathHitContainers[path].unique.push([
                    [x0, yScaledRoot],
                    [x1, yScaled]
                ]);

                if ( diff[1] != null ) {
                    // draw join
                    x0 = (diff[1]-1) * xScale + plotOffset,
                    x1 = (diff[1]) * xScale + plotOffset;

                    context.beginPath();
                    context.moveTo(x0, yScaled);
                    context.lineTo(x1, yScaledRoot);
                    context.closePath();
                    context.stroke();

                    graph.pathHitContainers[path].unique.push([
                        [x0, yScaled],
                        [x1, yScaledRoot]
                    ]);
                }
            }
        });

        this.traverse(null, this.mostFrequentlyTakenPath, function(root, node) {
            var diff = [ 0, node.hops.length ];
            if ( "difference" in node ) {
                diff = node.difference;
            }

            var maxLen = diff[1] != null ? diff[1] : node.hops.length;
            for ( var i = diff[0]; i < maxLen; i++ ) {
                var host = node.hops[i][0],
                    xScaled = i * xScale + plotOffset,
                    yScaled = node.y * yScale + plotOffset;
                
                graph.plotHopPoint(context, host, xScaled, yScaled);
                context.fillText(host, xScaled, yScaled + 20);

                if ( !(host in graph.hostHitContainers) )
                    graph.hostHitContainers[host] = [];

                graph.hostHitContainers[host].push([xScaled, yScaled]);
            }
        });

    },

    plotHopPoint: function(context, host, x, y, hover) {
        context.save();

        if ( hover ) {
            context.lineWidth = 3;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 2;
            context.shadowBlur = 1;
            context.shadowColor = this.getShadowStyle(host);
        }

        context.fillStyle = this.getFillStyle(host);
        context.strokeStyle = this.getStrokeStyle(host);
        context.beginPath();
        context.arc(x, y, 3, 0, 2*Math.PI);
        context.closePath();
        context.fill();
        context.stroke();

        context.restore();
    },

    /**
     * Plot some simple markers to give an idea of where all the activity is on
     * the graph, based on the number of unique paths.
     *
     * XXX Data should be binned in future and this should be cleaned up to
     *     display something nicer than just circles.
     */
    plotSummary: function(options) {
        var context = options.context,
            paths = options.paths,
            xScale = options.xScale;

        if ( paths === undefined || paths.length == 0 )
            return;

        var getUniqueArray = function(input) {
            var lookup = {}, output = [];
            for ( var i = 0; i < input.length; ++i ) {
                if ( lookup.hasOwnProperty(input[i]) ) {
                    continue;
                }
                output.push(input[i]);
                lookup[input[i]] = 1;
            }
            return output;
        }

        var pathsEqual = function(path1, path2) {
            if ( path1.length != path2.length )
                return false;

            for ( var hop = 0; hop < path1.length; hop++ ) {
                if ( path1[hop][0] != path2[hop][0] ) {
                    return false;
                }
            }

            return true;
        }

        var maxNumPaths = 0;
        var pathsByTime = {};

        next_path:
        for ( var i = 0; i < paths.length; i++ ) {
            var times = getUniqueArray(paths[i].times);
            for ( var j = 0 ; j < times.length; j++ ) {
                if ( times[j] in pathsByTime ) {
                    for ( var k = 0; k < pathsByTime[times[j]].length; k++ ) {
                        var path = pathsByTime[times[j]][k];
                        if ( pathsEqual(path, paths[i].hops) )
                            continue next_path;
                    }
                    pathsByTime[times[j]].push(paths[i].hops);
                } else {
                    pathsByTime[times[j]] = [ paths[i].hops ];
                }

                if ( pathsByTime[times[j]].length > maxNumPaths )
                    maxNumPaths = pathsByTime[times[j]].length;
            }
        }

        var yScale = options.height / maxNumPaths;

        for ( var time in pathsByTime ) {
            if ( pathsByTime.hasOwnProperty(time) ) {
                var x = xScale(time * 1000);
                for ( var i = 0; i < pathsByTime[time].length; i++ ) {
                    var y = i * yScale;
                    context.fillStyle = "#000";
                    context.beginPath();
                    context.arc(x, y, 2, 0, 2*Math.PI);
                    context.closePath();
                    context.fill();
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
            mouseX = mouse.relX,
            mouseY = mouse.relY,
            threshold = 5;

        function sqr(x) { return x * x }
        function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
        function distToSegment(p, v, w) {
            function distToSegmentSquared(p, v, w) {
                var l2 = dist2(v, w);
                if (l2 == 0) return dist2(p, v);
                var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
                if (t < 0) return dist2(p, v);
                if (t > 1) return dist2(p, w);
                return dist2(p, { x: v.x + t * (w.x - v.x),
                                  y: v.y + t * (w.y - v.y) });
            }

            return Math.sqrt(distToSegmentSquared(p, v, w));
        }

        for ( var host in this.hostHitContainers ) {
            if ( this.hostHitContainers.hasOwnProperty(host) ) {
                for ( var i = 0; i < this.hostHitContainers[host].length; i++ ) {
                    var hc  = this.hostHitContainers[host][i],
                        x   = hc[0],
                        y   = hc[1];

                    if ( mouseX > x - threshold && mouseX < x + threshold
                            && mouseY < y + threshold && mouseY > y - threshold ) {
                        n.x = x;
                        n.y = y;
                        n.index = -1;
                        n.host = host;
                        // seriesIndex has to be zero
                        n.seriesIndex = 0;
                        return;
                    }
                }
            }
        }

        for ( var path in this.pathHitContainers ) {
            if ( this.pathHitContainers.hasOwnProperty(path) ) {
                for ( var i = 0; i < this.pathHitContainers[path].unique.length; i++ ) {
                    var hc = this.pathHitContainers[path].unique[i],
                        x0 = hc[0][0],
                        y0 = hc[0][1],
                        x1 = hc[1][0],
                        y1 = hc[1][1];

                    var distance = distToSegment(
                        { "x": mouseX, "y": mouseY },
                        { "x": x0, "y": y0 },
                        { "x": x1, "y": y1 }
                    );

                    if ( distance < threshold ) {
                        n.x = mouseX;
                        n.y = mouseY;
                        n.index = path;
                        n.path = this.pathHitContainers[path];
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
            args = options.args,
            paths = options.paths;

        if ( options.args.event )
            return;

        context.save();

        if ( args.host ) {
            if ( args.host in this.hostHitContainers ) {
                var hostPoints = this.hostHitContainers[args.host];
                for ( var i = 0; i < hostPoints.length; i++ ) {
                    this.plotHopPoint(context, args.host, hostPoints[i][0],
                            hostPoints[i][1], true);
                }
            }
        } else if ( args.index >= 0 ) {
            /* Let's try and draw a path in reverse, shall we? */
            var path = this.pathHitContainers[args.index],
                node = path.node,
                child = null;

            context.lineWidth = 3;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 1;
            context.shadowBlur = 1;
            context.shadowColor = "rgba(0, 0, 0, 0.2)";

            /* Sort by each path's hop count in descending order. This is done only
             * to be able to obtain the length of the longest path. */
            paths.sort(function(a,b) {
                if (a.hops.length == b.hops.length) return 0;
                return b.hops.length - a.hops.length;
            });

            var padding = 10,
                width = paths[0].hops.length - 1,
                height = paths.length - 1,
                canvasWidth = options.width - padding,
                canvasHeight = options.height - padding,
                plotOffset = padding / 2,
                xScale = canvasWidth / width,
                yScale = height > 0 ? canvasHeight / height : 0;

            while ( true ) {
                var diff = [ 0, node.hops.length ];
                if ( "difference" in node ) {
                    diff = node.difference;
                }

                var childDiff = null;
                if ( child != null )
                    childDiff = child.difference;

                var yScaled = node.y * yScale + plotOffset;

                var maxLen = diff[1] != null ? diff[1] : node.hops.length;
                for ( var i = diff[0]; i < maxLen; i++ ) {                
                    if ( i + 1 < maxLen ) {
                        if ( childDiff == null ||
                                ((childDiff[0] != null && i + 1 < childDiff[0])
                                || (childDiff[1] != null && i + 1 > childDiff[1])) ) {
                            var x0 = i * xScale + plotOffset,
                                x1 = (i+1) * xScale + plotOffset;

                            context.beginPath();
                            context.moveTo(x0, yScaled);
                            context.lineTo(x1, yScaled);
                            context.closePath();
                            context.stroke();
                        }
                    }
                }

                if ( "parent" in node ) {
                    // draw deviation
                    var x0 = (diff[0]-1) * xScale + plotOffset,
                        x1 = diff[0] * xScale + plotOffset,
                        yScaledRoot = node.parent.y * yScale + plotOffset;

                    context.beginPath();
                    context.moveTo(x0, yScaledRoot);
                    context.lineTo(x1, yScaled);
                    context.closePath();
                    context.stroke();

                    if ( diff[1] != null ) {
                        // draw join
                        x0 = (diff[1]-1) * xScale + plotOffset,
                        x1 = (diff[1]) * xScale + plotOffset;

                        context.beginPath();
                        context.moveTo(x0, yScaled);
                        context.lineTo(x1, yScaledRoot);
                        context.closePath();
                        context.stroke();
                    }

                    child = node;
                    node = node.parent;
                } else {
                    break;
                }
            }

            node = path.node;
            child = null;

            while ( true ) {
                var diff = [ 0, node.hops.length ];
                if ( "difference" in node ) {
                    diff = node.difference;
                }

                var childDiff = null;
                if ( child != null )
                    childDiff = child.difference;

                var maxLen = diff[1] != null ? diff[1] : node.hops.length;
                for ( var i = diff[0]; i < maxLen; i++ ) {
                    if ( childDiff == null ||
                            ((childDiff[0] != null && i < childDiff[0])
                            || (childDiff[1] != null && i+1 > childDiff[1])) ) {

                        var host = node.hops[i][0],
                            xScaled = i * xScale + plotOffset,
                            yScaled = node.y * yScale + plotOffset;
                        
                        this.plotHopPoint(context, host, xScaled, yScaled, true);
                    }
                }

                if ( "parent" in node ) {
                    child = node;
                    node = node.parent;
                } else {
                    break;
                }
            }
        }

        context.restore();
    },

    /**
     * Removes the highlights drawn by drawHit(). Clearing the entire overlay
     * canvas is sufficient to accomplish this and avoids a potentially huge
     * amount of unnecessary processing.
     */
    clearHit: function (options) {
        var context = options.context;

        if ( options.args.event )
            return;

        context.save();
        context.clearRect(0, 0, options.width, options.height);
        context.restore();
    }

});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
