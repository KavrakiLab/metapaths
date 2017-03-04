$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});
    $("#graph-data")[0].focus()
});

// TODO: this line for testing only, remove
validate_and_vizualize('{ "info" : { "start" : "C00031", "target" : "C00492" }, "pathways" : [ { "atoms" : 3, "nodes": [ {"id" : "C00031"}, {"id" : "C00492"} ], "hub_nodes" : [ {"id" : "C00022"}, {"id" : "C00036"} ], "internal_nodes" : [ {"id" : "RP04274"}, {"id" : "C03248"}, {"id" : "RP03811"}, {"id" : "C03981"}, {"id" : "RP09148"} ], "links" : [ {"source": "C00031", "target": "C00022"}, {"source": "C00036", "target": "C00492"} ], "hub_links": [ {"source": "C00022", "target": "C00036"} ], "internal_links": [ {"source": "C00022", "target": "RP04274"}, {"source": "RP04274", "target": "C03248"}, {"source": "C03248", "target": "RP03811"}, {"source": "C03981", "target": "RP09148"}, {"source": "RP09148", "target": "C00036"} ] } ] } ');

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

        stylize(data_graph, viz_graph, json_pathways.info.start, json_pathways.info.target);

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

    // Subset of nodes and links which are hubs
    var hub_nodes = [];
    var hub_links = [];

    json_pathways.pathways.forEach(function (pathway, index, array) {
        nodes = nodes.concat(pathway.nodes);
        nodes = nodes.concat(pathway.hub_nodes);
        links = links.concat(pathway.links);
        links = links.concat(pathway.hub_links);

        pathway.hub_nodes.forEach(function (hub_node, index, array) {
            hub_nodes.push(hub_node.id);
        });

        hub_links = hub_links.concat(pathway.hub_links);
    });

    return {
        "nodes" : nodes,
        "links" : links,
        "hub_nodes" : hub_nodes,
        "hub_links" : hub_links
    };
}


function load_viz(data_graph) {

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
        .attr("id", function(node) {return node.id;})
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
        d.fixed = true;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
    }

    return {"node" : node, "link" : link};
}


function stylize(data_graph, viz_graph, start, target) {
    // Hide the upload panel
    $("#load-panel")[0].style.display = "none";

    $("#title")[0].innerHTML = generate_title(start, target);


    style_nodes(viz_graph, start, target, data_graph.hub_nodes);




    // Show the info panel and options
    $("#info-panel")[0].style.visibility = "visible";
    $("#options-column")[0].style.visibility = "visible";
}


function generate_title(start, target) {
    var title = start + " &#8594; " + target;
    return title;
}


function style_nodes(viz_graph, start, target, hub_nodes) {

    // Color the nodes based on the type
    viz_graph.node.style("fill", function(node){
        return get_node_color(node, start, target, hub_nodes)
    });

    viz_graph.node.data().forEach(function (node, index, array) {
        var mid_y = $("#viz-column")[0].offsetHeight / 2;
        var end_x = $("#viz-column")[0].offsetWidth - 50;
        if (node.id === start) {
            node.fixed = true;
            node.fx = 50;
            node.fy = mid_y;
        } else if (node.id === target) {
            node.fixed = true;
            node.fx = end_x;
            node.fy = mid_y;
        } else if (hub_nodes.includes(node.id)) {

        }
    });

}


function get_node_color(node, start, target, hub_nodes) {
    if (node.id === start) {
        return "#0f0";
    } else if (node.id === target) {
        return "#f00";
    } else if (hub_nodes.includes(node.id) == true) {
        return "#efc406";
    } else {
        return "#555";
    }
}


function attach_watchers(viz_graph) {
    viz_graph.node.on("click", function(node) {
        update_info_panel(node.id);
    });

    viz_graph.node.on("dblclick", function(node) {
        release_node(node);
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


function release_node(node) {
    node.fixed = false;
    node.fx = null;
    node.fy = null;
}


