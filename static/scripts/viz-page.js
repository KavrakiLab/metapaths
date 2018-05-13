/* Globals */
var KEGG_REST_URL = "http://togows.org/entry/kegg-compound/";
var KEGG_ENTRY_URL = "http://www.kegg.jp/dbget-bin/www_bget?";
var KEGG_FIGURE_URL = "http://www.kegg.jp/Fig/compound/";
var kegg_data = {};
var orig_pathways;
var main_pathways;
var main_path_width = -1;
var hub_path_width = -1;
var charge_force = 50;
var current_main_pathways = {};

// Holds the full viz while the hub view is displayed
var full_viz;

// Key: str hub link id, eg: "C00103-C0085"
// Val: pathways the make up the hub link
var orig_hub_pathways = {};
var hub_pathways = {};

// If hub view is displayed, contains the hub link id. Otherwise, empty string.
var shown_hub = "";
/* End of Globals */


$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'}); // Enable popover

    path_components = window.location.pathname.split("/");
    if (path_components.length === 3) {
        var search_id = path_components[2];
        console.log(search_id);
        $("#load-panel").hide();
        load_search_result(search_id);
    } else {
        $("#graph-data")[0].focus();
    }
});

$( function() {

    $( "#max-len-slider" ).slider({
        max: 13,
        value: 10
    })
    .each(function() {
        var opt = $(this).data().uiSlider.options;
         var vals = opt.max - opt.min;
         for (var i = 0; i <= vals; i++) {
             var el = $('<label>' + (i + opt.min) + '</label>').css('left', (i/vals*100) + '%');
             $("#max-len-slider").append(el);
        }
    });
    
    // $(document).ready(function() {
    //     var opt = $("#max-len-slider").data().uiSlider.options;
    //     var vals = opt.max - opt.min;
    //     for (var i = 0; i <= vals; i++) {
    //         var el = $('<label>' + (i + opt.min) + '</label>').css('left', (i/vals*100) + '%');
    //         $("#max-len-slider".append(el))
    //     }
    // });

    $("#max-len-slider" ).on('slide', function(ev) {
            var newValue = $("#max-len-slider" ).slider("option","value");
            $("#max-path-len").val(newValue);
            apply_filters();
    });

    $( "#min-carbons-slider" ).slider({
        max: 10,
        value: 2
    })
    .each(function() {
        var opt = $(this).data().uiSlider.options;
         var vals = opt.max - opt.min;
         for (var i = 0; i <= vals; i++) {
             var el = $('<label>' + (i + opt.min) + '</label>').css('left', (i/vals*100) + '%');
             $("#min-carbons-slider").append(el);
        }
    });

    $("#min-carbons-slider" ).on('slide', function(ev) {
        var newValue = $("#min-carbons-slider" ).slider("option","value");
        $("#min-carbons-conserved").val(newValue);
        apply_filters();
    });

        // Force slider
    $( "#force-slider" ).slider({
        max: 60,
        value: 10
    });

    $("#force-slider").on('slidestart', function(ev) {
        oldValue = $("#force-slider").slider("option","value");
    });

    $("#force-slider").on('slidestop', function(ev) {
        var newValue = $("#force-slider").slider("option","value");
        if(oldValue != newValue) {
            alert("Value of force slider changed to " + newValue);
            charge_force = newValue;
            //if(current_main_pathways.length > 0)
            //    validate_and_visualize(current_main_pathways);
        }
    });

  });


function load_search_result(search_id) {
    // localStorage.removeItem("search_id"); // TODO: uncomment

    $.get("/load_results/" + search_id).done(function(data) {
        console.log(data);
        orig_pathways = JSON.parse(data); // Keep a copy of the original pathways
        main_pathways = JSON.parse(data); // This copy will be filtered

        // Get pathways between hubs from the server
        get_hub_pathways(main_pathways.pathways, main_pathways.hub_db);

        // Visualize the pathways
        current_main_pathways = main_pathways;
        validate_and_visualize(main_pathways);
    }).fail(function(data) {
        console.log(data);
        // alert("Failed to retrieve search result.")
        // location.assign("/");
    });
}


function execute_file_upload(query) {
    console.log("Sending file: ", query);

    $.ajax({
        url: "/upload_path_file",
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: query,
        traditional: true,
        success: function(response) {
            var search_id = response["search_id"];

            var results_url = window.location.href + "visualize/" + search_id;

            var alert_html = "<br><div class='alert alert-success alert-dismissible' role='alert'>";
            alert_html += "<button type='button' class='close' data-dismiss='alert' aria-label='Close'> <span aria-hidden='true'>&times;</span></button>"
            alert_html += "Your pathway file has been submitted. The results can be viewed at this link: <a href='" + results_url + "'>" + results_url + "</a>"
            alert_html += "<div>"

            $("#alert-location-2").html(alert_html);

        }
    });
}

