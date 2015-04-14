
var timerId = undefined;

var isNumeric = function(val) {
    return Number(parseFloat(val))==val;
};

var extractHREF = function(val) {
    var index = val.indexOf("href='");
    if (index == -1) { return undefined; }
    var subval = val.substr( index+6 );
    index = subval.indexOf("'");
    if (index == -1) { return undefined; }
    return "http://" + subval.substr( 0, index );
};

var HttpClient = function() {
    this.get = function(aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() { 
            if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
                aCallback(anHttpRequest.responseText);
        };
        anHttpRequest.open( "GET", aUrl, true );            
        anHttpRequest.send( null );
    };
};

var processPlotRequest = function( response ) {
	var  lines= response.split("\n");
	var response_json = '';
	for( var i = 0; i<lines.length; i++ ){
		line = lines[i];
		var iloc = line.indexOf("Content-Type:");
		if ( ( line.length > 0 ) && ( iloc == -1 ) ) {
		   response_json = response_json + line;	
		}
	}
	if ( response_json.length > 0 ) { 
		clearInterval( timerId ); 
		console.log( "Got response: " + response_json ); 
		var tseries_json = response_json.replace(/\bNaN\b/g, "null");
		var tseries_obj = JSON.parse( tseries_json );				            	
		timeseries.plot( timeseries.elem, tseries_obj ); 	
	};
};
				        	
var timeseries = {
	
	plotHREF: function( elem_id, responseText ) {
		var href = extractHREF( responseText );
		console.log( "plotHREF: Got href: " + href ); 		
		var fetcher = new HttpClient();
		this.elem = elem_id;
		timerId = setInterval( function() { fetcher.get( href, processPlotRequest ); }, 3000 ); 	
	},
	
	plot: function( elem_id, tseries ) {
		var ts_elem = d3.select("#"+elem_id);
		var obsolete_elems = ts_elem.selectAll("div");
		obsolete_elems.remove();
		ts_elem.append( 'div' ).attr( 'id', "yaxis" );			
		ts_elem.append( 'div' ).attr( 'id', "chart" );
			
		var input_data = tseries.data;
		var variable = tseries.variable; 
		var time_axis = tseries.time; 
		var time_data = time_axis.data;
		var t0 = time_axis.t0;
		var dt = time_axis.dt;
		var rs_data = [];
		var tunit = time_axis.units.split(" ")[0]; 
		var conversion_factor = 1;	
		if      ( tunit.indexOf( 'minu' ) >= 0 )  conversion_factor = 60; 
		else if ( tunit.indexOf( 'hour' ) >= 0 )  conversion_factor = 60*60; 
		else if ( tunit.indexOf( 'day' )  >= 0 )  conversion_factor = 60*60*24; 
		else if ( tunit.indexOf( 'week' ) >= 0 )  conversion_factor = 60*60*24*7; 
		else if ( tunit.indexOf( 'mont' ) >= 0 )  conversion_factor = 60*60*24*30; 
		else if ( tunit.indexOf( 'year' ) >= 0 )  conversion_factor = 60*60*24*365; 
		
		for (i = _i = 0; _i < input_data.length; i = ++_i) {
			if (  input_data[i] != null ) {
				time_value = (time_data == undefined) ? (t0 + dt*i) : time_data[i];
		  	    rs_data.push( { x: time_value*conversion_factor, y: input_data[i] } );
			}
        }  
		var min = Number.MAX_VALUE;
		var max = Number.MIN_VALUE;
		for (_l = 0, _len2 = rs_data.length; _l < _len2; _l++) {
		    value = rs_data[_l].y;
		    min = Math.min(min, value);
		    max = Math.max(max, value);
		}
		var yscale = d3.scale.linear().domain([min, max]).nice();
			
		var graph = new Rickshaw.Graph({
		  element: ts_elem.select( "#chart" ).node(),
		  renderer: 'line',
		  series: [{
		      color: 'steelblue',
		      data: rs_data,
		      name: variable.id,
		      scale: yscale
		    },
		  ]
		});
		
		yaxis = new Rickshaw.Graph.Axis.Y.Scaled({
		  element: ts_elem.select( "#yaxis" ).node(),
		  graph: graph,
		  orientation: 'left',
		  scale: yscale,
		  tickFormat: Rickshaw.Fixtures.Number.formatKMBT
		});
				
		timeaxis = new Rickshaw.Graph.Axis.Time({
		  graph: graph,
		  tickFormat: Rickshaw.Fixtures.Time.formatDate		  
		});
		
		new Rickshaw.Graph.HoverDetail({
		  graph: graph,
		  yFormatter: function( y ) {
		  	return y === null ? y : y.toFixed(2) + ' ' + variable.units;
		  }
		});
		
		graph.render();
		var w = graph.width;
		var h = graph.height;
		var font = "sans-serif";
		var font_size = "14px";
		var font_color = "gray";
		
		graph.vis.append("text")
			   .attr("x", w )
			   .attr("y", h - 25 )
			   .attr( "class", "axis_label" )
			   .text( time_axis.units );
             
		graph.vis.append("text")
			   .attr("x", 0 )
			   .attr("y", 6 )
			   .attr( "class", "axis_label" )
			   .attr("dy", ".75em")
			   .text( variable.long_name + " (" + variable.units + ")")
               .attr("transform", "rotate(-90)");

	},
};