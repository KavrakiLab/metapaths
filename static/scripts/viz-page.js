$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});
    $("#graph-data")[0].focus()
});

// TODO: this line for testing only, remove
// validate_and_vizualize('{ "info" : { "start" : "A", "target" : "C", "atoms" : 3 }, "nodes": [ {"id": "A"}, {"id": "B"}, {"id": "C"} ], "links": [ {"source": "A", "target": "B", "value": 6}, {"source": "B", "target": "C", "value": 1} ] }');

function upload() {
    var graph_file = $('#graph-data')[0].files[0];

    if (graph_file == null) {
        alert("Select a proper file to visualize.");
    } else if (graph_file.type != "application/json") {
        alert("Invalid filtype selected! Graph data must be in JSON format.");
    } else {
        try {
            var reader = new FileReader();
            // Define what to do when the file is read
            reader.onload = function(event){
                // Get the file contents which are stored in the event's result by
                // readAsText() when it completes
                validate_and_vizualize(event.target.result);
            }

            reader.readAsText(graph_file);
        } catch (exception) {
            alert("An error occurred. Please retry the last operation.\n\n" + exception);
        }
    }
}


function validate_and_vizualize(file_contents) {
    try {
        // The pathway info from file
        var json_pathways = JSON.parse(file_contents);

        // The aggreate data of the nodes and links from the pathways
        var data_graph = collect_pathways_into_graph(json_pathways);

        var viz_graph = load_viz(data_graph);

        // get_kegg_data(data_graph);

        stylize(json_pathways.info);

        attach_watchers(viz_graph);

        // Make the viz visible
        $("#viz")[0].style.visibility = "visible";
    } catch (exception) {
        alert("An error occurred, please verify the file and try again.\n\n" + exception);
    }
}


function collect_pathways_into_graph(json_pathways) {
    var nodes  = [];
    var links = [];

    console.log(json_pathways);
    json_pathways.pathways.forEach(function (pathway, index, array) {
        nodes = nodes.concat(pathway.nodes);
        nodes = nodes.concat(pathway.hub_nodes);
        links = links.concat(pathway.links);
        links = links.concat(pathway.hub_links);
    });

    return {
        "nodes" : nodes,
        "links" : links,
    };
}


function load_viz(data_graph) {
    console.log(data_graph);

    var svg = d3.select("svg");
    width = $("#viz-column")[0].offsetWidth,
    height = $("#viz-column")[0].offsetHeight;

    // Let the viz fill up the available column space
    $("#viz")[0].style.width = width;
    $("#viz")[0].style.height = height;

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(-10))
        .force("center", d3.forceCenter(width / 2, height / 2));

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data_graph.links)
        .enter().append("line");

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(data_graph.nodes)
        .enter().append("circle")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("title")
        .text(function(node) { return node.id; });

    simulation
        .nodes(data_graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data_graph.links);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    } // ticked

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // TODO
    return {"node" : node, "link" : link};
}


function stylize(graph_info) {
    // Hide the upload panel
    $("#load-panel")[0].style.display = "none";

    $("#title")[0].innerHTML = generate_title(graph_info);

    // Show the info panel and options
    $("#info-panel")[0].style.visibility = "visible";
    $("#options-column")[0].style.visibility = "visible";
}


function generate_title(graph_info) {
    var title = graph_info.start + " &#8594; " + graph_info.target;
    title += " (" + graph_info.atoms + " atoms)"
    return title;
}


function get_node_color(graph_info, node) {
    if (node.id === graph_info.start) {
        return "#0f0";
    } else if (node.id === graph_info.target) {
        return "#f00";
    } else {
        return "#555";
    }
}


function attach_watchers(viz_graph) {
    viz_graph.node.on("click", function(node) {
        update_info_panel(node.id);
    });

    viz_graph.node.on("dblclick", function(node) {
        // console.log("dblclick", node);
    });

    viz_graph.node.on("mouseover", function(node) {
        // console.log("mouseover", node);
    });

    viz_graph.node.on("mouseout", function(node) {
        // console.log("mouseout", node);
    });
}


function update_info_panel(node_id) {
    // TODO: what other data should be displayed here?
    $("#info-panel-body")[0].innerHTML = node_id;
}


function get_kegg_data(graph) {
    var KEGG_REST_URL = "http://rest.kegg.jp/get/";

    graph.nodes.forEach(function (node, index, array) {
        // TODO
        $.get(KEGG_REST_URL + node.id, function (data) {
            console.log(data);
        });
    });
}