function uploadPaths() {
    var path_file = $('#path-data')[0].files[0];

    if (path_file == null) {
        alert("Select a proper file to visualize.");
    } else {
        try {
            var reader = new FileReader();
            // Define what to do when the file is read
            reader.onload = function(event){
                // Get the file contents which are stored in the event's result by
                // readAsText() when it completes
                try {
                    var query = {
                        "paths" : event.target.result,
                        "hub_db" : "UnionHubDB_10",
                    }
                    execute_file_upload(query);
                } catch (exception) {
                    alert("An error occurred, please verify the file and try again.\n\n" + exception);
                }
            }

            reader.readAsText(path_file);
        } catch (exception) {
            alert("An error occurred. Please retry the last operation.\n\n" + exception);
        }
    }
}

function uploadGraph() {
    var graph_file = $('#graph-data')[0].files[0];

    if (graph_file == null) {
        alert("Select a proper file to visualize.");
    } else if (graph_file.type != "application/json" && graph_file.name.split(".")[1] != "json") {
        alert("Invalid file type selected! Graph data must be in JSON format.");
    } 
    else {
        try {
            var reader = new FileReader();
            // Define what to do when the file is read
            reader.onload = function(event){
                // Get the file contents which are stored in the event's result by
                // readAsText() when it completes
                try {
                    main_pathways = JSON.parse(event.target.result);
                    validate_and_visualize(main_pathways);
                } catch (exception) {
                    alert("An error occurred, please verify the file and try again.\n\n" + exception);
                }
            }

            reader.readAsText(graph_file);
        } catch (exception) {
            alert("An error occurred. Please retry the last operation.\n\n" + exception);
        }
    }
}

function set_mins_and_maxes(pathways) {
	var max_atoms_conserved = 0
	var min_path_length = 100

	pathways.pathways.forEach(function (pathway, index, array) {
		// Atoms conserved
		var temp_atoms = pathway.atoms.length
		if(temp_atoms > max_atoms_conserved)
			max_atoms_conserved = temp_atoms

		// Path lengths
		var temp_length = pathway.links.length
		if(temp_length < min_path_length) {
			min_path_length = temp_length
		}
	});

	$('#max-len-slider').slider( "option", "min", min_path_length);
	$('#min-carbons-slider').slider("option", "max", max_atoms_conserved);
}

function validate_and_visualize(pathways) {
    // The aggreate data of the nodes and links from the pathways

    var data_graph = collect_pathways_into_graph(pathways);
    console.log("data_graph", data_graph);

    var num_path = pathways.pathways.length;
    console.log("num_paths", num_path);

    var viz_graph = load_viz(data_graph);
    console.log("viz_graph", viz_graph);

    get_kegg_data(data_graph.nodes);

    stylize(data_graph, viz_graph, pathways.info.start, pathways.info.goal)

    //stylize(data_graph, viz_graph, pathways.info.start, pathways.info.goal, pathways.background_hubs.b_nodes);

    attach_node_watchers(viz_graph);

    attach_link_watchers(viz_graph, data_graph);

    attach_motion_watcher(viz_graph);

    // Make the viz visible
    $("#viz")[0].style.visibility = "visible";
} // validate_and_visualize


