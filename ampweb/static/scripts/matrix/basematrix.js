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

function BaseMatrix() {

    this.graphstyle = "amp-latency";
    this.defaultsplit = 'ipv4';
    this.defaultmetric = 'icmp';
    this.statecookieid = 'ampwebMatrixBaseState';
    this.displayName = "";

    this.metricData = [];
    this.splitData = [];

    this.ajaxTableUpdate = undefined;
    this.ajaxAxisUpdate = undefined;
    this.ajaxPopover = undefined;

    this._populateDropdown = function(name, basecontents, type, current) {
        var p = this;

        $(name).empty();

        if (basecontents.length == 0) {
            $(name).hide();
            return;
        }

        var oldstate = this.loadTabState();
        var contents = [];
        var selectedset = false;

        $.each(basecontents, function(index, option) {
            var nextopt = {
                'id': option.value,
                'text': option.text
            };

            if (current == option.value) {
                nextopt.selected = true;
                selectedset = true;
            } else
            if (!selectedset && oldstate && option.value == oldstate[type]) {
                nextopt.selected = true;
                selectedset = true;
            } else {
                nextopt.selected = false;
            }
            contents.push(nextopt);
        });

        if (!selectedset) {
            contents[0].selected = true;
        }

        prettifySelect($(name), {data: contents, width: '100%'});
        $(name).on("select2:select", function(evt) {
            selected = evt.params.data;
            params = p.deconstructURL();
            if (selected.id != params[type]) {
                var changes = {}
                changes[type] = selected.id;
                updatePageURL(changes);
            }
        });
        $(name).show();
    }
}

BaseMatrix.prototype.isValidURL = function() {
    return false;
}

BaseMatrix.prototype.saveTabState = function() {

    var params = this.deconstructURL();
    var cookieid = this.statecookieid;

    if (cookieid) {
        $.cookie(cookieid, JSON.stringify(params), {
            'expires': 365,
            'path': '/'
        });
    }
}

BaseMatrix.prototype.loadTabState = function() {
    var cookie = $.cookie(this.statecookieid);

    if (!cookie) {
        return {};
    }

    return JSON.parse(cookie);
}


BaseMatrix.prototype.deconstructURL = function() {
    var segments = getURI().segment();
    var index = segments.indexOf("matrix");

    for (var i = segments.length; i <= 7; i++) {
        segments.push(null);
    }

    return {
        'prefix': (index == 0 ? "" : segments.slice(0, index).join("/") + "/"),
        'test': (segments[index + 1] || 'latency'),
        'split': (segments[index + 2] || this.defaultsplit),
        'source': (segments[index + 3] || undefined),
        'destination': (segments[index + 4] || undefined),
        'metric': (segments[index + 5] || this.defaultmetric),
        'absrel': (segments[index + 6] || 'absolute'),
    };
}

BaseMatrix.prototype.constructURL = function(params, current, base) {
    var url = base;
    var laststate = this.loadTabState();

    url += (params.test || current.test) + '/';

    /* splits are not common across all matrix types so convert back to
     * 'both' if this is not a split we support */
    if (current.split != 'ipv4' && current.split != 'ipv6' &&
            current.split != 'both') {
        if (laststate.split)
            current.split = laststate.split;
        else
            current.split = "both";
    }

    if (current.metric != 'icmp' && current.metric != 'tcp' &&
            current.metric != 'dns') {
        if (laststate.metric)
            current.metric = laststate.metric;
        else
            current.metric = 'icmp';
    }

    url += (params.split || current.split) + "/";
    /* don't save a url in the cookie with broken, undefined source mesh */
    if ( params.source == undefined && current.source == undefined ) {
        return url;
    }
    url += (params.source || current.source) + '/';
    /* don't save a url in the cookie with broken, undefined destination mesh */
    if ( params.destination == undefined && current.destination == undefined ) {
        return url;
    }
    url += (params.destination || current.destination) + '/';
    url += (params.metric || current.metric) + '/';
    url += (params.absrel || current.absrel) + '/';

    return url;
}

