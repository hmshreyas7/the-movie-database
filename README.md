# The Movie Database

This project uses [D3](https://d3js.org/) v5 to visualize various aspects of movies in the [TMDb dataset](https://www.kaggle.com/tmdb/tmdb-movie-metadata). Specifically, there are 3 visualization techniques involved: a [zoomable pack layout](http://mbostock.github.io/d3/talk/20111116/pack-hierarchy.html) for the overview, a [force-directed graph](https://observablehq.com/@d3/force-directed-graph) linked to the overview, and a [liquid fill gauge](http://bl.ocks.org/brattonc/5e5ce9beee483220e2f6) connected to the graph.

## Folders and Files

### /data

This directory consists of 16 JSON files corresponding to different genres. All movies associated with a genre are stored in the respective file as nodes for the graph with the following attributes: `movie name`, `revenue`, `keywords`, `user rating`, `number of votes`, `release year`, `plot`, and `duration`. The same information is used for the third view. In addition to nodes, the file contains information about links between nodes as well. This is based on the number of matching `keywords` between two movies.

### /scripts

Here, you will find the `main.js` file which implements all the D3 visualizations required for this project and the `d3.min.js` file needed to use D3. Alternatively, you could remove this file and load it directly using:
```
<script src="https://d3js.org/d3.v5.min.js"></script>
```

### /styles

This folder contains the CSS file for styling various parts of the views.

### index.html

Necessary JS and CSS files are included here. Parts of the overview are also created.

### tmdb_movies_top20.json

This file contains information about the top 20 movies in each genre by revenue and the overview is generated using this data.

## Running the system

Open the `index.html` file (Mozilla Firefox or Microsoft Edge recommended) and follow the instructions at the top of the window for each view to know how to interact with the system. Refresh the page to restart (currently a limitation).
