/* =====================================================================
   EMPEIRYA — the book engine
   ---------------------------------------------------------------------
   One engine makes every book, wherever it is shown:
     - app/index.html   the phone prototype (app/app.js adds the screens)
     - index.html       the website's "Look inside" flipbooks (js/main.js)

     1. Material: the sample books, their pictures and voices
     2. State: the book that is open and the features it uses
     3. The composer: features + material + context -> a page plan
     4. The renderer: one page of the plan -> HTML
     5. Interaction: flaps, drawers, wheels, callouts, scratch panels
     6. Voice playback

   Styles for every page are in css/book-pages.css and css/book-engine.css.
   ===================================================================== */

const _q  = s => document.querySelector(s);
const _qq = s => document.querySelectorAll(s);
const _reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Where the voice recordings live, relative to the page using the engine.
const AUDIO_BASE = window.EMPEIRYA_AUDIO || "audio/";

// The art treatments (pencil, blueprint, watercolour) are SVG filters;
// the engine adds them to whatever page uses it.
document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <!-- Pencil sketch: grey tones plus traced edges, slightly wobbled, like graphite on paper. -->
  <filter id="pencil" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="g"/>
    <feConvolveMatrix in="g" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="e1"/>
    <feConvolveMatrix in="g" order="3" kernelMatrix="1 1 1 1 -8 1 1 1 1" preserveAlpha="true" result="e2"/>
    <feComposite in="e1" in2="e2" operator="arithmetic" k2="1" k3="1" result="e"/>
    <feColorMatrix in="e" type="matrix" values="-6 0 0 0 1  -6 0 0 0 1  -6 0 0 0 1  0 0 0 1 0" result="lines"/>
    <feComponentTransfer in="g" result="shade"><feFuncR type="linear" slope=".45" intercept=".55"/><feFuncG type="linear" slope=".45" intercept=".55"/><feFuncB type="linear" slope=".43" intercept=".56"/></feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency=".03 .75" numOctaves="2" seed="7" result="t"/>
    <feColorMatrix in="t" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="t1"/>
    <feComponentTransfer in="t1" result="n"><feFuncR type="table" tableValues="0 0 .15 .9 1"/><feFuncG type="table" tableValues="0 0 .15 .9 1"/><feFuncB type="table" tableValues="0 0 .15 .9 1"/></feComponentTransfer>
    <feComposite in="shade" in2="n" operator="arithmetic" k1=".95" k2="1" k3="-.95" k4="0" result="hatched"/>
    <feBlend in="lines" in2="hatched" mode="multiply" result="drawn"/>
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="wob"/>
    <feDisplacementMap in="drawn" in2="wob" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <!-- Blueprint: the drawing's edges as white lines, laid over blueprint paper by CSS. -->
  <filter id="blueprint" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="g"/>
    <feConvolveMatrix in="g" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="e1"/>
    <feConvolveMatrix in="g" order="3" kernelMatrix="1 1 1 1 -8 1 1 1 1" preserveAlpha="true" result="e2"/>
    <feComposite in="e1" in2="e2" operator="arithmetic" k2="1" k3="1" result="e"/>
    <feColorMatrix in="e" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  7 0 0 0 0"/>
  </filter>
  <!-- Watercolour: soft wobbling edges, a little bleed, paler colour. -->
  <filter id="watercolour" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="2" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation=".9" result="b"/>
    <feComponentTransfer in="b" result="w"><feFuncR type="linear" slope=".82" intercept=".17"/><feFuncG type="linear" slope=".82" intercept=".17"/><feFuncB type="linear" slope=".82" intercept=".17"/></feComponentTransfer>
    <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="11" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 .5  0 0 0 0 .4  0 0 0 0 .3  0 0 0 .12 0" result="paper"/>
    <feComposite in="paper" in2="w" operator="atop"/>
  </filter>
</svg>`);


/* ---------------------------------------------------------------------
   1. PLACEHOLDER MATERIAL
   In the real app this comes from the person's entries. Here it is the
   website's first-year sample, so the composer has something to lay out.
   --------------------------------------------------------------------- */
const PHOTOS = {
  hand: '<svg viewBox="0 0 200 140" role="img" aria-label="A newborn’s hand holding an adult finger"><rect width="200" height="140" fill="#F3E6DA"/><path d="M0 30 Q50 20 100 32 T200 28 M0 70 Q60 60 110 72 T200 66 M0 112 Q50 100 100 114 T200 108" stroke="#E8D5C3" stroke-width="7" fill="none"/><rect x="88" y="56" width="130" height="32" rx="16" fill="#D9A27E"/><ellipse cx="100" cy="72" rx="8" ry="11" fill="#E9C0A4"/><rect x="66" y="96" width="44" height="44" fill="#F2C4A6"/><rect x="62" y="104" width="52" height="11" rx="4" fill="#FFFFFF" stroke="#9DB4C8" stroke-width="1.5"/><rect x="80" y="107" width="16" height="5" rx="1" fill="#9DB4C8"/><ellipse cx="88" cy="90" rx="25" ry="19" fill="#F2C4A6"/><ellipse cx="66" cy="82" rx="7" ry="11" fill="#F2C4A6" stroke="#E0A887" stroke-width="1" transform="rotate(25 66 82)"/><ellipse cx="80" cy="66" rx="6" ry="10" fill="#F2C4A6" stroke="#E0A887" stroke-width="1"/><ellipse cx="91" cy="64" rx="6" ry="10.5" fill="#F2C4A6" stroke="#E0A887" stroke-width="1"/><ellipse cx="102" cy="65" rx="6" ry="10" fill="#F2C4A6" stroke="#E0A887" stroke-width="1"/><ellipse cx="112" cy="68" rx="5" ry="8.5" fill="#F2C4A6" stroke="#E0A887" stroke-width="1"/></svg>',
  clock: '<svg viewBox="0 0 200 140" role="img" aria-label="A clock at 3:12 a.m. beside a milk bottle"><rect width="200" height="140" fill="#2E3A55"/><rect x="128" y="10" width="62" height="48" rx="3" fill="#3B4A6B"/><circle cx="170" cy="28" r="10" fill="#F4E9C8"/><circle cx="176" cy="24" r="9" fill="#3B4A6B"/><circle cx="140" cy="20" r="1.3" fill="#F4E9C8"/><circle cx="152" cy="44" r="1" fill="#F4E9C8"/><rect x="0" y="112" width="200" height="28" fill="#26304A"/><circle cx="58" cy="74" r="32" fill="#F4EEDF" stroke="#C9B48E" stroke-width="3"/><circle cx="58" cy="74" r="2.5" fill="#2E3A55"/><line x1="58" y1="74" x2="76" y2="76" stroke="#2E3A55" stroke-width="3.5" stroke-linecap="round"/><line x1="58" y1="74" x2="82.7" y2="66" stroke="#2E3A55" stroke-width="2.2" stroke-linecap="round"/><rect x="128" y="70" width="30" height="46" rx="8" fill="#DCE4EC"/><rect x="128" y="88" width="30" height="28" rx="6" fill="#FFFFFF"/><rect x="132" y="60" width="22" height="12" rx="3" fill="#E9A6A6"/><ellipse cx="143" cy="55" rx="6" ry="7" fill="#F1C9A5"/></svg>',
  feet: '<svg viewBox="0 0 200 140" role="img" aria-label="Small footprints across a wooden floor"><rect width="200" height="140" fill="#EADFCB"/><path d="M0 35H200M0 70H200M0 105H200M60 0V35M150 35V70M40 70V105M120 105V140" stroke="#DCCDB2" stroke-width="2"/><use href="#foot" x="16" y="88" width="18" height="30" transform="rotate(62 25 103)"/><use href="#foot" x="46" y="66" width="18" height="30" transform="rotate(70 55 81)"/><use href="#foot" x="80" y="78" width="18" height="30" transform="rotate(62 89 93)"/><use href="#foot" x="112" y="56" width="18" height="30" transform="rotate(72 121 71)"/><rect x="152" y="58" width="28" height="28" rx="3" fill="#E9A6A6"/><rect x="160" y="66" width="12" height="12" rx="2" fill="#F7EFE2"/></svg>',
  cake: '<svg viewBox="0 0 200 140" role="img" aria-label="A small birthday cake with one candle"><rect width="200" height="140" fill="#F6E3E3"/><rect x="0" y="112" width="200" height="28" fill="#EBCFCF"/><ellipse cx="100" cy="112" rx="62" ry="8" fill="#FFFFFF"/><rect x="56" y="70" width="88" height="40" rx="6" fill="#F7EFE2"/><path d="M56 78Q66 88 76 78T96 78T116 78T136 78T144 76V70H56Z" fill="#E9A6A6"/><rect x="97" y="44" width="6" height="26" rx="2" fill="#9DB4C8"/><path d="M100 30C95 37 96 42 100 43C104 42 105 37 100 30Z" fill="#F2B544"/><circle cx="72" cy="96" r="2.5" fill="#E9A6A6"/><circle cx="100" cy="98" r="2.5" fill="#9DB4C8"/><circle cx="128" cy="96" r="2.5" fill="#E9A6A6"/></svg>'
};

// Each recording: what it's called, who speaks, and its words. The audio
// files in app/audio/ (<id>.m4a) are stand-in recordings made with macOS
// voices; the browser's speech engine is only a fallback.
const VOICES = {
  v_cry:   { label:"Your first cry",        len:"0:05", who:"Rohan", pitch:1,   seed:5,  text:"She's here. Four fifty-two in the morning, and she is so loud. Hello, Kiara." },
  v_night: { label:"The 3 a.m. lullaby",    len:"0:04", who:"Ananya", pitch:1.15, seed:9,  text:"Sleep now, little one. The moon is up, and so am I." },
  v_fever: { label:"The night of the fever", len:"0:06", who:"Rohan", pitch:1,   seed:13, text:"Thirty-nine point five. We're writing it all down. Feed at one ten, medicine at one forty." },
  v_steps: { label:"First steps",           len:"0:04", who:"Ananya", pitch:1.15, seed:21, text:"Come on, come on. One, two, three! Rohan, are you filming this?" },
  v_bday:  { label:"Happy first birthday",  len:"0:09", who:"The family", pitch:1, seed:33, text:"Happy birthday, dear Kiara. Happy birthday to you!" },
  v_laugh: { label:"Her first laugh",       len:"0:04", who:"Kiara", pitch:1.7, seed:17, text:"Ha! Ha ha! Again! Again!" },
  v_dadi:  { label:"Dadi’s blessing",       len:"0:07", who:"Dadi", pitch:.9,  seed:25, text:"Kiara beta, may you always be brave, and kind, and a little bit stubborn. Like your mother." },
  v_hello: { label:"Welcome",               len:"0:05", who:"Ananya", pitch:1.15, seed:3,  text:"Hello, Kiara. This is the story of the year you taught us. Turn the page." },
  v_nana:  { label:"Nana’s blessing",       len:"0:04", who:"Nana", pitch:.8,  seed:29, text:"Little one, read every day, and never stop asking why." },
  // What Engineering Taught Me
  v_e_hello:{ label:"Start here",           len:"0:04", who:"Madhukar", pitch:1, seed:7,  text:"Hi. This is everything engineering taught me. Start with the goal." },
  v_e_goal: { label:"Every semester",       len:"0:06", who:"Madhukar", pitch:1, seed:11, text:"Every semester, ask yourself: what can I do today that I couldn't do six months ago?" },
  v_e_kiran:{ label:"The 3 a.m. fix",       len:"0:05", who:"Kiran", pitch:1.05, seed:19, text:"Remember the three a.m. fix? I still use that print statement trick. Every single week." },
  v_e_prof: { label:"Show me something you made", len:"0:04", who:"Prof. Shah", pitch:1.1, seed:23, text:"Busy is not the same as building. Show me something you made." },
  // The Company We Built
  v_c_sofia:{ label:"A no is a free lesson", len:"0:05", who:"Sofía", pitch:1.1, seed:37, text:"A no is a free lesson. Collect enough of them, and they become the plan." },
  v_c_inv:  { label:"The twelfth question", len:"0:04", who:"The twelfth investor", pitch:1, seed:41, text:"Before I say no. Who is your customer, really?" },
  // Ten Thousand Miles From Home
  v_l_liam: { label:"The first voicemail home", len:"0:08", who:"Liam", pitch:1, seed:43, text:"Hi Mum, it's me. I've landed. It's thirty degrees, and nobody here knows my name. I'm fine. I'll ring on Sunday." },
  v_l_mum:  { label:"Mum, every Sunday", len:"0:05", who:"Mum", pitch:.9, seed:47, text:"Did you eat properly? Ring on Sunday. And come home whenever you like." },
  // The Beginning of Us
  v_us_hello:{ label:"The beginning", len:"0:05", who:"Camille", pitch:1.15, seed:53, text:"This is us, at the very beginning. Don't skip the small parts." },
  v_n_taxi: { label:"From the taxi home", len:"0:08", who:"Noah", pitch:1, seed:59, text:"Okay. I'm in the taxi. I think that was the best night of my life. Don't be weird. Write it down." },
  v_c_cam:  { label:"Pay attention", len:"0:03", who:"Camille", pitch:1.15, seed:61, text:"Pay attention. You will want this later." },
  v_e_hack: { label:"Second place!",        len:"0:04", who:"The team", pitch:1.1, seed:31, text:"Second place! Second place! And they want to talk to us about an internship!" }
};

// The small picture on each sound-panel button: a face or a moment
// instead of a number.
const PICS = {
  v_cry:{ photo:"hand" }, v_night:{ photo:"clock" }, v_steps:{ photo:"feet" }, v_bday:{ photo:"cake" },
  v_fever:{ text:"39°", bg:"#B3261E" }, v_laugh:{ heart:true, bg:"#D9A0A8" },
  v_dadi:{ text:"D", bg:"#8E4B52" }, v_nana:{ text:"N", bg:"#3C4F5C" }, v_hello:{ heart:true, bg:"#C9A45C" },
  v_c_sofia:{ text:"S", bg:"#2B2E33" }, v_c_inv:{ text:"?", bg:"#B3261E" }, v_l_liam:{ photo:"suitcase" }, v_l_mum:{ text:"M", bg:"#2F4A5C" },
  v_us_hello:{ heart:true, bg:"#8E3B52" }, v_n_taxi:{ text:"N", bg:"#3C4F5C" }, v_c_cam:{ text:"C", bg:"#C26A6A" },
  v_e_hello:{ text:"M", bg:"#4E5A32" }, v_e_goal:{ photo:"robot" }, v_e_kiran:{ text:"K", bg:"#14A39B" }, v_e_prof:{ text:"S", bg:"#3C4F5C" }, v_e_hack:{ photo:"hack4" }
};
function picEl(id){
  const pc = PICS[id] || { text:"♪", bg:"#5E6050" };
  if (pc.photo) return pictureOf(pc.photo).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
  return `<span class="pic-t" style="background:${pc.bg}">${pc.heart ? '<svg><use href="#heart"/></svg>' : pc.text}</span>`;
}
// Small pictures printed on the flaps that open to the next layer.
const ICONS = {
  head:  '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M52 12C33 12 20 25 20 43c0 10 4 17 9 22v23h31V78h9c5 0 8-3 8-8V60l7-3-7-12C77 26 67 12 52 12z"/><circle cx="54" cy="40" r="9" fill="none" stroke="#1B2350" stroke-width="4" stroke-dasharray="4 4"/></svg>',
  heart: '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#heart"/></svg>',
  cross: '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M40 16h20v24h24v20H60v24H40V60H16V40h24z"/></svg>'
};
const ART = {
  notebook: '<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A small notebook with Fever log written on it"><rect width="200" height="140" fill="#1B2350"/><circle cx="30" cy="24" r="1.4" fill="#FFF7E8"/><circle cx="170" cy="112" r="1.2" fill="#FFF7E8"/><circle cx="160" cy="20" r="1" fill="#FFF7E8"/><rect x="58" y="16" width="86" height="110" rx="5" fill="#FFF7E8" transform="rotate(-4 100 70)"/><rect x="58" y="16" width="14" height="110" rx="3" fill="#E2533B" transform="rotate(-4 100 70)"/><g transform="rotate(-4 100 70)" stroke="#C9CFE8" stroke-width="2"><path d="M80 52h54M80 64h54M80 76h54M80 88h54M80 100h40"/></g><text x="106" y="40" transform="rotate(-4 100 70)" text-anchor="middle" font-family="Caveat, cursive" font-size="17" fill="#1B2350">Fever log</text></svg>'
};
const PANEL_POS = { right:"down the right edge", left:"down the left edge", bottom:"along the bottom edge", inside:"hidden inside the back cover" };

const KIARA_CHAPTERS = [
  { num:"0",   when:"Month 0",    title:"The day you arrived", sub:"Nobody hands you a manual", photo:"hand", cap:"4:52 a.m. · 2.9 kg · holding on already", voice:"v_cry", tone:"sun",
    behind:"Rohan took this with shaking hands. Just out of the frame: Dadi, already on the phone telling the whole family.",
    story:[["What happened","Kiara arrived at 4:52 in the morning after nineteen hours of labour, much louder than anyone expected."],["What I felt","Love, yes. And terror. The nurse showed me how to hold her head, then left the room. I didn’t move for an hour."]],
    lesson:"You don’t need to know everything on day one. You only need to show up for the next feed." },
  { num:"1–3", when:"Months 1–3", title:"The nights", sub:"Sleeping in two-hour pieces", photo:"clock", cap:"3:12 a.m., again", voice:"v_night", tone:"night",
    inside:{ title:"Inside a 3 a.m. feed", kind:"mind", lid:{ photo:"clock", label:"Lift" }, layers:[
      { h:"What you could see", t:"A quiet room. A warm bottle. A mother who looked calm.", lid:{ icon:"head", label:"Open my head" } },
      { h:"What I was thinking", t:"Is she breathing? Is she eating enough? Did I wash the bottle? Is this normal?", lid:{ icon:"heart", label:"Underneath" } },
      { h:"What I felt, underneath it all", t:"That I would do this a thousand more times. And I did." } ] },
    story:[["What happened","For eleven weeks we slept in two-hour pieces. I cried in the bathroom more than once, then went back in."],["What we tried","Rohan took the 2 a.m. feed. Everything changed that week."]],
    lesson:"Ask for help before you’re desperate." },
  { num:"8",   when:"Month 8",    title:"The fever", sub:"Two in the morning", photo:null, cap:"", voice:"v_fever", tone:"berry",
    scene:{ art:"drive", said:"We drove to the hospital in our night clothes, the thermometer still in my hand.", by:"Ananya" },
    inside:{ title:"Open the notebook", kind:"record", lid:{ art:"notebook", label:"Pull" }, layers:[
      { h:"What we wrote down", t:"01:10 feed, 90 ml · 01:40 paracetamol · 02:05 39.5° · 02:20 left for the hospital", mono:true, lid:{ icon:"cross", label:"The doctor" } },
      { h:"What the doctor said", t:"“These notes are the most useful thing you brought.”", lid:{ icon:"heart", label:"What it taught us" } },
      { h:"What it taught us", t:"Write things down. In a panic, your notes remember what you can’t." } ] },
    story:[["What happened","103°F at two in the morning. We drove to the hospital in our night clothes."],["What we tried","We had written down every feed and every temperature with the time. The doctor said it was the most useful thing we brought."]],
    lesson:"Write things down. In a panic, your notes remember what you can’t." },
  { num:"11",  when:"Month 11",   title:"First steps", sub:"Three of them, then the sofa", photo:"feet", cap:"Three steps, then straight into the sofa", voice:"v_steps", tone:"teal",
    behind:"Ananya dusted Kiara’s feet with talc so the floor would remember the exact path. It took an hour to clean.",
    story:[["What happened","She let go of the table, took three steps and fell into my arms."],["What I felt","Eleven months of tired nights, and this was the payoff."]],
    lesson:"She doesn’t need a perfect parent. She needs the same tired one, again and again." },
  { num:"12",  when:"Month 12",   title:"One year", sub:"And a letter for later", photo:"cake", cap:"Day 365", voice:"v_bday", tone:"pink",
    comic:{ title:"The party", layout:"grid", panels:[
      { art:"crowd", wide:true, cap:"10 a.m. The house fills up.", say:"Happy birthday, Kiara!" },
      { art:"gifts", cap:"Dadi brings three boxes. Kiara only wants the ribbon." },
      { art:"cake",  cap:"Cake. Both hands. No regrets." },
      { art:"dog",   cap:"Bruno takes the balloon.", say:"Bruno, NO!" },
      { art:"sleep", cap:"Asleep before the candle is out." } ] },
    behind:"Out of the frame: eleven relatives, one very excited dog, and Kiara with both hands already in the icing.",
    story:[["What happened","A small cake, one candle, and the whole family singing slightly off-key."]],
    lesson:"The year went slowly and then all at once. Write it down while it’s still slow." }
];


// Scene drawings: comic panels, drawings from memory and the engineering
// book's photos. In the real app these are generated from the person's
// photos and words; here they are simple flat drawings with ink outlines,
// so the colour / black-and-white / pencil treatments can be compared.
const INK = 'stroke="#22223A" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
function person(x, y, shirt, o = {}){
  const s = o.s || 1, skin = o.skin || "#D9A27E", hair = o.hair || "#2B2118";
  const arms = o.arms === "up" ? `<path d="M-12 -20L-24 -42M12 -20L24 -42" fill="none" ${INK}/>`
             : o.arms === "head" ? `<path d="M-12 -22L-17 -46M12 -22L17 -46" fill="none" ${INK}/>` : "";
  const mouth = o.sad ? '<path d="M-4 -34q4 -3 8 0" fill="none" stroke="#22223A" stroke-width="1.2"/>'
              : o.open ? '<ellipse cy="-35" rx="3" ry="2.4" fill="#22223A"/>'
              : '<path d="M-4 -36q4 3 8 0" fill="none" stroke="#22223A" stroke-width="1.2"/>';
  return `<g transform="translate(${x} ${y}) scale(${s})">${arms}<path d="M-15 0v-20a15 15 0 0 1 30 0V0z" fill="${shirt}" ${INK}/><circle cy="-40" r="10" fill="${skin}" ${INK}/><path d="M-10.5 -41a10.5 10.5 0 0 1 21 0c-5 -4 -15 -5 -21 0z" fill="${hair}" ${INK}/><circle cx="-3.5" cy="-39.5" r="1.1" fill="#22223A"/><circle cx="3.5" cy="-39.5" r="1.1" fill="#22223A"/>${mouth}</g>`;
}
const scene = (label, body) => `<svg viewBox="0 0 200 140" role="img" aria-label="${label}">${body}</svg>`;
const stars = '<g fill="#FFF7E8"><circle cx="20" cy="18" r="1.3"/><circle cx="58" cy="10" r="1"/><circle cx="96" cy="24" r="1.2"/><circle cx="132" cy="12" r="1"/><circle cx="74" cy="40" r=".9"/></g>';
Object.assign(ART, {
  crowd: scene("Family crowding into a room with balloons and bunting",
    `<rect width="200" height="140" fill="#FFE7B0"/><rect y="112" width="200" height="28" fill="#E8C48A"/><path d="M0 12Q100 34 200 12" fill="none" stroke="#22223A" stroke-width="1.2"/><path d="M20 16l7 12 7-10zM56 22l7 12 7-11zM93 24l7 12 7-12zM130 23l7 12 7-11zM166 18l7 12 7-10z" fill="#E2533B" ${INK}/><path d="M184 62v50M14 66v46" stroke="#22223A" stroke-width="1"/><ellipse cx="184" cy="52" rx="10" ry="12" fill="#5BB5E0" ${INK}/><ellipse cx="14" cy="56" rx="10" ry="12" fill="#FFC845" ${INK}/>${person(44, 122, "#E2533B", { arms:"up", open:1 })}${person(80, 122, "#14A39B", { hair:"#5A3A22" })}${person(118, 122, "#7C5CFF", { arms:"up", open:1, skin:"#C68B65" })}${person(156, 122, "#FFAE57", { hair:"#9A9A9A" })}`),
  gifts: scene("Three wrapped gift boxes and a baby reaching for the ribbon",
    `<rect width="200" height="140" fill="#F6E3E3"/><rect y="112" width="200" height="28" fill="#EBCFCF"/><rect x="40" y="72" width="50" height="40" fill="#5BB5E0" ${INK}/><rect x="61" y="72" width="8" height="40" fill="#FFF7E8" ${INK}/><rect x="88" y="84" width="36" height="28" fill="#FFC845" ${INK}/><rect x="102" y="84" width="7" height="28" fill="#E2533B" ${INK}/><rect x="52" y="46" width="30" height="26" fill="#E2533B" ${INK}/><rect x="64" y="46" width="6" height="26" fill="#FFC845" ${INK}/><path d="M67 46c-8-10-16-4-8 0M67 46c8-10 16-4 8 0" fill="none" ${INK}/><path d="M70 46C100 30 130 96 150 92" fill="none" stroke="#E2533B" stroke-width="3"/>${person(160, 122, "#FFAE57", { s:.75, arms:"up", open:1 })}`),
  dog: scene("A dog running off with a red balloon",
    `<rect width="200" height="140" fill="#DDEFF6"/><rect y="108" width="200" height="32" fill="#BFDCEA"/><path d="M58 92q-16-10-12-24" fill="none" ${INK}/><rect x="66" y="96" width="7" height="18" fill="#A0713F" ${INK}/><rect x="104" y="96" width="7" height="18" fill="#A0713F" ${INK}/><ellipse cx="88" cy="94" rx="32" ry="14" fill="#A0713F" ${INK}/><circle cx="124" cy="80" r="13" fill="#A0713F" ${INK}/><ellipse cx="118" cy="74" rx="5" ry="9" fill="#6E4A26" ${INK} transform="rotate(25 118 74)"/><circle cx="128" cy="78" r="1.6" fill="#22223A"/><circle cx="137" cy="83" r="2.4" fill="#22223A"/><path d="M134 86C150 70 150 50 160 36" fill="none" stroke="#22223A" stroke-width="1"/><ellipse cx="160" cy="24" rx="11" ry="13" fill="#E2533B" ${INK}/><path d="M157 37l3 3 3-3z" fill="#E2533B" ${INK}/>`),
  sleep: scene("A baby asleep in a cot under the moon",
    `<rect width="200" height="140" fill="#1B2350"/>${stars}<circle cx="170" cy="26" r="12" fill="#FFE7B0"/><circle cx="176" cy="22" r="10" fill="#1B2350"/><path d="M26 64h148M26 120h148" stroke="#FFE7B0" stroke-width="3"/><path d="M38 64v56M58 64v56M140 64v56M160 64v56" stroke="#FFE7B0" stroke-width="2"/><ellipse cx="74" cy="96" rx="24" ry="10" fill="#FFF7E8" ${INK}/><circle cx="74" cy="88" r="12" fill="#F2C4A6" ${INK}/><path d="M67 88q3 2 6 0M77 88q3 2 6 0" fill="none" stroke="#22223A" stroke-width="1.2"/><path d="M84 92Q120 76 152 92V112H84Z" fill="#FF8FB1" ${INK}/><text x="104" y="58" font-family="Fredoka, sans-serif" font-size="14" font-weight="700" fill="#FFC845">z z z</text>`),
  drive: scene("A car driving through the night towards a hospital",
    `<rect width="200" height="140" fill="#1B2350"/>${stars}<circle cx="40" cy="30" r="10" fill="#FFE7B0"/><rect y="104" width="200" height="36" fill="#2E3A5E"/><path d="M0 122h200" stroke="#FFE7B0" stroke-width="2" stroke-dasharray="12 10"/><rect x="132" y="38" width="58" height="68" fill="#DDE3F0" ${INK}/><rect x="152" y="46" width="18" height="18" fill="#E2533B"/><rect x="158" y="49" width="6" height="12" fill="#fff"/><rect x="155" y="52" width="12" height="6" fill="#fff"/><g fill="#FFC845"><rect x="138" y="72" width="8" height="8"/><rect x="176" y="72" width="8" height="8"/><rect x="138" y="88" width="8" height="8"/></g><path d="M112 90L146 80V108Z" fill="#FFE7B0" opacity=".45"/><path d="M22 104V90q0-6 6-7l14-2 10-12h32l12 12 14 2q4 1 4 7v14z" fill="#E2533B" ${INK}/><path d="M56 72h26l9 10H52z" fill="#9FC3E6" ${INK}/><circle cx="44" cy="105" r="8" fill="#22223A"/><circle cx="96" cy="105" r="8" fill="#22223A"/>`),
  robot: scene("A small line-following robot on a workbench",
    `<rect width="200" height="140" fill="#E9E4D8"/><rect y="86" width="200" height="54" fill="#C9B48E"/><path d="M6 124Q70 94 118 114T200 102" fill="none" stroke="#22223A" stroke-width="7"/><rect x="66" y="70" width="64" height="30" rx="4" fill="#14A39B" ${INK}/><rect x="74" y="60" width="34" height="12" fill="#F4F1E8" ${INK}/><path d="M80 60c0-10 18-12 22-2M90 60c2-8 14-6 14 2" fill="none" stroke="#E2533B" stroke-width="1.6"/><path d="M110 70c6-8 14-6 16 0" fill="none" stroke="#FFC845" stroke-width="1.6"/><circle cx="118" cy="66" r="3" fill="#E2533B" ${INK}/><circle cx="72" cy="102" r="9" fill="#22223A"/><circle cx="124" cy="102" r="9" fill="#22223A"/><rect x="128" y="94" width="16" height="6" fill="#3C4F5C" ${INK}/>`),
  hack1: scene("Three friends at a long table with laptops, a clock at six",
    `<rect width="200" height="140" fill="#E8EEF7"/><circle cx="174" cy="24" r="12" fill="#fff" ${INK}/><path d="M174 24v8M174 24v-8" stroke="#22223A" stroke-width="1.6"/>${person(50, 100, "#14A39B")}${person(100, 100, "#E2533B", { arms:"up", open:1 })}${person(150, 100, "#7C5CFF", { hair:"#5A3A22" })}<g fill="#B8C2D6" ${INK}><rect x="38" y="78" width="26" height="18"/><rect x="88" y="78" width="26" height="18"/><rect x="138" y="78" width="26" height="18"/></g><rect x="8" y="96" width="184" height="44" fill="#C9B48E" ${INK}/>`),
  hack2: scene("A laptop screen showing ERROR and two worried friends",
    `<rect width="200" height="140" fill="#2B2E44"/><rect x="52" y="18" width="96" height="62" rx="3" fill="#E2533B" ${INK}/><text x="100" y="56" text-anchor="middle" font-family="monospace" font-weight="700" font-size="16" fill="#fff">ERROR</text><path d="M40 80h120l8 12H32z" fill="#B8C2D6" ${INK}/>${person(26, 140, "#7C5CFF", { sad:1, s:.9 })}${person(176, 140, "#14A39B", { arms:"head", sad:1, s:.9 })}`),
  hack3: scene("A glass of chai beside a laptop at 3 a.m. with code on the screen",
    `<rect width="200" height="140" fill="#3B2F2A"/><rect x="84" y="24" width="96" height="62" rx="3" fill="#10151F" ${INK}/><g fill="#5BE08A"><rect x="92" y="34" width="40" height="4"/><rect x="100" y="44" width="54" height="4"/><rect x="100" y="54" width="30" height="4"/></g><text x="92" y="76" font-family="monospace" font-size="9" fill="#FFC845">print("here")</text><path d="M72 86h120l8 12H64z" fill="#B8C2D6" ${INK}/><path d="M24 64h34l-4 50H28z" fill="#C77B30" ${INK}/><path d="M24 64h34" stroke="#F4E3C9" stroke-width="4"/><path d="M34 56q-4-8 0-14M44 56q-4-8 0-14" fill="none" stroke="#F4E3C9" stroke-width="1.6"/><text x="160" y="118" text-anchor="middle" font-family="monospace" font-size="12" fill="#F4E3C9">3:00</text>`),
  hack4: scene("Friends cheering beside a second-place trophy",
    `<rect width="200" height="140" fill="#FFC845"/><path d="M100 60L0 0M100 60L60 0M100 60L140 0M100 60L200 0M100 60L0 80M100 60L200 80" stroke="#FFE08A" stroke-width="10"/><rect y="108" width="200" height="32" fill="#E2533B" ${INK}/><path d="M80 30h40v14q0 22-20 26q-20-4-20-26z" fill="#F4D06F" ${INK}/><path d="M80 36q-12 0-10 12q2 8 12 8M120 36q12 0 10 12q-2 8-12 8" fill="none" ${INK}/><rect x="94" y="70" width="12" height="14" fill="#F4D06F" ${INK}/><rect x="84" y="84" width="32" height="10" fill="#8C6F56" ${INK}/><text x="100" y="52" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="14" fill="#1B2350">2nd</text>${person(40, 116, "#14A39B", { arms:"up", open:1 })}${person(160, 116, "#7C5CFF", { arms:"up", open:1, hair:"#5A3A22" })}`),
  hack5: scene("Three old friends at a café table, years later",
    `<rect width="200" height="140" fill="#F4E3C9"/><path d="M0 18Q100 34 200 18" fill="none" stroke="#22223A" stroke-width="1"/><g fill="#FFC845"><circle cx="30" cy="23" r="3"/><circle cx="70" cy="28" r="3"/><circle cx="110" cy="29" r="3"/><circle cx="150" cy="26" r="3"/><circle cx="185" cy="21" r="3"/></g>${person(50, 104, "#14A39B", { hair:"#8A8A8A" })}${person(100, 104, "#E2533B")}${person(150, 104, "#7C5CFF", { hair:"#5A3A22" })}<rect x="20" y="100" width="160" height="10" fill="#8C6F56" ${INK}/><path d="M40 110v30M160 110v30" ${INK}/><g fill="#FFF7E8" ${INK}><rect x="62" y="88" width="10" height="12"/><rect x="112" y="88" width="10" height="12"/><rect x="136" y="88" width="10" height="12"/></g>`),
  room: scene("A hostel room at 2 a.m., a game on the laptop and a phone glowing",
    `<rect width="200" height="140" fill="#2E3A55"/><rect x="142" y="12" width="46" height="36" fill="#1B2350" ${INK}/><path d="M165 12v36M142 30h46" stroke="#22223A" stroke-width="1.4"/><circle cx="154" cy="22" r="5" fill="#FFE7B0"/><rect x="146" y="62" width="40" height="18" fill="#10151F" ${INK}/><text x="166" y="76" text-anchor="middle" font-family="monospace" font-size="12" fill="#E2533B">2:00</text><path d="M44 64L84 58 88 84 48 90z" fill="#FFE7B0" opacity=".25"/><rect x="8" y="88" width="118" height="30" fill="#8E9CC4" ${INK}/><rect x="12" y="78" width="30" height="12" rx="4" fill="#FFF7E8" ${INK}/><rect x="46" y="62" width="38" height="24" fill="#9FE3FF" ${INK}/><path d="M42 86h46l4 4H38z" fill="#B8C2D6" ${INK}/><rect x="96" y="76" width="10" height="16" rx="2" fill="#FFE7B0" ${INK}/><g ${INK}><rect x="144" y="112" width="40" height="8" fill="#E2533B"/><rect x="148" y="104" width="34" height="8" fill="#14A39B"/><rect x="146" y="96" width="36" height="8" fill="#FFC845"/></g>`),
  interview: scene("An interview: two interviewers across a desk from a candidate in a blazer",
    `<rect width="200" height="140" fill="#EDE7DA"/><rect x="0" y="0" width="200" height="16" fill="#D9D0BE"/>${person(42, 92, "#3C4F5C", { hair:"#8A8A8A" })}${person(78, 92, "#2B2E33")}${person(152, 92, "#1B2350", { skin:"#C68B65" })}<path d="M150 72l2 4 2-4 0 14-2 3-2-3z" fill="#E2533B"/><rect x="14" y="90" width="172" height="12" fill="#8C6F56" ${INK}/><path d="M24 102v38M176 102v38" ${INK}/><rect x="56" y="84" width="22" height="6" fill="#fff" ${INK}/>`),
  grad: scene("Graduates throwing their caps in the air",
    `<rect width="200" height="140" fill="#BFE0F2"/><rect y="112" width="200" height="28" fill="#8CC084"/><g fill="#1B2350" ${INK}><path d="M34 26l12-6 12 6-12 6z"/><path d="M90 14l12-6 12 6-12 6z"/><path d="M146 24l12-6 12 6-12 6z"/><path d="M118 40l10-5 10 5-10 5z"/></g><path d="M58 26v8M114 14v8" stroke="#FFC845" stroke-width="1.4"/>${person(50, 124, "#1B2350", { arms:"up", open:1 })}${person(100, 124, "#1B2350", { arms:"up", open:1, skin:"#C68B65" })}${person(150, 124, "#1B2350", { arms:"up", open:1, hair:"#5A3A22" })}`)
});
// Any picture by name: a placeholder photo or a drawing.
// Each copy of a drawing gets its own ids: the same picture can appear on
// several pages (and hidden screens), and shared ids would break its
// gradients and masks.
let _uid = 0;
function uniq(svg){
  if (!svg || svg.indexOf('id="') < 0) return svg;
  const n = ++_uid, ids = [...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  ids.forEach(id => { svg = svg.split(`id="${id}"`).join(`id="${id}_${n}"`).split(`url(#${id})`).join(`url(#${id}_${n})`); });
  return svg;
}
const pictureOf = k => uniq(PHOTOS[k] || ART[k]);

