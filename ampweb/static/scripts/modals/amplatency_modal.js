function AmpLatencyModal(selected) {
    Modal.call(this);
 
    /* Default to amp-icmp */ 
    if (selected === undefined || selected == "" || selected == "amp-latency")
        selected = "amp-icmp";

    this.changeTab(selected);

    $(document).on("shown.bs.tab", 'a[data-toggle="tab"]', function (e) {
        graphPage.modal.changeTab(e.target.textContent);
    });


    /* Prevent href being followed on a tab if it is disabled */
    $(document).on("click", "#tcptab", function(e) {
        if ($('#tcptab').hasClass('disabled')) {
            e.preventDefault();
        }
    });
    $(document).on("click", "#icmptab", function(e) {
        if ($('#icmptab').hasClass('disabled')) {
            e.preventDefault();
        }
    });
    $(document).on("click", "#dnstab", function(e) {
        if ($('#dnstab').hasClass('disabled')) {
            e.preventDefault();
        }
    });

}

AmpLatencyModal.prototype = new Modal();
AmpLatencyModal.prototype.constructor = AmpLatencyModal;

AmpLatencyModal.prototype.defaultTabHide = true;

AmpLatencyModal.prototype.ampicmpselectables = [
    {name: "source", label:"source", type:"dropdown"},
    {name: "destination", label:"destination", type:"dropdown"},
    {name: "packet_size", node: "icmp_packet_size", label:"packet size", 
            type:"dropdown"},
    {name: "aggregation", node: "icmp_aggregation", label:"aggregation", 
            type:"fixedradio"},
];

AmpLatencyModal.prototype.ampdnsselectables = [
    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "destination", type: "dropdown" },
    { name: "recurse", label: "recursion", type: "boolradio" },
    { name: "query", label: "name", type: "dropdown" },
    { name: "query_type", label: "query type", type: "dropdown" },
    { name: "query_class", label: "query class", type: "dropdown" },
    { name: "udp_payload_size", label: "payload size", type: "dropdown" },
    { name: "dnssec", label: "DNSSEC", type: "boolradio" },
    { name: "nsid", label: "NSID", type: "boolradio" },
    { name: "aggregation", node: "dns_aggregation", label: "aggregation", 
            type: "fixedradio" }
];

AmpLatencyModal.prototype.amptcppingselectables = [
    {name: "source", label:"source", type:"dropdown"},
    {name: "destination", label:"destination", type:"dropdown"},
    {name: "port", node:"tcp_port", label:"port", type:"dropdown"},
    {name: "packet_size", node: "tcp_packet_size", label:"packet size", 
            type:"dropdown"},
    {name: "aggregation", node: "tcp_aggregation", label:"aggregation", 
            type:"fixedradio"},
];


AmpLatencyModal.prototype.changeTab = function(selected) {
    var newcol = "";
    var newsels = {};
    var pane = "";
    var tabhead = ""

    if (selected == "amp-icmp" || selected == "ICMP") {
        newsels = this.ampicmpselectables;
        newcol = "amp-icmp";
        tabhead = "#icmptab";
        pane = "#icmp";
    } else if (selected == "amp-dns" || selected == "DNS") {
        newsels = this.ampdnsselectables;
        newcol = "amp-dns";
        tabhead = "#dnstab";
        pane = "#dns";
    } else if (selected == "amp-tcpping" || selected == "TCP") {
        newsels = this.amptcppingselectables;
        newcol = "amp-tcpping";
        tabhead = "#tcptab";
        pane = "#tcpping";
    }

    if (newcol == "")
        return;
    //if (newcol == this.collection)
    //    return;

    this.collection = newcol;
    this.selectables = newsels;
    $(tabhead).addClass("active");
    $(pane).addClass("active");

    this.updateSubmit();    
}

AmpLatencyModal.prototype.update = function(name) {
    switch(name) {
        case "nsid":
        case "dns_aggregation":
        case "tcp_packet_size":
        case "icmp_packet_size":
        case "icmp_aggregation":
        case "tcp_aggregation":
            this.updateSubmit(); break;
        case "destination":
            this.enableTabs(true); break;
        case "source":
            this.resetAllSelectables(name);
            this.fetchCombined(name);
            break;
        case undefined:
            this.fetchCombined(); break;
        default:
            this.updateModalDialog(name); break;
    };

}

