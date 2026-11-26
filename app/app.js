/* =====================================================================
   EMPEIRYA — app prototype behaviour
   (The books themselves — material, composer, page designs, interaction
   and voice playback — are made by js/book-engine.js, shared with the
   website. This file adds the app's screens around them.)
   ---------------------------------------------------------------------
     1. Placeholder material: chapters, photos, voice recordings
     2. State: the person's book, its features, design tweaks
     3. The composer: features + material -> a layout plan
     4. The renderer: one page of the plan -> HTML
     5. Prices
     6. Screens and navigation
     7. Features screen
     8. The book reader in the phone (page turning, sound strip)
     9. The full-size reader (two-page spreads)
    10. Voice playback (the browser reads the clip aloud as a stand-in)
    11. "Ask the designer": edits by request, with undo
    12. Capture, companion and order screens
   ===================================================================== */

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ---------------------------------------------------------------------
   5. PRICES (working figures — see docs/app-features.md)
   --------------------------------------------------------------------- */
// The subscription keeps the biographer running; it is separate from the book.
const SUBSCRIPTION = { month:199, year:1999 };

// The book is paid once, when it is ordered: the base, then each feature
// chosen, at about 2.5× its cost (see docs/pricing-model.md).
function priceLines(){
  const f = state.f, has = b => state.plan.some(p => p.block === b);
  const pages = state.plan.length - 2;
  const lines = [["Hardcover book · A5, up to 40 pages", 1999]];
  if (pages > 40) lines.push([`${pages - 40} more pages`, Math.ceil((pages - 40) / 8) * 149]);
  if (f.format === "square")    lines.push(["Square format", 400]);
  if (f.format === "landscape") lines.push(["Landscape album, lay-flat", 1000]);
  if (f.cover === "linen")   lines.push(["Linen cover", 300]);
  if (f.cover === "leather") lines.push(["Vegan leather cover", 800]);
  if (f.cover === "padded")  lines.push(["Padded cover", 500]);
  if (f.cover === "foil")    lines.push(["Foil-stamped cover", 250]);
  if (f.cover === "window")  lines.push(["Window cut into the cover", 400]);
  const opening = f.flaps && (has("inside") || CHAPTERS.some(c => c.behind && c.photo));
  if (opening)               lines.push(["Pages that open · flaps, drawers, envelopes, a pocket", 600]);
  if (has("foldout"))        lines.push(["Fold-out panorama", 350]);
  if (f.letter)              lines.push(["Letter in an envelope pocket", 200]);
  if (f.voice === "strip")   lines.push([`Sound panel built into the book · ${state.strip.length} voices`, 1500]);
  if (f.voice === "flap")    lines.push(["Press-to-play buttons under flaps", 1800]);
  if (f.voice === "cover")   lines.push(["Voice button on the cover", 400]);
  if (f.greeting)            lines.push(["Greeting that plays when it opens", 300]);
  const extra = state.copies - 1;
  if (extra > 0){
    const each = 1299 + (opening ? 400 : 0) + (has("foldout") ? 250 : 0) + (f.voice === "strip" ? 900 : 0) + (f.voice === "flap" ? 1100 : 0) + (f.voice === "cover" ? 300 : 0) + (f.greeting ? 200 : 0);
    lines.push([`${extra} extra ${extra === 1 ? "copy" : "copies"} × ₹${each.toLocaleString("en-IN")}`, extra * each]);
  }
  return lines;
}
const rupees = n => "₹" + n.toLocaleString("en-IN");
const total = () => priceLines().reduce((s, [, v]) => s + v, 0);


/* ---------------------------------------------------------------------
   6. SCREENS AND NAVIGATION
   Any element with data-go="<screen>" switches screens. The panel beside
   the phone explains what each screen shows.
   --------------------------------------------------------------------- */
const EXPLAIN = {
  home:      ["Library", "Every book the person is making. Each book has one admin, who invites family or friends to record and edit, and approves every page. One subscription per book — ₹199 a month — keeps the biographer running; the printed book is paid for once, when it is ready."],
  start:     ["Start a book", "The person says or types what the book is about. The AI asks a few questions and suggests features. Any life, any age, any language."],
  features:  ["Features, not templates", "Every choice changes the design and the price. Nothing here is a fixed template: the AI composes the book from these choices and the person’s material. Change the size or the mood and watch the cover."],
  capture:   ["Capture", "Anyone the admin has invited can record here. There is no weekly question: say anything, and the biographer asks what matters. Tap the red button to record (simulated here). Photos, video, a scanned handwritten page or a typed note go into the right chapter automatically."],
  companion: ["Companion", "The biographer: one good question at a time, drawing out what happened, what it felt like and what it taught. Type a reply to see it answer."],
  book:      ["Read and edit the book", "Tap the page edges or swipe to turn pages. Press a voice — on the page, the sound panel, a printed wave or a QR code — to hear it. Pages that hide something open in different ways, chosen for each story: lift a flap, pull a drawer, open an envelope, turn a wheel, scratch a panel or tap the numbers on a blueprint. Type a request (“open with envelopes”, “comic as one big panel”, “window cover”) and only that changes; Undo goes back. “Why” shows each design decision and the reason for it; “Full size” shows two-page spreads."],

  order:     ["Proof and order", "The final specification, the price for every feature chosen, copies, and a checklist the app enforces before payment. After paying, the order goes to the team’s console and the print partner ships it to the door."]
};

