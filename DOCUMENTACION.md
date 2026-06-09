# 🏛️ Resumen de Implementación: 3D Web Museo

¡Hemos logrado construir una experiencia 3D de museo increíble y altamente interactiva! A continuación, se documenta todo el trabajo realizado en las distintas áreas del proyecto y se proporcionan instrucciones claras para que puedas integrarlo en cualquier lugar.

---

## 🛠️ ¿Qué hicimos? (Funcionalidades Implementadas)

### 1. 🚶‍♂️ Físicas y Colisiones (Caminar sin atravesar paredes)
Integramos **Cannon-es** para dotar a la cámara de un cuerpo físico real (`cameraBody`).
- **Paredes y Modelos Complejos**: Implementamos `Trimesh` de doble cara para la geometría de las paredes. Esto resolvió el problema en el que la cámara atravesaba las paredes si las normales estaban invertidas, además de corregir un error de exclusión de mallas que impedía la generación de colisiones en la estructura principal del escenario.
- **Movimiento Basado en Velocidad**: Cambiamos la lógica para que las teclas (WASD) y el Joystick no muevan la cámara directamente, sino que apliquen una *velocidad* al cuerpo físico, permitiendo que el motor de físicas resuelva los choques antes de mover la vista.

### 2. 📱 Optimización Profunda para Dispositivos Móviles
Nos aseguramos de que el museo no queme la batería ni trabe los celulares:
- **Colisiones Simplificadas**: En celulares, reemplazamos el pesado `Trimesh` de las paredes por cajas delimitadoras (`BoundingBox`), lo que aumenta enormemente los FPS.
- **Gráficos Adaptativos**: En pantallas táctiles desactivamos las sombras complejas (`shadowMap`), desactivamos el `OutlinePass` (que consume mucho GPU) y limitamos el `PixelRatio`.
- **Interacción Táctil Inteligente**: Aumentamos la tolerancia al arrastre en los toques de pantalla para no perder la interacción al temblar el dedo. Además, el sistema da prioridad absoluta al objeto apuntado por la **mira central**, permitiendo abrirlo tocando en cualquier parte de la pantalla, pero conservando el toque directo como opción secundaria.
- **UI Responsiva**: Mejoramos los espaciados (padding) y aplicamos flex-column en el componente de las tarjetas de información para evitar la superposición entre el título de las obras y el botón de "Cerrar" en pantallas angostas.
- **Controles Táctiles Nativos**: Implementamos un **Joystick** virtual en la zona inferior izquierda para caminar, y habilitamos **Touch Look** (arrastrar el dedo en cualquier parte libre de la pantalla) para mirar libremente.

### 3. 🔦 Iluminación Realista y Post-Procesamiento
- **Corrección de Emisivos**: Limitamos la intensidad del brillo de los materiales para que los techos brillen con fuerza (1.2), pero los demás objetos no sobreexpongan la escena.
- **Efectos Avanzados**: Añadimos un `OutputPass` con mapeo de tonos `ACESFilmic` para que los colores se vean cinematográficos. (Nota: Se eliminó el `SSAOPass` para maximizar los FPS).
- **Lightmaps y Sombras Inteligentes**: Implementamos un sistema que carga texturas `HDR` bakeadas y las asigna como mapas de luz. Para optimizar el rendimiento de la tarjeta gráfica, **desactivamos las sombras dinámicas** para todos los objetos que ya cuentan con iluminación pre-horneada.

### 4. 🖱️ Interacción con Objetos y Estilo Visual
- **Outline Verde Resplandeciente**: Ajustamos el `OutlinePass` para que, al pasar el ratón o mirar un objeto interactivo (Balsa, Espada, Mano, Urna, Mural), este se resalte con un **borde verde neón brillante** y un pulso constante.
- **Corrección de IDs**: Solucionamos el bug donde la "Espada" mostraba la información de la "Mano", separando correctamente el `userData.id` de cada objeto interactuable en el ciclo de carga.