BaseMatrix.prototype.fetchTableData = function() {
    var p = this;

    this.abortTableFetch();
    this.startLoading();

    this.ajaxTableUpdate = $.ajax({
        url : API_URL + "/_matrix",
        cache: false,
        dataType: 'json',
        data: this.getMatrixParameters(),
        success: function(data) {
            p.populateTable(data);
            p.initPopovers();
            p.stopLoading();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            var message = errorThrown;
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }

            if (textStatus == "error") {
                parsed = jQuery.parseJSON(jqXHR.responseText);
                if ("error" in parsed)
                    message = parsed['error'];
            }

            displayAjaxAlert("Failed to fetch matrix data",
                    textStatus, message);
        }
    });
    p.makeLegend();

}

BaseMatrix.prototype.colourCell = function(cellData, params, src, dest) {

    return ['test-error', 'test-error'];

}

BaseMatrix.prototype.graphLinkRequired = function(splitmethod, cellData) {

    if (splitmethod == this.splitData[0].value) {
        for (var prop in cellData) {
            if (cellData.hasOwnProperty(prop) && prop != 'view') {
                if (cellData[prop] != -1)
                    return true;
            }

        }
        return false;
    }

    if (cellData[splitmethod] != -1)
        return true;

    return false;

}

BaseMatrix.prototype.populateTable = function(data) {

    var thead = $('#amp-matrix thead');
    var tbody = $('#amp-matrix tbody');

    var params = this.deconstructURL();

    for ( var rowIndex = 0; rowIndex < data.length; rowIndex++ ) {
        var row = $('tr:eq(' + rowIndex + ')', tbody),
            src = data[rowIndex][0];

        for (var colIndex = 1; colIndex < data[rowIndex].length; colIndex++) {
            var cellData = data[rowIndex][colIndex],
                cell = $('td:eq(' + colIndex + ')', row),
                dstCell = $('th:eq(' + colIndex + ')', thead);

            /* Get the view ID for both IPv4 and IPv6 data */
            var viewID = cellData.view;
            var dest = dstCell.data('destination');
            cell.attr('id', viewID + "__" + src + "__" + dest);

            /* If there is no view ID, this src-dest pair has never been
             * tested to.
             */
            if ( viewID < 0 ) {
                cell.empty().attr('class', 'cell test-none');
                continue;
            }

            /* Only add a link to the view graph if there is some useful
             * data to show.
             */
            if (this.graphLinkRequired(params.split, cellData)) {
                var cellurl = GRAPH_URL + this.getGraphStyle(params) + "/" + viewID;
                cell.html($('<a/>').attr('href', cellurl));
            }

            var cellcolours = this.colourCell(cellData, params, src, dest);

            /* Assume just a max of two cell colours for now */
            if (cellcolours.length == 1 || cellcolours[0] == cellcolours[1]) {
                /* Colour the whole cell with one colour */
                cell.attr('class', 'cell ' + cellcolours[0]);
                continue;
            }

            var firsthalf = cell;
            firsthalf = $('<span/>').addClass('firsthalf');
            $('a', cell).append(firsthalf);
            firsthalf.addClass(cellcolours[0]);

            var secondhalf = cell;
            secondhalf = $('<span/>').addClass('secondhalf');
            $('a', cell).append(secondhalf);
            secondhalf.addClass(cellcolours[1]);

            cell.removeClass('test-none');
        }
    }

}

BaseMatrix.prototype.getGraphStyle = function(params) {
    return this.graphstyle;
}

BaseMatrix.prototype.getMatrixParameters = function() {
    params = this.deconstructURL();

    return {
        testType: params.test,
        source: params.source,
        destination: params.destination,
        metric: params.metric,
        split: params.split,
        absrel: params.absrel
    }
}

BaseMatrix.prototype.populateMetricDropdown = function(current) {
    this._populateDropdown('#metricDropdown', this.metricData, 'metric',
            current);
}