const ENG_CHAPTERS = [
  { num:"I", when:"Years 1–4", title:"The goal I nearly lost", sub:"Skills", photo:"robot", cap:"Second year · the line-follower that finally followed the line", voice:"v_e_goal", tone:"sun",
    behind:"Built from a ₹600 kit and parts from the scrap room. It took three weeks and two burnt motor drivers.",
    story:[["What happened","Engineering gives you four years and a hundred reasons to spend them on something else: marks for their own sake, trends, whatever everyone around you is doing."],["What I tried","I kept coming back to one question: what can I build that a real company would need?"]],
    lesson:"Never divert from the goal. Use the four years to build real industry skills." },
  { num:"II", when:"Year 2", title:"Friends with a vision", sub:"People", photo:null, voice:"v_e_kiran", tone:"teal",
    comic:{ title:"36 hours in Hall B", layout:"splash", voice:"v_e_hack", panels:[
      { art:"hack1", wide:true, cap:"Friday, 6 p.m. Six of us, one idea, no sleep planned.", say:"We build it tonight." },
      { art:"hack2", cap:"Midnight. The demo crashes.", say:"It worked an hour ago!" },
      { art:"hack3", cap:"3 a.m. Kiran fixes it with chai and one print statement." },
      { art:"hack4", cap:"Sunday. Second place, and an internship offer." },
      { art:"hack5", cap:"Ten years on, we still meet every December." } ] },
    story:[["What happened","In second year I found five people who wanted to build things, not just pass exams. We entered every hackathon we could find."],["What I felt","For the first time, the work felt like ours."]],
    lesson:"Build a network of good friends who have a vision and actually work for it." },
  { num:"III", when:"Year 3", title:"Busy is not the same as building", sub:"Distractions", photo:null, voice:"v_e_prof", tone:"night",
    scene:{ art:"room", said:"Two in the morning: a game on the laptop, reels on the phone, and an assignment due at nine.", by:"Madhukar" },
    story:[["What happened","Third year was the year of almost. Almost started the project, almost applied, almost finished the course."],["What changed it","Prof. Shah handed back my assignment with one line on it: show me something you made."]],
    lesson:"Busy is not the same as building." },
  { num:"IV", when:"Final year", title:"What I’d tell my first-year self", sub:"Hindsight", photo:"grad", cap:"Convocation · four years in one photo", voice:null, tone:"pink",
    inside:{ title:"Inside my first interview", kind:"mind", points:[[32, 27], [74, 19], [74, 41]], lid:{ art:"interview", label:"Lift" }, layers:[
      { h:"What they could see", t:"A calm candidate in a borrowed blazer, answering clearly.", lid:{ icon:"head", label:"Open my head" } },
      { h:"What I was thinking", t:"Don’t say “I don’t know”. Was that the right complexity? Is my résumé printed straight?", lid:{ icon:"heart", label:"Underneath" } },
      { h:"What I felt, underneath it all", t:"For the first time, that four years had actually added up to something." } ] },
    story:[["What I’d do differently","Start building real things in the first year, not the last one."],["If you’re starting now","Every semester, ask yourself: what can I do today that I couldn’t do six months ago?"]],
    lesson:"There’s less time than you think, and it’s enough if you start now." }
];

