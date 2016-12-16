/* Code that defines and manages the interactive aspects of the Cuz graphs,
 * such as zooming and panning.
 *
 */

/* In this context, 'basic' refers to an instance of BasicTimeSeriesGraph
 * (or a subclass thereof). See basicts.js for a full definition of this
 * class and its attributes and methods.
 */
function createEnvision(basic) {
    var connection = new envision.Component({
        name: "connection",
        adapterConstructor: envision.components.QuadraticDrawing
    });


    /* Callback for a mousedown event within the detail graph -- clicking
     * and dragging in this space will pan the detail graph view
     */
    function initDrag(e) {
        var comp = basic.detailcomponent;
        basic.detailgraph.dragstart = comp.api.flotr.getEventPosition(e);
        Flotr.EventAdapter.observe(comp.node, "mousemove", panSelection);

        /* Make sure we catch mouseup, regardless of where it happens (i.e.
         * not just within the graph */
        Flotr.EventAdapter.observe(document, "mouseup", stopDrag);
    }


    /* Callback for a mouseup event while the user has been drag-panning the
     * detail graph.
     */
    function stopDrag() {
        var comp = basic.detailcomponent;
        Flotr.EventAdapter.stopObserving(comp.node, "mousemove",
            panSelection);
    }


    /* Pans the detail graph view based on either a click-and-drag in the
     * detail graph or a mousewheel event in the summary graph.
     */
    function panSelection(e) {
        var delta;
        var last_data;
        var first_data;
        var detail = basic.detailcomponent;
        var drag_start = basic.detailgraph.dragstart;

        /* Don't pass this event on to the underlying container. This
         * prevents our mousewheel event from also scrolling the page. */
        e.preventDefault();

        if ( e.type == "mousemove" ) {
            /* Mousemove event, so we are click-dragging */
            var drag_end = detail.api.flotr.getEventPosition(e);
            delta = (drag_start.x - drag_end.x) / 1000.0;

        } else if ( e.type == "mousewheel" ||
                e.type == "DOMMouseScroll" ) {
            /*
             * Mousewheel event on the summary graph, scroll the graph by a
             * fraction of the time period currently displayed
             */
            var adjust = (basic.detailgraph.end - basic.detailgraph.start)
                    * 0.05;
            /*
             * FF has different ideas about how events work.
             * FF: .detail property, x > 0 scrolling down
             * Others: .wheelDelta property, x > 0 scrolling up
            */
            delta = e.originalEvent.detail ?
                ((e.originalEvent.detail < 0) ? -adjust:adjust) :
                ((e.originalEvent.wheelDelta) < 0) ? adjust:-adjust;
        }

        /* Find endpoints of summary data */
        last_data = basic.summarycomponent.api.flotr.axes.x.max / 1000.0;
        first_data = basic.summarycomponent.api.flotr.axes.x.min / 1000.0;

        /* TODO: don't clamp to the summary graph -- pan the summary graph
         * as well if we hit the edge (just don't go past now or the first
         * datapoint)
         */

        /* Make sure we don't go past the right hand edge */
        if ( basic.detailgraph.end + delta >= last_data ) {
            if ( basic.detailgraph.end >= last_data ) {
                return;
            }
            delta = last_data - basic.detailgraph.end;
        }

        /* Same again for the left hand edge */
        if ( basic.detailgraph.start + delta <= first_data) {
            if (basic.detailgraph.start <= first_data) {
                return;
            }
            delta = first_data - basic.detailgraph.start;
        }

        /* Update the current selection and redraw the detail graph */
        basic.triggerSelection(basic.detailgraph.start + delta,
                basic.detailgraph.end + delta);
    }


    /* Zooms the detail graph view based on a mousewheel event inside the
     * detail graph component.
     */
    function zoomDetail(e) {
        var delta;
        var adjust;
        var position;
        var range;
        var ratio;

        /* Don't pass this event on to the underlying container. This
         * prevents our mousewheel event from also scrolling the page. */
        e.preventDefault();

        /* Zoom in or out by 10% of the current view */
        adjust = 0.1;

        /* Calculate multiplier to apply to current range */
        delta = e.originalEvent.detail ?
            ((e.originalEvent.detail < 0) ? 1-adjust:1+adjust) :
            ((e.originalEvent.wheelDelta) < 0) ? 1+adjust:1-adjust;

        /*
         * Timestamp nearest to where the mouse pointer is. Ideally
         * I think this should use offsetX to be relative to the target
         * element, except that Firefox doesn't do that.
         */
        position = basic.detailcomponent.api.flotr.axes.x.p2d(
            e.originalEvent.offsetX || e.originalEvent.layerX);
        position = position / 1000.0;

        /* New range that should be displayed after zooming */
        range = (basic.detailgraph.end - basic.detailgraph.start) * delta;

        /* Ratio of the position within the range, to centre zoom */
        ratio = (position - basic.detailgraph.start) /
                    (basic.detailgraph.end - basic.detailgraph.start);

        /* Don't zoom in to less than a 30 minute range */
        if ( range <= (60 * 30) ) {
            return;
        }

        /*
         * Zoom in/out while trying to keep the same part of the graph
         * under the mouse pointer.
         */
        basic.triggerSelection(position - (range * ratio),
                position + (range * (1 - ratio)));

    }

    basic.vis = new envision.Visualization();
    basic.detailcomponent = new envision.Component(basic.detailgraph.options);
    basic.summarycomponent = new envision.Component(basic.summarygraph.options);

    /* This enables the callback function which will be triggered when a
     * selection was made on the summary graph.
     */
    basic.interaction = new envision.Interaction();
    basic.interaction
        .follower(basic.detailcomponent)
        .follower(connection)
        .leader(basic.summarycomponent)
        .add(envision.actions.selection,
        { callback:basic.selectionCallback,
          graphobj:basic });

    /* Render our components */
    basic.container.empty();
    basic.vis.add(basic.detailcomponent).add(connection)
        .add(basic.summarycomponent).render(basic.container);

    /* Enable our various mouse events on the graph components */
    Flotr.EventAdapter.observe(basic.detailcomponent.node, "mousedown",
            initDrag);
    Flotr.EventAdapter.observe(basic.detailcomponent.node, "mousewheel",
            zoomDetail);
    Flotr.EventAdapter.observe(basic.summarycomponent.node, "mousewheel",
            panSelection);

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