function go(screen){
  if (screen === "book" || screen === "order") compose();
  $$(".scr").forEach(s => s.classList.toggle("on", s.dataset.s === screen));
  $$(".tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.go === screen));
  $$(".exnav button").forEach(b => b.setAttribute("aria-current", b.dataset.go === screen));
  $("#exTitle").textContent = EXPLAIN[screen][0];
  $("#exBody").textContent = EXPLAIN[screen][1];
  ({ home:renderHome, start:renderStart, features:renderFeatures, capture:renderCapture, companion:renderCompanion, book:renderBook, order:renderOrder })[screen]();
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g) go(g.dataset.go);
});

function renderHome(){
  const cur = state.book, shelf = $("#shelf");
  shelf.innerHTML = "";
  Object.keys(BOOKS).forEach(id => {
    loadBook(id);
    const card = document.createElement("button");
    card.type = "button"; card.className = "bookcard"; card.dataset.open = id;
    card.innerHTML = `<span class="minicover"></span><span class="bc-text"><b>${esc(state.meta.title)}</b><span class="small">${state.entries} entries · ${CHAPTERS.length} chapters · ${state.plan.length} pages</span><span class="prog"><i style="width:${BOOK.home.progress}%"></i></span><span class="small">${esc(BOOK.home.status)} · admin ${esc(BOOK.people.admin)} · ${BOOK.people.others.length + 1} people recording</span></span>`;
    miniCover(card.querySelector(".minicover"), 78);
    shelf.appendChild(card);
  });
  loadBook(cur);
  $("#feedHead").textContent = BOOK.feedHead;
  $("#feed").innerHTML = BOOK.feed.map(([i, c, who, what]) => `<li><span class="av" style="background:${c}">${i}</span><span><b>${esc(who)}</b> ${esc(what)}</span></li>`).join("");
}
$("#shelf").addEventListener("click", e => {
  const card = e.target.closest("[data-open]");
  if (card){ loadBook(card.dataset.open); go("book"); }
});

function renderStart(){
  $("#startNote").textContent = BOOK.startNote;
  $("#inAbout").value = state.meta.about;
  $("#inTitle").value = state.meta.title;
  $("#inBy").value = state.meta.by;
}
["inAbout","inTitle","inBy"].forEach(id => $("#" + id).addEventListener("input", e => {
  const key = { inAbout:"about", inTitle:"title", inBy:"by" }[id];
  state.meta[key] = e.target.value.trim() || state.meta[key];
}));


/* ---------------------------------------------------------------------
   7. FEATURES SCREEN
   --------------------------------------------------------------------- */
const FEATURE_GROUPS = [
  { key:"format", label:"Size and shape", opts:[["portrait","Portrait","A5 · 148×210 mm"],["square","Square","210×210 · +₹400"],["landscape","Landscape album","297×210 · +₹1,000"]] },
  { key:"mood",   label:"Mood",           opts:[["bright","Bright","board-book colours"],["classic","Classic"],["romance","Romance"],["atlas","Atlas"],["comic","Comic book"],["warm","Warm"],["modern","Modern"],["playful","Playful"]] },
  { key:"cover",  label:"Cover",          opts:[["concept","From the story","designed from what’s inside"],["art","Illustrated","painted cover art"],["foil","Foil-stamped","+₹250"],["collage","Collage","printed board"],["comic","Comic-book cover"],["photo","One photo"],["window","Window","cloth · +₹400"],["type","Title only"],["cloth","Cloth"],["linen","Linen","+₹300"],["leather","Vegan leather","+₹800"],["padded","Padded","+₹500"]] },
  { key:"voice",  label:"Voice in the book", opts:[["app","In the app only","free"],["qr","QR codes","free"],["wave","Printed sound waves","free"],["strip","Sound panel","+₹1,500"],["flap","Buttons under flaps","+₹1,800"],["cover","Button on the cover","+₹400"]] },
  { key:"panelPos", label:"Sound panel position", when:f => f.voice === "strip", opts:[["right","Right edge"],["left","Left edge"],["bottom","Along the bottom"],["inside","Hidden inside back cover"]] },
  { key:"panelLabels", label:"Panel buttons show", when:f => f.voice === "strip", opts:[["pictures","Pictures","a face or moment"],["numbers","Numbers"]] },
  { key:"drawings", label:"Moments with no photo", opts:[["page","Draw it","a full page"],["spot","Draw it small","on the story page"],["off","Text only"]] },
  { key:"drawStyle", label:"Drawing style", when:f => f.drawings !== "off", opts:[["pencil","Pencil sketch"],["watercolour","Watercolour"],["colour","Colour"],["bw","Black & white ink"]] },
  { key:"reveal", label:"How hidden things open", when:f => f.flaps, opts:[["auto","Chosen for each story"],["layers","Layered flaps"],["drawer","Drawer"],["envelope","Envelopes"],["wheel","Turning wheel"],["scratch","Scratch"],["blueprint","Blueprint"]] },
  { key:"comicLayout", label:"Comic layout", when:f => f.comic, opts:[["auto","Chosen for each story"],["grid","Rows of panels"],["splash","One big panel"],["strip","A strip on the story page"],["vertical","Stacked"]] },
  { key:"comicStyle", label:"Comic pages", when:f => f.comic, opts:[["colour","Full colour"],["bw","Black & white"],["pencil","Pencil"],["watercolour","Watercolour"]] },
  { key:"treeStyle", label:"Family tree drawn as", when:f => f.tree && BOOK.tree && BOOK.tree.style !== "team", opts:[["auto","Branches"],["fan","A fan of generations"]] },
  { label:"Pages", toggles:() => [...(BOOK.tree ? [["tree", BOOK.labels.tree]] : []), ...(BOOK.timeline ? [["timeline", BOOK.labels.timeline]] : []), ["comic","Comic pages for big events with many moments"],["flaps","Hidden things that open — flaps, drawers, wheels · +₹600"],["blessings",BOOK.labels.blessings],["handwriting",BOOK.labels.handwriting],["writein",BOOK.labels.writein],["letter",BOOK.labels.letter + " · +₹200"],["numbers",BOOK.labels.numbers],["greeting","A greeting plays when the book is opened · +₹300"]] }
];

