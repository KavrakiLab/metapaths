/* TODO: the same modal is used for different hub views; need a way to clear
   out previously viewed hub and update with the requested one */

function open_modal(data_graph) {
   $("#hub-modal-title")[0].innerText = "Internal Hub Paths: " + hub_info.source + " to " + hub_info.target;

   load_hub_viz(data_graph);

    // Show the hub visualization
   $("#hub-modal").modal();
}


function load_hub_viz(data_graph) {

} // load_hub_viz

