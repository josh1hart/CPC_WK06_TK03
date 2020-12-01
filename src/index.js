import * as THREE from "three";
import * as Tone from "tone";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./styles.css";

let scene, camera, renderer;
let colour, intensity, light;
let ambientLight;
let raycaster, mouse, intersects;

let orbit;

let sceneHeight, sceneWidth;

let clock, delta, interval;
let effect, reverb;

let geometry, material;
let planeGeometry, planeMaterial;
let planet, plane;
let mouseDown;
let synth, synthNotes;

let startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

function init() {
  // remove overlay
  let overlay = document.getElementById("overlay");
  overlay.remove();

  Tone.start(); //ensure Tone starts and that audio will be processed
  mouseDown = false; //initialise mouse down to be false
  effect = new Tone.FeedbackDelay().toDestination(); //create a delay effect and connect it to the master output
  reverb = new Tone.Reverb({
    //connect a reverb effect and connect it to the master output
    decay: 2, //decay time of 2 seconds
    wet: 1.0, //fully wet signal
    preDelay: 0.25 //pre-delay time of 0.25 seconds
  }).toDestination();

  synthNotes = [
    //create an array with some choice notes in it
    "C2",
    "E2",
    "G2",
    "A2",
    "C3",
    "D3",
    "E3",
    "G3",
    "A3",
    "B3",
    "C4",
    "D4",
    "E4",
    "G4",
    "A4",
    "B4",
    "C5"
  ];
  synth = new Tone.MonoSynth().toDestination(); //create an instance of a monosynth and connect it to the master output
  synth.set({
    //set some defualt settings
    portamento: 0.1, //abit of a glide
    volume: -10, //reduce the level by 10dB

    oscillator: {
      //set the oscillator type to sawtooth
      type: "sawtooth"
    },

    envelope: {
      //set the envelope settings
      attack: 0.005,
      release: 2.0,
      sustain: 0.5
    }
  });
  synth.connect(effect); //connect the synth to the delay
  synth.connect(reverb); //connect the synth to the reverb

  //create clock and set interval at 30 fpx
  clock = new THREE.Clock();
  delta = 0;
  interval = 1 / 25;

  //create scene
  sceneWidth = window.innerWidth;
  sceneHeight = window.innerHeight;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0e0e);

  //create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 10;

  //specify renderer and add it to document
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //create the orbit controls instance so we can use the mouse move around scene
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableRotate = false;
  orbit.enableZoom = true;

  // lighting
  colour = 0xffffff;
  intensity = 1;
  light = new THREE.DirectionalLight(colour, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);
  ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambientLight);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  intersects = [];

  planeGeometry = new THREE.PlaneGeometry(7, 7);
  planeMaterial = new THREE.MeshPhongMaterial({
    color: 0x919191,
    side: THREE.DoubleSide
  });
  plane = new THREE.Mesh(planeGeometry, planeMaterial);

  plane.position.set(0, -0.5001, 0);
  plane.receiveShadow = true;
  plane.rotation.set(Math.PI / 2, 0, 0); //rotate around the x axis to become flat
  plane.shadowColor = 0xffffff;
  scene.add(plane);
  geometry = new THREE.SphereGeometry(1.5, 32, 32);
  material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    wireframe: false
  });
  planet = new THREE.Mesh(geometry, material);
  scene.add(planet);
  planet.castShadow = true;

  //add event listeners for pointer as opposed to mouse as this stops conflects with OrbitControls
  window.addEventListener("pointermove", move, false);
  window.addEventListener("pointerdown", triggerAttack, false);
  window.addEventListener("pointerup", triggerRelease, false);

  window.addEventListener("resize", onWindowResize, false); //resize callback
  play();
}

// stop animating (not currently used)
function stop() {
  renderer.setAnimationLoop(null);
}

// simple render function

function render() {
  renderer.render(scene, camera);
}

// start animating

function play() {
  //using the new setAnimationLoop method which means we are WebXR ready if need be
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

// update function

function update() {
  orbit.update();
  //update stuff in here
  delta += clock.getDelta();

  if (delta > interval) {
    // The draw or time dependent code are here

    delta = delta % interval;
  }
}

function onWindowResize() {
  //resize & align
  sceneHeight = window.innerHeight;
  sceneWidth = window.innerWidth;
  renderer.setSize(sceneWidth, sceneHeight);
  camera.aspect = sceneWidth / sceneHeight;
  camera.updateProjectionMatrix();
}

function triggerAttack(event) {
  console.log("down");
  raycaster.setFromCamera(mouse, camera); //create ray
  intersects = raycaster.intersectObject(planet); //test whether ray is intersecting with planet

  if (intersects.length > 0) {
    //if there is something in the array
    mouseDown = true; //set mouseDown boolean flag to true
  }

  const note =
    synthNotes[
      Math.round((event.clientX / sceneWidth) * (synthNotes.length - 1)) //constrain mouseX position using Math.round to create an integer index that can be used to pick a note from note array
    ];

  if (mouseDown) {
    //make the sphere follow the mouse
    let vector = new THREE.Vector3(mouse.x, mouse.y, 0.5); //create a new 3D vector using our mouse position
    vector.unproject(camera); //project mouse vector into world space using camera's normalised device coordinate space
    let dir = vector.sub(camera.position).normalize(); //create a direction vector based on subtracting our camera's position from our mouse position
    let distance = -camera.position.z / dir.z; //derive distance from negative z position of the camera devided by the direction's z position
    let pos = camera.position.clone().add(dir.multiplyScalar(distance)); //create a new position based on adding the direction vector scaled by the distance vector, to the camera's position vector
    planet.position.copy(pos); //copy our new position into the planet's position vector
    synth.triggerAttack(note); //trigger the envelope on the synthesiser
    planet.material.color.setHex(0xff00ff); //change the colour of the planet to purple pink
  }
}

function move(event) {
  mouse.x = (event.clientX / sceneWidth) * 2 - 1; //convert our mouse x position to be a value between -1.0 and 1.0
  mouse.y = -(event.clientY / sceneHeight) * 2 + 1; //convert our mouse y position to be a value between -1.0 and 1.0
  const note =
    synthNotes[
      Math.round((event.clientX / sceneWidth) * (synthNotes.length - 1))
    ];

  if (mouseDown) {
    //make the sphere follow the mouse
    let vector = new THREE.Vector3(mouse.x, mouse.y, 0.5); //create a new 3d vector using our mouse position
    vector.unproject(camera); //project mouse vector into worl space using camera's normalised device coordinate space
    let dir = vector.sub(camera.position).normalize(); //create a direction vector based on subtracting our camera's position from our mouse position
    let distance = -camera.position.z / dir.z; //derive distance from the negative z position of the camera devided by our direction's z position
    let pos = camera.position.clone().add(dir.multiplyScalar(distance)); //create a new position based on adding the direction vector scaled by the distance vector, to the camera's position vector
    planet.position.copy(pos); //copy  new postion into the planets postion vector
    synth.setNote(note); //update synth's note
    let volume = THREE.MathUtils.mapLinear(
      //map the y position to the volume of the synth. output range is in decibels
      mouse.y, //mouse value
      -1.0, //lower input range
      1.0, //upper input range
      -60, //lower output range
      -3 //upper output range
    );
    synth.volume.linearRampTo(volume, 0.01); //set new volume level with a ramp of 0.01 secounds
  }
}

function triggerRelease() {
  mouseDown = false; //set mouseDown flag to false
  console.log("up");
  synth.triggerRelease(Tone.now()); //tigger the release phase synth's envelope
  planet.material.color.setHex(0x919191); //return the planets orginal colour gray
}
