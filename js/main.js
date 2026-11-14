/* =====================================================================
   EMPEIRYA — website behaviour
   ---------------------------------------------------------------------
   Plain JavaScript, no libraries and no build step. Each block below
   powers one interactive part of index.html:

     1. Name switcher        – try Empeirya / Empeiria / Anubhav / ...
     2. 3D book tilt         – the hero book follows the mouse
     3. Flipbooks            – five sample books with page turning
     4. Companion chat       – a scripted talk with the AI, on a loop
     5. Journey stepper      – six steps from life to printed book
     6. Handwriting examples – five pages in four scripts, hand or typed
     7. Why covers           – three cloth covers that open on tap
     8. Early-access form    – thank-you message (nothing is sent)

   The decorative QR codes are drawn by js/qr.js.
   ===================================================================== */

// If the visitor has asked their OS for less motion, we skip the
// automatic animations (page auto-turn, question cycling, spins).
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Two tiny helpers so the code below reads more easily.
const $  = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);


/* ---------------------------------------------------------------------
   1. NAME SWITCHER (prototype only)
   Any element marked data-brand shows the brand name, data-native shows
   the original-language word, data-initial shows the first letter (used
   on the wax seals). Clicking a name rewrites all of them at once.
   The choice is remembered in localStorage so a refresh keeps it.
   --------------------------------------------------------------------- */
const NAMES = {
  empeirya:  { brand:"Empeirya",  native:"ἐμπειρία", meaning:"From Greek empeiria · experience; knowledge gained by living it",
               gloss:"em·pay·rée·ya, from the Greek empeiria: knowledge gained by living and doing. The root of the word empirical." },
  empeiria:  { brand:"Empeiria",  native:"ἐμπειρία", meaning:"Greek · experience; knowledge gained by living it",
               gloss:"em·pei·ría, Greek: knowledge gained by living and doing. The root of the word empirical." },
  anubhav:   { brand:"Anubhav",   native:"anubhava", meaning:"Sanskrit · what you know because you lived through it",
               gloss:"a·nu·bhav, Sanskrit: what you know only because you lived through it." },
  phronesis: { brand:"Phronesis", native:"φρόνησις", meaning:"Greek · practical wisdom, knowing how to act well",
               gloss:"phro·né·sis, Greek: practical wisdom, knowing what to do in a real situation." },
  hindsight: { brand:"Hindsight", native:"hindsight", meaning:"English · understanding that comes after the event",
               gloss:"English: understanding a situation only after it has happened." }
};

function setName(key){
  const n = NAMES[key];
  $$("[data-brand]").forEach(el => el.textContent = n.brand);
  $$("[data-native]").forEach(el => el.textContent = n.native);
  $$("[data-initial]").forEach(el => el.textContent = n.brand[0]);
  $("#meaning").textContent = n.meaning;
  $("#gloss").textContent = n.gloss;
  $$("#names button").forEach(b => b.setAttribute("aria-pressed", b.dataset.n === key));
  document.title = n.brand;
  try { localStorage.setItem("emp-name-v2", key); } catch (e) { /* private mode: just don't remember */ }
}

$("#names").addEventListener("click", e => {
  const button = e.target.closest("button");
  if (button) setName(button.dataset.n);
});

let savedName = "empeirya";
try { const s = localStorage.getItem("emp-name-v2"); if (s && NAMES[s]) savedName = s; } catch (e) {}
setName(savedName);


/* ---------------------------------------------------------------------
   2. 3D BOOK TILT
   The book's rotation comes from two CSS variables, --ry and --rx (see
   .book3d in styles.css). Moving the mouse over the hero art sets them
   from the pointer position; leaving resets them to the resting angle.
   CSS transitions smooth out the movement.
   --------------------------------------------------------------------- */
const book3d = $("#book3d");
const tiltArea = $("#scene").parentElement;

// The swing-in animation only runs once; remove its class afterwards so
// it doesn't fight with the tilt.
book3d.addEventListener("animationend", () => book3d.classList.remove("enter"));