BaseMatrix.prototype.populateSplitDropdown = function(current) {
    this._populateDropdown('#splitDropdown', this.splitData, 'split', current);
}

BaseMatrix.prototype.showMatrix = function() {
    var p = this;
    this.abortTableFetch();
    this.startLoading();

    params = this.deconstructURL();

    if (!params['source'] || !params['destination'])
        return;

    /* Make table axis */
    this.ajaxAxisUpdate = $.ajax({
        url: API_URL + '/_matrix_axis',
        cache: true,
        dataType: 'json',
        data: {
            srcMesh: params['source'],
            dstMesh: params['destination'],
        },
        success: function(data) {
            p.makeTable(data);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }
            displayAjaxAlert("Failed to fetch matrix axes",
                textStatus, errorThrown);
        }
    });

    /* Set page title */
    setPageTitle("AMP " + this.displayname + " Measurements");

}

BaseMatrix.prototype.makeTable = function(axisdata) {
    var thead = $('#amp-matrix thead');
    var tbody = $('#amp-matrix tbody');

    /* Clean up any existing tooltips when we refresh the page.
     * This needs to be done because all of the table cells are replaced so
     * existing popover data is lost.
     * In future we should retain popover data and try to refresh any
     * popovers that are currently in the DOM (shown) */
    $('> tr > th', thead).popover('destroy');
    $('> tr > td', tbody).popover('destroy');

    thead.empty();
    tbody.empty();

    var thead_tr = $("<tr/>").appendTo(thead).append("<th/>");

    var maxTextWidth = 0;
    for ( var i = 0; i < axisdata.dst.length; i++ ) {
        var dst = axisdata.dst[i],
            dstName = this.getDisplayName(axisdata.dst[i]);
        var th = $('<th/>')
                .appendTo(thead_tr)
                .attr('id', "dst__" + dst)
                .data('destination', dst)
                .append('<p><span>' + dstName + '</span></p>');
        maxTextWidth = Math.max(maxTextWidth, $('p span', th).textWidth());
    }

    /* Make the height of the thead element equal to the height of the
     * largest bounding box out of all the rotated text elements. The text
     * width multiplied by sin PI/4 gives an approximation of the text's
     * bounding box.
     */
    thead_tr.css('height', '' + (maxTextWidth * Math.sin(Math.PI/4)) +
            'px');

    /* Hack for IE8 and below who don't support CSS transforms */
    $('.lt-ie9 table#amp-matrix tr:first-child th p')
            .css('width', '' + maxTextWidth + 'px');

    for ( var i = 0; i < axisdata.src.length; i++ ) {
        var src = axisdata.src[i];
        var srcName = this.getDisplayName(axisdata.src[i]);

        var tbody_tr = $('<tr/>').appendTo(tbody);
        var th = $('<td>' + srcName + '</td>')
                .appendTo(tbody_tr)
                .attr('id', "src__" + src)
                .data('source', src);
        for (var x = 0; x < axisdata.dst.length; x++) {
            tbody_tr.append('<td class="cell test-none"></td>');
        }
    }
    this.fetchTableData();
}

BaseMatrix.prototype.makeLegend = function() {

    var params = this.deconstructURL()
    $('#colour-key > table, #colour-key > hr').remove();

    var table = $('<table/>').appendTo('#colour-key');

    function _addLegendRow(testClass, label) {
        var tr = $('<tr/>').appendTo(table);
        $('<td/>').appendTo(tr).text(label);
        $('<td class="cell" />').appendTo(tr).addClass(testClass);
        return tr;
    }

    if (this.splitData.length == 3) {
        var tr = _addLegendRow('', this.splitData[1]['shortlabel']);
        $('<b><span class="firsthalf test-colour1" /></b>').appendTo($('td.cell', tr));
        var tr = _addLegendRow('', this.splitData[2]['shortlabel']);
        $('<b><span class="secondhalf test-colour1" /></b>').appendTo($('td.cell', tr));
    }

    $('<hr/>').appendTo('#colour-key');
    table = $('<table/>').appendTo('#colour-key');
    $('<tr><th colspan="2">'+this.getLegendTitle(params)+'</th></tr>').appendTo(table);

    /* We'll always have these */
    _addLegendRow('test-none', 'Not tested');
    _addLegendRow('test-error', 'Missing data');

    var legenditems = this.getLegendItems(params);
    for ( var i = 0; i < legenditems.length; i++) {
        _addLegendRow(legenditems[i].colour, legenditems[i].label);
    }

}

