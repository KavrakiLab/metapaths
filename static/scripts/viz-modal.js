
function open_modal(hub_info) {
   $("#hub-modal-title")[0].innerText = "Internal Hub Paths: " + hub_info.source + " to " + hub_info.target;
   $("#hub-modal").modal();
}



