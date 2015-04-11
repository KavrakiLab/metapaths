// console.clear(); // clears the in-browser devleoper console on page refresh

// temporary hard coded filenames

// var pathwaysFilename = "paths/mini/Mini_C31C78Pathways.json";
// var nodesMapFilename = "paths/mini/Mini_C31C78NodesMap.json";
// var linkWeightsFilename = "paths/mini/Mini_C31C78LinkWeights.json";

// var pathwaysFilename = "paths/full/Full_C31C78Pathways.json";
// var nodesMapFilename = "paths/full/Full_C31C78NodesMap.json";
// var linkWeightsFilename = "paths/full/Full_C31C78LinkWeights.json";

var pathwaysFilename = localStorage["pathwaysFilename"];
var nodesMapFilename = localStorage["nodesMapFilename"];
var linkWeightsFilename = localStorage["linkWeightsFilename"];

/////////////// GLOBAL VARIABLES ///////////////

var allPathways = [];
var displayedPaths = [];
var displayedPathIndex = -1; // the index of the currently displayed path in allPathways. -1 if all of allPathways are being displayed
var originalPathways = [];
var nodesMap = new Object();
var linkWeights = new Object();
var graph = new Object();
var startNode;
var endNode;
var globalIgnoredNodes = [];
var globalIncludedNodes = [];
var sigNodes = [];
var edgeType = "lineOpacity"; // The style for dispalying edges. Either line width or line opacity
var showArrows = false; // Hide arrows by default, user can toggle them back on
var margin = {top: -5, right: -5, bottom: -5, left: -5};
var width = (window.innerWidth * .8) - 20;
var height = window.innerHeight - 60;
var compoundColor = "#26C281";
var reactionColor = "#333";
var endpointColor = "#8c5f9f";
var infoUrl = "http://www.genome.jp/dbget-bin/www_bget?";
var compoundImgUrl = "http://www.genome.jp/Fig/compound/";
var reactionImgUrl = "http://www.genome.jp/Fig/rpair/";

/////////////// DATA LOADING ///////////////

// read the data and begin the visualization
loadPaths();

function loadPaths(){
	d3.json(pathwaysFilename, function(error, json) {
		if (error)
			return console.warn(error);
		
		// console.log("Read in pathways: ", json);
		
		// store the list of pathways globally
		allPathways = json;
		originalPathways = json; // a backup, to undo filtering
		displayedPaths = allPathways; // initially we will display all the pathways
		
		genGraph(displayedPaths); // generate the graph with the loaded pathways
		
		
		
		d3.json(nodesMapFilename, function(error, json) {
			if (error)
				return console.warn(error);
					
			// console.log("Read in nodes map: ", json);
		
			// store the nodesMap globally
			nodesMap = json;
			
			d3.json(linkWeightsFilename, function(error, json) {
				if (error)
					return console.warn(error);
		
				// console.log("Read in link weights: ", json);
		
				// store the link weights globally
				linkWeights = json;
					
				// now that we have the link weights, we are ready to draw the graph
				drawGraph();
		
				document.getElementById("filtering").style.display = 'block';
				document.getElementById("map").style.visibility = 'visible';
				document.getElementById("map").style.display = 'block';
			});
			
		});
		
	});
}

function setStartAndEnd(){
	/*
	 * Finds and sets this graphs start and end nodes.
	 * Does so by getting the first and last nodes in the first path.
	 */
	startNode = originalPathways[0].nodes[0];
	endNode = originalPathways[0].nodes[originalPathways[0].nodes.length - 1];
	
	startNode.fixed = true;
	endNode.fixed = true;
	
	// console.log("Start node: ", startNode);
	// console.log("End node: ", endNode);
}


/////////////// GRAPH GENERATION ///////////////


