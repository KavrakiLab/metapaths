function viewAllPaths(nodesString) {
	var pathwaysFilename = "paths/" + nodesString + "_Pathways.json";
	var nodesMapFilename = "paths/" + nodesString + "_NodesMap.json";
	var linkWeightsFilename = "paths/" + nodesString + "_LinkWeights.json";
	
	localStorage["nodesString"] = nodesString;
	localStorage["pathwaysFilename"] = pathwaysFilename;
	localStorage["nodesMapFilename"] = nodesMapFilename;
	localStorage["linkWeightsFilename"] = linkWeightsFilename;
}