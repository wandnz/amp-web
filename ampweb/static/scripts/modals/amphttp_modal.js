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

function AmpHttpModal () {
    Modal.call(this);
}

AmpHttpModal.prototype = new Modal();
AmpHttpModal.prototype.constructor = AmpHttpModal;
AmpHttpModal.prototype.collection = "amp-http";

AmpHttpModal.prototype.selectables = [
    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "URL", type: "dropdown", encode: true },
    { name: "max_connections", label: "connections", type: "dropdown" },
    { name: "max_connections_per_server", label: "server connections", type: "dropdown" },
    { name: "persist", label: "persistent", type: "boolradio" },
    { name: "max_persistent_connections_per_server", label: "persistent connections", type: "dropdown" },
    { name: "pipelining", label: "pipelining", type: "boolradio" },
    { name: "pipelining_max_requests", label: "pipelined requests", type: "dropdown" },
    { name: "caching", label: "caching", type: "boolradio" },
]

AmpHttpModal.prototype.update = function(name, autotrigger) {
    if ( !autotrigger ) {
        this.saveSelectables();
    }

    switch (name) {
        case 'caching':
            this.updateSubmit(); break;
        default:
            this.updateModalDialog(name); break;
    };
}

AmpHttpModal.prototype.submit = function() {
    var source = this.getDropdownValue("source");
    var target = this.getDropdownValue("destination", true);
    var maxconns = this.getDropdownValue("max_connections");
    var maxserverconns = this.getDropdownValue("max_connections_per_server");
    var persist = this.getRadioValue("persist");
    var maxpersist = this.getDropdownValue("max_persistent_connections_per_server");
    var pipe = this.getRadioValue("pipelining");
    var maxpipe = this.getDropdownValue("pipelining_max_requests");
    var caching = this.getRadioValue("caching");

    if (persist == "true")
        persist = "PERSIST";
    else if (persist == "false")
        persist = "NOPERSIST";

    if (pipe == "true")
        pipe = "PIPELINING";
    else if (pipe == "false")
        pipe = "NOPIPELINING";

    if (caching == "true")
        caching = "CACHING";
    else if (caching == "false")
        caching = "NOCACHING";

    this.submitAjax([source, target, maxconns, maxserverconns, persist,
            maxpersist, pipe, maxpipe, caching], "amp-http");

}

AmpHttpModal.prototype.translateSelection = function(sel, fieldname) {

    if (fieldname == "destination") {
        return this.decodeValue(sel);
    }

    if (sel == "PERSIST" || sel == "PIPELINING" || sel == "CACHING")
        return "true";
    if (sel == "NOPERSIST" || sel == "NOPIPELINING" || sel == "NOCACHING")
        return "false";
    return sel;

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
