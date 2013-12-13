/*
 * Traceroute Map graph type (less of a graph and more of a visualisation)
 */
Flotr.addType('tracemap', {
    options: {
        show: false,
        padding: 10
    },

    hostCount: 0,
    legend: {},

    drawnEdges: {},

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

        var ipv6 = host.indexOf(":") > -1 ? 0 : 180;

        var h = (this.legend[host] * 111.246117975) % 180 + ipv6,
            s = host == "0.0.0.0" || host == "::" || host == "Error" ? 0 : 90,
            l = stroke ? 25 : (host == "Error" ? 30 : 60),
            a = shadow ? 0.5 : 1.0;

        return "hsla("+h+", "+s+"%, "+l+"%, "+a+")";
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
     * Plot the traceroute map based on the Dagre layout. This is actually
     * very easy :)
     */
    plotGraph: function (options) {
        var graph = this,
            context = options.context,
            digraph = TracerouteMap.prototype.digraph,
            sources = options.sources;

        if ( digraph === undefined || digraph._value.width == NaN )
            return;

        /* Initialise global variables */
        this.plotOffset = options.padding / 2;
        var canvasWidth = options.width - options.padding,
            canvasHeight = options.height - options.padding;
        this.xScale = canvasWidth / digraph._value.width;
        this.yScale = canvasHeight / digraph._value.height;

        context.fillStyle = "#333";
        context.strokeStyle = "#666";
        context.lineWidth = 1;

        for ( var k in digraph._edges ) {
            var edge = digraph._edges[k],
                u = edge.u, v = edge.v;

            if ( !graph.drawnEdges[u] || !graph.drawnEdges[u][v] ) {
                var nodeA = digraph._nodes[u].value,
                    nodeB = digraph._nodes[v].value;

                graph.plotEdge(context, nodeA, nodeB);
            
                if ( !graph.drawnEdges[u] )
                    graph.drawnEdges[u] = { v: true };
                else
                    graph.drawnEdges[u][v] = true;
            }
        }

        for ( var k in digraph._nodes ) {
            var node = digraph._nodes[k];
            graph.plotHost(context, node.id, node.value);
        }

    },

    plotHost: function(context, host, node, hover) {
        var x = node.x * this.xScale + this.plotOffset,
            y = node.y * this.yScale + this.plotOffset;

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

    plotEdge: function(context, nodeA, nodeB, hover) {
        var x0 = nodeA.x * this.xScale + this.plotOffset,
            x1 = nodeB.x * this.xScale + this.plotOffset,
            y0 = nodeA.y * this.yScale + this.plotOffset,
            y1 = nodeB.y * this.yScale + this.plotOffset;

        context.save();

        if ( hover ) {
            context.lineWidth = 3;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 2;
            context.shadowBlur = 1;
            context.shadowColor = "rgba(0, 0, 0, 0.2)";
        }

        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.closePath();
        context.stroke();

        context.restore();
    },

    /**
     * Plot a line graph to give an idea of where activity occurs along the
     * timeline. Graphs the number of unique paths with respect to time.
     * In brief:
     * - Reorganise paths to be indexed by time
     * - Bin times together that are within a threshold distance
     * - Filter unique paths
     * - Find the max Y value
     * - Plot line graph
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
                if ( path1[hop] != path2[hop] ) {
                    return false;
                }
            }

            return true;
        }

        /* Organise data:
         * Bin times together that are within 'threshold' distance from each
         * other and filter unique paths */
        var pathsByTime = {},
            threshold = 10000;
        next_path:
        for ( var i = 0; i < paths.length; i++ ) {
            var times = getUniqueArray(paths[i].times);
            for ( var j = 0 ; j < times.length; j++ ) {
                var bin_ts = times[j] - (times[j] % threshold);
                if ( pathsByTime.hasOwnProperty(bin_ts) ) {
                    for ( var k = 0; k < pathsByTime[bin_ts].length; k++ ) {
                        var path = pathsByTime[bin_ts][k];
                        if ( pathsEqual(path, paths[i].hops) ) {
                            continue next_path;
                        }
                    }
                    pathsByTime[bin_ts].push(paths[i].hops);
                } else {
                    pathsByTime[bin_ts] = [ paths[i].hops ];
                }
            }
        }

        /* Turn the pathsByTime object into an array and in doing so, find the
         * maximum number of paths at any given time (determines the height of
         * the Y axis) */
        var pathsByTimeArr = [],
            maxNumPaths = 0;
        for ( var key in pathsByTime ) {
            if ( pathsByTime.hasOwnProperty(key) ) {
                pathsByTimeArr.push({"time": key, "paths": pathsByTime[key]});
                if ( pathsByTime[key].length > maxNumPaths )
                    maxNumPaths = pathsByTime[key].length;
            }
        }

        /* Sort the array in order of ascending times (the order in which we
         * draw lines) */
        pathsByTimeArr.sort(function(a,b) {
            return a.time - b.time;
        });

        /* Draw the line graph */

        context.fillStyle = "rgba(100, 0, 255, 0.2)";
        context.strokeStyle = "rgba(100, 0, 200, 1.0)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, options.height);

        var yScale = options.height / maxNumPaths,
            prevX = 0,
            prevY = options.height;
        for ( var i = 0; i < pathsByTimeArr.length; i++ ) {
            var x = xScale(pathsByTimeArr[i].time * 1000),
                y = options.height - pathsByTimeArr[i].paths.length * yScale;
            
            // if the last point was > 10 pixels away, break the path
            if ( x - prevX > 10) {
                context.lineTo(prevX+1, options.height);
                context.closePath();
                context.stroke();
                context.fill();
                context.beginPath();
                context.moveTo(x-1, options.height);
            }

            context.lineTo(x, y);

            prevX = x, prevY = y;
        }

        context.lineTo(prevX+1, options.height);
        context.closePath();
        context.stroke();
        context.fill();
    },

    /**
     * Determines whether the mouse is currently hovering over
     * (hitting) a part of the graph we want to highlight and
     * if so, sets the values of n accordingly (which are carried
     * through to drawHit() in args)
     */
    hit: function (options) {
        var graph = this,
            args = options.args,
            digraph = TracerouteMap.prototype.digraph,
            paths = options.paths,
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

        /* Looping through the internal lists of edges and nodes for better
         * performance and the ability to break early */

        for ( var k in digraph._nodes) {
            var node = digraph._nodes[k];
            var x = node.value.x * graph.xScale + graph.plotOffset,
                y = node.value.y * graph.yScale + graph.plotOffset;

            if ( mouseX > x - threshold && mouseX < x + threshold
                    && mouseY < y + threshold && mouseY > y - threshold ) {
                n.x = x;
                n.y = y;
                n.index = node.id;
                n.host = node.id;
                n.path = undefined;
                // seriesIndex has to be zero
                n.seriesIndex = 0;
                return;
            }
        }

        for (var k in digraph._edges) {
            var edge = digraph._edges[k];
            var nodeA = digraph._nodes[edge.u].value,
                nodeB = digraph._nodes[edge.v].value;
            
            var x0 = nodeA.x * graph.xScale + graph.plotOffset,
                x1 = nodeB.x * graph.xScale + graph.plotOffset,
                y0 = nodeA.y * graph.yScale + graph.plotOffset,
                y1 = nodeB.y * graph.yScale + graph.plotOffset;

            var distance = distToSegment(
                { "x": mouseX, "y": mouseY },
                { "x": x0, "y": y0 },
                { "x": x1, "y": y1 }
            );

            if ( distance < threshold ) {
                n.x = mouseX;
                n.y = mouseY;
                n.index = edge.id;
                n.path = paths[ edge.value.path ];
                n.host = undefined;
                // seriesIndex has to be zero
                n.seriesIndex = 0;
                return;
            }
        }
    },

    /**
     * Receives the values of n from hit() in args, and highlights
     * the data that has been 'hit'.
     */
    drawHit: function (options) {
        var context = options.context,
            args = options.args,
            digraph = TracerouteMap.prototype.digraph,
            paths = options.paths;

        if ( options.args.event )
            return;

        context.save();

        if ( args.host ) {
            var node = digraph._nodes[args.host].value,
                x = node.x * this.xScale + this.plotOffset,
                y = node.y * this.yScale + this.plotOffset;
            this.plotHost(context, args.host, node, true);
        } else {
            var path = args.path;

            for ( var i = 0; i < path.edges.length; i++ ) {
                var edge = digraph._edges[path.edges[i]],
                    nodeA = digraph._nodes[edge.u].value,
                    nodeB = digraph._nodes[edge.v].value;
                
                this.plotEdge(context, nodeA, nodeB, true);
            }

            for ( var i = 0; i < path.edges.length; i++ ) {
                var edge = digraph._edges[path.edges[i]],
                    hostA = edge.u;
                this.plotHost(context, hostA, digraph._nodes[hostA].value, true);
                if ( i + 1 == path.edges.length ) {
                    var hostB = edge.v;
                    this.plotHost(context, hostB, digraph._nodes[hostB].value, true);
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