function renderFeatures(){
  compose();
  miniCover($("#featCover"), 74);
  const f = state.f;
  $("#featSummary").textContent = `${FORMATS[f.format].name} · ${MOODS[f.mood].name} · ${state.plan.length} pages. Change anything — the book is recomposed from your choices.`;
  $("#featureList").innerHTML = FEATURE_GROUPS.filter(g => !g.when || g.when(f)).map(g => g.toggles
    ? `<div class="fgroup"><b>${g.label}</b>${g.toggles().map(([k, label]) => `<button type="button" class="toggle" data-t="${k}" aria-pressed="${f[k]}"><span>${label}</span><span class="sw"></span></button>`).join("")}</div>`
    : `<div class="fgroup"><b>${g.label}</b><div class="opts">${g.opts.map(([v, label, small]) => `<button type="button" class="opt" data-k="${g.key}" data-val="${v}" aria-pressed="${f[g.key] === v}">${label}${small ? `<small>${small}</small>` : ""}</button>`).join("")}</div></div>`
  ).join("");
  $("#featPrice").textContent = rupees(total());
}
$("#featureList").addEventListener("click", e => {
  const o = e.target.closest(".opt"), t = e.target.closest(".toggle");
  if (o) state.f[o.dataset.k] = o.dataset.val;
  if (t) state.f[t.dataset.t] = !state.f[t.dataset.t];
  if (o || t){ state.tweaks.photo = null; renderFeatures(); }
});
$("#makeBook").addEventListener("click", () => {
  compose();
  const steps = [`Laying out ${CHAPTERS.length} chapters in ${MOODS[state.f.mood].name.toLowerCase()} style`, `Placing ${Object.keys(VOICES).length} recordings`, "Checking print rules", "Done"];
  const box = $("#composing"); box.hidden = false;
  let k = 0; $("#compSteps").textContent = steps[0];
  const tick = setInterval(() => {
    k++; $("#compSteps").textContent = steps[k];
    if (k === steps.length - 1){ clearInterval(tick); setTimeout(() => { box.hidden = true; state.cur = 0; go("book"); }, 350); }
  }, reduceMotion ? 120 : 520);
});


/* ---------------------------------------------------------------------
   8. THE BOOK READER IN THE PHONE
   One page at a time (as on a phone); the turning page swings away on its
   spine. The sound strip beside it plays the numbered recordings.
   --------------------------------------------------------------------- */
const CHIPS = ["Draw the tree as a fan", "Romance mood", "Atlas mood", "Drawings in watercolour", "Open with envelopes", "Use a turning wheel", "Scratch to reveal", "Show it as a blueprint", "Choose for each story", "Comic as one big panel", "Comic strip on the story page", "Sound as printed waves", "Window cover", "Comic in black & white", "Drawings in colour", "Remove the flaps", "Panel on the left", "Panel along the bottom", "Hide the panel inside", "Numbered buttons", "Make it warmer", "Make it bright", "Bigger photos", "Use QR codes"];

function renderBook(){
  $("#bookHead").textContent = state.meta.title;
  $("#chips").innerHTML = CHIPS.map(c => `<button type="button">${c}</button>`).join("");
  $("#undoBtn").disabled = !state.history.length;
  renderStrip($("#strip"));
  requestAnimationFrame(() => showPage(state.cur, 0));
}