function genGraph(pathways){
	// console.log("Pathways in genGraph: ", pathways);
	var allNodes = [];
	var allLinks = [];
	var seenNodes = [];
	var seenLinks = [];
	
	setStartAndEnd();
	
	// iterate through each path in pathways
	for(var i = 0; i < pathways.length; i++){
		var path = pathways[i];
		// console.log("Each path: ", path);
		
		// iterate through each node in the path and add it to the overall nodes
		for(var n = 0; n < path.nodes.length; n++){
			var node = path.nodes[n]; // the current node
			
			// if we haven't seen this node before, add it
			if(seenNodes.indexOf(node.id) == -1){
				seenNodes.push(node.id)
				
				
				
				//TODO: temporary fix
				// sets the starting and ending nodes to a fixed position
				if(node.id == startNode.id){
					node.fixed = true;
					node.x = findMaxPathLen() * -50;
					node.y = height / 2;
				}
				if(node.id == endNode.id){
					node.fixed = true;
					node.x = findMaxPathLen() * 50;
					node.y = height / 2;
				}
				if(sigNodes.indexOf(node.id) > -1){
					// fix the positions of significant nodes when linearized
					node.fixed = true;
					node.py = height / 2;
				} else {
					node.fixed = false;
				}
				
				
				allNodes.push(node);
				// console.log("Added: ", node.id);
			} else {
				// console.log(node.id, "is already in, skipped");
			}
		}
			

		// iterate through each link in the path and add it to the overall links
		for(var l = 0; l < path.links.length; l++){
			var link = path.links[l]; // the current link
			var linkIdentifier = link.source + "-" + link.target;
			
			// if we haven't seen this link before, add it
			if(seenLinks.indexOf(linkIdentifier) == -1){
				seenLinks.push(linkIdentifier);
				allLinks.push(link);
				// console.log("Added: ", linkIdentifier);
			} else {
				// console.log(linkIdentifier, "is already in, skipped");
			}

		}
	}
	
	
	// In the JSON, the links are given based on IDs, this function translates ID-based links into links based on indices	
	var edges = [];
	allLinks.forEach(function(e) {
		// console.log("E: ", e);
		var sourceNode = allNodes.filter(function(n) { return n.id === e.source; })[0];
		var targetNode = allNodes.filter(function(n) { return n.id === e.target; })[0];
		edges.push({source: sourceNode, target: targetNode, value: e.Value});
	});
	allLinks = edges;
	
	graph.nodes = allNodes;
	graph.links = allLinks;
	// alert("Pathways have been processed.");

}

