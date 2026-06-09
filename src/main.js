import './style.css';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import * as CANNON from 'cannon-es';
import nipplejs from 'nipplejs';
import { initUI, showObjectUI, hideObjectUI } from './ui.js';
// --- 1. SET UP SCENE ---
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a2a2a');
// Fog desactivado - no necesario en interior de museo

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
// Position the camera like a person walking into the room
const startPosition = new THREE.Vector3(0, 1.7, 10);
camera.position.copy(startPosition); 

const renderer = new THREE.WebGLRenderer({ antialias: !isTouchDevice }); // Desactivar antialiasing en móvil (ahorro GPU)
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Resolución nativa del dispositivo, tope 2x

renderer.shadowMap.enabled = !isTouchDevice;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3; // Aumentado ligeramente para mayor claridad
document.body.appendChild(renderer.domElement);

// Setup realistic PBR environment for reflections (Crucial for GLB materials)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.25; // Reflejos PBR moderados

const controls = new PointerLockControls(camera, document.body);

// Instructions or click to lock pointer
const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
overlay.style.display = 'flex';
overlay.style.justifyContent = 'center';
overlay.style.alignItems = 'center';
overlay.style.flexDirection = 'column';
overlay.style.color = 'white';
overlay.style.fontFamily = 'sans-serif';
overlay.style.fontSize = '24px';
overlay.style.textAlign = 'center';
overlay.style.cursor = 'pointer';
overlay.style.zIndex = '100';
overlay.innerHTML = 'Haz clic o toca para explorar<br><span style="font-size:16px; margin-top:10px; display:block;">(WASD/Joystick para mover, Ratón/Dedo para mirar, C para centrar)</span>';
document.body.appendChild(overlay);

// Center camera function
function centerCamera() {
  // Use YXZ order to correctly extract yaw and pitch without introducing roll
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  euler.setFromQuaternion(camera.quaternion);
  
  euler.x = 0; // Reset pitch to look straight ahead
  euler.z = 0; // Force roll to 0 to prevent sideways tilt
  
  camera.quaternion.setFromEuler(euler);
}

const centerCameraBtn = document.getElementById('center-camera-btn');
centerCameraBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  centerCamera();
});
centerCameraBtn.addEventListener('touchstart', (e) => {
  e.stopPropagation();
  centerCamera();
}, { passive: true });

export let isPlaying = false;

let lastInputType = 'mouse';
document.addEventListener('pointerdown', (e) => { 
  lastInputType = e.pointerType; // 'mouse', 'touch', or 'pen'
}, { passive: true });
document.addEventListener('pointermove', (e) => { 
  if (e.pointerType === 'mouse') lastInputType = 'mouse'; 
}, { passive: true });

overlay.addEventListener('click', () => {
  // Always hide overlay and start playing
  overlay.style.display = 'none';
  isPlaying = true;
  
  // Try to lock pointer (will succeed on PC, fails gracefully on mobile)
  try {
    controls.lock();
  } catch (err) {
    console.warn("Pointer lock failed (expected on some mobile devices):", err);
  }
});

controls.addEventListener('lock', () => {
  overlay.style.display = 'none';
  isPlaying = true;
});

controls.addEventListener('unlock', () => {
  if (lastInputType === 'touch') return; // Ignore unlock events on touch devices
  
  isPlaying = false;
  // Only show the overlay if we are not currently displaying an object UI
  if (!document.getElementById('object-ui-container').classList.contains('active-ui')) {
    overlay.style.display = 'flex';
  }
});