BaseMatrix.prototype.getLegendItems = function(params) {

    return [];
}


BaseMatrix.prototype.getLegendTitle = function(params) {

    return "Legend";
}



BaseMatrix.prototype.getDisplayName = function(name) {
    if (name.search("ampz-") == 0) {
        return name.slice(5);
    }

    if (name.search("www.") != 0) {
        return name.replace(".amp.wand.net.nz", "");
    }

    return name;
}

BaseMatrix.prototype.initPopovers = function() {
    var thead = $('#amp-matrix thead');
    var rows = $('#amp-matrix > tbody > tr, #amp-matrix > thead > tr');
    var p = this;

    rows.each(function() {
        var cells = $('td, th', this);
        cells.each(function(index) {

            if ( !$(this).is(':parent') )
                return;

            /* Unbind left over event handlers */
            $(this).off('mouseenter').off('mouseleave')

            /* Bind new mouseenter event handler */
            .mouseenter(function() {
                $(this).parent().find('td:eq(0)').addClass('hover');
                $('th:eq(' + index + ')', thead).addClass('hover');
                $(this).addClass('hover');

                var position = $('p', this).length > 0 ? "bottom" : "right";

                var popover = $(this).data('bs.popover');

                if ( !popover ) {
                    $(this).popover({
                        trigger: "manual",
                        placement: "auto " + position,
                        content: "<div>Loading...</div>",
                        html: true,
                        container: "body"
                    });

                    popover = $(this).data('bs.popover');
                }

                p.loadPopoverContent(this.id, popover);

                $(this).popover('show');
            })

            /* Bind new mouseleave event handler */
            .mouseleave(function() {
                $(this).parent().find('td:eq(0)').removeClass('hover');
                $('th:eq(' + index + ')', thead).removeClass('hover');
                $(this).removeClass('hover');

                p.abortPopoverUpdate();

                $(this).popover('hide');
            });

        });
    });
}

BaseMatrix.prototype.createTooltip = function(data, popover) {
    var tip = popover.tip();

    /* If the popover we want to insert data into is still visible */
    if ( popover && tip && tip.is(':visible') ) {
        var content = tip.find('.popover-content');

        if ( data.site == true ) {
            var div = $('<div/>');

            /* if it is a site, just return info about the site */
            var siteInfo = data.longname;
            if ( data.location )
                siteInfo += ' (' + data.location + ')';
            siteInfo += "<br>" + data.ampname;

            div.append('<p>' + siteInfo + '</p>');

            if ( data.description &&
                    data.longname.indexOf(data.description) == -1 )
                div.append('<p>' + data.description + '</p>');

            content.html(div);
        } else {
            content.empty();
            $('<h4/>').appendTo(content)
                    .html('<strong>' + data.source + '</strong>' +
                        '<br />to<br />' +
                        '<strong>' + data.destination + '</strong>');


            this.formatTooltipStats(data.stats, content);
            var dataPointsExist = this.isSparklineRequired(data.sparklineData);


            $('<h5/>').appendTo(content).html(
                dataPointsExist
                ? 'Last 24 hours'
                : '<em>No data available for the last 24 hours</em>'
            );

            if ( dataPointsExist ) {
                /* Draw the sparkline */
                var container = $('<div class="sparkline" />')
                        .appendTo(content);
                this.drawSparkline(container, data);
            }
        }

        /* Reposition the popover since its size has changed */
        this.repositionPopover(popover);
    }

}

