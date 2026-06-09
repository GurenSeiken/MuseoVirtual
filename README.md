# 3D Web Museo - Experiencia Interactiva

## Descripción del Proyecto
Este proyecto es una experiencia interactiva de un museo en 3D ejecutable en el navegador. Permite a los usuarios navegar por una sala de exhibición virtual, visualizar modelos 3D de artefactos históricos (como la Balsa Muisca, la Espada de Bolívar, etc.) e interactuar con ellos para aprender más a través de tarjetas de información y cuestionarios (trivias).

## Tecnologías Utilizadas
* **[Three.js](https://threejs.org/)**: Motor 3D principal para renderizar la escena, luces, materiales y modelos.
* **[Cannon-es](https://pmndrs.github.io/cannon-es/)**: Motor de físicas para detectar colisiones básicas con el suelo, paredes y pedestales.
* **[Vite](https://vitejs.dev/)**: Herramienta de empaquetado y servidor de desarrollo ultrarrápido.
* **HTML/CSS/JavaScript Vanilla**: Para estructurar e implementar toda la interfaz de usuario superpuesta al lienzo 3D.
* **Nipple.js** *(Opcional / Integrado en dependencias)*: Para el manejo de joysticks en dispositivos móviles.

## Estructura del Proyecto

```text
TestWebMuseo/
├── index.html          # Punto de entrada, estructura la interfaz UI (sidebar, modales).
├── package.json        # Dependencias y scripts del proyecto.
├── public/             # Archivos estáticos públicos (ej. íconos, modelos 3D en public/models).
│   └── models/         # Modelos 3D en formato .fbx (Balsa, Espada, Mano, Urna).
└── src/
    ├── main.js         # Lógica central 3D: Escena, cámara, controles, físicas, iluminación y carga de modelos.
    ├── ui.js           # Lógica de la interfaz de usuario 2D: Sidebar, Modales de información y sistema de trivia.
    └── style.css       # Estilos visuales para la interfaz (diseño responsivo, modo oscuro de UI).
```

## Características Principales
1. **Navegación Multiplataforma**: 
   - **PC**: Controles en primera persona (WASD + Ratón) usando `PointerLockControls`.
   - **Móvil**: Controles táctiles con un joystick en pantalla para el movimiento y desplazamiento libre para mirar (Touch Look).
2. **Interacción con Objetos**: Al apuntar y hacer clic (o tocar) un objeto exhibido, este se resalta usando un efecto visual de contorno (`OutlinePass`), y despliega una interfaz con trivia y detalles sobre la pieza.
3. **Físicas y Colisiones**: Emplea `cannon-es` para evitar que el usuario atraviese paredes, el suelo o los pedestales de exhibición.
4. **Gráficos Avanzados**: Implementa sombras suaves, luces de foco para enfocar las piezas y post-procesamiento (Glow/Bloom) para un ambiente hiperrealista.

---

## Instalación y Ejecución Local

1. Asegúrate de tener **Node.js** instalado en tu computadora.
2. Abre una terminal en la ruta raíz del proyecto.
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre el navegador en la dirección que te indique la consola (usualmente `http://localhost:5173/`).

---

## 🚀 Guía de Integración y Extensibilidad

Este proyecto está diseñado de forma modular para que sea fácil agregar nuevas piezas, nuevas secciones de UI o integrarlo en otros sitios web.

### 1. ¿Cómo agregar un nuevo modelo 3D?
Para exhibir un nuevo artefacto en el museo, sigue estos pasos:

**Paso A: Guardar el modelo**
Coloca el archivo `.fbx` de tu modelo en la carpeta `public/models/`. Ej: `public/models/MiNuevoObjeto.fbx`.

**Paso B: Configurar la exhibición en `src/main.js`**
Ubica la sección `--- 6. PEDESTALS & DISPLAY CASES ---` y añade un nuevo pedestal/vitrina:
```javascript
const miNuevoDisplay = createDisplay(x, z, width, height, depth, true); // true si lleva cristal
createSpotLight(x, 5, z, x, height, z, 100); // Iluminación para tu objeto
```
Luego, ve a la sección `--- 7. LOAD MODELS ---` e invoca la carga de tu modelo asginando un **ID único**:
```javascript
loadModel('/models/MiNuevoObjeto.fbx', new THREE.Vector3(x, miNuevoDisplay.pedestalTop, z), 0.01, 'mi-nuevo-objeto');
```

**Paso C: Agregar su información en `src/ui.js`**
Abre `src/ui.js`, ubica el objeto `objectData` y añade tu nuevo ID (`'mi-nuevo-objeto'`):
```javascript
'mi-nuevo-objeto': {
  museum: 'NOMBRE DEL MUSEO',
  title: 'Título de la Pieza',
  info: [
    { q: 'Pregunta 1', a: 'Respuesta de información.' },
    //...
  ],
  quizTitle: 'Trivia del Objeto',
  quiz: [
    { q: 'Pregunta Trivia', opts: ['Respuesta Correcta', 'Mala 1', 'Mala 2'] } 
    // Nota: La primera opción (índice 0) en el arreglo 'opts' siempre se evalúa como la respuesta correcta.
  ]
}
```

### 2. ¿Cómo embeber el museo en otra aplicación web (Integración Externa)?
Si deseas poner este museo dentro de una plataforma ya existente (como React, Angular, Wordpress o un sitio HTML estático), la forma más segura y menos conflictiva de hacerlo es mediante un **IFrame**. Esto se debe a que el motor 3D se ejecuta a pantalla completa y utiliza APIs nativas como el secuestro del puntero (`PointerLock`).

1. Haz el *build* de este proyecto para producción:
   ```bash
   npm run build
   ```
2. Aloja el contenido de la carpeta `dist/` resultante en un servidor web de archivos estáticos (Vercel, Netlify, GitHub Pages, Amazon S3, etc.).
3. Inserta el Iframe en tu aplicación principal o HTML:
   ```html
   <div style="width: 100%; height: 800px;">
     <iframe 
       src="https://tu-dominio-del-museo.com" 
       width="100%" 
       height="100%" 
       frameborder="0" 
       allow="fullscreen; pointer-lock"
     ></iframe>
   </div>
   ```
   > **Nota Importante:** Asegúrate de incluir el atributo `allow="fullscreen; pointer-lock"` en el iframe. Es indispensable para que los controles de la cámara 3D (cuando das clic para moverte en PC) funcionen sin restricciones de seguridad por parte del navegador.

### 3. Adaptar como componente (Integración Avanzada React / Vue / Angular)
Si necesitas que el museo se comunique bidireccionalmente y en tiempo real con una app externa (por ejemplo, guardar el puntaje de la trivia en una base de datos de tu aplicación principal o manejar sesiones de usuarios):

- **Encapsular el Contexto 3D:** Modifica `src/main.js` para no ejecutarse de inmediato en el `window`. Deberás envolver la lógica en una función principal `export function initMuseum(containerElement)` pasándole el nodo HTML donde se inyectará.
- **Evitar Dimensiones Globales:** Reemplaza el uso de la ventana `window.innerWidth` y `window.innerHeight` por el ancho y alto del `containerElement` padre proporcionado.
- **Gestión de la Interfaz (UI):** La interfaz (`ui.js` y el HTML inyectado en `index.html`) tendría que ser migrada a los componentes de tu framework (como componentes de React).
- **Comunicación de Eventos:** Para comunicar los resultados del museo hacia afuera, puedes despachar eventos personalizados (`CustomEvent`) desde `main.js` o `ui.js` cuando ocurran acciones clave (ej: `window.dispatchEvent(new CustomEvent('museo:triviaCompletada', { detail: { score: 3 } }))`) y escucharlos desde el framework anfitrión.