if (isTouchDevice) {
  const joystickZone = document.getElementById('joystick-zone');
  joystickZone.classList.remove('hidden');
  document.getElementById('center-camera-btn').classList.remove('hidden');
  
  console.log('[JOYSTICK] Zone visible:', joystickZone.offsetWidth, 'x', joystickZone.offsetHeight);
  console.log('[JOYSTICK] Zone position:', joystickZone.getBoundingClientRect());
  
  joystickZone.innerHTML = '';
  const base = document.createElement('div');
  base.style.cssText = 'position:absolute; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,0.1); top:25px; left:25px; pointer-events:none; border:2px solid rgba(255,255,255,0.3);';
  const stick = document.createElement('div');
  stick.style.cssText = 'position:absolute; width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,0.5); top:30px; left:30px; pointer-events:none; transition: transform 0.1s;';
  base.appendChild(stick);
  joystickZone.appendChild(base);

  let activeTouchId = null;
  let stickCenter = { x: 0, y: 0 };
  
  function updateJoystick(e) {
    if (activeTouchId === null) return;
    let touch;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (!touch) return;
    
    // Calculate vector from center
    let dx = touch.clientX - stickCenter.x;
    let dy = touch.clientY - stickCenter.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    const maxDist = 60; // half of base width
    
    // Normalize and cap
    let force = distance / maxDist;
    if (force > 1) {
      dx = (dx / distance) * maxDist;
      dy = (dy / distance) * maxDist;
      force = 1;
    }
    
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    stick.style.transition = 'none';
    
    // Map to moveDirection
    // DX: positive = right. DY: positive = down.
    // In our WASD, positive Z is forward.
    // So if you push UP (negative DY), we want positive Z!
    moveDirection.x = dx / maxDist;
    moveDirection.z = -(dy / maxDist);
  }
  
  joystickZone.addEventListener('touchstart', (e) => {
    //e.preventDefault(); // Stop scrolling/other gestures
    if (activeTouchId !== null) return; // already active
    
    const touch = e.changedTouches[0];
    activeTouchId = touch.identifier;
    
    const rect = base.getBoundingClientRect();
    stickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    updateJoystick(e);
  }, { passive: false });
  
  joystickZone.addEventListener('touchmove', (e) => {
    if (activeTouchId === null) return;
    //e.preventDefault();
    updateJoystick(e);
  }, { passive: false });
  
  const endJoystick = (e) => {
    if (activeTouchId === null) return;
    let ended = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        ended = true;
        break;
      }
    }
    if (ended) {
      activeTouchId = null;
      stick.style.transform = `translate(0px, 0px)`;
      stick.style.transition = 'transform 0.2s';
      moveDirection.x = 0;
      moveDirection.z = 0;
    }
  };
  
  joystickZone.addEventListener('touchend', endJoystick);
  joystickZone.addEventListener('touchcancel', endJoystick);

  // Touch Look and Tap to Interact
  let isMobileLookActive = false;
  let previousTouchX = 0;
  let previousTouchY = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  const touchEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  let lookTouchIdentifier = null;

  document.addEventListener('touchstart', (e) => {
    // Skip look-handling for touches on the joystick, nipple elements, sidebar, or object UI
    const target = e.target;
    if (target.closest('#joystick-zone') || target.closest('.nipple') || target.closest('#object-ui-container') || target.closest('#sidebar') || target.closest('#ui-container')) return;
    
    // Find a touch that is not on the UI to use for looking
    let lookTouch = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.target.id !== 'joystick-zone' && !t.target.closest('#joystick-zone') && !t.target.closest('.nipple')) {
        lookTouch = t;
        break;
      }
    }

    if (lookTouch && !isMobileLookActive) {
      isMobileLookActive = true;
      lookTouchIdentifier = lookTouch.identifier;
      touchEuler.setFromQuaternion(camera.quaternion);
      previousTouchX = touchStartX = lookTouch.pageX;
      previousTouchY = touchStartY = lookTouch.pageY;
      touchStartTime = Date.now();
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!isMobileLookActive) return;
    
    let lookTouch = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdentifier) {
        lookTouch = e.changedTouches[i];
        break;
      }
    }

    if (lookTouch) {
      e.preventDefault(); 
      const touchX = lookTouch.pageX;
      const touchY = lookTouch.pageY;
      const movementX = touchX - previousTouchX;
      const movementY = touchY - previousTouchY;
      
      const lookSpeed = 0.005;
      touchEuler.y -= movementX * lookSpeed;
      touchEuler.x -= movementY * lookSpeed;
      
      const PI_2 = Math.PI / 2;
      touchEuler.x = Math.max(-PI_2, Math.min(PI_2, touchEuler.x));
      
      camera.quaternion.setFromEuler(touchEuler);
      previousTouchX = touchX;
      previousTouchY = touchY;
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (isMobileLookActive) {
      let lookTouchEnded = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchIdentifier) {
          lookTouchEnded = true;
          break;
        }
      }

      if (lookTouchEnded) {
        const touchDuration = Date.now() - touchStartTime;
        const moveDist = Math.abs(previousTouchX - touchStartX) + Math.abs(previousTouchY - touchStartY);
        
        if (touchDuration < 300 && moveDist < 10) {
          // Tap detected!
          const tapNDC = new THREE.Vector2();
          tapNDC.x = (touchStartX / window.innerWidth) * 2 - 1;
          tapNDC.y = -(touchStartY / window.innerHeight) * 2 + 1;
          
          const touchRaycaster = new THREE.Raycaster();
          touchRaycaster.setFromCamera(tapNDC, camera);
          const intersects = touchRaycaster.intersectObjects(interactableObjects, true);

          if (intersects.length > 0) {
            let targetObj = intersects[0].object;
            while (targetObj.parent && !interactableObjects.includes(targetObj)) {
              if (targetObj.parent.type === 'Scene') break;
              targetObj = targetObj.parent;
            }
            const objectId = targetObj.userData.id;
            if (objectId) {
              document.getElementById('object-ui-container').classList.add('active-ui');
              showObjectUI(objectId);
              if (isTouchDevice) isPlaying = false;
            }
          }
        }
        isMobileLookActive = false;
        lookTouchIdentifier = null;
      }
    }
  });
}