function renderStrip(el){
  const f = state.f, pics = f.panelLabels === "pictures";
  el.className = `strip${el.id === "rStrip" ? " big" : ""} pos-${f.panelPos} lab-${f.panelLabels}`;
  el.hidden = f.voice !== "strip" || f.panelPos === "inside";
  el.innerHTML = state.strip.map((id, k) => `<button type="button" data-v="${id}" title="${esc(VOICES[id].label)}" aria-label="${esc(VOICES[id].label)}">${pics ? picEl(id) : k + 1}</button>`).join("");
  const host = el.id === "rStrip" ? $("#rBody") : $("#bookbody");
  host.classList.remove("pos-right", "pos-left", "pos-bottom", "pos-inside");
  host.classList.add("pos-" + f.panelPos);
  host.classList.toggle("nopanel", el.hidden);
  host.style.setProperty("--board", BOARD[f.mood]);
}

function phonePageSize(){
  const v = $("#viewer"), f = state.f, on = f.voice === "strip" && f.panelPos !== "inside";
  const side = on && f.panelPos !== "bottom" ? 50 : 0, below = on && f.panelPos === "bottom" ? 52 : 0, board = on ? 14 : 0;
  return fitPage(v.clientWidth - 20 - side - board, v.clientHeight - 20 - below - board);
}

function showPage(i, dir){
  i = Math.max(0, Math.min(state.plan.length - 1, i));
  const stage = $("#vstage"), [w, h] = phonePageSize();
  stage.style.width = w + "px"; stage.style.height = h + "px";
  const old = stage.querySelector(".bpage.top");
  const next = pageEl(i, w, h); next.classList.add("top");
  if (!old || !dir || reduceMotion){
    stage.innerHTML = ""; stage.appendChild(next);
  } else if (dir > 0){
    stage.insertBefore(next, old);
    old.classList.remove("top"); old.classList.add("turn-out");
    old.addEventListener("animationend", () => old.remove(), { once:true });
  } else {
    next.classList.add("turn-in"); stage.appendChild(next);
    next.addEventListener("animationend", () => { next.classList.remove("turn-in"); old.remove(); }, { once:true });
    old.classList.remove("top");
  }
  const opened = state.cur === 0 && i === 1 && dir > 0;
  state.cur = i;
  if (opened && state.f.greeting) play(BOOK.greet);
  drawQRCodes(); initScratch();
  $("#pLabel").textContent = i === 0 ? "Cover" : i === state.plan.length - 1 ? "Back cover" : `Page ${i} of ${state.plan.length - 2}`;
  $("#pPrev").disabled = i === 0;
  $("#pNext").disabled = i === state.plan.length - 1;
  const here = state.plan[i].voices || [];
  $$("#strip button").forEach(b => b.classList.toggle("on", here.includes(b.dataset.v)));
}
$("#pPrev").addEventListener("click", () => showPage(state.cur - 1, -1));
$("#pNext").addEventListener("click", () => showPage(state.cur + 1, 1));

