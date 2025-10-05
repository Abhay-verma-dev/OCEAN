// script.js - Cupola + Earth + ISS marker + realistic tiny meteors + satellites + night-toggle (complete)

let scene, camera, renderer, earth, atmosphere, stars, issMarker;
let controls;
let clock = new THREE.Clock();
let isRotating = true;
let isNightMode = false;

/* ---------- NIGHT TEXTURE (change filename here) ---------- */
const NIGHT_TEXTURE_URL = "earth_night.jpg"; // <--- change to your filename if you rename it
let earthNightTexture = null;
let earthNightPending = false;

/* ---------- METEOR PARTICLE SETTINGS (tweakable) ---------- */
const METEOR = {
  enabled: true,
  maxParticles: 1400,
  spawnRatePerSecond: 60,
  spawnRadius: 7.0,
  speedRange: [6, 26],
  lifeRange: [1.2, 3.2],
  pointSize: 1,
  subtleHaloScale: 64,
  avoidEarthFactor: 0.85,
  minDistanceToEarth: 2.2
};

/* ---------- Buffers & Geometry references (set at init) ---------- */
let _ptGeom = null;
let _ptPoints = null;
let _posBuf = null;
let _velBuf = null;
let _lifeBuf = null;
let _colBuf = null;
let _baseColBuf = null;
let _particleCount = 0;
let _spawnIndex = 0;
let _initParticles = false;
let _paused = false;

/* ---------- SATELLITES (added) ---------- */
let satellitesGroup = null;
let satellitesArray = []; // entries: { pivot, mesh, radius, speed }

/* -------------------- helpers -------------------- */
function randRange(a,b){ return a + Math.random()*(b-a); }
function randomUnitVec(){
  const z = Math.random()*2 - 1;
  const t = Math.random()*Math.PI*2;
  const r = Math.sqrt(1 - z*z);
  return new THREE.Vector3(Math.cos(t)*r, Math.sin(t)*r, z);
}