const moveState = { forward: false, backward: false, left: false, right: false };
const moveDirection = new THREE.Vector3();

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': case 'ArrowUp': moveState.forward = true; break;
    case 'KeyS': case 'ArrowDown': moveState.backward = true; break;
    case 'KeyA': case 'ArrowLeft': moveState.left = true; break;
    case 'KeyD': case 'ArrowRight': moveState.right = true; break;
    case 'KeyC': centerCamera(); break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': case 'ArrowUp': moveState.forward = false; break;
    case 'KeyS': case 'ArrowDown': moveState.backward = false; break;
    case 'KeyA': case 'ArrowLeft': moveState.left = false; break;
    case 'KeyD': case 'ArrowRight': moveState.right = false; break;
  }
});

// --- 2. PHYSICS WORLD ---
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); 
world.broadphase = new CANNON.SAPBroadphase(world);

// Materials for physics
const physicsMaterial = new CANNON.Material('standard');
const contactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
  friction: 0.0,
  restitution: 0.0,
});
world.addContactMaterial(contactMaterial);

// --- 3. PLAYER PHYSICS BODY ---
const cameraBody = new CANNON.Body({
  mass: 60,
  shape: new CANNON.Sphere(0.3),
  position: new CANNON.Vec3(startPosition.x, startPosition.y, startPosition.z),
  material: physicsMaterial,
  fixedRotation: true
});
cameraBody.linearDamping = 0.9;
world.addBody(cameraBody);

// --- 4. BUILD THE ROOM ---
// Floor physics only (so the player doesn't fall endlessly)
const floorBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: physicsMaterial });
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(floorBody);

// --- 5. LIGHTING ---
// Luz ambiental global suave
const ambientLight = new THREE.AmbientLight('#e8e0d8', isTouchDevice ? 1.0 : 0.7);
scene.add(ambientLight);

// Luz de hemisferio suave: techo claro arriba + rebote cálido del piso
const hemiLight = new THREE.HemisphereLight('#d8d4d0', '#a09080', isTouchDevice ? 0.8 : 0.5);
hemiLight.position.set(0, 10, 0);
scene.add(hemiLight);

