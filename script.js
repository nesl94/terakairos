const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.primary-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  nav.classList.toggle('open', !isOpen);
});

nav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menuToggle?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  });
});

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 })
  : null;

document.querySelectorAll('.reveal').forEach(el => {
  if (observer) observer.observe(el);
  else el.classList.add('is-visible');
});

// Accessible image carousels. They advance every 5 seconds and pause on interaction.
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-carousel]').forEach((carousel, carouselIndex) => {
  const slides = [...carousel.querySelectorAll('.carousel-slide')];
  const prev = carousel.querySelector('.carousel-prev');
  const next = carousel.querySelector('.carousel-next');
  const dotsWrap = carousel.querySelector('.carousel-dots');
  if (!slides.length) return;

  let index = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let timer = null;
  const interval = Number(carousel.dataset.interval || 5000);

  const dots = slides.map((slide, i) => {
    slide.setAttribute('aria-hidden', String(i !== index));
    if (!dotsWrap) return null;
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `carousel-dot${i === index ? ' is-active' : ''}`;
    dot.setAttribute('aria-label', `Show image ${i + 1} of ${slides.length}`);
    dot.setAttribute('aria-current', i === index ? 'true' : 'false');
    dot.addEventListener('click', () => show(i, true));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function show(nextIndex, restart = false) {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      dots[i]?.classList.toggle('is-active', active);
      dots[i]?.setAttribute('aria-current', active ? 'true' : 'false');
    });
    if (restart) start();
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  function start() {
    stop();
    if (!reduceMotion && slides.length > 1) {
      timer = window.setInterval(() => show(index + 1), interval);
    }
  }

  prev?.addEventListener('click', () => show(index - 1, true));
  next?.addEventListener('click', () => show(index + 1, true));
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', event => {
    if (!carousel.contains(event.relatedTarget)) start();
  });

  if (slides.length < 2) {
    prev?.setAttribute('hidden', '');
    next?.setAttribute('hidden', '');
    if (dotsWrap) dotsWrap.hidden = true;
  }

  carousel.dataset.carouselReady = String(carouselIndex + 1);
  show(index);
  start();
});

const levelDescriptions = {
  A1: 'Everyday phrases, introducing yourself, simple questions.',
  A2: 'Short conversations about daily life, work, and family.',
  B1: 'Handling most situations while travelling or at work. Often required for visas and some jobs.',
  B2: 'Fluent, detailed communication. Often required for university admission and skilled work.',
  C1: 'Confident, natural German for studies and professional life.',
  C2: 'Near-native understanding and expression.'
};

const quickQuizQuestions = [
  { q: 'Choose the correct article: ___ Universität', options: ['der', 'die', 'das'], answer: 'die', explanation: 'Correct — “Universität” is feminine: die Universität.' },
  { q: 'Complete the sentence: Ich ___ aus Kenia.', options: ['komme', 'kommt', 'kommen'], answer: 'komme', explanation: 'Correct — with “ich”, kommen becomes “komme”.' },
  { q: 'Which phrase means “Good morning”?', options: ['Guten Morgen', 'Gute Nacht', 'Bis später'], answer: 'Guten Morgen', explanation: 'Correct — “Guten Morgen” means “Good morning”.' },
  { q: 'Complete the plural: ein Buch → zwei ___', options: ['Bücher', 'Buchen', 'Buchs'], answer: 'Bücher', explanation: 'Correct — the plural of “Buch” is “Bücher”.' },
  { q: 'Complete: Morgen ___ ich Deutsch.', options: ['lerne', 'lernen', 'lernt'], answer: 'lerne', explanation: 'Correct — “Morgen lerne ich Deutsch.”' },
  { q: 'Which sentence is the most polite?', options: ['Ich möchte einen Kaffee, bitte.', 'Gib Kaffee.', 'Kaffee jetzt.'], answer: 'Ich möchte einen Kaffee, bitte.', explanation: 'Correct — “Ich möchte …, bitte” is a polite request.' },
  { q: 'Complete: Heute ___ ich in Wien.', options: ['wohne', 'wohnen', 'wohnt'], answer: 'wohne', explanation: 'Correct — “Heute wohne ich in Wien.”' },
  { q: 'Which sentence means “I don’t understand”?', options: ['Ich verstehe nicht.', 'Ich weiß nicht.', 'Ich komme nicht.'], answer: 'Ich verstehe nicht.', explanation: 'Correct — “Ich verstehe nicht” means “I don’t understand”.' }
];

