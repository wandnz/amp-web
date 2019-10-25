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

function AmpLatencyModal(selected) {
    Modal.call(this);

    /* Default to amp-icmp */
    if (selected === undefined || selected == "" || selected == "amp-latency")
        selected = "amp-icmp";

    this.changeTab(selected);

    $(document).on("shown.bs.tab", 'a[data-toggle="tab"]', function(e) {
        graphPage.modal.changeTab(e.target.dataset["collection"]);
    });

    for (var collection in this.collections) {
        let tab = this.collections[collection]["tab"];
        /* Prevent href being followed on a tab if it is disabled */
        $(document).on("click", tab, function(e) {
            if ($(tab).hasClass('disabled')) {
                e.preventDefault();
            }
        });
    }
}

AmpLatencyModal.prototype = new Modal();
AmpLatencyModal.prototype.constructor = AmpLatencyModal;
AmpLatencyModal.prototype.lastselection = [];

/*
 * name, label and type are all that is usually required, but we've got a lot
 * of tests all using the same name as they share similar parameters. Use the
 * node field to uniquely identify the actual input element.
 */
AmpLatencyModal.prototype.collections = {
    "amp-icmp": {
        "tab": "#amp-icmp-tab",
        "pane": "#amp-icmp-pane",
        "last": [],
        "selectables": [
            {name: "source", label: "source", type: "dropdown"},
            {name: "destination", label: "destination", type: "dropdown"},
            {name: "packet_size", node: "icmp_packet_size",
                label: "packet size", type: "dropdown"},
            {name: "aggregation", node: "icmp_aggregation",
                label: "aggregation", type: "fixedradio"}
        ]
    },

    "amp-tcpping": {
        "tab": "#amp-tcpping-tab",
        "pane": "#amp-tcpping-pane",
        "last": [],
        "selectables": [
            {name: "source", label: "source", type: "dropdown"},
            {name: "destination", label: "destination", type: "dropdown"},
            {name: "port", node: "tcp_port", label: "port", type: "dropdown"},
            {name: "packet_size", node: "tcp_packet_size", label: "packet size",
                type: "dropdown"},
            {name: "aggregation", node: "tcp_aggregation", label: "aggregation",
                type: "fixedradio"}
        ]
    },

    "amp-dns": {
        "tab": "#amp-dns-tab",
        "pane": "#amp-dns-pane",
        "last": [],
        "selectables": [
            {name: "source", label: "source", type: "dropdown"},
            {name: "destination", label: "destination", type: "dropdown"},
            {name: "recurse", label: "recursion", type: "boolradio"},
            {name: "query", label: "name", type: "dropdown"},
            {name: "query_type", label: "query type", type: "dropdown"},
            {name: "query_class", label: "query class", type: "dropdown"},
            {name: "udp_payload_size", label: "payload size", type: "dropdown"},
            {name: "dnssec", label: "DNSSEC", type: "boolradio"},
            {name: "nsid", label: "NSID", type: "boolradio"},
            {name: "aggregation", node: "dns_aggregation", label: "aggregation",
                    type: "fixedradio"}
        ]
    },

    "amp-udpstream-latency": {
        "tab": "#amp-udpstream-latency-tab",
        "pane": "#amp-udpstream-latency-pane",
        "last": [],
        "selectables": [
            {name: "source", label: "source", type: "dropdown"},
            {name: "destination", label: "destination", type: "dropdown"},
            {name: "dscp", node: "udp_dscp", label: "dscp", type: "dropdown"},
            {name: "packet_size", node: "udp_size", label: "packet size",
                    type: "dropdown"},
            {name: "packet_spacing", node: "udp_spacing",
                    label: "packet spacing", type: "dropdown"},
            {name: "packet_count", node: "udp_count", label: "stream size",
                    type: "dropdown"},
            {name: "direction", node: "udp_direction", label: "direction",
                    type: "fixedradio"},
            {name: "aggregation", node: "udp_aggregation", label: "aggregation",
                    type: "fixedradio"},
        ]
    },

    "amp-fastping": {
        "tab": "#amp-fastping-tab",
        "pane": "#amp-fastping-pane",
        "last": [],
        "selectables": [
            {name: "source", label: "source", type: "dropdown"},
            {name: "destination", label: "destination", type: "dropdown"},
            {name: "packet_size", node: "fastping_packet_size",
                    label: "packet size", type: "dropdown"},
            {name: "packet_rate", node: "fastping_packet_rate",
                    label: "packet rate", type: "dropdown"},
            {name: "packet_count", node: "fastping_packet_count",
                    label: "packet count", type: "dropdown"},
            {name: "preprobe", node: "fastping_preprobe", label: "preprobe",
                    type: "boolradio"},
            {name: "aggregation", node: "fastping_aggregation",
                    label: "aggregation", type: "fixedradio"},
        ]
    }
};