// Luz de fill por cuarto (PointLights son muy pesadas en celular, las omitimos)
if (!isTouchDevice) {
  // Sala 1: centrada en z ~ 0 (Techo en z=0)
  const roomFill1 = new THREE.PointLight('#f0e8e0', 3.0, 15);
  roomFill1.position.set(0, 3.0, 0);
  roomFill1.decay = 2;
  scene.add(roomFill1);

  // Sala 2: centrada en z ~ 10 (Techo.001 en z=10.38)
  const roomFill2 = new THREE.PointLight('#f0e8e0', 3.0, 15);
  roomFill2.position.set(0, 3.0, 10);
  roomFill2.decay = 2;
  scene.add(roomFill2);
}

// Cargar las luces SpotLight exportadas desde Blender (Luces.glb)
// En móvil las omitimos completamente: cada SpotLight con sombras cuesta mucho rendimiento
if (!isTouchDevice) {
  const SPOT_INTENSITY_SCALE = 0.001;
  const lightsLoader = new GLTFLoader();
  lightsLoader.load(
    './models/Luces.glb',
    (gltf) => {
      const lightsScene = gltf.scene;
      const toRemove = [];
      
      lightsScene.traverse((child) => {
        if (child.isLight) {
          if (child.isDirectionalLight) {
            toRemove.push(child);
            console.log(`[LUCES] SKIP ${child.type}: "${child.name}" (eliminada)`);
            return;
          }
          if (child.isSpotLight) {
            child.intensity *= SPOT_INTENSITY_SCALE;
            child.castShadow = true;
            child.decay = 2;
            if (child.shadow) {
              child.shadow.mapSize.width = 1024;
              child.shadow.mapSize.height = 1024;
              child.shadow.bias = -0.003;
              child.shadow.camera.near = 0.2;
              child.shadow.camera.far = 15;
            }
          }
          console.log(`[LUCES] ${child.type}: "${child.name}" intensity=${child.intensity.toFixed(1)} pos=(${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`);
        }
      });
      toRemove.forEach(light => light.parent?.remove(light));
      scene.add(lightsScene);
      console.log('[LUCES] Luces de Blender cargadas exitosamente');
    },
    undefined,
    (error) => { console.error('Error loading Luces.glb:', error); }
  );
}


// --- 6. & 7. LOAD MUSEUM MODELS ---
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  console.log(`Loading file: ${url}. Loaded ${itemsLoaded} of ${itemsTotal} files.`);
  // Si deseas una barra de progreso en el DOM, aquí podrías actualizarla
};
loadingManager.onLoad = () => {
  console.log('All museum models loaded successfully!');
};

const gltfLoader = new GLTFLoader(loadingManager);
const rgbeLoader = new RGBELoader(loadingManager);

// Lista de los nombres base de los archivos HDR en public/models/lightmap/
const validLightmaps = [
  "Balsa", "Blade", "Caps", "Circle.001", "Cube.002", "Glass.001", "Glass", "Ground", 
  "Long.bench.001", "Long.bench", "ManoBotero", "Mesa.002", "Mesa", "Metal", "Paredes", 
  "Plane.001", "Plane.015", "Table.001", "Techo.001", "Techo", "Urna", "frame-v4-2.019", 
  "scabbard", "scratch.protection"
];

const mainEnvironment = 'Escenario.glb';
const secondaryModelsToLoad = [
  'Balsa.glb',
  'Espada.glb',
  'GlassTable1.glb',
  'Mano.glb',
  'Pintura.glb',
  'Sillas.glb',
  'Urna.glb'
];

