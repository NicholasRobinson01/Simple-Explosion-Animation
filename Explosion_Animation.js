// Varaiables for the animation control sliders
let particleMass, particleSize, explosionStrength, falloffDistance, fireballDecayRate;

// Variables needed for the scene in the animation
let scene, camera, renderer, light;

// Variables for the camera
let cameraDistance, horizontalRotation, verticalRotation;

// Variables needed for the click event for the explosion
let raycaster, mouse;

// Meshes and particle systems for the object and explosion
let cube, debrisSystem, fireballSystem, smokeSystem;

// For the velocity attribute for each of the particle systems
let velocityDebrisParticles, velocityFireballParticles, velocitySmokeParticles;

// Variables for the animation
let animateExplosion; // Bool that is true if we are animating the explosion, false otherwise
let lastTimeStamp; // Last timestamp for when the animation was last updated
let gravity; // Force on the debris particles due to gravity
let explosiveForceDuration; // How long the explosion exerts a force on the debris particles
let currentExplosionTime; // Time since the start of the explosion

// Vertex and fragment shaders for the fireball particles
const fireballVertexShader = `
    varying vec3 vColor;
    void main() {
        vColor = color; // Pass vertex color to fragment shader
        gl_PointSize = 5.0; // Adjust based on distance
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fireballFragmentShader = `
    uniform float uTime;
    varying vec3 vColor;
    
    void main() {
        float distance = length(gl_PointCoord - vec2(0.5));
        if (distance > 0.5) discard; // Soft particle edges
        
        // Gradual fade based on time instead of cyclic reset
        float fade = exp(-uTime * 2.0);

        vec3 emissiveColor = vColor * fade * 2.0; // Keep brightness but fade over time
        gl_FragColor = vec4(emissiveColor, fade);
    }
