/*
 * Traceroute Map graph type (less of a graph and more of a visualisation)
 */
var current_series = 0;
Flotr.addType('tracemap', {
    options: {
        show: false,
    },

    /**
     * Draws lines series in the canvas element.
     * @param {Object} options
     */
    draw : function (options) {

        var context = options.context;

        context.save();
        context.lineJoin = 'round';

        if (options.height > 150)
            this.plotGraph(options);
        else
            this.plotSummary(options);

        context.restore();
    },

    plotGraph : function (options) {
        var context = options.context,
            paths = options.paths;

        if ( paths === undefined || paths.length == 0 )
            return;

        // Perform a traversal of the tree to get the number of branches
        var traverse = function(root, node, func) {
            func(root, node);
            if ( "branches" in node ) {
                for ( var i = 0; i < node.branches.length; i++ ) {
                    traverse(node, node.branches[i], func);
                }
            }
        }

        context.fillStyle = "#000";
        context.strokeStyle = "#000";
        context.lineWidth = 1;

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

        paths.sort(function(a,b) {
            if (a.times.length == b.times.length) return 0;
            return b.times.length - a.times.length;
        });

        // Draw the tree
        var y = 0;
        traverse(null, paths[0], function(root, node) {
            node.y = y++;

            var diff = [ 0, node.hops.length ];
            if ( "difference" in node ) {
                diff = node.difference;
            }

            var maxLen = diff[1] != null ? diff[1] : node.hops.length;
            for ( var i = diff[0]; i < maxLen; i++ ) {
                var yScaled = node.y * yScale + plotOffset;
                context.beginPath();
                context.arc(i * xScale + plotOffset,
                       yScaled, 3, 0, 2*Math.PI);
                context.closePath();
                context.fill();
                context.fillText(node.hops[i][0], i * xScale + plotOffset, yScaled + 20);
                if ( i + 1 < maxLen ) {
                    context.moveTo(i * xScale + plotOffset, yScaled);
                    context.lineTo((i+1) * xScale + plotOffset, yScaled);
                    context.stroke();
                }
            }

            if ( root != null ) {
                var yScaledRoot = root.y * yScale + plotOffset;
                context.moveTo((diff[0]-1) * xScale + plotOffset, yScaledRoot);
                context.lineTo(diff[0] * xScale + plotOffset, yScaled);
                context.stroke();
                if ( diff[1] != null ) {
                    context.moveTo((diff[1]-1) * xScale + plotOffset, yScaled);
                    context.lineTo((diff[1]) * xScale + plotOffset, yScaledRoot);
                    context.stroke();
                }
            }
        });

    },

    plotSummary : function(options) {
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
    }

});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