function drawGraph(){
	// console.log("Graph: ", graph);
	
	// var nodeColor = "#64b566";
	// var nodeColor = "#86c588";
	// var reactionColor = "#FFF";
	// var endpointColor = "#00F";
	var nodeRadius = 10;
	var reactionRadius = 6;
	
	var tooltipVisible = false;

	var force = d3.layout.force()
		.charge(-200)
		.gravity(0.01)
		.linkDistance(1)
		.size([width + margin.left + margin.right, height + margin.top + margin.bottom]);

	var zoom = d3.behavior.zoom()
		.scaleExtent([0.1, 10])
		.on("zoom", zoomed);
	
	var drag = force.drag()
		.origin(function(d) { return d; })
		.on("dragstart", dragstarted)


	var svg = d3.select("#map").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.right + ")")
		.call(zoom).on("dblclick.zoom", null); // Enable zoom, but disable double click to zoom

	var rect = svg.append("rect")
		.attr("width", width)
		.attr("height", height)
		.style("fill", "none")
		.style("pointer-events", "all")
		.attr("id", "graph-rect");

	var container = svg.append("g");
	
	/* TEMPORARILY REMOVE BUGGY LINKS */
	graph.links.splice(310, 1);
	graph.links.splice(307, 1);
	graph.links.splice(285, 1);
	graph.links.splice(283, 1);
	graph.links.splice(282, 1);
	graph.links.splice(268, 1);
	graph.links.splice(267, 1);
	graph.links.splice(249, 1);
	graph.links.splice(248, 1);
	graph.links.splice(239, 1);
	graph.links.splice(238, 1);
	graph.links.splice(226, 1);
	graph.links.splice(225, 1);
	graph.links.splice(200, 1);
	graph.links.splice(199, 1);
	graph.links.splice(100, 1);
	graph.links.splice(86, 1);
	graph.links.splice(3, 1);

	/* DEBUGGING CODE FOR DETECTING BAD LINKS */
	// for (var i = 0; i < graph.links.length; i++) {
	// 	if (graph.links[i].source == null){
	// 		console.log("Bad source at index: " + i);
	// 		// console.log("The target here is: " + graph.links[i].target);
	// 	}
	// 	if (graph.links[i].target == null){
	// 		console.log("Bad target at index: " + i);
	// 		// console.log("The source here is: " + graph.links[i].source);
	// 	}
	// }
	
	
	force.nodes(graph.nodes)
		.links(graph.links)
		.start();
	
	svg.append("defs").append("marker")
		.attr("id", "arrowhead")
		.attr("refX", 6 + 3) /*must be smarter way to calculate shift*/
		.attr("refY", 2)
		.attr("markerWidth", 6)
		.attr("markerHeight", 4)
		.attr("orient", "auto")
		.append("path")
			.attr("d", "M 0,0 V 4 L6,2 Z") // draws arrow
			.attr("fill", "#FFF");

	var defs = svg.append('defs');
	defs.append("svg:marker")
	    .attr("id", "arrowGray")
	    .attr("viewBox", "0 0 10 10")
	    .attr("refX", "10")
	    .attr("refY", "5")
	    .attr("markerUnits", "strokeWidth")
	    .attr("markerWidth", "10")
	    .attr("markerHeight", "5")
	    .attr("orient", "auto")
	    .append("svg:path")
	    .attr("d", "M 0 0 L 10 5 L 0 10 z")
	    .attr("fill", "#ccc");

	var link = container.append("g")
		.attr("class", "links")
		.selectAll(".link")
		.data(graph.links)
		.enter().append("line")
		.attr("class", "link")
		.attr("marker-end", function(d){
			if(showArrows){
				return "url(#arrowGray)";
			} else {
				return null;
			}
		})
		.style("stroke", function(d) {
			if(edgeType == "lineWidth"){
				return "#ccc";
			}
			if(edgeType == "lineOpacity"){
				return "#000"
			}
		})
		.style("stroke-width", function(d) {
			if(edgeType == "lineWidth"){
				return setLinkWidth(d);
			}
			if(edgeType == "lineOpacity") {
				return 3;
			}
		})
		.style("stroke-opacity", function(d){
			if(edgeType == "lineWidth"){
				return 1;
			}
			if(edgeType == "lineOpacity"){
				return setLinkOpacity(d);
			}
		});

	var node = container.append("g")
		.attr("class", "nodes")
		.selectAll(".node")
		.data(graph.nodes)
		.enter().append("g")
		.attr("class", "node")
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
		.call(drag);
	
	var tooltip = d3.select("#map")
	    	.append("div")  // declare the tooltip div
	    	.attr("class", "tooltip");              // apply the 'tooltip' class
	
	setStartAndEnd();
	
	node.append("circle")
		// .attr("r", function(d) { return d.weight * 2; })
		.attr("r", function(d){
			if(d.id[0] == "C"){
				return nodeRadius;
			} else {
				return reactionRadius;
			}
		})
		.style("fill", function(d) { 
			if (d.id == startNode.id || d.id == endNode.id){
				return endpointColor;
			} else if(d.id[0] == "C"){
				return compoundColor;
			} else {
				return reactionColor;
			}
		});


	force.on("tick", function() {
		link.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

		node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
	});

	//TODO: Is this necessary?
	var linkedByIndex = {};
	graph.links.forEach(function(d) {
		linkedByIndex[d.source.index + "," + d.target.index] = 1;
	});


	node.on("mouseover", function(d){
		// highlights the node and the incoming/outgoing edges
		
		node.classed("node-active", function(o) {
			thisOpacity = isConnected(d, o) ? true : false;
			this.setAttribute('fill-opacity', thisOpacity);
			return thisOpacity;
		});

		link.classed("link-active", function(o) {
			return o.source === d || o.target === d ? true : false;
		});

		d3.select(this).classed("node-active", true);
	});
	
	node.on("mouseout", function(d){
		// unhighlights, unless this node has a tooltip open
		if(!tooltipVisible) {
			node.classed("node-active", false);
			link.classed("link-active", false);
		}
	});
	
	node.on("dblclick", function(d) {
		// release a node from its fixed position
		releaseNode(d);
		
	})
	
	node.on("click", function(d) {
		if(tooltipVisible){
			hideTooltip();
		}
	})

	node.on("contextmenu", function(d) {
		tooltipVisible = true;
		
		var tooltipBoundingRect = document.getElementById("map").getBoundingClientRect();
		// var tooltipYPosition = .top;
		var tooltipY = window.innerHeight - tooltipBoundingRect.height;
		
		// Displays the tooltip
		tooltip.html(tooltipHTML(d))
		// .style("left", d3.event.pageX + "px")
		.style("top", 317 + "px")
		.style('opacity', "0.9");
		
		// highlights the selected node
		node.classed("node-active", function(o) {
			thisOpacity = isConnected(d, o) ? true : false;
			this.setAttribute('fill-opacity', thisOpacity);
			return thisOpacity;
		});
		d3.select(this).classed("node-active", true);

	});
	
	d3.select("#map").on("contextmenu", function(){
		// prevents the regular conext menu for displaying
		d3.event.preventDefault();
	});
	
	d3.select("#map").on("click", function(){
		if(tooltipVisible){
			hideTooltip();
		}
	})

	// display the graph info column
	setGraphInfoHtml();

	function setLinkWidth(d){
		var key = d.source.id + "," + d.target.id;
		return Math.log(linkWeights[key]+1) * 2;
	}
	
	function setLinkOpacity(d){
		var key = d.source.id + "," + d.target.id;
		var opacity = linkWeights[key] / originalPathways.length;
		if(opacity > 0.02){
			return opacity;
		}
		return 0.02; // the minimum opacity, to avoid invisible edges
	}

	function tooltipHTML(d){
		var html;
		var viaPaths; // the number of paths that include the node
		
			
		var node = nodesMap[d.id];
		
		html = "";
		if(d.id[0] == "C"){
			html =
			"<strong>" + node.name + '</strong></br></br>' +
			"Compound: " +
			'<a href=\"' + infoUrl + node.id + '\" target=\"_blank\">' + node.id + '</a></br></br>\n' +
			'<a href=\"' + compoundImgUrl + node.id + '.gif' + '\" target=\"_blank\">' + '<img src=\"' + compoundImgUrl + node.id + '.gif\" ></img>' + '</a></br></br>\n'
		} 
		else {
			html = 
			node.reacName + '</br></br>\n' +
			"<strong>RPair: </strong>" +
			'<a href=\"' + infoUrl + node.id + '\" target=\"_blank\">' + node.id + '</a></br></br>\n' +
			"<strong>Reaction: </strong>" + node.reacID + '</br></br>\n' +
			'<strong>EC: </strong>' + node.ec + '</br></br>\n' +
			'<a href=\"' + reactionImgUrl + node.id + '.gif' + '\" target=\"_blank\">' + '<img src=\"' + reactionImgUrl + node.id + '.gif\" width=\'175px\'></img>' + '</a></br></br>\n'
		}
		
		if (displayedPathIndex == -1){
			if (d.id == startNode.id){
				html += nodesMap[d.id]["outgoing"] + " outgoing links</br></br>";
			} else {
				html += nodesMap[d.id]["incoming"] + " incoming links</br></br>";
			}
		
			html += "<button class='smallButton' onclick='removeNode("+ '"' + d.id + '"' + ")'>Remove paths through this node</button></br>" +
				"<button class='smallButton' onclick='includeNode("+ '"' + d.id + '"' + ")'>Include only paths through this node</button>";
		}
		
		
		return html;
	}
	
	function hideTooltip(){
		// hide the tooltip if the user clicks away
		tooltipVisible = false;
	
		// unhighlight node
		node.classed("node-active", false);
	
		// hide tooltip
		tooltip.html("")
			.style('opacity', 0);
	}

	function isConnected(a, b) {
		return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index];
	}
	
	function dottype(d) {
		d.x = +d.x;
		d.y = +d.y;
		return d;
	}

	function zoomed() {
		container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	}

	function dragstarted(d) {
		d3.event.sourceEvent.stopPropagation();
		d.fixed = true;
		// d3.select(this).classed("fixed", d.fixed = true);
	}

	function releaseNode(d) {
		d.fixed = false;
		// d3.select(this).classed("fixed", d.fixed = false);
	}

}