`;


// Creates the starting scene of the program
function createInitialScene()
{
    // Set the initial values for the variables that can be changed in the animation control table
    particleMass = 5;
    particleSize = 0.25;
    explosionStrength = 5;
    falloffDistance = 2;
    fireballDecayRate = 4;

    // Create the initial scene, camera, and renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 800 / 800, 0.1, 1000); // Match canvas size
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas0") });
    renderer.setSize(800, 800); // Set explicit size to match HTML

    // Move the camera back so we can see the scene
    camera.position.set(0, 0, 50);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Needed for the click event
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create the intial textured box geometry and add to the scene
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('Textures/MetalTexture.jpg');
    const material = new THREE.MeshBasicMaterial({ map: texture });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    scene.background = new THREE.Color("gray"); // Gray background

    // Set that the fact that the scene should not be animated
    animateExplosion = false;
    explosiveForceDuration = 1.0;

    // Initialize the camera rotation variables
    cameraDistance = 50;
    horizontalRotation = 0;
    verticalRotation = 0;

    // Initialize the list for the velocities of the particle systems for the explosion
    velocityDebrisParticles = [];
    velocityFireballParticles = [];
    velocitySmokeParticles = [];
}


// Function that starts the explosion on clicking the cube mesh
function onMouseClick(event) {
    // Ensure that the explosion has not happened yet
    if(!animateExplosion)
    {
        const canvas = document.getElementById("canvas0");
        const rect = canvas.getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(cube);

        // If the mouse clicks on the cube mesh
        if (intersects.length > 0) {
            scene.remove(cube); // Remove the cube mesh
            currentExplosionTime = 0.0;
            animateExplosion = true;
            lastTimeStamp = performance.now(); // Starting time step of the explosion
            gravity = new THREE.Vector3(0, -9.8 * particleMass, 0); // Set force due to gravity for all particles

            // Create the particle system for the debris, fireball, and smoke of the explosion
            createDebrisCube();
            createSmokeParticles();
            createFireballParticles();
        }
    }
}

// Creates the initial particle system for the debris for the explosion
function createDebrisCube() {
    // Get the original cube's size
    const boundingBox = new THREE.Box3().setFromObject(cube);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // Determine number of particles per axis
    const numParticlesX = Math.max(1, Math.ceil(size.x / particleSize));
    const numParticlesY = Math.max(1, Math.ceil(size.y / particleSize));
    const numParticlesZ = Math.max(1, Math.ceil(size.z / particleSize));

    const totalParticles = numParticlesX * numParticlesY * numParticlesZ;

    // Create cube geometry for each particle
    const particleGeometry = new THREE.BoxGeometry(particleSize, particleSize, particleSize);
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('Textures/MetalTexture.jpg');
    const particleMaterial = new THREE.MeshBasicMaterial({ map: texture });

    // InstancedMesh for efficient rendering
    debrisSystem = new THREE.InstancedMesh(particleGeometry, particleMaterial, totalParticles);

    const tempMatrix = new THREE.Matrix4();
    let index = 0;

    // Compute starting corner of the particle grid (aligned with the original cube)
    const startX = -size.x / 2 + particleSize / 2;
    const startY = -size.y / 2 + particleSize / 2;
    const startZ = -size.z / 2 + particleSize / 2;

    // Generate particles
    for (let i = 0; i < numParticlesX; i++) {
        for (let j = 0; j < numParticlesY; j++) {
            for (let k = 0; k < numParticlesZ; k++) {
                // Calculate positions ensuring correct alignment within the original cube
                const x = startX + i * particleSize;
                const y = startY + j * particleSize;
                const z = startZ + k * particleSize;

                // Set transform matrix for each particle
                tempMatrix.setPosition(x, y, z);
                debrisSystem.setMatrixAt(index++, tempMatrix);

                // Assign each particle an initial velocity of (0,0,0)
                const velocity = new THREE.Vector3(0, 0, 0);
                velocityDebrisParticles.push(velocity);
            }
        }
    }

    // Set the position of the particle system to match the original cube
    debrisSystem.position.copy(cube.position);

    // Add the new debris system to the scene and delete the old cube mesh
    scene.add(debrisSystem);
}


// Create the particle system for the fireball effect of the explosion
function createFireballParticles() {
    // Set necessary local parameters
    const fireballParticlesCount = explosionStrength * 10000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(fireballParticlesCount * 3);
    const colors = new Float32Array(fireballParticlesCount * 3);

    // Load the fireball texture (make sure fireball.png is in your project)
    const textureLoader = new THREE.TextureLoader();
    const fireballTexture = textureLoader.load('Textures/FireballTexture.jpg');

    for (let i = 0; i < fireballParticlesCount; i++) {
        // All particles start at the center (0,0,0)
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        // Create a random velocity vector to expand outward
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = explosionStrength * 20.0;
        const vx = speed * Math.sin(phi) * Math.cos(theta);
        const vy = speed * Math.sin(phi) * Math.sin(theta);
        const vz = speed * Math.cos(phi);
        const initialVelocity = new THREE.Vector3(vx, vy, vz);
        velocityFireballParticles.push(initialVelocity);

        // Define a base color for the particle (could be used for tinting)
        colors[i * 3] = 1; 
        colors[i * 3 + 1] = Math.random() * 0.5;
        colors[i * 3 + 2] = 0;
    }

    // Set the positon and color attributes for the fireball particles
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Create a PointsMaterial that uses the fireball texture.
    const particleMaterial = new THREE.PointsMaterial({
        size: 5.0,
        map: fireballTexture,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending  // Helps give a glowing effect
    });

    // Create and add the fireball particle system to the scene
    fireballSystem = new THREE.Points(particles, particleMaterial);
    scene.add(fireballSystem);
}



// Creates the particles for the smoke simulation for the final project
function createSmokeParticles() {
    // Set necessary local parameters
    const smokeParticlesCount = explosionStrength * 500;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(smokeParticlesCount * 3);
    const colors = new Float32Array(smokeParticlesCount * 3);

    // Load a smoke texture (ensure you have a "smoke.png" file available)
    const smokeTexture = new THREE.TextureLoader().load('Textures/SmokeTexture.png');

    for (let i = 0; i < smokeParticlesCount; i++) {
        // All particles start at the explosion center
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        // Adjust the initial velocity based on explosionStrength
        const angle = Math.random() * Math.PI * 2;
        // Outward speed scaled by explosionStrength (make it lower than fireball)
        const outwardSpeed = Math.random() * 2.5 * explosionStrength; 
        // Upward speed scaled by explosionStrength for buoyancy
        const upwardSpeed = (Math.random() * 2.5) * explosionStrength;

        // Create the initial velocity vector for the current smoke particle
        const vx = outwardSpeed * Math.cos(angle);
        const vy = upwardSpeed;
        const vz = outwardSpeed * Math.sin(angle);
        velocitySmokeParticles.push(new THREE.Vector3(vx, vy, vz));

        // Set a base grey color
        const greyValue = 0.4 + (Math.random() * 0.1);
        colors[i * 3] = greyValue;
        colors[i * 3 + 1] = greyValue;
        colors[i * 3 + 2] = greyValue;
    }

    // Set the positon and color attributes for the fireball particles
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Create a PointsMaterial using the smoke texture.
    const smokeMaterial = new THREE.PointsMaterial({
        size: explosionStrength * 3.0,  // Make size scale with explosionStrength
        map: smokeTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.NormalBlending
    });

    // Create and add the smoke particle system to the scene
    smokeSystem = new THREE.Points(particles, smokeMaterial);
    scene.add(smokeSystem);
}



// Function changes the debris particles each animation step
function animateDebrisParticles(deltaTime) {
    const tempMatrix = new THREE.Matrix4();
    const position = new THREE.Vector3();

    for (let i = 0; i < velocityDebrisParticles.length; i++) {
        // Get current position
        debrisSystem.getMatrixAt(i, tempMatrix);
        tempMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());

        // Calculate the netForce for the current particle
        let netForce = gravity.clone(); // Add the force due to gravity to net force

        // Add the force from the explosion if the currentExplosionTime is less than the time
        // that the explosion will be applied to each particle
        if(currentExplosionTime < explosiveForceDuration)
        {
            // Get distance and direction unit vector from the origin to the debris particle location
            let distance = position.length();
            let direction = position.clone().normalize();

            // Add the explosion force if not at the center
            if(distance > 0)
            {
                const forceMagnitude = 100.0 * Math.pow(1.5, explosionStrength) * Math.exp(-distance / falloffDistance) / (distance * distance);
                const force = direction.multiplyScalar(forceMagnitude);
                netForce.add(force);
            }
        }

        // Apply change of velocity based on the net force and the deltaTime
        velocityDebrisParticles[i].addScaledVector(netForce, deltaTime);

        // Get current position
        debrisSystem.getMatrixAt(i, tempMatrix);
        tempMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());

        // Update position with velocity
        position.addScaledVector(velocityDebrisParticles[i], deltaTime);

        // Set new transform matrix
        tempMatrix.setPosition(position);
        debrisSystem.setMatrixAt(i, tempMatrix);
    }

    // Update the debris particles
    debrisSystem.instanceMatrix.needsUpdate = true;
}



// Function that changes attributes of the fireball particles every animation step
function animateFireballParticles(deltaTime) {
    //
    const positions = fireballSystem.geometry.attributes.position.array;
    const colors = fireballSystem.geometry.attributes.color.array;
    const decayFactor = Math.max(0, 1 - fireballDecayRate * deltaTime);

    for (let i = 0; i < velocityFireballParticles.length; i++) {
        // Apply velocity decay
        velocityFireballParticles[i].multiplyScalar(decayFactor);

        // Update particle positions
        positions[i * 3]     += velocityFireballParticles[i].x * deltaTime;
        positions[i * 3 + 1] += velocityFireballParticles[i].y * deltaTime;
        positions[i * 3 + 2] += velocityFireballParticles[i].z * deltaTime;
        
        // Update the fireball color
        let t = Math.min(currentExplosionTime / 0.2, 1.0);
        colors[i + 1] = (1 - t) + 0.5 * t;
        colors[i + 2] = (1 - t);
    }

    // Fade out fireball particles over time by reducing opacity
    fireballSystem.material.opacity = Math.exp(-currentExplosionTime * 4.0);

    // Update the position and color for the particles
    fireballSystem.geometry.attributes.position.needsUpdate = true;
    fireballSystem.geometry.attributes.color.needsUpdate = true;
}



// Function that changes attributes of the smoke particles per animation step
function animateSmokeParticles(deltaTime) {
    if (!smokeSystem) return;

    // Get the current positions of each particle and its count
    const positions = smokeSystem.geometry.attributes.position.array;
    const particleCount = velocitySmokeParticles.length;

    for (let i = 0; i < particleCount; i++) {
        // Increase upward motion due to buoyancy
        velocitySmokeParticles[i].y += 0.05 * deltaTime; 

        // Change the current particle position
        positions[i * 3]     += velocitySmokeParticles[i].x * deltaTime;
        positions[i * 3 + 1] += velocitySmokeParticles[i].y * deltaTime;
        positions[i * 3 + 2] += velocitySmokeParticles[i].z * deltaTime;
    }
    
    // Update the smoke particle positions
    smokeSystem.geometry.attributes.position.needsUpdate = true;

    // Gradually fade out the smoke based on a fade rate that could also be tied to explosionStrength
    smokeSystem.material.opacity = Math.max(0, smokeSystem.material.opacity - deltaTime * 0.02);
}



function animate() {
    requestAnimationFrame(animate);

    // Only done if the cube has already been clicked
    if (animateExplosion) {
        // Adjust time
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTimeStamp) / 1000; // Convert to seconds
        lastTimeStamp = currentTime;
        currentExplosionTime += deltaTime;

        // Animate the particle system from this new deltaTime
        animateDebrisParticles(deltaTime);
        animateFireballParticles(deltaTime);
        animateSmokeParticles(deltaTime);
    }

    renderer.render(scene, camera);
}

// Click event for when the cube mesh is clicked
window.addEventListener('click', onMouseClick, false);

// Creates initial scene
if(scene == undefined)
    createInitialScene();

// Animates the particle systems
animate();