tiltArea.addEventListener("pointermove", e => {
  if (reduceMotion) return;
  const r = tiltArea.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width  - 0.5;   // -0.5 (left) … 0.5 (right)
  const y = (e.clientY - r.top)  / r.height - 0.5;   // -0.5 (top)  … 0.5 (bottom)
  book3d.style.setProperty("--ry", (-28 + x * 44) + "deg");
  book3d.style.setProperty("--rx", (8 - y * 14) + "deg");
});
tiltArea.addEventListener("pointerleave", () => {
  book3d.style.removeProperty("--ry");
  book3d.style.removeProperty("--rx");
});


/* ---------------------------------------------------------------------
   3. FLIPBOOKS
   Each book is a stack of .leaf elements (one sheet = two pages).
   book.cur counts how many sheets have been turned:
     cur = 0          → closed, showing the front cover
     cur = N (all)    → closed, showing the back cover
     anything between → open at pages (cur*2) and (cur*2 + 1)

   z-index matters: unturned sheets stack with the first on top; turned
   sheets stack with the LAST turned on top. While a sheet is moving we
   lift it above everything so it never slides under its neighbours.
   --------------------------------------------------------------------- */
function makeBook(el){
  const book = { el, leaves: [...el.querySelectorAll(".leaf")], cur: 0 };
  book.N = book.leaves.length;
  book.leaves.forEach((leaf, i) => leaf.style.zIndex = book.N - i);

  book.next = () => {
    if (book.cur >= book.N) return;
    const leaf = book.leaves[book.cur], i = book.cur;
    leaf.style.zIndex = book.N + 1;              // on top while turning
    leaf.classList.add("flipped");
    book.cur++;
    setTimeout(() => { if (leaf.classList.contains("flipped")) leaf.style.zIndex = i + 1; }, reduceMotion ? 0 : 600);
    updateControls();
  };

  book.prev = () => {
    if (book.cur <= 0) return;
    book.cur--;
    const leaf = book.leaves[book.cur], i = book.cur;
    leaf.style.zIndex = book.N + 1;
    leaf.classList.remove("flipped");
    setTimeout(() => { if (!leaf.classList.contains("flipped")) leaf.style.zIndex = book.N - i; }, reduceMotion ? 0 : 600);
    updateControls();
  };

  // Click a right-hand page to go forward, a left-hand page to go back.
  book.leaves.forEach(leaf => leaf.addEventListener("click",
    () => leaf.classList.contains("flipped") ? book.prev() : book.next()));

  // Keyboard: focus the book (Tab) then use ← and →.
  el.addEventListener("keydown", e => {
    if (e.key === "ArrowRight"){ e.preventDefault(); book.next(); }
    if (e.key === "ArrowLeft"){  e.preventDefault(); book.prev(); }
  });

  return book;
}

const books = [makeBook($("#fb1")), makeBook($("#fb2")), makeBook($("#fb3")), makeBook($("#fb4")), makeBook($("#fb5"))];
let activeBook = books[0];

// Keep the arrows, the "Pages 4–5 of 10" label and the centring classes
// in step with whichever book is showing.
function updateControls(){
  books.forEach(b => {
    b.el.classList.toggle("closed", b.cur === 0);
    b.el.classList.toggle("ended",  b.cur === b.N);
  });
  const b = activeBook;
  $("#fbl").textContent = b.cur === 0 ? "Cover"
                        : b.cur === b.N ? "Back cover"
                        : `Pages ${b.cur * 2}–${b.cur * 2 + 1} of ${b.N * 2}`;
  $("#prev").disabled = b.cur === 0;
  $("#next").disabled = b.cur === b.N;
}

$("#next").onclick = () => activeBook.next();
$("#prev").onclick = () => activeBook.prev();

