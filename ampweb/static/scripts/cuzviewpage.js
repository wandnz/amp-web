function CuzGraphPage() {

    this.streams = ""
    this.streamrequest = undefined;
    this.colname = "";
    this.graph = undefined;

    this.getCurrentSelection = function() {
        if (this.graph)
            return this.graph.getSelectionRange();

        return null;
    }

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
        this.displayAddStreamsButton(true);

        /* If stream is not set or is invalid, just bring up the modal
         * dialog for adding a new series */
        if (this.view == "" || this.view.length == 0) {
            $("#graph").append(
                    "<p>" +
                    "Add a data series to this graph using the button above." +
                    "</p>");
            
            /* XXX There is a minor issue with modal dialogs not being
             * reinitialised properly when the user navigates back to the page
             * displaying the modal from a different history stack */
            $("#modal-foo").modal({
                'show': true,
                'remote': MODAL_URL + "/" + this.graphstyle
            });

            /* Apparently we have to wait for the modal to be visible
             * before we can update it. Since the 'shown' event doesn't
             * trigger when we force the modal to load and display (and it
             * isn't a reliable indicator anyway), we'll replicate the 
             * silly timeout from modal.js here.
             */
            setTimeout(function() { 
                graphobj.modal.update();        
            }, 600);
            
            return;
        } else {
            $('#modal-foo').modal('hide');
        }

        if (this.streamrequest)
            this.streamrequest.abort();

        var i = 0;

        var infourl = API_URL + "/_legend/" + graphobj.colname + "/"
                + this.view;
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

        /* XXX this doesn't do a lot either, we probably do want tabs */
    }


    this.populateTabs = function(legenddata) {
        $('#graphtablist').children().remove();

        var tabs = this.getTabs();
        var nexttab = 0;
        var graphobj = this;

        if (tabs.length == 0)
            return;

        validquery = "/api/_validatetab/" + graphobj.colname + "/"
        validquery += graphobj.view + "/"

        /* TODO don't put duplicate collections in the query to make
         * Brendon happy 
         */
        $.each(tabs, function(index, tab) {
            /* Form a query to check which tabs are valid, i.e. will not
             * take us to an empty graph. */
            validquery += tab.graphstyle + "/"
        });

        $.ajax({
            url: validquery,
            success: function(data) {
                /* Add each valid tab to the graph */
                $.each(tabs, function(index, tab) {
                    if (data[index] == 0)
                        return;
            
                    var li = $('<li/>');
                    li.attr('id', "graphtab" + nexttab);
                    li.click(function() {
                        changeTab({
                            base: graphobj.colname,
                            view: graphobj.view,
                            newcol: tab.graphstyle
                        });
                    });
                    
                    if ( tab.selected )
                        li.addClass('selected');
                    li.text(tab.title);

                    /* XXX This isn't currently used for anything */
                    var minigraph = $('<span/>');
                    minigraph.attr('id', "minigraph" + nexttab);
                    li.prepend(minigraph);

                    $('#graphtablist').append(li);
                    nexttab ++;
                });
            }
        });
    }
            

    this.updateTitle = function() {
        if (this.streams == "" || this.streams.length == 0)
        {
            setTitle("CUZ - Graphs");
            return;
        }

        if (this.streams.length == 1) {

            $.ajax({
                url: API_URL + "/_streaminfo/" + this.colname + "/" +
                        this.streams[0].id + "/",
                success: function(data) {
                    setTitle("CUZ - " + data[0]["name"]);
                }
            });
        } else {
            if (this.generictitle != undefined)
                setTitle(this.generictitle);
            else
                setTitle("CUZ - Graphs");
        }
    }


    this.displayAddStreamsButton = function(loading) {
        var node = $('#dropdowndiv');
        node.empty();

        var add = $('<a data-toggle="modal" data-target="#modal-foo"/>');
        add.attr('href', '/modal/' + this.graphstyle);
        add.addClass('btn btn-primary btn-xs');
        add.append('<span class="glyphicon glyphicon-plus"></span>' +
                'Add new data series');
        node.append(add);

        if ( loading )
            node.append('<span class="label label-default">' +
                    '<label class="loading">Loading</label></span>');
    }

    this.displayLegend = function(legend, graphstyle) {
        this.displayAddStreamsButton();

        /* TODO put addresses in a tooltip with line colours? */
        /* TODO list all line colours in the main label for each dataset? */
        /* TODO make the data in legend much more generic so it works on all */
        var node = $('#dropdowndiv');
        var count = 1;
        var groups = [];

        /*
         * Neither the python that this came from or javascript can guarantee
         * any sort of order for objects/dicts, so grab the keys and sort them.
         */
        for ( var group_id in legend ) {
            groups.push(group_id);
        }
        groups.sort();

        /* Check for situations where we will always need to show
         * the line colours on the legend
         */
        var showColours = false;
        if (graphstyle == "basic")
            showColours = true;
        if (graphstyle == "smoke") {
            if (groups.length > 1)
                showColours = true;
        }

        /*
         * Iterate over the lines that are in the legend (in order) and
         * display the appropriate label with line colours as we go.
         */
        $.each(groups, function(index, group_id) {
            var label = legend[group_id]['label'];
            html = "<span class='label label-default'><label>";
            
            /* If we are a single group with more than one series,
             * make sure we show colours on the legend regardless.
             */
            if (showColours || legend[group_id]["series"].length > 1) {
                for ( var item in legend[group_id]["series"] ) {

                    var series = legend[group_id]["series"][item]["colourid"];
                    var colour = getSeriesStyle(series);
                    html += "<em style='color:"+colour+";'>&mdash;</em>";
                }
            }

            html += "</label>" + label +
                    "<button type='button' class='btn btn-default btn-xs' " +
                    "onclick='graphPage.modal.removeSeries("+group_id+")'>" +
                    "<span class='glyphicon glyphicon-remove'></span>" +
                    "</button></span>";

            node.append(html);
            count++;
        });
    }
}

CuzGraphPage.prototype.drawGraph = function(start, end, first, labels) {};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