const levelQuizzes = {
  A1: [
    { q: 'Complete: Ich ___ Maria.', options: ['heiße', 'heißt', 'heißen'], answer: 'heiße', explanation: '“Ich heiße Maria.”' },
    { q: 'Choose the correct article: ___ Apfel', options: ['der', 'die', 'das'], answer: 'der', explanation: 'It is “der Apfel”.' }
  ],
  A2: [
    { q: 'Complete: Gestern ___ ich im Kino.', options: ['war', 'bin', 'sei'], answer: 'war', explanation: 'The simple past of “sein” with ich is “war”.' },
    { q: 'Complete: Kannst du mir ___?', options: ['helfen', 'hilfst', 'geholfen'], answer: 'helfen', explanation: 'After the modal verb “kannst”, use the infinitive: “helfen”.' }
  ],
  B1: [
    { q: 'Complete: Ich bleibe zu Hause, weil ich krank ___.', options: ['bin', 'ist', 'sei'], answer: 'bin', explanation: 'In the subordinate clause: “weil ich krank bin”.' },
    { q: 'Complete: Ich weiß, dass er morgen ___.', options: ['kommt', 'er kommt', 'kommen'], answer: 'kommt', explanation: 'With “dass”, the conjugated verb goes to the end: “dass er morgen kommt”.' }
  ],
  B2: [
    { q: 'Complete: Wenn ich mehr Zeit hätte, ___ ich öfter reisen.', options: ['würde', 'will', 'wurde'], answer: 'würde', explanation: 'Konjunktiv II: “würde ich öfter reisen”.' },
    { q: 'Complete: Obwohl es regnete, ___ wir spazieren.', options: ['gingen', 'gegangen', 'geht'], answer: 'gingen', explanation: 'The correct past-tense form is “gingen”.' }
  ],
  C1: [
    { q: 'Choose the best connector: Die Entscheidung wurde getroffen, ___ alle Beteiligten angehört worden waren.', options: ['nachdem', 'während', 'ob'], answer: 'nachdem', explanation: '“Nachdem” correctly marks the earlier completed action.' },
    { q: 'Complete: Er verfügt über die Fähigkeit, komplexe Zusammenhänge präzise ___.', options: ['darzustellen', 'dargestellt', 'darstellt'], answer: 'darzustellen', explanation: 'The infinitive construction requires “darzustellen”.' }
  ],
  C2: [
    { q: 'What does “etwas auf die lange Bank schieben” mean?', options: ['etwas hinauszögern', 'etwas sofort erledigen', 'etwas laut erklären'], answer: 'etwas hinauszögern', explanation: 'The idiom means to postpone or delay something.' },
    { q: 'Choose the most precise verb: Die These lässt sich durch die Daten ___.', options: ['untermauern', 'machen', 'reden'], answer: 'untermauern', explanation: '“Eine These untermauern” means to substantiate a claim with evidence.' }
  ]
};

const quickQuestionEl = document.getElementById('quiz-word');
const quickOptionsEl = document.getElementById('quick-quiz-options');
const quickFeedbackEl = document.getElementById('quiz-feedback');
const quickProgressEl = document.getElementById('quiz-progress');
const quickNextEl = document.getElementById('quick-quiz-next');
let quickQuizIndex = 0;