function processModel(model) {
  // 1. Enable shadows for everything in the museum, fix emissives, and apply Lightmaps
  model.traverse((child) => {
    if (child.isMesh) {
      const baseName = child.name.replace(/ /g, '.').replace(/_/g, '.');
      const hasBakedLightmap = validLightmaps.includes(baseName);
      
      // Si el objeto tiene luz horneada (Lightmap), apagar las sombras dinámicas
      if (hasBakedLightmap) {
        child.castShadow = false;
        child.receiveShadow = false;
      } else {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      
      // Controlar materiales emisivos para que no sobreexpongan la escena
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          // Ajustar la intensidad emisiva
          if (mat.emissiveIntensity !== undefined && mat.emissiveIntensity > 0) {
            const isTecho = child.name.toLowerCase().includes('techo') || 
                            (mat.name && mat.name.toLowerCase().includes('techo'));
            if (isTecho) {
              mat.emissiveIntensity = 1.2; // Aumentar potencia para el techo
            } else if (mat.emissiveIntensity > 0.2) {
              mat.emissiveIntensity = 0.2; // Mantener suave para otros objetos
            }
          }

          // Arreglar problemas de transparencia accidental (ej. paredes translúcidas o normales volteadas)
          const cName = child.name.toLowerCase();
          const mName = mat.name ? mat.name.toLowerCase() : '';
          const isGlass = cName.includes('glass') || mName.includes('glass') ||
                          cName.includes('vidrio') || mName.includes('vidrio') ||
                          cName.includes('cristal') || mName.includes('cristal') ||
                          cName.includes('urna') || mName.includes('urna');
          
          if (!isGlass) {
            mat.transparent = false;
            mat.depthWrite = true;
            mat.depthTest = true;
            mat.opacity = 1.0;
            // Si el cuarto tiene las normales invertidas (mirando hacia afuera), se verá transparente desde adentro.
            // DoubleSide obliga a que se renderice por ambos lados, solucionando ese bug de modelado.
            mat.side = THREE.DoubleSide; 
            mat.needsUpdate = true;
          }
        });
      }



      // --- COLISIONES ---
      const nameLower = child.name.toLowerCase();
      
      let isParedes = false;
      let current = child;
      while (current) {
        if (current.name.toLowerCase().includes('paredes')) {
          isParedes = true;
          break;
        }
        current = current.parent;
      }

      // Excluir elementos que no necesitan colisiones (como luces, planos invisibles o techos)
      // Si el objeto es parte de 'Paredes', no lo excluimos aunque su mesh se llame 'Plane'
      const isPlane = nameLower.includes('plane') && !isParedes;
      
      if (!nameLower.includes('luz') && !nameLower.includes('light') && !isPlane && !nameLower.includes('techo') && !nameLower.includes('scratch.protection')) {
        child.updateWorldMatrix(true, false);
        const clonedGeometry = child.geometry.clone();
        clonedGeometry.applyMatrix4(child.matrixWorld);
        
        let vertices = clonedGeometry.attributes.position.array;
        let indices;
        if (clonedGeometry.index) {
          indices = Array.from(clonedGeometry.index.array);
        } else {
          indices = [];
          for (let i = 0; i < vertices.length / 3; i++) {
            indices.push(i);
          }
        }

        // Duplicar índices con orden invertido para que el Trimesh físico sea de doble cara.
        // Esto arregla el problema de colisión si las normales de las paredes apuntan hacia afuera.
        const doubleIndices = [];
        for (let i = 0; i < indices.length; i += 3) {
          doubleIndices.push(indices[i], indices[i+1], indices[i+2]); // Cara original
          doubleIndices.push(indices[i], indices[i+2], indices[i+1]); // Cara invertida
        }
        indices = doubleIndices;
        
        // Paredes usan Trimesh para respetar huecos de puertas y geometría exacta
        const needsTrimesh = isParedes;
        
        if (isTouchDevice && !needsTrimesh) {
          // Simplificar colisiones en celular: usar cajas (bounding boxes) en vez de trimesh poligonal
          child.geometry.computeBoundingBox();
          const box = child.geometry.boundingBox;
          const size = new THREE.Vector3();
          box.getSize(size);
          
          // Evitar crear cajas degeneradas (tamaño 0 en algún eje)
          if (size.x > 0.01 && size.y > 0.01 && size.z > 0.01) {
            const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
            const boxShape = new CANNON.Box(halfExtents);
            const center = new THREE.Vector3();
            box.getCenter(center);
            center.applyMatrix4(child.matrixWorld);
            
            const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: boxShape, material: physicsMaterial });
            body.position.set(center.x, center.y, center.z);
            
            // Apply rotation from world matrix to quaternion
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            child.matrixWorld.decompose(position, quaternion, scale);
            body.quaternion.copy(quaternion);
            
            world.addBody(body);
          }
        } else {
          try {
            // Convert typed arrays to plain arrays for reliable cannon-es Trimesh support
            const vertArray = Array.from(vertices);
            const idxArray = Array.from(indices);
            const trimesh = new CANNON.Trimesh(vertArray, idxArray);
            const body = new CANNON.Body({
              mass: 0,
              type: CANNON.Body.STATIC,
              shape: trimesh,
              material: physicsMaterial
            });
            // Ensure AABB is computed for SAPBroadphase (thin walls may have near-zero AABB extent)
            trimesh.updateAABB();
            body.updateAABB();
            world.addBody(body);
            console.log('[PHYSICS] Trimesh creado para:', child.name, 'verts:', vertArray.length / 3, 'tris:', idxArray.length / 3);
          } catch (err) {
            console.warn('[PHYSICS] Trimesh falló para:', child.name, '- usando bounding box como fallback');
            // Fallback a bounding box si trimesh falla
            child.geometry.computeBoundingBox();
            const box = child.geometry.boundingBox;
            const size = new THREE.Vector3();
            box.getSize(size);
            if (size.x > 0.01 && size.y > 0.01 && size.z > 0.01) {
              const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
              const boxShape = new CANNON.Box(halfExtents);
              const center = new THREE.Vector3();
              box.getCenter(center);
              center.applyMatrix4(child.matrixWorld);
              const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: boxShape, material: physicsMaterial });
              body.position.set(center.x, center.y, center.z);
              const position = new THREE.Vector3();
              const quaternion = new THREE.Quaternion();
              const scale = new THREE.Vector3();
              child.matrixWorld.decompose(position, quaternion, scale);
              body.quaternion.copy(quaternion);
              world.addBody(body);
            }
          }
        }
      }

      // --- APLICAR LIGHTMAPS HORNEADOS ---
      // Lightmaps requieren un segundo canal UV (uv2). Si no existe, copiamos el uv1.
      if (child.geometry && child.geometry.attributes.uv && !child.geometry.attributes.uv2) {
        child.geometry.setAttribute('uv2', child.geometry.attributes.uv);
      }

      // Normalizar nombre del mesh (Blender exporta espacios/guiones bajos a veces diferente)
      // ya declarado arriba: const baseName = child.name.replace(/ /g, '.').replace(/_/g, '.');
      
      if (!isTouchDevice && validLightmaps.includes(baseName)) {
        rgbeLoader.load(`./models/lightmap/${baseName}_baked.hdr`, (texture) => {
          texture.flipY = false; // Las texturas bakeadas de Blender suelen requerir esto en false para GLB
          
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            mat.lightMap = texture;
            mat.lightMapIntensity = 1.0; // Puedes subir esto si quieres que las zonas de luz destaquen más
            mat.needsUpdate = true;
          });
          console.log(`[LIGHTMAP] Aplicado a ${child.name}`);
        });
      }
    }
  });

  // 2. Identify interactable objects and add them to the outline list
  const identifyInteractable = (node) => {
    const name = node.name.toLowerCase();
    let assigned = false;
    
    if (name.includes('balsa')) {
      node.userData.id = 'balsa-muisca';
      interactableObjects.push(node);
      assigned = true;
    } else if (name.includes('espada') || name.includes('sword') || name.includes('blade') || name.includes('scabbard')) {
      node.userData.id = 'espada-simon';
      interactableObjects.push(node);
      assigned = true;
    } else if (name.includes('mano') || name.includes('hand') || name.includes('botero')) {
      node.userData.id = 'mano-botero';
      interactableObjects.push(node);
      assigned = true;
    } else if (name.includes('urna') || name.includes('urn')) {
      node.userData.id = 'urna';
      interactableObjects.push(node);
      assigned = true;
    } else if (name.includes('frame')) {
      node.userData.id = 'mural-moderno';
      interactableObjects.push(node);
      assigned = true;
    }
    
    // If this node wasn't an interactable, keep searching its children
    if (!assigned) {
      node.children.forEach(identifyInteractable);
    }
  };
  
  identifyInteractable(model);

  scene.add(model);
}

