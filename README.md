# Metabolic Pathway Visualization

## Overview
This project implements a web app for metabolic pathway visualization. The
backend is written in Python using [Flask](http://flask.pocoo.org) and the
frontend is written in HTML/CSS and JavaScript.

### Backend
There backend comprises several components.

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
The HTML for webpages resides in the `templates` directory and is served by
the Flask server. The frontend makes extensive use of
[Bootstrap](http://getbootstrap.com) for the UI components and
[Select2](https://select2.github.io) for the searchable drop-down select boxes.
The visualization is created using a force-directed graph layout from
[D3](https://d3js.org).


## Installation
<!-- ***Python version 2.7.* *** -->
`$` indicates command should be executed from the shell
`mysql>` indicates command should be executed from the MySQL server REPL

### Acquire Dependencies

#### Python Libraries
Flask: `$ sudo pip install Flask`

Celery: `$ sudo pip install celery`

MySQLdb: `$ sudo pip install mysql-python`

#### Other
MySQL Server: [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)

RabbitMQ: [Debian/Ubuntu](http://www.rabbitmq.com/install-debian.html), [Mac
OSX](http://www.rabbitmq.com/install-standalone-mac.html)

### Clone
```
git clone https://github.com/KavrakiLab/metapaths.git
```

### Database Setup
1. Complete the initial post-installation setup of MySQL Server. The default
   user is `root` and the password is `meta`. If you configure with a different
   username and password, you must update the `DB_USER` and `DB_PASSWD` fields
   in `metapaths.py`.

```
$ mysql -u root -p // start and login to the MySQL server
```

2. Create `metadb` database

```
mysql> CREATE DATABASE metadb;
mysql> USE metadb;
mysql> SOURCE ./metapaths/resources/metadb_2017-04-30.sql;
```

3. Create `hubdb` database

```
mysql> CREATE DATABASE hubdb;
mysql> USE hubdb;
mysql> SOURCE ./metapaths/resources/hubdb_2017-04-30.sql;
```

4. Logout
```
mysql> quit;
```

### Deploying to a server


## File Descriptions
