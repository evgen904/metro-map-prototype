var enablePan = 1; // 1 or 0: enable or disable panning (default enabled)
var enableZoom = 1; // 1 or 0: enable or disable zooming (default enabled)
var enableDrag = 0; // 1 or 0: enable or disable dragging (default disabled)

/// <====
/// END OF CONFIGURATION 

var root = document.querySelector('.svg-drag');

var state = 'none', svgRoot, stateTarget, stateOrigin, stateTf;

setupHandlers(root);

/**
 * Register handlers
 */
function setupHandlers(root){
	setAttributes(root, {
		"onmouseup" : "handleMouseUp(evt)",
		"onmousedown" : "handleMouseDown(evt)",
		"onmousemove" : "handleMouseMove(evt)",
		//"onmouseout" : "handleMouseUp(evt)", // Decomment this to stop the pan functionality when dragging out of the SVG element
	});

	if(navigator.userAgent.toLowerCase().indexOf('webkit') >= 0)
		window.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
	else
		window.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
}

/**
 * Retrieves the root element for SVG manipulation. The element is then cached into the svgRoot global variable.
 */
function getRoot(root) {
	if(typeof(svgRoot) == "undefined") {
		var g = null;

		g = root.getElementById("viewport");

		if(g == null)
			g = root.getElementsByTagName('g')[0];

		if(g == null)
			alert('Unable to obtain SVG root element');

		setCTM(g, g.getCTM());

		g.removeAttribute("viewBox");

		svgRoot = g;
	}

	return svgRoot;
}

/**
 * Instance an SVGPoint object with given event coordinates.
 */
function getEventPoint(evt) {
	var p = root.createSVGPoint();

	p.x = evt.clientX-root.getBoundingClientRect().left;
	p.y = evt.clientY-root.getBoundingClientRect().top;

	return p;
}

/**
 * Sets the current transform matrix of an element.
 */
function setCTM(element, matrix) {
	var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

	element.setAttribute("transform", s);
}

/**
 * Dumps a matrix to a string (useful for debug).
 */
function dumpMatrix(matrix) {
	var s = "[ " + matrix.a + ", " + matrix.c + ", " + matrix.e + "\n  " + matrix.b + ", " + matrix.d + ", " + matrix.f + "\n  0, 0, 1 ]";

	return s;
}

/**
 * Sets attributes of an element.
 */
function setAttributes(element, attributes){
	for (var i in attributes)
		element.setAttributeNS(null, i, attributes[i]);
}

/**
 * Handle mouse wheel event.
 */
function handleMouseWheel(evt) {

	if(!enableZoom)
		return;

	if(evt.preventDefault)
		evt.preventDefault();

	evt.returnValue = false;

	var svgDoc = evt.target.ownerDocument;

	var delta;

	if(evt.wheelDelta)
		delta = evt.wheelDelta / 3600; // Chrome/Safari
	else
		delta = evt.detail / -90; // Mozilla

	var z = 1 + delta*10; // Zoom factor: 0.9/1.1

	var g = getRoot(svgDoc);
	
	var p = getEventPoint(evt);

	p = p.matrixTransform(g.getCTM().inverse());

	// Compute new scale matrix in current mouse position
	var k = root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);

        setCTM(g, g.getCTM().multiply(k));

	if(typeof(stateTf) == "undefined")
		stateTf = g.getCTM().inverse();

	stateTf = stateTf.multiply(k.inverse());
}

/**
 * Handle mouse move event.
 */
function handleMouseMove(evt) {
	if(evt.preventDefault)
		evt.preventDefault();

	evt.returnValue = false;

	var svgDoc = evt.target.ownerDocument;

	var g = getRoot(svgDoc);

	if(state == 'pan' && enablePan) {
		// Pan mode
		var p = getEventPoint(evt).matrixTransform(stateTf);

		setCTM(g, stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y));
	} else if(state == 'drag' && enableDrag) {
		// Drag mode
		var p = getEventPoint(evt).matrixTransform(g.getCTM().inverse());

		setCTM(stateTarget, root.createSVGMatrix().translate(p.x - stateOrigin.x, p.y - stateOrigin.y).multiply(g.getCTM().inverse()).multiply(stateTarget.getCTM()));

		stateOrigin = p;
	}
}

/**
 * Handle click event.
 */
function handleMouseDown(evt) {
	if(evt.preventDefault)
		evt.preventDefault();

	evt.returnValue = false;

	var svgDoc = evt.target.ownerDocument;

	var g = getRoot(svgDoc);

	if(
		evt.target.tagName == "svg" 
		|| !enableDrag // Pan anyway when drag is disabled and the user clicked on an element 
	) {
		// Pan mode
		state = 'pan';

		stateTf = g.getCTM().inverse();

		stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
	} else {
		// Drag mode
		state = 'drag';

		stateTarget = evt.target;

		stateTf = g.getCTM().inverse();

		stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
	}
}

/**
 * Handle mouse button release event.
 */
function handleMouseUp(evt) {
	if(evt.preventDefault)
		evt.preventDefault();

	evt.returnValue = false;

	var svgDoc = evt.target.ownerDocument;

	if(state == 'pan' || state == 'drag') {
		// Quit pan mode
		state = '';
	}
}