function collect_pathways_into_graph(pathways) {
    var nodes  = new Set([]);
    var links = new Set([]);
    var canonical_nodes = new Set([]);
    var canonical_links = new Set([]);

    // Subset of nodes and links which are hubs
    var hub_nodes = new Set([]);
    var hub_links = new Set([]);

    pathways.pathways.forEach(function (pathway, index, array) {
        nodes = new Set([...nodes, ...pathway.nodes]);
        nodes = new Set([...nodes, ...pathway.hub_nodes]);
        links = new Set([...links, ...pathway.links]);
        links = new Set([...links, ...pathway.hub_links]);

        if(pathway.canonical == true) {
            canonical_nodes = new Set([...canonical_nodes,...pathway.nodes]);
            canonical_nodes = new Set([...canonical_nodes,...pathway.hub_nodes]);
            canonical_links = new Set([...canonical_links,...pathway.links]);
            canonical_links = new Set([...canonical_links,...pathway.hub_links]);
        }

        pathway.hub_nodes.forEach(function (hub_node, index, array) {
            hub_nodes.add(hub_node);
        });

        pathway.hub_links.forEach(function (hub_link, index, array) {
            hub_links.add(hub_link);
        });

        if (pathway.links.length + pathway.hub_links.length > main_path_width) {
            main_path_width = pathway.links.length + pathway.hub_links.length;
        }
    });

    //var b_nodes = new Set(Object.keys(pathways.background_hubs.b_nodes));
    nodes = new Set([...nodes]);
    //nodes = new Set([...nodes, ...b_nodes]);

    //alert("Added nodes!");
    //links = new Set([...links, ...pathway.background_hubs.b_links]);

    //alert("Added links!");

    var node_list = [];
    nodes.forEach(function(node) {
        node_list.push({"id":node});
    });

    var link_list = [];
    links.forEach(function(link) {
        var compounds = link.split("-");
        link_list.push({"source":compounds[0], "target":compounds[1]});
    });

    var hub_node_list = Array.from(hub_nodes);
    var hub_link_list = Array.from(hub_links);
    var canonical_nodes_list = Array.from(canonical_nodes);
    var canonical_links_list = Array.from(canonical_links);

    //alert("Returning info soon!");
    return {
        "nodes" : node_list,
        "links" : link_list,
        "hub_nodes" : hub_node_list,
        "hub_links" : hub_link_list,
        "start" : pathways.info.start,
        "goal" : pathways.info.goal,
        "canonical_nodes" : canonical_nodes_list,
        "canonical_links" : canonical_links_list,
        "num_pathways" : pathways.pathways.length
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

    // If previous viz exists, remove it
    d3.select("#viz").remove();

    // Create an SVG to draw on
    d3.select("#viz-column").append("svg").attr("id", "viz")

    var svg = d3.select("#viz")
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
        .style("pointer-events", "all")
        .on("contextmenu", function (d, i) {
           // suppress default right-click menu
            d3.event.preventDefault();
        });

    var container = svg.append("g");

    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "15")
        .attr("refY", "5")
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", "10")
        .attr("markerHeight", "5")
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("fill", "#555");

    var link = container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data_graph.links)
        .enter().append("line")
        .attr("id", function(link) {return get_link_id(link);})
        .attr("class", function(link) {
            if (data_graph.hub_links.includes(get_link_id(link))) {
                return "hub-link";
            } else if (data_graph.canonical_links.includes(get_link_id(link))){
                return "canonical-link";
            } else {
                return "link";
            }
        })
        .attr("marker-end", "url(#arrowhead)");

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
            } else if (node.id === data_graph.goal) {
                return "goal-node";
            } else if (data_graph.hub_nodes.includes(node.id)) {
                return "hub-node";
            } else if (data_graph.canonical_nodes.includes(node.id)) {
                return "canonical-node";
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
        .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(-5).strength(1.0))
        .force("charge", d3.forceCollide(charge_force))
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


function stylize(data_graph, viz_graph, start, goal) {
    // Hide the upload panel
    $("#load-panel")[0].style.display = "none";

    $("#title")[0].innerHTML = generate_title(start, goal, data_graph.num_pathways);


    style_nodes(viz_graph, start, goal, data_graph.hub_nodes);

    // Show the info panel and options
    $("#info-panel")[0].style.visibility = "visible";
    $("#options-column")[0].style.visibility = "visible";
}

function stylize(data_graph, viz_graph, start, goal, b_nodes) {
    // Hide the upload panel
    $("#load-panel")[0].style.display = "none";

    $("#title")[0].innerHTML = generate_title(start, goal, data_graph.num_pathways);


    style_nodes(viz_graph, start, goal, data_graph.hub_nodes, b_nodes);

    // Show the info panel and options
    $("#info-panel")[0].style.visibility = "visible";
    $("#options-column")[0].style.visibility = "visible";
}


function generate_title(start, goal, count) {
    return start + " &#8594; " + goal + " (" + count + " paths)";
}


function style_nodes(viz_graph, start, goal, hub_nodes) {

    viz_graph.node.data().forEach(function (node, index, array) {
        if (node.id === start) {
            var mid_x = $("#viz-column")[0].offsetWidth / 2;
            var mid_y = $("#viz-column")[0].offsetHeight / 2;
            var main_viz_width = main_path_width * 100 // Num edges in the first path times 30px per edge
            left_x = mid_x - (0.5 * main_viz_width);

            node.fixed = true;
            node.fx = left_x;
            node.fy = mid_y;
        } else if (node.id === goal) {
            var mid_x = $("#viz-column")[0].offsetWidth / 2;
            var mid_y = $("#viz-column")[0].offsetHeight / 2;
            var main_viz_width = main_path_width * 100 // Num edges in the first path times 30px per edge
            right_x = mid_x + (0.5 * main_viz_width);

            node.fixed = true;
            node.fx = right_x;
            node.fy = mid_y;
        } else if (hub_nodes.includes(node.id)) {

        }

    });

}

