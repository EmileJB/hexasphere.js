$(window).load(function(){
	
	
    var width = $(window).innerWidth();
    var height = $(window).innerHeight()-10;

    var renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( width, height);

    var cameraDistance = 65;
    var camera = new THREE.PerspectiveCamera( cameraDistance, width / height, 1, 200);
    camera.position.z = -cameraDistance;

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x000000, cameraDistance*.4, cameraDistance * 1.2);

    var img = document.getElementById("projection");
    var projectionCanvas = document.createElement('canvas');
    var projectionContext = projectionCanvas.getContext('2d');

    projectionCanvas.width = img.width;
    projectionCanvas.height = img.height;
    projectionContext.drawImage(img, 0, 0, img.width, img.height);

    var yCameraToggle = 0;
    

    var pixelData = null;
	
	const controls = new THREE.OrbitControls(camera, renderer.domElement);

    var maxLat = -100;
    var maxLon = 0;
    var minLat = 0;
    var minLon = 0;

    var isLand = function(lat, lon){

        var x = parseInt(img.width * (lon + 180) / 360);
        var y = parseInt(img.height * (lat+90) / 180);

        if(pixelData == null){
            pixelData = projectionContext.getImageData(0,0,img.width, img.height);
        }
        return pixelData.data[(y * pixelData.width + x) * 4] === 0;
    };


    var meshMaterials = [];
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x7cfc00, transparent: true}));
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x397d02, transparent: true}));
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x77ee00, transparent: true}));
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x61b329, transparent: true}));
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x83f52c, transparent: true}));
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x83f52c, transparent: true}));
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x4cbb17, transparent: true}));
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x00ee00, transparent: true}));
    meshMaterials.push(new THREE.MeshBasicMaterial({color: 0x00aa11, transparent: true}));

    var oceanMaterial = []
    oceanMaterial.push(new THREE.MeshBasicMaterial({color: 0x0f2342, transparent: true}));
    oceanMaterial.push(new THREE.MeshBasicMaterial({color: 0x0f1e38, transparent: true}));

    var introTick = 0;
    var seenTiles = {};
    var currentTiles = [];

    var createScene = function(radius, divisions, tileSize){
        introTick = -1;
        while(scene.children.length > 0){ 
            scene.remove(scene.children[0]); 
        }
        var hexasphere = new Hexasphere(radius, divisions, tileSize);
        for(var i = 0; i< hexasphere.tiles.length; i++){
            var t = hexasphere.tiles[i];
            var latLon = t.getLatLon(hexasphere.radius);

            var geometry = new THREE.Geometry();

            for(var j = 0; j< t.boundary.length; j++){
                var bp = t.boundary[j];
                geometry.vertices.push(new THREE.Vector3(bp.x, bp.y, bp.z));
            }
            geometry.faces.push(new THREE.Face3(0,1,2));
            geometry.faces.push(new THREE.Face3(0,2,3));
            geometry.faces.push(new THREE.Face3(0,3,4));
            if(geometry.vertices.length > 5){
                geometry.faces.push(new THREE.Face3(0,4,5));
            }

            if(isLand(latLon.lat, latLon.lon)){
                material = meshMaterials[Math.floor(Math.random() * meshMaterials.length)]
            } else {
                material = oceanMaterial[Math.floor(Math.random() * oceanMaterial.length)]
            }

            material.opacity = 0.3;
            var mesh = new THREE.Mesh(geometry, material.clone());
            scene.add(mesh);
            hexasphere.tiles[i].mesh = mesh;

        }

        seenTiles = {};
        
        currentTiles = hexasphere.tiles.slice().splice(0,12);
        currentTiles.forEach(function(item){
            seenTiles[item.toString()] = 1;
            item.mesh.material.opacity = 1;
        });

        window.hexasphere = hexasphere;
        introTick = 0;
    };

    createScene(30, 25, .95);

    var startTime = Date.now();
    var lastTime = Date.now();
    var cameraAzimuthAngle = -Math.PI/2;
    var cameraPolarAngle = Math.PI/2;

    var tick = function(){
	    
	    controls.update()

        var dt = Date.now() - lastTime;

        var rotateCameraBy = (2 * Math.PI)/(200000/dt);
        //cameraAngle += rotateCameraBy;


        lastTime = Date.now();


	camera.position.x = cameraDistance * Math.cos(cameraAzimuthAngle) * Math.sin(cameraPolarAngle);
	camera.position.z = cameraDistance * Math.sin(cameraAzimuthAngle) * Math.sin(cameraPolarAngle);
	camera.position.y = cameraDistance * Math.cos(cameraPolarAngle);
	// camera.position.y = Math.sin(cameraAngle)* 10; original code
        camera.lookAt( scene.position );

        renderer.render( scene, camera );

        var nextTiles = [];

        currentTiles.forEach(function(item){
            item.neighbors.forEach(function(neighbor){
                if(!seenTiles[neighbor.toString()]){
                    neighbor.mesh.material.opacity = 1;
                    nextTiles.push(neighbor);
                    seenTiles[neighbor] = 1;
                }
            });
        });

        currentTiles = nextTiles;

        requestAnimationFrame(tick);

    }

    function onWindowResize(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

    }

    function clamp(val, min, max){
        return Math.min(Math.max(min, val), max);
    }

    $('.generateButton').click(function(){

        var radius = $('#radius').val();
        var subdivisions = $('#subdivisions').val();
        var tileSize = $('#tileSize').val();

        if ($.isNumeric(radius) && $.isNumeric(subdivisions) && $.isNumeric(tileSize)){
            $('#generateError').hide();
            radius = parseInt(clamp(radius, .1, 10000));
            subdivisions = parseInt(clamp(subdivisions, 1, 100));
            tileSize = parseFloat(clamp(tileSize, 0.0001, 1))

            $('#radius').val(radius);
            $('#subdivisions').val(subdivisions);
            $('#tileSize').val(tileSize);

            createScene(radius, subdivisions, tileSize);

            if($(this).prop('id') === 'generateObj'){
                var blob = new Blob([hexasphere.toObj()], {type: "text/plain;charset=utf-8"});
                saveAs(blob, 'hexasphere.obj')
            } else if($(this).prop('id') === 'generateJson'){
                var blob = new Blob([hexasphere.toJson()], {type: "application/json;charset=utf-8"});
                saveAs(blob, 'hexasphere.json')
            }
        } else {
            $('#generateError').show();
        }


    });

