$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});
});

function upload() {
    var graph_file = $('#graph-data')[0].files[0];

    if (graph_file == null) {
        alert("Select a proper file to visualize.");
    } else if (graph_file.type != "application/json") {
        alert("Invalid filtype selected! Graph data must be in JSON format.");
    } else {
        var reader = new FileReader();

        // Define what to do when the file is read
        reader.onload = function(event){
            // Get the file contents which are stored in the event's result by
            // readAsText() when it completes
            validate_and_vizualize(event.target.result);
        }

        // Read the file
        reader.readAsText(graph_file);
    }
}

function validate_and_vizualize(file_contents) {
    try {
        var graph = JSON.parse(file_contents);

        // Store the file contents so that it is available to the visualization page
        localStorage.setItem("graph-data", JSON.stringify(graph));

        // Navigate to the visualization page
        location.assign("/visualize");
    } catch (exception) {
        alert("An error occured, please verify the file and try again.\n\n" + exception);
    }
}
