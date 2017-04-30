# Metabolic Pathway Visualization

## Overview
This project implements a web app for metabolic pathway visualization. The backend is written in Python using [Flask](http://flask.pocoo.org) and the frontend is written in HTML/CSS and JavaScript.

### Backend
There are several components to the backend. 

#### Flask
The primary component is the Flask web server which handles URL routing for webpages and all other requests from the frontend.

#### Celery
When a user submits a pathway search, the Flask server utilizes [Celery](http://www.celeryproject.org) to manage that search task. Celery is a distributed task queue and it frees up the main server process to continue handling requests while the search is executed asynchronously by Celery workers.

### Frontend

## Installation


### Deploying to a server


## File Descriptions