const caster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
	
	function onClick(event) {

  event.preventDefault();

  mouse.x = (event.clientX / renderer.domElement.offsetWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.offsetHeight) * 2 + 1;

  caster.setFromCamera(mouse, camera);

  const intersects = caster.intersectObjects(scene.children);

  if (intersects.length > 0) {

    const intersection = intersects[0];
    
	  console.log(intersection)
	  console.log(intersection['object'])
	  console.log(intersection['material'])
	  
	  
    intersection['object']['visible'] = false;

  }

}

	//At this current state, should allow for rudimentary camera control moving left and right.
	//W and S should zoom in and out if my hypothesis is correct
function protoCameraControls(event) {
	var code = event.code;
	if (code == "KeyD") {
	 var rotateCameraBy = Math.PI/128;
        cameraAzimuthAngle += rotateCameraBy;
	}
	if (code == "KeyA") {
	 var rotateCameraBy = Math.PI/128;
        cameraAzimuthAngle -= rotateCameraBy;
	}
	if (code == "KeyW") {
	 var rotateCameraBy = Math.PI/128;
        cameraPolarAngle += rotateCameraBy;
	}
	if (code == "KeyS") {
	 var rotateCameraBy = Math.PI/128;
        cameraPolarAngle -= rotateCameraBy;
	}
	if (code == "KeyX") {
	 cameraDistance--;
	}
	if (code == "KeyZ") {
	 cameraDistance++;
	}
	if (code == "KeyL") {
	  console.log("Camera X: " + camera.position.x);
	  console.log("Camera Y: " + camera.position.y);
	  console.log("Camera Z: " + camera.position.z);
	  console.log(hexasphere.tiles);
	}
	
}
	
	
	
	window.addEventListener("click", onClick, false);
	
	window.addEventListener("keydown",protoCameraControls,false);
	
    window.addEventListener( 'resize', onWindowResize, false );

    $("#container").append(renderer.domElement);
    requestAnimationFrame(tick);
    window.scene = scene;
    window.createScene = createScene;

});