/////////////// GRAPH OPERATIONS ///////////////


function removeNode(name){
	var current = document.getElementById("ignoredCompounds").value;
	if(current == ""){
		document.getElementById("ignoredCompounds").value = name;
	} else {
		document.getElementById("ignoredCompounds").value = current + " " + name;
	}
	
	// hideTooltip();
	//
	// filter();
}

function includeNode(name){
	var current = document.getElementById("includedCompounds").value;
	if(current == ""){
		document.getElementById("includedCompounds").value = name;
	} else {
		document.getElementById("includedCompounds").value = current + " " + name;
	}
	
	// hideTooltip();
	//
	// filter();
}

function hideTooltip(){
	var tooltip = document.getElementsByClassName("tooltip")[0]
	// hide tooltip
	tooltip.style.opacity = 0;
}

function findMaxPathLen(){
	var curMax = 0;
	for(var i = 0; i < displayedPaths.length; i++){
		if(displayedPaths[i].links.length > curMax){
			curMax = displayedPaths[i].links.length;
		}
	}
	return curMax;
}

function viewFirst(){
	/* Modifying the page layout for viewing single pathways */
	displayedPathIndex = 0;
	// hide filtering options, since they are not needed for a single path
	document.getElementById("filteringContainer").style.display = "none"; 
	
	/* Clears current graph, loads the first path, draws the path */
	displayedPaths = [];
	sigNodes = [];
	displayedPaths.push(allPathways[0]);
	// remove the previous graph
	d3.selectAll("svg").remove();

	// reload with new data
	genGraph(displayedPaths);
	drawGraph();
}

