/* Globals */
var KEGG_REST_URL = "http://togows.org/entry/kegg-compound/";
var KEGG_ENTRY_URL = "http://www.kegg.jp/dbget-bin/www_bget?";
var KEGG_FIGURE_URL = "http://www.kegg.jp/Fig/compound/";
var kegg_data = {};

$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});
    $("#graph-data")[0].focus()
});

// TODO: this line for testing only, remove
validate_and_visualize('{ "info" : { "start" : "C00031", "target" : "C00492" }, "pathways" : [ { "atoms" : 3, "nodes": [ {"id" : "C00031"}, {"id" : "C00492"} ], "hub_nodes" : [ {"id" : "C00022"}, {"id" : "C00036"} ], "internal_nodes" : [ {"id" : "RP04274"}, {"id" : "C03248"}, {"id" : "RP03811"}, {"id" : "C03981"}, {"id" : "RP09148"} ], "links" : [ {"source": "C00031", "target": "C00022"}, {"source": "C00036", "target": "C00492"} ], "hub_links": [ {"source": "C00022", "target": "C00036"} ], "internal_links": [ {"source": "C00022", "target": "RP04274"}, {"source": "RP04274", "target": "C03248"}, {"source": "C03248", "target": "RP03811"}, {"source": "C03981", "target": "RP09148"}, {"source": "RP09148", "target": "C00036"} ] } ] } ');

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
                validate_and_visualize(event.target.result);
            }

            reader.readAsText(graph_file);
        } catch (exception) {
            alert("An error occurred. Please retry the last operation.\n\n" + exception);
        }
    }
}


function validate_and_visualize(file_contents) {
    try {
        // The pathway info from file
        var json_pathways = JSON.parse(file_contents);

        // The aggreate data of the nodes and links from the pathways
        var data_graph = collect_pathways_into_graph(json_pathways);

        var viz_graph = load_viz(data_graph);
        console.log("viz_graph", viz_graph);

        get_kegg_data(data_graph);

        stylize(data_graph, viz_graph, json_pathways.info.start, json_pathways.info.target);

        attach_node_watchers(viz_graph);

        attach_link_watchers(viz_graph);

        // Make the viz visible
        $("#viz")[0].style.visibility = "visible";
    } catch (exception) {
        alert("An error occurred, please verify the file and try again.\n\n" + exception);
    }
} // validate_and_visualize


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

        pathway.hub_links.forEach(function (hub_link, index, array) {
            hub_links.push(get_link_id(hub_link));
        });
    });

    return {
        "nodes" : nodes,
        "links" : links,
        "hub_nodes" : hub_nodes,
        "hub_links" : hub_links,
        "start" : json_pathways.info.start,
        "target" : json_pathways.info.target
    };
} // collect_pathways_into_graph


function load_viz(data_graph) {
    var margin = {top: -5, right: -5, bottom: -5, left: -5},
        width = $("#viz-column")[0].offsetWidth - margin.left - margin.right,
        height = $("#viz-column")[0].offsetHeight - margin.top - margin.bottom;

    var drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    var zoom = d3.zoom()
        .scaleExtent([0.1,10])
        .on("zoom", function() {
            container.attr("transform", "translate(" + d3.event.transform.x + ',' + d3.event.transform.y + ")scale(" + d3.event.transform.k + ")");
        });

    var svg = d3.select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
            .call(zoom)
            .on("dblclick.zoom", null); // disable dblclick to zoom, since dblclick is used to release fixed nodes

    var rect = svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all");

    var container = svg.append("g");

    var link = container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data_graph.links)
        .enter().append("line")
        .attr("id", function(link) {return get_link_id(link);})
        .attr("class", function(link) {
            if (data_graph.hub_links.includes(get_link_id(link))) {
                return "hub-link";
            } else {
                return "link";
            }
        });

    link.data().forEach(function (l, index, array) {
        l.id = get_link_id(l);
        l.isHub = data_graph.hub_links.includes(l.id);
    })

    var node = container.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(data_graph.nodes)
        .enter().append("circle")
        .attr("id", function(node) {return node.id;})
        .attr("class", function(node) {
            if (node.id === data_graph.start) {
                return "start-node";
            } else if (node.id === data_graph.target) {
                return "target-node";
            } else if (data_graph.hub_nodes.includes(node.id)) {
                return "hub-node";
            } else {
                return "node";
            }
        })
        .call(drag);

    node.append("title")
        .text(function(node) { return node.id; });

    var label = container.append("g")
        .selectAll("text")
        .data(data_graph.nodes)
        .enter().append("text")
            .attr("class", "node-label")
            .text(function(d) { return d.id });

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(-10))
        .force("center", d3.forceCenter(width / 2, height / 2));

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
        label
            .attr("dx", function(d) { return d.x - 24; })
            .attr("dy", function(d) { return d.y - 24; });
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
} // load_viz


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


function get_kegg_data(data_graph) {
    var compounds = [];
    data_graph.nodes.forEach(function(node, index, array) {
        compounds.push(node.id);
    });

    // TODO: only get info that is needed
    var request_url = KEGG_REST_URL + compounds.join(",") + ".json";

    $.get(request_url).done(function (response) {
        response.forEach(function(entry, index, array) {
            // KEGG Data is a global object
            kegg_data[entry.entry_id] = entry;
        });

        initialize_info_panel(kegg_data);
    });

}


function initialize_info_panel(kegg_data) {
    $("#info-panel-body")[0].innerHTML = "Click on elements in the graph for more information.";
}


function attach_node_watchers(viz_graph) {
    viz_graph.node.on("click", function(node) {
        update_info_panel(node.id);
    });

    viz_graph.node.on("dblclick", function(node) {
        release_node(node);
    });

    viz_graph.node.on("mouseover", function(node) {
        $("#" + node.id)[0].style.stroke = "#aaa";
    });

    viz_graph.node.on("mouseout", function(node) {
        $("#" + node.id)[0].style.stroke = "";
    });

    function release_node(node) {
        node.fixed = false;
        node.fx = null;
        node.fy = null;
    }
}


function attach_link_watchers(viz_graph) {
    viz_graph.link.on("click", function(link) {
        if (link.isHub) {
            // viz-modal.js
            open_modal({
                source: link.source.id,
                target: link.target.id
            });
        }
    });

    viz_graph.link.on("dblclick", function(link) {
    });

    viz_graph.link.on("mouseover", function(link) {
        if (link.isHub) {
            $("#" + link.id)[0].style.strokeWidth = 10;
        }
    });

    viz_graph.link.on("mouseout", function(link) {
        if (link.isHub) {
            $("#" + link.id)[0].style.strokeWidth = 6;
        }
    });
}


function update_info_panel(id) {
    var entry = kegg_data[id];
    console.log("entry", entry);

    var name = "<a target=none href='" + KEGG_ENTRY_URL + id + "'>" + entry.name + "</a><br>";
    var image = "<img src='" + KEGG_FIGURE_URL + id + ".gif'></img><br>"
    var complete = "<a onclick=detail_popup('" + id +"')>View more</a>";

    $("#info-panel-body")[0].innerHTML = name + image + complete;
}


function get_link_id(link) {
    if (typeof(link.source) === "object") {
        return link.source.id + "-" + link.target.id;
    } else {
        return link.source + "-" + link.target;
    }
}


function detail_popup(id) {
    // TODO: better way of doing this
    alert(JSON.stringify(kegg_data[id], null, 2));
}