/* -------------------- init particle system -------------------- */
function initParticleMeteors() {
  if (!METEOR.enabled || _initParticles || typeof THREE === 'undefined') return;

  const max = METEOR.maxParticles;
  _particleCount = max;
  _posBuf = new Float32Array(max * 3);
  _velBuf = new Float32Array(max * 3);
  _lifeBuf = new Float32Array(max);
  _colBuf = new Float32Array(max * 3);
  _baseColBuf = new Float32Array(max * 3);

  for (let i=0;i<max;i++){
    _posBuf[3*i] = 1e8; _posBuf[3*i+1] = 1e8; _posBuf[3*i+2] = 1e8;
    _velBuf[3*i] = 0; _velBuf[3*i+1] = 0; _velBuf[3*i+2] = 0;
    _lifeBuf[i] = 0;
    _baseColBuf[3*i] = 1.0; _baseColBuf[3*i+1] = 0.94; _baseColBuf[3*i+2] = 0.86;
    _colBuf[3*i] = _baseColBuf[3*i];
    _colBuf[3*i+1] = _baseColBuf[3*i+1];
    _colBuf[3*i+2] = _baseColBuf[3*i+2];
  }

  const csize = METEOR.subtleHaloScale || 64;
  const can = document.createElement('canvas');
  can.width = can.height = csize;
  const cx = can.getContext('2d');
  const g = cx.createRadialGradient(csize/2, csize/2, 0, csize/2, csize/2, csize/2);
  g.addColorStop(0.00, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.06, 'rgba(255,235,200,0.32)');
  g.addColorStop(0.12, 'rgba(255,200,140,0.12)');
  g.addColorStop(0.26, 'rgba(255,160,100,0.03)');
  g.addColorStop(1.00, 'rgba(0,0,0,0.0)');
  cx.fillStyle = g;
  cx.fillRect(0,0,csize,csize);
  const haloTexture = new THREE.CanvasTexture(can);
  haloTexture.minFilter = THREE.LinearFilter;
  haloTexture.magFilter = THREE.LinearFilter;
  haloTexture.needsUpdate = true;

  _ptGeom = new THREE.BufferGeometry();
  _ptGeom.setAttribute('position', new THREE.BufferAttribute(_posBuf, 3).setUsage(THREE.DynamicDrawUsage));
  _ptGeom.setAttribute('color', new THREE.BufferAttribute(_colBuf, 3).setUsage(THREE.DynamicDrawUsage));

  const mat = new THREE.PointsMaterial({
    size: METEOR.pointSize,
    sizeAttenuation: true,
    map: haloTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  _ptPoints = new THREE.Points(_ptGeom, mat);
  _ptPoints.frustumCulled = false;
  scene.add(_ptPoints);

  _initParticles = true;
}

/* -------------------- spawn one particle (reuses slots) -------------------- */
function _spawnParticle() {
  if (!_initParticles || _paused) return;
  const idx = _spawnIndex % _particleCount;
  _spawnIndex++;

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);

  const uv = randomUnitVec();
  const r = METEOR.spawnRadius * (0.85 + Math.random()*0.3);
  const sx = camPos.x + uv.x * r;
  const sy = camPos.y + uv.y * r;
  const sz = camPos.z + uv.z * r;

  let randVec = randomUnitVec();
  let tangent = new THREE.Vector3().crossVectors(uv, randVec);
  if (tangent.lengthSq() < 1e-6) {
    randVec = randomUnitVec();
    tangent = new THREE.Vector3().crossVectors(uv, randVec);
  }
  tangent.normalize();

  const perp = new THREE.Vector3().crossVectors(tangent, uv).normalize().multiplyScalar((Math.random()-0.5)*0.6);

  const speed = randRange(METEOR.speedRange[0], METEOR.speedRange[1]);
  const vel = tangent.clone().multiplyScalar(speed).add(perp);

  if (earth) {
    const earthPos = new THREE.Vector3();
    earth.getWorldPosition(earthPos);
    const toEarth = earthPos.clone().sub(new THREE.Vector3(sx,sy,sz)).normalize();
    const inward = vel.dot(toEarth);
    if (inward > 0.12) {
      vel.addScaledVector(toEarth, -inward * (METEOR.avoidEarthFactor + Math.random()*0.4));
    }
  }

  const radialBias = uv.clone().multiplyScalar((Math.random()-0.5) * 0.2 * (speed/12));
  vel.add(radialBias);

  const life = randRange(METEOR.lifeRange[0], METEOR.lifeRange[1]);

  const t = Math.random();
  const rcol = 1.0;
  const gcol = 0.94 + (Math.random()*0.06);
  const bcol = 0.86 + (Math.random()*0.09);

  _posBuf[3*idx] = sx;
  _posBuf[3*idx + 1] = sy;
  _posBuf[3*idx + 2] = sz;

  _velBuf[3*idx] = vel.x;
  _velBuf[3*idx + 1] = vel.y;
  _velBuf[3*idx + 2] = vel.z;

  _lifeBuf[idx] = life;

  _baseColBuf[3*idx] = rcol;
  _baseColBuf[3*idx+1] = gcol;
  _baseColBuf[3*idx+2] = bcol;

  _colBuf[3*idx] = rcol;
  _colBuf[3*idx+1] = gcol;
  _colBuf[3*idx+2] = bcol;

  _ptGeom.attributes.position.needsUpdate = true;
  _ptGeom.attributes.color.needsUpdate = true;
}

/* -------------------- update all particles each frame -------------------- */
function _updateParticles(dt) {
  if (!_initParticles) return;
  const max = _particleCount;
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  const earthPos = new THREE.Vector3();
  if (earth) earth.getWorldPosition(earthPos);

  for (let i=0;i<max;i++){
    const life = _lifeBuf[i];
    if (life <= 0) continue;

    const px = _posBuf[3*i] + _velBuf[3*i] * dt;
    const py = _posBuf[3*i+1] + _velBuf[3*i+1] * dt;
    const pz = _posBuf[3*i+2] + _velBuf[3*i+2] * dt;
    _posBuf[3*i] = px; _posBuf[3*i+1] = py; _posBuf[3*i+2] = pz;

    _lifeBuf[i] = life - dt;
    if (_lifeBuf[i] <= 0) {
      _posBuf[3*i] = 1e8; _posBuf[3*i+1] = 1e8; _posBuf[3*i+2] = 1e8;
      _colBuf[3*i] = 0; _colBuf[3*i+1] = 0; _colBuf[3*i+2] = 0;
      continue;
    }

    const lifeFrac = Math.max(0.0, _lifeBuf[i] / METEOR.lifeRange[1]);
    _colBuf[3*i] = _baseColBuf[3*i] * (0.22 + lifeFrac * 0.78);
    _colBuf[3*i+1] = _baseColBuf[3*i+1] * (0.22 + lifeFrac * 0.78);
    _colBuf[3*i+2] = _baseColBuf[3*i+2] * (0.22 + lifeFrac * 0.78);

    if (earth) {
      const dx = px - earthPos.x;
      const dy = py - earthPos.y;
      const dz = pz - earthPos.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < METEOR.minDistanceToEarth) {
        _lifeBuf[i] = 0;
        _posBuf[3*i] = 1e8; _posBuf[3*i+1] = 1e8; _posBuf[3*i+2] = 1e8;
        _colBuf[3*i] = 0; _colBuf[3*i+1] = 0; _colBuf[3*i+2] = 0;
      }
    }
  }

  _ptGeom.attributes.position.needsUpdate = true;
  _ptGeom.attributes.color.needsUpdate = true;
}