// 1. Cargar el escenario principal primero
gltfLoader.load(
  `./models/${mainEnvironment}`,
  (gltf) => {
    const model = gltf.scene;
    processModel(model);
    console.log('[LOADER] Escenario principal cargado. Iniciando carga de props secundarios...');
    
    // 2. Cargar los demás props una vez que el escenario ya está en escena
    secondaryModelsToLoad.forEach((filename) => {
      gltfLoader.load(
        `./models/${filename}`,
        (gltfProp) => {
          processModel(gltfProp.scene);
        },
        undefined,
        (error) => { console.error(`Error loading ${filename}:`, error); }
      );
    });
  },
  undefined,
  (error) => { console.error(`Error loading ${mainEnvironment}:`, error); }
);


// --- 8. POST-PROCESSING ---
let composer, outlinePass, ssaoPass;

if (!isTouchDevice) {
  const renderScene = new RenderPass(scene, camera);
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);

  // SSAO (Screen Space Ambient Occlusion) DESACTIVADO para mejorar FPS drásticamente
  // ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
  // ssaoPass.kernelRadius = 4;
  // ssaoPass.minDistance = 0.005;
  // ssaoPass.maxDistance = 0.05;
  // composer.addPass(ssaoPass);

  outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
  outlinePass.edgeStrength = 6;
  outlinePass.edgeGlow = 1.0;
  outlinePass.edgeThickness = 4.0;
  outlinePass.pulsePeriod = 2; // Pulsing effect
  outlinePass.visibleEdgeColor.set('#00ff00');
  outlinePass.hiddenEdgeColor.set('#555555');
  composer.addPass(outlinePass);

  // IMPORTANTE: OutputPass es necesario en Three.js modernos para que el ToneMapping (ACESFilmic) se aplique correctamente con EffectComposer
  const outputPass = new OutputPass();
  composer.addPass(outputPass);
} else {
  // Dummy OutlinePass para no romper el código de PC
  outlinePass = { selectedObjects: [] };
}