BaseMatrix.prototype.repositionPopover = function(popover) {

    /* XXX This is ripped from the popover's "show" method in Bootstrap
     * - can we reduce its dependence on internal variables? */

    var placement = typeof popover.options.placement == 'function' ?
            popover.options.placement.call(popover, popover.$tip[0], popover.$element[0]) :
            popover.options.placement;

    var autoToken = /\s?auto?\s?/i;
    var autoPlace = autoToken.test(placement);
    if (autoPlace)
        placement = placement.replace(autoToken, '') || 'top';

    var pos          = popover.getPosition();
    var actualWidth  = popover.$tip[0].offsetWidth;
    var actualHeight = popover.$tip[0].offsetHeight;

    if (autoPlace) {
        var parent = popover.$element.parent();

        var orgPlacement = placement;
        var docScroll    = document.documentElement.scrollTop || document.body.scrollTop;
        var parentWidth  = popover.options.container == 'body' ? window.innerWidth  : parent.outerWidth();
        var parentHeight = popover.options.container == 'body' ? window.innerHeight : parent.outerHeight();
        var parentLeft   = popover.options.container == 'body' ? 0 : parent.offset().left;

        placement = placement == 'bottom' && pos.top   + pos.height  + actualHeight - docScroll > parentHeight  ? 'top'    :
                    placement == 'top'    && pos.top   - docScroll   - actualHeight < 0                         ? 'bottom' :
                    placement == 'right'  && pos.right + actualWidth > parentWidth                              ? 'left'   :
                    placement == 'left'   && pos.left  - actualWidth < parentLeft                               ? 'right'  :
                    placement

        popover.$tip.removeClass(orgPlacement).addClass(placement);
    }

    var calculatedOffset = popover.getCalculatedOffset(placement, pos, actualWidth, actualHeight);

    popover.applyPlacement(calculatedOffset, placement);

}

BaseMatrix.prototype.drawSparkline = function(container, data) {
    var maxX = Math.round((new Date()).getTime() / 1000);
    var minX = maxX - (60 * 60 * 24);

    var yrange = this.getSparklineYRange(data.sparklineDataMax);

    var template = {
        type: "line",
        //disableInteraction: true, /* if true, we can't do composite */
        disableTooltips: true,
        width: "300px",
        height: "60px",
        chartRangeMin: yrange[0],
        chartRangeMax: yrange[1],
        spotColor: false,
        minSpotColor: false,
        maxSpotColor: false,
        highlightSpotColor: false,
        highlightLineColor: false,
        chartRangeMinX: minX,
        chartRangeMaxX: maxX,
        fillColor: false
    };

    if ( !data.sparklineData ) {
        return;
    }

        /*
     * Draw all the sparklines onto the same div, composite must
     * be false for the first one and true for all others for this
     * to work.
     */
    var composite = false;
    for ( var series in data.sparklineData ) {
        if ( data.sparklineData.hasOwnProperty(series) ) {
            template['composite'] = composite;
            template['lineColor'] = this.getSparklineColour(series);
            composite = true;
            container.sparkline(data.sparklineData[series], template);
        }
    }
}

BaseMatrix.prototype.getSparklineYRange = function(sparkmax) {
    return [0, sparkmax];
}

BaseMatrix.prototype.getSparklineColour = function(series) {
    if (series.toLowerCase().lastIndexOf("ipv4") > 0)
        return "blue";
    return "red";
}