// The two buttons above the book switch which sample book is showing.
$("#shelf").addEventListener("click", e => {
  const tab = e.target.closest("button");
  if (!tab) return;
  const index = Number(tab.dataset.b);
  if (books[index] === activeBook) return;

  $$("#shelf button").forEach(t => t.setAttribute("aria-selected", t === tab));
  books.forEach((b, j) => { b.el.hidden = j !== index; b.el.classList.remove("show"); });
  activeBook = books[index];
  void activeBook.el.offsetWidth;          // restart the fade-in animation
  activeBook.el.classList.add("show");
  updateControls();

  // Open the cover automatically so people see inside straight away.
  if (!reduceMotion && activeBook.cur === 0)
    setTimeout(() => { if (activeBook === books[index] && activeBook.cur === 0) activeBook.next(); }, 650);
});

updateControls();

// When the books first scroll into view, open the first one by itself.
if (!reduceMotion && "IntersectionObserver" in window){
  const watcher = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting){
      watcher.disconnect();
      setTimeout(() => { if (activeBook.cur === 0) activeBook.next(); }, 700);
    }
  }, { threshold: 0.6 });
  watcher.observe($("#stage"));
}


/* ---------------------------------------------------------------------
   4. COMPANION CHAT
   A scripted conversation between the AI companion and a school student
   after the science fair, played one message at a time on a loop. With
   "reduce motion" switched on, the conversation simply appears, still.
   --------------------------------------------------------------------- */
const CHAT = [
  { who:"ai",   text:"You said the science fair got “ruined, then unruined”. Take me to the moment it broke." },
  { who:"you",  voice:"Voice note · 0:58" },
  { who:"ai",   text:"Ten minutes before the judges arrived — what did you actually do first?" },
  { who:"you",  text:"Borrowed glue from the team next to us. The ones we were scared of." },
  { who:"page", text:"Page 12 drafted — “The glue”. Your words, tidied. The lesson kept exactly as you said it: the competition can also be the help." }
];

const chatBox = $("#chat");

// A small waveform for the voice-note bubble (same idea as the hero wave:
// bars of different heights, pulsing slightly out of step).
function waveBars(container){
  [12,18,9,15,22,11,17,24,10,14,20,8,16,21,12].forEach((h, i) => {
    const bar = document.createElement("span");
    bar.style.height = h + "px";
    bar.style.animationDelay = (i * 0.07) + "s";
    container.appendChild(bar);
  });
}

function addMessage(m){
  const el = document.createElement("div");
  el.className = "msg " + m.who;
  if (m.voice){
    el.classList.add("voice");
    const play = document.createElement("span"); play.className = "play"; play.textContent = "▶";
    const wave = document.createElement("span"); wave.className = "wave"; waveBars(wave);
    const label = document.createElement("small"); label.textContent = m.voice;
    el.append(play, wave, label);
  } else {
    el.textContent = m.text;
  }
  chatBox.appendChild(el);
  // Two frames later, add .in so the fade-in transition actually runs.
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
}

if (reduceMotion){
  CHAT.forEach(addMessage);          // show everything at once, no loop
} else {
  let chatIndex = 0;
  addMessage(CHAT[chatIndex++]);
  setInterval(() => {
    if (chatIndex >= CHAT.length){   // conversation over: clear and restart
      chatBox.textContent = "";
      chatIndex = 0;
    }
    addMessage(CHAT[chatIndex++]);
  }, 2600);
}


/* ---------------------------------------------------------------------
   5. JOURNEY STEPPER
   Six steps from the first tap to the parcel at the door. Clicking a
   step shows its phone screen; left alone, it advances by itself. Once
   the visitor clicks, the automatic advance stops — it's theirs now.
   --------------------------------------------------------------------- */
const jsteps = [...$$("#jsteps li")];
const jscreens = [...$$(".jscreen")];
let jcur = 0;

function setStep(i){
  jcur = i;
  jsteps.forEach((li, k) => k === i ? li.setAttribute("aria-current", "step") : li.removeAttribute("aria-current"));
  jscreens.forEach(s => s.classList.toggle("on", Number(s.dataset.s) === i));
}