const raycaster = new THREE.Raycaster();
const centerVector = new THREE.Vector2(0, 0);
const interactableObjects = [];

// --- 9. RESIZE & ANIMATE ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (!isTouchDevice) {
    composer.setSize(window.innerWidth, window.innerHeight);
    if (ssaoPass) ssaoPass.setSize(window.innerWidth, window.innerHeight);
    outlinePass.setSize(window.innerWidth, window.innerHeight);
  }
});

const clock = new THREE.Clock();
let oldElapsedTime = 0;

function animate() {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  if (isPlaying) {
    // Combine WASD and Joystick inputs
    let zMove = Number(moveState.forward) - Number(moveState.backward);
    let xMove = Number(moveState.right) - Number(moveState.left);
    
    // Normalize keyboard input if diagonal to prevent faster movement
    if (zMove !== 0 && xMove !== 0) {
      const length = Math.sqrt(zMove * zMove + xMove * xMove);
      zMove /= length;
      xMove /= length;
    }
    
    // Add joystick input (already scaled by force)
    xMove += moveDirection.x;
    zMove += moveDirection.z;
    const speed = 5.0; // Movement speed
    
    // Obtener direcciones adelante y derecha relativas a la cámara
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const moveVelocity = new THREE.Vector3();
    if (zMove !== 0) {
      moveVelocity.addScaledVector(forward, zMove * speed);
    }
    if (xMove !== 0) {
      moveVelocity.addScaledVector(right, xMove * speed);
    }
    
    // Set desired velocity BEFORE the physics step so collision resolution can act on it
    cameraBody.velocity.x = moveVelocity.x;
    cameraBody.velocity.z = moveVelocity.z;
    
    // Lock the Y position so we don't fly when looking up/down, or fall endlessly
    cameraBody.position.y = startPosition.y;
    cameraBody.velocity.y = 0;

    // Update debug panel with actual movement values
    if (window._dbg) {
      window._dbg.actualXMove = xMove;
      window._dbg.actualZMove = zMove;
    }
  }

  // Physics step AFTER setting velocity — cannon-es resolves collisions against the desired movement
  world.step(1 / 60, deltaTime, 3);

  if (isPlaying) {
    // Lock Y again after physics step (gravity may have changed it)
    cameraBody.position.y = startPosition.y;
    cameraBody.velocity.y = 0;

    // Sync camera to body AFTER physics resolved collisions
    camera.position.x = cameraBody.position.x;
    camera.position.y = cameraBody.position.y;
    camera.position.z = cameraBody.position.z;

    // Raycast from center of screen for highlighting (works for both PC and Mobile crosshair)
    raycaster.setFromCamera(centerVector, camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);

    if (intersects.length > 0) {
      let targetObj = intersects[0].object;
      while (targetObj.parent && !interactableObjects.includes(targetObj)) {
        if (targetObj.parent.type === 'Scene') break;
        targetObj = targetObj.parent;
      }
      outlinePass.selectedObjects = [targetObj];
      document.getElementById('crosshair').style.borderColor = 'lime';
    } else {
      outlinePass.selectedObjects = [];
      document.getElementById('crosshair').style.borderColor = 'white';
    }
  } else {
    outlinePass.selectedObjects = [];
  }

  if (isTouchDevice) {
    renderer.render(scene, camera);
  } else {
    composer.render();
  }

  window.requestAnimationFrame(animate);
}

