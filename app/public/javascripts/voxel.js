// create namespaces //
var stage, gui = { }

// init on document ready //
$(document).ready(function() {
	stage = new Stage();
	gui = new Gui();

	gui.create();
	stage.setCubeColor(gui.getColor());
});

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
	var canvasContainer = $('#main');
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
		SIZE: 500,
		STEP: 50,
		GEOMETRY: new THREE.Geometry(),
		MATERIAL: new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.2 })
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


	this.setCubeColor = function(color) {
		Cube.COLOR = color;
		Cube.MATERIAL.color.set(color);
		for(var i=0; i<Cube.OBJECTS.length; i++) {
			Cube.OBJECTS[i].material.color.set(color);
		}
		mouseCube.material.color.set(color);
		render();
	}

	// setup scene //
	var scene = new THREE.Scene();
	if(SceneSettings.ENABLE_FOG) {
		scene.fog = new THREE.FogExp2( SceneSettings.FOG_COLOR, SceneSettings.FOG_DEPTH );
	}

	// setup camera //
	var camera = new THREE.PerspectiveCamera(
		CameraSettings.VIEW_ANGLE,
		CameraSettings.ASPECT,
		CameraSettings.NEAR,
		CameraSettings.FAR);

	camera.position.y = 800;
	camera.position.x = 1400 * Math.sin( CameraSettings.VIEW_ANGLE * Math.PI / 360 );
	camera.position.z = 1400 * Math.cos( CameraSettings.VIEW_ANGLE * Math.PI / 360 );

	camera.lookAt( WorldSpace.TARGET );

	scene.add(camera);

	// setup lights //
	var ambientLight = new THREE.AmbientLight( 0x606060 );
	scene.add( ambientLight );

	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.normalize();
	scene.add( directionalLight );

	var directionalLight = new THREE.DirectionalLight( 0x808080 );
	directionalLight.position.normalize();
	scene.add( directionalLight );

	// setup controls //
	var controls = new THREE.OrbitControls(camera);
	controls.damping = 0.2;
	controls.addEventListener('change', render);

	// setup renderer //
	var renderer = new THREE.CanvasRenderer();
	renderer.setSize( SceneSettings.WIDTH, SceneSettings.HEIGHT );
	renderer.setClearColor( 0xFFFFFF );

	// document.body.appendChild(renderer.domElement);
	canvasContainer.append(renderer.domElement);

	// geometry //
	
	// init array of objects to test
	// for collision against
	var objects = [];

	// create base grid
	for ( var i = - Grid.SIZE; i <= Grid.SIZE; i += Grid.STEP ) {
		Grid.GEOMETRY.vertices.push( new THREE.Vector3( - Grid.SIZE, 0, i ) );
		Grid.GEOMETRY.vertices.push( new THREE.Vector3(   Grid.SIZE, 0, i ) );

		Grid.GEOMETRY.vertices.push( new THREE.Vector3( i, 0, - Grid.SIZE ) );
		Grid.GEOMETRY.vertices.push( new THREE.Vector3( i, 0,   Grid.SIZE ) );
	}

	var gridLine = new THREE.Line( Grid.GEOMETRY, Grid.MATERIAL );
	gridLine.type = THREE.LinePieces;
	scene.add( gridLine );

	// create invisble plane for intersect detection
	var plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial({ color: 0xFF0000 }) );
	plane.rotation.x = - Math.PI / 2;
	plane.visible = true;
	plane.material.transparent = true;
	plane.material.opacity = 0.02;
	scene.add( plane );
	objects.push(plane);

	// TODO - create invisible planes for intersect detection
	// along Y axis

	// create cube that will follow mouse
	var mouseCube = new THREE.Mesh( Cube.GEOMETRY, Cube.MATERIAL );
	// Cube.OBJECTS.push(mouseCube);
	scene.add(mouseCube);

	// setup projector //
	var projector = new THREE.Projector();

	// render loops //
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

	// intersect test //
	function testForPlaneIntersects() {
		WorldSpace.INTERSECTS = WorldSpace.RAYCASTER.intersectObjects( objects );
	}

	function testForCubeIntersects() {
		WorldSpace.INTERSECTS = WorldSpace.RAYCASTER.intersectObjects( Cube.OBJECTS );
	}

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

	// setup event listeners //
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'mousemove', onMouseMove, false );
	window.addEventListener( 'mousedown', onMouseDown, false );
	window.addEventListener( 'contextmenu', onRightClick, false );

	// setup event responders //
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
			mouseCube.position.divideScalar( Cube.SIZE ).floor().multiplyScalar( Cube.SIZE ).addScalar( Cube.SIZE / 2 );

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

	function onMouseDown(e) {
		e.preventDefault();

		testForPlaneIntersects();

		if( WorldSpace.INTERSECTS.length === 0) {
			// console.log("NO INTERSECTS");
			return;
		}
		else var intersect = WorldSpace.INTERSECTS[0];

		var voxel = new THREE.Mesh( Cube.GEOMETRY, Cube.MATERIAL );

		voxel.position.addVectors( intersect.point, WorldSpace.NORMAL );
		voxel.position.divideScalar( Cube.SIZE ).floor().multiplyScalar( Cube.SIZE ).addScalar( Cube.SIZE/2 );

		scene.add(voxel);
		// objects.push(voxel);
		Cube.OBJECTS.push(voxel);
		render();
	}

	function onRightClick(e) {
		e.preventDefault();

		testForCubeIntersects();

		// var intersect = WorldSpace.INTERSECTS[0];

		var intersects = WorldSpace.RAYCASTER.intersectObjects( Cube.OBJECTS );

		for(var i=0; i<intersects.length; i++) {
			var intersect = intersects[i];
			console.log("removing object");
			scene.remove( intersect.object );
			scene.remove(Cube.OUTLINE_MESH);
			Cube.OBJECTS.splice( Cube.OBJECTS.indexOf( intersect.object ), 1 );
			// break;
		}

		// mouseCube.visible = true;

		render();
	}
}