AmpLatencyModal.prototype.updateTab = function(data, collection, tab, pane) {
    
    if (data != null) {
        $(tab).removeClass('disabled');
        $(tab).find('a').attr('data-toggle', 'tab');

        if (this.collection == collection) {
            this.updateAll(data);
        } else {
            var currsel = this.selectables;
            
            if (collection == "amp-icmp") 
                this.selectables = this.ampicmpselectables;
            if (collection == "amp-dns") 
                this.selectables = this.ampdnsselectables;
            if (collection == "amp-tcpping") 
                this.selectables = this.amptcppingselectables;

            this.updateAll(data);
            this.selectables = currsel;
        }
        return true;



    } else {
        $(tab).find('a').removeAttr("data-toggle"); 
        $(tab).addClass('disabled');
        $(tab).removeClass('active');
        $(pane).removeClass('active');
        this.updateSubmit();
        return false;
    }
    
}

AmpLatencyModal.prototype.resetAllSelectables = function(name) {

    var currsel = this.selectables;
    this.selectables =  this.ampicmpselectables;
    this.resetSelectables("destination");
    this.selectables =  this.amptcppingselectables;
    this.resetSelectables("destination");
    this.selectables =  this.ampdnsselectables;
    this.resetSelectables("destination");
    this.selectables = currsel;

}

AmpLatencyModal.prototype.enableTabs = function(clearSels) {
    var modal = this;
    var base = "/api/_destinations/";
    var gotIcmp = false;
    var gotDns = false;
    var gotTcp = false;
    
    this.resetAllSelectables('destination');
    $.when(
        $.getJSON(modal.constructQueryURL(base + "amp-icmp", "destination",
                modal.ampicmpselectables), 
                function(data) {
            gotIcmp = modal.updateTab(data, "amp-icmp", "#icmptab", "#icmp");
        }),
        $.getJSON(modal.constructQueryURL(base + "amp-dns", "destination",
                modal.ampdnsselectables), 
                function(data) {
            gotDns = modal.updateTab(data, "amp-dns", "#dnstab", "#dns");
        }),
        $.getJSON(modal.constructQueryURL(base + "amp-tcpping", "destination",
                modal.amptcppingselectables), 
                function(data) {
            gotTcp = modal.updateTab(data, "amp-tcpping", "#tcptab", "#tcpping");
        })
    ).done( function(a, b, c) {
        var activetabs = [];

        if (gotIcmp)
            activetabs = activetabs.concat("amp-icmp");
        if (gotDns)
            activetabs = activetabs.concat("amp-dns");
        if (gotTcp)
            activetabs = activetabs.concat("amp-tcpping");

        if (activetabs.length == 0) {
            $('#tabdiv').hide();
            return
        }
        /* Current tab collection is valid for the new destination */
        if ($.inArray(modal.collection, activetabs) != -1) {
            modal.changeTab(modal.collection);
        } else {

        /* Otherwise, our current tab is invalid -- change to the leftmost
         * valid one */
            modal.changeTab(activetabs[0]);
        }
        $('#tabdiv').show();
    

    });

}

function getFetchedOptions(optname, fetched) {

    if (fetched == null)
        return [];

    if (!fetched.hasOwnProperty(optname))
        return [];

    return fetched[optname];

}

