## Metabolic Pathway Visualization

### Two use cases:

1. User uploads their metabolic pathway data in some specified and supported
   format. The front-end JS code parses their data and generate a
   visualization.

    The uploaded data could be one of the following:

       * Pathways which were exported from the app itself
       * Pathways which were output by LPAT/BPAT or hub algorithm
       * Pathways which were output by metagraphs algorithm

2. The user configures and executes a pathway search. The results may not be
   instantaneous so some sort of callback or link generated for them to
   get their results would be needed.

   Algorithm output would reside on the server and be accessible at the
   visualization link.


### Implementation Tasks:

1. Need to define a schema for the input
    * Preferably JSON for easy usage with D3
    * Need to figure out what data is available from each source and how to
      support or visualize that data?
2. Write parsers for the different supported metapaths data (LPAT/BPAT/HUBs/MG)
   to convert to the data scheme
3. Implement visualization
    * Will the viz look different based what type of input was given? --> This
      could get complicated
    * What are the minimum required features?
    * What amount of information should be pulled from external sources?
4. Implement back-end
    * Receive and execute pathway searches
    * Output data into the viz scheme or into the native format and then
      converted to the viz scheme
    * Make results available via a URL
    * User notification system when search is complete (email)


### Data File Specification
```
{
    "info" : {
        "start" : "C00668",
        "target" : "C00916",
        "atoms" : 3
    },
    "pathways" : [
        { // Pathway 1
            "nodes":[
                {
                    "id":"C00668",
                    "type" : 0      // Type 0 indicates a regular compound
                },
                {
                    "id":"C00022",
                    "type" : 1    // Type 1 indicates a hub compound
                },
                ...
            ],
            "links":[
                {
                    "source":"RP02454",
                    "target":"C05345",
                    "weight" : 3
                },
                ...
            ]
        },
        { // Pathway 2
            "nodes" : [...],
            "links" : [...],
        },
        ...
    ]

}
```
