// create namespaces //
var Stage = { }

// init on document ready //
$(document).ready(function() {
	Stage = new stage();
});

// functions n' such //
function stage() {
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
		NORMAL_MATRIX: new THREE.Matrix3()
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
		MATERIAL: new THREE.MeshLambertMaterial({ color: 0x0FF80, overdraw: 0.5 })
	}
	Cube.GEOMETRY = new THREE.BoxGeometry( Cube.SIZE, Cube.SIZE, Cube.SIZE );

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
	directionalLight.position.x = Math.random() - 0.5;
	directionalLight.position.y = Math.random() - 0.5;
	directionalLight.position.z = Math.random() - 0.5;
	directionalLight.position.normalize();
	scene.add( directionalLight );

	var directionalLight = new THREE.DirectionalLight( 0x808080 );
	directionalLight.position.x = Math.random() - 0.5;
	directionalLight.position.y = Math.random() - 0.5;
	directionalLight.position.z = Math.random() - 0.5;
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

	// setup event listeners //
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'mousemove', onMouseMove, false );
	window.addEventListener( 'mousedown', onMouseDown, false );

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

		var intersects = WorldSpace.RAYCASTER.intersectObjects( objects );

		if(intersects.length > 0) {
			var intersect = intersects[0];
			WorldSpace.NORMAL_MATRIX.getNormalMatrix( intersect.object.matrixWorld );

			WorldSpace.NORMAL = intersect.face.normal.clone();
			WorldSpace.NORMAL.applyMatrix3( WorldSpace.NORMAL_MATRIX ).normalize();

			mouseCube.position.addVectors( intersect.point, WorldSpace.NORMAL );
			mouseCube.position.divideScalar( Cube.SIZE ).floor().multiplyScalar( Cube.SIZE ).addScalar( Cube.SIZE/2 );
		}

		render();
	}

	function onMouseDown(e) {
		e.preventDefault();

		var intersects = WorldSpace.RAYCASTER.intersectObjects( objects );

		if( intersects.length === 0) {
			console.log("NO INTERSECTS");
			return;
		}
		else var intersect = intersects[0];	

		var voxel = new THREE.Mesh( Cube.GEOMETRY, Cube.MATERIAL );

		voxel.position.addVectors( intersect.point, WorldSpace.NORMAL );
		voxel.position.divideScalar( Cube.SIZE ).floor().multiplyScalar( Cube.SIZE ).addScalar( Cube.SIZE/2 );

		scene.add(voxel);
		objects.push(voxel);
		render();
	}
}