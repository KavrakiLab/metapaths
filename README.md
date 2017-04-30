# Metabolic Pathway Visualization

## Overview
This project implements a web app for metabolic pathway visualization. The
backend is written in Python using [Flask](http://flask.pocoo.org) and the
frontend is written in HTML/CSS and JavaScript.

### Backend
There are several components to the backend.

#### Flask
The primary component is the Flask web server which handles URL routing for
webpages and all other requests from the frontend. The Flask server is
implemented in the `metapaths.py` file. This code is responsible for serving
the pages that the user visits as well as managing the search tasks.

#### Celery
When a user submits a pathway search, the Flask server utilizes
[Celery](http://www.celeryproject.org) to manage that search task. Celery is a
distributed task queue and allows the main server process to continue
handling requests while the search is executed asynchronously by Celery
workers.

#### MySQL Databases
The backend is also supported by two MySQL databases: `metadb` and `hubdb`.
These databases can be recreated by sourcing the provided database dumps in the
`resources` directory (see in-depth instructions in the **Installation**
section below).

The `metadb` database contains a single table, `KEGGCompoundNames` which
provides a mapping of KEGG IDs to compound names. This information is requested
by the frontend and used to populate fields and label nodes in the
visualization.

The `hubdb` database contains a table for each pair of hub compounds for which
there are pathways. For example, each row in the `C00022_C00024` table
describes a path from `C00022` to `C00024`. The information in this database is
used to populate the hub visualization when a user clicks to expand a hub link.


### Frontend

## Installation


### Deploying to a server


## File Descriptions