function viewPrevPath(){
	if(displayedPathIndex == 0){
		// if we're at the first path, loop back to the last path
		displayedPathIndex = allPathways.length - 1;
	} else {
		// otherwise, go back one path
		displayedPathIndex -= 1;
	}
	
	/* Clears current graph, loads the first path, draws the path */
	displayedPaths = [];
	displayedPaths.push(allPathways[displayedPathIndex]);
	// remove the previous graph
	d3.selectAll("svg").remove();

	// reload with new data
	genGraph(displayedPaths);
	drawGraph();
}

function viewNextPath(){
	if(displayedPathIndex == allPathways.length - 1){
		// if we're at the last path, loop back to the first path
		displayedPathIndex = 0;
	} else {
		// otherwise, go forward one path
		displayedPathIndex += 1;
	}
	
	/* Clears current graph, loads the first path, draws the path */
	displayedPaths = [];
	displayedPaths.push(allPathways[displayedPathIndex]);
	// remove the previous graph
	d3.selectAll("svg").remove();

	// reload with new data
	genGraph(displayedPaths);
	drawGraph();
}

function viewAll(){
	displayedPathIndex = -1;
	
	// show filtering options, since we are now viewing all the paths
	document.getElementById("filteringContainer").style.display = "block";
	document.getElementById("firstPathButton").style.display = "block";
	
	reloadGraph(allPathways);
}

