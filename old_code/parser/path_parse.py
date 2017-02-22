import collections
import json
import urllib2
from pprint import pprint

def defaultWeight():
    # Returns the default weight for a newly discover link
    return 0;

def parse(filename):
    """
    docstring for parse
    """
    pathways = [] # A list of dicts; each dict is a json object with nodes and links (see path.json)
    uniqNodes = set([]) # A set of all the unique nodes, across all the pathways
    nodesMap = {} # A mapping of nodes to certain properties. See description at bottom
    linkWeights = collections.defaultdict(defaultWeight) # A mapping of each link to the number of times is occurs, across all pathways
    currentLineNumber = 0; # Counter for info/debugging
    
    print("Filename is: " + filename + "\n")
    pathTextFile = open(filename, 'r')
    
    # The generated json
    pathwaysFile = open("/Users/prudhvi/Dropbox/School/Research/Metapaths/Metapaths Parsing/Full_C31C78Pathways.json", 'w')
    nodesMapFile = open("/Users/prudhvi/Dropbox/School/Research/Metapaths/Metapaths Parsing/Full_C31C78NodesMap.json", 'w')
    linkWeightsFile = open("/Users/prudhvi/Dropbox/School/Research/Metapaths/Metapaths Parsing/Full_C31C78LinkWeights.json", 'w')
    
    # Each line in the file is a single pathway; Repeats for each pathway in the file
    for line in pathTextFile:
        pathway = {} # The json object for this pathway; includes the nodes and links
        nodes = [] # A list of the compounds and reaction pairs in this pathway represented as dicts
        links = [] # A list of dicts, mapping source and target compounds
        nodeIDs = [] # Container for holding node IDs while the pathway object is constructed
        pathID = len(pathways) # The index of this path in the pathways list (use to set node propertie)
        
        currentLineNumber += 1;
        print("Processing line " + str(currentLineNumber))
        
        # extracting the compounds and reaction pairs from the txt file
        line = line[1:-1] # removes the '[' on the first line
        items = line.split(",")
        
        for item in items:
            if item[0] == 'C' or item[0] == 'R':
                if len(item) > 7:
                    item = item[0:7]
                if item[-1] == ']':
                    item = item[0:-1]
                nodeIDs.append(item.strip()) # remove trailing whitespace and add to list of IDs
        
        for nodeID in  nodeIDs:
            # keep track of which paths a node is included in
            if nodesMap.has_key(nodeID):
                nodesMap[nodeID]["pathways"].append(pathID)
            else:
                nodeProp = {"pathways":[pathID], "incoming":0, "outgoing":0}
                nodesMap[nodeID] = nodeProp
            
            
            # if a compound
            if nodeID[0] == 'C':
                compound = {}
                
                # store the properties
                compound["id"] = nodeID
                # compound["name"] = nodeID + "'s name"
                
                # add to the list of nodes
                nodes.append(compound)
            
            # if a reaction pair
            if nodeID[0] == 'R':
                reaction = {}
                
                # store the properties
                reaction["id"] = nodeID
                # reaction["ec"] = nodeID + "'s ec"
                # reaction["reacID"] = nodeID + "'s reacID"
                # reaction["reacName"] = nodeID + "'s reacName"
                
                # add to the list of nodes
                nodes.append(reaction)
                
                
        # store the list of nodes into the pathway
        pathway["nodes"] = nodes
        
        i = 0
        while(i < len(nodeIDs) - 1):
            link = {}
            source = nodeIDs[i]
            target = nodeIDs[i+1]
            link["source"] = source
            link["target"] = target
            
            # update the incoming and outgoing counts for each node
            nodesMap[source]["outgoing"] += 1
            nodesMap[target]["incoming"] += 1
            
            # add the current link to the list of links
            links.append(link)
            i += 1
            
            # update the link weight
            linkKey = source + "," + target
            linkWeights[linkKey] += 1;
        
        # store the list of links into the pathway
        pathway["links"] = links
    
        pathways.append(pathway)
        
    # Add more information to each node in nodesMap
    nodesMap = getNodeData(nodesMap);
        
    # print("Updated nodesMap:")
    # pprint(nodesMap)
    
    # print "Number of pathways: ", len(pathways)
    # print "Total unique nodes: ", len(uniqNodes)
    # print nodesMap
    # print json.dumps(pathways, sort_keys=True, indent=4, separators=(',', ': '))
    # print json.dumps(linkWeights, sort_keys=True, indent=4, separators=(',', ': '))
    
    json.dump(pathways, pathwaysFile, separators=(',', ': '))
    json.dump(nodesMap, nodesMapFile, separators=(',', ': '))
    json.dump(linkWeights, linkWeightsFile, separators=(',', ': '))
    
    # print " "


def getNodeData(nodesMap):
    """
    This function iterates through every node in the nodes map, 
    and queries the KEGG database for more information.
    This information is then stored into nodesMap, and then the
    updated nodesMap is returned.
    """
    
    baseurl = "http://togows.dbcls.jp/entry/compound/"
    currentIteration = 0; # Just for info and debugging
    totalIterations = len(nodesMap.keys()); # Just for info and debugging
    
    # print(nodesMap)

    for nodeID in nodesMap.keys():
        currentIteration += 1;
        print("Requesting node info from server for: " + nodeID + "; " + str(currentIteration) + " of " + str(totalIterations))
        
        nodeURL = baseurl + nodeID + ".json"
        response = urllib2.urlopen(nodeURL).read()
        
        nodeJSON = json.loads(response)[0]
        
        # Store the data common to both compounds and reaction pairs
        nodesMap[nodeID]["id"] = nodeJSON["entry_id"]
        nodesMap[nodeID]["name"] = nodeJSON["name"]
        
        # Store data relevant to reaction pairs
        if(nodeID[0] == "R"):
            if(len(nodeJSON["enzymes"]) > 0):
                nodesMap[nodeID]["ec"] = nodeJSON["enzymes"][0] # Get the first ec number
            else:
                nodesMap[nodeID]["ec"] = "None" # In case there isn't an ec number
            
            if(len(nodeJSON["reactions"]) > 0):    
                nodesMap[nodeID]["reacID"] = nodeJSON["reactions"][0] # Get the ID of the first reaction
                nodesMap[nodeID]["reacName"] = "**TEST**" # Get the name of the first reaction
            else:
                nodesMap[nodeID]["reacID"] ="None" # In case there isn't a reaction name
                nodesMap[nodeID]["reacName"] = "**TEST**" # Get the name of the first reaction
            
    
    return nodesMap 
    

parse("/Users/prudhvi/Dropbox/School/Research/Metapaths/Metapaths Parsing/C00031_C00078_linear.txt");
    

# nodesMap:
    # Creates a structure with the following format:
    # {
    #     "C00031":{
    #         "pathways":[1,4,2,5],
    #         "incoming": 4,
    #         "outgoing": 2
    #     }, "C0463":{
    #         "pathways":[3,5],
    #         "incoming": 1,
    #         "outgoing": 5
    #     }, "RP30400":{
    #         "pathways":[1,9,21,29,15],
    #         "incoming": 1,
    #         "outgoing": 1
    #     }
    # }
    # Each node has the following properties:
    #     pathways: a list of indices of paths in "pathways" (created by the parse function,
    #     available globally on the front end) that contain this node
    #
    #     incoming: the number of incoming links
    #     outgoing: the number of outgoing links