AmpLatencyModal.prototype.fetchCombined = function(name) {
    var modal = this;
    var base = "/api/_destinations/";
    var sources = [];
    var dests = [];
    var result = {};
    var dnssources, icmpsources, icmpdest, dnsdest, tcpsources, tcpdest;

    // Hide all of our tabs, since we're changing source and dest.
    // Make sure we remove the default "hide" class if it is present,
    // otherwise our .show() and .hide() calls will have no effect.
    if (this.defaultTabHide || name != undefined) {
        $('#tabdiv').hide().removeClass("hide");
        this.defaultTabHide = false;
    }
    
    if (name != undefined)
        this.resetAllSelectables(name);
   
    $.when(
        $.getJSON(modal.constructQueryURL(base + "amp-icmp", name, 
                modal.ampicmpselectables), 
                function(s) {
            icmpsources = getFetchedOptions("source", s);
            icmpdest = getFetchedOptions("destination", s);
        }),
        $.getJSON(modal.constructQueryURL(base + "amp-tcpping", name,
                modal.amptcppingselectables), 
                function(s) {
            tcpsources = getFetchedOptions("source", s);
            tcpdest = getFetchedOptions("destination", s);
        }),
        $.getJSON(modal.constructQueryURL(base + "amp-dns", name,
                modal.ampdnsselectables), 
                function(s) {
            dnssources = getFetchedOptions("source", s);
            dnsdest = getFetchedOptions("destination", s);
        })
    ).done( function(a, b, c) {
        dnsdest = dnsdest.concat(icmpdest);
        dnsdest = dnsdest.concat(tcpdest);
        dnssources = dnssources.concat(icmpsources);
        dnssources = dnssources.concat(tcpsources);
        
        $.each(dnssources, function(i, el) {
            if ($.inArray(el, sources) === -1) sources.push(el);
        });
        $.each(dnsdest, function(i, el) {
            if ($.inArray(el, dests) === -1) dests.push(el);
        });
    
        if (sources.length > 0) {
            result['source'] = sources;
        }

        if (dests.length > 0 && 
                (sources.length == 1 || name == "source")) {
            result['destination'] = dests;
        }
        modal.updateAll(result);

        if (dests.length == 1) {
            this.enableTabs(true);
        }
    });
            
            
}

AmpLatencyModal.prototype.submitDnsView = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("query_type");
    var qclass = this.getDropdownValue("query_class");
    var psize = this.getDropdownValue("udp_payload_size");
    var recurse = this.getRadioValue("recurse");
    var dnssec = this.getRadioValue("dnssec");
    var nsid = this.getRadioValue("nsid");
    var split = this.getRadioValue("dns_aggregation");

    var flags = "";
    if (recurse == "true")
        flags += "T";
    else
        flags += "F";
    if (dnssec == "true")
        flags += "T";
    else
        flags += "F";
    if (nsid == "true")
        flags += "T";
    else
        flags += "F";

    var splitterm;
    if (split == "none")
        splitterm = "NONE";
    else if (split == "family")
        splitterm = "FAMILY";
    else
        splitterm = "FULL";

    if ( source != "" && server != "" && query != "" && type != "" ) {
        $.ajax({
            url: "/api/_createview/add/amp-dns/" + currentView + "/" + source +
                "/" + server + "/" + query + "/" + type + "/" + qclass + "/"
                + psize + "/" + flags + "/" + splitterm,
            success: this.finish
        });
    }
}


AmpLatencyModal.prototype.submitIcmpView = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var packet_size = this.getDropdownValue("icmp_packet_size");
    var aggregation = this.getRadioValue("icmp_aggregation");

    if ( source != "" && destination != "" && packet_size != "" &&
            aggregation != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentView + "/" + source + "/" + destination + "/" +
                packet_size + "/" + aggregation,
            success: this.finish
        });
    }
}

AmpLatencyModal.prototype.submitTcppingView = function() {
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var port = this.getDropdownValue("tcp_port");
    var packet_size = this.getDropdownValue("tcp_packet_size");
    var aggregation = this.getRadioValue("tcp_aggregation");

    if ( source != "" && destination != "" && packet_size != "" &&
            aggregation != "" && port != "") {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentView + "/" + source + "/" + destination + "/" +
                port + "/" + packet_size + "/" + aggregation,
            success: this.finish
        });
    }

}

AmpLatencyModal.prototype.submit = function() {
    if (this.collection == "amp-icmp") {
        this.submitIcmpView();
    }
    if (this.collection == "amp-tcpping") {
        this.submitTcppingView();
    }
    if (this.collection == "amp-dns") {
        this.submitDnsView();
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


