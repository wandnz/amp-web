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
        })

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
