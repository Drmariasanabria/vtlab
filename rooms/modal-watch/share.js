window.NAVAL_MODALS_SHARE = (function () {
  "use strict";

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function buildCard({ name, avatar, rankLabel, rankIcon, score, accuracy, badges }) {
    const canvas = document.createElement("canvas");
    canvas.width = 1000; canvas.height = 560;
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, 1000, 560);
    bg.addColorStop(0, "#0b1c33");
    bg.addColorStop(1, "#030812");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1000, 560);

    ctx.strokeStyle = "rgba(0,229,255,.5)";
    ctx.lineWidth = 3;
    roundRect(ctx, 16, 16, 968, 528, 24);
    ctx.stroke();

    ctx.fillStyle = "#00e5ff";
    ctx.font = "700 30px Arial";
    ctx.fillText("⚓ MODAL WATCH", 48, 78);
    ctx.fillStyle = "#a9c4d9";
    ctx.font = "20px Arial";
    ctx.fillText("Informe de guardia — Inglés naval", 48, 108);

    ctx.font = "90px Arial";
    ctx.fillText(avatar || "⚓", 48, 220);

    ctx.fillStyle = "#eaf6ff";
    ctx.font = "700 40px Arial";
    ctx.fillText(name || "Tripulante", 180, 190);

    ctx.fillStyle = "#00e5ff";
    ctx.font = "700 28px Arial";
    ctx.fillText(`${rankIcon || ""} ${rankLabel || ""}`, 180, 230);

    ctx.fillStyle = "#33ffb0";
    ctx.font = "900 72px Arial";
    ctx.fillText(`${(score || 0).toLocaleString("es-ES")} pts`, 48, 330);

    ctx.fillStyle = "#a9c4d9";
    ctx.font = "26px Arial";
    ctx.fillText(`Precisión: ${accuracy || 0}%`, 48, 372);

    if (badges && badges.length) {
      ctx.font = "48px Arial";
      badges.slice(0, 8).forEach((b, i) => {
        ctx.fillText(b.icon, 48 + i * 64, 450);
      });
    }

    ctx.fillStyle = "#7fe9ff";
    ctx.font = "18px Arial";
    ctx.fillText("modalwatch · verbos modales del inglés naval", 48, 512);

    return canvas;
  }

  async function downloadCard(canvas, filename) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename || "modal-watch-resultado.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve();
      }, "image/png");
    });
  }

  async function shareCard(canvas, filename, text) {
    if (navigator.share && navigator.canShare) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], filename || "modal-watch-resultado.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "MODAL WATCH", text: text || "Mi resultado en MODAL WATCH" });
          return true;
        } catch (e) { /* user cancelled or share failed, fall through */ }
      }
    }
    await downloadCard(canvas, filename);
    return false;
  }

  return { buildCard, downloadCard, shareCard };
})();
