// setting some basic properties
var width = window.innerWidth - 60;
var height = window.innerHeight - 150;
var nodeRadius = 10;
var reactionRadius = 5;
var linkSize = 20;
var nodeColor = "#64b566";
var strokeColor = "#FFF";
var textColor = "#FFF";
var pathfile = "paths/oldPaths/path.json";
var infoUrl = "http://www.genome.jp/dbget-bin/www_bget?";
var compoundImgUrl = "http://www.genome.jp/Fig/compound/";
var reactionImgUrl = "http://www.genome.jp/Fig/rpair/";

// https://github.com/nylen/d3-process-map/blob/master/script.js

var force = d3.layout.force()
    .charge(-700)
    .linkDistance(linkSize)
    .size([width, height]);

// creating the main body
var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "graph");

function start(){
	d3.json(pathfile, function(error, graph){
		// http://plnkr.co/edit/20t4F02vsM1U55ktCv66?p=preview
      
		  var edges = []; 
		  // In the JSON, the links are given based on IDs, this function translates ID-based links into links based on indices
	      graph.links.forEach(function(e) { 
		      var sourceNode = graph.nodes.filter(function(n) { return n.id === e.source; })[0],
		      targetNode = graph.nodes.filter(function(n) { return n.id === e.target; })[0];
		      edges.push({source: sourceNode, target: targetNode, value: e.Value});
	      });
	
			
		// initialize the nodes and edges into the graph
	    force.nodes(graph.nodes)
	    .links(edges)
	    .start();

		var link = svg.selectAll(".link")
	        // setting the properties of a link
	        .data(edges)
	        .enter().append("line")
	        .attr("class", "link")
	        .attr("stroke", "white");
		
	    var node = svg.selectAll(".node")
	        // setting the properties of a node
	        .data(graph.nodes)
			.call(setWidth) // will set the width of the canvas based on the size of the pathway
	        .enter().append("circle")
	        .attr("class", "node")
	        .attr("fill", function(d){
	            if(d.id[0] == "C"){
	                return nodeColor;
	            } else {
	                return "white";
	            }
	        })
	        .attr("stroke", strokeColor)
	        .attr("stroke-width", "3px")
	        .attr("r", function(d){
	            if(d.id[0] == "C"){
	                return nodeRadius;
	            } else {
	                return reactionRadius;
	            }
	        })
		
	        // events and handlers for the nodes
	        // manages the toggling and layout of the "More info" box for each node
	        .on("dblclick", function(d) {
	            div.transition()
	                .duration(500)
	                .style("opacity", 0);
	            div.transition()
	                .duration(500)
	                .style("opacity", 1);
            
				// displays different information depending on node type
				var displayHtml;
	            if(d.id[0] == "C"){
		            displayHtml =
						d.name + '</br></br>' +
		            	"<strong>Compound: </strong>" +
						'<a target="_blank" href=\"' + infoUrl + d.id + '\">' + d.id + '</a></br></br>\n' +
			            '<a target="_blank" href=\"' + compoundImgUrl + d.id + '.gif' + '\">' + '<img src=\"' + compoundImgUrl + d.id + '.gif\" width=\'175px\'></img>' + '</a></br></br>\n'
				} 
				else {
		            displayHtml = 
						d.reacName + '</br></br>\n' +
		            	"<strong>RPair: </strong>" +
						'<a target="_blank" href=\"' + infoUrl + d.id + '\">' + d.id + '</a></br></br>\n' +
						"<strong>Reaction: </strong>" + d.reacId + '</br></br>\n' +
			            '<strong>EC: </strong>' + d.ec + '</br></br>\n' +
			            '<a target="_blank" href=\"' + reactionImgUrl + d.id + '.gif' + '\">' + '<img src=\"' + reactionImgUrl + d.id + '.gif\" width=\'175px\'></img>' + '</a></br></br>\n'
	            }
			
	            div.html(displayHtml)
					// placing the overlay
	                .style("left", d.x - 100 + "px")
	                .style("top", d.y + 150 + "px");
	        })
	        .on("click", function(d) {
	            div.transition()
	                .duration(500)
	                .style("opacity", 1);
	            div.transition()
	                .duration(500)
	                .style("opacity", 0);
	            div .html("");
			});

	    var label = svg.selectAll(".label")
	        // setting the properties of a node
	        .data(graph.nodes)
	        .enter().append("svg:text").text(function(d, i) {
	            if(d.position == 0){
	                return d.name + " (start)";
	            } else if (d.position == graph.nodes.length - 1){
	                return d.name + " (end)";
	            } else {
	                return d.name;
	            }
	        })
	        .style("fill", "#FFF")
	        .style("font-family", "sans-serif")
	        .style("font-size", 17);

	    var div = d3.select("body")
	    	.append("div")  // declare the tooltip div
	    	.attr("class", "tooltip")              // apply the 'tooltip' class
	    	.style("opacity", 0);                  // set the opacity to nil

	    node.call(force.drag);

	    force.on("tick", function(e) {
	        node.attr("transform", function(d, i) {
	            return "translate(" + d.x + "," + d.y + ")";
	        });

	        link.attr("x1", function(d)   { return d.source.x; })
	           .attr("y1", function(d)   { return d.source.y; })
	           .attr("x2", function(d)   { return d.target.x; })
	           .attr("y2", function(d)   { return d.target.y; });

	        label.attr("x", function(d) {return d.x;})
	            .attr("y", function(d){return d.y + 3*nodeRadius;})
	    });
	})
}

var drag = force.drag().on("dragstart", dragstart);


function releseNode(d) {
 d3.select(this).classed("fixed", d.fixed = false);
}

function dragstart(d) {
  d3.select(this).classed("fixed", d.fixed = true);
}

function setWidth(nodes){
	// sets the canvas width based on number of nodes
	
	// var numNodes = nodes[0].length;
	// var newSize = numNodes*60;
	// if(newSize > svg.attr("width")){
	// 	svg.attr("width", newSize);
	// }
	
	//temporary, hard-coded value
	svg.attr("width", window.innerWidth - 50);
}

// Page functions

function refresh(){
	start();
}
function prevPath(){
	console.log("Previous Path");
	pathline = "path.json";
	start();
}
function nextPath(){
	console.log("Next Path");
	pathfile = "path2.json";
	start();
}