function renderOptions(container, options, answer, feedback, explanation) {
  if (!container) return;
  container.innerHTML = '';
  options.forEach(option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option;
    button.addEventListener('click', () => {
      const correct = option === answer;
      [...container.querySelectorAll('button')].forEach(btn => {
        btn.disabled = true;
        btn.classList.toggle('is-correct', btn.textContent === answer);
      });
      button.classList.toggle('is-wrong', !correct);
      if (feedback) feedback.textContent = correct ? explanation : `Not quite. ${explanation}`;
    });
    container.appendChild(button);
  });
}

function renderQuickQuiz() {
  const item = quickQuizQuestions[quickQuizIndex];
  if (!item) return;
  if (quickQuestionEl) quickQuestionEl.textContent = item.q;
  if (quickProgressEl) quickProgressEl.textContent = `${quickQuizIndex + 1} / ${quickQuizQuestions.length}`;
  if (quickFeedbackEl) quickFeedbackEl.textContent = '';
  renderOptions(quickOptionsEl, item.options, item.answer, quickFeedbackEl, item.explanation);
}

quickNextEl?.addEventListener('click', () => {
  quickQuizIndex = (quickQuizIndex + 1) % quickQuizQuestions.length;
  renderQuickQuiz();
});
renderQuickQuiz();

const levelDescription = document.getElementById('level-description');
const levelQuizLabel = document.getElementById('level-quiz-label');
const levelQuizQuestion = document.getElementById('level-quiz-question');
const levelQuizOptions = document.getElementById('level-quiz-options');
const levelQuizFeedback = document.getElementById('level-quiz-feedback');
const levelQuizNext = document.getElementById('level-quiz-next');
let activeLevel = 'A1';
let levelQuizIndex = 0;

function renderLevelQuiz() {
  const questions = levelQuizzes[activeLevel] || [];
  const item = questions[levelQuizIndex % questions.length];
  if (!item) return;
  if (levelQuizLabel) levelQuizLabel.textContent = `${activeLevel} mini quiz`;
  if (levelQuizQuestion) levelQuizQuestion.textContent = item.q;
  if (levelQuizFeedback) levelQuizFeedback.textContent = '';
  if (levelQuizNext) levelQuizNext.textContent = `Another ${activeLevel} question ↻`;
  renderOptions(levelQuizOptions, item.options, item.answer, levelQuizFeedback, item.explanation);
}

document.querySelectorAll('.level-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.level-item').forEach(btn => btn.classList.remove('active'));
    item.classList.add('active');
    activeLevel = item.dataset.level;
    levelQuizIndex = 0;
    if (levelDescription) levelDescription.textContent = levelDescriptions[activeLevel];
    renderLevelQuiz();
  });
});

levelQuizNext?.addEventListener('click', () => {
  const questions = levelQuizzes[activeLevel] || [];
  if (!questions.length) return;
  levelQuizIndex = (levelQuizIndex + 1) % questions.length;
  renderLevelQuiz();
});
renderLevelQuiz();

const destinationData = {
  austria: {
    title: 'Austria',
    copy: 'Great choice. Tell us a little about yourself and we’ll help turn your dream of studying in Austria into reality.',
    service: 'Study - Austria'
  },
  germany: {
    title: 'Germany',
    copy: 'Great choice. Tell us about yourself, and we’ll help you make studying in Germany happen.',
    service: 'Study - Germany'
  },
  switzerland: {
    title: 'Switzerland',
    copy: 'Interested in Switzerland? Tell us what you want to study and we’ll help you explore the right route.',
    service: 'Study - Switzerland'
  },
  eu: {
    title: 'Rest of the EU',
    copy: 'Another destination in mind? No problem. Tell us where you want to go and we’ll help you get there.',
    service: 'Study - Rest of the EU'
  }
};

const destinationTitle = document.getElementById('destination-title');
const destinationCopy = document.getElementById('destination-copy');
const destinationCta = document.getElementById('destination-cta');

