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

function AmpThroughputModal ( ) {
    Modal.call(this);
}

AmpThroughputModal.prototype = new Modal();
AmpThroughputModal.prototype.constructor = AmpThroughputModal;
AmpThroughputModal.prototype.collection = "amp-throughput";

AmpThroughputModal.prototype.selectables = [
    { name: "source", label: "source", type:"dropdown" },
    { name: "destination", label: "target", type:"dropdown" },
    { name: "protocol", label: "protocol", type:"dropdown" },
    { name: "duration", label: "test duration", type:"dropdown" },
    { name: "writesize", label: "write size", type:"dropdown" },
    { name: "tcpreused", label: "reuse TCP", type:"hidden" },
    { name: "direction", label: "direction", type:"fixedradio"},
    { name: "family", label: "family", type:"fixedradio"},
]

AmpThroughputModal.prototype.update = function(name, autotrigger) {
    if (!autotrigger) {
        this.saveSelectables();
    }

    switch(name) {
        case 'source':
        case 'destination':
        case 'duration':
        case 'writesize':
        case 'protocol':
            this.updateModalDialog(name); break;
        case 'tcpreused':
        case 'direction':
        case 'family':
            this.updateSubmit(); break;
        default:
            this.updateModalDialog(name); break;
    };
}

AmpThroughputModal.prototype.submit = function() {
    var source = this.getDropdownValue("source");
    var target = this.getDropdownValue("destination");
    var protocol = this.getDropdownValue("protocol");
    var duration = this.getDropdownValue("duration");
    var write = this.getDropdownValue("writesize");
    var reused = this.getTextValue("tcpreused");
    var direction = this.getRadioValue("direction");
    var family = this.getRadioValue("family");

    var reusedflag = "";
    if (reused == "true")
        reusedflag = "T";
    if (reused == "false")
        reusedflag = "F";

    this.submitAjax([source, target, protocol, duration, write, reusedflag,
            direction, family], "amp-throughput");

}

AmpThroughputModal.prototype.translateSelection = function(sel, fieldname) {

    if (fieldname == "tcpreused") {
        if (sel == "T")
            return "true";
        if (sel == "F")
            return "false";
    }

    return sel;

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
