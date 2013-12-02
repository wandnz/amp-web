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

        if (options.height < 150)
            return;

        var context = options.context;

        context.save();
        context.lineJoin = 'round';

        this.plot(options);

        context.restore();
    },

    plot : function (options) {
        var context = options.context,
            paths = options.paths;

        if (paths === undefined || paths.length == 0)
            return;

        console.log(options);
        console.log("Let's draw this sucker");

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
            yScale = canvasHeight / height;

        paths.sort(function(a,b) {
            if (a.times.length == b.times.length) return 0;
            return b.times.length - a.times.length;
        });

        // Draw the tree
        var y = 0;
        traverse(null, paths[0], function(root, node) {
            console.log(y);
            node.y = y++;

            var diff = [ 0, node.hops.length ];
            if ( "difference" in node ) {
                diff = node.difference;
            }

            console.log(diff);

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

});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
