getRoot(root) {
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
    },
    getEventPoint(evt) {
      var p = root.createSVGPoint();

      p.x = evt.clientX-root.getBoundingClientRect().left;
      p.y = evt.clientY-root.getBoundingClientRect().top;

      return p;
    },
    setCTM(element, matrix) {
      var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

      element.setAttribute("transform", s);
    },
    dumpMatrix(matrix) {
      var s = "[ " + matrix.a + ", " + matrix.c + ", " + matrix.e + "\n  " + matrix.b + ", " + matrix.d + ", " + matrix.f + "\n  0, 0, 1 ]";

      return s;
    },
    setAttributes(element, attributes){
      for (var i in attributes)
        element.setAttributeNS(null, i, attributes[i]);
    },
    handleMouseWheel(evt) {

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
    },

    handleMouseMove(evt) {
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
    },
    handleMouseDown(evt) {
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
    },
    handleMouseUp(evt) {
      if(evt.preventDefault)
        evt.preventDefault();

      evt.returnValue = false;

      var svgDoc = evt.target.ownerDocument;

      if(state == 'pan' || state == 'drag') {
        // Quit pan mode
        state = '';
      }
    },