/* -------------------- Expose manager for runtime tuning -------------------- */
window._meteorManager = {
  pause() { _paused = true; },
  resume() { _paused = false; clock.getDelta(); },
  setRate(v) { METEOR.spawnRatePerSecond = Number(v); },
  setPointSize(px) { if (_ptPoints) { _ptPoints.material.size = Number(px); } },
  spawnBurst(n) { for (let i=0;i<n;i++) _spawnParticle(); },
  activeCount() {
    let c = 0;
    for (let i=0;i<_particleCount;i++) if (_lifeBuf[i] > 0) c++;
    return c;
  },
  settings: METEOR
};

/* -------------------- NIGHT MAP APPLY/REMOVE HELPERS -------------------- */
function applyNightMap() {
  if (!earth || !earthNightTexture) return;

  earth.traverse((child) => {
    if (child.isMesh && child.material) {
      if (!child.userData._origMaterialState) {
        child.userData._origMaterialState = {
          color: child.material.color.clone(),
          emissive: child.material.emissive.clone(),
          emissiveMap: child.material.emissiveMap || null,
          emissiveIntensity: child.material.emissiveIntensity ?? 1.0
        };
      }

      // Add emissive night map
      child.material.emissiveMap = earthNightTexture;
      child.material.emissive = new THREE.Color(0xffffff);
      child.material.emissiveIntensity = 1.0;

      // Dull the base color visually (but reversible)
      const dullFactor = 0.4; // lower = darker
      const origColor = child.userData._origMaterialState.color;
      child.material.color.setRGB(
        origColor.r * dullFactor,
        origColor.g * dullFactor,
        origColor.b * dullFactor
      );

      child.material.needsUpdate = true;
    }
  });
}



function removeNightMap() {
  if (!earth) return;

  earth.traverse((child) => {
    if (child.isMesh && child.material && child.userData._origMaterialState) {
      const orig = child.userData._origMaterialState;
      child.material.color.copy(orig.color);
      child.material.emissive.copy(orig.emissive);
      child.material.emissiveMap = orig.emissiveMap;
      child.material.emissiveIntensity = orig.emissiveIntensity;

      child.material.needsUpdate = true;
    }
  });
}


/* -------------------- ORIGINAL SCENE SETUP / GLTF LOADING / ANIMATE -------------------- */

