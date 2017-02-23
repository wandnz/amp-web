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

function CuzGraphPage() {

    this.streams = "";
    this.streamrequest = undefined;
    this.colname = "";
    this.graph = undefined;
    this.timemodal = new TimeModal();
    this.ratingmodal = new RatingModal();

    this.getCurrentSelection = function() {
        if (this.graph)
            return this.graph.getSelectionRange();

        return null;
    };

    this.changeView = function(newview, start, end) {
        if (newview != undefined)
            this.view = newview;

        // If start and end are set to null, try to use the current selection.
        if (start == null || end == null) {
            if (this.graph) {
                var times = this.graph.getSelectionRange();
                start = times.start;
                end = times.end;
            }
        }

        $("#graph").empty();

        /*
         * always display the button to add more data series, even if there
         * is no valid graph - this is how we can create a useful graph when
         * we have nothing.
         */
        var graphobj = this;
        this.displayAddStreamsButton();
        this.displayChangeTimeButton();

        $("#modal-foo").modal({
            'show': false,
            //'remote': MODAL_URL + "/" + this.graphstyle
        });

        $("#modal-foo").load(MODAL_URL + "/" + this.graphstyle);

        /* If stream is not set or is invalid, just bring up the modal
         * dialog for adding a new series */
        if (this.view == null || this.view == "" || this.view.length == 0) {
            $('#modal-foo').modal('show');

            var p = $('<p/>').appendTo($('#graph'));
            p.text('Add a data series to this graph using the button above.');

            /* Apparently we have to wait for the modal to be visible
             * before we can update it. Since the 'shown' event doesn't
             * trigger when we force the modal to load and display (and it
             * isn't a reliable indicator anyway), we'll replicate the
             * silly timeout from modal.js here.
             */
            setTimeout(function() {
                graphobj.modal.update();
                prettifySelect($("#modal-foo select"));
            }, 600);
        } else {
            $("#modal-foo").modal('hide');

            if (this.streamrequest)
                this.streamrequest.abort();

            var infourl = API_URL + "/_legend/" + graphobj.colname + "/" +
                this.view;
            var legenddata = {};

            this.streamrequest = $.ajax({
                url: infourl,
                success: function(data) {
                    $.each(data, function(index, result) {
                        legenddata[result.group_id] = result;
                    });
                    graphobj.populateTabs(legenddata);
                    graphobj.drawGraph(start, end, 0, legenddata);
                }
            });
        }
    };


    this.populateTabs = function(legenddata) {
        $('#graphtablist').children().remove();

        var tabs = this.getTabs();
        var nexttab = 0;
        var graphobj = this;

        if (tabs.length == 0)
            return;

        validquery = API_URL + "/_validatetab/" + graphobj.colname + "/";
        validquery += graphobj.view + "/";

        /* TODO don't put duplicate collections in the query to make
         * Brendon happy
         */
        $.each(tabs, function(index, tab) {
            /* Form a query to check which tabs are valid, i.e. will not
             * take us to an empty graph. */
            validquery += tab.graphstyle + "/";
        });

        $.ajax({
            url: validquery,
            success: function(data) {
                /* Add each valid tab to the graph */
                $.each(tabs, function(index, tab) {
                    if (data[index] == 0) {
                        return;
                    }

                    var li = $('<li/>');
                    li.attr('id', "graphtab" + nexttab);
                    li.click(function() {
                        /* Make sure we call changeTab here, not
                         * updatePageURL! changeTab makes an ajax call
                         * to work out the right view ID for the graph
                         * that we are going to, as the groups shown
                         * on the new graph may be slightly different to
                         * those on the original, e.g. packet sizes change
                         * between amp-icmp and amp-traceroute groups.
                         *
                         * It is not as simple as reusing the old view id
                         * with a new collection, unfortunately.
                         *
                         * changeTab handles all that for us to ensure we
                         * end up at a sensible graph.
                         */
                         changeTab({
                            base: graphobj.colname,
                            view: graphobj.view,
                            newcol: tab.graphstyle
                        });
                    });

                    if (tab.selected) {
                        li.addClass('selected');
                    }
                    li.text(tab.title);

                    /* XXX This isn't currently used for anything */
                    var minigraph = $('<span/>');
                    minigraph.attr('id', "minigraph" + nexttab);
                    li.prepend(minigraph);

                    $('#graphtablist').append(li);
                    nexttab++;
                });
            }
        });
    };


    this.updateTitle = function() {
        if (!this.streams || this.streams.length == 0) {
            setPageTitle(this.generictitle || "Graphs");
        } else {
            $.ajax({
                url: API_URL + "/_streaminfo/" + this.colname + "/" +
                        this.streams[0].id + "/",
                success: function(data) {
                    setPageTitle(data[0]["name"]);
                }
            });
        }
    };


    this.displayAddStreamsButton = function() {
        var node = $('#legend-container');
        node.empty();

        var add = $('<a data-toggle="modal" data-target="#modal-foo"/>');
        add.attr('href', MODAL_URL + "/" + this.graphstyle);
        add.addClass('btn btn-primary btn-xs');
        add.append('<span class="glyphicon glyphicon-plus"></span>' +
                'Add new data series');
        node.append(add);
    };

    this.displayDownloadRawButton = function() {
        var node = $('#legend-container');
        var times = this.graph.getSelectionRange();
        /* href linking to current data will be added later */
        var download = $('<a id="download-raw" />');

        download.addClass('btn btn-primary btn-xs');
        download.append('<span class="glyphicon glyphicon-download"></span>Download raw data');
        node.append(download);
    };

    this.displayChangeTimeButton = function() {
        var node = $('#legend-container');

        var add = $('<a id="timeselect" data-toggle="modal" data-target="#modal-timeselect"/>');
        add.attr('href', HOME_URL + 'changetime');
        add.addClass('btn btn-primary btn-xs');
        add.append('<span class="glyphicon glyphicon-time"></span>' +
                'Change time period');
        node.append(add);
    };

    this.updateDownloadRawButton = function(start, end) {
        var download = $('#download-raw');
        download.prop('href', API_URL + '/csv/' + this.graphstyle + '/' +
                this.view + '/' + start + '/' + end);
    };

    this.displayLegend = function(legend, graphstyle) {
        var node = $('#legend-container');

        this.displayAddStreamsButton();
        this.displayChangeTimeButton();
        this.displayDownloadRawButton();

        /* TODO put addresses in a tooltip with line colours? */
        /* TODO list all line colours in the main label for each dataset? */
        /* TODO make the data in legend much more generic so it works on all */
        var count = 1;
        var groups = [];
        var drawColours = false;

        /*
         * Neither the python that this came from or javascript can guarantee
         * any sort of order for objects/dicts, so grab the keys and sort them.
         */
        for (var group_id in legend) {
            if (legend.hasOwnProperty(group_id)) {
                groups.push(group_id);
            }
        }
        groups.sort();

        if (graphstyle == "basic") {
            drawColours = true;
        }
        if (graphstyle == "smoke" && groups.length > 1) {
            drawColours = true;
        }

        var collection = this.colname;

        /*
         * Iterate over the lines that are in the legend (in order) and
         * display the appropriate label with line colours as we go.
         */
        $.each(groups, function(index, group_id) {
            var label = legend[group_id].label + " " + legend[group_id].agg;
            var tooltip = "<p class='align-left no-margin'>";
            var colhtml = "";

            if (graphstyle == "smoke" && legend[group_id].series.length > 1) {
                drawColours = true;
            }

            for (var i = 0; i < legend[group_id].series.length; i++) {
                var series = legend[group_id].series[i].colourid;
                var colour = getSeriesStyle(series);

                if (i != 0) {
                    tooltip += "<br />";
                }
                if (drawColours) {
                    var key = "<em style='color:" + colour + ";'>&mdash;</em>";
                    colhtml += key;
                    tooltip += key + "&nbsp;";
                }

                tooltip += legend[group_id].series[i].shortlabel;
            }

            tooltip += "</p>";

            html = "<span class='label label-default'> ";
            html += "<span class='grouptips' ";
            html += 'title="' + tooltip + '">';
            html += "<label>" + colhtml;
            html += "</label>" + label + "</span>" +
                    "<button type='button' class='btn btn-default btn-xs' " +
                    "onclick='graphPage.modal.removeSeries(\"" +
                    collection + "\"," + group_id + ")'>" +
                    "<span class='glyphicon glyphicon-remove'></span>" +
                    "</button></span>";

            node.append(html);
            count++;
        });

        $(".grouptips").tooltip({
            placement: "bottom",
            delay: {show: 250, hide: 100},
            html: true  /* XXX Be wary of XSS attacks */
        });
    };
}

CuzGraphPage.prototype.drawGraph = function(start, end, first, labels) {};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