function linearize() {
	// Finds the most significant path that is being displayed and "linearizes" that path.
	// This means the path will will be straightened out and evenly spaced
	

	var mostSigPath; // The index of the most significant path
	var mostSigWeight = 0;
	
	// iterate through each path
	for(var p = 0; p < displayedPaths.length; p++){
		var currentPathWeight = 0; // The weight of this path
		var nodes = displayedPaths[p].nodes;
		
		// iterate through each node in this path
		for(var n = 1; n < nodes.length - 1; n++){
			var nodeID = nodes[n].id
			currentPathWeight += nodesMap[nodeID].incoming; // retrieve this node's weight from the nodesMap
		}
		if(currentPathWeight > mostSigWeight){
			// if this path is more significant than any previously found, this becomes the most significant path
			mostSigPath = p;
			mostSigWeight = currentPathWeight;
		}
	}
	// We now know which is the most significant path
	// console.log("Most sig path is at index: " + mostSigPath + " with weight: " + mostSigWeight);
	
	for(var n = 0; n < displayedPaths[mostSigPath].nodes.length; n++){
		// store which nodes are significant, will later be fixed positions
		sigNodes.push(displayedPaths[mostSigPath].nodes[n].id);
	}
	reloadGraph(displayedPaths);
}

/////////////// FILTERING FUNCTIONS ///////////////

function filter(){
	var ignoredNodesString = document.getElementById("ignoredCompounds").value;
	var includedNodesString = document.getElementById("includedCompounds").value;
	var maxLen = document.getElementById("maxLength").value;

	console.log("Passed in ignored compounds: " + ignoredNodesString);
	console.log("Passed in included compounds: " + includedNodesString);
	console.log("Passed in max length: " + maxLen);
	

	if(ignoredNodesString == "" && includedNodesString == "" && maxLen == ""){
		alert("Invalid filter options. Please try again.");
	}
	if(ignoredNodesString != ""){
		// if user specified compounds to exclude
		var ignoredNodes = ignoredNodesString.split(" ");
		for(var i = 0; i < ignoredNodes.length; i++){
			if(ignoredNodes[i] == startNode.id || ignoredNodes[i] == endNode.id){
				alert("Cannot ignore start or end compounds")
				return;
			}
		}
		allPathways = removeThese(ignoredNodes); // find the filtered pathways
	}
	if(includedNodesString != ""){
		// if user specified compounds to exclude
		var includedNodes = includedNodesString.split(" ");
		for(var i = 0; i < includedNodes.length; i++){
			if(includedNodes[i] == startNode.id || includedNodes[i] == endNode.id){
				alert("Start and end compounds are always included")
				return;
			}
		}
		allPathways = includeThese(includedNodes); // find the filtered pathways
	}
	if (maxLen != ""){
		// if user specified maximum path length
		allPathways = filterLen(maxLen);
	}
	
	// reload the graph with the filtered pathways
	displayedPaths = allPathways;
	reloadGraph(displayedPaths);
}

function removeThese(badNodes){
	var badPaths = [] // will accumulate all the paths we need to remove
	var newPathways = [] // post-filtering patways that will be displayed
	
	badNodes.forEach(function(node) {
		var nodePaths = nodesMap[node]["pathways"];
		badPaths = badPaths.concat(nodePaths);
	})
	
	for(var i = 0; i < allPathways.length; i++){
		if(badPaths.indexOf(i) == -1){
			// not in bad paths, so add to new paths
			newPathways.push(allPathways[i]);
		}
	}
	
	if (newPathways.length == 0){
		alert("There are no paths that do not contain these nodes")
		document.getElementById("ignoredCompounds").value = "";
		return allPathways;
	} else {
		globalIgnoredNodes = globalIgnoredNodes.concat(badNodes); // keep track of what was filtered
		document.getElementById("ignoredCompounds").value = ""; // reset the option
		return newPathways;
	}
}

function includeThese(goodNodes){
	var goodPaths = [] // will accumulate all the paths we need to remove
	var newPathways = [] // post-filtering patways that will be displayed
	
	goodNodes.forEach(function(node) {
		var nodePaths = nodesMap[node]["pathways"];
		goodPaths = goodPaths.concat(nodePaths);
	})
	
	for(var i = 0; i < allPathways.length; i++){
		if(goodPaths.indexOf(i) > -1){
			// In good paths, so add to new paths
			newPathways.push(allPathways[i]);
		}
	}
	
	if (newPathways.length == 0){
		alert("There are no paths that include these nodes")
		document.getElementById("includedCompounds").value = "";
		return allPathways;
	} else {
		globalIncludedNodes = globalIncludedNodes.concat(goodNodes); // keep track of what was filtered
		document.getElementById("includedCompounds").value = ""; // reset the option
		return newPathways;
	}
}

