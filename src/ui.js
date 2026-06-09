export function initUI() {
  const sidebarButtons = document.querySelectorAll('.sidebar-menu button');
  const contentArea = document.getElementById('content-area');
  const closeContentBtn = document.getElementById('close-content');
  const componentRoot = document.getElementById('component-root');
  const sidebar = document.getElementById('sidebar');
  const openSidebarBtn = document.getElementById('open-sidebar-btn');
  const closeSidebarBtn = document.getElementById('close-sidebar-btn');

  const componentsData = {
    'cultural-diversity': `
      <div class="component-content">
        <h2>01 Cultural Diversity</h2>
        <p>This is a test component loaded dynamically when you click the lateral navigation bar.</p>
        <div class="dummy-card">Some content related to Cultural Diversity.</div>
      </div>
    `,
    'roots-faces': `
      <div class="component-content">
        <h2>02 Roots & Faces</h2>
        <p>This is a test component loaded dynamically when you click the lateral navigation bar.</p>
        <div class="dummy-card">Some content related to Roots & Faces.</div>
      </div>
    `,
    'muisca-raft': `
      <div class="component-content">
        <h2>03 Muisca Raft</h2>
        <p>This is a test component loaded dynamically when you click the lateral navigation bar.</p>
        <div class="dummy-card">
          <p><strong>What is it?</strong> This is a gold ceremonial raft.</p>
          <p><strong>Where is it from?</strong> It is from the Muisca territory in Colombia.</p>
        </div>
      </div>
    `
  };

  sidebarButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evita que el clic se propague al canvas
      
      const target = btn.getAttribute('data-target');
      if (componentsData[target]) {
        componentRoot.innerHTML = componentsData[target];
        contentArea.classList.remove('hidden');
      }
    });
  });

  closeContentBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    contentArea.classList.add('hidden');
  });

  // Sidebar toggle logic
  if (openSidebarBtn && closeSidebarBtn && sidebar) {
    const joystickZone = document.getElementById('joystick-zone');
    const centerBtn = document.getElementById('center-camera-btn');
    
    openSidebarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.remove('hidden-sidebar');
      openSidebarBtn.style.display = 'none'; // hide the open button
      if (joystickZone) joystickZone.style.display = 'none'; // Hide joystick
      if (centerBtn) centerBtn.style.display = 'none'; // Hide center button
    });

    closeSidebarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.add('hidden-sidebar');
      openSidebarBtn.style.display = 'block'; // show the open button
      if (joystickZone) joystickZone.style.display = ''; // Restore joystick
      if (centerBtn) centerBtn.style.display = ''; // Restore center button
    });

    // Optionally start with open button hidden since sidebar is open by default
    openSidebarBtn.style.display = 'none';
    
    // Check initial state: if sidebar is open, hide joystick
    if (joystickZone && !sidebar.classList.contains('hidden-sidebar')) {
      joystickZone.style.display = 'none';
      if (centerBtn) centerBtn.style.display = 'none';
    }
  }

  // Set initial global progress
  updateGlobalProgress();
}

const completedQuizzes = new Set();

export function updateGlobalProgress() {
  const text = document.getElementById('global-progress-text');
  const fill = document.getElementById('global-progress-bar-fill');
  const totalQuizzes = Object.keys(objectData).length;
  if (!text || !fill) return;

  const count = completedQuizzes.size;
  text.textContent = `Progreso: ${count} / ${totalQuizzes} completados`;
  fill.style.width = `${(count / totalQuizzes) * 100}%`;
}

