// create namespaces //
var stage, gui = { }

// init on document ready //
$(document).ready(function() {
	stage = new Stage();
	gui = new Gui();

	gui.create();
	stage.setCubeColor(gui.getColor());
});

var MouseButton = {
	LEFT: 	0,
	MIDDLE: 1,
	RIGHT: 	2
}

// functions n' such //
function Gui() {
	var _color = '#'+Math.floor(Math.random()*16777215).toString(16);

	this.getColor = function() {
		return _color;
	}

	this.create = function() {
		var _onSave = function() {};

		Object.defineProperty(this, "color", { get: function() { return _color } } );

		var o = {
			'Color'		: _color
		}

		var _gui = new dat.GUI({ autoPlace: false });
		_gui.addColor(o, 'Color').onChange(function(val){ 
			_color = val; 
			stage.setCubeColor(val);
		});

		var div = document.getElementById('gui');
		div.appendChild(_gui.domElement);
	}
}

function Stage() {
	/////////////////////////
	//   GLOBAL SETTINGS   //
	/////////////////////////
	var canvasContainerId = 'main';
	var canvasContainer = $('#' + canvasContainerId);
	var canvasElement = $('#cnvs');

	var SceneSettings = {
		WIDTH: window.innerWidth,
		HEIGHT: window.innerHeight,

		ENABLE_FOG: false,
		FOG_COLOR: 0xCCCCCC,
		FOG_DEPTH: 0.002
	}

	var CameraSettings = {
		VIEW_ANGLE: 45,
		ASPECT: SceneSettings.WIDTH / SceneSettings.HEIGHT,
		NEAR: 0.1,
		FAR: 10000
	}

	var WorldSpace = {
		MOUSE_2D: new THREE.Vector3( 0, 10000, 0.5 ),
		MOUSE_3D: null,
		RAYCASTER: null,
		TARGET: new THREE.Vector3( 0, 200, 0 ),
		NORMAL: null,
		NORMAL_MATRIX: new THREE.Matrix3(),
		INTERSECTS: null
	}

	var Grid = {
		START_Y: -( SceneSettings.HEIGHT / 2.35 ),
		SIZE: 500,
		STEP: 50,
		BASE_GEOMETRY: new THREE.Geometry(),
		BASE_MATERIAL: new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.2, transparent: true, linewidth: 1 }),
		GEOMETRY: new THREE.Geometry(),
		MATERIAL: new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.035 })
	}

	var Cube = {
		SIZE: 50,
		GEOMETRY: null,
		COLOR: 0x0FF80,
		MATERIAL: null,
		OBJECTS: [],

		OUTLINE_MATERIAL: new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.BackSide }),
		OUTLINE_MESH: null
	}
	Cube.MATERIAL = new THREE.MeshLambertMaterial({ color: Cube.COLOR, overdraw: 0.5 })
	Cube.GEOMETRY = new THREE.BoxGeometry( Cube.SIZE, Cube.SIZE, Cube.SIZE );

	var Plane = {
		SIZE: 1000,
		MATERIAL: new THREE.MeshBasicMaterial({ color: 0x29cdd8, opacity: 0.05 }),
		GEOMETRY: null,
		VISIBLE: false,
		PLANES: []
	}
	Plane.GEOMETRY = new THREE.PlaneGeometry( Plane.SIZE, Plane.SIZE );
	Plane.MATERIAL.transparent = true;

	this.setCubeColor = function(color) {
		Cube.COLOR = color;
		Cube.MATERIAL.color.set(color);
		for(var i=0; i<Cube.OBJECTS.length; i++) {
			Cube.OBJECTS[i].material.color.set(color);
		}
		mouseCube.material.color.set(color);
		render();
	}

	/////////////////
	//    SCENE    //
	/////////////////
	var scene = new THREE.Scene();
	if(SceneSettings.ENABLE_FOG) {
		scene.fog = new THREE.FogExp2( SceneSettings.FOG_COLOR, SceneSettings.FOG_DEPTH );
	}

	//////////////////
	//    CAMERA    //
	//////////////////
	var camera = new THREE.PerspectiveCamera(
		CameraSettings.VIEW_ANGLE,
		CameraSettings.ASPECT,
		CameraSettings.NEAR,
		CameraSettings.FAR);

	camera.position.y = 0;
	camera.position.x = Math.sin( CameraSettings.VIEW_ANGLE * Math.PI / 360 );
	camera.position.z = 1800 * Math.cos( CameraSettings.VIEW_ANGLE * Math.PI / 360 );

	// camera.lookAt( WorldSpace.TARGET );

	scene.add(camera);

	//////////////////
	//    LIGHTS    //
	//////////////////
	var ambientLight = new THREE.AmbientLight( 0x606060 );
	scene.add( ambientLight );

	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set( 1, 1, 1 );
	directionalLight.position.normalize();
	scene.add( directionalLight );

	var directionalLight = new THREE.DirectionalLight( 0x808080 );
	directionalLight.position.normalize();
	scene.add( directionalLight );

	//////////////////
	//   CONTROLS   //
	//////////////////
	var controls = new THREE.OrbitControls(camera, document.getElementById(canvasContainerId));
	controls.damping = 0.2;
	var controlsActive = false;
	controls.addEventListener('change', render);

	//////////////////
	//   RENDERER   //
	//////////////////
	// var renderer = new THREE.WebGLRenderer({ antialiasing: true });
	var renderer = new THREE.CanvasRenderer();
	renderer.setSize( SceneSettings.WIDTH, SceneSettings.HEIGHT );
	renderer.setClearColor( 0xFFFFFF );
	renderer.shadowMapType = THREE.PCFSoftShadowMap; // options are THREE.BasicShadowMap | THREE.PCFShadowMap | THREE.PCFSoftShadowMap

	// document.body.appendChild(renderer.domElement);
	canvasContainer.append(renderer.domElement);


	//////////////////
	//   GEOMETRY   //
	//////////////////
	// init array of objects to test
	// for collision against
	var objects = [];

	// create base grid
	for ( var i = - Grid.SIZE; i <= Grid.SIZE; i += Grid.STEP ) {
		// x lines
		Grid.BASE_GEOMETRY.vertices.push( new THREE.Vector3( - Grid.SIZE, Grid.START_Y, i ) );
		Grid.BASE_GEOMETRY.vertices.push( new THREE.Vector3(   Grid.SIZE, Grid.START_Y, i ) );

		// z lines
		Grid.BASE_GEOMETRY.vertices.push( new THREE.Vector3( i, Grid.START_Y, - Grid.SIZE ) );
		Grid.BASE_GEOMETRY.vertices.push( new THREE.Vector3( i, Grid.START_Y,   Grid.SIZE ) );
	}

	var baseGridLines = new THREE.Line( Grid.BASE_GEOMETRY, Grid.BASE_MATERIAL );
	baseGridLines.type = THREE.LinePieces;
	scene.add( baseGridLines );

	// create rest of grid
	for ( var z = - Grid.SIZE; z <= Grid.SIZE; z += Grid.STEP ) {
		for( var y = Grid.START_Y+Grid.STEP; y <= (Grid.SIZE*2)+Grid.START_Y; y += Grid.STEP ) {
		 	// x lines
		 	Grid.GEOMETRY.vertices.push( new THREE.Vector3( - Grid.SIZE, y, z ) );
		 	Grid.GEOMETRY.vertices.push( new THREE.Vector3(   Grid.SIZE, y, z ) );
		}
	}

	for ( var x = - Grid.SIZE; x <= Grid.SIZE; x += Grid.STEP ) {
		for( var z = -Grid.SIZE; z <= Grid.SIZE; z += Grid.STEP ) {
		 	// y lines
			Grid.GEOMETRY.vertices.push( new THREE.Vector3( x, Grid.START_Y, z ) );
			Grid.GEOMETRY.vertices.push( new THREE.Vector3( x, Grid.START_Y+Grid.SIZE*2, z ) );
		}
	}

	for ( var x = - Grid.SIZE; x <= Grid.SIZE; x += Grid.STEP ) {
		for( var y = Grid.START_Y+Grid.STEP; y <= (Grid.SIZE*2)+Grid.START_Y; y += Grid.STEP ) {
		 	// z lines
		 	Grid.GEOMETRY.vertices.push( new THREE.Vector3( x, y, - Grid.SIZE ) );
		 	Grid.GEOMETRY.vertices.push( new THREE.Vector3( x, y,   Grid.SIZE ) );
		}
	}

	var gridLine = new THREE.Line( Grid.GEOMETRY, Grid.MATERIAL );
	gridLine.type = THREE.LinePieces;
	scene.add( gridLine );

	// create invisble plane for intersect detection
	createPlane(0,Grid.START_Y);

	// create invisible planes for intersect detection
	// along Y axis
	for( var y = Grid.START_Y+Grid.STEP; y <= (Grid.SIZE*2)+Grid.START_Y; y += Grid.STEP ) {
		createPlane(0, y);
	}

	function createPlane(x, y) {
		var plane = new THREE.Mesh( Plane.GEOMETRY, Plane.MATERIAL );
		plane.rotation.x = - Math.PI / 2; // rotate from horizontal to vertical
		plane.position.x = x;
		plane.position.y = y;
		plane.visible = Plane.VISIBLE;
		Plane.PLANES.push( plane );
		scene.add( Plane.PLANES[Plane.PLANES.length-1] );
		objects.push( Plane.PLANES[Plane.PLANES.length-1] );
	}


	// create cube that will follow mouse
	var mouseCube = new THREE.Mesh( Cube.GEOMETRY, Cube.MATERIAL );
	// Cube.OBJECTS.push(mouseCube);
	scene.add(mouseCube);

	///////////////////
	//   PROJECTOR   //
	///////////////////
	var projector = new THREE.Projector();

	//////////////////////
	//   RENDER LOOPS   //
	//////////////////////
	function animate() {
		requestAnimationFrame(animate);
		controls.update();
	}
	animate();

	function render() {
		WorldSpace.RAYCASTER = projector.pickingRay( WorldSpace.MOUSE_2D.clone(), camera );
		renderer.render( scene, camera );
	}
	render();

	///////////////////////
	//  INTERSECT TESTS  //
	///////////////////////
	function testForPlaneIntersects() {
		var collisionObjects = objects;
		WorldSpace.INTERSECTS = WorldSpace.RAYCASTER.intersectObjects( collisionObjects );
	}

	function testForCubeIntersects() {
		WorldSpace.INTERSECTS = WorldSpace.RAYCASTER.intersectObjects( Cube.OBJECTS );
	}

	////////////////////////
	//  OUTLINE CREATION  //
	////////////////////////
	function createOutline(geometry, x, y, z) {
		scene.remove(Cube.OUTLINE_MESH);

		Cube.OUTLINE_MATERIAL.visible = true;
		Cube.OUTLINE_MESH = null;
		Cube.OUTLINE_MESH = new THREE.Mesh( geometry, Cube.OUTLINE_MATERIAL );
		Cube.OUTLINE_MESH.position.x = x;
		Cube.OUTLINE_MESH.position.y = y;
		Cube.OUTLINE_MESH.position.z = z;
		Cube.OUTLINE_MESH.scale.multiplyScalar(1.05);

		scene.add(Cube.OUTLINE_MESH);
	}

	////////////////////////
	//    MISC UTILITY    //
	////////////////////////
	function alignMeshToGrid(mesh) {
		mesh.position.divideScalar( Cube.SIZE ).floor().multiplyScalar( Cube.SIZE ).addScalar( Cube.SIZE / 2 );

		// adjust for offset y-position of grid, which may not be evenly
		// divisible by Cube.SIZE. If needed, we could also adjust for x
		// and z positions accordingly.
		mesh.position.y += Cube.SIZE - Math.abs(Grid.START_Y % Cube.SIZE);
	}

	///////////////////////////////
	//   SETUP EVENT LISTENERS   //
	///////////////////////////////
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'mousemove', onMouseMove, false );
	window.addEventListener( 'mousedown', onMouseDown, false );
	window.addEventListener( 'mouseup', onMouseUp, false );

	////////////////////////
	//   EVENT HANDLERS   //
	////////////////////////
	function onWindowResize() {
		// window resized -- adjust scene and renderer accordingly
		SceneSettings.WIDTH = window.innerWidth;
		SceneSettings.HEIGHT = window.innerHeight;
		CameraSettings.ASPECT = SceneSettings.WIDTH / SceneSettings.HEIGHT;
		camera.updateProjectionMatrix();

		renderer.setSize(SceneSettings.WIDTH, SceneSettings.HEIGHT);
		render();
	}

	
	function onMouseMove(e) {
		e.preventDefault();

		WorldSpace.MOUSE_2D.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		WorldSpace.MOUSE_2D.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

		testForPlaneIntersects();

		if(WorldSpace.INTERSECTS.length > 0) {
			mouseCube.visible = true;

			var intersect = WorldSpace.INTERSECTS[0];
			WorldSpace.NORMAL_MATRIX.getNormalMatrix( intersect.object.matrixWorld );

			WorldSpace.NORMAL = intersect.face.normal.clone();
			WorldSpace.NORMAL.applyMatrix3( WorldSpace.NORMAL_MATRIX ).normalize();

			mouseCube.position.addVectors( intersect.point, WorldSpace.NORMAL );

			// align to grid and prevent collisions with previous objects
			alignMeshToGrid(mouseCube);

			// see if we are intersecting with any previous cubes
			var foundNonMouseIntersect = false;
			for( var i=0; i<Cube.OBJECTS.length; i++) {
				if(Cube.OBJECTS[i] == mouseCube) continue;
				var objX = Cube.OBJECTS[i].position.x;
				var objY = Cube.OBJECTS[i].position.y;
				var objZ = Cube.OBJECTS[i].position.z;
				if(mouseCube.position.x === objX && mouseCube.position.y === objY && mouseCube.position.z === objZ) {
					// TODO -
					// overlapping with existing cube -- don't display mouse cube,
					// and set overlapped cube to draw outlines
					mouseCube.visible = false;
					createOutline(Cube.GEOMETRY, objX, objY, objZ);
					foundNonMouseIntersect = true;
				}
			}

			if(!foundNonMouseIntersect) {
				scene.remove(Cube.OUTLINE_MESH);
			}
		}

		render();
	}

	var mouseDownX;
	var mouseDownY;
	function onMouseDown(e) {
		// store mouse x/y position
		mouseDownX = e.clientX;
		mouseDownY = e.clientY;
	}

	function onMouseUp(e) {
		// do nothing if mouse has moved substantially
		// since mouse down -- this indicates a drag, and
		// is therefore likely indicative of rotating/panning the camera
		if( e.clientX !== mouseDownX || e.clientY !== mouseDownY ) {
			return;
		}

		e.preventDefault();
		if( e.button === MouseButton.LEFT ) {
			testForPlaneIntersects();

			if( WorldSpace.INTERSECTS.length === 0) {
				// console.log("NO INTERSECTS");
				return;
			}
			
			var intersect = WorldSpace.INTERSECTS[0];

			var voxel = new THREE.Mesh( Cube.GEOMETRY, Cube.MATERIAL );

			voxel.position.addVectors( intersect.point, WorldSpace.NORMAL );
			alignMeshToGrid(voxel);

			scene.add(voxel);
			// objects.push(voxel);
			Cube.OBJECTS.push(voxel);
			render();
		}

		else if( e.button === MouseButton.RIGHT ) {
			testForCubeIntersects();

			var intersects = WorldSpace.RAYCASTER.intersectObjects( Cube.OBJECTS );
			if(intersects.length <= 0) return;

			var firstIntersect = intersects[0];

			scene.remove( firstIntersect.object );
			scene.remove(Cube.OUTLINE_MESH);
			Cube.OBJECTS.splice( Cube.OBJECTS.indexOf( firstIntersect.object ), 1 );

			render();
		}
	}
}