BaseMatrix.prototype.formatTooltipStats = function(stats, content) {

    /* Format tooltip assuming an IPv4, IPv6 split. Collections that do
     * something different can override this function. */
    var thead = "";
    var tbody = "";
    var table = $('<table/>').appendTo(content);

    thead = $('<thead/>').appendTo(table).append(
        '<tr><th>Time period</th>' + '<th class="firsthalf">IPv4</th>' +
        '<th class="secondhalf">IPv6</th></tr>');

    tbody = $('<tbody/>').appendTo(table);
    for ( var i = 0; i < stats.length; i++ ) {
        var values = stats[i].value.split('/');

        $('<tr/>').appendTo(tbody).append('<td>' + stats[i].label + '</td>')
                .append('<td>' + values[0] + '</td>')
                .append('<td>' + values[1] + '</td>');
    }

    return table;
}

BaseMatrix.prototype.isSparklineRequired = function (sparkdata) {
    if (!sparkdata)
        return false;

    for ( var sid in sparkdata ) {
        if ( sparkdata.hasOwnProperty(sid) ) {
            /* Great, we found a series - but let's check
             * to make sure we have data points we can
             * actually plot (check at least one point is
             * not null) */
            var series = sparkdata[sid];
            for ( var i = 0; i < series.length; i++ ) {
                if ( series[i].length > 1 && series[i][1] != null ) {
                    return true;
                }
            }
        }
    }
    return false;

}

BaseMatrix.prototype.loadPopoverContent = function(cellId, popover) {
    var p = this;
    var params = this.deconstructURL();

    this.abortPopoverUpdate();

    this.ajaxPopover = $.ajax({
        url: API_URL + '/_tooltip',
        /* Disabling caching is necessary here but not quite ideal; it would be
         * nice if we could force site descriptions to be cached */
        cache: false,
        dataType: 'json',
        data: {
            id: cellId,
            test: params.test,
            metric: params.metric,
        },
        success: function(data) {
            p.createTooltip(data, popover)
        },
        error: function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }
            var tip = popover.tip();
            if ( popover && tip && tip.is(':visible') ) {
                var errorstr = buildAjaxErrorString(
                    "Failed to fetch tooltip data",
                    textStatus,
                    errorThrown
                );
                tip.find('.popover-content')
                        .html('<div>' + errorstr + '</div>');
                p.repositionPopover(popover);
            }
        }
    });


}

BaseMatrix.prototype.abortTableFetch = function() {
    if (this.ajaxAxisUpdate && this.ajaxAxisUpdate != 4)
        this.ajaxAxisUpdate.abort();

    if (this.ajaxTableUpdate && this.ajaxTableUpdate != 4)
        this.ajaxTableUpdate.abort();
}

BaseMatrix.prototype.abortPopoverUpdate = function() {
    if (this.ajaxPopover && this.ajaxPopover != 4)
        this.ajaxPopover.abort();
}

BaseMatrix.prototype.startLoading = function() {
    $('#loading').css('visibility', 'visible');
}

BaseMatrix.prototype.stopLoading = function() {
    $('#loading').css('visibility', 'hidden');
}


/**
 * Calculate width of text from DOM element or string.
 * By Phil Freo <http://philfreo.com>
 *
 * Used to measure the width of the text in a table header so that we can take
 * an educated guess at the width of its bounding box after we've rotated it
 */
$.fn.textWidth = function() {
    if (!$.fn.textWidth.fakeEl) {
        // XXX we should not have to re-apply styles here in the JS
        $.fn.textWidth.fakeEl = $('<span>').hide()
                .css('font-size', '10.5px').css('font-weight', 'bold')
                .appendTo(document.body);
    }
    $.fn.textWidth.fakeEl.text(this.text());
    return $.fn.textWidth.fakeEl.width();
};

/* General function for determining cell colour based on which one of a series
 * of conditions is met. Most collections should use this to colour cells
 * using the standard green - red (good - bad) scale.
 */
function getCellColour(val, conditions) {
    /* Most collections should handle these cases already, but just in case */
    if (val == 'X')
        return 'test-none';
    if (val < 0)
        return 'test-error';

    for ( var i = 0; i < conditions.length; i++ ) {
        if (conditions[i])
            return 'test-colour' + (i + 1);
    }

    return 'test-colour7';
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
