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

/*
 * A normal traceroute graph behaves exactly like the icmp graph, with the
 * same options, same aggregation etc.
 */

function AmpTracerouteModal() {
    Modal.call(this);
}

AmpTracerouteModal.prototype = new Modal();
AmpTracerouteModal.prototype.constructor = AmpTracerouteModal;
AmpTracerouteModal.prototype.collection = "amp-traceroute_pathlen";

AmpTracerouteModal.prototype.selectables = [
    {name: "source", label:"source", type:"dropdown"},
    {name: "destination", label:"destination", type:"dropdown"},
    {name: "packet_size", label:"packet size", type:"dropdown"},
    {name: "aggregation", label:"aggregation", type:"fixedradio"},
];

AmpTracerouteModal.prototype.update = function(name, autotrigger) {
    if ( !autotrigger ) {
        this.saveSelectables();
    }

    $('label[title]').tooltip({
        container: '#modal-foo .modal-dialog'
    });

    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "destination": this.updateModalDialog(name); break;
        case "packet_size": this.updateSubmit(); break;
        case "aggregation": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

AmpTracerouteModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var packet_size = this.getDropdownValue("packet_size");
    var aggregation = this.getRadioValue("aggregation");

    this.submitAjax([source, destination, packet_size, aggregation],
            this.collection);
}

/*
 * A rainbow traceroute graph only displays a single stream, so has different
 * options to the normal traceroute style.
 */
function AmpTracerouteRainbowModal() {
    AmpTracerouteModal.call(this);
}
AmpTracerouteRainbowModal.prototype = new AmpTracerouteModal();
AmpTracerouteRainbowModal.prototype.constructor = AmpTracerouteRainbowModal;
AmpTracerouteRainbowModal.prototype.collection = "amp-astraceroute";
AmpTracerouteRainbowModal.prototype.selectables = [

    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "destination", type: "dropdown" },
    { name: "packet_size", label: "packet size", type: "dropdown" },
    { name: "family", label: "family", type: "radio",
            validvalues: ['ipv4', 'ipv6']},

]

AmpTracerouteRainbowModal.prototype.update = function(name, autotrigger) {
    if ( !autotrigger ) {
        this.saveSelectables();
    }
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "destination": this.updateModalDialog(name); break;
        case "packet_size": this.updateModalDialog(name); break;
        case "family": this.updateModalDialog(name); break;
        default: this.updateModalDialog(name); break;
    };
}


AmpTracerouteRainbowModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var packet_size = this.getDropdownValue("packet_size");
    var family = this.getRadioValue("family");

    this.submitAjax([source, destination, packet_size, family],
            this.collection);
}

/* The Traceroute Map modal should be exactly like the rainbow modal,
 * except we want to query a different data collection.
 */
function AmpTracerouteMapModal() {
    AmpTracerouteRainbowModal.call(this);
}

AmpTracerouteMapModal.prototype = new AmpTracerouteRainbowModal();
AmpTracerouteMapModal.prototype.constructor = AmpTracerouteMapModal;
AmpTracerouteMapModal.prototype.collection = "amp-traceroute";

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
