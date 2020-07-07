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

function AmpSipModal() {
    Modal.call(this);
}

AmpSipModal.prototype = new Modal();
AmpSipModal.prototype.constructor = AmpSipModal;
AmpSipModal.prototype.collection = "amp-sip";

AmpSipModal.prototype.selectables = [
    {name: "source", label: "source", type: "dropdown"},
    {name: "destination", label: "destination", type: "dropdown"},
    {name: "proxy", label: "proxy", type: "dropdown"},
    {name: "filename", label: "filename", type: "dropdown"},
    {name: "dscp", label: "dscp", type: "dropdown"},
    {name: "max_duration", label: "max_duration", type: "dropdown"},
    {name: "repeat", label: "repeat", type: "boolradio"},
    {name: "direction", label: "direction", type: "fixedradio"},
    {name: "aggregation", label: "aggregation", type: "fixedradio"},
];

AmpSipModal.prototype.update = function(name, autotrigger) {
    if (!autotrigger) {
        this.saveSelectables();
    }

    switch (name) {
        case 'repeat':
        case 'direction':
        case 'aggregation':
            this.updateSubmit();
            break;
        default:
            this.updateModalDialog(name);
            break;
    }
};

AmpSipModal.prototype.submit = function() {

    /* Reset currentView so our new selection will overwrite the
     * view rather than adding to it.
     */
    currentView = 0;

    this.submitAjax([
            this.getDropdownValue("source"),
            this.getDropdownValue("destination"),
            this.getDropdownValue("proxy"),
            this.getDropdownValue("filename"),
            this.getDropdownValue("dscp"),
            this.getDropdownValue("max_duration"),
            this.getRadioValue("repeat"),
            this.getRadioValue("direction"),
            this.getRadioValue("aggregation")
    ], this.collection);
};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
