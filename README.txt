amp-web README
==================

Getting Started
---------------

- cd <directory containing this file>

- $venv/bin/python setup.py develop

- $venv/bin/initialize_amp-web_db development.ini

- $venv/bin/pserve development.ini



Adding support for new collections to amp-web
---------------------------------------------
 
 * Write a new Dropdowns subclass inside of ampweb/static/scripts/dropdowns 
   that describes how the dropdown selectors should work for your collection.
   Use the existing subclasses as examples.

   You'll need to implement several functions within your new subclass.

     getSelected
       This function will check each of the dropdowns and update the internal
       state to match the options that have been selected.

     getDropdownState
       Returns a javascript object that describes the current state of the 
       dropdowns, i.e. what is currently selected. Make sure your object also
       includes a 'type' field that describes which dropdown subclass is 
       currently in use -- this is because this object is used to revert the
       dropdowns to an earlier state if the user clicks Back in their browser
       and they may have moved to a different collection.

     setDropdownState
       Given an object created using getDropdownState, this function will 
       revert the dropdown state to match what is described in the object.

     callback
       This function will be called whenever a new selection occurs on any of
       the dropdowns for the collection. In particular, this function should
       deal with disabling or enabling dropdown lists based on which list the
       selection occurred in, populating dropdown lists in response to the
       selection, and (if all dropdowns have an item selected) finding the
       stream that matches the current selection and changing the displayed
       graph accordingly.

   In many cases, a dropdown list may depend on there being a value selected 
   in another dropdown. For example, you cannot choose a destination for
   rrd-smokeping without having first selected a source. As long as no source
   is selected, the destination dropdown is disabled. Once a source is 
   selected, the callback will make an AJAX call to get the list of 
   destinations for that source and populate the destinations dropdown with 
   them. 

 * Create a new script in ampweb/static/scripts/graphobjects for your new
   collection. The script should define a new class that is a subclass of
   NNTSCGraph (defined in betternntscgraph.js).

   Fortunately, this is pretty easy, especially if you follow an existing
   script. You only really need to implement two functions:
     
     initDropdowns
       A function that instantiates an instance of the appropriate Dropdown
       subclass for this collection

     drawGraph
       A function that will draw a suitable graph for the collection in the 
       container named "#graph".

   Make sure you set the colname attribute in the constructor for your new
   subclass. The value of colname should match the collection name.

   You may override some of the functions provided by the base class if you
   wish, but this shouldn't be necessary for most collection types.

 * Inside of ampweb/views/collections, add a new python file containing a
   subclass of CollectionGraph that implements all of the methods defined
   in CollectionGraph.

   There are eight methods to implement:

     get_destination_parameters
     	Convert the slash-separated terms that are included in a 
	_destinations/ API call into a parameters dictionary that can be 
	passed into ampy's get_selection_options function

     get_stream_parameters
     	Convert the slash-separated terms that are included in a _streams/
	API call into a parameters dictionary that can be passed into ampy's
	get_stream_id function

     format_data
     	Converts the list of data returned by ampy into a list of results
	suitable for our graphing software. Each individual result should also 
	be a list where the first value in the list should be the timestamp in 
	millisecond. The various values that you want to plot at that timestamp
	should follow -- now is the time to convert the data into appropriate
	units (e.g. from bytes to Mbps).

	Most results will therefore look like:
		[timestamp, value]

	Some are more complicated, e.g. Smokeping:
		[timestamp, median, loss, ping1, ping2, ... ping20]

     get_javascripts
     	Lists the javascript files that are required for this graph that aren't
	covered by the list included in graph.py. This should include:
	  1. a .js file from graphtemplates/ that describes how to draw the
	     graph itself.
	  2. betternntscgraph.js
	  3. the .js file you just added to graphobjects/
	  4. the .js file you just added to dropdowns/

	There may be other javascript files that are required specifically
	for this graph -- if so, add them here.

     get_dropdowns
     	Returns a list of dictionaries describing the dropdowns to show on the
	graph page for this collection. The dropdowns will be rendered in the
	order they are given in the list.

	A dropdown dictionary needs to provide the following items:
		ddlabel: A label to print alongside the dropdown list
		ddidentifier: The id string that your dropdown javascript will
		              use to identify this dropdown list
		ddcollection: The collection name string
		dditems: A list of items to display in the dropdown list. The 
		         best way to create this is to use populateDropdown().
		disabled: If True, the dropdown is disabled.

     get_collection_name
     	Returns a string matching the collection name

     get_default_title
     	Returns a default title to display on the graph page if no stream is
	selected

     get_event_label
     	Converts an event object into suitable text for describing the event
	that can be displayed on the dashboard

   As with the previous steps, the code for the existing collections should 
   serve as excellent examples.   

