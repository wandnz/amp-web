function LPIFlowsModal(/*stream*/) {
    Modal.call(this);
}

LPIFlowsModal.prototype = new LPIBaseModal();
LPIFlowsModal.prototype.constructor = LPIFlowsModal;
LPIFlowsModal.prototype.collection = "lpi-flows";

LPIFlowsModal.prototype.submit = function() {
    /* get new view id */
    var source, protocol, user, direction, metric;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#protocol option:selected").val() != this.marker ) {
        protocol = $("#protocol option:selected").val().trim();
    } else {
        protocol = "";
    }

    if ( $("#user option:selected").val() != this.marker ) {
        user = $("#user option:selected").val().trim();
    } else {
        user = "";
    }

    direction = $("[name=direction]:checked").val();
    metric = $("[name=metric]:checked").val();

    if ( source != "" && protocol != "" && direction != "" && metric != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentview + "/" + source + "/" + protocol + "/" + user +
                "/" + metric + "/" + direction + "/",
            success: this.finish,
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