function filterLen(maxPathLen){
	var newPaths = [];
	// console.log("Before Filtering: ", pathways);

	for(var i = 0; i < allPathways.length; i++){
		if(allPathways[i].nodes.length < maxPathLen){
			// this path is smaller then the constraint, so it is kept
			newPaths.push(allPathways[i]);
		}
	}
	// console.log("After Filtering: ", pathways);

	if(newPaths.length == 0){
		alert("There are no paths shorter than " + maxPathLen);
		return allPathways;
	} else {
		return newPaths;
	}
}

function resetFiltering(){
	// revert to the default (read from json) pathways and reload the graph
	allPathways = originalPathways;
	displayedPaths = allPathways;
	globalIncludedNodes = [];
	globalIgnoredNodes = [];
	reloadGraph(displayedPaths);
}

function reloadGraph(pathsToReload){
	/* Clears current graph, reloads data from pathways, redraws paths */
	
	// remove the previous graph
	d3.selectAll("svg").remove();

	// reload with new data
	genGraph(pathsToReload);
	drawGraph();
}

/////////////// PAGE FUNCTIONS ///////////////

function toggleOptions(option){
	if(document.getElementById(option.id).style.display == 'block'){
		document.getElementById(option.id).style.display = 'none';
		document.getElementById(option.id + "Button").style.visibility = "hidden";	
	} else {
		document.getElementById(option.id).style.display = 'block';
		document.getElementById(option.id + "Button").style.visibility = "visible";
	}
}

function setGraphInfoHtml(){
	if(displayedPathIndex == -1){ // if we are viewing all paths
		document.getElementById("graphInfo").style.display = "block";
		document.getElementById("pathCount").style.display = "inline";
		document.getElementById("pathCount").innerHTML = "Displaying <u>" + allPathways.length + "</u> paths";
	
		document.getElementById("removedNodes").innerHTML = globalIgnoredNodes.join(", ");
		document.getElementById("includedNodes").innerHTML = globalIncludedNodes.join(", ");
		
	} else { // if we are only viewing a single path
		var curPathNumber = displayedPathIndex + 1;
		var html = "";
		
		// hide the old "view first path" button
		document.getElementById("firstPathButton").style.display = "none";
		
		// insert the new location and path navigation buttons
		html += "Displaying path <strong>" + curPathNumber + "</strong> of " + "<strong>" + allPathways.length + "</strong> paths</br>";
		html += "<button class='smallButton columnButton pathNavButton' id='viewPrevButton' onclick='viewPrevPath()'>Previous</button>";
		html += "<button class='smallButton columnButton pathNavButton' id='viewNextButton' onclick='viewNextPath()'>Next</button></br>";
		html += "<button class='smallButton columnButton pathNavButton' id='viewAllButton' onclick='viewAll()'>View All</button>";
		html += "</br></br>";
		html += "Path length: <strong>" + displayedPaths[0].links.length + "</strong>";
		document.getElementById("pathCount").innerHTML = html;
	}
	
}

function applyStyle(){
	if(document.getElementById('lineOpacity').checked){
		edgeType = "lineOpacity";
	} else {
		edgeType = "lineWidth";
	}
	
	if(document.getElementById('showArrows').checked){
		showArrows = true;
	} else {
		showArrows = false;
	}
	compoundColor = document.getElementById('userCompoundColor').value;
	reactionColor = document.getElementById('userReactionColor').value;
	endpointColor = document.getElementById('userEndpointColor').value;
	
	reloadGraph(displayedPaths);
}

// function viewNodeImage(nodeID){
// 	window.open(compoundImgUrl + 'c00031.gif',
// 	'MyWindow',
// 	'toolbar=no',
// 	'location=no',
// 	'directories=no',
// 	'status=no',
// 	'menubar=no',
// 	'scrollbars=yes',
// 	'resizable=yes',
// 	'width=300',
// 	'height=300');
// }