### 5. 🎯 Controles de Centrado de Cámara
Añadimos un botón en la interfaz y un atajo de teclado (**Tecla C**) que reinicia la inclinación (Pitch) de la cámara. Esto es muy útil, especialmente en celulares, si el usuario termina mirando accidentalmente al techo o al suelo y se pierde.

---

## 🚀 Instrucciones de Integración

Este museo está diseñado para ser modular. Aquí tienes las instrucciones para integrarlo en otras plataformas.

### Opción A: Embeber mediante IFrame (La más rápida y segura)
Si tienes un sitio en WordPress, HTML estático o cualquier plataforma, lo mejor es compilar este proyecto y cargarlo en un Iframe.

1. **Compila el proyecto**:
   Abre tu terminal en la carpeta del museo y ejecuta:
   ```bash
   npm run build
   ```
2. **Sube la carpeta `dist`**: Aloja el contenido en un servidor como Vercel, Netlify o AWS S3.
3. **Pega el código en tu sitio web**:
   Usa este fragmento HTML. Es **CRÍTICO** que incluyas `allow="fullscreen; pointer-lock"` para que los controles de PC (esconder el cursor al hacer clic) funcionen.

```html
<div style="width: 100%; height: 600px; position: relative;">
  <iframe 
    src="https://tu-dominio-donde-subiste-el-museo.com" 
    width="100%" 
    height="100%" 
    frameborder="0" 
    allow="fullscreen; pointer-lock"
    style="border: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
  ></iframe>
</div>
```

### Opción B: Integración como Componente en React / Angular / Vue
Si necesitas que la trivia del museo se comunique con la base de datos de tu aplicación principal:

1. Modifica `src/main.js` para que no inicialice todo automáticamente en el `window`. Envuelve la lógica principal:
   ```javascript
   export function initMuseum(containerElement) {
       // ... toda la inicialización de Three.js aquí
       renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
       containerElement.appendChild(renderer.domElement);
   }
   ```
2. Escucha eventos desde tu Framework. En `src/ui.js`, cuando el usuario termine una trivia, lanza un evento global:
   ```javascript
   window.dispatchEvent(new CustomEvent('museo:triviaCompletada', { 
       detail: { objeto: 'balsa-muisca', puntos: 3 } 
   }));
   ```
3. En tu componente React, escucha el evento:
   ```jsx
   useEffect(() => {
       const handleTrivia = (e) => console.log("Puntaje:", e.detail.puntos);
       window.addEventListener('museo:triviaCompletada', handleTrivia);
       return () => window.removeEventListener('museo:triviaCompletada', handleTrivia);
   }, []);
   ```

### 🧩 ¿Cómo agregar una nueva pieza al museo en el futuro?

1. Agrega tu archivo `.fbx` o `.glb` en `public/models/`.
2. En `src/main.js`, dentro de la función `identifyInteractable`, agrega la regla para reconocer tu modelo:
   ```javascript
   } else if (name.includes('tu-nuevo-objeto')) {
       node.userData.id = 'id-del-nuevo-objeto';
       interactableObjects.push(node);
       assigned = true;
   }
   ```
3. En `src/ui.js`, agrega la información en `objectData`:
   ```javascript
   'id-del-nuevo-objeto': {
       title: 'Título de la Pieza',
       museum: 'Nombre del Museo',
       info: [{ q: '¿Qué es?', a: 'Es una pieza increíble...' }],
       quizTitle: 'Trivia Rápida',
       quiz: [{ q: 'Pregunta', opts: ['Correcta', 'Mala 1'] }]
   }
   ```

> [!TIP]
> **Consejo de Rendimiento:** Si agregas muchos objetos nuevos, procura que los modelos estén optimizados usando draco compression o reduciendo la cantidad de polígonos en Blender para mantener los FPS altos en celulares.