// More drawings for the other sample books.
const scene2 = (w, h, label, body) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
Object.assign(ART, {
  garage: scene("Four founders around a folding table in a garage",
    `<rect width="200" height="140" fill="#D9D4C7"/><g stroke="#B9B2A2" stroke-width="2"><path d="M0 14h200M0 28h200M0 42h200M0 56h200M0 70h200"/></g><rect x="150" y="16" width="34" height="22" fill="#FFF7E8" ${INK}/><text x="167" y="31" text-anchor="middle" font-family="monospace" font-size="7" fill="#22223A">v0.1</text>${person(40, 104, "#2B2E33")}${person(80, 104, "#B3261E", { arms:"up", open:1 })}${person(120, 104, "#14A39B", { hair:"#5A3A22" })}${person(160, 104, "#7C5CFF", { skin:"#C68B65" })}<g fill="#B8C2D6" ${INK}><rect x="60" y="84" width="24" height="16"/><rect x="112" y="84" width="24" height="16"/></g><rect x="14" y="100" width="172" height="8" fill="#8C6F56" ${INK}/><path d="M30 108l-10 32M170 108l10 32M30 108l10 32M170 108l-10 32" ${INK}/>`),
  payslip: scene("A payroll sheet on a desk at night, a phone showing the bank balance",
    `<rect width="200" height="140" fill="#2B2E33"/><rect x="34" y="14" width="96" height="118" fill="#FAFAF8" ${INK} transform="rotate(-4 82 73)"/><g transform="rotate(-4 82 73)"><text x="44" y="32" font-family="monospace" font-size="8" font-weight="700" fill="#22223A">PAYROLL · MARCH</text><g stroke="#C9CCD3" stroke-width="2"><path d="M44 44h76M44 56h76M44 68h76M44 80h76M44 92h76M44 104h52"/></g><text x="44" y="122" font-family="monospace" font-size="8" fill="#B3261E">DUE: FRIDAY</text></g><rect x="138" y="54" width="40" height="70" rx="6" fill="#10151F" ${INK}/><text x="158" y="84" text-anchor="middle" font-family="monospace" font-size="7" fill="#E2533B">9 days</text><text x="158" y="96" text-anchor="middle" font-family="monospace" font-size="6" fill="#B8C2D6">of cash</text>`),
  firstsale: scene("A laptop showing a payment from a stranger, confetti around it",
    `<rect width="200" height="140" fill="#F1EFEA"/><g fill="#E2533B"><rect x="20" y="20" width="5" height="5" transform="rotate(20 22 22)"/><rect x="170" y="30" width="5" height="5" transform="rotate(40 172 32)"/></g><g fill="#14A39B"><rect x="40" y="110" width="5" height="5"/><rect x="176" y="96" width="5" height="5" transform="rotate(15 178 98)"/></g><g fill="#FFC845"><circle cx="30" cy="70" r="3"/><circle cx="160" cy="16" r="3"/></g><rect x="46" y="22" width="108" height="70" rx="4" fill="#2B2E33" ${INK}/><rect x="56" y="38" width="88" height="36" rx="4" fill="#fff" ${INK}/><circle cx="68" cy="56" r="6" fill="#14A39B"/><path d="M65 56l2 2 4-4" fill="none" stroke="#fff" stroke-width="1.6"/><text x="78" y="52" font-family="Commissioner, sans-serif" font-size="7" font-weight="700" fill="#22223A">Payment received</text><text x="78" y="63" font-family="Commissioner, sans-serif" font-size="6.5" fill="#55585F">₹2,400 · from a stranger</text><path d="M34 92h132l10 14H24z" fill="#B8C2D6" ${INK}/>`),
  suitcase: scene("A packed suitcase with a luggage tag in an airport",
    `<rect width="200" height="140" fill="#E6E9EC"/><rect y="104" width="200" height="36" fill="#CDD3D8"/><path d="M0 104h200" stroke="#B4BCC3"/><rect x="62" y="40" width="76" height="70" rx="8" fill="#2F4A5C" ${INK}/><path d="M84 40v-10h32v10" fill="none" ${INK}/><path d="M74 46v58M126 46v58" stroke="#22303A" stroke-width="3"/><circle cx="76" cy="114" r="5" fill="#22223A"/><circle cx="124" cy="114" r="5" fill="#22223A"/><rect x="98" y="58" width="22" height="14" rx="2" fill="#E2533B" transform="rotate(-8 109 65)" ${INK}/><rect x="70" y="80" width="16" height="16" rx="8" fill="#FFC845" ${INK}/><path d="M138 52q14 4 18 18" fill="none" stroke="#22223A" stroke-width="1"/><rect x="146" y="68" width="24" height="16" rx="2" fill="#FFF7E8" ${INK} transform="rotate(12 158 76)"/><text x="158" y="80" text-anchor="middle" font-family="monospace" font-size="7" font-weight="700" fill="#22223A" transform="rotate(12 158 76)">23 kg</text>`),
  tram: scene("A tram stop at four in the afternoon, already dark, one person under a streetlight",
    `<rect width="200" height="140" fill="#1F2A3A"/><g stroke="#3A4A63" stroke-width="1"><path d="M10 0l-6 140M40 0l-6 140M70 0l-6 140M100 0l-6 140M130 0l-6 140M160 0l-6 140M190 0l-6 140"/></g><rect y="110" width="200" height="30" fill="#151D29"/><path d="M0 116h200" stroke="#4A5A73" stroke-width="2"/><rect x="18" y="56" width="110" height="46" rx="8" fill="#2E7D5B" ${INK}/><g fill="#FFE7B0"><rect x="28" y="64" width="18" height="16" rx="2"/><rect x="52" y="64" width="18" height="16" rx="2"/><rect x="76" y="64" width="18" height="16" rx="2"/><rect x="100" y="64" width="18" height="16" rx="2"/></g><text x="30" y="96" font-family="monospace" font-size="8" fill="#FFE7B0">86</text><path d="M160 30v80" stroke="#8A93A6" stroke-width="2"/><path d="M150 30h20l-4 6h-12z" fill="#FFE7B0"/><path d="M146 36L174 36 190 110H130z" fill="#FFE7B0" opacity=".18"/>${person(160, 112, "#E2533B", { s:.8 })}`),
  train: scene2(296, 210, "Two seats by a train window at golden hour, two coffees on the sill",
    `<defs><linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9EEF4"/><stop offset=".6" stop-color="#F6DCCB"/><stop offset="1" stop-color="#F9E9D6"/></linearGradient></defs><rect width="296" height="210" fill="#F4ECE6"/><rect x="18" y="16" width="260" height="150" rx="20" fill="url(#dusk)"/><circle cx="214" cy="112" r="17" fill="#FBE3C2"/><circle cx="214" cy="112" r="30" fill="#FBE3C2" opacity=".35"/><path d="M18 134Q80 116 140 128T278 122V166H18z" fill="#E6D3D6"/><path d="M18 150Q100 138 170 148T278 146V166H18z" fill="#D9C3C9"/><g stroke="#CDB9BD" stroke-width="1"><path d="M70 166V120M190 166V116"/><path d="M70 122Q130 132 190 118" fill="none"/></g><rect x="18" y="16" width="260" height="150" rx="20" fill="none" stroke="#E2D4CC" stroke-width="7"/><path d="M148 16v150" stroke="#E2D4CC" stroke-width="7"/><rect x="0" y="166" width="296" height="44" fill="#EADCD3"/><rect x="0" y="166" width="296" height="4" fill="#F4EAE3"/><g stroke="#B9A29A" stroke-width="1.2"><path d="M96 150h16l-2 16h-12z" fill="#FFFFFF"/><path d="M184 150h16l-2 16h-12z" fill="#FFFFFF"/></g><path d="M100 144q2-5 0-9M188 144q2-5 0-9" fill="none" stroke="#C7B3AC" stroke-width="1.2"/>`),
  harbour: scene2(600, 200, "The harbour at blue hour: lamps along the wall, the city across the water, two people walking",
    `<defs><linearGradient id="hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDE3EF"/><stop offset=".6" stop-color="#EFE0E4"/><stop offset="1" stop-color="#F7E6DC"/></linearGradient><radialGradient id="hl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F6CF9A" stop-opacity=".7"/><stop offset="1" stop-color="#F6CF9A" stop-opacity="0"/></radialGradient></defs><rect width="600" height="200" fill="url(#hb)"/><circle cx="520" cy="44" r="12" fill="#FFF8EC"/><path d="M0 104Q60 90 120 98T260 92T400 96T600 90V114H0z" fill="#CFC6D6"/><g fill="#E8B98A"><rect x="40" y="96" width="2" height="3"/><rect x="150" y="95" width="2" height="3"/><rect x="250" y="92" width="2" height="3"/><rect x="360" y="94" width="2" height="3"/><rect x="470" y="91" width="2" height="3"/></g><rect y="112" width="600" height="46" fill="#D8DCE7"/><g stroke="#E9C49C" stroke-width="1.6" opacity=".7"><path d="M80 118v24M200 118v20M320 118v26M440 118v20M560 118v24"/></g><rect y="156" width="600" height="44" fill="#EDE3DE"/><path d="M0 156h600" stroke="#D8C9C2" stroke-width="2"/><g stroke="#A89A9E" stroke-width="1.6"><path d="M80 156V112M200 156V112M320 156V112M440 156V112M560 156V112"/></g><g fill="url(#hl)"><circle cx="80" cy="110" r="20"/><circle cx="200" cy="110" r="20"/><circle cx="320" cy="110" r="20"/><circle cx="440" cy="110" r="20"/><circle cx="560" cy="110" r="20"/></g><g fill="#F2C88E"><circle cx="80" cy="110" r="3.5"/><circle cx="200" cy="110" r="3.5"/><circle cx="320" cy="110" r="3.5"/><circle cx="440" cy="110" r="3.5"/><circle cx="560" cy="110" r="3.5"/></g><path d="M250 142l40-4 6 8h-52z" fill="#B8ACB4"/><path d="M270 138v-20l14 16z" fill="#FFFFFF" stroke="#B8ACB4"/><g fill="#6E5A64"><circle cx="376" cy="139" r="4.6"/><path d="M370.5 156v-11q5.5-5.5 11 0v11z"/><circle cx="392" cy="137" r="5"/><path d="M386 156v-12q6-6 12 0v12z"/></g>`)
});

/* Portraits for family trees. In the real app each medallion holds the
   person's own photo; here a drawn portrait stands in: face, hair by age
   and style, clothes, glasses or a bindi where the family chose them. */