const objectData = {
  'balsa-muisca': {
    museum: 'MUSEO DEL ORO',
    title: 'Muisca Raft',
    info: [
      { q: '1. What is it?', a: 'This is a gold ceremonial raft.' },
      { q: '2. Where is it from?', a: 'It is from the Muisca territory in Colombia.' },
      { q: '3. What is it made of?', a: 'It is made of gold and copper alloy.' },
      { q: '4. Who created it?', a: 'It was created by Muisca goldsmiths.' },
      { q: '5. Why is it important?', a: 'It is important because it shows a sacred ceremony connected to leadership, water, and community memory.<br>It was used for ritual storytelling and ceremonial knowledge.<br>People used it to preserve and share cultural knowledge.<br>It represents ancestral power, gold work, and the legend of El Dorado.' }
    ],
    quizTitle: 'Muisca Raft trivia',
    quiz: [
      { q: 'What is the Muisca Raft made of?', opts: ['Gold and copper alloy', 'Wood and cotton', 'Stone and clay'] },
      { q: 'Who created the object?', opts: ['Muisca goldsmiths', 'Modern painters', 'Spanish architects'] },
      { q: 'What does it represent?', opts: ['Ancestral power and El Dorado', 'A modern city', 'A cooking tradition'] }
    ]
  },
  'mano-botero': {
    museum: 'MUSEO BOTERO',
    title: 'Botero Hand',
    info: [
      { q: '1. What is it?', a: 'This is a bronze sculpture.' },
      { q: '2. Where is it from?', a: 'It is from Colombia.' },
      { q: '3. What is it made of?', a: 'It is made of bronze.' },
      { q: '4. Who created it?', a: 'It was created by Fernando Botero.' },
      { q: '5. Why is it important?', a: "It is important because it helps visitors recognize volume, shape, and Botero's way of seeing everyday bodies.<br>It was used for learning about Colombian modern art.<br>People used it to preserve and share cultural knowledge.<br>It represents volume, humor, and Colombian artistic identity." }
    ],
    quizTitle: 'Botero Hand trivia',
    quiz: [
      { q: 'Who created this sculpture?', opts: ['Fernando Botero', 'A Muisca goldsmith', 'Simon Bolivar'] },
      { q: 'What is it made of?', opts: ['Bronze', 'Gold', 'Feathers'] },
      { q: 'Why is it important?', opts: ['It shows volume and shape', 'It was used for cooking', 'It is a musical instrument'] }
    ]
  },
  'espada-simon': {
    museum: 'MUSEO NACIONAL',
    title: 'Bolivar Sword',
    info: [
      { q: '1. What is it?', a: 'This is a historical sword.' },
      { q: '2. Where is it from?', a: 'It is from Colombian independence history.' },
      { q: '3. What is it made of?', a: 'It is made of metal and decorated handle materials.' },
      { q: '4. Who created it?', a: 'It was created by nineteenth-century artisans.' },
      { q: '5. Why is it important?', a: 'It is important because it connects visitors with independence, political memory, and national history.<br>It was used for symbolic military and historical remembrance.<br>People used it to preserve and share cultural knowledge.<br>It represents the struggle for independence and collective memory.' }
    ],
    quizTitle: 'Bolivar Sword trivia',
    quiz: [
      { q: 'Where is the sword from?', opts: ['Colombian independence history', 'The Amazon rainforest', 'A modern sports event'] },
      { q: 'What does it represent?', opts: ['The struggle for independence', 'Abstract graffiti', 'A food recipe'] },
      { q: 'Why is it important?', opts: ['It connects visitors with national history', 'It is made of paper', 'It was created by Botero'] }
    ]
  },
  'urna': {
    museum: 'MUSEO ARQUEOLOGICO',
    title: 'Ceramic Funerary Urn',
    info: [
      { q: '1. What is it?', a: 'This is a ceramic urn.' },
      { q: '2. Where is it from?', a: 'It is from pre-Columbian communities in Colombia.' },
      { q: '3. What is it made of?', a: 'It is made of clay.' },
      { q: '4. Who created it?', a: 'It was created by Indigenous ceramic makers.' },
      { q: '5. Why is it important?', a: 'It is important because it shows how communities honored life, death, ancestors, and spiritual beliefs.<br>It was used for funeral ceremonies and cultural memory.<br>People used it to preserve and share cultural knowledge.<br>It represents ancestral care, ritual practices, and community beliefs.' }
    ],
    quizTitle: 'Ceramic Funerary Urn trivia',
    quiz: [
      { q: 'What is this object?', opts: ['A ceramic urn', 'A bronze hand', 'A gold raft'] },
      { q: 'What was it used for?', opts: ['Funeral ceremonies', 'Playing football', 'Buying books'] },
      { q: 'Who created it?', opts: ['Indigenous ceramic makers', 'Fernando Botero', 'Modern engineers'] }
    ]
  },
  'mural-moderno': {
    museum: 'MUSEO DE ARTE MODERNO',
    title: 'Modern Abstract Mural',
    info: [
      { q: '1. What is it?', a: 'This is a contemporary artwork.' },
      { q: '2. Where is it from?', a: 'It is from urban Colombia.' },
      { q: '3. What is it made of?', a: 'It is made of paint, canvas, and mixed media.' },
      { q: '4. Who created it?', a: 'It was created by a Colombian modern artist.' },
      { q: '5. Why is it important?', a: 'It is important because it invites visitors to read color, movement, and social ideas from the present.<br>It was used for expressing contemporary feelings and questions.<br>People used it to preserve and share cultural knowledge.<br>It represents urban creativity, change, and modern Colombian voices.' }
    ],
    quizTitle: 'Modern Abstract Mural trivia',
    quiz: [
      { q: 'Where is it from?', opts: ['Urban Colombia', 'Ancient Egypt', 'The moon'] },
      { q: 'What does it invite visitors to read?', opts: ['Color, movement, and social ideas', 'Only numbers', 'A cooking menu'] },
      { q: 'What does it represent?', opts: ['Urban creativity and modern voices', 'A funerary ceremony', 'A gold ritual raft'] }
    ]
  }
};

