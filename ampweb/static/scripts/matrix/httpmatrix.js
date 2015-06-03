function HttpMatrix() {

    BaseMatrix.call(this);
    this.collection = "amp-http";
    this.defaultmetric = "duration";
    this.statecookieid = "ampwebMatrixHttpState";
    this.displayname = "HTTP Page Fetch Time";
    this.legendtitle = "Page Fetch Time";
    this.legendlabels = [
        'Fetch Time 0.0 to 0.5 sec',
        'Fetch Time 0.5 to 1.0 sec',
        'Fetch Time 1.0 to 2.5 sec',
        'Fetch Time 2.5 to 5.0 sec',
        'Fetch Time 5.0 to 7.5 sec',
        'Fetch Time 7.5 to 10 sec',
        'Fetch Time > 10 sec',
    ];

    this.metricData = [
        { 'text': 'Duration', 'value': 'duration' }
    ];

    this.splitData = [ 
        { 'text': 'System Preference', 'value': 'combined', 
                'shortlabel': 'No matter'}
    ];

    this.members = ['http'];

}

HttpMatrix.prototype = new BaseMatrix();
HttpMatrix.prototype.constructor = HttpMatrix;

HttpMatrix.prototype.getDisplayName = function(name) {

    if (name.search("http://") == 0 || name.search("https://") == 0) {
        return name.replace(/^(https?:\/\/)([^\/]+).*$/, '$2');
    }
    return BaseMatrix.prototype.getDisplayName.call(this, name);

}

HttpMatrix.prototype.deconstructURL = function() {

    var segments = getURI().segment();

    for (var i = segments.length; i <= 5; i++) {
        segments.push(null);
    }

    return {
        'test': (segments[1] || 'http'),
        'split': (segments[2] || 'combined'),
        'source': (segments[3] || undefined),
        'destination': (segments[4] || undefined),
        'metric': (segments[5] || 'duration'),
    };


}

HttpMatrix.prototype.constructURL = function(params, current, base) {

    var url = base;
    var laststate = this.loadTabState();
    
    if (current.split != 'combined') {
        if (laststate.split) 
            current.split = laststate.split;
        else
            current.split = 'combined';
    }

    if (current.metric != 'duration') {
        if (laststate.metric)
            current.metric = laststate.metric
        else
            current.metric = "duration";
    }
   
    url += (params.test || current.test) + '/';
    url += (params.split || current.split) + '/';
    url += (params.source || current.source) + '/';
    url += (params.destination || current.destination) + '/';
    url += (params.metric || current.metric) + '/';


    return url;


}

HttpMatrix.prototype.isValidURL = function() {
    var parts = this.deconstructURL();

    if (parts.length != 5)
        return false;

    if (parts[0] != 'http')
        return false;

    if (parts[1] != 'combined')
        return false;

    if (parts[4] != 'duration')
        return false;

    return true;
}

HttpMatrix.prototype.colourCell = function(cellData, params, src, dest) {
    var duration = cellData['ipv4'][1];

    if (duration == undefined) {
        return ['test-none'];
    }

    if (duration < 0)
        return ['test-error'];

    return [getCellColour(duration, [
            duration < 0.5, duration < 1.0, duration < 2.5,
            duration < 5.0, duration < 7.5, duration < 10.0
            ])];

}

HttpMatrix.prototype.getSparklineColour = function(series) {
    return "blue";
}

HttpMatrix.prototype.formatTooltipStats = function(stats, content) {
    var thead = "";
    var tbody = "";
    var table = $('<table/>').appendTo(content);

    thead = $('<thead/>').appendTo(table).append(
        '<tr><th>Time period</th>' + '<th class="firsthalf">Fetch Time</th>');

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

