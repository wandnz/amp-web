function CuzGraphPage() {

    this.stream = ""
    this.tabrequest = undefined;
    this.streamrequest = undefined;
    this.dropdowns = undefined;
    this.colname = "";
    this.graph = undefined;

    this.getCurrentSelection = function() {
        if (this.graph) 
            return this.graph.getSelectionRange();

        return null;
    }

    this.changeStream = function(newstream, start, end) {
        if (newstream != undefined)
            this.stream = newstream;
    
        // If start and end are set to null, try to use the current selection. 
        if (start == null || end == null) {
            if (this.graph) {
                var times = this.graph.getSelectionRange();
                start = times.start;
                end = times.end;
            }
        }

        $("#graph").empty();

        /* If stream is not set or is invalid, clear the graph and exit */
        if (this.stream == "" || this.stream == "-1") {
            if (this.stream == "-1") {
                $("#graph").append("<p>Invalid stream selected.</p>");
            }
            return;
        }

        $("#graph").append("<p>Loading graph...</p>");

        if (this.streamrequest)
            this.streamrequest.abort();

        var graphobj = this;
        this.streamrequest = $.ajax({
            url: API_URL + "/_streaminfo/" + graphobj.colname + "/" + 
                    graphobj.stream + "/",
            success: function(data) {
                graphobj.drawGraph(start, end, data['firsttimestamp']);
            }
        });
        this.populateTabs();
    }

    this.populateTabs = function() {
        $('#graphtablist').children().remove();

        if (this.stream == "" || this.stream == "-1")
            return;

        if (this.tabrequest)
            this.tabrequest.abort();

        var graphobj = this;
        /* Get a suitable set of tabs via an ajax query */
        this.tabrequest = $.ajax({
            url: API_URL + "/_relatedstreams/" + graphobj.colname + "/" + 
                    graphobj.stream + "/",
            success: function(data) {
                $.each(data, function(index, obj) {
                    var tabid = "graphtab" + obj['streamid'];
                    var sparkid = "minigraph" + obj['streamid'];
                    var li = "<li id=\"" + tabid + "\" ";
                    
                    li += "onclick=\"changeGraph({graph: '";
                    li += obj['collection'];
                    li += "', stream: '";
                    li += obj['streamid'] + "'})\" ";

                    if (obj['streamid'] == graphobj.stream)
                        li += "class=\"selectedicon\">";
                    else
                        li += "class=\"icon\">";
                    li += "<span id=\"" + sparkid + "\"></span>";
                    li += "<br>" + obj['title'] + "</li>"
                    $('#graphtablist').append(li);
                });
            }
        });
    }

    this.setDropdownState = function(state) {
        if (this.dropdowns == undefined || state == undefined)
            return;
        this.dropdowns.setDropdownState(state);
    }

    this.getDropdownState = function() {
        this.dropdowns.getSelected();
        return this.dropdowns.getDropdownState();
    }

    this.dropdownCallback = function(selection) {
        if (this.dropdowns)
            this.dropdowns.callback(selection);
    }

    this.updateTitle = function() {
        if (this.stream == -1 || this.stream == "" || this.stream == undefined)
        {
            setTitle("CUZ - Graphs");
            return;
        }

        $.ajax({
            url: API_URL + "/_streaminfo/" + this.colname + "/" + this.stream
                    + "/",
            success: function(data) {
                var graphtitle = "CUZ - " + data["name"];
                setTitle(graphtitle);
            }
        });

    }
     

    this.placeDropdowns = function(selectedstream) {
        if (selectedstream == undefined)
            selectedstream = this.stream;
        
        graphobj = this;
        $('#dropdowndiv').empty();

        this.initDropdowns(selectedstream);

        $.ajax({
            url: API_URL + "/_selectables/" + graphobj.colname + "/" +
                    selectedstream + "/",
            success: function(data) {
                $.each(data, function(index, obj) {
                    graphobj.dropdowns.constructDropdown(obj);
                });

                /* XXX Doing this here isn't ideal, but we have to wait until
                 * the AJAX call populates our dropdowns with their initial
                 * settings before we can record the dropdown history for the
                 * first stream */
                saveDropdownState();
            }
        });
    }
}

CuzGraphPage.prototype.initDropdowns = function() {};
CuzGraphPage.prototype.drawGraph = function(start, end, first) {};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
