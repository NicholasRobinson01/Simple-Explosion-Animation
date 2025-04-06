/*
    File that contains all the functions that handle user interaction with the GUI
*/


// Function that resets the scene to the original unexploded cube after an explosion
function resetMesh()
{
    // Delete the old particle systems and add back in the old cube mesh to the scene
    scene.remove(debrisSystem);
    scene.remove(fireballSystem);
    scene.remove(smokeSystem);
    scene.add(cube);

    // Set some global variables back to their default state
    animateExplosion = false;
    velocityDebrisParticles = [];
    velocityFireballParticles = [];
    velocitySmokeParticles = [];
}


function resetInitialParameters()
{
    // Update the GUI values on the slider in the program to their initial values
    updateSliderExplosionStrength(5);
    updateSliderExplosionFalloffDistance(3);
    updateSliderExplosionDecayRate(4);
    updateSliderParticleMass(5);
    updateSliderParticleSize(0.25);

    // Explicitly reset slider positions in the GUI
    document.querySelector('input[type="range"][onchange^="updateSliderExplosionStrength"]').value = 5;
    document.querySelector('input[type="range"][onchange^="updateSliderExplosionFalloffDistance"]').value = 3;
    document.querySelector('input[type="range"][onchange^="updateSliderExplosionDecayRate"]').value = 4;
    document.querySelector('input[type="range"][onchange^="updateSliderParticleMass"]').value = 5;
    document.querySelector('input[type="range"][onchange^="updateSliderParticleSize"]').value = 0.25;
}


// Function that sets the explosion strength for the program after the explosion strength slider is changed
function updateSliderExplosionStrength(sliderAmount) {
    $("#sliderAmountExplosionStrength").html(sliderAmount);
    explosionStrength = sliderAmount;
}



// Function that sets the explosion falloff distance for the program 
// after the explosion falloff distance slider is changed
function updateSliderExplosionFalloffDistance(sliderAmount) {
    $("#sliderAmountExplosionFalloffDistance").html(sliderAmount);
    falloffDistance = sliderAmount;
}


// Function that sets the explosion decay rate for the program 
// after the explosion decay rate slider is changed
function updateSliderExplosionDecayRate(sliderAmount) {
    $("#sliderAmountExplosionDecayRate").html(sliderAmount);
    fireballDecayRate = sliderAmount;
}



// Function that sets the debris particle mass for the program 
// after the debris particle mass slider is changed
function updateSliderParticleMass(sliderAmount) {
    $("#sliderAmountParticleMass").html(sliderAmount);
    particleMass = sliderAmount;
}



// Function that sets the debris particle size for the program 
// after the debris particle size slider is changed
function updateSliderParticleSize(sliderAmount) {
    $("#sliderAmountParticleSize").html(sliderAmount);
    particleSize = sliderAmount;
}


// Used in the GUI functions that adjusts the camera to change the camera after interacting with the GUI
function updateCameraPosition() {
    // Convert rotation values from degrees to radians.
    let hRad = THREE.Math.degToRad(horizontalRotation);
    let vRad = THREE.Math.degToRad(verticalRotation);
    
    // Use spherical coordinates:
    // When verticalRotation = 0, the camera lies in the horizontal plane.
    camera.position.x = cameraDistance * Math.cos(vRad) * Math.sin(hRad);
    camera.position.y = cameraDistance * Math.sin(vRad);
    camera.position.z = cameraDistance * Math.cos(vRad) * Math.cos(hRad);

    // Make the camera look at the origin (or the cube's position)
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    
    // Update camera matrices
    camera.updateMatrixWorld();
    
    // Re-render the scene (if you want immediate feedback)
    renderer.render(scene, camera);
}


// Function that sets the camera back to the initial position and sets the corresponding variables
function resetCamera()
{
    // Update the scene and slider variables
    updateSliderCameraDistance(50);
    updateSliderHorizontalRotation(0);
    updateSliderVerticalRotation(0);

    // Change the sliders themselves
    document.querySelector('input[type="range"][onchange^="updateSliderCameraDistance"]').value = 50;
    document.querySelector('input[type="range"][onchange^="updateSliderHorizontalRotation"]').value = 0;
    document.querySelector('input[type="range"][onchange^="updateSliderVerticalRotation"]').value = 0;
}



// Function that sets the camera distance for the camera after the camera distance 
// slider is changed and adjust the camera based on the new distance 
function updateSliderCameraDistance(sliderAmount) {
    $("#sliderAmountCameraDistance").html(sliderAmount);
    cameraDistance = sliderAmount;
    updateCameraPosition();
}



// Function that sets the horizontal rotation about the origin for the camera after the horizontal rotation 
// slider is changed and adjust the camera based on the new horizontal rotation 
function updateSliderHorizontalRotation(sliderAmount) {
    // Update the slider
    $("#sliderAmountHorizontalRotation").html(sliderAmount + "°");

    // Update the horizontal rotation of the camera
    horizontalRotation = sliderAmount;
    updateCameraPosition();
}



// Function that sets the vertical rotation about the origin for the camera after the vertical rotation 
// slider is changed and adjust the camera based on the new vertical rotation 
function updateSliderVerticalRotation(sliderAmount) {
    // Update the slider
    $("#sliderAmountVerticalRotation").html(sliderAmount + "°");

    // Update the vertical rotation of the camera
    verticalRotation = sliderAmount;
    updateCameraPosition();
}