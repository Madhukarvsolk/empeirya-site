/* =====================================================================
   EMPEIRYA — decorative QR codes
   ---------------------------------------------------------------------
   In the real product, each story page would carry a QR code that plays
   the original voice recording. In this prototype we only DRAW something
   that looks like a QR code, so it does not scan.

   How it works:
     - Find every <canvas class="qrc"> on the page.
     - Each canvas is 25 x 25 pixels; each pixel is one QR "module".
     - Fill random modules using a seeded random number generator, so the
       same seed always gives the same pattern (data-seed="7" etc.).
     - Draw the three square "finder" corners every QR code has.
     - CSS scales the canvas up with image-rendering: pixelated so the
       squares stay crisp.

   To make real, scannable codes later, swap this for a QR library such
   as "qrcode" from npm and encode a link to the recording.
   ===================================================================== */
function drawQRCodes(){
  document.querySelectorAll(".qrc").forEach(canvas => {
    const ctx = canvas.getContext("2d");
    const n = 25;                       // modules per side
    const paper = "#FBF9F3", ink = "#2A2620";

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, n, n);

    // Park–Miller "minimal standard" generator: tiny and repeatable.
    let seed = Number(canvas.dataset.seed) || 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    ctx.fillStyle = ink;
    for (let y = 0; y < n; y++){
      for (let x = 0; x < n; x++){
        if (random() > 0.52) ctx.fillRect(x, y, 1, 1);
      }
    }

    // Finder patterns: 7x7 dark square, 5x5 light, 3x3 dark, with a light border.
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([x, y]) => {
      ctx.fillStyle = paper; ctx.fillRect(x ? x - 1 : 0, y ? y - 1 : 0, 8, 8);
      ctx.fillStyle = ink;   ctx.fillRect(x, y, 7, 7);
      ctx.fillStyle = paper; ctx.fillRect(x + 1, y + 1, 5, 5);
      ctx.fillStyle = ink;   ctx.fillRect(x + 2, y + 2, 3, 3);
    });
  });
}
drawQRCodes();
