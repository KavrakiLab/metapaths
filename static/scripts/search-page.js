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
        reader.onload = function(event) {
            // Get the file contents which are stored in the event's result
            // by readAsText() when it completes
            var file_contents = event.target.result;

            // Parse the text into a JSON object
            var graph_json = JSON.parse(file_contents);
            console.log(graph_json);
        }

        // Read the file
        reader.readAsText(graph_file);
    }
}
