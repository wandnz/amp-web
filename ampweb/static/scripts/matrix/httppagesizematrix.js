function HttpPageSizeMatrix() {

    BaseMatrix.call(this);
    this.collection = "amp-httppagesize";
    this.defaultmetric = "pagesize";
    this.statecookieid = "ampwebMatrixHttpPageSizeState";
    this.displayname = "HTTP Page Size";
    this.legendtitle = "Page Size";
    this.legendlabels = [
        'Page Size < 100 KB',
        'Page Size 100 to 250 KB',
        'Page Size 250 to 500 KB',
        'Page Size 500 to 750 KB',
        'Page Size 750 to 1000 KB',
        'Page Size 1000 to 2000 KB',
        'Page Size >= 2000 KB',
    ];

    this.metricData = [
        { 'text': 'Page Size', 'value': 'pagesize' }
    ];

    this.splitData = [ 
        { 'text': 'System Preference', 'value': 'combined', 
                'shortlabel': 'No matter'}
    ];

    //this.members = ['httppagesize'];

}

HttpPageSizeMatrix.prototype = new BaseMatrix();
HttpPageSizeMatrix.prototype.constructor = HttpPageSizeMatrix;

HttpPageSizeMatrix.prototype.getDisplayName = function(name) {

    if (name.search("http://") == 0 || name.search("https://") == 0) {
        return name.replace(/^(https?:\/\/)([^\/]+).*$/, '$2');
    }
    return BaseMatrix.prototype.getDisplayName.call(this, name);

}

HttpPageSizeMatrix.prototype.deconstructURL = function() {

    var segments = getURI().segment();
    var index = segments.indexOf("matrix");

    for (var i = segments.length; i <= 5; i++) {
        segments.push(null);
    }

    return {
        'prefix': (index == 0 ? "" : segments.slice(0, index).join("/") + "/"),
        'test': (segments[index + 1] || 'httppagesize'),
        'split': (segments[index + 2] || 'combined'),
        'source': (segments[index + 3] || undefined),
        'destination': (segments[index + 4] || undefined),
        'metric': (segments[index + 5] || 'pagesize'),
    };


}

HttpPageSizeMatrix.prototype.constructURL = function(params, current, base) {

    var url = base;
    var laststate = this.loadTabState();
    
    if (current.split != 'combined') {
        if (laststate.split) 
            current.split = laststate.split;
        else
            current.split = 'combined';
    }

    if (current.metric != 'pagesize') {
        if (laststate.metric)
            current.metric = laststate.metric
        else
            current.metric = "pagesize";
    }
   
    url += (params.test || current.test) + '/';
    url += (params.split || current.split) + '/';
    url += (params.source || current.source) + '/';
    url += (params.destination || current.destination) + '/';
    url += (params.metric || current.metric) + '/';


    return url;


}

HttpPageSizeMatrix.prototype.isValidURL = function() {
    var parts = this.deconstructURL();

    if (parts.length != 5)
        return false;

    if (parts[0] != 'httpsize')
        return false;

    if (parts[1] != 'combined')
        return false;

    if (parts[4] != 'pagesize')
        return false;

    return true;
}

HttpPageSizeMatrix.prototype.colourCell = function(cellData, params, src, dest) {
    var size = cellData['ipv4'][1];

    if (size == undefined) {
        return ['test-none'];
    }

    if (size < 0)
        return ['test-error'];

    return [getCellColour(size, [
            size < 100, size < 250, size < 500,
            size < 750, size < 1000, size < 2000
            ])];

}

HttpPageSizeMatrix.prototype.getSparklineColour = function(series) {
    return "green";
}

HttpPageSizeMatrix.prototype.formatTooltipStats = function(stats, content) {
    var thead = "";
    var tbody = "";
    var table = $('<table/>').appendTo(content);

    thead = $('<thead/>').appendTo(table).append(
        '<tr><th>Time period</th>' + '<th class="firsthalf">Page Size</th>');

    tbody = $('<tbody/>').appendTo(table);

    for ( var i = 0; i < stats.length; i++ ) { 
        var values = stats[i].value.split('/');

        $('<tr/>').appendTo(tbody)
            .append('<td>' + stats[i].label + '</td>')
            .append('<td>' + values[0] + '</td>');

    }

    return table;



}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