function setDestination(key) {
  const data = destinationData[key];
  if (!data) return;
  document.querySelectorAll('.destination-tab').forEach(tab => {
    const active = tab.dataset.destination === key;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.destination-card').forEach(card => {
    card.classList.toggle('is-muted', card.dataset.card !== key);
  });
  if (destinationTitle) destinationTitle.textContent = data.title;
  if (destinationCopy) destinationCopy.textContent = data.copy;
  if (destinationCta) destinationCta.dataset.service = data.service;
}

document.querySelectorAll('.destination-tab').forEach(tab => {
  tab.addEventListener('click', () => setDestination(tab.dataset.destination));
});
setDestination('austria');

const serviceSelect = document.getElementById('service');
const messageField = document.getElementById('message');
const messagePrompt = document.getElementById('message-prompt');

const formPrompts = {
  language: 'Tell us about your motivation for learning German. What is your current level, and which level would you like to reach? And when is your exam, if you have one?',
  study: 'Tell us what you would like to study, and which country is calling you.',
  work: 'Tell us about yourself and what kind of work you are looking for.',
  auPair: 'Tell us about yourself and we’ll match you with a welcoming family. When would you like to start?',
  visa: 'Your documents are the last step between you and your dream. Tell us how we can help!',
  jobs: 'Tell us which offer caught your eye and we’ll get in touch!',
  default: 'Tell us a little about what you are looking for.'
};

function getPrompt(service = '') {
  if (service.startsWith('Language Course')) return formPrompts.language;
  if (service.startsWith('Study')) return formPrompts.study;
  if (service.startsWith('Work')) return formPrompts.work;
  if (service.startsWith('Au Pair')) return formPrompts.auPair;
  if (service.startsWith('Visa and Travel Support')) return formPrompts.visa;
  if (service.startsWith('Job Offers')) return formPrompts.jobs;
  return formPrompts.default;
}

function updateMessagePrompt(service = '') {
  const prompt = getPrompt(service);
  if (messagePrompt) messagePrompt.textContent = prompt;
  if (messageField) messageField.placeholder = prompt;
}

function chooseService(service, shouldScroll = true) {
  if (!serviceSelect || !service) return;
  const option = [...serviceSelect.options].find(opt => opt.value === service || opt.text === service);
  if (option) serviceSelect.value = option.value || option.text;
  updateMessagePrompt(serviceSelect.value);

  if (shouldScroll) {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => serviceSelect.focus({ preventScroll: true }), 550);
  }
}

serviceSelect?.addEventListener('change', () => updateMessagePrompt(serviceSelect.value));
updateMessagePrompt(serviceSelect?.value || '');

document.querySelectorAll('[data-service]').forEach(el => {
  el.addEventListener('click', event => {
    const service = el.dataset.service;
    if (!service) return;
    event.preventDefault();
    chooseService(service, true);
  });
});

const form = document.getElementById('inquiry-form');
const status = document.getElementById('form-status');
form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.checkValidity()) {
    status.textContent = 'Please complete the required fields before sending.';
    form.reportValidity();
    return;
  }

  const recipient = form.dataset.recipient || 'tera.kairos@yahoo.com';
  const data = new FormData(form);
  const service = data.get('service') || 'General enquiry';
  const subject = `Tera Kairos enquiry — ${service}`;
  const body = [
    `Service: ${service}`,
    `Country of origin: ${data.get('country') || ''}`,
    `Date of birth: ${data.get('dob') || ''}`,
    '',
    'Message:',
    data.get('message') || ''
  ].join('\n');

  status.textContent = `Opening your email app to send this enquiry to ${recipient}.`;
  window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});


// Keep only social icons whose URLs are still pending inert for now.
document.querySelectorAll('.footer-social .social-link[href="#"]').forEach(link => {
  link.addEventListener('click', event => event.preventDefault());
});

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