function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera inside cupola
    camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.01, 1000);
    camera.position.set(0, 0, 1.5);
    camera.lookAt(0, 0, -5);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById("earthCanvas"),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2);
    sunLight.position.set(5,3,5);
    scene.add(sunLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1);
    backLight.position.set(-5,-3,-5);
    scene.add(backLight);

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for(let i=0; i<8000; i++){
        const x = (Math.random()-0.5)*2000;
        const y = (Math.random()-0.5)*2000;
        const z = (Math.random()-0.5)*2000;
        starVertices.push(x,y,z);
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starVertices,3));
    stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color:0xffffff, size:0.01 }));
    scene.add(stars);

    // GLTF Loader
    const loader = new THREE.GLTFLoader();

    // Load Earth
    loader.load("earth.glb", function(gltf){
        earth = gltf.scene;

        earth.traverse((child)=>{
            if(child.isMesh && child.material){
                child.material.metalness = 0;
                child.material.roughness = 0.5;
                child.material.emissive = new THREE.Color(0x111111);
            }
        });

        earth.scale.set(2,2,2);
        earth.position.set(0,0,-5);
        scene.add(earth);

        // Estimate approximate radius (used as safety reference)
        const bbox = new THREE.Box3().setFromObject(earth);
        const size = bbox.getSize(new THREE.Vector3());
        const approxRadius = Math.max(size.x, size.y, size.z) / 2 || 2.05;
        earth.userData._approxRadius = approxRadius;

        // Initialize the tiny particle meteors AFTER earth exists so safety checks work
        initParticleMeteors();

        // ISS Marker
        const issGeometry = new THREE.SphereGeometry(0.03,16,16);
        const issMaterial = new THREE.MeshBasicMaterial({color:0xff0000});
        issMarker = new THREE.Mesh(issGeometry, issMaterial);
        scene.add(issMarker);

        fetchISSData();
        setInterval(fetchISSData, 5000);

        // --- SATELLITES: load model and create multiple orbital clones ---
        satellitesGroup = new THREE.Group();
        satellitesGroup.name = "satellitesGroup";
        scene.add(satellitesGroup);

        // Load the satellites model and create clones
        loader.load("satellites.glb",
          function(gltfSat){
            const satRoot = gltfSat.scene;

            // Compute model size to scale relative to the Earth
            const satBox = new THREE.Box3().setFromObject(satRoot);
            const satSize = satBox.getSize(new THREE.Vector3());
            const satMaxDim = Math.max(satSize.x, satSize.y, satSize.z) || 1;

            const approxRadius = earth.userData._approxRadius || 2.05;
            const desiredSatelliteSize = approxRadius * 0.06; // tweakable relative size
            const baseScale = desiredSatelliteSize / satMaxDim;

            const SAT_COUNT = 14;
            const colorPalette = [0xffd27f, 0x7fe0ff, 0xff7fb9, 0xc8ff7f, 0xffffff, 0xffa64d];

            const minOrbit = approxRadius + 0.25;
            const maxOrbit = approxRadius + 1.2;

            for (let i = 0; i < SAT_COUNT; i++) {
              const clone = satRoot.clone(true);

              const color = colorPalette[i % colorPalette.length];
              clone.traverse((node) => {
                if (node.isMesh && node.material) {
                  node.material = node.material.clone();
                  if (node.material.color) node.material.color.setHex(color);
                  node.material.roughness = node.material.roughness !== undefined ? node.material.roughness : 0.6;
                  node.material.metalness = node.material.metalness !== undefined ? node.material.metalness : 0.2;
                  node.material.needsUpdate = true;
                }
              });

              const scaleJitter = 1.2 + Math.random() * 0.8;
              clone.scale.setScalar(baseScale * scaleJitter);

              // Create a pivot anchored at Earth's center so rotating the pivot orbits the clone
              const pivot = new THREE.Object3D();
              pivot.position.copy(earth.position); // earth.position is (0,0,-5)
              satellitesGroup.add(pivot);

              // Random orbital radius and inclination
              const radius = randRange(minOrbit, maxOrbit);
              const inclination = randRange(-0.45, 0.45); // radians, approx -25..25 degrees
              const raan = randRange(0, Math.PI*2); // random rotation of orbit plane

              // Place clone at (radius, 0, 0) relative to pivot and then rotate pivot to get inclined orbit
              clone.position.set(radius, 0, 0);

              // Slight per-satellite orientation jitter so not all face same way
              clone.rotation.set(Math.random()*0.4-0.2, Math.random()*0.7-0.35, Math.random()*0.4-0.2);

              pivot.add(clone);

              // apply inclination and RAAN by rotating pivot's local axes
              pivot.rotation.x = inclination;
              pivot.rotation.z = raan;

              // orbital angular speed (radians/sec) - make inner ones slightly faster, plus jitter
              const speed = 0.1 * (1.0 + (maxOrbit - radius) / (maxOrbit - minOrbit + 0.001)) * (0.6 + Math.random()*0.8);

              satellitesArray.push({ pivot, mesh: clone, radius, speed });
            }
          },
          undefined,
          function(err){ console.warn("Satellite GLTF load failed:", err); }
        );

    },
    undefined,
    (err)=> { console.warn("Earth GLTF load failed:", err); }
    );

    // Controls (cupola orbit constraints)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI/3;
    controls.maxPolarAngle = 2*Math.PI/3;
    controls.minAzimuthAngle = -Math.PI/4;
    controls.maxAzimuthAngle = Math.PI/4;

   // Load Cupola (fixed in front of camera)
   loader.load("cupolaagaing.glb", function (gltf) {
    const cupola = gltf.scene;

    const bbox = new THREE.Box3().setFromObject(cupola);
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scaleFactor = 3.0 / maxDim;
    cupola.scale.setScalar(scaleFactor);

    const center = new THREE.Box3().setFromObject(cupola).getCenter(new THREE.Vector3());
    cupola.position.sub(center);

    cupola.position.z = -1.10;
    cupola.position.x += 0.2;

    cupola.renderOrder = 999;

    cupola.traverse((child) => {
      if (child.isMesh && child.material) {
        const matName = (child.material.name || "").toString().toLowerCase();
        if (matName.includes("window") || matName.includes("glass")) {
            child.material.transparent = true;
            child.material.opacity = 0.3;
            child.material.depthTest = true;
        } else {
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.color = new THREE.Color(0x0000ff);
            child.material.depthTest = true;
        }
        child.material.needsUpdate = true;
      }
    });

    // Attach to camera so it never moves relative to view
    camera.add(cupola);
  });

    scene.add(camera);
    window.addEventListener("resize", onWindowResize);
    animate();
}

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(){
    requestAnimationFrame(animate);

    const dt = Math.min(0.06, clock.getDelta());

    // spawn meteor particles
    if (!_paused && _initParticles && METEOR.enabled) {
      const expected = METEOR.spawnRatePerSecond * dt;
      const whole = Math.floor(expected);
      for (let i=0;i<whole;i++) _spawnParticle();
      if (Math.random() < (expected - whole)) _spawnParticle();

      _updateParticles(dt);
    }

    // Earth rotation
    if(isRotating && earth){
        earth.rotation.y += 0.002;
        if(atmosphere) atmosphere.rotation.y += 0.002;
    }

    // Update satellites: rotate each pivot around its local Y axis to orbit
    if (satellitesArray.length > 0) {
      for (let i = 0; i < satellitesArray.length; i++) {
        const s = satellitesArray[i];
        // rotate pivot about its local Y axis
        s.pivot.rotation.y += s.speed * dt;
      }
    }

    controls.update();
    renderer.render(scene,camera);
}