let _pid = 0;
function portrait(f = {}){
  const id = "pt" + (++_pid);
  const skin = f.skin || "#D9A27E", age = f.age || "adult", g = f.g || "f";
  const hair = f.hair || (age === "old" ? "#D8D4CC" : age === "elder" ? "#9A948A" : "#2B2118");
  const shirt = f.shirt || (g === "f" ? "#B4566E" : "#3C4F5C"), bg = f.bg || "#EFE4D2";
  const shade = "rgba(0,0,0,.12)";
  let back = "", front = "";
  if (g === "f"){
    if (f.style === "bun") front = `<circle cx="50" cy="24" r="10" fill="${hair}"/><path d="M28 46q0-24 22-24t22 24q-6-12-22-12t-22 12z" fill="${hair}"/>`;
    else if (f.style === "short") front = `<path d="M27 48q-2-28 23-28t23 28q-4-14-23-15q-19 1-23 15z" fill="${hair}"/>`;
    else { back = `<path d="M24 50q-4 30 6 40h40q10-10 6-40q-2-30-26-30t-26 30z" fill="${hair}"/>`; front = `<path d="M27 47q0-26 23-26t23 26q-8-14-23-14t-23 14z" fill="${hair}"/>`; }
  } else {
    if (age === "old" && f.style !== "full") front = `<path d="M28 44q2-8 6-10M72 44q-2-8-6-10" stroke="${hair}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    else front = `<path d="M28 44q-1-24 22-24t22 24q-4-10-22-11q-18 1-22 11z" fill="${hair}"/>`;
  }
  const baby = age === "baby";
  const head = baby ? `<ellipse cx="50" cy="50" rx="19" ry="18" fill="${skin}"/>` : `<ellipse cx="50" cy="48" rx="20" ry="23" fill="${skin}"/>`;
  const eyes = baby ? `<path d="M41 50q3 2 6 0M53 50q3 2 6 0" stroke="#3A2A22" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
                    : `<circle cx="42" cy="47" r="1.9" fill="#2A1E18"/><circle cx="58" cy="47" r="1.9" fill="#2A1E18"/><path d="M38 41q4-2 8 0M54 41q4-2 8 0" stroke="${age === "old" ? "#B8B2A8" : "#3A2A22"}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  const mouth = `<path d="M44 ${baby ? 58 : 59}q6 ${baby ? 4 : 4} 12 0" stroke="#8E3B3B" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const extra = (f.glasses ? `<g fill="none" stroke="#3A2A22" stroke-width="1.4"><circle cx="42" cy="47" r="5.5"/><circle cx="58" cy="47" r="5.5"/><path d="M47.5 47h5"/></g>` : "")
              + (f.bindi ? `<circle cx="50" cy="38" r="1.6" fill="#B3261E"/>` : "")
              + (age === "old" ? `<path d="M36 55q3 3 6 3M64 55q-3 3-6 3" stroke="${shade}" stroke-width="1.2" fill="none"/>` : "")
              + (f.beard ? `<path d="M31 52q2 22 19 24q17-2 19-24q-6 10-19 10t-19-10z" fill="${hair}"/>` : "");
  const body = `<path d="M14 100q2-26 36-28q34 2 36 28z" fill="${shirt}"/><path d="M43 68h14v8q-7 5-14 0z" fill="${skin}"/>`
             + (f.pallu ? `<path d="M50 74q22-2 34 26H66q-4-14-16-20z" fill="${f.pallu}"/>` : "");
  return `<svg viewBox="0 0 100 100" class="portrait" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath><radialGradient id="${id}g" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><g clip-path="url(#${id})"><rect width="100" height="100" fill="${bg}"/><rect width="100" height="100" fill="url(#${id}g)"/>${back}${body}${head}${eyes}${mouth}${front}${extra}</g></svg>`;
}

// Comic-book panels for The Company We Built.
Object.assign(ART, {
  smoke: scene("A laptop smoking on a folding table, a founder with hands on her head",
    `<rect width="200" height="140" fill="#FFD23F"/><path d="M100 70L20 0M100 70L80 0M100 70L140 0M100 70L200 10M100 70L200 70M100 70L0 60" stroke="#FFE680" stroke-width="12"/><rect x="40" y="96" width="120" height="10" fill="#8C6F56" ${INK}/><path d="M66 66h68v30H66z" fill="#2B2E33" ${INK}/><path d="M58 96h84l6 8H52z" fill="#B8C2D6" ${INK}/><g fill="#6E6E7A" opacity=".85"><circle cx="96" cy="52" r="9"/><circle cx="108" cy="40" r="11"/><circle cx="96" cy="26" r="8"/><circle cx="112" cy="18" r="6"/></g>${person(168, 132, "#B3261E", { arms:"head", open:1 })}`),
  mama: scene("Mamá arriving at the garage at night with a plate of empanadas",
    `<rect width="200" height="140" fill="#1D5FD8"/><g fill="#FFF6DC" opacity=".9"><circle cx="20" cy="20" r="1.4"/><circle cx="60" cy="12" r="1.2"/><circle cx="170" cy="26" r="1.4"/></g><rect x="120" y="20" width="70" height="110" fill="#E9D8B0" ${INK}/><rect x="128" y="30" width="54" height="70" fill="#FFE7B0"/>${person(70, 136, "#E2262E", { hair:"#8A8A8A", open:1 })}<ellipse cx="96" cy="94" rx="22" ry="6" fill="#fff" ${INK}/><g fill="#E7A94B" ${INK}><path d="M80 92q8-10 16 0z"/><path d="M92 90q8-10 16 0z"/><path d="M86 86q8-10 16 0z"/></g><path d="M100 70q4-8 0-14M108 70q4-8 0-14" fill="none" stroke="#fff" stroke-width="1.6"/>`),
  argue: scene("Two founders arguing across a whiteboard full of crossed-out names at 3 a.m.",
    `<rect width="200" height="140" fill="#F2F2F2"/><rect x="44" y="12" width="112" height="62" fill="#fff" ${INK}/><g font-family="Bangers, Impact, sans-serif" font-size="11" fill="#14141C"><text x="54" y="30">ORBIT</text><text x="104" y="30">NIDO</text><text x="54" y="48">KASA</text><text x="104" y="48">PAGO</text><text x="76" y="66" fill="#E2262E">???</text></g><path d="M52 26h40M100 26h40M52 44h40M100 44h40" stroke="#E2262E" stroke-width="2"/>${person(36, 140, "#1D5FD8", { arms:"up", open:1 })}${person(164, 140, "#E2262E", { arms:"up", open:1, hair:"#5A3A22" })}`),
  demo: scene("The first demo on a screen, four founders cheering",
    `<rect width="200" height="140" fill="#E2262E"/><path d="M100 50L0 0M100 50L60 0M100 50L140 0M100 50L200 0M100 50L0 90M100 50L200 90" stroke="#F0504F" stroke-width="12"/><rect x="58" y="14" width="84" height="54" rx="3" fill="#14141C" ${INK}/><text x="100" y="47" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="20" fill="#FFD23F">IT WORKS</text>${person(34, 140, "#FFD23F", { arms:"up", open:1 })}${person(78, 140, "#1D5FD8", { arms:"up", open:1, hair:"#5A3A22" })}${person(122, 140, "#14A39B", { arms:"up", open:1 })}${person(166, 140, "#7C5CFF", { arms:"up", open:1, skin:"#C68B65" })}`),
  who: scene("Two founders staring at a name on a screen, shrugging",
    `<rect width="200" height="140" fill="#FFF6DC"/><rect x="66" y="16" width="68" height="44" rx="3" fill="#fff" ${INK}/><text x="100" y="36" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="8" font-weight="700" fill="#14141C">From: R. Kulkarni</text><text x="100" y="50" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="7" fill="#55585F">Pune · ₹2,400</text>${person(48, 140, "#E2262E", { arms:"up" })}${person(152, 140, "#1D5FD8", { arms:"up", hair:"#5A3A22" })}`),
  taped: scene("The first payment, printed and taped to the garage wall above the folding table",
    `<rect width="200" height="140" fill="#D9D4C7"/><g stroke="#B9B2A2" stroke-width="2"><path d="M0 20h200M0 40h200M0 60h200M0 80h200"/></g><rect x="64" y="18" width="72" height="54" fill="#fff" ${INK} transform="rotate(-3 100 45)"/><g transform="rotate(-3 100 45)"><text x="100" y="40" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="8" font-weight="700" fill="#14A39B">Payment received</text><text x="100" y="54" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="8" fill="#14141C">₹2,400</text></g><g fill="rgba(240,220,150,.85)"><rect x="56" y="12" width="20" height="8" transform="rotate(-30 66 16)"/><rect x="124" y="12" width="20" height="8" transform="rotate(25 134 16)"/></g><rect x="20" y="104" width="160" height="10" fill="#8C6F56" ${INK}/>`),
  pizza: scene("Four founders sharing a pizza on the folding table",
    `<rect width="200" height="140" fill="#14141C"/><circle cx="100" cy="44" r="26" fill="#FFD23F" opacity=".2"/>${person(36, 112, "#E2262E", { open:1 })}${person(78, 112, "#1D5FD8", { hair:"#5A3A22" })}${person(122, 112, "#14A39B", { open:1 })}${person(164, 112, "#7C5CFF", { skin:"#C68B65" })}<rect x="14" y="108" width="172" height="10" fill="#8C6F56" ${INK}/><ellipse cx="100" cy="106" rx="34" ry="8" fill="#E7A94B" ${INK}/><g fill="#E2262E"><circle cx="88" cy="105" r="2.5"/><circle cx="104" cy="103" r="2.5"/><circle cx="114" cy="107" r="2.5"/></g>`)
});

// Cover art: painted, lit, layered — the cover is the first thing anyone sees.
const sparkle = (x, y, r, o = 1) => `<path d="M${x} ${y - r}C${x + r * .15} ${y - r * .15} ${x + r * .15} ${y - r * .15} ${x + r} ${y}C${x + r * .15} ${y + r * .15} ${x + r * .15} ${y + r * .15} ${x} ${y + r}C${x - r * .15} ${y + r * .15} ${x - r * .15} ${y + r * .15} ${x - r} ${y}C${x - r * .15} ${y - r * .15} ${x - r * .15} ${y - r * .15} ${x} ${y - r}Z" fill="#FFF4D6" opacity="${o}"/>`;
const starfield = (n, w, h, seed) => { let x = seed, out = ""; for (let i = 0; i < n; i++){ x = (x * 9301 + 49297) % 233280; const px = x / 233280 * w; x = (x * 9301 + 49297) % 233280; const py = x / 233280 * h; x = (x * 9301 + 49297) % 233280; out += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(.4 + x / 233280 * 1.1).toFixed(2)}" fill="#FFF7E0" opacity="${(.35 + x / 233280 * .6).toFixed(2)}"/>`; } return out; };
Object.assign(ART, {
  moonCradle: `<svg viewBox="0 0 300 420" role="img" aria-label="A baby asleep in the curve of a glowing crescent moon among clouds and stars"><defs><linearGradient id="kSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1236"/><stop offset=".55" stop-color="#1F2A66"/><stop offset="1" stop-color="#4A4C96"/></linearGradient><radialGradient id="kGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE7A3" stop-opacity=".55"/><stop offset=".6" stop-color="#FFE7A3" stop-opacity=".12"/><stop offset="1" stop-color="#FFE7A3" stop-opacity="0"/></radialGradient><linearGradient id="kMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6D2"/><stop offset=".6" stop-color="#F6D58A"/><stop offset="1" stop-color="#E3A94E"/></linearGradient><mask id="kCres"><rect width="300" height="420" fill="#000"/><circle cx="150" cy="268" r="96" fill="#fff"/><circle cx="186" cy="238" r="84" fill="#000"/></mask><linearGradient id="kCloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9E6FF"/><stop offset="1" stop-color="#A9A6DE"/></linearGradient><linearGradient id="kBlanket" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC9D6"/><stop offset="1" stop-color="#E88AA4"/></linearGradient></defs><rect width="300" height="420" fill="url(#kSky)"/>${starfield(90, 300, 300, 7)}${sparkle(52, 196, 7, .9)}${sparkle(250, 170, 9)}${sparkle(232, 92, 5, .8)}${sparkle(70, 120, 4, .7)}<circle cx="150" cy="268" r="150" fill="url(#kGlow)"/><circle cx="150" cy="268" r="96" fill="url(#kMoon)" mask="url(#kCres)"/><g transform="translate(96 300) rotate(-28)"><ellipse cx="34" cy="10" rx="40" ry="14" fill="url(#kBlanket)"/><path d="M-2 10q36 -22 74 0" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><circle cx="-6" cy="2" r="13" fill="#F3C7A5"/><path d="M-12 1q3 2 6 0" stroke="#5A3A2A" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M-18 -6q6 -12 18 -6" fill="#3A2A22"/><circle cx="-9" cy="8" r="2" fill="#F2A3A3" opacity=".7"/></g><g opacity=".95"><path d="M-20 392q30-40 70-26q16-30 54-18q24-26 60-8q30-20 64 4q34-4 92 20v56H-20z" fill="url(#kCloud)"/><path d="M-20 410q40-26 90-14q30-18 70-4q40-14 80 2q40-10 100 8v18H-20z" fill="#C8C4F2"/></g><text x="196" y="330" font-family="Fredoka, sans-serif" font-size="14" font-weight="600" fill="#FFF4D6" opacity=".8">z</text><text x="210" y="314" font-family="Fredoka, sans-serif" font-size="10" font-weight="600" fill="#FFF4D6" opacity=".6">z</text></svg>`,
  harbourCover: `<svg viewBox="0 0 300 420" role="img" aria-label="Two people walking along a harbour at night, lamps glowing on the water"><defs><linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1030"/><stop offset=".45" stop-color="#4A2347"/><stop offset=".7" stop-color="#9A4A5C"/><stop offset=".82" stop-color="#E7A27E"/></linearGradient><linearGradient id="hSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2040"/><stop offset="1" stop-color="#140B1E"/></linearGradient><radialGradient id="hLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".9"/><stop offset=".35" stop-color="#FFB870" stop-opacity=".35"/><stop offset="1" stop-color="#FFB870" stop-opacity="0"/></radialGradient><radialGradient id="hMoon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF3DA"/><stop offset=".5" stop-color="#FFF3DA" stop-opacity=".25"/><stop offset="1" stop-color="#FFF3DA" stop-opacity="0"/></radialGradient></defs><rect width="300" height="420" fill="url(#hSky)"/>${starfield(50, 300, 150, 13)}<circle cx="226" cy="118" r="40" fill="url(#hMoon)"/><circle cx="226" cy="118" r="13" fill="#FFF3DA"/><path d="M0 262q30-14 60-8t70-10 80 6 90-6v26H0z" fill="#2A1530"/><g fill="#FFCF8A"><rect x="18" y="252" width="2" height="3"/><rect x="40" y="249" width="2" height="3"/><rect x="66" y="254" width="2" height="3"/><rect x="110" y="246" width="2" height="3"/><rect x="150" y="250" width="2" height="3"/><rect x="190" y="248" width="2" height="3"/><rect x="232" y="251" width="2" height="3"/><rect x="270" y="247" width="2" height="3"/></g><rect y="270" width="300" height="150" fill="url(#hSea)"/><g fill="#FFC98A"><rect x="222" y="278" width="8" height="2" opacity=".7"/><rect x="216" y="290" width="20" height="1.6" opacity=".5"/><rect x="220" y="302" width="12" height="1.6" opacity=".45"/><rect x="212" y="316" width="28" height="1.4" opacity=".35"/><rect x="58" y="300" width="4" height="60" opacity=".22"/><rect x="128" y="296" width="4" height="70" opacity=".2"/></g><circle cx="60" cy="282" r="44" fill="url(#hLamp)"/><circle cx="130" cy="276" r="40" fill="url(#hLamp)"/><path d="M60 360V284M130 360V280" stroke="#1A0F1F" stroke-width="3"/><circle cx="60" cy="282" r="5" fill="#FFE2B0"/><circle cx="130" cy="278" r="5" fill="#FFE2B0"/><path d="M0 360h300v60H0z" fill="#120A18"/><path d="M0 356h300" stroke="#3A2440" stroke-width="3"/><g stroke="#2A1A30" stroke-width="2"><path d="M0 344h300M20 344v12M70 344v12M120 344v12M170 344v12M220 344v12M270 344v12"/></g><g fill="#0A060E"><circle cx="186" cy="320" r="6"/><path d="M179 360v-28q7-7 14 0v28z"/><circle cx="203" cy="317" r="6.4"/><path d="M196 360v-30q7-7 14 0v30z"/><path d="M192 336h5" stroke="#0A060E" stroke-width="3"/></g></svg>`,
  garageHero: `<svg viewBox="0 0 300 260" role="img" aria-label="Four founders silhouetted in the open door of a lit garage at dusk, the city behind them"><defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D3FA8"/><stop offset=".6" stop-color="#E2262E"/><stop offset="1" stop-color="#FF9A3C"/></linearGradient><linearGradient id="gLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4B8"/><stop offset="1" stop-color="#FFD23F" stop-opacity=".2"/></linearGradient></defs><rect width="300" height="260" fill="url(#gSky)"/><g fill="#14141C" opacity=".85"><rect x="0" y="120" width="26" height="80"/><rect x="24" y="96" width="20" height="104"/><rect x="44" y="132" width="30" height="68"/><rect x="230" y="90" width="22" height="110"/><rect x="252" y="118" width="26" height="82"/><rect x="276" y="104" width="24" height="96"/></g><path d="M70 200V96l80-44 80 44v104z" fill="#2B2E33" stroke="#14141C" stroke-width="4"/><path d="M96 200V120h108v80z" fill="url(#gLight)"/><g stroke="#14141C" stroke-width="2" opacity=".35"><path d="M96 132h108M96 144h108"/></g><path d="M96 200L40 260h220l-56-60z" fill="#FFD23F" opacity=".35"/><g fill="#14141C"><circle cx="118" cy="160" r="7"/><path d="M110 200v-30q8-8 16 0v30z"/><circle cx="140" cy="156" r="7.5"/><path d="M132 200v-32q8-8 16 0v32z"/><circle cx="162" cy="158" r="7"/><path d="M154 200v-31q8-8 16 0v31z"/><circle cx="184" cy="161" r="6.8"/><path d="M176 200v-29q8-8 16 0v29z"/></g><rect y="200" width="300" height="60" fill="#14141C"/><path d="M110 200l-30 60M132 200l-22 60M154 200l-6 60M176 200l12 60" stroke="#FFD23F" stroke-width="2" opacity=".25"/></svg>`,
  emblemCompass: `<svg viewBox="0 0 200 200" class="emblem" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="100" cy="100" r="88" stroke-width="1.4"/><circle cx="100" cy="100" r="80" stroke-width=".8" stroke-dasharray="1 4"/><path d="M100 30l7 9h-14zM100 170l7-9h-14zM30 100l9 7v-14zM170 100l-9 7v-14z" fill="currentColor" stroke="none"/><path d="M100 46l12 54-12 54-12-54z" stroke-width="1.6"/><path d="M100 46l12 54h-24z" fill="currentColor" stroke="none" opacity=".9"/><circle cx="100" cy="100" r="5" stroke-width="1.6"/><path d="M58 58q-14 14-14 42M142 142q14-14 14-42M58 142q14 14 42 14M142 58q-14-14-42-14" stroke-width="1"/><g stroke-width="1.1"><path d="M100 12v8M188 100h-8M100 188v-8M12 100h8"/><path d="M160 40l-5 5M40 160l5-5M160 160l-5-5M40 40l5 5"/></g><path d="M64 128h-14v14M136 72h14V58M64 72H50V58M136 128h14v14" stroke-width="1"/><circle cx="50" cy="142" r="2.2" fill="currentColor"/><circle cx="150" cy="58" r="2.2" fill="currentColor"/><circle cx="50" cy="58" r="2.2" fill="currentColor"/><circle cx="150" cy="142" r="2.2" fill="currentColor"/></g></svg>`,
  emblemUs: `<svg viewBox="0 0 200 200" class="emblem" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="100" cy="100" r="86" stroke-width="1"/><circle cx="100" cy="100" r="80" stroke-width=".6"/><path d="M60 64v86M56 64h8M58 58q2-8 4 0" stroke-width="1.3"/><path d="M52 64q8-14 16 0" stroke-width="1.3"/><circle cx="60" cy="70" r="3" stroke-width="1"/><path d="M60 70m-12 0a12 12 0 1 0 24 0a12 12 0 1 0 -24 0" stroke-width=".5" stroke-dasharray="1 3"/><path d="M30 150h140" stroke-width="1.2"/><path d="M30 158q20-4 40 0t40 0 40 0 30 0" stroke-width=".7"/><path d="M30 166q20-4 40 0t40 0 40 0 30 0" stroke-width=".5"/><circle cx="112" cy="104" r="6" stroke-width="1.2"/><path d="M112 110v22l-5 18M112 132l5 18M112 116l10 6" stroke-width="1.2"/><circle cx="132" cy="101" r="6.4" stroke-width="1.2"/><path d="M132 108v24l-5 18M132 132l5 18M132 116l-10 6" stroke-width="1.2"/><path d="M122 82c-3-5-10-3-8 3c1 3 8 7 8 7s7-4 8-7c2-6-5-8-8-3z" stroke-width="1"/><path d="M150 62l2 4 4 1-4 2-2 4-2-4-4-2 4-1z" stroke-width=".8"/></g></svg>`,
  emblemGlobe: `<svg viewBox="0 0 200 200" class="emblem" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="100" cy="104" r="70" stroke-width="1.6"/><ellipse cx="100" cy="104" rx="30" ry="70" stroke-width="1"/><ellipse cx="100" cy="104" rx="56" ry="70" stroke-width=".8"/><path d="M30 104h140M38 70h124M38 138h124M54 46h92M54 162h92" stroke-width=".8"/><path d="M58 72q40-40 92 4" stroke-width="1.8" stroke-dasharray="2 5"/><circle cx="58" cy="72" r="4" fill="currentColor" stroke="none"/><path d="M150 76l-2-10 10 6z" fill="currentColor" stroke="none"/><circle cx="148" cy="150" r="4" fill="currentColor" stroke="none"/><path d="M150 76q14 40-2 74" stroke-width="1.8" stroke-dasharray="2 5"/><path d="M100 14v12M100 182v12" stroke-width="1"/><path d="M100 8l4 8h-8z" fill="currentColor" stroke="none"/></g></svg>`
});

// Covers drawn from what is inside each book (see docs/cover-design-guide.md).
Object.assign(ART, {
  // What Engineering Taught Me: the line-follower robot from chapter I, as an engineering drawing.
  coverBlueprint: `<svg viewBox="0 0 300 420" role="img" aria-label="An engineering drawing of a small line-following robot, white lines on blueprint blue"><defs><linearGradient id="bpBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1F5394"/><stop offset="1" stop-color="#173F73"/></linearGradient><pattern id="bpGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".6"/></pattern><pattern id="bpGrid5" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="rgba(255,255,255,.13)" stroke-width=".8"/></pattern></defs><rect width="300" height="420" fill="url(#bpBg)"/><rect width="300" height="420" fill="url(#bpGrid)"/><rect width="300" height="420" fill="url(#bpGrid5)"/><rect x="12" y="12" width="276" height="396" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.2"/><rect x="16" y="16" width="268" height="388" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".5"/><g transform="translate(0 20)"><g fill="none" stroke="#F2F7FF" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><rect x="96" y="176" width="108" height="96" rx="10"/><rect x="78" y="192" width="14" height="56" rx="3"/><rect x="208" y="192" width="14" height="56" rx="3"/><path d="M78 202h14M78 212h14M78 222h14M78 232h14M208 202h14M208 212h14M208 222h14M208 232h14" stroke-width=".7"/><rect x="122" y="160" width="56" height="12" rx="2"/><circle cx="130" cy="166" r="2.2"/><circle cx="140" cy="166" r="2.2"/><circle cx="150" cy="166" r="2.2"/><circle cx="160" cy="166" r="2.2"/><circle cx="170" cy="166" r="2.2"/><path d="M150 172v4"/><rect x="114" y="190" width="72" height="40" rx="2"/><g stroke-width=".8"><path d="M120 198h60M120 206h60M120 214h60M120 222h60"/></g><rect x="126" y="238" width="48" height="22" rx="2"/><path d="M140 249h8M144 245v8M156 249h8"/><circle cx="150" cy="282" r="6"/><path d="M150 276v-4"/><path d="M186 204q22 -6 22 18" stroke-dasharray="3 3"/><path d="M114 216q-14 6 -22 2" stroke-dasharray="3 3"/></g><g fill="none" stroke="rgba(242,247,255,.8)" stroke-width=".8"><path d="M96 142v-8M204 142v-8M96 138h108"/><path d="M96 138l6 -2v4zM204 138l-6 -2v4z" fill="rgba(242,247,255,.8)"/><path d="M236 176h8M236 272h8M240 176v96"/><path d="M240 176l-2 6h4zM240 272l-2 -6h4z" fill="rgba(242,247,255,.8)"/><path d="M122 166L50 184M84 220L44 236M182 210L254 196M174 250L254 286"/></g><g font-family="Commissioner, sans-serif" fill="#F2F7FF"><text x="150" y="132" text-anchor="middle" font-size="7.5" letter-spacing=".1em">148</text><text x="252" y="228" font-size="7.5" letter-spacing=".1em" transform="rotate(90 252 228)">96</text><g font-size="7" font-weight="600"><circle cx="42" cy="186" r="7" fill="none" stroke="#F2F7FF"/><text x="42" y="188.5" text-anchor="middle">1</text><circle cx="38" cy="238" r="7" fill="none" stroke="#F2F7FF"/><text x="38" y="240.5" text-anchor="middle">2</text><circle cx="262" cy="194" r="7" fill="none" stroke="#F2F7FF"/><text x="262" y="196.5" text-anchor="middle">3</text><circle cx="262" cy="288" r="7" fill="none" stroke="#F2F7FF"/><text x="262" y="290.5" text-anchor="middle">4</text></g></g></g></svg>`,
  // Ten Thousand Miles From Home: the letters home, as an airmail envelope from Dublin to Melbourne.
  coverAirmail: `<svg viewBox="0 0 300 420" role="img" aria-label="An airmail envelope with two stamps and two postmarks, Dublin and Melbourne"><defs><pattern id="amStripe" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="28" fill="#B3261E"/><rect x="7" width="7" height="28" fill="#F7F1E3"/><rect x="14" width="7" height="28" fill="#2F4A8C"/><rect x="21" width="7" height="28" fill="#F7F1E3"/></pattern><linearGradient id="amPaper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF6EA"/><stop offset="1" stop-color="#F1E8D4"/></linearGradient></defs><rect width="300" height="420" fill="url(#amStripe)"/><rect x="12" y="12" width="276" height="396" fill="url(#amPaper)"/><g transform="translate(30 34)"><rect width="104" height="30" fill="#2F4A8C"/><text x="52" y="13" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="8.5" font-weight="700" letter-spacing=".14em" fill="#fff">PAR AVION</text><text x="52" y="24" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="7" letter-spacing=".16em" fill="#fff">BY AIR MAIL</text></g><g transform="translate(192 30) rotate(4)"><rect width="50" height="62" fill="#fff"/><rect x="3" y="3" width="44" height="56" fill="#2E6B4E"/><g fill="#9FD3A8"><circle cx="20" cy="24" r="6"/><circle cx="30" cy="24" r="6"/><circle cx="25" cy="16" r="6"/></g><path d="M25 28q2 10 -4 16" stroke="#9FD3A8" stroke-width="2" fill="none"/><text x="25" y="54" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="6.5" font-weight="700" fill="#fff">€1.10</text><rect width="50" height="62" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="1.5 2.5"/></g><g transform="translate(232 56) rotate(-6)"><rect width="44" height="54" fill="#fff"/><rect x="3" y="3" width="38" height="48" fill="#2F4A8C"/><rect x="9" y="22" width="26" height="12" rx="3" fill="#FFE7B0"/><g fill="#2F4A8C"><rect x="12" y="25" width="5" height="5"/><rect x="20" y="25" width="5" height="5"/><rect x="28" y="25" width="4" height="5"/></g><path d="M22 22v-8M18 14h8" stroke="#FFE7B0" stroke-width="1.2"/><text x="22" y="46" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="6.5" font-weight="700" fill="#fff">$2.20</text><rect width="44" height="54" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="1.5 2.5"/></g><g fill="none" stroke="#3A3A44" stroke-opacity=".55"><circle cx="186" cy="96" r="22" stroke-width="1.4"/><circle cx="186" cy="96" r="17" stroke-width=".7"/><path d="M120 86q12 -5 24 0t24 0M118 96q12 -5 24 0t24 0M120 106q12 -5 24 0t24 0" stroke-width="1.2"/></g><g font-family="Commissioner, sans-serif" font-size="5.5" font-weight="700" fill="#3A3A44" fill-opacity=".6" text-anchor="middle"><text x="186" y="93">DUBLIN</text><text x="186" y="102">03 MAR</text></g><g transform="rotate(-14 66 352)"><rect x="24" y="336" width="88" height="30" rx="3" fill="none" stroke="#B3261E" stroke-width="2.2" opacity=".8"/><text x="68" y="357" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="13" font-weight="800" letter-spacing=".16em" fill="#B3261E" opacity=".8">ONE WAY</text></g><g fill="none" stroke="#3A3A44" stroke-opacity=".45"><circle cx="238" cy="356" r="21" stroke-width="1.3"/></g><g font-family="Commissioner, sans-serif" font-size="5" font-weight="700" fill="#3A3A44" fill-opacity=".55" text-anchor="middle"><text x="238" y="353">MELBOURNE</text><text x="238" y="362">05 MAR</text></g><g stroke="#CBBFA6" stroke-width=".8"><path d="M40 222h220M40 300h220"/></g></svg>`,
  // The Beginning of Us: Noah's napkin map of the walk back, a train ticket tucked behind, on pale linen.
  coverNapkin: `<svg viewBox="0 0 300 420" role="img" aria-label="A paper napkin with a hand-drawn map of a harbour walk, a train ticket tucked behind it"><defs><pattern id="nkLinen" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0h4M0 2h4" stroke="rgba(255,255,255,.45)" stroke-width=".6"/><path d="M0 0v4M2 0v4" stroke="rgba(150,110,100,.05)" stroke-width=".6"/></pattern><filter id="nkShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs><rect width="300" height="420" fill="#F3E7E1"/><rect width="300" height="420" fill="url(#nkLinen)"/><g transform="rotate(8 196 330)"><rect x="128" y="300" width="132" height="54" rx="3" fill="#FBF4EC" stroke="#E4D2C8"/><path d="M226 302v50" stroke="#D8C2B6" stroke-dasharray="2 2.5"/><g font-family="Commissioner, sans-serif" fill="#9A7F78"><text x="138" y="318" font-size="6.5" font-weight="700" letter-spacing=".14em">HARBOUR LINE</text><text x="138" y="332" font-size="9" font-weight="600" fill="#7A5E58">Sat · 18:40</text><text x="138" y="344" font-size="6" letter-spacing=".08em">ONE WAY · SEAT 14A</text><text x="243" y="333" font-size="9" font-weight="700" text-anchor="middle" fill="#B0745A">2</text></g></g><rect x="62" y="134" width="176" height="176" fill="rgba(110,70,60,.22)" filter="url(#nkShadow)" transform="rotate(-4 150 222) translate(4 8)"/><g transform="rotate(-4 150 222)"><rect x="62" y="134" width="176" height="176" fill="#FFFFFF"/><rect x="70" y="142" width="160" height="160" fill="none" stroke="#F1E6E1" stroke-width="2" stroke-dasharray="1 3"/><g fill="none" stroke="#2F4E8C" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M76 252q20 -8 40 -2t40 -4 40 4 34 -4"/><path d="M84 266q8 -3 16 0M120 270q8 -3 16 0M160 266q8 -3 16 0M196 270q8 -3 16 0" stroke-width=".9"/><rect x="88" y="166" width="22" height="12"/><path d="M110 172q30 4 36 26t30 30 38 6" stroke-dasharray="3 3.5"/><g><path d="M124 230v-12M121 218h6"/><path d="M146 236v-12M143 224h6"/><path d="M168 240v-12M165 228h6"/><path d="M190 242v-12M187 230h6"/><path d="M210 238v-12M207 226h6"/></g><path d="M206 228l10 10M216 228l-10 10" stroke-width="1.6"/><path d="M150 280l18 -2 3 4h-24z"/><path d="M158 278v-10l8 9"/></g><g font-family="Caveat, cursive" fill="#2F4E8C"><text x="86" y="160" font-size="11">station</text><text x="196" y="222" font-size="10">here ♡</text><text x="148" y="296" font-size="9">Patience</text><text x="98" y="210" font-size="10" transform="rotate(-12 98 210)">the long way →</text></g></g></svg>`
});

// A route map: a sea with a graticule, simple land shapes, a dotted route.
function mapSVG(m){
  const pins = m.pins, route = pins.map((p, k) => (k ? "Q" + ((pins[k - 1].x + p.x) / 2) + " " + (Math.min(pins[k - 1].y, p.y) - 26) + " " : "M") + p.x + " " + p.y).join(" ");
  return `<svg viewBox="0 0 300 210" role="img" aria-label="${esc(m.title)}"><rect width="300" height="210" fill="var(--sea, #DCE6EA)"/><g stroke="rgba(0,0,0,.08)" stroke-width="1"><path d="M0 42h300M0 84h300M0 126h300M0 168h300M50 0v210M100 0v210M150 0v210M200 0v210M250 0v210"/></g><g fill="var(--land, #EFE7D2)" stroke="rgba(0,0,0,.18)" stroke-width="1"><path d="M30 30q20-14 42-6t28 18q-8 18-26 24t-30 30q-10 30-4 56q-20-10-26-40t16-82z"/><path d="M100 40q40-16 90-8t60 26q-10 20-40 22t-46 14q-24 6-40-10t-24-44z"/><path d="M220 140q20-10 44-4t20 26q-10 18-34 16t-34-18q-6-12 4-20z"/></g><path d="${route}" fill="none" stroke="var(--route, #B3261E)" stroke-width="2" stroke-dasharray="5 5"/>${pins.map((p, k) => `<text x="${p.x + 10}" y="${p.y - 8}" font-family="Commissioner, sans-serif" font-size="9" font-weight="600" fill="#22223A">${esc(p.n)}</text><g class="mpin" data-k="${k}" role="button" tabindex="0" aria-label="${esc(p.n)}"><circle cx="${p.x}" cy="${p.y}" r="8"/><text x="${p.x}" y="${p.y + 3.2}" text-anchor="middle" font-family="Commissioner, sans-serif" font-size="9" font-weight="700">${k + 1}</text></g>`).join("")}</svg>`;
}
// An analogue clock showing a time.
function clockSVG(h, m){
  const a = (h % 12 + m / 60) * 30, b = m * 6;
  const hand = (deg, len, w) => `<line x1="50" y1="50" x2="${50 + len * Math.sin(deg * Math.PI / 180)}" y2="${50 - len * Math.cos(deg * Math.PI / 180)}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
  const ticks = [...Array(12)].map((_, k) => `<line x1="50" y1="8" x2="50" y2="${k % 3 ? 13 : 17}" stroke="currentColor" stroke-width="${k % 3 ? 1.2 : 2.4}" transform="rotate(${k * 30} 50 50)"/>`).join("");
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="var(--page)" stroke="currentColor" stroke-width="2.5"/>${ticks}${hand(a, 24, 4)}${hand(b, 36, 2.4)}<circle cx="50" cy="50" r="3" fill="currentColor"/></svg>`;
}

/* Family trees. An ancestry tree is one person with parents, who have
   parents, and so on; it can be drawn as branches (a tree growing up
   from the person) or as a fan (rings of generations). A team tree grows
   from where a company started into its teams, one dot per person. */
function treeDepth(n){ return n.p ? 1 + Math.max(...n.p.map(treeDepth)) : 0; }
// Branches: the person at the foot of the trunk, each older generation on
// its own row above. Every name has its own space: the oldest row's names
// alternate above and below their circles, and a paper-coloured halo keeps
// branches from ever running through the type.
function branchesSVG(root){
  const D = Math.min(3, treeDepth(root)), W = 320, Y = [250, 180, 110, 42], R = [22, 18, 14, 11.5];
  const NF = [12, 11, 9.5, 8.2], RF = [8.5, 8, 7.4, 0];
  const pos = (g, i) => [10 + (i + .5) * ((W - 20) / 2 ** g), Y[g]];
  const side = (g, i) => g === 0 ? "root" : (i < 2 ** g / 2 ? "a" : "b");
  let lines = "", leaves = "", nodes = "";
  function walk(n, g, i){
    const [x, y] = pos(g, i);
    if (g < D) (n.p || []).forEach((par, k) => {
      const [px, py] = pos(g + 1, i * 2 + k), my = (y + py) / 2;
      lines += `<path class="tb tb-${side(g + 1, i * 2 + k)}" d="M${x} ${y - R[g] + 2}C${x} ${my} ${px} ${my + 8} ${px} ${py + R[g + 1] - 2}" stroke-width="${[8, 5, 3.2][g]}"/>`;
      const lx = x + (px - x) * .55, ly = my + 2;
      leaves += `<ellipse class="tleaf" cx="${lx + (k ? 7 : -7)}" cy="${ly}" rx="6" ry="2.8" transform="rotate(${k ? -30 : 30} ${lx + (k ? 7 : -7)} ${ly})"/>`;
      walk(par, g + 1, i * 2 + k);
    });
    const ini = n.n.split(/[ &]+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2);
    const two = n.n.includes(" & ");
    const above = g === 3 && i % 2 === 0;
    const ny = above ? y - R[g] - 6 : y + R[g] + NF[g] + 3;
    const name = two ? n.n.split(" & ").map((w, k) => `<tspan x="${x}" dy="${k ? NF[g] + 1 : 0}">${esc(w)}${k ? "" : " &amp;"}</tspan>`).join("") : esc(n.n);
    const rel = n.r && RF[g] ? `<text class="trel halo" x="${x}" y="${ny + (two ? NF[g] + 1 : 0) + RF[g] + 2}" text-anchor="middle" font-size="${RF[g]}">${esc(n.r)}</text>` : "";
    const face = two && n.p ? `<g clip-path="none">${portrait({ ...n.p[0].face, bg:"#F6E3E3" }).replace('<svg ', `<svg x="${x - R[g]}" y="${y - R[g] * .72}" width="${R[g] * 1.15}" height="${R[g] * 1.15}" `)}${portrait({ ...n.p[1].face, bg:"#E4ECEE" }).replace('<svg ', `<svg x="${x - R[g] * .15}" y="${y - R[g] * .72}" width="${R[g] * 1.15}" height="${R[g] * 1.15}" `)}</g>`
               : n.face ? portrait({ ...n.face, age: n.face.age || (g === 0 && !two ? "baby" : g >= 2 ? "old" : "adult") }).replace('<svg ', `<svg x="${x - R[g]}" y="${y - R[g]}" width="${R[g] * 2}" height="${R[g] * 2}" `) : `<text x="${x}" y="${y + R[g] * .36}" text-anchor="middle" font-size="${R[g] * .95}">${esc(ini)}</text>`;
    nodes += `<g class="tn tn-${side(g, i)}"><circle class="ring" cx="${x}" cy="${y}" r="${R[g] + 2.2}"/><circle cx="${x}" cy="${y}" r="${R[g]}"/>${face}<text class="tname halo" x="${x}" y="${ny + (above ? 0 : 2)}" text-anchor="middle" font-size="${NF[g]}">${name}</text>${rel}</g>`;
  }
  walk(root, 0, 0);
  return `<svg viewBox="0 6 ${W} 312" class="tree-svg" role="img" aria-label="Family tree"><path class="tb tb-root" d="M${W / 2 - 14} 318Q${W / 2 - 5} 290 ${W / 2 - 5} ${Y[0]}H${W / 2 + 5}Q${W / 2 + 5} 290 ${W / 2 + 14} 318Z"/>${lines}${leaves}${nodes}</svg>`;
}
function fanSVG(root){
  const cx = 150, cy = 150, ring = [0, 30, 70, 108, 144], D = Math.min(3, treeDepth(root));
  let out = "";
  const arc = (r1, r2, a1, a2) => { const P = (r, a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [x1, y1] = P(r2, a1), [x2, y2] = P(r2, a2), [x3, y3] = P(r1, a2), [x4, y4] = P(r1, a1);
    return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`; };
  function walk(n, g, i){
    if (g > 0){
      const span = Math.PI / 2 ** g, a1 = Math.PI - i * span, a2 = a1 - span, am = (a1 + a2) / 2, rm = (ring[g] + ring[g + 1]) / 2;
      const deg = 90 - am * 180 / Math.PI;
      out += `<g class="fn fn-${i < 2 ** g / 2 ? "a" : "b"} g${g}"><path d="${arc(ring[g] + 1, ring[g + 1] - 1, a1, a2)}"/><text transform="translate(${cx + rm * Math.cos(am)} ${cy - rm * Math.sin(am)}) rotate(${g < 3 ? deg : deg - 90})" text-anchor="middle" font-size="${[0, 8, 6.5, 5][g]}"><tspan x="0" dy="0">${esc(n.n)}</tspan>${n.r && g < 3 ? `<tspan class="trel" x="0" dy="1.2em">${esc(n.r)}</tspan>` : ""}</text></g>`;
    }
    if (g < D) (n.p || []).forEach((par, k) => walk(par, g + 1, i * 2 + k));
  }
  walk(root, 0, 0);
  return `<svg viewBox="0 0 300 160" class="tree-svg fan" role="img" aria-label="Family tree as a fan">${out}<g class="fn fn-root"><path d="M${cx - 29} ${cy}A29 29 0 0 1 ${cx + 29} ${cy}Z"/><text x="${cx}" y="${cy - 9}" text-anchor="middle" font-size="9">${esc(root.n)}</text></g></svg>`;
}
function teamSVG(t){
  const W = 200, H = 236, n = t.branches.length;
  let lines = "", nodes = "";
  t.branches.forEach((b, k) => {
    const x = 22 + (k + .5) * ((W - 44) / n), y = 74 + (k % 2) * 30, rows = Math.ceil(b.count / 5);
    lines += `<path class="tb tb-a" d="M${W / 2} ${H - 62}C${W / 2} ${H - 110} ${x} ${y + 60} ${x} ${y + rows * 6.5 + 2}" stroke-width="3"/>`;
    const dots = [...Array(b.count)].map((_, d) => `<circle cx="${x - 13 + (d % 5) * 6.5}" cy="${y + Math.floor(d / 5) * 6.5}" r="2.4"/>`).join("");
    nodes += `<g class="tm"><text class="tname" x="${x}" y="${y - 15}" text-anchor="middle" font-size="7.5">${esc(b.n)}</text><text class="trel" x="${x}" y="${y - 7}" text-anchor="middle" font-size="6">${b.count} people</text><g class="tdots">${dots}</g></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="tree-svg team" role="img" aria-label="Team tree"><path class="tb tb-root" d="M${W / 2} ${H}V${H - 52}" stroke-width="8"/>${lines}${nodes}<g class="tn tn-root"><rect x="${W / 2 - 44}" y="${H - 62}" width="88" height="30" rx="6"/><text x="${W / 2}" y="${H - 49}" text-anchor="middle" font-size="7.5" font-weight="700">${esc(t.root.n)}</text><text x="${W / 2}" y="${H - 39}" text-anchor="middle" font-size="5.6">${esc(t.root.sub)}</text></g></svg>`;
}

const COMPANY_CHAPTERS = [
  { num:"I", when:"2019", title:"Two laptops and a folding table", sub:"The garage", photo:"garage", cap:"The garage, week one · Mamá’s car parked outside", voice:null, tone:"sun",
    comic:{ title:"Year one, in the garage", layout:"grid", panels:[
      { art:"garage", wide:true, cap:"2019. Four founders, one garage, zero customers.", say:"We start Monday." },
      { art:"smoke", cap:"Diego’s laptop dies. Again.", sfx:"FZZT!" },
      { art:"mama", cap:"9 p.m. Mamá arrives with empanadas.", say:"Eat first. Then save the world." },
      { art:"argue", cap:"3 a.m. Two hours arguing about the name." },
      { art:"demo", cap:"Week twelve. The first demo — to ourselves.", sfx:"YES!" } ] },
    behind:"Out of the frame: Mamá, bringing empanadas every evening and pretending not to listen to the arguments.",
    story:[["What happened","Four of us, a borrowed garage and an idea we could explain in one sentence but not sell in ten."],["What I felt","Free, and slightly terrified. Every decision was ours, which meant every mistake was too."]],
    lesson:"Start before you feel ready. You will never feel ready." },
  { num:"II", when:"2020", title:"The twelfth question", sub:"Eleven nos", photo:null, voice:"v_c_inv", tone:"berry",
    tally:{ title:"Eleven nos, and one question", nos:[["Fund A","too early"],["Fund B","market too small"],["Angel C","no traction"],["Fund D","not our thesis"],["Fund E","come back with revenue"],["Angel F","the team is too young"],["Fund G","who would buy this?"],["Fund H","crowded space"],["Fund I","we passed in four minutes"],["Fund J","no reply"],["Fund K","maybe next year"]], q:"Before I say no — who is your customer, really?" },
    story:[["What happened","The twelfth investor also said no — but first she asked who our customer really was. We argued about it in the lift, all the way down."],["What we tried","We wrote down every question we had failed to answer that year, and built the next version to answer them."]],
    lesson:"A no is a free lesson. Collect enough of them and they become the plan." },
  { num:"III", when:"2022", title:"The month we nearly missed it", sub:"Payroll", photo:null, voice:"v_c_sofia", tone:"night",
    inside:{ title:"What we didn’t tell the team", kind:"secret", lid:{ art:"payslip", label:"Open" }, layers:[
      { h:"What the team saw", t:"A normal Friday. Salaries in on time. Pizza.", lid:{ icon:"head", label:"What we knew" } },
      { h:"What only the four of us knew", t:"Nine days of cash. A loan signed on Wednesday night against Diego’s flat.", lid:{ icon:"heart", label:"What I told Mamá" } },
      { h:"What I told Mamá", t:"That it was fine. She knew it wasn’t. She sent empanadas anyway." } ] },
    story:[["What happened","A customer paid ninety days late and the bank account went quiet. We had nine days before payroll."],["What we tried","We called every customer who owed us anything, and two of us skipped our own salaries."]],
    lesson:"Cash is the oxygen. Watch it like you watch your breathing." },
  { num:"IV", when:"2021", title:"A stranger paid us", sub:"The day it worked", photo:"firstsale", cap:"₹2,400, from someone none of us had ever met", voice:null, tone:"teal",
    comic:{ title:"6:12 p.m., a Tuesday", layout:"splash", panels:[
      { art:"firstsale", cap:"6:12 p.m. A notification nobody expected.", sfx:"PING!" },
      { art:"who", cap:"Who is it?", say:"Nobody we know!" },
      { art:"taped", cap:"Printed. Taped to the wall." },
      { art:"pizza", cap:"That night: one pizza, four forks." },
      { art:"demo", cap:"The company was real." } ] },
    behind:"We screenshotted it, printed it, and taped it above the folding table. It is still there.",
    story:[["What happened","Not a friend, not a cousin. A stranger found us, used it, and paid."],["What I felt","Like the company was real for the first time."]],
    lesson:"Talk to customers before the deck, not after." }
];
const MILES_CHAPTERS = [
  { num:"0", when:"Day 0", title:"Twenty-three kilos of a whole life", sub:"The one-way ticket", photo:"suitcase", cap:"Twenty-three kilos exactly. I weighed it four times.", voice:"v_l_mum", tone:"sun",
    behind:"What didn’t fit: my guitar, Dad’s old jumper, and the dog, who sat on the case all morning.",
    story:[["What happened","A one-way ticket, Dublin to Melbourne, and a suitcase that weighed exactly what the airline allowed."],["What I felt","Brave at the gate. Not so brave at the window seat."]],
    lesson:"Pack less. You are bringing more than fits in the case." },
  { num:"1", when:"Week 1", title:"Nobody here knows your name", sub:"Arrivals", photo:null, voice:"v_l_liam", tone:"teal",
    map:{ title:"Dublin to Melbourne", pins:[
      { n:"Dublin", x:58, y:46, t:"Mum at the gate, pretending not to cry. Twenty-three kilos." },
      { n:"Dubai", x:150, y:96, t:"Four hours on a bench, eating the sandwiches she packed." },
      { n:"Melbourne", x:256, y:160, t:"Thirty degrees in March. Nobody here knows my name." } ] },
    story:[["What happened","Thirty degrees in March, a room above a laundrette, and a phone full of people asleep on the other side of the world."],["What I tried","Learning the tram map before I learned anyone’s name."]],
    lesson:"Arriving takes longer than the flight." },
  { num:"4", when:"Month 4", title:"Dark at four o’clock", sub:"The first winter", photo:null, voice:null, tone:"night",
    scene:{ art:"tram", said:"Dark at four o’clock, waiting for the 86, the only person at the stop.", by:"Liam" },
    story:[["What happened","Dark when I left work, dark when I woke. I knew the barista’s order better than she knew my name."],["What I tried","One month of saying yes to everything: five-a-side, a terrible book club, a colleague’s cousin’s birthday. Two of those stuck."]],
    lesson:"Loneliness isn’t being alone. It’s being unknown. The cure is one person at a time." },
  { num:"9", when:"Month 9", title:"A word that changed its meaning", sub:"Two homes", photo:null, voice:null, tone:"pink",
    clocks:{ title:"Every Sunday, at the same moment", a:{ city:"Dublin", h:8, m:0, note:"Mum is putting the kettle on." }, b:{ city:"Melbourne", h:18, m:0, note:"I’m on the 86, ringing home." } },
    story:[["What happened","I said “home” and meant my flat. Then I said it again and meant Mum’s kitchen. Both were true."],["What I’d do differently","Call home on Sundays from the start. Guilt grows quietly in the gap between calls."]],
    lesson:"Home is not a place you left. It’s a thing you learn to carry, and to build twice." }
];
const US_CHAPTERS = [
  { num:"1", when:"6:40 p.m.", title:"Two tickets, one nervous playlist", sub:"The train there", photo:null, voice:"v_us_hello", tone:"pink",
    spread:{ art:"train", line:"A window that wouldn’t stop showing us the sunset, and two coffees going cold." },
    story:[["What happened","We met at the station because neither of us wanted to be late. We were both twenty minutes early."],["What I noticed","She had made a playlist for the train. He pretended he hadn’t."]],
    lesson:"Arrive early to the things that matter." },
  { num:"2", when:"7:30 p.m.", title:"Three hours like twenty minutes", sub:"The table by the window", photo:null, voice:"v_c_cam", tone:"sun",
    inside:{ title:"What we kept from table five", kind:"keepsakes", lid:{ label:"Pull" }, layers:[
      { h:"The receipt", t:"2 × the wrong dish · 1 dessert to share · €61.40", look:"receipt" },
      { h:"The napkin", t:"His map of the walk back, drawn in biro, with an X where we stopped.", look:"napkin" },
      { h:"Two train tickets", t:"Saturday 18:40 · one way each. We came back together.", look:"ticket" } ] },
    story:[["What happened","Dinner at the little place by the harbour, the one with six tables. We ordered wrong and shared both plates anyway."],["What I noticed","She argues with her hands. He listens with his whole face."]],
    lesson:"Pay attention — you will want this later." },
  { num:"3", when:"9:00 p.m.", title:"Everything except the weather", sub:"What we talked about", photo:null, voice:null, tone:"teal",
    twov:{ title:"The same evening, from both chairs", a:{ who:"Camille remembers", text:"He pretended he’d read Anna Karenina. He hadn’t. He knew I knew. We talked about it for forty minutes anyway." }, b:{ who:"Noah remembers", text:"She said she would live in Lisbon one day, then asked where I would live. I said “near you” before I could stop myself." } },
    story:[["What we talked about","Books we had pretended to read. Cities we would live in. What family means. Nobody checked a phone."]],
    lesson:"Listen to the answer, not for your turn." },
  { num:"4", when:"11:15 p.m.", title:"The long way, on purpose", sub:"The walk back", photo:null, voice:"v_n_taxi", tone:"night",
    foldout:{ art:"harbour", title:"The walk back along the harbour", line:"I pretended I’d forgotten where the station was. You laughed. You knew." },
    story:[["What happened","We walked the long way back, along the harbour, past five lamps and a boat called Patience."],["What I felt","I didn’t want the night to end. I was already sure."]],
    lesson:"Take the long way when the company is right." },
  { num:"5", when:"Five years on", title:"Still the long way", sub:"Five years later", photo:null, voice:null, tone:"berry",
    inside:{ title:"Letters to each other", kind:"letter", lid:{ art:"harbour", label:"2031" }, layers:[
      { h:"Our promise", t:"To keep taking the long way back, and to keep sharing the wrong dish.", lid:{ icon:"heart", label:"Camille" } },
      { h:"From Camille", t:"If we are still arguing about Anna Karenina, good. Never read it.", lid:{ icon:"heart", label:"Noah" } },
      { h:"From Noah", t:"The feeling comes and goes. The attention is the thing you choose. I choose it again." } ] },
    story:[["Five years on","We went back to table five. The waiter remembered us. We ordered the wrong dish on purpose."]],
    lesson:"The feeling comes and goes. The attention is the thing you choose." }
];

// Every book the person is making. Each carries its material, the
// features it starts with, and the words for its book-specific pages.
const BOOKS = {
  kiara: {
    meta:{ title:"The Year You Taught Us", by:"Ananya & Rohan", about:"Our first year with Kiara, from the day she was born to her first birthday." },
    genre:"baby",
    defaults:{ format:"portrait", mood:"bright", cover:"art", voice:"strip", flaps:true, reveal:"auto", comic:true, comicStyle:"colour", comicLayout:"auto", drawings:"page", drawStyle:"pencil",
               panelPos:"right", panelLabels:"pictures", greeting:true, blessings:true, handwriting:true, writein:true, letter:true, numbers:true, tree:true, treeStyle:"auto" },
    coverArt:"moonCradle", coverKicker:"A first year, kept",
    chapters:KIARA_CHAPTERS, collage:["hand", "clock", "feet", "cake"], greet:"v_hello", coverVoice:"v_laugh",
    tree:{ title:"Where you come from", sub:"Four generations, one name at a time", style:"branches", root:{ n:"Kiara", r:"born 2025", face:{ g:"f", age:"baby", skin:"#E8B48E", hair:"#2B2118", shirt:"#F2B8C6", bg:"#FCE8D4" }, p:[
      { n:"Rohan", r:"Papa", face:{ g:"m", skin:"#C68B65", shirt:"#2F4A5C", bg:"#E3ECEF" }, p:[ { n:"Dadi", r:"Kamala Rao", face:{ g:"f", style:"bun", skin:"#C68B65", shirt:"#8E3B52", pallu:"#D9A23A", bindi:1, glasses:1, bg:"#F3E3D3" }, p:[{ n:"Lakshmi", face:{ g:"f", style:"bun", skin:"#B9805C", shirt:"#5E7A4A", pallu:"#C9A45C", bindi:1, bg:"#EFE6D6" } }, { n:"Venkatesh", face:{ g:"m", skin:"#B9805C", shirt:"#F1EDE4", bg:"#EFE6D6" } }] }, { n:"Dada", r:"Suresh Rao", face:{ g:"m", skin:"#C68B65", shirt:"#E8E1D4", glasses:1, bg:"#F3E3D3" }, p:[{ n:"Saraswati", face:{ g:"f", style:"bun", skin:"#C68B65", shirt:"#2E6B5E", pallu:"#C9A45C", bindi:1, bg:"#EFE6D6" } }, { n:"Gopal", face:{ g:"m", skin:"#C68B65", shirt:"#F1EDE4", beard:1, bg:"#EFE6D6" } }] } ] },
      { n:"Ananya", r:"Mumma", face:{ g:"f", skin:"#E0A987", shirt:"#C2566E", bindi:1, bg:"#FBE6E0" }, p:[ { n:"Nani", r:"Meera Iyer", face:{ g:"f", style:"bun", skin:"#D49A74", shirt:"#2F4A5C", pallu:"#B3261E", bindi:1, bg:"#E9EEF2" }, p:[{ n:"Janaki", face:{ g:"f", style:"bun", skin:"#C68B65", shirt:"#7A2E4A", pallu:"#D9A23A", bindi:1, bg:"#EAEFF2" } }, { n:"Raman", face:{ g:"m", skin:"#C68B65", shirt:"#F1EDE4", glasses:1, bg:"#EAEFF2" } }] }, { n:"Nana", r:"Krishnan Iyer", face:{ g:"m", skin:"#D49A74", shirt:"#F1EDE4", glasses:1, bg:"#E9EEF2" }, p:[{ n:"Parvati", face:{ g:"f", style:"bun", skin:"#D49A74", shirt:"#3E6E4A", pallu:"#E2A93B", bindi:1, bg:"#EAEFF2" } }, { n:"Subbu", face:{ g:"m", skin:"#D49A74", shirt:"#F1EDE4", beard:1, bg:"#EAEFF2" } }] } ] } ] } },
    dedication:{ text:"For Kiara. One day you’ll read how little we knew, and how much you taught us anyway.", sign:"Mom & Dad" },
    numbers:{ runhead:"The year in numbers", h:"One year", voice:"v_laugh", items:[["365","days"],["1,100+","night feeds"],["9.1 kg","from 2.9 kg"],["4","teeth"],["3","first steps"],["1","first laugh, month 4"]] },
    blessings:{ runhead:"From the family", h:"Blessings", items:["v_dadi", "v_nana"] },
    hand:{ runhead:"In Ananya’s hand", text:"Kiara, the night before your first birthday I read this whole book again. I cried at the fever and laughed at the sofa. You won’t remember this year. We will never forget it. — Mumma" },
    letter:{ h:"Open on your 18th birthday", seal:"K", to:"For Kiara", note:"To be opened on her eighteenth birthday." },
    writein:"Left open for Kiara to write in, someday.", back:"Printed for the Rao family",
    labels:{ blessings:"Family blessings, with their voices", handwriting:"A page in your own handwriting", writein:"A page left to write in", letter:"A letter to open at 18", numbers:"The year in numbers", tree:"A family tree: where she comes from" },
    home:{ entries:42, progress:75, status:"Month 9 of 12" },
    people:{ admin:"Ananya", others:["Rohan", "Dadi", "Nana"] },
    feedHead:"From the family",
    feed:[["D", "#8E4B52", "Dadi", "recorded a blessing · 2 days ago"], ["R", "#4E5A32", "Rohan", "added 12 photos to “First steps”"], ["N", "#3C4F5C", "Nana", "scanned a handwritten letter"]],
    startNote:"Lovely. I’ve picked features that suit a first year — change anything you like on the next screen.",
    question:"What did she do this week that surprised you?",
    filed:"Month 9 · filed by the companion",
    newEntry:["“She grabbed the spoon today and wouldn’t let go — she wants to feed herself now.”", "Month 9 · filed under Food, by the companion"],
    entries:[
      ["Voice note · 0:42", "“She said something that sounded exactly like ‘Dadi’. Rohan swears it was ‘daddy’.”", "Month 9 · filed under First words"],
      ["3 photos", "The first time on the swing at the park.", "Month 9 · filed under Outside"],
      ["Scanned page", "Nana’s letter, in his handwriting.", "Family · waiting for your approval"]],
    thread:[
      ["ai", "Last week you said month eight was the hardest. What happened that night?"],
      ["voice", "Voice note · 1:12"],
      ["ai", "A fever at two in the morning sounds frightening. What helped you stay calm?"],
      ["me", "We’d written down every feed and every temperature."],
      ["page", "Drafted for “The fever”: Write things down. In a panic, your notes remember what you can’t."]],
    replies:[
      "What did you feel in that moment — before you knew it would be all right?",
      "Who was with you? What did they say?",
      "If Kiara reads this at eighteen, what do you want her to take from it?",
      "Lovely. I’ve added that to “The fever”. You’ll see it on the page when you open the book."]
  },
  eng: {
    meta:{ title:"What Engineering Taught Me", by:"Madhukar V", about:"Lessons from four years of engineering, for every first-year student." },
    genre:"engineering",
    defaults:{ format:"portrait", mood:"classic", cover:"concept", voice:"wave", flaps:true, reveal:"auto", comic:true, comicStyle:"bw", comicLayout:"auto", drawings:"page", drawStyle:"pencil",
               panelPos:"right", panelLabels:"pictures", greeting:false, blessings:true, handwriting:true, writein:true, letter:true, numbers:true },
    emblem:"emblemCompass",
    concept:{ kind:"blueprint", art:"coverBlueprint", sheet:"Drawing No. 01 · Sheet 1 of 1", block:[["Drawn by", "{by}"], ["Part", "Line-follower, Mk III"], ["Scale", "4 years : 1"], ["Dated", "2021 – 2025"]] },
    chapters:ENG_CHAPTERS, collage:["robot", "hack4", "room", "grad"], greet:"v_e_hello", coverVoice:"v_e_goal",
    dedication:{ text:"For every first-year student who thinks there is still plenty of time. There’s less than you think, and it’s enough if you start now.", sign:"Madhukar" },
    numbers:{ runhead:"Four years in numbers", h:"Four years", voice:null, items:[["8","semesters"],["46","exams"],["11","projects"],["3","internships"],["1","robot that worked"],["5","friends who stayed"]] },
    blessings:{ runhead:"Voices from those years", h:"They said it best", items:["v_e_prof", "v_e_kiran"] },
    hand:{ runhead:"From my lab notebook", text:"Test 14: motor driver burnt again. Check the ground first. ALWAYS check the ground first. — M, 2 a.m." },
    letter:{ h:"Open on your first day of college", seal:"E", to:"For the next engineer in the family", note:"To be opened on the first day of college." },
    writein:"Left open for the next engineer to add their own lesson.", back:"Printed for Madhukar V",
    labels:{ blessings:"Voices from those years", handwriting:"A page from your lab notebook", writein:"A page left for the next reader", letter:"A letter for the first day of college", numbers:"Four years in numbers" },
    home:{ entries:58, progress:90, status:"Final year" },
    people:{ admin:"Madhukar", others:["Kiran"] },
    feedHead:"From friends",
    feed:[["K", "#14A39B", "Kiran", "recorded the 3 a.m. fix · yesterday"], ["S", "#3C4F5C", "Prof. Shah", "sent a voice note"], ["A", "#7C5CFF", "Arjun", "added 9 hackathon photos"]],
    startNote:"Good. I’ve picked features for a book of lessons — change anything you like on the next screen.",
    question:"What did a teacher say that you still remember?",
    filed:"Year 3 · filed by the companion",
    newEntry:["“We stayed in Hall B till the guard switched the lights off.”", "Year 2 · filed under People, by the companion"],
    entries:[
      ["Voice note · 2:10", "“Kiran called — he still uses the print-statement trick.”", "Year 2 · filed under People"],
      ["2 photos", "The line-follower robot, version 3.", "Year 2 · filed under Skills"],
      ["Scanned page", "A page from the lab notebook.", "Waiting for your approval"]],
    thread:[
      ["ai", "You called third year “the year of almost”. What did a normal night look like?"],
      ["voice", "Voice note · 1:40"],
      ["ai", "There’s no photo of that room. Shall I draw it from what you said — the game, the phone, the 9 a.m. deadline?"],
      ["me", "Yes, in pencil. That year felt grey."],
      ["page", "Drawn for “Busy is not the same as building”: the room at 2 a.m., in pencil."]],
    replies:[
      "What would you have built with those nights?",
      "Who noticed before you did?",
      "If a first-year student reads only one page, which should it be?",
      "Good. I’ve added that to “Hindsight”. You’ll see it in the book."]
  }
};
Object.assign(BOOKS, {
  company: {
    meta:{ title:"The Company We Built", by:"Sofía Martínez", about:"Five years of a startup, told honestly." },
    genre:"business",
    defaults:{ format:"portrait", mood:"comic", cover:"comic", voice:"qr", flaps:true, reveal:"auto", comic:true, comicStyle:"colour", comicLayout:"auto", drawings:"page", drawStyle:"pencil",
               panelPos:"right", panelLabels:"pictures", greeting:false, blessings:true, handwriting:false, writein:false, letter:true, numbers:false, tree:true, treeStyle:"auto", timeline:true },
    comicArt:"garageHero",
    chapters:COMPANY_CHAPTERS, collage:["garage", "firstsale", "payslip", "garage"], greet:"v_c_sofia", coverVoice:"v_c_sofia",
    dedication:{ text:"For the four of us in the garage — and for Mamá, who lent us the garage and pretended not to worry.", sign:"Sofía" },
    tree:{ title:"From four to forty", sub:"The team, grown from the garage", style:"team", team:{ root:{ n:"The garage, 2019", sub:"Sofía · Diego · Aarav · Mei" }, branches:[{ n:"Product", count:9 }, { n:"Engineering", count:14 }, { n:"Sales", count:8 }, { n:"Support", count:5 }] } },
    timeline:{ title:"Five years at a glance", items:[["2019","The garage","4 founders, 0 customers"],["2020","Eleven nos","1 question we couldn’t answer"],["2021","A stranger paid","₹2,400"],["2022","Payroll scare","9 days of cash"],["2023","Series A","22 people"],["2024","Forty","40 people, 1,800 customers"]] },
    numbers:{ runhead:"Five years in numbers", h:"Five years", voice:null, items:[["12","pitches"],["11","nos"],["9","days of cash, once"],["40","people"],["1,800","customers"],["1","garage, still ours"]] },
    blessings:{ runhead:"Voices from the garage", h:"What they said", items:["v_c_inv", "v_c_sofia"] },
    hand:{ runhead:"In Sofía’s hand", text:"Write down the question that ends each meeting. The one you can’t answer yet is the work." },
    letter:{ h:"For the next founder", seal:"S", to:"For whoever opens the garage next", note:"To be opened on the day you start your own." },
    writein:"Left open for the next founder.", back:"Printed for Sofía Martínez",
    labels:{ blessings:"Voices from the garage", handwriting:"A page in your own handwriting", writein:"A page left for the next founder", letter:"A letter for the next founder", numbers:"Five years in numbers", tree:"A team tree: from four to forty", timeline:"A timeline: five years at a glance" },
    home:{ entries:71, progress:95, status:"Year 5" },
    people:{ admin:"Sofía", others:["Diego", "Aarav", "Mei"] },
    feedHead:"From the team", feed:[["D", "#B3261E", "Diego", "added the Series A photos"], ["M", "#14A39B", "Mei", "recorded the demo-day story"], ["A", "#7C5CFF", "Aarav", "scanned the first invoice"]],
    startNote:"Good. I’ve picked features for a company’s story — change anything you like on the next screen.",
    question:"Which meeting changed the company?", filed:"Year 5 · filed by the companion",
    newEntry:["“We still have the folding table. It’s in the boardroom now.”", "Year 5 · filed under The garage, by the companion"],
    entries:[["Voice note · 3:02", "“The twelfth investor’s question, word for word.”", "2020 · filed under Eleven nos"], ["4 photos", "Demo day, shaking hands and all.", "2021 · filed under The day it worked"], ["Scanned page", "The first invoice.", "Waiting for your approval"]],
    thread:[["ai", "You said payroll month was the closest you came. What did the team see that Friday?"], ["voice", "Voice note · 2:14"], ["ai", "And what did only the four of you know?"], ["me", "Nine days of cash."], ["page", "Drafted for “Payroll”: three layers, in envelopes — what the team saw, what we knew, what I told Mamá."]],
    replies:["Who noticed first?", "What would you do differently with nine days?", "What do you want the next founder to take from this?", "Good. I’ve added that to “Payroll”."]
  },
  miles: {
    meta:{ title:"Ten Thousand Miles From Home", by:"Liam O’Connor", about:"Leaving Dublin, landing in Melbourne." },
    genre:"migration",
    defaults:{ format:"portrait", mood:"atlas", cover:"concept", voice:"qr", flaps:true, reveal:"auto", comic:true, comicStyle:"bw", comicLayout:"auto", drawings:"page", drawStyle:"watercolour",
               panelPos:"right", panelLabels:"pictures", greeting:false, blessings:true, handwriting:false, writein:false, letter:true, numbers:true, tree:false, treeStyle:"auto" },
    emblem:"emblemGlobe",
    concept:{ kind:"airmail", art:"coverAirmail", to:"to Melbourne, from Dublin" },
    chapters:MILES_CHAPTERS, collage:["suitcase", "tram", "suitcase", "tram"], greet:"v_l_liam", coverVoice:"v_l_liam",
    dedication:{ text:"For Mum. I did eat properly. Mostly.", sign:"Liam" },
    numbers:{ runhead:"A year away, in numbers", h:"One year away", voice:"v_l_mum", items:[["16,900","km"],["52","Sunday calls"],["23","kilos"],["4 p.m.","darkness, in June"],["1","terrible book club"],["2","friends who stuck"]] },
    blessings:{ runhead:"Voices across the world", h:"Two ends of the phone", items:["v_l_mum", "v_l_liam"] },
    hand:{ runhead:"In Liam’s hand", text:"Learn one local joke and tell it badly. It works every time." },
    letter:{ h:"For whoever leaves next", seal:"L", to:"For the next one to leave", note:"To be opened on the day you book a one-way ticket." },
    writein:"Left open for whoever leaves next.", back:"Printed for the O’Connor family",
    labels:{ blessings:"Voices across the world", handwriting:"A page in your own handwriting", writein:"A page left for the next one to leave", letter:"A letter for whoever leaves next", numbers:"A year away, in numbers", tree:"A family tree" },
    home:{ entries:49, progress:80, status:"Month 11" },
    people:{ admin:"Liam", others:["Mum"] },
    feedHead:"From home", feed:[["M", "#2F4A5C", "Mum", "recorded a Sunday call"], ["S", "#B3261E", "Siobhán", "sent photos of the dog"], ["T", "#14A39B", "Tom", "added the five-a-side team photo"]],
    startNote:"Good. I’ve picked features for a story of leaving and arriving — change anything you like on the next screen.",
    question:"What did you miss this week that you didn’t expect to?", filed:"Month 11 · filed by the companion",
    newEntry:["“Someone at five-a-side called me by a nickname today.”", "Month 11 · filed under Two homes, by the companion"],
    entries:[["Voice note · 1:10", "“The first voicemail home, airport announcements and all.”", "Week 1 · filed under Arrivals"], ["3 photos", "The tram stop in June. Dark at four.", "Month 4 · filed under The first winter"], ["Scanned page", "Mum’s note from the suitcase.", "Waiting for your approval"]],
    thread:[["ai", "You said winter was the hardest. What did four o’clock look like?"], ["voice", "Voice note · 0:52"], ["ai", "There’s no photo of that tram stop. Shall I paint it from what you said?"], ["me", "Yes. Watercolour. It always looked a bit blurry."], ["page", "Painted for “The first winter”: the 86 stop at four, in watercolour."]],
    replies:["Who was the first person to know your name?", "What time is it at home right now, and what are they doing?", "What would you tell whoever leaves next?", "Good. I’ve added that to “Two homes”."]
  },
  us: {
    meta:{ title:"The Beginning of Us", by:"Camille & Noah", about:"One evening, and everything it started." },
    genre:"love",
    defaults:{ format:"portrait", mood:"romance", cover:"concept", voice:"flap", flaps:true, reveal:"auto", comic:true, comicStyle:"colour", comicLayout:"auto", drawings:"page", drawStyle:"watercolour",
               panelPos:"right", panelLabels:"pictures", greeting:true, blessings:false, handwriting:true, writein:true, letter:false, numbers:false, tree:true, treeStyle:"auto" },
    coverArt:"harbourCover", coverKicker:"One first date, kept", emblem:"emblemUs",
    concept:{ kind:"napkin", art:"coverNapkin" },
    chapters:US_CHAPTERS, collage:["harbour", "train", "harbour", "train"], greet:"v_us_hello", coverVoice:"v_n_taxi",
    dedication:{ text:"For the two of us, and the night it began.", sign:"C & N" },
    tree:{ title:"Two families, one table", sub:"Where each of us comes from", style:"branches", root:{ n:"Camille & Noah", r:"since that night", p:[
      { n:"Camille", r:"Lyon", face:{ g:"f", skin:"#F1D0B8", hair:"#5A3A22", shirt:"#8E2F48", bg:"#F6E3E3" }, p:[{ n:"Hélène", r:"Maman", face:{ g:"f", style:"short", skin:"#F1D0B8", shirt:"#3C4F5C", bg:"#F6E9E6" }, p:[{ n:"Odette", face:{ g:"f", style:"bun", skin:"#F1D0B8", shirt:"#6B5A8E", glasses:1, bg:"#F3ECE8" } }, { n:"Jean", face:{ g:"m", skin:"#F1D0B8", shirt:"#4E5A32", bg:"#F3ECE8" } }] }, { n:"Marc", r:"Papa", face:{ g:"m", skin:"#EFC9AE", hair:"#7A6A5A", shirt:"#2B2E33", glasses:1, bg:"#F6E9E6" }, p:[{ n:"Lucie", face:{ g:"f", style:"short", skin:"#EFC9AE", shirt:"#A2475F", bg:"#F3ECE8" } }, { n:"Henri", face:{ g:"m", skin:"#EFC9AE", shirt:"#5A4A3A", beard:1, bg:"#F3ECE8" } }] }] },
      { n:"Noah", r:"Leeds", face:{ g:"m", skin:"#8D5A3B", hair:"#1E1612", shirt:"#2F4A5C", bg:"#E4ECEE" }, p:[{ n:"Ruth", r:"Mum", face:{ g:"f", skin:"#8D5A3B", hair:"#1E1612", shirt:"#C26A3A", bg:"#E9EEF0" }, p:[{ n:"Esther", face:{ g:"f", style:"short", skin:"#7A4A30", shirt:"#2E6B5E", glasses:1, bg:"#EDF1F2" } }, { n:"Samuel", face:{ g:"m", skin:"#7A4A30", shirt:"#F1EDE4", beard:1, bg:"#EDF1F2" } }] }, { n:"David", r:"Dad", face:{ g:"m", skin:"#EFC9AE", hair:"#9A948A", shirt:"#4E5A32", bg:"#E9EEF0" }, p:[{ n:"Margaret", face:{ g:"f", style:"bun", skin:"#EFC9AE", shirt:"#6B2340", bg:"#EDF1F2" } }, { n:"Frank", face:{ g:"m", skin:"#EFC9AE", shirt:"#3C4F5C", glasses:1, bg:"#EDF1F2" } }] }] } ] } },
    numbers:{ runhead:"One night, in numbers", h:"One night", voice:null, items:[["6","tables"],["2","wrong dishes"],["3","hours"],["5","lamps on the walk"],["0","phones checked"],["1","boat called Patience"]] },
    blessings:{ runhead:"Their voices", h:"That night", items:["v_c_cam", "v_n_taxi"] },
    hand:{ runhead:"In Noah’s hand", text:"We walked the long way back. I pretended I’d forgotten where the station was. You laughed. You knew. Write this down, I thought. I was already sure." },
    letter:{ h:"Open in five years", seal:"♥", to:"For us, in 2031", note:"To be opened on our fifth anniversary." },
    writein:"", back:"Printed for Camille & Noah",
    labels:{ blessings:"Their voices", handwriting:"A page in your own handwriting", writein:"A page left to write in", letter:"A letter for five years from now", numbers:"One night, in numbers", tree:"Two family trees, meeting" },
    home:{ entries:23, progress:60, status:"Week 1" },
    people:{ admin:"Camille", others:["Noah"] },
    feedHead:"From the two of you", feed:[["C", "#C26A6A", "Camille", "added the receipt from table five"], ["N", "#3C4F5C", "Noah", "scanned a page of his notebook"], ["C", "#C26A6A", "Camille", "recorded the walk back"]],
    startNote:"Lovely. I’ve picked features for a love story — change anything you like on the next screen.",
    question:"What did you notice that you didn’t say out loud?", filed:"Week 1 · filed by the companion",
    newEntry:["“The waiter remembered us when we went back.”", "Week 2 · filed under The table by the window, by the companion"],
    entries:[["Voice note · 0:48", "“From the taxi home, nerves and all.”", "Night 1 · filed under The walk back"], ["6 photos", "From both phones, the window table.", "Night 1 · filed under The table by the window"], ["Scanned page", "Noah’s notebook page.", "Waiting for both of your approvals"]],
    thread:[["ai", "You both said dinner felt like twenty minutes. Camille — what did you notice about Noah?"], ["voice", "Voice note · 1:05"], ["ai", "And Noah — the same question, from your chair?"], ["me", "That she argues with her hands."], ["page", "Drafted for “What we talked about”: the same evening, from both chairs."]],
    replies:["What did you keep from that night?", "Where exactly did you stop on the walk back?", "What do you want to read in five years?", "Lovely. I’ve added that to “The walk back”."]
  }
});
let BOOK = BOOKS.kiara, CHAPTERS = KIARA_CHAPTERS;


/* ---------------------------------------------------------------------
   2. STATE
   f      = the features the person chose (screen 3)
   tweaks = changes made by asking the designer (screen 6)
   --------------------------------------------------------------------- */
const state = { book:null, saved:{}, meta:null, f:null, tweaks:null, plan:[], strip:[], notes:[], cur:0, history:[], copies:1, entries:0 };

// Open a book: keep the one you were in exactly as you left it.
function loadBook(id){
  if (state.book) state.saved[state.book] = { meta:state.meta, f:state.f, tweaks:state.tweaks, history:state.history, cur:state.cur, copies:state.copies, entries:state.entries };
  BOOK = BOOKS[id]; CHAPTERS = BOOK.chapters; state.book = id;
  Object.assign(state, state.saved[id] || { meta:{ ...BOOK.meta }, f:{ ...BOOK.defaults }, tweaks:{ photo:null, text:"full" }, history:[], cur:0, copies:1, entries:BOOK.home.entries });
  compose();
}


/* ---------------------------------------------------------------------
   3. THE COMPOSER
   Turns features + material into a layout plan: a list of pages, each
   naming a block and what fills it. This is the job the AI does in the
   real app (constrained to the same blocks and rules); here the rules
   are written out by hand so you can see them.
   --------------------------------------------------------------------- */
const MOODS = {
  classic:{ name:"Classic", desc:"ivory paper, olive cloth, a Didot serif, framed photos" },
  warm:   { name:"Warm",    desc:"cream paper, rose cloth, Garamond with handwritten accents, taped-in photos" },
  modern: { name:"Modern",  desc:"white paper, charcoal cloth, a light sans-serif, full-bleed photos" },
  playful:{ name:"Playful", desc:"warm white paper, sage cloth, rounded headings, taped-in photos" },
  bright: { name:"Bright",  desc:"board-book colours: a bold colour behind every chapter, stories in white boxes, rounded heavy headings, photos in thick white frames" }
};
// The board around the pages and the sound panel's housing take the book's colour.
MOODS.romance = { name:"Romance", desc:"light and quiet: warm white paper, pale blush linen, rose-gold foil, fine italic serif headings and generous white space" };
MOODS.comic   = { name:"Comic book", desc:"a comic-book edition: halftone paper, bold ink, primary colours, shouting lettering, stories in caption boxes" };
MOODS.atlas   = { name:"Atlas", desc:"map-paper cream, deep sea-blue cloth, a red route line, chapter openers like a travel journal" };
const BOARD = { classic:"#4E5A32", warm:"#8E4B52", modern:"#2B2E33", playful:"#5E9C86", bright:"#1B2350", romance:"#E9D6CF", atlas:"#2F4A5C", comic:"#14141C" };
const FORMATS = {
  portrait: { name:"Portrait A5",      size:"148 × 210 mm", ratio:148/210 },
  square:   { name:"Square",           size:"210 × 210 mm", ratio:1 },
  landscape:{ name:"Landscape album",  size:"297 × 210 mm", ratio:297/210 }
};
const STRIP_MAX = 8;
const ART_STYLE = { colour:"full colour", bw:"black-and-white ink", pencil:"pencil sketch", watercolour:"watercolour" };

function compose(){
  const f = state.f, t = state.tweaks;
  const photoStyle = t.photo || { classic:"framed", modern:"full", warm:"taped", playful:"taped", bright:"framed", romance:"full", atlas:"framed", comic:"framed" }[f.mood];
  const openers = f.mood === "classic" || f.mood === "modern" || f.mood === "atlas" || f.mood === "comic";
  const wide = f.format === "landscape";
  const plan = [];
  const add = (block, extra = {}) => plan.push({ block, ...extra });

  add("cover", { voices: f.voice === "cover" ? [BOOK.coverVoice] : [] });
  add("dedication");
  add("title");
  add("contents");
  CHAPTERS.forEach((c, ci) => {
    const v = c.voice ? [c.voice] : [];
    // One special device per chapter, so no book feels over-designed: an
    // event with many moments becomes a comic page (in place of its photo
    // page); a story with layers gets a lift-the-flap page. A moment with
    // no photo is drawn from the person's words — that stands in for the
    // photo, it isn't a device.
    const comic = f.comic && c.comic, inside = !comic && f.flaps && c.inside;
    const drawn = !c.photo && c.scene && f.drawings === "page";
    if (openers) add("opener", { ci });
    // A picture across both pages must start on a left-hand page.
    if (c.spread){ if (plan.length % 2 === 0) add("pullquote", { ci }); add("spreadL", { ci }); add("spreadR", { ci }); }
    // A comic strip sits on the story page itself; other comic layouts get a page.
    const onStory = comic && comicLayoutOf(c) === "strip";
    if (comic) add("comic", { ci, voices: [...(c.comic.voice ? [c.comic.voice] : []), ...(onStory ? v : [])] });
    if (wide && !comic) add("side", { ci, voices:v });
    else {
      if (c.photo && !comic) add("photo", { ci, photoStyle });
      if (drawn) add("sketch", { ci });
      if (!onStory) add("story", { ci, voices:v });
    }
    if (inside) add("inside", { ci });
    // The other devices, each chosen because of what the chapter is.
    if (c.tally)   add("tally", { ci });
    if (c.map)     add("map", { ci });
    if (c.clocks)  add("clocks", { ci });
    if (c.twov)    add("twov", { ci });
    if (c.foldout) add("foldout", { ci });
  });
  if (f.timeline && BOOK.timeline) add("timeline");
  if (f.tree && BOOK.tree)         add("tree");
  const nv = BOOK.numbers.voice;
  if (f.numbers)     add("numbers", { voices: f.voice === "cover" || !nv ? [] : [nv], tone:"sun" });
  if (f.blessings)   add("blessings", { voices:BOOK.blessings.items, tone:"teal" });
  if (f.handwriting) add("handwriting");
  if (f.letter)      add("letter");
  if (f.writein)     add("writein");
  if (f.voice === "strip") add("strip");
  if (plan.length % 2 === 0) add("blank");        // a book ends on a right-hand page before its back cover
  add("back");

  // Which recordings go on the physical sound strip, in page order.
  const strip = [];
  if (f.voice === "strip")
    plan.forEach(p => (p.voices || []).forEach(v => { if (!strip.includes(v) && strip.length < STRIP_MAX) strip.push(v); }));

  // Where each chapter starts, for the contents page.
  CHAPTERS.forEach((c, ci) => { c.page = plan.findIndex(p => p.ci === ci); });

  // The designer's notes: why the book looks the way it does.
  const voiceNote = {
    app:   "Voice in the app only: every recording plays here beside its page; the printed book stays quiet.",
    qr:    "QR codes: each voice moment is printed as a code that plays the recording on any phone, for as long as the book exists.",
    strip: `Sound panel ${PANEL_POS[f.panelPos]}: ${strip.length} recordings on ${f.panelLabels === "pictures" ? "picture buttons (each shows its moment)" : "numbered buttons"}, built into the book itself: the board is made wider to hold the panel, so pages and panel are one object. Each voice page shows which button to press.`,
    cover: "Cover button: one recording plays when the cover is pressed; the others play in the app.",
    wave:  "Printed sound waves: each recording is printed as its own waveform in foil; hold a phone over it and the app plays the voice. No electronics in the book.",
    flap:  "Buttons under flaps: each voice page has its own small press-to-play button, hidden under a flap that says ‘lift to hear’."
  }[f.voice];
  const extras = ["blessings", "handwriting", "letter", "writein", "numbers"]
    .filter(k => f[k]).map(k => BOOK.labels[k].toLowerCase());
  state.notes = [
    `${FORMATS[f.format].name} (${FORMATS[f.format].size}): ${wide ? "each moment’s photo sits beside its story on one wide page" : "each moment gets a photo page and a story page"}.`,
    `${MOODS[f.mood].name} mood: ${MOODS[f.mood].desc}.`,
    `Photos: ${{ framed:"framed with a thin border and an italic caption", full:"printed edge to edge with the caption over the picture", taped:"taped in at a slight angle with a handwritten caption" }[photoStyle]}${t.photo ? " (changed at your request)" : ""}.`,
    openers ? "Each chapter opens on its own page with a large number — calm and formal." : "Chapters run straight into their photos — warmer, more like an album.",
    voiceNote,
    extras.length ? `Added because you chose them: ${extras.join(", ")}.` : "No extra pages chosen.",
    CHAPTERS.some(c => c.comic) ? (f.comic ? `Comic page: “${CHAPTERS.find(c => c.comic).comic.title}” had too many moments for one photo, so it is told in ${CHAPTERS.find(c => c.comic).comic.panels.length} panels in rows, with captions and speech balloons, in ${ART_STYLE[f.comicStyle]}, laid out as ${{ grid:"rows of panels", splash:"one big panel with four small ones", strip:"a strip of three above the story", vertical:"panels stacked like a scroll" }[comicLayoutOf(CHAPTERS.find(c => c.comic))]}.` : "Comic pages off: busy events stay as photo and story pages.") : "",
    CHAPTERS.some(c => c.scene) ? (f.drawings === "off" ? "Moments with no photo stay as text." : `Drawn from memory: “${CHAPTERS.find(c => c.scene).title}” has no photo, so it is drawn from ${CHAPTERS.find(c => c.scene).scene.by}’s description, in ${ART_STYLE[f.drawStyle]}, ${f.drawings === "page" ? "as a full page" : "small, on the story page"}.`) : "",
    f.flaps ? `How hidden things open${f.reveal && f.reveal !== "auto" ? " (set by you for every page)" : ", chosen for each story"}: ${plan.filter(p => p.block === "inside").map(p => { const c = CHAPTERS[p.ci], M = MECHANISMS[mechanismFor(c)]; return `“${c.inside.title}” as ${M.name.toLowerCase()}, because ${M.why}`; }).join("; ") || "no page needs it"}.${CHAPTERS.some(c => c.behind && c.photo) ? " Photos lift to show what was just outside the frame." : ""}` : "Nothing opens: every page prints flat.",
    ({ collage:"Cover: the book’s moments as a collage in angled panels, the title on a band across the middle.", window:"Cover: cloth with a window cut into it, showing one moment; the title below.", type:"Cover: no picture — the title alone, set large, one word to a line." })[f.cover] || `Cover: ${f.cover}, foil title.`,
    ...CHAPTERS.filter(c => c.spread).map(c => `Across both pages: “${c.title}” opens with one picture spread over two facing pages — the composer starts it on a left-hand page.`),
    ...CHAPTERS.filter(c => c.foldout).map(c => `Fold-out: “${c.foldout.title}” is a panorama that folds into the page and opens out to three pages wide.`),
    ...CHAPTERS.filter(c => c.map).map(c => `Route map: “${c.title}” is a journey, so it gets a map with pins; tap a pin to read what happened there.`),
    ...CHAPTERS.filter(c => c.clocks).map(c => `Two clocks: “${c.title}” is about two places at once, so it shows both times side by side.`),
    ...CHAPTERS.filter(c => c.twov).map(c => `Two voices: “${c.title}” is told from both chairs, side by side.`),
    ...CHAPTERS.filter(c => c.tally).map(c => `Tally: “${c.title}” was eleven nos and a question, so it is printed as eleven stamps and one question mark.`),
    f.tree && BOOK.tree ? `Tree: “${BOOK.tree.title}”, drawn as ${BOOK.tree.style === "team" ? "a team tree growing from the garage, one dot per person" : (f.treeStyle === "fan" ? "a fan of generations" : (BOOK.tree.root.p && BOOK.tree.root.p.length === 2 && BOOK.tree.root.n.includes("&") ? "two family trees whose branches meet" : "a tree with branches, the oldest generation at the top"))}.` : "",
    f.timeline && BOOK.timeline ? `Timeline: “${BOOK.timeline.title}”.` : "",
    f.greeting ? "Greeting: a light-sensitive sound module plays a welcome the moment the cover is opened, like a musical greeting card." : "No greeting on opening.",
    `${plan.length} pages${t.text === "short" ? ", short text (changed at your request)" : ", full stories"}. In the real app the print rules — safe area, photo resolution, page count in multiples of four — are checked here before ordering.`
  ].filter(Boolean);
  state.plan = plan;
  state.strip = strip;
  state.cur = Math.min(state.cur, plan.length - 1);
}


/* ---------------------------------------------------------------------
   4. THE RENDERER
   One page of the plan -> HTML, using the page designs in
   css/book-pages.css plus the blocks in app.css section 6.
   --------------------------------------------------------------------- */
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[ch]));

function voiceEl(id){
  if (!id) return "";
  const v = VOICES[id], mode = state.f.voice;
  const n = state.strip.indexOf(id) + 1;
  if (mode === "strip" && n)
    return state.f.panelLabels === "pictures"
      ? `<button type="button" class="vbtn" data-v="${id}"><span class="vnum pic">${picEl(id)}</span>${esc(v.label)}</button>`
      : `<button type="button" class="vbtn" data-v="${id}"><span class="vnum">${n}</span>${esc(v.label)}</button>`;
  if (mode === "wave")
    return `<button type="button" class="vwave" data-v="${id}">${waveSVG(v.seed)}<span><b>${esc(v.label)}</b>${esc(v.who)} · ${v.len}</span></button>`;
  if (mode === "flap")
    return `<div class="vflap">${flapEl(`<span class="vlid">♪ ${esc(v.label)}</span>`, `<button type="button" class="vbtn" data-v="${id}"><span class="play">▶</span>${esc(v.label)} · ${v.len}</button>`, "mini")}</div>`;
  if (mode === "qr")
    return `<div class="qr vq" data-v="${id}" role="button" tabindex="0"><canvas class="qrc" data-seed="${v.seed}" width="25" height="25"></canvas><p><b>${esc(v.label)}</b>${esc(v.who)} · ${v.len}</p></div>`;
  return `<button type="button" class="vbtn" data-v="${id}"><span class="play">▶</span>${esc(v.label)} · ${v.len}</button>`;
}

// The recording drawn as its own sound wave (printed in foil or ink).
function waveSVG(seed){
  let x = seed * 7919, bars = "";
  for (let i = 0; i < 56; i++){
    x = (x * 9301 + 49297) % 233280;
    const env = Math.sin(Math.PI * (i + .5) / 56) ** .6, h = 3 + env * (6 + (x / 233280) * 26);
    bars += `<rect x="${i * 3.6}" y="${20 - h / 2}" width="2" height="${h}" rx="1"/>`;
  }
  return `<svg viewBox="0 0 200 40" aria-hidden="true">${bars}</svg>`;
}

function photoEl(key, cap, style, behind){
  let svg = style === "full" ? pictureOf(key).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ') : pictureOf(key);
  if (state.f.flaps && behind)
    svg = `<div class="explore ph">${flapEl(svg.replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ') + '<span class="ltab">Lift</span>',
      `<div class="layer l0"><span class="lk">Behind the photo</span><p>${esc(behind)}</p></div>`)}</div>`;
  return `<figure class="photo ${style === "taped" ? "" : style}">${svg}<figcaption>${esc(cap)}</figcaption></figure>`;
}

// A flap: the lid (what you see) on top, the inside underneath. An inside
// can hold another, smaller flap, so a picture opens in layers.
function flapEl(lid, inside, cls = ""){
  return `<div class="flap ${cls}"><div class="flap-in">${inside}<button type="button" class="fclose" aria-label="Fold the flap back">↺</button></div><button type="button" class="lid" aria-expanded="false">${lid}</button></div>`;
}
// A picture on a flap shows whole, on its own background colour.
const bgOf = svg => (svg.match(/<rect[^>]*fill="(#[0-9A-Fa-f]{3,6})"/) || [])[1] || "#1B2350";
function lidArt(l, k){
  if (l.photo || l.art){
    const svg = l.photo ? pictureOf(l.photo) : ART[l.art];
    return `<span class="lart" style="background:${bgOf(svg)}">${svg}</span><span class="ltab">${esc(l.label)}</span>`;
  }
  return `<span class="licon l${k}">${ICONS[l.icon]}<b>${esc(l.label)}</b></span>`;
}
function layerHTML(s, k, skin){
  const L = s.layers[k], n = s.layers.length;
  const sub = k + 1 < n ? flapEl(skin === "envelope" ? envLid(L.lid) : lidArt(L.lid, k + 1), layerHTML(s, k + 1, skin), "inner") : "";
  return `${layerCard(L, k, n)}${sub}`;
}
const layerCard = (L, k, n, tag = "div") => `<${tag} class="layer l${k}${L.mono ? " mono" : ""}"><h5>${esc(L.h)}</h5><p>${esc(L.t)}</p></${tag}>`;
const lidPic = l => { const svg = l.photo ? pictureOf(l.photo) : ART[l.art]; return `<span class="lart" style="background:${bgOf(svg)}">${svg}</span>`; };
// An envelope: the picture as its stamp, the label as its address.
const envLid = (l, pic) => `<span class="env"><span class="envflap"></span>${pic ? `<span class="stamp">${pic}</span>` : (l.icon ? `<span class="stamp ic">${ICONS[l.icon]}</span>` : "")}<b>${esc(l.label)}</b></span>`;

/* The ways a hidden page can open. Each suits some kinds of story and some
   kinds of book; the composer picks the best fit for every page, so two
   books (or two pages) rarely open the same way. The person can override. */
const MECHANISMS = {
  layers:    { name:"Layered flaps", cue:"Lift", kinds:["mind"], genres:["baby", "family", "kids"],
               why:"it goes deeper into one person, layer by layer",
               render:s => flapEl(lidArt(s.lid, 0), layerHTML(s, 0)) },
  drawer:    { name:"A pull-out drawer", cue:"Pull", kinds:["record", "hidden"], genres:[],
               why:"it is something that was kept, so it slides out like a drawer",
               render:s => flapEl(lidPic(s.lid) + '<span class="handle"></span><span class="ltab">' + esc(s.lid.label) + "</span>", layerHTML(s, 0)) },
  envelope:  { name:"Envelopes inside envelopes", cue:"Open", kinds:["secret", "letter"], genres:["wedding", "love"],
               why:"it was said once, privately, so each layer is opened rather than lifted",
               render:s => flapEl(envLid({ ...s.lid, label:"Open" }, (s.lid.photo ? pictureOf(s.lid.photo) : ART[s.lid.art])), layerHTML(s, 0, "envelope")) },
  wheel:     { name:"A turning wheel", cue:"Turn", kinds:["perspectives", "steps"], genres:["family"],
               why:"it is one moment seen several ways, so you turn from one to the next",
               render:s => wheelHTML(s) },
  scratch:   { name:"Scratch to reveal", cue:"Scratch", kinds:["surprise"], genres:["kids"],
               why:"the last line is a surprise, so the reader uncovers it",
               render:s => scratchHTML(s) },
  pocket:    { name:"A pocket of keepsakes", cue:"Pull", kinds:["keepsakes"], genres:["love", "travel", "migration", "wedding"],
               why:"they are things that were kept — tickets, receipts, notes — so they live in a pocket you can pull them from",
               render:s => `<div class="pocket"><div class="pk-cards">${s.layers.map((L, k) => `<div class="pkc ${L.look || "ticket"}" style="--k:${k};--n:${s.layers.length}"><b>${esc(L.h)}</b><span>${esc(L.t)}</span></div>`).join("")}</div><div class="pk-front"><span>${esc(s.title)}</span></div><button type="button" class="pk-pull">Pull</button></div>` },
  blueprint: { name:"An annotated blueprint", cue:"Key", kinds:["mind", "how-it-works"], genres:["engineering", "work", "science"],
               why:"in a book about engineering, the inside of a moment is drawn like a technical drawing, with numbered callouts",
               render:s => blueprintHTML(s) }
};
function mechanismFor(c){
  const r = state.f.reveal;
  if (r && r !== "auto" && MECHANISMS[r]) return r;
  const k = c.inside.kind, g = BOOK.genre;
  const score = id => (MECHANISMS[id].kinds.includes(k) ? 2 : 0) + (MECHANISMS[id].genres.includes(g) ? 1 : 0);
  return Object.keys(MECHANISMS).reduce((best, id) => score(id) > score(best) ? id : best, "layers");
}

// A disc behind the page turns; a window shows one view at a time.
function wheelHTML(s){
  const n = s.layers.length + 1;
  const views = [lidPic(s.lid), ...s.layers.map((L, k) => layerCard(L, k, s.layers.length))];
  return `<div class="wheel" data-k="0" data-n="${n}"><div class="disc"><i></i></div><div class="wwin">${views.map((v, k) => `<div class="ws${k ? "" : " on"}">${v}</div>`).join("")}</div><button type="button" class="wturn">Turn ↻</button></div>`;
}
// Everything printed, except the last line, which is under a scratch panel.
function scratchHTML(s){
  const n = s.layers.length, last = s.layers[n - 1];
  return `<div class="scratch"><div class="sc-pic">${lidPic(s.lid)}</div>${s.layers.slice(0, -1).map((L, k) => `<p class="sc-l"><b>${esc(L.h)}.</b> ${esc(L.t)}</p>`).join("")}<div class="scbox layer l${n - 1}"><span class="lk">${n} of ${n}</span><h5>${esc(last.h)}</h5><p>${esc(last.t)}</p><canvas class="scratchc" aria-label="Scratch to reveal"></canvas></div></div>`;
}
// The picture as a technical drawing; numbered callouts open notes.
function blueprintHTML(s){
  const pts = s.points || [[25, 30], [55, 25], [80, 45]];
  return `<div class="blueprint callouts"><div class="bp-art">${s.lid.photo ? pictureOf(s.lid.photo) : ART[s.lid.art]}</div>${s.layers.map((L, k) => `<button type="button" class="bpn" data-k="${k}" style="left:${pts[k][0]}%;top:${pts[k][1]}%" aria-label="${esc(L.h)}">${k + 1}</button>`).join("")}<ol class="bp-key">${s.layers.map((L, k) => `<li class="bpc" data-k="${k}"><b>${esc(L.h)}</b> ${esc(L.t)}</li>`).join("")}</ol><span class="bp-title">Drawn from memory · scale 1:1</span></div>`;
}
// Scratch panels are painted once the page is on screen.
function initScratch(){
  _qq("canvas.scratchc:not([data-ready])").forEach(cv => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const d = devicePixelRatio || 1, g = cv.getContext("2d");
    cv.width = r.width * d; cv.height = r.height * d; cv.dataset.ready = 1;
    const gr = g.createLinearGradient(0, 0, cv.width, cv.height);
    gr.addColorStop(0, "#C9CBD1"); gr.addColorStop(.5, "#EDEEF1"); gr.addColorStop(1, "#AFB2BA");
    g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = "#6B6E78"; g.font = `600 ${12 * d}px Commissioner, sans-serif`; g.textAlign = "center";
    g.fillText("✦ Scratch ✦", cv.width / 2, cv.height / 2 + 4 * d);
    let on = false;
    const rub = e => { if (!on) return; const b = cv.getBoundingClientRect(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc((e.clientX - b.left) * d, (e.clientY - b.top) * d, 14 * d, 0, 7); g.fill(); };
    cv.addEventListener("pointerdown", e => { on = true; cv.setPointerCapture(e.pointerId); rub(e); e.stopPropagation(); });
    cv.addEventListener("pointermove", rub);
    cv.addEventListener("pointerup", e => { on = false; e.stopPropagation(); });
  });
}

function storyBody(c){
  if (state.tweaks.text === "short") return `<p class="lead">${esc(c.story[0][1])}</p>`;
  return `<dl>${c.story.map(([dt, dd]) => `<div><dt>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`).join("")}</dl>`;
}

function renderPage(i){
  const p = state.plan[i], f = state.f, m = state.meta;
  const num = `<span class="num">${i}</span>`;
  const c = p.ci != null ? CHAPTERS[p.ci] : null;
  switch (p.block){
    case "cover": {
      const btn = f.voice === "cover" ? `<button type="button" class="coverbtn" data-v="${BOOK.coverVoice}"><i></i>Press</button>` : "";
      if (f.cover === "collage"){
        const shards = BOOK.collage.map((k, n) => `<div class="sh s${n}">${pictureOf(k).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ')}</div>`).join("");
        return `<div class="cover collage"><div class="shards">${shards}</div><div class="cband"><div class="ct">${esc(m.title)}</div><div class="ca">${esc(m.by)}</div></div><div class="cb">Empeirya</div>${btn}</div>`;
      }
      if (f.cover === "window"){
        const pic = pictureOf(BOOK.collage[0]).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
        return `<div class="cover window"><div class="cwin">${pic}</div><div class="ct">${esc(m.title)}</div><div class="ca">${esc(m.by)}</div><div class="cb">Empeirya</div>${btn}</div>`;
      }
      // A cover made from what is inside the book: the thing becomes the cover, the title is written on it.
      if (f.cover === "concept" && BOOK.concept){
        const k = BOOK.concept, art = uniq(ART[k.art]).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
        if (k.kind === "blueprint")
          return `<div class="cover concept cn-blueprint">${art}<div class="bpc-head"><span>${esc(k.sheet)}</span><div class="ct">${esc(m.title)}</div></div><div class="bpc-block">${k.block.map(([a, b]) => `<div><i>${esc(a)}</i><b>${esc(b === "{by}" ? m.by : b)}</b></div>`).join("")}</div>${btn}</div>`;
        if (k.kind === "airmail")
          return `<div class="cover concept cn-airmail">${art}<div class="am-addr"><span class="am-to">${esc(k.to)}</span><div class="ct">${esc(m.title)}</div><div class="ca">${esc(m.by)}</div></div>${btn}</div>`;
        if (k.kind === "napkin")
          return `<div class="cover concept cn-napkin">${art}<div class="nk-title"><div class="ct">${esc(m.title)}</div></div><div class="nk-by">${esc(m.by)}</div>${btn}</div>`;
      }
      if (f.cover === "art" && BOOK.coverArt){
        const pic = uniq(ART[BOOK.coverArt]).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
        return `<div class="cover artc ${BOOK.coverArt}">${pic}<div class="ac-frame"></div><div class="ac-title"><span class="ac-kicker">${esc(BOOK.coverKicker || "")}</span><div class="ct foil">${esc(m.title)}</div><div class="ca">${esc(m.by)}</div></div><div class="cb foil">Empeirya</div>${btn}</div>`;
      }
      if (f.cover === "foil" && BOOK.emblem){
        return `<div class="cover foilc"><div class="fc-frame"><i></i><i></i><i></i><i></i></div><div class="fc-emblem foil-ink">${uniq(ART[BOOK.emblem])}</div><div class="ct foil">${esc(m.title)}</div><div class="fc-rule foil-ink">◆</div><div class="ca foil">${esc(m.by)}</div><div class="cb foil">Empeirya</div>${btn}</div>`;
      }
      if (f.cover === "comic"){
        const pic = pictureOf(BOOK.comicArt || BOOK.collage[0]).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
        return `<div class="cover comicc"><div class="cc-top"><span class="cc-issue">No. 1</span><span class="cc-yrs">${esc(m.about)}</span></div><div class="cc-title">${m.title.split(" ").map(w => `<span>${esc(w)}</span>`).join(" ")}</div><div class="cc-panel">${pic}</div><div class="cc-by">${esc(m.by)}</div>${btn}</div>`;
      }
      if (f.cover === "photo"){
        const pic = pictureOf(BOOK.collage[0]).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
        return `<div class="cover photoc"><div class="pcimg">${pic}</div><div class="pct"><div class="ct">${esc(m.title)}</div><span class="pcr"></span><div class="ca">${esc(m.by)}</div></div>${btn}</div>`;
      }
      if (f.cover === "type")
        return `<div class="cover typo"><div class="tt">${m.title.split(" ").map(w => `<span>${esc(w)}</span>`).join("")}</div><div class="ca">${esc(m.by)}</div>${btn}</div>`;
      return `<div class="cover ${f.cover === "cloth" ? "" : f.cover}"><svg class="emb"><use href="#heart"/></svg><div class="ct">${esc(m.title)}</div><div class="cr"></div><div class="ca">${esc(m.by)}</div><div class="cb">Empeirya</div>${btn}</div>`;
    }
    case "dedication":
      return `<div class="pg endp"><div class="dedic">${esc(BOOK.dedication.text)}<small>${esc(BOOK.dedication.sign)}</small></div></div>`;
    case "title":
      return `<div class="pg titlepg"><span class="tb">Empeirya</span><h4>${esc(m.title)}</h4><span class="sub">${esc(m.about)}</span><span style="font-size:1.2em">${esc(m.by)}</span>${num}</div>`;
    case "contents":
      return `<div class="pg"><span class="runhead">Contents</span><ul class="toc">${CHAPTERS.map(ch => `<li><b>${ch.num}</b><div>${esc(ch.title)}<i>${esc(ch.sub)}</i></div><span>${ch.page}</span></li>`).join("")}</ul>${num}</div>`;
    case "opener":
      return `<div class="pg chap"><span class="roman">${c.num}</span><h4>${esc(c.title)}</h4><blockquote>“${esc(c.lesson)}”</blockquote><span class="meta">${c.when}</span>${num}</div>`;
    case "photo": {
      if (p.photoStyle === "full") return photoEl(c.photo, c.cap, "full", c.behind);
      const head = (f.mood === "warm" || f.mood === "playful") ? `<h4>${esc(c.title)}</h4>` : "";
      return `<div class="pg photopg"><span class="runhead">${c.when}</span>${head}${photoEl(c.photo, c.cap, p.photoStyle, c.behind)}${num}</div>`;
    }
    case "comic": {
      const cm = c.comic, lay = comicLayoutOf(c), list = lay === "strip" ? cm.panels.slice(0, 3) : cm.panels;
      const story = lay === "strip" ? `<h4>${esc(c.title)}</h4>${storyBody(c)}<p class="hl">${esc(c.lesson)}</p>` : "";
      const panels = list.map(pn => `<div class="cp${pn.wide && lay === "grid" ? " wide" : ""}">${pictureOf(pn.art).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ')}<span class="ccap">${esc(pn.cap)}</span>${pn.say ? `<span class="cbub">${esc(pn.say)}</span>` : ""}${pn.sfx ? `<span class="csfx">${esc(pn.sfx)}</span>` : ""}</div>`).join("");
      return `<div class="pg comicpg art-${f.comicStyle} lay-${lay}"><span class="runhead">${c.when} · ${esc(cm.title)}</span><div class="comic ${lay}">${panels}</div>${story}${(p.voices || []).map(voiceEl).join("")}${num}</div>`;
    }
    case "sketch":
      return `<div class="pg sketchpg art-${f.drawStyle}"><span class="runhead">${c.when} · ${esc(c.sub)}</span>${sketchEl(c)}${num}</div>`;
    case "story":
      return `<div class="pg${!c.photo && c.scene && f.drawings === "spot" ? ` art-${f.drawStyle}` : ""}"><span class="runhead">${c.when} · ${esc(c.title)}</span><h4>${esc(c.title)}</h4>${!c.photo && c.scene && f.drawings === "spot" ? sketchEl(c, true) : ""}${storyBody(c)}<p class="hl">${esc(c.lesson)}</p>${voiceEl(c.voice)}${num}</div>`;
    case "inside": {
      const mech = mechanismFor(c), M = MECHANISMS[mech];
      return `<div class="pg insidepg"><span class="runhead">${c.when} · ${esc(c.sub)}</span><h4>${esc(c.inside.title)}</h4><div class="explore rv-${mech}">${M.render(c.inside)}</div>${num}</div>`;
    }
    case "side":
      return `<div class="pg side">${c.photo ? photoEl(c.photo, c.cap, state.tweaks.photo === "full" ? "framed" : (f.mood === "warm" || f.mood === "playful" ? "taped" : "framed"), c.behind) : `<div class="col"><span class="roman" style="font-family:var(--display);font-size:5em;color:var(--gold-ink);line-height:1">${c.num}</span></div>`}<div class="col"><span class="runhead" style="text-align:left">${c.when}</span><h4>${esc(c.title)}</h4>${storyBody(c)}<p class="hl">${esc(c.lesson)}</p>${voiceEl(c.voice)}</div>${num}</div>`;
    case "numbers":
      return `<div class="pg"><span class="runhead">${esc(BOOK.numbers.runhead)}</span><h4>${esc(BOOK.numbers.h)}</h4><div class="nums">${BOOK.numbers.items.map(([b, t]) => `<div><b>${esc(b)}</b><span>${esc(t)}</span></div>`).join("")}</div>${(p.voices || []).map(voiceEl).join("")}${num}</div>`;
    case "blessings":
      return `<div class="pg"><span class="runhead">${esc(BOOK.blessings.runhead)}</span><h4>${esc(BOOK.blessings.h)}</h4><div class="bless">${BOOK.blessings.items.map(id => `<div class="bl"><b>${esc(VOICES[id].who)}</b><q>${esc(VOICES[id].text)}</q>${voiceEl(id)}</div>`).join("")}</div>${num}</div>`;
    case "handwriting":
      return `<div class="pg handpg"><span class="runhead">${esc(BOOK.hand.runhead)}</span><p class="hn">${esc(BOOK.hand.text)}</p>${num}</div>`;
    case "letter":
      return `<div class="pg"><span class="runhead">Letters for later</span><h4>${esc(BOOK.letter.h)}</h4><div class="envelope"><span class="seal">${esc(BOOK.letter.seal)}</span></div><p class="letter-to">${esc(BOOK.letter.to)}</p><p class="sub" style="text-align:center">${esc(BOOK.letter.note)}</p>${num}</div>`;
    case "writein":
      return `<div class="pg handpg"><span class="runhead">Your page</span><div class="hn empty" aria-hidden="true"></div>${num}</div>`;
    case "strip": {
      const pics = f.panelLabels === "pictures";
      const art = state.strip.map((id, k) => pics ? `<i class="pa">${picEl(id)}</i>` : `<i>${k + 1}</i>`).join("");
      const list = state.strip.map((id, k) => `<li data-v="${id}" role="button" tabindex="0"><span class="sn ${pics ? "pic" : ""}">${pics ? picEl(id) : k + 1}</span>${esc(VOICES[id].label)} — ${esc(VOICES[id].who)}</li>`).join("");
      return `<div class="pg"><span class="runhead">The voices</span><h4>Voices in this book</h4><div class="stripart ${pics ? "pics" : ""}" aria-hidden="true">${art}</div><ol class="striplist">${list}</ol>${num}</div>`;
    }
    case "pullquote":
      return `<div class="pg pullq"><span class="pqn">${c.num}</span><blockquote>“${esc(c.lesson)}”</blockquote><span class="meta">${esc(c.sub)}</span>${num}</div>`;
    case "spreadL": case "spreadR": {
      const sp = c.spread, pic = pictureOf(sp.art).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" '), L = p.block === "spreadL";
      // The picture runs across the top of both pages; the words sit below it, on paper.
      return `<div class="pg spreadpg ${L ? "sl" : "sr"}"><div class="spimg">${pic}</div><div class="spband">${L ? `<span class="runhead">${c.when} · ${esc(c.sub)}</span><h4>${esc(c.title)}</h4>` : `<p>${esc(sp.line)}</p>${voiceEl(c.voice)}`}</div></div>`;
    }
    case "foldout": {
      const fo = c.foldout, pic = pictureOf(fo.art).replace("<svg ", '<svg preserveAspectRatio="xMinYMid slice" ');
      return `<div class="pg foldpg"><span class="runhead">${c.when} · ${esc(c.sub)}</span><h4>${esc(fo.title)}</h4><button type="button" class="fold" data-fold="${fo.art}" data-cap="${esc(fo.line)}"><span class="fold-img">${pic}</span><span class="fold-panel"></span><span class="ltab">Unfold</span></button><p class="foldline">${esc(fo.line)}</p>${num}</div>`;
    }
    case "map": {
      const mp = c.map;
      return `<div class="pg mappg"><span class="runhead">${c.when} · ${esc(c.sub)}</span><h4>${esc(mp.title)}</h4><div class="mapv callouts">${mapSVG(mp)}<ol class="bp-key">${mp.pins.map((pn, k) => `<li class="bpc" data-k="${k}"><b>${esc(pn.n)}</b> ${esc(pn.t)}</li>`).join("")}</ol></div>${num}</div>`;
    }
    case "clocks": {
      const ck = c.clocks, one = x => `<div class="clk">${clockSVG(x.h, x.m)}<b>${esc(x.city)}</b><span>${String(x.h).padStart(2, "0")}:${String(x.m).padStart(2, "0")}</span><p>${esc(x.note)}</p></div>`;
      return `<div class="pg clockpg"><span class="runhead">${c.when} · ${esc(c.sub)}</span><h4>${esc(ck.title)}</h4><div class="clocks">${one(ck.a)}<i class="clk-line"></i>${one(ck.b)}</div><p class="hl">${esc(c.lesson)}</p>${num}</div>`;
    }
    case "twov": {
      const tv = c.twov;
      return `<div class="pg twovpg"><span class="runhead">${c.when} · ${esc(c.sub)}</span><h4>${esc(tv.title)}</h4><div class="twov"><div class="tv a"><b>${esc(tv.a.who)}</b><p>${esc(tv.a.text)}</p></div><svg class="tvh"><use href="#heart"/></svg><div class="tv b"><b>${esc(tv.b.who)}</b><p>${esc(tv.b.text)}</p></div></div>${num}</div>`;
    }
    case "tally": {
      const tl = c.tally;
      return `<div class="pg tallypg"><span class="runhead">${c.when} · ${esc(c.sub)}</span><h4>${esc(tl.title)}</h4><div class="tally">${tl.nos.map(([who, why], k) => `<div class="no" style="--r:${(k * 37) % 13 - 6}deg"><span>NO</span><b>${esc(who)}</b><i>${esc(why)}</i></div>`).join("")}<div class="no q"><span>?</span><i>${esc(tl.q)}</i></div></div>${voiceEl(c.voice)}${num}</div>`;
    }
    case "timeline": {
      const tm = BOOK.timeline;
      return `<div class="pg timepg"><span class="runhead">The whole story</span><h4>${esc(tm.title)}</h4><ol class="tline">${tm.items.map(([y, e, n]) => `<li><b>${esc(y)}</b><span>${esc(e)}</span><i>${esc(n)}</i></li>`).join("")}</ol>${num}</div>`;
    }
    case "tree": {
      const tr = BOOK.tree, st = tr.style === "team" ? "team" : (f.treeStyle === "fan" ? "fan" : "branches");
      const svg = st === "team" ? teamSVG(tr.team) : st === "fan" ? fanSVG(tr.root) : branchesSVG(tr.root);
      return `<div class="pg treepg tree-${st}"><span class="runhead">${esc(tr.sub)}</span><h4>${esc(tr.title)}</h4><div class="treebox">${svg}</div>${num}</div>`;
    }
    case "blank":
      return `<div class="pg"></div>`;
    case "back":
      return `<div class="backcover full"><div><svg><use href="#heart"/></svg><span>Empeirya</span><small>${esc(BOOK.back)}</small></div></div>`;
  }
  return "";
}

// Comic layout: the person's choice, or the one that suits the story.
const comicLayoutOf = c => (state.f.comicLayout && state.f.comicLayout !== "auto") ? state.f.comicLayout : (c.comic.layout || "grid");

// A moment with no photo, drawn from the person's words.
function sketchEl(c, spot){
  return `<figure class="sketch${spot ? " spot" : ""}">${pictureOf(c.scene.art)}${spot ? "" : `<figcaption>“${esc(c.scene.said)}”<small>— ${esc(c.scene.by)}</small></figcaption>`}</figure>`;
}

// A page element at a given size, carrying the book's design tokens.
function pageEl(i, w, h){
  const el = document.createElement("div");
  el.className = "bpage book";
  el.dataset.mood = state.f.mood;
  const p = state.plan[i], tone = p.tone || (p.ci != null ? CHAPTERS[p.ci].tone : null);
  if (tone) el.dataset.tone = tone;
  el.style.setProperty("--pw", w + "px");
  el.style.setProperty("--ph", h + "px");
  el.innerHTML = renderPage(i);
  return el;
}

// Largest page of the book's shape that fits a box.
function fitPage(boxW, boxH){
  const r = FORMATS[state.f.format].ratio;
  let w = boxW, h = w / r;
  if (h > boxH){ h = boxH; w = h * r; }
  return [Math.floor(w), Math.floor(h)];
}

function miniCover(el, size){
  const r = FORMATS[state.f.format].ratio;
  const w = r >= 1 ? size * 1.25 : size, h = w / r;
  el.style.width = w + "px"; el.style.height = h + "px";
  el.innerHTML = "";
  const page = pageEl(0, w, h);
  el.appendChild(page);
}



/* ---------------------------------------------------------------------
   5. INTERACTION: anything on a page that opens, turns or reveals
   --------------------------------------------------------------------- */
// Turn a wheel; tap a blueprint callout.
document.addEventListener("click", e => {
  const tw = e.target.closest(".wturn");
  if (tw){
    const w = tw.closest(".wheel"), n = +w.dataset.n, k = (+w.dataset.k + 1) % n, turns = (+w.dataset.t || 0) + 1;
    w.dataset.k = k; w.dataset.t = turns;
    w.querySelector(".disc").style.transform = `rotate(${turns * 360 / n}deg)`;
    w.querySelectorAll(".ws").forEach((x, i) => x.classList.toggle("on", i === k));
    return;
  }
  const bn = e.target.closest(".bpn, .mpin");
  if (bn){
    const b = bn.closest(".callouts");
    b.querySelectorAll(".bpn, .mpin").forEach(x => x.classList.toggle("on", x === bn));
    bn.classList.add("seen");
    b.querySelectorAll(".bpc").forEach(x => x.classList.toggle("on", x.dataset.k === bn.dataset.k));
  }
});

// Pull keepsakes out of a pocket (and push them back).
document.addEventListener("click", e => {
  const pk = e.target.closest(".pk-pull");
  if (pk){ const p = pk.closest(".pocket"); p.classList.toggle("out"); pk.textContent = p.classList.contains("out") ? "Back" : "Pull"; }
});

// Unfold a fold-out: the panorama opens out across the screen.
document.addEventListener("click", e => {
  const fo = e.target.closest(".fold");
  if (fo){
    let ov = _q("#unfold");
    if (!ov){
      ov = document.createElement("div"); ov.id = "unfold"; ov.className = "unfold"; ov.setAttribute("role", "dialog");
      ov.innerHTML = '<div class="uf-paper"><div class="uf-img"></div><p class="uf-cap"></p></div><button type="button" class="uf-close">Fold it back ✕</button>';
      document.body.appendChild(ov);
      ov.addEventListener("click", ev => { if (ev.target === ov || ev.target.closest(".uf-close")) ov.classList.remove("on"); });
    }
    ov.querySelector(".uf-img").innerHTML = pictureOf(fo.dataset.fold);
    ov.querySelector(".uf-cap").textContent = fo.dataset.cap;
    requestAnimationFrame(() => ov.classList.add("on"));
  }
});

// Lift a flap / fold it back (and every flap inside it).
document.addEventListener("click", e => {
  const lid = e.target.closest(".lid");
  if (lid){ lid.parentElement.classList.add("open"); lid.setAttribute("aria-expanded", "true"); return; }
  const fc = e.target.closest(".fclose");
  if (fc){
    const fl = fc.closest(".flap");
    [fl, ...fl.querySelectorAll(".flap.open")].forEach(x => { x.classList.remove("open"); x.querySelector(":scope > .lid").setAttribute("aria-expanded", "false"); });
  }
});



/* ---------------------------------------------------------------------
   6. VOICE PLAYBACK
   Any element with data-v="<voice id>" plays that recording from
   app/audio/<id>.m4a. If the file can't play, the browser's speech voice
   reads the words instead, so there is always something to hear.
   --------------------------------------------------------------------- */
let speakingId = null;
const audio = new Audio();
audio.preload = "auto";

function play(id){
  const v = VOICES[id]; if (!v) return;
  stopVoice();
  speakingId = id;
  if (_q("#playing")){
    _q("#plLabel").textContent = `${v.label} · ${v.who}`;
    _q("#plText").textContent = `“${v.text}”`;
    _q("#playing").hidden = false;
  }
  _qq(`.strip button[data-v="${id}"]`).forEach(b => b.classList.add("playing"));
  audio.src = `${AUDIO_BASE}${id}.m4a`;
  audio.onended = () => { if (speakingId === id) stopVoice(); };
  audio.play().catch(() => speak(id));
}

// Fallback: the browser reads the words aloud.
function speak(id){
  const v = VOICES[id];
  if (!("speechSynthesis" in window) || speakingId !== id){ setTimeout(() => { if (speakingId === id) stopVoice(); }, 3500); return; }
  const u = new SpeechSynthesisUtterance(v.text);
  const voices = speechSynthesis.getVoices();
  u.voice = voices.find(x => x.lang === "en-IN") || voices.find(x => x.lang.startsWith("en")) || null;
  u.pitch = v.pitch; u.rate = .95;
  u.onend = () => { if (speakingId === id) stopVoice(); };
  speechSynthesis.speak(u);
}
function stopVoice(){
  audio.pause();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  speakingId = null;
  if (_q("#playing")) _q("#playing").hidden = true;
  _qq(".strip button.playing").forEach(b => b.classList.remove("playing"));
}
_q("#plStop")?.addEventListener("click", stopVoice);
document.addEventListener("click", e => {
  const v = e.target.closest("[data-v]");
  if (v){ e.preventDefault(); play(v.dataset.v); }
});
document.addEventListener("keydown", e => {
  const v = e.target.closest?.("[data-v]");
  if (v && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); play(v.dataset.v); }
});