// Tap the right or left part of the page to turn; swipe works too.
let swipeX = null;
$("#vstage").addEventListener("pointerdown", e => { swipeX = e.clientX; });
$("#vstage").addEventListener("pointerup", e => {
  if (e.target.closest("[data-v], .scratchc") || swipeX == null) return;
  const dx = e.clientX - swipeX, r = $("#vstage").getBoundingClientRect();
  if (Math.abs(dx) > 40) showPage(state.cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  else if (e.target.closest(".explore")) { swipeX = null; return; }
  else if (e.clientX > r.left + r.width * .6) showPage(state.cur + 1, 1);
  else if (e.clientX < r.left + r.width * .4) showPage(state.cur - 1, -1);
  swipeX = null;
});
addEventListener("resize", () => { if ($(".scr.on")?.dataset.s === "book") showPage(state.cur, 0); if (!$("#reader").hidden) showSpread(rCur, 0); });

$("#whyBtn").addEventListener("click", () => {
  $("#whyList").innerHTML = state.notes.map(n => `<li>${esc(n)}</li>`).join("");
  $("#whyPanel").hidden = false;
});
$("#whyClose").addEventListener("click", () => { $("#whyPanel").hidden = true; });




/* ---------------------------------------------------------------------
   9. THE FULL-SIZE READER
   Two-page spreads as in the printed book: the cover alone on the right,
   then pages 1–2, 3–4 … and the back cover alone on the left.
   --------------------------------------------------------------------- */
let rCur = 0;
const spreads = () => {
  const n = state.plan.length, out = [[-1, 0]];
  for (let i = 1; i < n; i += 2) out.push([i, i + 1 < n ? i + 1 : -1]);
  return out;
};

function showSpread(k, dir){
  const list = spreads(); k = Math.max(0, Math.min(list.length - 1, k));
  if (rCur === 0 && k === 1 && dir > 0 && state.f.greeting) play(BOOK.greet);
  rCur = k;
  const stage = $(".rstage"), f = state.f, on = f.voice === "strip" && f.panelPos !== "inside";
  const side = on && f.panelPos !== "bottom" ? 78 : 0, below = on && f.panelPos === "bottom" ? 78 : 0, board = on ? 24 : 0;
  const [w, h] = fitPage((stage.clientWidth - 48 - side - board) / 2, stage.clientHeight - 20 - below - board);
  const spread = $("#spread"); spread.innerHTML = "";
  list[k].forEach((i, side) => {
    const slot = document.createElement("div");
    slot.className = "rpage " + (side ? "right" : "left") + (i < 0 ? " blank" : "");
    slot.style.setProperty("--pw", w + "px"); slot.style.setProperty("--ph", h + "px");
    if (i >= 0) slot.appendChild(pageEl(i, w, h));
    spread.appendChild(slot);
  });
  if (dir && !reduceMotion){ spread.classList.remove("fade"); void spread.offsetWidth; spread.classList.add("fade"); }
  drawQRCodes(); initScratch();
  const [a, b] = list[k];
  $("#rLabel").textContent = k === 0 ? "Cover" : b < 0 ? "Back cover" : `Pages ${a}–${b}`;
  $("#rPrev").disabled = k === 0; $("#rNext").disabled = k === list.length - 1;
  const here = [a, b].flatMap(i => i >= 0 ? (state.plan[i].voices || []) : []);
  $$("#rStrip button").forEach(btn => btn.classList.toggle("on", here.includes(btn.dataset.v)));
}

$("#fullBtn").addEventListener("click", () => {
  $("#reader").hidden = false;
  $("#rTitle").textContent = state.meta.title;
  renderStrip($("#rStrip"));
  rCur = Math.ceil(state.cur / 2);
  showSpread(rCur, 0);
});
$("#rClose").addEventListener("click", () => { $("#reader").hidden = true; showPage(Math.max(0, rCur * 2 - 1), 0); });
$("#rPrev").addEventListener("click", () => showSpread(rCur - 1, -1));
$("#rNext").addEventListener("click", () => showSpread(rCur + 1, 1));
addEventListener("keydown", e => {
  if ($("#reader").hidden) return;
  if (e.key === "Escape") $("#rClose").click();
  if (e.key === "ArrowRight") showSpread(rCur + 1, 1);
  if (e.key === "ArrowLeft") showSpread(rCur - 1, -1);
});


/* ---------------------------------------------------------------------
   11. ASK THE DESIGNER
   In the real app the AI edits the layout plan from the request. Here a
   handful of request patterns are recognised so the idea can be tried.
   Every change can be undone.
   --------------------------------------------------------------------- */
function ask(text){
  const t = text.toLowerCase(), f = state.f, tw = state.tweaks, done = [];
  const before = JSON.stringify({ f, tw });
  const set = (obj, k, v, msg) => { if (obj[k] !== v){ obj[k] = v; done.push(msg); } };
  if (/warm|cosy|cozy|soft/.test(t))                 set(f, "mood", "warm", "warm mood — cream paper, rose cloth, handwritten accents");
  if (/modern|minimal|clean|simple/.test(t))         set(f, "mood", "modern", "modern mood — white paper, charcoal, a light sans-serif");
  if (/playful|\bfun\b/.test(t))                     set(f, "mood", "playful", "playful mood — rounded headings, sage cloth");
  if (/bright|colou?rful|vivid|bold|board book|sound book/.test(t)) set(f, "mood", "bright", "bright board-book colours — a bold colour behind every chapter");
  if (/(remove|without|no |take out).*comic/.test(t)) set(f, "comic", false, "comic pages removed — busy events go back to photo and story pages");
  else if (/comic|cartoon/.test(t))                  set(f, "comic", true, "comic pages for busy events");
  const bw = /black (and|&) white|\bb ?& ?w\b|b\/w|monochrome|gr[ae]yscale/.test(t), pen = /pencil|sketch/.test(t);
  const col = /full colou?r|in colou?r|colou?r (comic|drawing|sketch)/.test(t);
  const onComic = /comic|cartoon/.test(t), onDraw = /draw|sketch/.test(t) && !onComic;
  const style = bw ? "bw" : col ? "colour" : pen ? "pencil" : null;
  if (style && (onComic || !onDraw)) set(f, "comicStyle", style, `comic pages in ${ART_STYLE[style]}`);
  if (style && (onDraw || !onComic)) set(f, "drawStyle", style, `drawings in ${ART_STYLE[style]}`);
  if (/(no|remove|without) drawings?/.test(t))       set(f, "drawings", "off", "moments with no photo stay as text");
  else if (/(small|smaller|little|tiny).*(drawing|sketch)|(drawing|sketch)e?s?\b.*\b(small|smaller|little)|\bspot\b/.test(t))             set(f, "drawings", "spot", "drawings made small, on the story page");
  else if (/(full|whole)[- ]page|(big|bigger|large).*(drawing|sketch)|(drawing|sketch)e?s?\b.*\b(big|bigger|full)|draw (it|them)/.test(t)) set(f, "drawings", "page", "each drawing gets a full page");
  if (/envelope/.test(t))                            set(f, "reveal", "envelope", "hidden things open as envelopes inside envelopes");
  if (/drawer/.test(t))                              set(f, "reveal", "drawer", "hidden things slide out like drawers");
  if (/\bwheel\b/.test(t))                           set(f, "reveal", "wheel", "hidden things turn on a wheel");
  if (/scratch/.test(t))                             set(f, "reveal", "scratch", "the last line hides under a scratch panel");
  if (/blueprint|technical drawing/.test(t))         set(f, "reveal", "blueprint", "hidden things drawn as blueprints with numbered callouts");
  if (/layered flaps?|in layers/.test(t))            set(f, "reveal", "layers", "hidden things open as layered flaps");
  if (/each story|for me|automatic|\bauto\b|by context|you choose|you decide/.test(t)) set(f, "reveal", "auto", "each hidden page opens the way its story suits");
  if (/sound ?waves?|waveform|printed wave/.test(t)) set(f, "voice", "wave", "voices printed as sound waves the app can play");
  if (/(button|sound|voice)s? (under|behind) (the )?flaps?|hidden buttons?/.test(t)) set(f, "voice", "flap", "a press-to-play button under a flap on each voice page");
  if (/window( cover)?|cover with a window/.test(t)) set(f, "cover", "window", "a cloth cover with a window cut into it");
  if (/title[- ]only|typographic|just the title/.test(t)) set(f, "cover", "type", "a title-only cover");
  if (/splash|one big panel/.test(t))                set(f, "comicLayout", "splash", "the comic as one big panel with four small ones");
  if (/comic strip|strip on the (story )?page/.test(t)) set(f, "comicLayout", "strip", "the comic as a strip of three on the story page");
  if (/stacked|vertical|scroll|webtoon/.test(t))     set(f, "comicLayout", "vertical", "comic panels stacked like a scroll");
  if (/rows of panels|panel grid/.test(t))           set(f, "comicLayout", "grid", "the comic in rows of panels");
  if (/comic[- ]book (edition|look|mood|style)|make it a comic( book)?$|like a comic book/.test(t)){ set(f, "mood", "comic", "a comic-book edition — halftone paper, bold ink"); set(f, "cover", "comic", "a comic-book cover"); }
  if (/romanc|romantic|love story/.test(t))          set(f, "mood", "romance", "romance mood — blush paper, wine cloth, gold");
  if (/atlas|travel journal|map look/.test(t))       set(f, "mood", "atlas", "atlas mood — map paper, sea-blue cloth, a red route");
  if (/\bfan\b/.test(t))                             set(f, "treeStyle", "fan", "the family tree drawn as a fan of generations");
  if (/branch/.test(t))                              set(f, "treeStyle", "auto", "the family tree drawn with branches");
  if (/(remove|without|no ).*tree/.test(t))          set(f, "tree", false, "the tree page removed");
  else if (/family tree|\btree\b|ancest|lineage/.test(t) && BOOK.tree) set(f, "tree", true, "a tree page");
  if (/(remove|without|no ).*timeline/.test(t))      set(f, "timeline", false, "the timeline removed");
  else if (/timeline/.test(t) && BOOK.timeline)      set(f, "timeline", true, "a timeline page");
  if (/watercolou?r/.test(t)){ set(f, "drawStyle", "watercolour", "drawings in watercolour"); if (/comic/.test(t)) set(f, "comicStyle", "watercolour", "comic in watercolour"); }
  if (/(one|single|full) photo cover|photo cover/.test(t)) set(f, "cover", "photo", "a cover that is one photo");
  if (/collage/.test(t))                             set(f, "cover", "collage", "a photo-collage cover");
  if (/(remove|without|no |take out).*flap/.test(t)) set(f, "flaps", false, "flaps removed — pictures print flat");
  else if (/flap|lift|reveal|look inside|open (the )?(photo|picture)/.test(t)) set(f, "flaps", true, "lift-the-flap pictures that open in layers");
  if (/classic|elegant|timeless|formal/.test(t))     set(f, "mood", "classic", "classic mood — ivory, olive cloth, framed photos");
  if (/(big|larg|full).*(photo|pic|image)|(photo|pic|image).*(big|larg|full)/.test(t)) set(tw, "photo", "full", "photos printed edge to edge");
  if (/(small).*(photo|pic)|(photo|pic).*(small)/.test(t)) set(tw, "photo", null, "photos back to their usual size");
  if (/short|less text|fewer words|brief/.test(t))   set(tw, "text", "short", "each story cut to one line, the lesson kept");
  if (/more text|longer|full stor/.test(t))          set(tw, "text", "full", "full stories back");
  if (/bless|grand|dadi|nani|nana|dada/.test(t))     set(f, "blessings", true, "a blessings page with Dadi’s and Nana’s voices");
  if (/handwrit/.test(t))                            set(f, "handwriting", true, "a handwritten page");
  if (/letter/.test(t))                              set(f, "letter", true, "a letter to open at 18");
  if (/square/.test(t))                              set(f, "format", "square", "square format");
  if (/landscape|album|wide/.test(t))                set(f, "format", "landscape", "landscape album format");
  if (/portrait|a5/.test(t))                         set(f, "format", "portrait", "portrait A5 format");
  if (/\bqr\b/.test(t))                              set(f, "voice", "qr", "voices as QR codes");
  if (/strip|sidebar|press|panel|button/.test(t) && !/flap|comic|wave/.test(t)) set(f, "voice", "strip", "voices on the sound panel");
  if (/\bleft\b/.test(t))                            set(f, "panelPos", "left", "sound panel moved to the left edge");
  if (/\bright\b/.test(t))                           set(f, "panelPos", "right", "sound panel moved to the right edge");
  if (/bottom|below/.test(t))                        set(f, "panelPos", "bottom", "sound panel moved along the bottom");
  if (/(panel|strip|button).*(inside|hidden|hide)|(inside|hidden|hide).*(panel|strip|button)/.test(t) && !/flap|comic/.test(t)) set(f, "panelPos", "inside", "sound panel hidden inside the back cover");
  if (/picture|photo button|icon/.test(t))           set(f, "panelLabels", "pictures", "panel buttons show pictures");
  if (/\bnumber(ed)? button|\bnumbers\b/.test(t) && !/year/.test(t)) set(f, "panelLabels", "numbers", "panel buttons show numbers");
  if (/greet|welcome|when (it|the book) opens/.test(t)) set(f, "greeting", true, "a greeting that plays when the book is opened");
  if (/(remove|without|no ).*(number)/.test(t))      set(f, "numbers", false, "the year-in-numbers page removed");
  const reply = $("#askReply");
  if (!done.length){
    reply.textContent = "In the prototype I can change the mood (bright, warm, modern, playful, classic), add or remove the lift-the-flaps or comic pages, draw comics and drawings in colour, black & white or pencil, make photos bigger, shorten the text, change the size, switch to QR codes, or add pages — blessings, a letter, handwriting.";
    return;
  }
  state.history.push(before);
  compose();
  reply.textContent = `Done: ${done.join("; ")}. The book is now ${state.plan.length} pages.`;
  renderBook();
}
$("#askForm").addEventListener("submit", e => { e.preventDefault(); const v = $("#askIn").value.trim(); if (v){ ask(v); $("#askIn").value = ""; } });
$("#chips").addEventListener("click", e => { const b = e.target.closest("button"); if (b) ask(b.textContent); });
$("#undoBtn").addEventListener("click", () => {
  const prev = state.history.pop(); if (!prev) return;
  const { f, tw } = JSON.parse(prev);
  state.f = f; state.tweaks = tw;
  compose();
  $("#askReply").textContent = "Undone.";
  renderBook();
});


/* ---------------------------------------------------------------------
   12. CAPTURE, COMPANION AND ORDER
   --------------------------------------------------------------------- */
function renderCapture(){
  $("#capQ").textContent = `Recording for “${state.meta.title}” · ${BOOK.people.admin} (admin), ${BOOK.people.others.join(", ")}`;
  $("#capCount").textContent = `${state.entries} entries`;
  $("#entries").innerHTML = BOOK.entries.map(([a, b, c], k) => `<li class="${k === 0 && BOOK.entries.isNew ? "new" : ""}"><small>${a}</small>${b}<small>${c}</small></li>`).join("");
  const wave = $("#recWave");
  if (!wave.children.length) for (let k = 0; k < 28; k++){ const i = document.createElement("i"); i.style.height = (6 + (k * 7) % 20) + "px"; i.style.animationDelay = (k * .05) + "s"; wave.appendChild(i); }
  wave.hidden = true;
}
let recTimer = null, recSecs = 0;
$("#recBtn").addEventListener("click", () => {
  const btn = $("#recBtn");
  if (!recTimer){
    btn.classList.add("on"); recSecs = 0; $("#recWave").hidden = false;
    $("#recTime").textContent = "Recording · 0:00";
    recTimer = setInterval(() => { recSecs++; $("#recTime").textContent = `Recording · 0:${String(recSecs).padStart(2, "0")}`; }, 1000);
  } else {
    clearInterval(recTimer); recTimer = null; btn.classList.remove("on"); $("#recWave").hidden = true;
    $("#recTime").textContent = "Saved · transcribing…";
    setTimeout(() => {
      BOOK.entries.unshift([`Voice note · 0:${String(Math.max(recSecs, 4)).padStart(2, "0")}`, ...BOOK.newEntry]);
      BOOK.entries.isNew = true; state.entries++;
      $("#recTime").textContent = "Tap to record";
      renderCapture();
    }, reduceMotion ? 200 : 1300);
  }
});
$$(".capbtn").forEach(b => b.addEventListener("click", () => {
  BOOK.entries.unshift([b.dataset.cap, b.dataset.cap === "Scanned page" ? "A page of handwriting — kept as it is, with a typed version beside it." : "Added (prototype).", BOOK.filed]);
  BOOK.entries.isNew = true; state.entries++; renderCapture();
}));

let replyIdx = 0;
function bubble([kind, text]){
  if (kind === "voice") return `<div class="bubble me voice"><span>▶</span><span class="w">${[8,14,10,16,7,12,15,9,13].map(h => `<i style="height:${h}px"></i>`).join("")}</span><span>${esc(text)}</span></div>`;
  return `<p class="bubble ${kind}">${esc(text)}</p>`;
}
function renderCompanion(){ $("#thread").innerHTML = BOOK.thread.map(bubble).join(""); }
$("#compForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = $("#compIn").value.trim(); if (!v) return;
  BOOK.thread.push(["me", v]); $("#compIn").value = ""; renderCompanion();
  const th = $("#thread"); th.insertAdjacentHTML("beforeend", '<p class="typing">Companion is thinking…</p>');
  th.parentElement.scrollTop = th.parentElement.scrollHeight;
  setTimeout(() => { BOOK.thread.push(["ai", BOOK.replies[replyIdx++ % BOOK.replies.length]]); renderCompanion(); th.parentElement.scrollTop = th.parentElement.scrollHeight; }, reduceMotion ? 100 : 900);
});

