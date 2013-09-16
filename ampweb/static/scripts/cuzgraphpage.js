function CuzGraphPage() {

    this.streams = ""
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

    this.changeStream = function(newstreams, start, end) {
        if (newstreams != undefined)
            this.streams = newstreams;
   
   
        console.log(this.streams); 
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
        if (this.streams == "" || this.streams.length == 0) {
            if (this.streams.length == 0) {
                $("#graph").append("<p>No valid stream selected.</p>");
            }
            return;
        }

        $("#graph").append("<p>Loading graph...</p>");

        if (this.streamrequest)
            this.streamrequest.abort();

        var graphobj = this;
        var i = 0;
        var minfirstts = 0;

        var infourl = API_URL + "/_streaminfo/" + graphobj.colname + "/";
        for (i; i < this.streams.length; i++) {
            infourl += this.streams[i] + "/";
        }

        this.streamrequest = $.ajax({
            url: infourl, 
            success: function(data) {
                $.each(data, function(index, result) {
                    if (minfirstts == 0) 
                        minfirstts = result['firsttimestamp'];

                    if (minfirstts > result['firsttimestamp'])
                        minfirstts = result['firsttimestamp'];
                });
                graphobj.drawGraph(start, end, minfirstts);
            }
        });
        this.populateTabs();
    }

    this.populateTabs = function() {
        $('#graphtablist').children().remove();

        if (this.streams == "" || this.streams.length == 0)
            return;

        if (this.tabrequest)
            this.tabrequest.abort();

        var graphobj = this;
        var i = 0;
        var relurl = API_URL + "/_relatedstreams/" + graphobj.colname + "/";
        
        for (i; i < this.streams.length; i++) {
            relurl += this.streams[i] + "/";
        }
        /* Get a suitable set of tabs via an ajax query */
        this.tabrequest = $.ajax({
            url: relurl,
            success: function(data) {
                $.each(data, function(index, obj) {
                    var tabid = "graphtab" + obj['collection'];
                    var sparkid = "minigraph" + obj['collection'];
                    var li = "<li id=\"" + tabid + "\" ";
                    var s = 0;
                    
                    li += "onclick=\"changeGraph({graph: '";
                    li += obj['collection'];
                    li += "', stream: [";
                    
                    for (s = 0; s < obj['streamid'].length; s++) {
                        if (s != 0)
                            li += ",";
                        li += "'" + obj['streamid'][s] + "'";
                    }

                    li += "]})\" ";

                    if (obj['collection'] == graphobj.colname)
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
        if (this.streams == "" || this.streams.length == 0)
        {
            setTitle("CUZ - Graphs");
            return;
        }

        if (this.streams.length == 1) {

            $.ajax({
                url: API_URL + "/_streaminfo/" + this.colname + "/" + 
                        this.streams[0] + "/",
                success: function(data) {
                    var graphtitle = "CUZ - " + data[0]["name"];
                    setTitle(graphtitle);
                }
            });
        } else {
            if (this.generictitle != undefined)
                setTitle(this.generictitle);
            else
                setTitle("Cuz - Graphs");
        }


    }
     

    this.placeDropdowns = function(selectedstream) {
        if (selectedstream == undefined) {
            if (this.streams == "")
                selectedstream = "";
            else
                selectedstream = this.streams[0];
        }
        
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
