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

function AmpUdpstreamModal() {
    Modal.call(this);
}

AmpUdpstreamModal.prototype = new Modal();
AmpUdpstreamModal.prototype.constructor = AmpUdpstreamModal;
AmpUdpstreamModal.prototype.collection = "amp-udpstream";

AmpUdpstreamModal.prototype.selectables = [
    {name: "source", label:"source", type:"dropdown"},
    {name: "destination", label:"destination", type:"dropdown"},
    {name: "dscp", label:"dscp", type:"dropdown"},
    {name: "packet_size", label:"packet size", type:"dropdown"},
    {name: "packet_spacing", label:"packet spacing", type:"dropdown"},
    {name: "packet_count", label:"stream size", type:"dropdown"},
    {name: "direction", label:"direction", type:"fixedradio"},
    {name: "family", label:"family", type:"fixedradio"},
];

AmpUdpstreamModal.prototype.update = function(name) {

    switch(name) {
        case 'source':
        case 'destination':
        case 'dscp':
        case 'packet_size':
        case 'packet_spacing':
        case 'packet_count':
            this.updateModalDialog(name); break;
        case 'direction':
        case 'family':
            this.updateFixedRadio(name); break;
        default:
            this.updateModalDialog(name); break;
      }
}

AmpUdpstreamModal.prototype.submit = function() {

    /* Reset currentView so our new selection will overwrite the
     * view rather than adding to it.
     */
    currentView = 0;

    this.submitAjax([
            this.getDropdownValue("source"),
            this.getDropdownValue("destination"),
            this.getDropdownValue("dscp"),
            this.getDropdownValue("packet_size"),
            this.getDropdownValue("packet_spacing"),
            this.getDropdownValue("packet_count"),
            this.getRadioValue("direction"),
            this.getRadioValue("family")
    ], this.collection);
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
