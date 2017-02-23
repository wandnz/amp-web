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

function SmokepingModal(/*stream*/) {
    Modal.call(this);
}

SmokepingModal.prototype = new Modal();
SmokepingModal.prototype.constructor = SmokepingModal;
SmokepingModal.prototype.collection = "rrd-smokeping";

SmokepingModal.prototype.selectables = [
    {name:"source", label:"source", type:"dropdown"},
    {name:"host", label:"target", type:"dropdown"},
    {name:"aggregation", label:"address family", type:"fixedradio"}
];

SmokepingModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "host": this.updateModalDialog(name); break;
        case "aggregation": this.updateFixedRadio(); break
        default: this.updateModalDialog(name); break;
    };
}

SmokepingModal.prototype.submit = function() {
    /* get new view id */
    var source, destination, family;
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("host");
    var family = this.getRadioValue('aggregation');

    this.submitAjax([source, destination, family], this.collection);
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