export function showObjectUI(objectId) {
  const container = document.getElementById('object-ui-container');
  const data = objectData[objectId];
  
  if (data) {
    const infoCardsHTML = data.info.map(item => `
      <div class="info-card">
        <h3>${item.q}</h3>
        <p>${item.a}</p>
      </div>
    `).join('');

    const quizCardsHTML = data.quiz.map((item, index) => {
      const optionsHTML = item.opts.map((opt, optIndex) => `
        <label class="radio-option" data-question="${index}" data-option="${optIndex}">
          <input type="radio" name="q${index}" value="${optIndex}"> ${opt}
        </label>
      `).join('');
      return `
        <div class="quiz-card" id="quiz-card-${index}">
          <h3>${item.q}</h3>
          ${optionsHTML}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="trivia-modal">
        <button class="close-trivia-btn" id="close-object-ui">✕ Cerrar</button>
        <div class="trivia-layout">
          <div class="trivia-left">
            <div class="trivia-header">
              <span class="museum-name">${data.museum}</span>
              <h1 class="artifact-title">${data.title}</h1>
            </div>
            <div class="info-cards-scroll">
              ${infoCardsHTML}
            </div>
            <button class="action-btn dark-btn">Go to reading trivia</button>
          </div>
          <div class="trivia-right">
            <div class="trivia-right-header">
              <span class="activity-label">PRACTICE ACTIVITY: READING</span>
              <h2 class="activity-title">${data.quizTitle}</h2>
              <span class="ready-badge" id="quiz-ready-badge">Ready</span>
            </div>
            <div class="quiz-cards-scroll">
              ${quizCardsHTML}
            </div>
            <div class="quiz-actions">
              <button class="action-btn dark-btn" id="check-answers-btn">Check answers</button>
              <button class="action-btn light-btn" id="reset-answers-btn">↺ Reset</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="trivia-modal">
        <button class="close-trivia-btn" id="close-object-ui">✕ Cerrar</button>
        <div class="generic-object-info">
          <h2>Objeto Interactivo</h2>
          <p>Has hecho clic en un objeto sin datos: <strong>${objectId}</strong></p>
        </div>
      </div>
    `;
  }
  
  container.classList.remove('hidden');
  
  const joystickZone = document.getElementById('joystick-zone');
  const centerBtn = document.getElementById('center-camera-btn');
  if (joystickZone) {
    joystickZone.style.display = 'none';
  }
  if (centerBtn) {
    centerBtn.style.display = 'none';
  }
  
  document.getElementById('close-object-ui').addEventListener('click', (e) => {
    e.stopPropagation();
    window.dispatchEvent(new Event('closeObjectUI'));
  });
  
  const checkAnswersBtn = document.getElementById('check-answers-btn');
  const resetAnswersBtn = document.getElementById('reset-answers-btn');
  const readyBadge = document.getElementById('quiz-ready-badge');

  if (checkAnswersBtn) {
    checkAnswersBtn.addEventListener('click', () => {
      let correctCount = 0;
      data.quiz.forEach((item, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (selected) {
          const optIndex = parseInt(selected.value, 10);
          if (optIndex === 0) { // Option 0 is always the correct answer based on the data
            correctCount++;
            selected.closest('.radio-option').classList.add('correct');
          }
        }
      });
      if (readyBadge) {
        readyBadge.textContent = `${correctCount}/${data.quiz.length}`;
      }

      // Update global progress if the user got all answers right
      if (correctCount === data.quiz.length) {
        if (!completedQuizzes.has(objectId)) {
          completedQuizzes.add(objectId);
          updateGlobalProgress();
        }
      }
    });
  }

  if (resetAnswersBtn) {
    resetAnswersBtn.addEventListener('click', () => {
      document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
      document.querySelectorAll('.radio-option').forEach(label => label.classList.remove('correct'));
      if (readyBadge) {
        readyBadge.textContent = 'Ready';
      }
    });
  }
  
  container.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
}

export function hideObjectUI() {
  const container = document.getElementById('object-ui-container');
  container.classList.add('hidden');
  container.innerHTML = '';
  
  const joystickZone = document.getElementById('joystick-zone');
  const centerBtn = document.getElementById('center-camera-btn');
  const sidebar = document.getElementById('sidebar');
  if (joystickZone) {
    if (sidebar && !sidebar.classList.contains('hidden-sidebar')) {
      joystickZone.style.display = 'none';
      if (centerBtn) centerBtn.style.display = 'none';
    } else {
      joystickZone.style.display = '';
      if (centerBtn) centerBtn.style.display = '';
    }
  }
}
