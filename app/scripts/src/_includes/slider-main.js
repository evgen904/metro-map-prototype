document.addEventListener("DOMContentLoaded", function(event) {
	var x=10;
	var y=10;
	var t=1;
	var x1,y1,l,r;

	document.getElementById("div2").addEventListener("mousedown", down);
	function down(){
	    t=1;
	    document.addEventListener("mouseup", place);
	    
	    document.addEventListener("mousemove",  myFunction);
	}
	function place(){ 
	    document.removeEventListener("mousemove",  myFunction);
	}  
	function placeobj(x,y,x1,y1,l,r){
	    var cpx = parseInt(x);
	    var cpy = parseInt(y);
	    var amtx=parseInt(x1);
	    var amty=parseInt(y1);
	    var of=10;
	    document.getElementById("div2").style.left=cpx-amtx+l+"px";
	    document.getElementById("div2").style.top=cpy-amty+r+"px";
	}
	function myFunction(e) {
	    if(t==1){
	        x1 = e.clientX;
	        y1 = e.clientY;
	        var el=document.getElementById('div2');
	        l=el.offsetLeft;
	        r=el.offsetTop;
	        t=10;
	    }
	        x = e.clientX;
	        y = e.clientY;
	    placeobj(x,y,x1,y1,l,r);
	}



	let svgMap = $('.svg-map');
	let svgMapWrap = {
		w: $('.js-map-wr').width(),
		h: $('.js-map-wr').height()
	};






	let zoomStep = 0;

	function sizeMap(val) {
		if (val == 0) {
			svgMap.css({
				'transform':'translate3d(0px, 0, 0px) scale(0)'
			});
		} else if (val == 1) {
			svgMap.css({
				'transform':'translate3d(0px, 0, 0px) scale(1)'
			});
		} else if (val == 2) {
			svgMap.css({
				'transform':'translate3d(0px, 0, 0px) scale(2)'
			});
		}
	}



	$('.js-zoom-in').on('click',function(){
		if (zoomStep < 2) {
			zoomStep++;
		}
		sizeMap(zoomStep);
	});

	$('.js-zoom-out').on('click',function(){
		if (zoomStep != 0) {
			zoomStep--;
		}
		sizeMap(zoomStep);
	});







});