function style_nodes(viz_graph, start, goal, hub_nodes, b_nodes) {

    //alert("b_nodes: " + b_nodes);
    var b_nodes_list = [];
    if(b_nodes != null) {
        b_nodes_list = Object.keys(b_nodes);
    }
    viz_graph.node.data().forEach(function (node, index, array) {
        if (node.id === start) {
            var mid_x = $("#viz-column")[0].offsetWidth / 2;
            var mid_y = $("#viz-column")[0].offsetHeight / 2;
            var main_viz_width = main_path_width * 100 // Num edges in the first path times 30px per edge
            left_x = mid_x - (0.5 * main_viz_width);

            node.fixed = true;
            node.fx = left_x;
            node.fy = mid_y;
        } else if (node.id === goal) {
            var mid_x = $("#viz-column")[0].offsetWidth / 2;
            var mid_y = $("#viz-column")[0].offsetHeight / 2;
            var main_viz_width = main_path_width * 100 // Num edges in the first path times 30px per edge
            right_x = mid_x + (0.5 * main_viz_width);

            node.fixed = true;
            node.fx = right_x;
            node.fy = mid_y;
        } else if (hub_nodes.includes(node.id)) {

        } else if (b_nodes_list.includes(node.id)) {
            var mid_x = $("#viz-column")[0].offsetWidth / 2;
            var mid_y = $("#viz-column")[0].offsetHeight / 2;
            var main_viz_width = main_path_width * 100 // Num edges in the first path times 30px per edge
            //alert("x: " + b_nodes[node.id][0]);
            //alert("y: " + b_nodes[node.id][1]);
            actual_x = mid_x + (b_nodes[node.id][0] * main_viz_width);
            actual_y = mid_y + (b_nodes[node.id][1] * $("#viz-column")[0].offsetHeight);

            node.fx = actual_x;
            node.fy = actual_y;
        }

    });

}


function get_kegg_data(graph_nodes) {
    var compounds = [];
    graph_nodes.forEach(function(node, index, array) {
        compounds.push(node.id);
    });

    // TODO: only get info that is needed
    var request_url = KEGG_REST_URL + compounds.join(",") + ".json";

    $.get(request_url).done(function (response) {
        response.forEach(function(entry, index, array) {
            // KEGG Data is a global object
            if (entry != null) { // TODO: is this check needed?
                kegg_data[entry.entry_id] = entry;
            }
        });

        initialize_info_panel();
        initialize_search_panel();
    });

}


function initialize_info_panel() {
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
        $("#" + node.id)[0].style.strokeWidth = "3px";
    });

    viz_graph.node.on("mouseout", function(node) {
        $("#" + node.id)[0].style.stroke = "";
    });

    viz_graph.node.on("contextmenu", d3.contextMenu([
        {
            title: 'Exclude Compound',
            action: function(elm, node, i) {
                add_excluded_node(node.id);
                apply_filters();
            },
        },
        {
            title: 'Include Compound',
            action: function(elm, node, i) {
                add_included_node(node.id);
                apply_filters();
            }
        }
    ]));

    function release_node(node) {
        node.fixed = false;
        node.fx = null;
        node.fy = null;
    }
}


function attach_link_watchers(viz_graph, data_graph) {
    viz_graph.link.on("click", function(link) {
        if (link.isHub) {
            $("#" + link.id)[0].style.stroke = "#555";

            // from viz-modal.js
            init_hub_view(link);
        }
    });

    viz_graph.link.on("dblclick", function(link) {
    });

    viz_graph.link.on("mouseover", function(link) {
        if (link.isHub) {
            $("#" + link.id)[0].style.stroke = "#999";
        }
    });

    viz_graph.link.on("mouseout", function(link) {
        if (link.isHub && $("#" + link.id)[0]) {
            $("#" + link.id)[0].style.stroke = "#555";
        }
    });
}

function attach_motion_watcher(viz_graph) {
    $("#motion-toggle")[0].onclick = function() {
        if ($("#motion-toggle").hasClass("active")) {
            viz_graph.node.data().forEach(function (node, index, array) {
                node.fixed = true;
            });
            $("#motion-toggle").removeClass("active");
        } else {
            viz_graph.node.data().forEach(function (node, index, array) {
                node.fixed = false;
            });
            $("#motion-toggle").addClass("active");
        }
    };
}

function update_info_panel(id) {
    var entry = kegg_data[id];

    var link = "<h4><a target=none href='" + KEGG_ENTRY_URL + id + "'>" + entry.name + "</a></h4>";
    var image = "<img src='" + KEGG_FIGURE_URL + id + ".gif'></img><br>";
    var more_info = "<a onclick=detail_popup('" + id +"')>more info</a><br>";

    $("#info-panel-body")[0].innerHTML = link + image + more_info;
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

function export_filtered() {
    export_json(JSON.stringify(main_pathways));
}

function export_original() {
    export_json(JSON.stringify(orig_pathways));
}

function export_json(data) {
    var blob = new Blob([data], {type: "application/json"});
window.open(window.URL.createObjectURL(blob), "_blank");
}
