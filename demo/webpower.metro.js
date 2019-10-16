(function() {
	webpower.createNS('webpower.metro');
	webpower.metro.Controller = (function(){
		var DEFAULT_MAP_NAME = 'www';
		var DEFAULT_SELECTOR = '.leaflet-metro';
		function Controller(selector, schemeName, elementForUpdate, callback, errorCallback) {
			this.scheme = new webpower.metro.Scheme();
			this.map = new webpower.metro.Map(selector || DEFAULT_SELECTOR, elementForUpdate);
			this._callback = callback;
			this._errorCallback = errorCallback;

			var dataLoader = new webpower.metro.DataLoader(schemeName || DEFAULT_MAP_NAME);
			dataLoader.load(DEFAULT_MAP_NAME)
				.done($.proxy(this.onSchemeLoad, this))  	
				.fail($.proxy(this.onSchemeLoadFail, this));  	
		}


		Controller.prototype = {
			onSchemeLoad: function(response) {
				var	schemeData = response.data;  
				this.scheme.fill(schemeData);
				this.map.applyScheme(this.scheme);

				if (this._callback && typeof this._callback === 'function') {
					this._callback();
				}

				this.map.render();
			},
			onSchemeLoadFail: function(xhr, err, textErr) {
				if (this._errorCallback && typeof this._errorCallback === 'function') {
					this._errorCallback();
				}	
			},
			remove: function() {
				this.map.remove();
			}		
		};

		return Controller;

	})();

	webpower.metro.Map = (function() {
		var RECT_MARGIN = 1;
		var RECT_ROUND = 3;
		var RECT_COLOR = '#fff';
		var RECT_OPACITY = 0.7;
		var DEFAULT_VIEWPORT_WIDTH = 1150;
		var DEFAULT_VIEWPORT_HEIGHT = 1150;
		var CLASS_LABEL_HOVER = 'highlighted-label';

		function Map(selector, elementForUpdate) {
			this._elementForUpdate = elementForUpdate;
			var svgEL = $(selector).find('svg').get(0);
			// $(svgEL).css({width: DEFAULT_VIEWPORT_WIDTH, height: DEFAULT_VIEWPORT_HEIGHT});

			$(selector).append(svgEL);
			this._svg = svgEL;
			this._mapElement = $(selector).get(0);
			this._root = Snap(this._svg);
			this._selectedStations = {};
			this._selectedLines = {};
			this._isMapFaded = false;
			this._circleLines = [];
			this._leaflet = null;
			this._lineSelect = null; 
		}

		Map.prototype = {
			applyScheme: function(scheme) {
				this.scheme = scheme;
			},
			render: function() {
				var f = Snap.parse(this.scheme.getImageXML());
				this._renderMap(f);
				this._triggerChangeMap();
			},
			getElementForUpdate: function() {
				return this._elementForUpdate;	
			},
			remove: function() {
				if (this._leaflet) {
					this._leaflet.remove();
					var children = this._svg.children;
					var c;
					while (c = children.item(0), c) {
						c.remove();
					}
				}
			},
			getCircleLines: function() {
				return this._circleLines;
			},
			clearSelections: function() {
				Object.keys(this._selectedLines).forEach(function(id){
					var line = this._selectedLines[id];
					this._unselectLine(line);
				}, this);
				Object.keys(this._selectedStations).forEach(function(id){
					var station = this._selectedStations[id];
					this._unselectStation(station);
				}, this);
				this._selectedStations = {};
				this._selectedLines = [];
			},
			selectLineId: function(id) {
				var line = this.scheme.getLineById(id);
				if (line) {
					this._selectLine(line);
				}
			},
			unselectLineId: function(id) {
				var line = this.scheme.getLineById(id);
				if (line) {
					this._unselectLine(line);
				}
			},
			selectStationId: function(id) {
				var station = this.scheme.getStationById(id);
				if (station) {
					this._selectStation(station);
				}
			},
			unselectStationId: function(id) {
				var station = this.scheme.getStationById(id);
				if (station) {
					this._unselectStation(station);
				}
			},
			selectInCircleLineId: function(id) {
				var line = this.scheme.getLineById(id);
				if (line) {
					this._selectInCircleLine(line);
				}	
			},
			onStationClick: function(e) {
				var txtStationId = e.target.id
					.replace('station-', '')
					.replace('highlight-', '');
				var stationId = parseInt(txtStationId, 10);
				var station = this.scheme.getStationById(stationId);
				
				this._toggleStation(station);
			},
			onLinkClick: function(e) {
				var element = e.target;
				var txtLinkId = element.id
					.replace('link-', '')
					.replace('highlight-', '');
				var linkId = parseInt(txtLinkId, 10);
				var line = this.scheme.getLineByLinkId(linkId);
				
				if (!line) {
					return;
				}
				
				this._toggleLine(line);
			},
			onLabelHoverEnter: function(e) {
				e.target.classList.add(CLASS_LABEL_HOVER);
			},
			onLabelHoverOut: function(e) {
				e.target.classList.remove(CLASS_LABEL_HOVER);
			},
			onLabelClick: function(e) {
				var n = e.target;
				while (n.nodeName !== 'g') {
					n = n.parentNode;
				}
				var txtLabelId = n.id.replace('label-', '')
					.replace('highlight-', '');
				var labelId = parseInt(txtLabelId, 10);
				var label = this.scheme.getLabelById(labelId);
				this._toggleStations(label.getStations());
			},
			_fadeMap: function() {
				if (!this._isMapFaded) {
					$(this.layerScheme.node).fadeTo(200, 0.2); 
					this._isMapFaded = true; 
				}
			},
			_unfadeMap: function() {
				if (this._isMapFaded) {
					$(this.layerScheme.node).fadeTo(200, 1);
					this._isMapFaded = false;	
				}
			},	
			_hasSelectedStations: function() {
				return Object.keys(this._selectedStations).length > 0;
			},
			_getSelectedStations: function() {
				return this._selectedStations;
			},
			_isSelectedStation: function(station) {
				var result = false;
				if (station) {
					var stationId  = station.getId();
					result = typeof this._selectedStations[stationId] !== 'undefined';
				}

				return result;
			},
			_toggleStations: function(stations) {
				stations.forEach(this._toggleStation, this);
			},
			_toggleStation: function(station) {
				if (station && !station.isDisabled()) {
					this._isSelectedStation(station)
						? this._unselectStation(station)
						: this._selectStation(station);	
				}
			},
			_isSelectedLine: function(line) {
				var lineId = line.getId();
				return typeof this._selectedLines[lineId] !== 'undefined';
			},
			_toggleLine: function(line) {
				if (this._lineSelect) {
					this._lineSelect.toggleOptionByLine(line);
				}
				if (this._isSelectedLine(line)) {
					this._unselectLine(line);
				} else {
					this._selectLine(line);
				}
			},
			_unselectLine: function(line) {
				var lineId = line.getId();
				if (this._isSelectedLine(line)) {
					var stations = this.scheme.getStationsByLine(line);
					this._unselectStations(stations);
					this._markLineAsUnselected(line);
				}
			},
			_markLineAsUnselected: function(line) {
				var lineId = line.getId();
				if (this._selectedLines[lineId]) {
					var links = this.scheme.getLinksByLine(line);
					links.forEach(function(link) {
						var selectedLinkElement = this.layerLinksHighlight
							.select('#link-highlight-' + link.getId());
						selectedLinkElement && selectedLinkElement.remove();
					}, this);

					delete this._selectedLines[lineId];
				}
			},
			_markLineAsSelected: function(line) {
				var lineId = line.getId();
				if (!this._selectedLines[lineId]) {
					var links = this.scheme.getLinksByLine(line);
					this._selectLinks(links);
					this._selectedLines[lineId] = line;
				}
			},
			_selectLinks: function(links) {
				links.forEach(function(link){
					var linkElement = this.layerLinks.select('#link-' + link.getId());
					var clone = linkElement.clone();
					clone.attr('id', 'link-highlight-' + link.getId());
					clone.click(this.onLinkClick, this);
					this.layerLinksHighlight.append(clone);
				}, this);
			},
			_selectLine: function(line) {
				var lineId = line.getId();
				if (!this._isSelectedLine(line)) {
					var stations = this.scheme.getStationsByLine(line);
					this._markLineAsSelected(line);
					this._selectStations(stations);
				}
			},
			_unselectStations: function(stations) {
				stations.forEach(this._unselectStation, this);
			},
			_selectStations: function(stations) {
				stations.forEach(this._selectStation, this);
			},
			_allStationInLineSelected: function(line) {
				var isSelectedStation = function(selectedStations) { 
					var dict = Object.keys(selectedStations).reduce(function(dict, stationId){
						dict[stationId] = true;
						return dict; 
					}, {});
					return function(station) {
						return !dict[station.getId()];
					}
				}(this._selectedStations);
				var unselectedStation = this.scheme.getStationsByLine(line)
					.find(isSelectedStation);
				return unselectedStation == null;
			},
			_selectStationsFromInput: function() {
				var stationIds = this._elementForUpdate.val().split(',');
				var linesToCheck = {};
				if (stationIds && stationIds.length) {
					stationIds.forEach(function(stationId) {
						stationId = parseInt(stationId, 10);
						if (!isNaN(stationId)) {
							var station = this.scheme.getStationById(stationId);
							if (station) {
								var line = station.getLine();
								linesToCheck[line.getId()] = line;
								this._selectStation(station);
							}
						}
					}, this);

					Object.keys(linesToCheck).forEach(function(lineId) {
						this._updateMarkForLine(linesToCheck[lineId]);
					}, this);

				}
			},
			_unselectStation: function(station) {
				if (!!station) {
					var stationId = station.getId();
					var labelId = station.getLabelId();
					
					var selectedStationElement = this.layerStationsHighlight
						.select('#station-highlight-' + stationId);
					var selecterLabelElement = this.layerLabelsHighlight
						.select('#label-highlight-'+ labelId);
					selectedStationElement && selectedStationElement.remove();
					selecterLabelElement && selecterLabelElement.remove();	
					
					delete this._selectedStations[stationId];

					this._updateMarkForLine(station.getLine());

					if (!this._hasSelectedStations()) {
						this._unfadeMap();
					}
					this._triggerChangeMap();
				}
			},
			_updateMarkForLine: function(line) {
				if (this._allStationInLineSelected(line)) {
					this._markLineAsSelected(line);
					this._lineSelect && this._lineSelect.selectLineOption(line);
				} else {
					this._markLineAsUnselected(line);
					this._lineSelect && this._lineSelect.unSelectLineOption(line);
				}
			},
			_selectStation: function(station) {
				if (!!station && !this._isSelectedStation(station)) {
					var stationId = station.getId();
					var labelId = station.getLabelId();
					var stationElement = this.layerStations
						.select('#station-' + stationId);
					var labelElement = this.layerLabels
						.select('#label-' + labelId);
					var clone = stationElement.clone();
					var cloneLabel = labelElement.clone();

					clone.attr('id', 'station-highlight-' + stationId);
					clone.click(this.onStationClick, this);
					cloneLabel.attr('id', 'label-highlight-' + labelId);
					this._initLabel(cloneLabel);

					this.layerStationsHighlight.append(clone);
					this.layerLabelsHighlight.append(cloneLabel);
					this._selectedStations[stationId] = station;
					this._fadeMap();
					this._updateMarkForLine(station.getLine());
					this._triggerChangeMap();
				}
			},
			_triggerChangeMap: function() {
				var selectedStions = this._selectedStations;
				var list = Object.keys(this._selectedStations).map(function(stationId){
					var station = selectedStions[stationId];
					return {id: station.getId(), label: station.getName(), color: station.getLine().getColor()};
				});
				
				
				if (this._rendered && this._elementForUpdate && this._elementForUpdate.trigger) {
					var evt = new $.Event('metro.stations.updated', {list: list});
					this._elementForUpdate.trigger(evt);
				}
			},
			_makeLabelsBackgrounds: function() {
				var labels = this.layerLabels.selectAll('g');
				var i, l;
				for (i = 0, l = labels.length; i < l; i++) {
					var label = labels[i];
					var bbox = label.getBBox();
					label.rect(
						bbox.x - RECT_MARGIN,
						bbox.y - RECT_MARGIN,
						bbox.width + 2 * RECT_MARGIN,
						bbox.height + 2 * RECT_MARGIN,
						RECT_ROUND,
						RECT_ROUND
					).attr({
						fill: RECT_COLOR,
						opacity: RECT_OPACITY
					}).prependTo(label);
				}
			},
			_renderMap: function(fragment) {
				var g = fragment.select('g');
				var wh = this._getViewportWidthHeight(fragment);
				var width = wh.width || DEFAULT_VIEWPORT_WIDTH;
				var height = wh.height || DEFAULT_VIEWPORT_HEIGHT;
				this._root.attr({
					viewBox: [0, 0, width, height]
				});
				this._root.append(g);
				this._rendered = false;
				this._createLayers();
				this._initLabels();
				this._initStations();
				this._initLines();
				this._initLeafLet(width, height);
				this._initExtendsElements();
				this._selectStationsFromInput();
				this._rendered = true;
			},
			_getViewportWidthHeight: function(fragment) {
				function parseDimension(strValue) {
					if (!strValue && !strValue.replace) {
						return false;
					}

					var intValue = parseInt(strValue.replace('px', ''));
					if (isNaN(intValue)) {
						return false;
					}

					return intValue;
				}
				var wh = {
					width: false,
					height: false
				};


				var node = fragment.node;
				if (node && node.firstElementChild) {
					var firstChild = node.firstElementChild;
					var width = firstChild.getAttribute('width');
					var height = firstChild.getAttribute('height');

					wh.width = parseDimension(width);
					wh.height = parseDimension(height);
				}

				return wh;
			},
			_initExtendsElements: function() {
				var stations = this.scheme.getStations();
				var lines = this.scheme.getLines();
				
				this._lineSelect = new webpower.metro.LinesSelector(lines);
				this._lineSelect.onSelect($.proxy(this.selectLineId, this));
				this._lineSelect.onUnselect($.proxy(this.unselectLineId, this));
				this._suggestionsInput = new webpower.metro.StationSuggestionInput(
					stations
				);
				this._suggestionsInput.onSelect($.proxy(this.selectStationId, this));
				this._clearLink = new webpower.metro.ClearLink(this);
				this._clearLink.onClick($.proxy(this.clearSelections, this));
				this._applyButton = new webpower.metro.ButtonApply();
			},
			_initLeafLet: function(width, height) {
				var map = L.map(this._mapElement, {
  					minZoom: 2,
  					maxZoom: 4,
  					center: [0, 0],
  					zoom: 2,
  					crs: L.CRS.Simple,
					zoomControl: false,
					attributionControl: false
				});
				
				var layer = L.zoomLayer(this._svg, width, height);
				L.control.zoom({position: 'bottomleft'}).addTo(map);
				layer.addTo(map);
				layer.bringToFront();
				
				this._leaflet = map;
			},
			_selectInCircleLine: function(line) {
				var stations = this.scheme.getStationsByLine(line);
				var points = stations.slice(0, 3).map(function(station){
					var stationId = station.getId();
					var el = this.layerStations.select('#station-' + stationId);
					// Здесь берем атрибуты (cx, cy), так как bbox не считается почему то в модальном окне.
					return {x:parseInt(el.attr('cx'), 10), y:parseInt(el.attr('cy'), 10)};
				}, this);
				var centerRadius = this._getCenterRadius(points);
				var etR = centerRadius.radius - 10.0;
				// this.layerScheme.circle(centerRadius.center.x, centerRadius.center.y, etR); 
				this.layerStations.selectAll('circle').forEach(function(circle){
					if (this._radius(circle, centerRadius.center) < etR) {
						var stationId = parseInt(circle.attr('id').replace('station-', ''), 10);
						this.selectStationId(stationId);
					}
				}, this);

			},
			_getCenterRadius: function(points) {
				var p1 = points[0];
				var p2 = points[1];
				var p3 = points[2];

				var offset = Math.pow(p2.x,2) + Math.pow(p2.y,2);
				var bc = (Math.pow(p1.x,2) + Math.pow(p1.y,2) - offset ) / 2.0;
    			var cd = (offset - Math.pow(p3.x, 2) - Math.pow(p3.y, 2)) / 2.0;
    			var det = (p1.x - p2.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p2.y); 

    			if (Math.abs(det) < .000000000001) { 
    				throw Error('det < 0'); 
    			}

    			var idet = 1 / det;
    			var centerx = (bc * (p2.y - p3.y) - cd * (p1.y - p2.y)) * idet;
    			var centery = (cd * (p1.x - p2.x) - bc * (p2.x - p3.x)) * idet;
    			var radius = Math.sqrt( Math.pow(p2.x - centerx, 2) + Math.pow(p2.y-centery, 2));

    			return {center: {x: centerx, y:centery - 2}, radius: radius};
			},
			_createLayers: function() {
				this.layerScheme = this._root.select('#scheme-layer');
				this.layerLabels = this._root.select('#scheme-layer-labels');
				this.layerStations = this._root.select('#scheme-layer-stations');
				this.layerLinks = this._root.select('#scheme-layer-links');
				this.layerHighlight = this._root.select("#highlight-layer");
				this.layerLabelsHighlight = this._root.select("#highlight-layer-labels");
            	this.layerStationsHighlight = this._root.select("#highlight-layer-stations");
				this.layerLinksHighlight = this._root.select('#highlight-layer-links');
			},
			_radius: function(stationElement, center) {
				var cx = stationElement.attr('cx');
				var cy = stationElement.attr('cy');

				var dx = center.x - cx;
				var dy = center.y - cy;
				
				return Math.round(	
					Math.sqrt(dx * dx + dy * dy)
				);
			},	 

			_initLabel: function(label) {
				label.hover(
					this.onLabelHoverEnter,
					this.onLabelHoverOut,
					this
				);
				label.click(this.onLabelClick, this);
			},
			_initLabels: function() {
				var labels  = this.layerLabels.selectAll('g');
				//this._makeLabelsBackgrounds();
				labels.forEach(this._initLabel, this);
			},
			_initStations: function() {
				var stations = this.layerStations.selectAll('circle');

				stations.forEach(function(station) {
					station.click(this.onStationClick, this);
				}, this);
				
				
				$(document).on('webpower.metro.toggle', $.proxy(function(e, data) {
					this._toggleStation(this.scheme.getStationById(data.id));
				}, this));
			},
			_initLines: function() {
				var links = this.layerLinks.selectAll('path');
				links.forEach(function(link) {
					link.click(this.onLinkClick, this);
				}, this);

				this._circleLines = this._findCircleLines();
			},
			_findCircleLines: function() {
				var mapLinkLines = {};
				var circleLines = [];
				var links = this.scheme.getLinks();
				
				links.sort(function(la, lb) {
					var laId = la.getId() + '';
					var lbId = lb.getId() + '';
					var laSubstr = laId.length / 2;
					var lbSubstr = lbId.length / 2;
					 

					return parseInt(laId.substr(laSubstr), 10) - parseInt(lbId.substr(lbSubstr), 10);
				});

				links.forEach(function(link){
					var fromStation = link.getFromStation();
					var toStation = link.getToStation();

					if (fromStation && toStation && (fromStation.getLine().getId() === toStation.getLine().getId())) {
						var id = this.scheme.getLineByLinkId(link.getId()).getId();
						var mapObj = {fromStation: link.getFromStation(), toStation: link.getToStation()};
						var visitedStations = [];
					
						if (!mapLinkLines[id]) {
							mapLinkLines[id] = [mapObj];
						} else {
							mapLinkLines[id].push(mapObj);
						}	
					}
				}, this);

				Object.keys(mapLinkLines).forEach(function(lid) {
					var graph = webpower.metro.GraphFabric(mapLinkLines[lid]);
					if (graph.isCyclic()) {
						circleLines.push(this.scheme.getLineById(lid));	
					}
				}, this); 

				return circleLines;
			}
		}

		return Map;
	})();

	webpower.metro.GraphFabric = (function(){
		function GraphFabric(links) {
			var graph = new webpower.datastruct.Graph();
			var addVertexIfNotExists = function(vertex) {
				if (!graph.getVertex(vertex)) {
		    		graph.addVertex(vertex);
		    	}
			}

			links.forEach(function(link){
	    		var from = link.fromStation.getId();
	    		var to = link.toStation.getId();
	    		
	    		addVertexIfNotExists(from);
	    		addVertexIfNotExists(to);
	    		graph.addEdge(from, to);
			});

			return graph;
		}

		return GraphFabric;
	})();

	webpower.metro.Scheme = (function(){
		function Scheme() {
			this.imageXML = null;
		}

		Scheme.prototype = {
			fill: function(data) {
				if (data.length == 2 && data[0].data && data[1].data) {
					this.imageXML = data[0].data;
			
					var schemeJSON = data[1].data;
					var schemeData = JSON.parse(schemeJSON);
					this._parseEntitiesData(schemeData);
				} else {
					throw Error('Неправильный формат ответа.');
				}
				
			},
			getLabelById: function(labelId) {
				return this._labels[labelId];
			},
			getStationById: function(stationId) {
				return this._stations[stationId];
			},
			getLinkById: function(id) {
				return this._links[id];
			},
			getLineByLinkId: function(id) {
				var link = this.getLinkById(id);
				if (!link) {
					return null;
				}

				var station = link.getFromStation() || link.getToStation();
				if (!station) {
					return null;
				}

				return station.getLine();
			},
			getLines: function() {
				return this._linesArray;
			},
			getStations: function() {
				return this._stationsArray;
			},
			getLinks: function() {
				return this._linksArray;
			},
			getLinksByLine: function(line) {
				return this._linksArray.filter(function(link){
					var fromStation = link.getFromStation();
					var fromLine = (fromStation) ? fromStation.getLine().getId() : null;
					var toStation = link.getToStation();
					var toLine = (toStation) ? toStation.getLine().getId() : null;

					return fromLine && toLine && fromLine == line.getId() && fromLine == toLine;
				});
			},
			getStationsByLine: function(line) {
				var lineId = line.getId();
				return this._stationsArray.filter(function(station){
					return station.getLine().getId() == lineId;
				});
			},
			getLineById: function(id) {
				return this._lines[id];
			},
			getImageXML: function() {
				return this.imageXML;
			},
			_parseEntitiesData: function(data) {
				this._lines = this._createLineList(data.lines);
				this._linesArray = this._createArray(this._lines);
				this._links = this._createLinkList(data.links);
				this._linksArray = this._createArray(this._links);
				this._stations = this._createStationList(data.stations);
				this._stationsArray = this._createArray(this._stations);
				this._labels = this._createLabelList(data.labels);
				this._labelsArray = this._createArray(this._labels);
				this._fillLinks(data.links);
			},
			_fillLinks: function(links) {
	            if (!this._links || !this._stations) {
	                throw new Error("Непроинициализированы связи и станции");
	            }
	            Object.keys(this._links).forEach(function(linkId) {
	                this._links[linkId].setFromStation(this._stations[links[linkId].fromStationId]),
	                this._links[linkId].setToStation(this._stations[links[linkId].toStationId])
	            }, this)
        	},
			_createLineList: function(lines) {
	            return Object.keys(lines).reduce(function(prev, id) {
	                var cLine = lines[id];
	                prev[id] = new webpower.metro.Line({
	                    id: parseInt(id, 10),
	                    name: cLine.name,
	                    color: cLine.color
	                });
	                return prev;
	            }, {});
        	},
        	_createLabelList: function(labels) {
	            var stations = this._stations;
	            return Object.keys(labels).reduce(function(prev, id) {
	                var lStations = labels[id].stationIds.map(function(id) {
	                    return stations[id];
	                });
	                prev[id] = new webpower.metro.Label({
	                    id: parseInt(id, 10),
	                    stations: lStations
	                });

	                return prev;
	            }, {});
        	},
        	_createLinkList: function(links) {
	            return Object.keys(links).reduce(function(prev, id) {
	                prev[id] = new webpower.metro.Link({
	                    id: parseInt(id, 10),
	                    fromStation: null,
	                    toStation: null,
	                    transferId: links[id].transferId
	                });
	                return prev;
	            }, {});
        	},
        	_createStationList: function(stations) {
	            if (!this._lines && !this._links) {
	                throw new Error("Непроинициализированы линии метро.");
	            }
	            var self = this;
	            return Object.keys(stations).reduce(function(prev, id) {
	            	links = stations[id].linkIds.map(function(id) {
                    	return self._links[id];
                	});
	                prev[id] = new webpower.metro.Station({
	                    id: parseInt(id, 10),
	                    links: links,
	                    name: stations[id].name,
	                    line: self._lines[stations[id].lineId],
	                    labelId: stations[id].labelId,
	                });
	                return prev;
	            }, {});
        	},
        	_createArray: function(list) {
        		return Object.keys(list).map(function(id){
        			return list[id];
        		});
        	}
		};

		return Scheme;
	})();

	webpower.metro.DataLoader = (function(){
		function DataLoader(name) {
			this._url = '/api/json/locations/getMetroMap/';
			this._name = name;
		}
		DataLoader.prototype = {
			load: function() {
				return webpower.request(this._url, {
					name: this._name 
				});
			},
		};

		return DataLoader;
	})();

	webpower.metro.Transfer = (function(){
		function Transfer(data) {
			this._id = t.id;
			this._stationIds = t.stationIds;
		}
		Transfer.prototype = {
			getId: function() {
				return this._id;
			},
			getStationIds: function() {
				return this._stationIds;
			}
		};

		return Transfer;
	})();

	webpower.metro.Station = (function(){
		function Station(data) {
			this._id = data.id;
			this._links = data.links;
			this._dbId = data.dbId;
			this._name = data.name;
			this._line = data.line;
			this._labelId = data.labelId;
		}

		Station.prototype = {
			getId: function() {
				return this._id;
			},
			getDbId: function() {
				return this.dbId;
			},
			getName: function() {
				return this._name;
			},
			getLine: function() {
				return this._line;
			},
			getLabelId: function() {
				return this._labelId;
			},
			getLinks: function() {
				return this._links;
			},
			isDisabled: function() {
				return false;
			},
		};

		return Station;
	})();

	webpower.metro.Line = (function(){
		function Line(data) {
			this._id = data.id;
			this._name = data.name;
			this._color = data.color;
		}

		Line.prototype = {
			getId: function() {
				return this._id
			},
			getName: function() {
				return this._name
			},
			getColor: function() {
				return this._color
			}
		};

		return Line;
	})();

	webpower.metro.Label = (function(){
		function Label(data) {
			this._id = data.id;
			this._stations = data.stations;
			this._isMultiStation = this._stations.length > 1;
		}

		Label.prototype = {
			getId: function() {
				return this._id;
			},
			getStations: function() {
				return this._stations;
			},
			isMultiStation: function() {
				return this._isMultiStation;
			}
		};

		return Label;
	})();

	webpower.metro.Link = (function(){
		function Link(data) {
			this._id = data.id;
			this._toStation = data.toStation;
            this._fromStation = data.fromStation;
            this._transferId = data.transferId;
            this._weightTransfers = data.weightTransfers;
		}

		Link.prototype = {
			getId: function() {
				return this._id;
			},
			getToStation: function() {
				return this._toStation;
			},
			getFromStation: function() {
				return this._fromStation;
			},
			getTransferId: function() {
				return this._transferId;
			},
			setFromStation: function(fromStation) {
				this._fromStation = fromStation;
			},
			setToStation: function(toStation) {
				this._toStation = toStation;
			},
			isTransfer: function() {
				return 0 !== this._weightTransfers;
			}
		};

		return Link;
	})();

	webpower.metro.LinesSelector = (function(){
		var 
			SELECTOR_SELECT = '#modal-metro [name=lines]',
			disable_search_threshold = 9999;
		
		function LinesSelector(lines) {
			this._lines = [];
			this._selected = {};
			this._onLineSelectCallback = function() {};
			this._onLineUnselectCallback = function() {};
			this._$selector = $(SELECTOR_SELECT);
			this._populateSelector(lines);
			this._initChosen()
		}

		LinesSelector.prototype = {
			toggleOptionByLine: function(line) {
				var $lineOption = this._getOptionByLine(line);
				this._toggleOption($lineOption);
			},
			selectLineOption: function(line) {
				var $lineOption = this._getOptionByLine(line);
				this._selectOption($lineOption);
			},
			unSelectLineOption: function(line) {
				var $lineOption = this._getOptionByLine(line);
				this._unSelectOption($lineOption);
			},
			_populateSelector: function(lines) {
				if (lines && lines.length) {
					this._lines = lines;
					this._$selector.append($('<option>').val(0).text('выбрать линию'));
					this._$selector.find("option[value='0']").addClass('hidden-chosen-with-drop');
					lines.forEach($.proxy(this._createOptionFromLine, this));
				} else {
					this._$selector.prop('disabled', true);
				}	
			},
			_createOptionFromLine: function(line) {
				var $lineSpan = $('<span></span>')
					.addClass('metro-lines')
					.css('background-color', line.getColor()); 
				var $lineSpanName = $('<span></span>')
					.addClass('metro-lines-name')
					.text(line.getName())
				var $option = $('<option>')
					.val(line.getId())
					 .append($lineSpan)
					 .append($lineSpanName);
					//  .append(line.getName());
				
				this._$selector.append($option);
			},
			_selectLine: function(value) {
				var lineId = parseInt(value);
				this._onLineSelectCallback.call(null, lineId);
			},
			_unselectLine: function(value) {
				var lineId = parseInt(value);
				this._onLineUnselectCallback.call(null, lineId);
			},
			_toggleLine: function(value, status) {
				var func = (status) ? this._selectLine : this._unselectLine;

				func.call(this, value); 
			},
			_toggleOption: function($option) {
				var index = $option.index();
				if (!!this._selected[index]) {
					this._unSelectOption($option);
				} else {
					this._selectOption($option);
				}
				return !!this._selected[index];
			},
			_selectOption: function($option) {
				var index = $option.index();
				$option.prop('selected', true);
				this._selected[index] = true;
				this._$selector.trigger('chosen:updated');
			},
			_unSelectOption: function($option) {
				var index = $option.index();
				$option.prop('selected', false);
				delete this._selected[index];
				this._$selector.trigger('chosen:updated');
			},
			_getOptionByLine: function(line) {
				var id = line.getId();
				return $lineOption = this._$selector
					.find('option[value=' + id + ']');
			},
			_initChosen: function() {
				var self = this;
				var patchChosen = function() {
					var $select = $(this);
					var $container = $select.next();
					var selected = {}; 
					/* Убираем поиск, так как настройка влияет только на одиночный селект */
					$container.find('input').prop('readonly', true);
					$container.addClass('chosen-container-single-nosearch');
					/* Добавляем возможность снимать выделения */
					$container.on('click', '.result-selected', function(e) {
						e.preventDefault();
						var $element = $(this);
						var index = parseInt($element.data('option-array-index'));
						if (isNaN(index)) {
							console.error('Index of line is NaN');
							return;
						}
						var $option = $select.find('option').eq(index);
						var status = self._toggleOption($option);
						self._toggleLine($option.val(), status);
					});
				};

				var origChosen = $(SELECTOR_SELECT)
					.on('chosen:ready', patchChosen)
					.chosen({
						disable_search: true,
						placeholder_text_multiple: 'выберите линию',
					}).data('chosen');

				if (!!origChosen) {
					origChosen.show_search_field_default = function() {
					return (!this.active_field) 
						? (
							this.search_field.addClass('default'), 
							this.search_field.val(this.default_text)
						) 
						: (
							this.search_field.removeClass('default'), 
							this.search_field.val("")
						);
					};
				}
			},
			_checkCallback: function(callback) {
				if (typeof callback !== 'function') {
					throw new Error('Callback is not a function.');
				}
			},
			onSelect: function(callback) {
				this._checkCallback(callback);
				this._onLineSelectCallback = callback;
			},
			onUnselect: function(callback) {
				this._checkCallback(callback);
				this._onLineUnselectCallback = callback;
			}
		};


		return LinesSelector;

	})();

	webpower.metro.StationSuggestionInput = (function() {
		var SELECTOR_SUGGESTION_INPUT = '#modal-metro [name=station_suggestion]';
		function StationSuggestionInput(stations) {
			this._suggestionElements = this._createSuggestionsElements(stations);
			this._$suggestionsInput = $(SELECTOR_SUGGESTION_INPUT);
			this._onStationSelectCallback = function() {};
			this._initSuggestions();
		}
		
		StationSuggestionInput.prototype = {
			_createSuggestionsElements: function(stations) {
				var extract = function (stationOrLine) {
					return {
						id: stationOrLine.getId(), 
						name: stationOrLine.getName(), 
						object: stationOrLine,
					}
				};
				var alphabet = function(a, b) {
					if (a > b) {
						return 1;
					} else if (a < b) {
						return -1;
					} else {
						return 0;
					}
				};
				
				return stations.map(extract).sort(alphabet);
			},
			_initSuggestions: function() {
				this._$suggestionsInput.typeahead(
					{
						autoselect: true,
						highlight: false,
						hint: false
					},
					{
						source: $.proxy(this._source, this),
						templates: {
							suggestion: $.proxy(this._suggestionTemplate, this)
						},
						display: 'name',
						empty: $.proxy(this._empty, this)
					}
				).on('typeahead:select', $.proxy(this._onSelected, this))
				 .on('keypress', $.proxy(this._autoselect, this));
				
			},
			_autoselect: function(e) {
				if (e.keyCode == 13) {
					e.preventDefault();
					var selectables = $(e.target).siblings(".tt-menu").find(".tt-selectable");
					if (selectables.length > 0){
						$(selectables[0]).trigger('click');    
					}
				}
			},
			_source: function(query, callback) {
				var suggestions = this._suggestionElements.filter(function(element) {
					var result = false;
					if (query.length) {
						result = element.name.toLowerCase().indexOf(query.toLowerCase()) !== -1
					}
					return result; 
				});
				callback(suggestions);
			},
			_empty: function() {
				return null;
			},
			_suggestionTemplate: function(item) {
				return '<div class="tt-suggestions-object text-small">' + item.name + '</div>';
			},
			_onSelected: function(e, suggestion) {
				this._onStationSelectCallback.call(null, suggestion.id);
				this._$suggestionsInput.typeahead('val', '');
			},
			onSelect: function(callback) {
				if (typeof callback !== 'function') {
					throw new Error('Callback is not a function.');
				}

				this._onStationSelectCallback = callback;
			}
		};
		return StationSuggestionInput;

	})();

	webpower.metro.ClearLink = (function() {
		var CLEAR_LINK_SELECTOR = '.js-stations-clear';
		function ClearLink(metroMap) {
			this._onClickCallback = function() {};
			this.metroMap = metroMap;
			this.$link = $(CLEAR_LINK_SELECTOR);
			this.$link.on('click', $.proxy(this.onClicked, this));
			$(metroMap.getElementForUpdate()).on(
				'metro.stations.updated', 
				$.proxy(this.onMetroUpdated, this)
			);
		}

		ClearLink.prototype = {
			onClicked: function() {
				this._onClickCallback.call(null);
			},
			onClick: function(callback) {
				if (typeof callback !== 'function') {
					throw new Error('Callback is not a function.');
				}

				this._onClickCallback = callback;
			},
			onMetroUpdated: function(e) {
				if (e.list && e.list.length) {
					this.$link.show();
				} else {
					this.$link.hide();
				}
			}
		}

		return ClearLink;
	})();

	webpower.metro.ButtonApply = (function() {
		var	BUTTON_SELECTOR = '.js-apply';
		var DIALOG_SELECTOR = '.modal';
		function ButtonApply() {
			this._$button = $(BUTTON_SELECTOR);
			this._$button.on('click', $.proxy(this.onClick, this));
			this._$dialog = this._$button.parents(DIALOG_SELECTOR);
		}

		ButtonApply.prototype = {
			onClick: function() {
				this._$dialog.trigger('apply.filter.metro').modal('hide');
			}
		}

		return ButtonApply;
	})();
})();