AmpLatencyModal.prototype.changeTab = function(selected) {
    if (this.collections[selected] === undefined) {
        return;
    }

    /* store the current selection if possible */
    if (this.collection !== undefined && this.collection != selected) {
        this.saveSelectables();
        this.collections[this.collection]["last"] = this.lastselection;
    }

    this.collection = selected;
    this.selectables = this.collections[selected]["selectables"];
    this.lastselection = this.collections[selected]["last"];

    $(this.collections[selected]["tab"]).addClass("active");
    $(this.collections[selected]["pane"]).addClass("active");

    this.updateModalDialog("destination");
};

AmpLatencyModal.prototype.update = function(name, autotrigger) {
    if ( !autotrigger ) {
        this.saveSelectables();
    }

    switch (name) {
        case "destination":
            this.enableTabs(true); break;
        case "tcp_aggregation":
        case "dns_aggregation":
        case "icmp_aggregation":
        case "udp_aggregation":
        case "fastping_aggregation":
            this.updateSubmit(); break;
        case undefined:
            this.updateSource(); break;
        /* all others will try to fetch the next available option values */
        case "source":
        default:
            this.updateModalDialog(name); break;
    }
};

AmpLatencyModal.prototype.updateSource = function() {
    $("#tabdiv").hide().removeClass("hide");

    this.updateModalDialog("source");
};

AmpLatencyModal.prototype.enableTab = function(data, collection) {
    var tab = "#" + collection + "-tab";
    var pane = "#" + collection + "-pane";

    if (data != null) {
        $(tab).removeClass('disabled');
        $(tab).find('a').attr('data-toggle', 'tab');
        return true;
    } else {
        $(tab).find('a').removeAttr("data-toggle");
        $(tab).addClass('disabled');
        $(tab).removeClass('active');
        $(pane).removeClass('active');
        this.updateSubmit();
        return false;
    }
};

