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

function AmpYoutubeModal () {
    Modal.call(this);
}

AmpYoutubeModal.prototype = new Modal();
AmpYoutubeModal.prototype.constructor = AmpYoutubeModal;
AmpYoutubeModal.prototype.collection = "amp-youtube";

AmpYoutubeModal.prototype.selectables = [
    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "Video ID", type: "dropdown", encode: true },
    { name: "quality", label: "quality", type: "dropdown" },
]

AmpYoutubeModal.prototype.update = function(name) {
    switch (name) {
        /*
        case 'caching':
            this.updateSubmit(); break;
        */
        default:
            this.updateModalDialog(name); break;
    };
}

AmpYoutubeModal.prototype.submit = function() {
    var source = this.getDropdownValue("source");
    var target = this.getDropdownValue("destination", true);
    var quality = this.getDropdownValue("quality");

    this.submitAjax([source, target, quality], "amp-youtube");
}

AmpYoutubeModal.prototype.translateSelection = function(sel, fieldname) {

    if (fieldname == "destination") {
        return this.decodeValue(sel);
    }

    return sel;
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