// ISS marker functions
function updateISSMarker(lat, lon){
    if(!issMarker) return;
    const radius = 2.05;
    const phi = (90-lat)*(Math.PI/180);
    const theta = (lon+180)*(Math.PI/180);
    const x = radius*Math.sin(phi)*Math.cos(theta);
    const y = radius*Math.cos(phi);
    const z = radius*Math.sin(phi)*Math.sin(theta) - 5; // match earth.z
    issMarker.position.set(x,y,z);
}

function fetchISSData(){
    // The open-notify API is commonly available over http. If you host over https, consider proxying or using a secure endpoint.
    fetch("http://api.open-notify.org/iss-now.json")
        .then(res=>res.json())
        .then(data=>{
            const lat = parseFloat(data.iss_position.latitude);
            const lon = parseFloat(data.iss_position.longitude);
            updateISSMarker(lat, lon);
        })
        .catch(err=>console.error("ISS API error:", err));
}

// Buttons (ensure those elements exist in DOM)
const rb = document.getElementById("rotateBtn");
if (rb) rb.addEventListener("click",()=>isRotating=!isRotating);

const resetBtn = document.getElementById("resetBtn");
if (resetBtn) resetBtn.addEventListener("click",()=> {
    camera.position.set(0,0,1.5);
    camera.lookAt(0,0,-5);
    controls.reset();
});

// Night button: on-demand load + toggle
const nightBtn = document.getElementById("nightBtn");
if (nightBtn) nightBtn.addEventListener("click",()=>{
    isNightMode = !isNightMode;

    if (isNightMode) {
      // Turn ON: if texture loaded apply now, otherwise load then apply
      if (earthNightTexture) {
        applyNightMap();
      } else if (!earthNightPending) {
        earthNightPending = true;
        const texLoader = new THREE.TextureLoader();
        texLoader.load(
          NIGHT_TEXTURE_URL,
          (tex) => {
            earthNightTexture = tex;
            // optional color-space handling (depends on your three.js setup)
            try { if (THREE && THREE.sRGBEncoding) earthNightTexture.encoding = THREE.sRGBEncoding; } catch(e) {}
            earthNightTexture.needsUpdate = true;
            earthNightPending = false;
            // apply only if still in night mode
            if (isNightMode) applyNightMap();
          },
          undefined,
          (err) => {
            console.error("Failed loading night texture:", err);
            earthNightPending = false;
          }
        );
      }
    } else {
      // Turn OFF
      removeNightMap();
    }
});

// Simple night-mode fallback (if user toggles before earth loads)
// If earth is not ready, applyNightMap/removeNightMap will no-op until earth exists.

window.addEventListener("load", init);