function renderOrder(){
  const f = state.f;
  const voiceName = { app:"In the app only", qr:"QR codes on the pages", strip:`Sound panel · ${state.strip.length} ${f.panelLabels === "pictures" ? "picture" : "numbered"} buttons, ${PANEL_POS[f.panelPos]}`, cover:"Voice button on the cover", wave:"Printed sound waves (the app plays them)", flap:"Press-to-play buttons under flaps" }[f.voice];
  const extras = [["comic","Comic page"],["drawings","Drawings from memory"],["flaps","Pages that open"],["blessings","Blessings"],["handwriting","Handwritten page"],["letter","Letter for later"],["writein","Write-in page"],["numbers","Year in numbers"],["greeting","Greeting on opening"]].filter(([k]) => f[k] && f[k] !== "off").map(([, v]) => v).join(", ") || "None";
  const spec = [
    ["Size", `${FORMATS[f.format].name} · ${FORMATS[f.format].size} pages${f.voice === "strip" && f.panelPos !== "inside" ? ` · the board is ${f.panelPos === "bottom" ? "35 mm taller" : "40 mm wider"} to hold the built-in sound panel` : ""}`],
    ["Pages", `${state.plan.length - 2} + covers`],
    ["Paper", f.format === "landscape" ? "Silk 170 gsm, lay-flat" : "Matte 130 gsm"],
    ["Cover", f.cover === "collage" ? "Printed photo collage on board, gloss laminate" : f.cover === "window" ? "Cloth with a die-cut window over a printed picture" : f.cover === "type" ? "Printed board, title only" : { cloth:"Cloth", linen:"Linen", leather:"Vegan leather", padded:"Padded" }[f.cover] + `, ${MOODS[f.mood].name.toLowerCase()} colours, foil title`],
    ["Voice", voiceName],
    ["Extras", extras]
  ];
  $("#ospec").innerHTML = spec.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join("");
  $("#cNum").textContent = state.copies;
  $("#olines").innerHTML = priceLines().map(([a, v]) => `<div class="ln"><span>${esc(a)}</span><span>${rupees(v)}</span></div>`).join("")
    + `<div class="ln tot"><span>The book · paid once</span><span>${rupees(total())}</span></div>`
    + `<div class="ln sub"><span>Your subscription · the biographer, the archive and everyone’s access</span><span>${rupees(SUBSCRIPTION.month)}/month</span></div>`
    + `<p class="note">The subscription is separate: ₹199 a month (under ₹50 a week) or ₹1,999 a year, one per book, for the admin and up to five people they invite. Working prices for the prototype. Printed and shipped in about 2–3 weeks${f.voice === "strip" || f.voice === "flap" ? " (books with sound: about 3 weeks)" : ""}.</p>`;
  $("#payBtn").textContent = `Order the book · ${rupees(total())}`;
}
$("#cMinus").addEventListener("click", () => { state.copies = Math.max(1, state.copies - 1); renderOrder(); });
$("#cPlus").addEventListener("click", () => { state.copies = Math.min(10, state.copies + 1); renderOrder(); });
$("#payBtn").addEventListener("click", () => {
  $("#payBtn").hidden = true; $("#track").hidden = false;
  $("#payBtn").insertAdjacentHTML("afterend", '<p class="small" id="paidNote">Prototype: no payment was taken. In the real app the order now appears in the team’s console with the print-ready file.</p>');
});

// Start on the library.
loadBook("kiara");
go("home");
if ("speechSynthesis" in window) speechSynthesis.getVoices();