document.addEventListener("DOMContentLoaded", function(event) {

	// let mapBlock = document.querySelector('.js-map-wrap');
	// let moveBlockEl = document.querySelector('.js-block-drag');
	// let positionBlock = mapBlock.getBoundingClientRect();

	// let startX = 0;
	// let startY = 0;

	// mapBlock.addEventListener('mousedown', downBlock);

	// function downBlock(event) {
	// 	document.addEventListener('mousemove', moveBlock);
	// 	document.addEventListener('mouseup', upBlock);
	// 	startX = event.pageX - moveBlockEl.getBoundingClientRect().left;
	// 	startY = event.pageY - moveBlockEl.getBoundingClientRect().top;
	// }

	// function moveBlock(event) {
	// 	// узнаем на сколько сместили курсор
	// 	let thisPosX = (event.pageX - startX) - positionBlock.left;
	// 	let thisPosY = (event.pageY - startY) - positionBlock.top;
	// 	moveBlockEl.style.transform = `translate3d(${thisPosX}px, ${thisPosY}px, 0px)`;
	// };
	// function upBlock(event) {	
	// 	//console.log('up');
	// 	document.removeEventListener('mousemove', moveBlock)
	// 	setTimeout(() => {
	// 		document.removeEventListener('mousedown', downBlock)
	// 		document.removeEventListener('mouseup', upBlock)
	// 	});
	// };













	/*

	var ball = document.querySelector('.js-map-wrap');
	ball.onmousedown = function(e) {


		var blockX = document.querySelector('.js-map-wrap').getBoundingClientRect().left
		var blockY = document.querySelector('.js-map-wrap').getBoundingClientRect().top

		var coords = getCoords(ball);
		var shiftX = e.pageX - coords.left;
		var shiftY = e.pageY - coords.top;
		//ball.style.position = 'absolute';
		//document.body.appendChild(ball);

		moveAt(e);
		//ball.style.zIndex = 1000; // над другими элементами
		function moveAt(e) {


			document.querySelector('.block-drag').style.transform = `translate3d(${(e.pageX - shiftX) - blockX}px, 0px, 0px)`;
			







		}
		document.onmousemove = function(e) {
			moveAt(e);
		};
		ball.onmouseup = function() {
			document.onmousemove = null;
			ball.onmouseup = null;
		};
	}
	ball.ondragstart = function() {
		return false;
	};

	function getCoords(elem) { // кроме IE8-
		var box = elem.getBoundingClientRect();
		return {
			top: box.top + pageYOffset,
			left: box.left + pageXOffset
		};
	}


	*/







	/**/
/*

	let svgEl = '<?xml version="1.0" encoding="utf-8"?> <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="780px" height="555px"><g id="transform-wrapper" transform="scale(1 1)"><g id="scheme-layer"><g id="scheme-layer-background"><rect x="0" y="0" width="780" height="555" fill="#fff" stroke="none"/></g><g id="scheme-layer-links" fill="none" stroke-width="8"><path id="link-1002" d="M378,15L378,35" stroke="#EF1E25"/><path id="link-2003" d="M378,35L378,55" stroke="#EF1E25"/><path id="link-3004" d="M378,55L378,75" stroke="#EF1E25"/><path id="link-4005" d="M378,75L378,95" stroke="#EF1E25"/><path id="link-5006" d="M378,95L378,115" stroke="#EF1E25"/><path id="link-6007" d="M378,115L378,135" stroke="#EF1E25"/><path id="link-7008" d="M378,135L378,155" stroke="#EF1E25"/><path id="link-8009" d="M378,155L378,175" stroke="#EF1E25"/><path id="link-9010" d="M378,175L378,205" stroke="#EF1E25"/><path id="link-10011" d="M378,205L333,250" stroke="#EF1E25"/><path id="link-11012" d="M333,250L263,320" stroke="#EF1E25"/><path id="link-12013" d="M263,320L208,375" stroke="#EF1E25"/><path id="link-13014" d="M208,375L168,415L168,440" stroke="#EF1E25"/><path id="link-14015" d="M168,440L168,460" stroke="#EF1E25"/><path id="link-15016" d="M168,460L168,480" stroke="#EF1E25"/><path id="link-16017" d="M168,480L168,500" stroke="#EF1E25"/><path id="link-17018" d="M168,500L168,520" stroke="#EF1E25"/><path id="link-18019" d="M168,520L168,540" stroke="#EF1E25"/><path id="link-20021" d="M208,15L208,35" stroke="#019EE0"/><path id="link-21022" d="M208,35L208,55" stroke="#019EE0"/><path id="link-22023" d="M208,55L208,75" stroke="#019EE0"/><path id="link-23024" d="M208,75L208,95" stroke="#019EE0"/><path id="link-24025" d="M208,95L208,115" stroke="#019EE0"/><path id="link-25026" d="M208,115L208,135" stroke="#019EE0"/><path id="link-26027" d="M208,135L208,155" stroke="#019EE0"/><path id="link-27028" d="M208,155L208,205" stroke="#019EE0"/><path id="link-28029" d="M208,205L208,250" stroke="#019EE0"/><path id="link-29030" d="M208,250L208,390" stroke="#019EE0"/><path id="link-30031" d="M208,390L208,420" stroke="#019EE0"/><path id="link-31032" d="M208,420L208,440" stroke="#019EE0"/><path id="link-32033" d="M208,440L208,460" stroke="#019EE0"/><path id="link-33034" d="M208,460L208,480" stroke="#019EE0"/><path id="link-34035" d="M208,480L208,500" stroke="#019EE0"/><path id="link-35036" d="M208,500L208,520" stroke="#019EE0"/><path id="link-36037" d="M208,520L208,540" stroke="#019EE0"/><path id="link-71072" d="M126,135L126,155" stroke="#029A55"/><path id="link-72038" d="M126,155L126,175" stroke="#029A55"/><path id="link-38039" d="M126,175L126,195" stroke="#029A55"/><path id="link-39040" d="M126,195L126,200L146,220L208,220" stroke="#029A55"/><path id="link-40041" d="M208,220L378,220" stroke="#029A55"/><path id="link-41042" d="M378,220L543,220L558,235L558,275" stroke="#029A55"/><path id="link-42043" d="M558,275L558,325" stroke="#029A55"/><path id="link-43044" d="M558,325L558,345" stroke="#029A55"/><path id="link-44045" d="M558,345L558,365" stroke="#029A55"/><path id="link-45046" d="M558,365L558,385" stroke="#029A55"/><path id="link-46047" d="M558,385L558,405" stroke="#029A55"/><path id="link-48049" d="M208,265L333,265" stroke="#FBAA33"/><path id="link-49050" d="M333,265L438,265" stroke="#FBAA33"/><path id="link-50051" d="M438,265L533,265L558,290" stroke="#FBAA33"/><path id="link-51052" d="M558,290L598,330L598,345" stroke="#FBAA33"/><path id="link-52053" d="M598,345L598,365" stroke="#FBAA33"/><path id="link-53054" d="M598,365L598,385" stroke="#FBAA33"/><path id="link-54055" d="M598,385L598,405" stroke="#FBAA33"/><path id="link-56057" d="M168,15L168,35" stroke="#B61D8E"/><path id="link-57058" d="M168,35L168,55" stroke="#B61D8E"/><path id="link-58059" d="M168,55L168,75" stroke="#B61D8E"/><path id="link-59060" d="M168,75L168,95" stroke="#B61D8E"/><path id="link-60065" d="M168,95L168,240" stroke="#B61D8E"/><path id="link-65061" d="M168,240L208,280" stroke="#B61D8E"/><path id="link-61062" d="M208,280L263,335" stroke="#B61D8E"/><path id="link-62064" d="M263,335L293,365" stroke="#B61D8E"/><path id="link-64063" d="M293,365L313,385" stroke="#B61D8E"/><path id="link-63066" d="M313,385L333,405" stroke="#B61D8E"/><path id="link-66067" d="M333,405L353,425" stroke="#B61D8E"/></g><g id="scheme-layer-transfers" fill="rgba(255,255,255,0.6)" stroke="#000" stroke-width="2"><path id="transfer-61048029" d="M215,250L215,280A7 7 0 0 1 201 280L201,250A7 7 0 0 1 215 250"/><path id="transfer-62012" d="M270,320L270,335A7 7 0 0 1 256 335L256,320A7 7 0 0 1 270 320"/><path id="transfer-51042" d="M565,275L565,290A7 7 0 0 1 551 290L551,275A7 7 0 0 1 565 275"/><path id="transfer-49011" d="M340,250L340,265A7 7 0 0 1 326 265L326,250A7 7 0 0 1 340 250"/><path id="transfer-40028" d="M215,205L215,220A7 7 0 0 1 201 220L201,205A7 7 0 0 1 215 205"/><path id="transfer-41010" d="M385,205L385,220A7 7 0 0 1 371 220L371,205A7 7 0 0 1 385 205"/><path id="transfer-30013" d="M215,375L215,390A7 7 0 0 1 201 390L201,375A7 7 0 0 1 215 375"/></g><g id="scheme-layer-stations" stroke="#000" stroke-width="1" stroke-opacity="0.5"><circle id="station-314" cx="378" cy="15" r="5" fill="#EF1E25"/><circle id="station-315" cx="378" cy="35" r="5" fill="#EF1E25"/><circle id="station-316" cx="378" cy="55" r="5" fill="#EF1E25"/><circle id="station-317" cx="378" cy="75" r="5" fill="#EF1E25"/><circle id="station-318" cx="378" cy="95" r="5" fill="#EF1E25"/><circle id="station-319" cx="378" cy="115" r="5" fill="#EF1E25"/><circle id="station-320" cx="378" cy="135" r="5" fill="#EF1E25"/><circle id="station-321" cx="378" cy="155" r="5" fill="#EF1E25"/><circle id="station-322" cx="378" cy="175" r="5" fill="#EF1E25"/><circle id="station-323" stroke="#fff" cx="378" cy="205" r="5" fill="#EF1E25"/><circle id="station-324" stroke="#fff" cx="333" cy="250" r="5" fill="#EF1E25"/><circle id="station-325" stroke="#fff" cx="263" cy="320" r="5" fill="#EF1E25"/><circle id="station-326" stroke="#fff" cx="208" cy="375" r="5" fill="#EF1E25"/><circle id="station-327" cx="168" cy="440" r="5" fill="#EF1E25"/><circle id="station-328" cx="168" cy="460" r="5" fill="#EF1E25"/><circle id="station-329" cx="168" cy="480" r="5" fill="#EF1E25"/><circle id="station-330" cx="168" cy="500" r="5" fill="#EF1E25"/><circle id="station-331" cx="168" cy="520" r="5" fill="#EF1E25"/><circle id="station-332" cx="168" cy="540" r="5" fill="#EF1E25"/><circle id="station-333" cx="208" cy="15" r="5" fill="#019EE0"/><circle id="station-334" cx="208" cy="35" r="5" fill="#019EE0"/><circle id="station-335" cx="208" cy="55" r="5" fill="#019EE0"/><circle id="station-336" cx="208" cy="75" r="5" fill="#019EE0"/><circle id="station-337" cx="208" cy="95" r="5" fill="#019EE0"/><circle id="station-338" cx="208" cy="115" r="5" fill="#019EE0"/><circle id="station-339" cx="208" cy="135" r="5" fill="#019EE0"/><circle id="station-340" cx="208" cy="155" r="5" fill="#019EE0"/><circle id="station-341" stroke="#fff" cx="208" cy="205" r="5" fill="#019EE0"/><circle id="station-342" stroke="#fff" cx="208" cy="250" r="5" fill="#019EE0"/><circle id="station-343" stroke="#fff" cx="208" cy="390" r="5" fill="#019EE0"/><circle id="station-344" cx="208" cy="420" r="5" fill="#019EE0"/><circle id="station-345" cx="208" cy="440" r="5" fill="#019EE0"/><circle id="station-346" cx="208" cy="460" r="5" fill="#019EE0"/><circle id="station-347" cx="208" cy="480" r="5" fill="#019EE0"/><circle id="station-348" cx="208" cy="500" r="5" fill="#019EE0"/><circle id="station-349" cx="208" cy="520" r="5" fill="#019EE0"/><circle id="station-350" cx="208" cy="540" r="5" fill="#019EE0"/><circle id="station-449" cx="126" cy="135" r="5" fill="#029A55"/><circle id="station-450" cx="126" cy="155" r="5" fill="#029A55"/><circle id="station-351" cx="126" cy="175" r="5" fill="#029A55"/><circle id="station-352" cx="126" cy="195" r="5" fill="#029A55"/><circle id="station-353" stroke="#fff" cx="208" cy="220" r="5" fill="#029A55"/><circle id="station-354" stroke="#fff" cx="378" cy="220" r="5" fill="#029A55"/><circle id="station-355" stroke="#fff" cx="558" cy="275" r="5" fill="#029A55"/><circle id="station-356" cx="558" cy="325" r="5" fill="#029A55"/><circle id="station-357" cx="558" cy="345" r="5" fill="#029A55"/><circle id="station-358" cx="558" cy="365" r="5" fill="#029A55"/><circle id="station-359" cx="558" cy="385" r="5" fill="#029A55"/><circle id="station-360" cx="558" cy="405" r="5" fill="#029A55"/><circle id="station-361" stroke="#fff" cx="208" cy="265" r="5" fill="#FBAA33"/><circle id="station-362" stroke="#fff" cx="333" cy="265" r="5" fill="#FBAA33"/><circle id="station-363" cx="438" cy="265" r="5" fill="#FBAA33"/><circle id="station-364" stroke="#fff" cx="558" cy="290" r="5" fill="#FBAA33"/><circle id="station-365" cx="598" cy="345" r="5" fill="#FBAA33"/><circle id="station-366" cx="598" cy="365" r="5" fill="#FBAA33"/><circle id="station-367" cx="598" cy="385" r="5" fill="#FBAA33"/><circle id="station-368" cx="598" cy="405" r="5" fill="#FBAA33"/><circle id="station-369" cx="168" cy="15" r="5" fill="#B61D8E"/><circle id="station-370" cx="168" cy="35" r="5" fill="#B61D8E"/><circle id="station-371" cx="168" cy="55" r="5" fill="#B61D8E"/><circle id="station-372" cx="168" cy="75" r="5" fill="#B61D8E"/><circle id="station-373" cx="168" cy="95" r="5" fill="#B61D8E"/><circle id="station-374" cx="168" cy="240" r="5" fill="#B61D8E"/><circle id="station-375" stroke="#fff" cx="208" cy="280" r="5" fill="#B61D8E"/><circle id="station-376" stroke="#fff" cx="263" cy="335" r="5" fill="#B61D8E"/><circle id="station-377" cx="293" cy="365" r="5" fill="#B61D8E"/><circle id="station-378" cx="313" cy="385" r="5" fill="#B61D8E"/><circle id="station-379" cx="333" cy="405" r="5" fill="#B61D8E"/><circle id="station-380" cx="353" cy="425" r="5" fill="#B61D8E"/></g><g id="scheme-layer-labels" fill="#000" font-size="13" font-family="arial,sans-serif"><g id="label-1"><text x="387" y="19" text-anchor="start">Девяткино</text></g><g id="label-2"><text x="387" y="39" text-anchor="start">Гражданский проспект</text></g><g id="label-3"><text x="387" y="59" text-anchor="start" fill="#999">Академическая</text></g><g id="label-4"><text x="387" y="79" text-anchor="start">Политехническая</text></g><g id="label-5"><text x="387" y="99" text-anchor="start">Площадь Мужества</text></g><g id="label-6"><text x="387" y="119" text-anchor="start">Лесная</text></g><g id="label-7"><text x="387" y="139" text-anchor="start">Выборгская</text></g><g id="label-8"><text x="387" y="159" text-anchor="start">Площадь Ленина</text></g><g id="label-9"><text x="387" y="179" text-anchor="start">Чернышевская</text></g><g id="label-10"><text x="387" y="209" text-anchor="start">Площадь Восстания</text></g><g id="label-11"><text x="342" y="254" text-anchor="start">Владимирская</text></g><g id="label-12"><text x="272" y="324" text-anchor="start">Пушкинская</text></g><g id="label-13"><text x="199" y="379" text-anchor="end">Технологический институт - 1</text></g><g id="label-14"><text x="159" y="444" text-anchor="end">Балтийская</text></g><g id="label-15"><text x="159" y="464" text-anchor="end">Нарвская</text></g><g id="label-16"><text x="159" y="484" text-anchor="end">Кировский завод</text></g><g id="label-17"><text x="159" y="504" text-anchor="end">Автово</text></g><g id="label-18"><text x="159" y="524" text-anchor="end">Ленинский проспект</text></g><g id="label-19"><text x="159" y="544" text-anchor="end">Проспект Ветеранов</text></g><g id="label-20"><text x="217" y="19" text-anchor="start">Парнас</text></g><g id="label-21"><text x="217" y="39" text-anchor="start">Проспект Просвещения</text></g><g id="label-22"><text x="217" y="59" text-anchor="start">Озерки</text></g><g id="label-23"><text x="217" y="79" text-anchor="start">Удельная</text></g><g id="label-24"><text x="217" y="99" text-anchor="start">Пионерская</text></g><g id="label-25"><text x="217" y="119" text-anchor="start">Чёрная речка</text></g><g id="label-26"><text x="217" y="139" text-anchor="start">Петроградская</text></g><g id="label-27"><text x="217" y="159" text-anchor="start">Горьковская</text></g><g id="label-28"><text x="217" y="209" text-anchor="start">Невский проспект</text></g><g id="label-29"><text x="218" y="241" text-anchor="start"><tspan x="218" dy="0">Сенная</tspan><tspan x="218" dy="13">площадь</tspan></text></g><g id="label-30"><text x="199" y="394" text-anchor="end">Технологический институт - 2</text></g><g id="label-31"><text x="217" y="424" text-anchor="start">Фрунзенская</text></g><g id="label-32"><text x="217" y="444" text-anchor="start">Московские ворота</text></g><g id="label-33"><text x="217" y="464" text-anchor="start">Электросила</text></g><g id="label-34"><text x="217" y="484" text-anchor="start">Парк Победы</text></g><g id="label-35"><text x="217" y="504" text-anchor="start">Московская</text></g><g id="label-36"><text x="217" y="524" text-anchor="start">Звёздная</text></g><g id="label-37"><text x="217" y="544" text-anchor="start">Купчино</text></g><g id="label-71"><text x="117" y="139" text-anchor="end">Беговая</text></g><g id="label-72"><text x="117" y="159" text-anchor="end">Новокрестовская</text></g><g id="label-38"><text x="117" y="179" text-anchor="end">Приморская</text></g><g id="label-39"><text x="117" y="199" text-anchor="end">Василеостровская</text></g><g id="label-40"><text x="217" y="224" text-anchor="start">Гостиный двор</text></g><g id="label-41"><text x="387" y="224" text-anchor="start">Маяковская</text></g><g id="label-42"><text x="567" y="279" text-anchor="start">Площадь Александра Невского - 1</text></g><g id="label-43"><text x="549" y="329" text-anchor="end">Елизаровская</text></g><g id="label-44"><text x="549" y="349" text-anchor="end">Ломоносовская</text></g><g id="label-45"><text x="549" y="369" text-anchor="end">Пролетарская</text></g><g id="label-46"><text x="549" y="389" text-anchor="end">Обухово</text></g><g id="label-47"><text x="549" y="409" text-anchor="end">Рыбацкое</text></g><g id="label-48"><text x="217" y="269" text-anchor="start">Спасская</text></g><g id="label-49"><text x="342" y="269" text-anchor="start">Достоевская</text></g><g id="label-50"><text x="447" y="269" text-anchor="start"><tspan x="447" dy="0">Лиговский</tspan><tspan x="447" dy="13">проспект</tspan></text></g><g id="label-51"><text x="567" y="294" text-anchor="start">Площадь Александра Невского - 2</text></g><g id="label-52"><text x="607" y="349" text-anchor="start">Новочеркасская</text></g><g id="label-53"><text x="607" y="369" text-anchor="start">Ладожская</text></g><g id="label-54"><text x="607" y="389" text-anchor="start">Проспект Большевиков</text></g><g id="label-55"><text x="607" y="409" text-anchor="start">Улица Дыбенко</text></g><g id="label-56"><text x="159" y="19" text-anchor="end">Комендантский проспект</text></g><g id="label-57"><text x="159" y="39" text-anchor="end">Старая Деревня</text></g><g id="label-58"><text x="159" y="59" text-anchor="end">Крестовский остров</text></g><g id="label-59"><text x="159" y="79" text-anchor="end">Чкаловская</text></g><g id="label-60"><text x="159" y="99" text-anchor="end">Спортивная</text></g><g id="label-65"><text x="159" y="244" text-anchor="end">Адмиралтейская</text></g><g id="label-61"><text x="199" y="284" text-anchor="end">Садовая</text></g><g id="label-62"><text x="272" y="339" text-anchor="start">Звенигородская</text></g><g id="label-64"><text x="302" y="369" text-anchor="start">Обводный канал</text></g><g id="label-63"><text x="322" y="389" text-anchor="start">Волковская</text></g><g id="label-66"><text x="342" y="409" text-anchor="start">Бухарестская</text></g><g id="label-67"><text x="362" y="429" text-anchor="start">Международная</text></g></g></g><g id="highlight-layer"><g id="highlight-layer-links" fill="none" stroke-width="8"/><g id="highlight-layer-transfers" fill="rgba(255,255,255,0.6)" stroke="#000" stroke-width="2"/><g id="highlight-layer-stations" stroke="#000" stroke-width="1" stroke-opacity="0.5"/><g id="highlight-layer-labels" fill="#000" font-size="13" font-family="arial,sans-serif"/></g></g></svg>';
	$('.js-map-wr').append(svgEl);

	




	class svgMap {
		constructor(options) {
			this.$el = document.querySelector(options.selector);
			this.stations = options.stations;
			this.selectStations = [];
			this.selectLinks = [];
		}

		findStation(id) {
			console.log(id, '#scheme-layer-stations');
			console.log(this.stations[id]['labelId'], '#scheme-layer-labels');
		}

		findLabel(id){
			let keyStations = Object.keys(this.stations);
			let indexStation = Object.values(this.stations).findIndex(item => item.labelId == id);

			return keyStations[indexStation];
		}

		findlink(id){
			let keyStations = Object.keys(this.stations);
			let indexLink = Object.values(this.stations).findIndex(
								item => item.linkIds.find(i => i === +id)
							);
			let selectLine = Object.values(this.stations).filter(item => item.lineId == this.stations[keyStations[indexLink]].lineId);
			

			// список названий станций (текст) #scheme-layer-labels
			let selectLineIdStations = selectLine.map(item => item.labelId);

			// список станций #scheme-layer-stations
			let keysSations = [];
			for (var prop in this.stations) {
				if (this.stations[prop]['lineId'] == this.stations[keyStations[indexLink]].lineId) {
					keysSations.push(prop)
				}
			}

			// список линий #scheme-layer-links
			let linksSelect = selectLine.map(item => item.linkIds);
			let linksSelectAll = [].concat(...linksSelect).filter((elem, index, self) => {
								    return index === self.indexOf(elem);
								});

			//console.log(selectLineIdStations, '#scheme-layer-labels');
			//console.log(keysSations, '#scheme-layer-stations');
			//console.log(linksSelectAll, '#scheme-layer-links');

			return {
				links: linksSelectAll,
				stantions: keysSations
			};


		}

		opacitySvg() {
			if (this.selectStations.length) {
				this.$el.querySelector('svg #scheme-layer').style.opacity = '0.2';
			} else {
				this.$el.querySelector('svg #scheme-layer').style.opacity = '1';
			}
		}


		addSelectStations(id) {
			let isId = this.selectStations.findIndex(item => item === id);
			if (isId === -1) {
				this.selectStations.push(id);
			} else {
				this.selectStations.splice(isId, 1);
			}

			this.opacitySvg()
			this.cloneStation();

		}

		cloneStation() {
			if (this.selectStations.length) {
				for (let item of this.selectStations) {
					let station = this.$el.querySelector(`#scheme-layer-stations #station-${item}`).cloneNode(true);
					let label = this.$el.querySelector(`#scheme-layer-labels #label-${this.stations[item]['labelId']}`).cloneNode(true);
					if (!this.$el.querySelector(`#highlight-layer-stations #station-${item}`)) {
						this.$el.querySelector('#highlight-layer-stations').appendChild(station);
					}

					if (!this.$el.querySelector(`#highlight-layer-labels #label-${this.stations[item]['labelId']}`)) {
						this.$el.querySelector('#highlight-layer-labels').appendChild(label);
					}
				}
			}
		}
		removeStation(id) {
			let isId = this.selectStations.findIndex(item => item === id);
			this.selectStations.splice(isId, 1);
			this.$el.querySelector(`#highlight-layer-stations #station-${id}`).remove();
			this.$el.querySelector(`#highlight-layer-labels #label-${this.stations[id]['labelId']}`).remove();

			this.opacitySvg();
		}

		cloneLink(data) {
			if (data.links.length) {

				let links = [];

				for (let item of data.links) {
					let link = (this.$el.querySelector(`#scheme-layer-links #link-${item}`)) ? this.$el.querySelector(`#scheme-layer-links #link-${item}`).cloneNode(true) : '';
					if (link != '') {
						this.$el.querySelector('#highlight-layer-links').appendChild(link);
						links.push(item);
					}
				}

				// временной решение
				let a = this.selectStations;
				let b = data.stantions;
				let c = a.concat(b);

				this.selectStations = c;
				this.selectLinks.push({
					links: links, 
					stantions: data.stantions
				});
				this.cloneStation();
				this.opacitySvg();
			}
		}

		removeLink(id) {
			let indexLink = -1;

			for (let i = 0; i < this.selectLinks.length; i++) {
				if (this.selectLinks[i].links.findIndex(item => item === +id) !== -1) {
					indexLink = i;
					break;
				}
			}

			for (let item of this.selectLinks[indexLink].links) {
				if (this.$el.querySelector(`#highlight-layer-links #link-${item}`)) {
					this.$el.querySelector(`#highlight-layer-links #link-${item}`).remove();
				}				
			}
			for (let item of this.selectLinks[indexLink].stantions) {
				this.removeStation(item);
			}

			//this.selectLinks.splice(indexLink, 1);
		}

	}

	const metroMap = new svgMap({
		selector: '.js-map-wr',
		stations: {
        '314': {
          'name': '\u0414\u0435\u0432\u044f\u0442\u043a\u0438\u043d\u043e',
          'lineId': '23',
          'labelId': 1,
          'boardInfo': {
            'exit': [{
              'pos': [1, 3, 5]
            }]
          },
          'linkIds': [1002],
          'lng': 0,
          'lat': 0
        },
        '315': {
          'name': '\u0413\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u043a\u0438\u0439 \u043f\u0440\u043e\u0441\u043f\u0435\u043a\u0442',
          'lineId': '23',
          'labelId': 2,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [1002, 2003],
          'lng': 0,
          'lat': 0
        },
        '316': {
          'name': '\u0410\u043a\u0430\u0434\u0435\u043c\u0438\u0447\u0435\u0441\u043a\u0430\u044f',
          'lineId': '23',
          'labelId': 3,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }]
          },
          'changes': {
            'closed': {
              'type': 'no-boarding',
              'visible': true
            },
            'hint': '\u0421\u0442\u0430\u043d\u0446\u0438\u044f \u0437\u0430\u043a\u0440\u044b\u0442\u0430 \u043d\u0430 \u043a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442'
          },
          'linkIds': [2003, 3004],
          'lng': 0,
          'lat': 0
        },
        '317': {
          'name': '\u041f\u043e\u043b\u0438\u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0430\u044f',
          'lineId': '23',
          'labelId': 4,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [3004, 4005],
          'lng': 0,
          'lat': 0
        },
        '318': {
          'name': '\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u041c\u0443\u0436\u0435\u0441\u0442\u0432\u0430',
          'lineId': '23',
          'labelId': 5,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [4005, 5006],
          'lng': 0,
          'lat': 0
        },
        '319': {
          'name': '\u041b\u0435\u0441\u043d\u0430\u044f',
          'lineId': '23',
          'labelId': 6,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [5006, 6007],
          'lng': 0,
          'lat': 0
        },
        '320': {
          'name': '\u0412\u044b\u0431\u043e\u0440\u0433\u0441\u043a\u0430\u044f',
          'lineId': '23',
          'labelId': 7,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [6007, 7008],
          'lng': 0,
          'lat': 0
        },
        '321': {
          'name': '\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u041b\u0435\u043d\u0438\u043d\u0430',
          'lineId': '23',
          'labelId': 8,
          'boardInfo': {
            'exit': [{
              'pos': [2, 4]
            }]
          },
          'linkIds': [7008, 8009],
          'lng': 0,
          'lat': 0
        },
        '322': {
          'name': '\u0427\u0435\u0440\u043d\u044b\u0448\u0435\u0432\u0441\u043a\u0430\u044f',
          'lineId': '23',
          'labelId': 9,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }]
          },
          'linkIds': [8009, 9010],
          'lng': 0,
          'lat': 0
        },
        '323': {
          'name': '\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0412\u043e\u0441\u0441\u0442\u0430\u043d\u0438\u044f',
          'lineId': '23',
          'labelId': 10,
          'boardInfo': {
            'exit': [{
              'pos': [2, 4]
            }],
            'transfer': [{
              'toSt': 41,
              'pos': [3]
            }]
          },
          'linkIds': [9010, 10011, 10041],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '324': {
          'name': '\u0412\u043b\u0430\u0434\u0438\u043c\u0438\u0440\u0441\u043a\u0430\u044f',
          'lineId': '23',
          'labelId': 11,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }],
            'transfer': [{
              'toSt': 49,
              'pos': [4]
            }]
          },
          'linkIds': [10011, 11012, 11049],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '325': {
          'name': '\u041f\u0443\u0448\u043a\u0438\u043d\u0441\u043a\u0430\u044f',
          'lineId': '23',
          'labelId': 12,
          'boardInfo': {
            'exit': [{
              'pos': [2]
            }],
            'transfer': [{
              'toSt': 62,
              'pos': [3]
            }]
          },
          'linkIds': [11012, 12013, 12062],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '326': {
          'name': '\u0422\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0438\u043d\u0441\u0442\u0438\u0442\u0443\u0442-1',
          'lineId': '23',
          'labelId': 13,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }],
            'transfer': [{
              'prevSt': 12,
              'toSt': 30,
              'nextSt': 31,
              'pos': [1, 2, 3, 4, 5]
            }, {
              'prevSt': 12,
              'toSt': 30,
              'nextSt': 29,
              'pos': [3]
            }, {
              'prevSt': 14,
              'toSt': 30,
              'nextSt': 31,
              'pos': [3]
            }, {
              'prevSt': 14,
              'toSt': 30,
              'nextSt': 29,
              'pos': [2, 3]
            }]
          },
          'linkIds': [12013, 13014, 13030],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '327': {
          'name': '\u0411\u0430\u043b\u0442\u0438\u0439\u0441\u043a\u0430\u044f',
          'lineId': '23',
          'labelId': 14,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [13014, 14015],
          'lng': 0,
          'lat': 0
        },
        '328': {
          'name': '\u041d\u0430\u0440\u0432\u0441\u043a\u0430\u044f',
          'lineId': '23',
          'labelId': 15,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }]
          },
          'linkIds': [14015, 15016],
          'lng': 0,
          'lat': 0
        },
        '329': {
          'name': '\u041a\u0438\u0440\u043e\u0432\u0441\u043a\u0438\u0439 \u0437\u0430\u0432\u043e\u0434',
          'lineId': '23',
          'labelId': 16,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [15016, 16017],
          'lng': 0,
          'lat': 0
        },
        '330': {
          'name': '\u0410\u0432\u0442\u043e\u0432\u043e',
          'lineId': '23',
          'labelId': 17,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [16017, 17018],
          'lng': 0,
          'lat': 0
        },
        '331': {
          'name': '\u041b\u0435\u043d\u0438\u043d\u0441\u043a\u0438\u0439 \u043f\u0440\u043e\u0441\u043f\u0435\u043a\u0442',
          'lineId': '23',
          'labelId': 18,
          'boardInfo': {
            'exit': [{
              'pos': [1, 5]
            }]
          },
          'linkIds': [17018, 18019],
          'lng': 0,
          'lat': 0
        },
        '332': {
          'name': '\u041f\u0440\u043e\u0441\u043f\u0435\u043a\u0442 \u0412\u0435\u0442\u0435\u0440\u0430\u043d\u043e\u0432',
          'lineId': '23',
          'labelId': 19,
          'boardInfo': {
            'exit': [{
              'pos': [1, 5]
            }]
          },
          'linkIds': [18019],
          'lng': 0,
          'lat': 0
        },
        '333': {
          'name': '\u041f\u0430\u0440\u043d\u0430\u0441',
          'lineId': '24',
          'labelId': 20,
          'boardInfo': {
            'exit': [{
              'pos': [3]
            }]
          },
          'linkIds': [20021],
          'lng': 0,
          'lat': 0
        },
        '334': {
          'name': '\u041f\u0440\u043e\u0441\u043f\u0435\u043a\u0442 \u041f\u0440\u043e\u0441\u0432\u0435\u0449\u0435\u043d\u0438\u044f',
          'lineId': '24',
          'labelId': 21,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [20021, 21022],
          'lng': 0,
          'lat': 0
        },
        '335': {
          'name': '\u041e\u0437\u0435\u0440\u043a\u0438',
          'lineId': '24',
          'labelId': 22,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [21022, 22023],
          'lng': 0,
          'lat': 0
        },
        '336': {
          'name': '\u0423\u0434\u0435\u043b\u044c\u043d\u0430\u044f',
          'lineId': '24',
          'labelId': 23,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [22023, 23024],
          'lng': 0,
          'lat': 0
        },
        '337': {
          'name': '\u041f\u0438\u043e\u043d\u0435\u0440\u0441\u043a\u0430\u044f',
          'lineId': '24',
          'labelId': 24,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [23024, 24025],
          'lng': 0,
          'lat': 0
        },
        '338': {
          'name': '\u0427\u0451\u0440\u043d\u0430\u044f \u0440\u0435\u0447\u043a\u0430',
          'lineId': '24',
          'labelId': 25,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [24025, 25026],
          'lng': 0,
          'lat': 0
        },
        '339': {
          'name': '\u041f\u0435\u0442\u0440\u043e\u0433\u0440\u0430\u0434\u0441\u043a\u0430\u044f',
          'lineId': '24',
          'labelId': 26,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [25026, 26027],
          'lng': 0,
          'lat': 0
        },
        '340': {
          'name': '\u0413\u043e\u0440\u044c\u043a\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '24',
          'labelId': 27,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }]
          },
          'linkIds': [26027, 27028],
          'lng': 0,
          'lat': 0
        },
        '341': {
          'name': '\u041d\u0435\u0432\u0441\u043a\u0438\u0439 \u043f\u0440\u043e\u0441\u043f\u0435\u043a\u0442',
          'lineId': '24',
          'labelId': 28,
          'boardInfo': {
            'exit': [{
              'pos': [2, 4]
            }],
            'transfer': [{
              'toSt': 40,
              'pos': [4, 5]
            }]
          },
          'linkIds': [27028, 28029, 28040],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '342': {
          'name': '\u0421\u0435\u043d\u043d\u0430\u044f \u043f\u043b\u043e\u0449\u0430\u0434\u044c',
          'lineId': '24',
          'labelId': 29,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }],
            'transfer': [{
              'toSt': 48,
              'pos': [1]
            }, {
              'toSt': 61,
              'pos': [3]
            }]
          },
          'linkIds': [28029, 29030, 29048, 29061],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '343': {
          'name': '\u0422\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0438\u043d\u0441\u0442\u0438\u0442\u0443\u0442-2',
          'lineId': '24',
          'labelId': 30,
          'boardInfo': {
            'exit': [{
              'prevSt': 29,
              'pos': [5]
            }, {
              'prevSt': 31,
              'pos': [2]
            }],
            'transfer': [{
              'prevSt': 29,
              'toSt': 13,
              'nextSt': 14,
              'pos': [1, 2, 3, 4, 5]
            }, {
              'prevSt': 29,
              'toSt': 13,
              'nextSt': 12,
              'pos': [2, 4]
            }, {
              'prevSt': 31,
              'toSt': 13,
              'nextSt': 14,
              'pos': [3]
            }, {
              'prevSt': 31,
              'toSt': 13,
              'nextSt': 12,
              'pos': [2, 3, 5]
            }]
          },
          'linkIds': [13030, 29030, 30031],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '344': {
          'name': '\u0424\u0440\u0443\u043d\u0437\u0435\u043d\u0441\u043a\u0430\u044f',
          'lineId': '24',
          'labelId': 31,
          'boardInfo': {
            'exit': [{
              'pos': [3]
            }]
          },
          'linkIds': [30031, 31032],
          'lng': 0,
          'lat': 0
        },
        '345': {
          'name': '\u041c\u043e\u0441\u043a\u043e\u0432\u0441\u043a\u0438\u0435 \u0432\u043e\u0440\u043e\u0442\u0430',
          'lineId': '24',
          'labelId': 32,
          'boardInfo': {
            'exit': [{
              'pos': [2]
            }]
          },
          'linkIds': [31032, 32033],
          'lng': 0,
          'lat': 0
        },
        '346': {
          'name': '\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u0441\u0438\u043b\u0430',
          'lineId': '24',
          'labelId': 33,
          'boardInfo': {
            'exit': [{
              'pos': [2]
            }]
          },
          'linkIds': [32033, 33034],
          'lng': 0,
          'lat': 0
        },
        '347': {
          'name': '\u041f\u0430\u0440\u043a \u041f\u043e\u0431\u0435\u0434\u044b',
          'lineId': '24',
          'labelId': 34,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [33034, 34035],
          'lng': 0,
          'lat': 0
        },
        '348': {
          'name': '\u041c\u043e\u0441\u043a\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '24',
          'labelId': 35,
          'boardInfo': {
            'exit': [{
              'pos': [1, 5]
            }]
          },
          'linkIds': [34035, 35036],
          'lng': 0,
          'lat': 0
        },
        '349': {
          'name': '\u0417\u0432\u0451\u0437\u0434\u043d\u0430\u044f',
          'lineId': '24',
          'labelId': 36,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [35036, 36037],
          'lng': 0,
          'lat': 0
        },
        '350': {
          'name': '\u041a\u0443\u043f\u0447\u0438\u043d\u043e',
          'lineId': '24',
          'labelId': 37,
          'boardInfo': {
            'exit': [{
              'pos': [1, 2, 4, 5]
            }]
          },
          'linkIds': [36037],
          'lng': 0,
          'lat': 0
        },
        '351': {
          'name': '\u041f\u0440\u0438\u043c\u043e\u0440\u0441\u043a\u0430\u044f',
          'lineId': '25',
          'labelId': 38,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [38039, 72038],
          'lng': 0,
          'lat': 0
        },
        '352': {
          'name': '\u0412\u0430\u0441\u0438\u043b\u0435\u043e\u0441\u0442\u0440\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '25',
          'labelId': 39,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [38039, 39040],
          'lng': 0,
          'lat': 0
        },
        '353': {
          'name': '\u0413\u043e\u0441\u0442\u0438\u043d\u044b\u0439 \u0434\u0432\u043e\u0440',
          'lineId': '25',
          'labelId': 40,
          'boardInfo': {
            'exit': [{
              'pos': [1, 5]
            }],
            'transfer': [{
              'toSt': 28,
              'pos': [2, 4]
            }]
          },
          'linkIds': [28040, 39040, 40041],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '354': {
          'name': '\u041c\u0430\u044f\u043a\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '25',
          'labelId': 41,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }],
            'transfer': [{
              'toSt': 10,
              'pos': [1, 2, 4]
            }]
          },
          'linkIds': [10041, 40041, 41042],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '355': {
          'name': '\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0410\u043b\u0435\u043a\u0441\u0430\u043d\u0434\u0440\u0430 \u041d\u0435\u0432\u0441\u043a\u043e\u0433\u043e - 1',
          'lineId': '25',
          'labelId': 42,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }],
            'transfer': [{
              'toSt': 51,
              'pos': [1]
            }]
          },
          'linkIds': [41042, 42043, 42051],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '356': {
          'name': '\u0415\u043b\u0438\u0437\u0430\u0440\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '25',
          'labelId': 43,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [42043, 43044],
          'lng': 0,
          'lat': 0
        },
        '357': {
          'name': '\u041b\u043e\u043c\u043e\u043d\u043e\u0441\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '25',
          'labelId': 44,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [43044, 44045],
          'lng': 0,
          'lat': 0
        },
        '358': {
          'name': '\u041f\u0440\u043e\u043b\u0435\u0442\u0430\u0440\u0441\u043a\u0430\u044f',
          'lineId': '25',
          'labelId': 45,
          'boardInfo': {
            'exit': [{
              'pos': [2]
            }]
          },
          'linkIds': [44045, 45046],
          'lng': 0,
          'lat': 0
        },
        '359': {
          'name': '\u041e\u0431\u0443\u0445\u043e\u0432\u043e',
          'lineId': '25',
          'labelId': 46,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [45046, 46047],
          'lng': 0,
          'lat': 0
        },
        '360': {
          'name': '\u0420\u044b\u0431\u0430\u0446\u043a\u043e\u0435',
          'lineId': '25',
          'labelId': 47,
          'boardInfo': {
            'exit': [{
              'pos': [1, 3, 4]
            }]
          },
          'linkIds': [46047],
          'lng': 0,
          'lat': 0
        },
        '361': {
          'name': '\u0421\u043f\u0430\u0441\u0441\u043a\u0430\u044f',
          'lineId': '26',
          'labelId': 48,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }],
            'transfer': [{
              'toSt': 29,
              'pos': [1]
            }, {
              'toSt': 61,
              'pos': [4]
            }]
          },
          'linkIds': [29048, 48049, 48061],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '362': {
          'name': '\u0414\u043e\u0441\u0442\u043e\u0435\u0432\u0441\u043a\u0430\u044f',
          'lineId': '26',
          'labelId': 49,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }],
            'transfer': [{
              'toSt': 11,
              'pos': [1]
            }]
          },
          'linkIds': [11049, 48049, 49050],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '363': {
          'name': '\u041b\u0438\u0433\u043e\u0432\u0441\u043a\u0438\u0439 \u043f\u0440\u043e\u0441\u043f\u0435\u043a\u0442',
          'lineId': '26',
          'labelId': 50,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [49050, 50051],
          'lng': 0,
          'lat': 0
        },
        '364': {
          'name': '\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0410\u043b\u0435\u043a\u0441\u0430\u043d\u0434\u0440\u0430 \u041d\u0435\u0432\u0441\u043a\u043e\u0433\u043e - 2',
          'lineId': '26',
          'labelId': 51,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }],
            'transfer': [{
              'toSt': 42,
              'pos': [1]
            }]
          },
          'linkIds': [42051, 50051, 51052],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '365': {
          'name': '\u041d\u043e\u0432\u043e\u0447\u0435\u0440\u043a\u0430\u0441\u0441\u043a\u0430\u044f',
          'lineId': '26',
          'labelId': 52,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [51052, 52053],
          'lng': 0,
          'lat': 0
        },
        '366': {
          'name': '\u041b\u0430\u0434\u043e\u0436\u0441\u043a\u0430\u044f',
          'lineId': '26',
          'labelId': 53,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [52053, 53054],
          'lng': 0,
          'lat': 0
        },
        '367': {
          'name': '\u041f\u0440\u043e\u0441\u043f\u0435\u043a\u0442 \u0411\u043e\u043b\u044c\u0448\u0435\u0432\u0438\u043a\u043e\u0432',
          'lineId': '26',
          'labelId': 54,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [53054, 54055],
          'lng': 0,
          'lat': 0
        },
        '368': {
          'name': '\u0423\u043b\u0438\u0446\u0430 \u0414\u044b\u0431\u0435\u043d\u043a\u043e',
          'lineId': '26',
          'labelId': 55,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [54055],
          'lng': 0,
          'lat': 0
        },
        '369': {
          'name': '\u041a\u043e\u043c\u0435\u043d\u0434\u0430\u043d\u0442\u0441\u043a\u0438\u0439 \u043f\u0440\u043e\u0441\u043f\u0435\u043a\u0442',
          'lineId': '27',
          'labelId': 56,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [56057],
          'lng': 0,
          'lat': 0
        },
        '370': {
          'name': '\u0421\u0442\u0430\u0440\u0430\u044f \u0414\u0435\u0440\u0435\u0432\u043d\u044f',
          'lineId': '27',
          'labelId': 57,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [56057, 57058],
          'lng': 0,
          'lat': 0
        },
        '371': {
          'name': '\u041a\u0440\u0435\u0441\u0442\u043e\u0432\u0441\u043a\u0438\u0439 \u043e\u0441\u0442\u0440\u043e\u0432',
          'lineId': '27',
          'labelId': 58,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [57058, 58059],
          'lng': 0,
          'lat': 0
        },
        '372': {
          'name': '\u0427\u043a\u0430\u043b\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '27',
          'labelId': 59,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }]
          },
          'linkIds': [58059, 59060],
          'lng': 0,
          'lat': 0
        },
        '373': {
          'name': '\u0421\u043f\u043e\u0440\u0442\u0438\u0432\u043d\u0430\u044f',
          'lineId': '27',
          'labelId': 60,
          'boardInfo': {
            'exit': [{
              'prevSt': 59,
              'pos': [1, 4]
            }, {
              'prevSt': 65,
              'pos': [1]
            }]
          },
          'linkIds': [59060, 60065],
          'lng': 0,
          'lat': 0
        },
        '375': {
          'name': '\u0421\u0430\u0434\u043e\u0432\u0430\u044f',
          'lineId': '27',
          'labelId': 61,
          'boardInfo': {
            'exit': [{
              'pos': [5]
            }],
            'transfer': [{
              'toSt': 29,
              'pos': [1]
            }, {
              'toSt': 48,
              'pos': [2, 4]
            }]
          },
          'linkIds': [29061, 48061, 61062, 65061],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '376': {
          'name': '\u0417\u0432\u0435\u043d\u0438\u0433\u043e\u0440\u043e\u0434\u0441\u043a\u0430\u044f',
          'lineId': '27',
          'labelId': 62,
          'boardInfo': {
            'exit': [{
              'pos': [2]
            }],
            'transfer': [{
              'toSt': 12,
              'pos': [3, 4]
            }]
          },
          'linkIds': [12062, 61062, 62064],
          'isTransferStation': true,
          'lng': 0,
          'lat': 0
        },
        '378': {
          'name': '\u0412\u043e\u043b\u043a\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '27',
          'labelId': 63,
          'boardInfo': {
            'exit': [{
              'pos': [2]
            }]
          },
          'linkIds': [63066, 64063],
          'lng': 0,
          'lat': 0
        },
        '377': {
          'name': '\u041e\u0431\u0432\u043e\u0434\u043d\u044b\u0439 \u043a\u0430\u043d\u0430\u043b',
          'lineId': '27',
          'labelId': 64,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }]
          },
          'linkIds': [62064, 64063],
          'lng': 0,
          'lat': 0
        },
        '374': {
          'name': '\u0410\u0434\u043c\u0438\u0440\u0430\u043b\u0442\u0435\u0439\u0441\u043a\u0430\u044f',
          'lineId': '27',
          'labelId': 65,
          'boardInfo': {
            'exit': [{
              'pos': [1]
            }]
          },
          'linkIds': [60065, 65061],
          'lng': 0,
          'lat': 0
        },
        '379': {
          'name': '\u0411\u0443\u0445\u0430\u0440\u0435\u0441\u0442\u0441\u043a\u0430\u044f',
          'lineId': '27',
          'labelId': 66,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }]
          },
          'linkIds': [63066, 66067],
          'lng': 0,
          'lat': 0
        },
        '380': {
          'name': '\u041c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434\u043d\u0430\u044f',
          'lineId': '27',
          'labelId': 67,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }]
          },
          'linkIds': [66067],
          'lng': 0,
          'lat': 0
        },
        '449': {
          'name': '\u0411\u0435\u0433\u043e\u0432\u0430\u044f',
          'lineId': '25',
          'labelId': 71,
          'boardInfo': {
            'exit': [{
              'pos': [4]
            }]
          },
          'linkIds': [71072],
          'lng': 0,
          'lat': 0
        },
        '450': {
          'name': '\u041d\u043e\u0432\u043e\u043a\u0440\u0435\u0441\u0442\u043e\u0432\u0441\u043a\u0430\u044f',
          'lineId': '25',
          'labelId': 72,
          'boardInfo': {
            'exit': [{
              'pos': [2]
            }]
          },
          'linkIds': [71072, 72038],
          'lng': 0,
          'lat': 0
        }
      }
	});

	*/
	/*

	document.querySelector('.js-map-wr svg #scheme-layer-labels').addEventListener('click',function(ev){
		let idLabel =  ev.target.parentElement.getAttribute('id').split('-')[1];
		let idStation = metroMap.findLabel(idLabel);
		metroMap.addSelectStations(idStation);
	});

	document.querySelector('.js-map-wr svg #scheme-layer-stations').addEventListener('click',function(ev){
		let idStation = ev.target.getAttribute('id').split('-')[1];
		metroMap.findStation(idStation);
		metroMap.addSelectStations(idStation);
	});

	document.querySelector('.js-map-wr svg #scheme-layer-links').addEventListener('click',function(ev){
		let idLink = ev.target.getAttribute('id').split('-')[1];
		let selectLink = metroMap.findlink(idLink);
		
		metroMap.cloneLink(selectLink);


	});

	// delete
	document.querySelector('.js-map-wr svg #highlight-layer-stations').addEventListener('click',function(ev){
		let idStation = ev.target.getAttribute('id').split('-')[1];
		metroMap.removeStation(idStation);
	});

	document.querySelector('.js-map-wr svg #highlight-layer-labels').addEventListener('click',function(ev){
		let idLabel = ev.target.parentElement.getAttribute('id').split('-')[1];
		let idStation = metroMap.findLabel(idLabel);
		metroMap.removeStation(idStation);	
	});

	document.querySelector('.js-map-wr svg #highlight-layer-links').addEventListener('click',function(ev){
		let idLink = ev.target.getAttribute('id').split('-')[1];
		metroMap.removeLink(idLink);
	});


	*/



});