// Add click listener for objects
document.addEventListener('mousedown', (event) => {
  // Skip if touch event (handled separately) or clicking on UI elements
  if (event.pointerType === 'touch') return;
  if (event.target.closest('#object-ui-container') || event.target.closest('#ui-container') || event.target.closest('#sidebar')) return;
  
  if (!isPlaying) return;

  // Method 1: If pointer is locked and we have a highlighted object from crosshair raycasting
  if (controls.isLocked && outlinePass.selectedObjects.length > 0) {
    const selectedObject = outlinePass.selectedObjects[0];
    const objectId = selectedObject.userData.id;
    
    if (objectId) {
      overlay.style.display = 'none';
      document.getElementById('object-ui-container').classList.add('active-ui');
      controls.unlock();
      showObjectUI(objectId);
    }
    return;
  }
  
  // Method 2: If pointer is NOT locked (e.g. mobile or non-lock browsers), 
  // cast a ray from the click position
  if (!controls.isLocked) {
    const clickNDC = new THREE.Vector2();
    clickNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const clickRaycaster = new THREE.Raycaster();
    clickRaycaster.setFromCamera(clickNDC, camera);
    const intersects = clickRaycaster.intersectObjects(interactableObjects, true);
    
    if (intersects.length > 0) {
      let targetObj = intersects[0].object;
      while (targetObj.parent && !interactableObjects.includes(targetObj)) {
        if (targetObj.parent.type === 'Scene') break;
        targetObj = targetObj.parent;
      }
      const objectId = targetObj.userData.id;
      if (objectId) {
        overlay.style.display = 'none';
        document.getElementById('object-ui-container').classList.add('active-ui');
        showObjectUI(objectId);
        if (isTouchDevice) isPlaying = false;
      }
    }
  }
});

// Close UI hook (called from ui.js)
window.addEventListener('closeObjectUI', () => {
  document.getElementById('object-ui-container').classList.remove('active-ui');
  hideObjectUI();
  if (lastInputType === 'touch') {
    isPlaying = true; // Mobile resumes immediately
  } else {
    overlay.style.display = 'flex'; // Show the overlay to resume
    isPlaying = false; // PC needs to click again to lock
  }
});

initUI();
animate();