AmpLatencyModal.prototype.enableTabs = function(clearSels) {
    var modal = this;
    var base = API_URL + "/_destinations/";
    var gotIcmp = false;
    var gotDns = false;
    var gotTcp = false;
    var gotUdp = false;
    var gotFastping = false;

    /* TODO can we use a loop of some sort here too? */
    $.when(
        $.getJSON(modal.constructQueryURL(base + "amp-icmp", "destination",
                modal.collections["amp-icmp"]["selectables"]),
                function(data) {
            gotIcmp = modal.enableTab(data, "amp-icmp");
        }),
        $.getJSON(modal.constructQueryURL(base + "amp-dns", "destination",
                modal.collections["amp-dns"]["selectables"]),
                function(data) {
            gotDns = modal.enableTab(data, "amp-dns");
        }),
        $.getJSON(modal.constructQueryURL(base + "amp-tcpping", "destination",
                modal.collections["amp-tcpping"]["selectables"]),
                function(data) {
            gotTcp = modal.enableTab(data, "amp-tcpping");
        }),
        $.getJSON(modal.constructQueryURL(base + "amp-udpstream-latency", "destination",
                modal.collections["amp-udpstream-latency"]["selectables"]),
                function(data) {
            gotUdp = modal.enableTab(data, "amp-udpstream-latency");
        }),
        $.getJSON(modal.constructQueryURL(base + "amp-fastping", "destination",
                modal.collections["amp-fastping"]["selectables"]),
                function(data) {
            gotFastping = modal.enableTab(data, "amp-fastping");
        })
    ).done(function(a, b, c) {
        var activetabs = [];

        if (gotIcmp)
            activetabs = activetabs.concat("amp-icmp");
        if (gotDns)
            activetabs = activetabs.concat("amp-dns");
        if (gotTcp)
            activetabs = activetabs.concat("amp-tcpping");
        if (gotUdp)
            activetabs = activetabs.concat("amp-udpstream-latency");
        if (gotFastping)
            activetabs = activetabs.concat("amp-fastping");

        if (activetabs.length == 0) {
            $('#tabdiv').hide();
            return;
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
};

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
    else if (split == "ipv4")
        splitterm = "IPV4";
    else if (split == "ipv6")
        splitterm = "IPV6";
    else
        splitterm = "FULL";

    this.submitAjax([source, server, query, type, qclass, psize, flags,
            splitterm], "amp-latency");
};

AmpLatencyModal.prototype.submitIcmpView = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var packet_size = this.getDropdownValue("icmp_packet_size");
    var aggregation = this.getRadioValue("icmp_aggregation");

    this.submitAjax([source, destination, packet_size, aggregation],
            "amp-latency");
};

AmpLatencyModal.prototype.submitTcppingView = function() {
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var port = this.getDropdownValue("tcp_port");
    var packet_size = this.getDropdownValue("tcp_packet_size");
    var aggregation = this.getRadioValue("tcp_aggregation");

    this.submitAjax([source, destination, port, packet_size, aggregation],
            "amp-latency");
};

AmpLatencyModal.prototype.submitUdpstreamView = function() {
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var dscp = this.getDropdownValue("udp_dscp");
    var size = this.getDropdownValue("udp_size");
    var spacing = this.getDropdownValue("udp_spacing");
    var count = this.getDropdownValue("udp_count");
    var direction = this.getRadioValue("udp_direction");
    var aggregation = this.getRadioValue("udp_aggregation");

    this.collection = "amp-udpstream";
    this.submitAjax([source, destination, dscp, size, spacing, count,
            direction, aggregation], "amp-latency");
    this.collection = "amp-udpstream-latency";
};

AmpLatencyModal.prototype.submitFastpingView = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var packet_size = this.getDropdownValue("fastping_packet_size");
    var packet_rate = this.getDropdownValue("fastping_packet_rate");
    var packet_count = this.getDropdownValue("fastping_packet_count");
    var preprobe = this.getRadioValue("fastping_preprobe");
    var aggregation = this.getRadioValue("fastping_aggregation");

    this.submitAjax([source, destination, packet_size, packet_rate,
            packet_count, preprobe, aggregation], "amp-latency");
};

AmpLatencyModal.prototype.submit = function() {
    /* TODO add function pointers to the main data structure? */
    if (this.collection == "amp-icmp") {
        this.submitIcmpView();
    }
    if (this.collection == "amp-tcpping") {
        this.submitTcppingView();
    }
    if (this.collection == "amp-dns") {
        this.submitDnsView();
    }
    if (this.collection == "amp-udpstream-latency") {
        this.submitUdpstreamView();
    }
    if (this.collection == "amp-fastping") {
        this.submitFastpingView();
    }

    /*
     * clear selections for all other collections - if the modal is reopened
     * it should remember the settings for the current collection, but reset
     * all the other tabs so it is obvious what selections can be made.
     */
    for ( var i in this.collections ) {
        if ( i == this.collection ) {
            this.collections[i]["last"] = this.lastselection;
        } else {
            this.collections[i]["last"] = [];
        }
    }
};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
