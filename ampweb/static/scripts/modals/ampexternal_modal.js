/*
 * This file is part of amp-web.
 *
 * Copyright (C) 2013-2019 The University of Waikato, Hamilton, New Zealand.
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

function AmpExternalModal () {
    Modal.call(this);
}

AmpExternalModal.prototype = new Modal();
AmpExternalModal.prototype.constructor = AmpExternalModal;
AmpExternalModal.prototype.collection = "amp-external";

AmpExternalModal.prototype.selectables = [
    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "destination", type: "dropdown" },
    { name: "command", label: "command", type: "dropdown" },
]

AmpExternalModal.prototype.update = function(name) {
    switch (name) {
        default:
            this.updateModalDialog(name); break;
    };
}

AmpExternalModal.prototype.submit = function() {
    var source = this.getDropdownValue("source");
    var target = this.getDropdownValue("destination");
    var command = this.getDropdownValue("command");

    this.submitAjax([source, target, command], "amp-external");
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