let jtimer = null;
if (!reduceMotion) jtimer = setInterval(() => setStep((jcur + 1) % jsteps.length), 4200);

jsteps.forEach(li => li.addEventListener("click", () => {
  clearInterval(jtimer);
  setStep(Number(li.dataset.s));
}));


/* ---------------------------------------------------------------------
   6. HANDWRITING EXAMPLES
   Five sample pages (English, Hindi, Kannada, Sanskrit, a child's hand).
   The picker chooses a page; the toggle flips it between the scan of
   the handwriting and the typed-up version. Left alone it flips, then
   moves to the next page, every 4 seconds; a click stops the automatic
   tour.
   --------------------------------------------------------------------- */
const hdemo = $("#hdemo");
const hbuttons = [...$$(".hseg button")];
const hpick = [...$$("#hpick button")];
const hpages = [...$$(".hpage")];
let hcur = 0;

function setHandMode(mode){
  hdemo.dataset.mode = mode;
  hbuttons.forEach(b => b.setAttribute("aria-pressed", b.dataset.m === mode));
}

function setHandPage(i){
  hcur = i;
  hpick.forEach(b => b.setAttribute("aria-selected", Number(b.dataset.h) === i));
  hpages.forEach(p => p.classList.toggle("on", Number(p.dataset.h) === i));
}

// Real handwriting is never uniform. Wrap each word in a span and give it
// a small, fixed (seeded, so it never changes on reload) rotation, drift,
// size and ink pressure, plus the slant of that script's pen.
function roughen(el){
  const slant = el.classList.contains("deva") ? -7 : el.classList.contains("knda") ? -2 : el.classList.contains("kid") ? 1 : -3;
  let seed = el.textContent.length;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const words = el.textContent.split(/(\s+)/);
  el.textContent = "";
  words.forEach(w => {
    if (!w.trim()){ el.append(w); return; }
    const span = document.createElement("span");
    span.textContent = w;
    span.style.transform = `skewX(${slant}deg) rotate(${((rnd() - .5) * 2.6).toFixed(2)}deg) translateY(${((rnd() - .5) * 2.4).toFixed(2)}px) scale(${(.965 + rnd() * .07).toFixed(3)})`;
    span.style.opacity = (.82 + rnd() * .18).toFixed(2);
    el.appendChild(span);
  });
}
$$(".hink, .pg .hn:not(.empty)").forEach(roughen);

let handTimer = null;
if (!reduceMotion) handTimer = setInterval(() => {
  if (hdemo.dataset.mode === "hand") setHandMode("typed");
  else { setHandPage((hcur + 1) % hpages.length); setHandMode("hand"); }
}, 4000);

hbuttons.forEach(b => b.addEventListener("click", () => {
  clearInterval(handTimer);
  setHandMode(b.dataset.m);
}));
hpick.forEach(b => b.addEventListener("click", () => {
  clearInterval(handTimer);
  setHandPage(Number(b.dataset.h));
  setHandMode("hand");
}));


/* ---------------------------------------------------------------------
   7. WHY COVERS
   The three "why it's different" cards are cloth covers. Hovering opens
   one (pure CSS); clicking toggles it open, for touch screens.
   --------------------------------------------------------------------- */
$$(".wcard").forEach(card =>
  card.addEventListener("click", () => card.classList.toggle("open")));


/* ---------------------------------------------------------------------
   8. EARLY-ACCESS FORM
   Prototype only: we stop the browser from submitting and show a thank-
   you line. To collect real sign-ups, send the values to a form service
   or your own backend inside this handler.
   --------------------------------------------------------------------- */
$("#form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#f-name").value.trim();
  const contact = $("#f-contact").value.trim();
  const message = $("#thanks");
  message.hidden = false;
  message.textContent = name && contact
    ? `Thank you, ${name}. You're on the pilot list — we'll be in touch within a week.`
    : "Please add your name and an email or phone number.";
});
