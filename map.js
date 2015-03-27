var gdocsURL = 'https://docs.google.com/spreadsheets/d/1pmF8SF_EceAkf3QNYU6DWL9GMKW1wvUWHYlns7mv174/edit#gid=0';

var map = L.map('map', {zoomControl:false}).setView([40.0758302,-0.5250748], 6);

L.tileLayer('https://{s}.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={token}', {
	maxZoom: 18,
	id: 'gkogler.l91ko9dl',
	token: 'pk.eyJ1IjoiZ2tvZ2xlciIsImEiOiJSQ1Nld2NrIn0.yW2DR2Lp2NS1xPJsOddW9Q'
}).addTo(this.map);

// get categorias
var categorias = [];
recline.Backend.GDocs.fetch({
	url: gdocsURL,
	worksheetIndex: 2
})
  	.done(function(result) {
  		//console.log(result);
  		console.log("gdoc 'categorias' loaded")
		loadCats(result.records);
});

// load categorias
function loadCats(json) {
	for (var i = 0; i < json.length; i++) {
		var cat = json[i];
		categorias.push(new Category(cat.area,cat.descripcion,cat.icono,cat.color));
	}
	console.log(i+" categories loaded");
}

//get registers
map._layersMaxZoom=6;
var markers = new L.markerClusterGroup({spiderfyDistanceMultiplier: 2, maxClusterRadius: 10, spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true, showCoverageOnHover: false});

recline.Backend.GDocs.fetch({
	url: gdocsURL
})
  	.done(function(result) {
  		//console.log(result);
		loadMarkers(result.records);
		showAll();
});

function loadMarkers(json) {
	for (var i = 0; i < json.length; i++) {
		var a = json[i];
		var nombre = a.nombre;
		var area = a.area;
		var ciudad = a.ciudad;
		var web = a.web;
		var twitter = a.twitter;
		var facebook = a.facebook;
		var latitude = a.geolatitude;
		var longitude = a.geolongitude;
		var falta = "";

		// load categoria object
		var catObjs = getCat(area);
		if (catObjs.length == 0) {
			// category not defined or multiple categories
			if (getCat("default").length == 0) {
				// default category not initialized
				cat = "default";
				var defCat = new Category(area,"default category",null);
				var catObjs = new Array();
				catObjs.push(defCat);
				categorias.push(defCat);
				falta += "categoría (usando 'default')";
			} else {
				catObjs = getCat("default");
			}
		}

		// aviso que falta rellenar datos
		if (latitude == "") falta += "latitude ";
		if (longitude == "") falta += "longitude ";
		if (falta != "") falta = "FALTA por rellenar (o mal escrito): "+falta;
		else falta += "OK";

		console.log(nombre+" | area:"+area+" | ciudad:"+ciudad+"["+latitude+","+longitude+"] -> "+falta);

		if (isNumber(latitude) && isNumber(longitude)) {
			var popupText = '<h2>'+nombre+'</h2>';
			popupText += '<p>';
			if (area) popupText += area+' / ';
			if (ciudad) popupText += ciudad+'<br><br>';

			if (web) {
				if (web.indexOf("http://") != 0) web = "http://"+web;
				popupText += '<a href="'+web+'" target="_blanc">Web</a><br>';
			}
			if (twitter) {
				if (twitter.indexOf("http://") != 0) twitter = "http://"+twitter;
				popupText += '<a href="'+twitter+'" target="_blanc">Twitter</a><br>';
			}
			if (facebook) {
				if (facebook.indexOf("http://") != 0) facebook = "http://"+facebook;
				popupText += '<a href="'+facebook+'" target="_blanc">Facebook</a><br>';
			}
			popupText += '</p>';

			var marker = L.marker(new L.LatLng( latitude, longitude ), {
				icon: catObjs[0].icon,
				title: nombre
			});
			marker.bindPopup(popupText);

			// save marker to layers
			addCatMarker(area,marker);
		}
	}
	initFilter();
	console.log(i+" entitats loaded");
	map.addLayer(markers);
}

// get category object by category name
function getCat(cat) {
	var cat = cat.split(",");
	var cats = new Array();
    for (var i = 0; i < categorias.length; i++) {
		for (var j = 0; j < cat.length; j++) {
		    if (categorias[i].name === cat[j].trim()) {
		        cats.push(categorias[i]);
			}
		}
    }
    return cats;
}

// add markers to category
function addCatMarker(cat, marker) {
	var cat = cat.split(",");
	categorias.forEach(function(obj,index){
		for (var j = 0; j < cat.length; j++) {
		    if (categorias[index].name === cat[j].trim()) {
				categorias[index].layer.addLayer(marker);
			}
		}
	});
}		

// show all layers
function showAll() {
	$('#filter').find(':checkbox').prop('checked', 'checked');
	markers.clearLayers();
	categorias.forEach(function(obj,index){
		markers.addLayer(categorias[index].layer);
	});
}

// hide all layers
function showNone() {
	$('#filter').find(':checkbox').prop('checked', '');
	markers.clearLayers();
}

// show only this category
function showCat(cats) {
	markers.clearLayers();
	cats.forEach(function(cat,i){
		categorias.forEach(function(obj,j){
			if (categorias[j].name == cats[i]) {
				markers.addLayer(categorias[j].layer);
			}
		});
	});
}

function initFilter() {
	categorias.forEach(function(cat,i){
		if (cat.icon.options.iconUrl) {
			$('#filter').append('<img src="'+cat.icon.options.iconUrl+'" width="24"> <input class="category" type="checkbox" value="'+cat.name+'" checked="checked">'+cat.name+'</br>');
		}
	});

	// category changed
	$('.category').on('change', function(e) {
		var cats=new Array();
		$('#filter input:checked').each(function(){
			cats.push($(this).val());
		});
		showCat(cats);
	});

	$('#filter').append('<br><p><button type="button" onclick="showAll();">Todos</button> <button type="button" onclick="showNone();">Ninguno</button></p>');
}

function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
String.prototype.trim = function() {
	return this.replace(rtrim, '');
};

// Category - superclass
function Category(name, description, icon, color) {
  	this.name = name;
	this.description = description;
	this.layer = new L.LayerGroup();

	if (color == '') color = '#fff';

	if (icon) 
		this.icon = L.MakiMarkers.icon({icon: icon, color: color, size: "m"});
	else {
		this.icon = L.icon({
			iconUrl: 'images/'+name+'.png',
			iconSize:     [24, 24],
			iconAnchor:   [12, 12],
			popupAnchor:  [0, -12],
			color: color
		});
	}
}
