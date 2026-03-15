// ==UserScript==
// @name        Quick screenshot & image capture
// @namespace   quick.screenshot
// @description Capture images via "A" for full image, "S" for rectangle selection - crops client-side and downloads.
// @version     2.0
// @match       *://*/*
// @run-at      document-idle
// @grant       GM_download
// @grant       GM_xmlhttpRequest
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG = {
    filenameTemplate: "{domain}_{basename}_{timestamp}.png",
    toastTimeout: 3000,
  };

  // rectangle selection state
  let overlay = null;
  let canvas = null;
  let ctx = null;
  let mode = null; // 'rectangle'
  let start = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  let lastMouse = { x: 0, y: 0 };
  const OVERLAY_CFG = {
    overlayColor: "rgba(0,0,0,0.45)",
    stroke: "rgba(255,200,0,0.95)",
    strokeWidth: 2,
  };

  function init() {
    // track mouse for keyboard-triggered actions
    document.addEventListener(
      "mousemove",
      (e) => (lastMouse = { x: e.clientX, y: e.clientY }),
    );
    // keyboard controls: A = extract at cursor, S (hold) = rectangle selection
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    console.log("vmonkey-alt-download initialized");
  }

  function startRectangleMode(e) {
    mode = "rectangle";
    createOverlay();
    const p = e ? { x: e.clientX, y: e.clientY } : lastMouse;
    start = { ...p };
    current = { ...p };
    redrawOverlay();
  }

  function createOverlay() {
    removeOverlay();
    overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 10000,
      cursor: "crosshair",
      background: OVERLAY_CFG.overlayColor,
    });
    overlay.addEventListener("mousemove", onOverlayMouseMove);
    overlay.addEventListener("mouseup", onOverlayMouseUp);
    overlay.addEventListener("mousedown", (ev) => ev.preventDefault());

    canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    overlay.appendChild(canvas);
    ctx = canvas.getContext("2d");
    document.body.appendChild(overlay);
    // ensure canvas matches current CSS size and DPR
    resizeCanvas();
    // update on window resize (and detect DPR changes via small watcher)
    window.addEventListener("resize", resizeCanvas);
    overlay._lastDPR = window.devicePixelRatio || 1;
    overlay._dpiWatcher = setInterval(() => {
      const dpr = window.devicePixelRatio || 1;
      if (dpr !== overlay._lastDPR) {
        overlay._lastDPR = dpr;
        resizeCanvas();
      }
    }, 250);
  }

  function resizeCanvas() {
    if (!canvas) return;
    // use CSS viewport size to avoid stale values when zooming
    const cssW = document.documentElement.clientWidth || window.innerWidth;
    const cssH = document.documentElement.clientHeight || window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    // scale context so drawing coordinates are in CSS pixels
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function onOverlayMouseMove(e) {
    current = { x: e.clientX, y: e.clientY };
    redrawOverlay();
  }

  function onOverlayMouseUp(e) {
    const rect = normalizeRect(start.x, start.y, current.x, current.y);
    finalizeRectangle(rect);
  }

  function redrawOverlay() {
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    ctx.save();
    if (mode === "rectangle") {
      const r = normalizeRect(start.x, start.y, current.x, current.y);
      ctx.clearRect(r.x, r.y, r.width, r.height);
      ctx.strokeStyle = OVERLAY_CFG.stroke;
      ctx.lineWidth = OVERLAY_CFG.strokeWidth;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width, r.height);
    }
    ctx.restore();
  }

  function normalizeRect(x1, y1, x2, y2) {
    const x = Math.min(x1, x2),
      y = Math.min(y1, y2),
      w = Math.abs(x2 - x1),
      h = Math.abs(y2 - y1);
    return { x, y, width: w, height: h };
  }

  function finalizeRectangle(rect) {
    try {
      const candidate = findImageUnderSelection(rect);
      if (!candidate) {
        showToast("No image found under selection");
        removeOverlay();
        return;
      }
      cropAndDownload(candidate, rect);
    } catch (e) {
      console.warn("finalizeRectangle", e);
      showToast("Error during crop");
    }
    removeOverlay();
  }

  function removeOverlay() {
    if (!overlay) return;
    try {
      overlay.removeEventListener("mousemove", onOverlayMouseMove);
      overlay.removeEventListener("mouseup", onOverlayMouseUp);
    } catch (e) {}
    try {
      overlay.remove();
    } catch (e) {}
    overlay = null;
    canvas = null;
    ctx = null;
    mode = null;
  }

  function findImageUnderSelection(selection) {
    const candidates = [];
    document.querySelectorAll("img").forEach((img) => {
      const rect = img.getBoundingClientRect();
      if (rectanglesOverlap(rect, selection))
        candidates.push({ element: img, rect, url: pickBestSrcFromImg(img) });
    });
    // background images
    document.querySelectorAll("*").forEach((el) => {
      const url = getBackgroundImageUrl(el);
      if (!url) return;
      const rect = el.getBoundingClientRect();
      if (rectanglesOverlap(rect, selection))
        candidates.push({ element: el, rect, url });
    });
    if (candidates.length === 0) return null;
    candidates.sort(
      (a, b) =>
        getOverlapArea(b.rect, selection) - getOverlapArea(a.rect, selection),
    );
    return candidates[0];
  }

  function rectanglesOverlap(rect1, rect2) {
    return !(
      rect1.right < rect2.x ||
      rect1.left > rect2.x + rect2.width ||
      rect1.bottom < rect2.y ||
      rect1.top > rect2.y + rect2.height
    );
  }

  function getOverlapArea(rect, selection) {
    const overlapX = Math.max(
      0,
      Math.min(rect.right, selection.x + selection.width) -
        Math.max(rect.left, selection.x),
    );
    const overlapY = Math.max(
      0,
      Math.min(rect.bottom, selection.y + selection.height) -
        Math.max(rect.top, selection.y),
    );
    return overlapX * overlapY;
  }

  // image loading and cropping (uses GM_xmlhttpRequest fallback)
  function loadImageAsBlob(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ img, blob: null, url });
      img.onerror = () => {
        try {
          GM_xmlhttpRequest({
            method: "GET",
            url,
            responseType: "blob",
            onload: (res) => {
              const blob = res.response;
              const blobUrl = URL.createObjectURL(blob);
              const img2 = new Image();
              img2.onload = () => {
                resolve({ img: img2, blob, url: blobUrl });
                URL.revokeObjectURL(blobUrl);
              };
              img2.onerror = () => reject(new Error("blob-img-fail"));
              img2.src = blobUrl;
            },
            onerror: () => reject(new Error("GM_xmlhttpRequest failed")),
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = url;
    });
  }

  function cropAndDownload(candidate, selection) {
    // Compute crop based on overlap between selection and the image's on-page rect
    loadImageAsBlob(candidate.url)
      .then(({ img, blob, url: blobUrl }) => {
        const imgRect = candidate.rect;
        const scaleX = img.naturalWidth / imgRect.width;
        const scaleY = img.naturalHeight / imgRect.height;

        // overlap in client coordinates
        const ov_x1 = Math.max(selection.x, imgRect.left);
        const ov_y1 = Math.max(selection.y, imgRect.top);
        const ov_x2 = Math.min(selection.x + selection.width, imgRect.right);
        const ov_y2 = Math.min(selection.y + selection.height, imgRect.bottom);

        const ov_w = ov_x2 - ov_x1;
        const ov_h = ov_y2 - ov_y1;
        if (ov_w <= 0 || ov_h <= 0) return showToast("Invalid crop area");

        // map overlap to image-pixel coordinates and clamp
        const cropX = Math.round((ov_x1 - imgRect.left) * scaleX);
        const cropY = Math.round((ov_y1 - imgRect.top) * scaleY);
        const cropW = Math.max(
          0,
          Math.min(Math.round(ov_w * scaleX), img.naturalWidth - cropX),
        );
        const cropH = Math.max(
          0,
          Math.min(Math.round(ov_h * scaleY), img.naturalHeight - cropY),
        );

        if (cropW <= 0 || cropH <= 0) return showToast("Invalid crop area");

        const out = document.createElement("canvas");
        out.width = cropW;
        out.height = cropH;
        const outCtx = out.getContext("2d");
        outCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        out.toBlob((blobOut) => {
          const downloadUrl = URL.createObjectURL(blobOut);
          downloadBlob(downloadUrl, safeFilename(candidate.url));
          URL.revokeObjectURL(downloadUrl);
          if (blobUrl)
            try {
              URL.revokeObjectURL(blobUrl);
            } catch (e) {}
        });
      })
      .catch((err) => {
        console.warn("crop failed", err);
        showToast("Crop failed (CORS?) — downloading original");
        downloadByUrl(candidate.url);
      });
  }

  let sHeld = false;

  function isTypingTarget(e) {
    const el = e.target;
    if (!el) return false;
    const tag = (el.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable)
      return true;
    return false;
  }

  function onKeyDown(e) {
    if (isTypingTarget(e)) return; // don't interfere with typing
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      const candidate = findImageElementAtPoint(lastMouse.x, lastMouse.y);
      if (!candidate) return showToast("No image under cursor");
      downloadImageCandidate(candidate).catch((err) => {
        console.warn("download failed", err);
        showToast("Download failed");
      });
      return;
    }
    if ((e.key === "s" || e.key === "S") && !sHeld) {
      sHeld = true;
      // start rectangle selection at cursor
      startRectangleMode({ clientX: lastMouse.x, clientY: lastMouse.y });
    }
  }

  function onKeyUp(e) {
    if (isTypingTarget(e)) return;
    if (e.key === "s" || e.key === "S") {
      if (sHeld) {
        sHeld = false;
        if (overlay && mode === "rectangle") {
          const rect = normalizeRect(start.x, start.y, current.x, current.y);
          finalizeRectangle(rect);
          removeOverlay();
        }
      }
    }
  }

  function findImageElementAtPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    if (!el) return null;
    // walk up to find <img>
    let node = el;
    while (node) {
      if (node.tagName === "IMG") {
        return { element: node, url: pickBestSrcFromImg(node) };
      }
      node = node.parentElement;
    }
    // try background-image on element under point
    el = document.elementFromPoint(x, y);
    const bg = getBackgroundImageUrl(el);
    if (bg) return { element: el, url: bg };
    return null;
  }

  function pickBestSrcFromImg(img) {
    return img.currentSrc || img.src;
  }

  function getBackgroundImageUrl(el) {
    try {
      const style = getComputedStyle(el);
      const bg = style.backgroundImage;
      if (!bg || bg === "none") return null;
      const m = /url\(([^)]+)\)/.exec(bg);
      if (!m) return null;
      return m[1].replace(/['\"]+/g, "");
    } catch (e) {
      return null;
    }
  }

  async function downloadImageCandidate(candidate) {
    const url = candidate.url;
    if (!url) throw new Error("no-url");

    // data: URLs can be downloaded directly
    if (url.startsWith("data:")) {
      downloadByUrl(url);
      showToast("Download started");
      return;
    }

    // Try GM_download first (handles cross-origin via extension)
    try {
      if (typeof GM_download === "function") {
        GM_download({ url, name: safeFilename(url) });
        showToast("Download started");
        return;
      }
    } catch (e) {
      // ignore and fallback
    }

    // Try fetching blob via GM_xmlhttpRequest for robust cross-origin retrieval
    try {
      await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          responseType: "blob",
          onload: (res) => {
            try {
              const blob = res.response;
              const blobUrl = URL.createObjectURL(blob);
              downloadBlob(blobUrl, safeFilename(url));
              URL.revokeObjectURL(blobUrl);
              showToast("Download started");
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          onerror: () => reject(new Error("GM_xmlhttpRequest failed")),
          ontimeout: () => reject(new Error("GM_xmlhttpRequest timeout")),
        });
      });
      return;
    } catch (err) {
      console.warn(
        "GM_xmlhttpRequest failed, falling back to direct download",
        err,
      );
    }

    // Fallback: create anchor and trigger download (may be blocked by CORS/server headers)
    downloadByUrl(url);
    showToast("Download started (fallback)");
  }

  function downloadBlob(blobUrl, filename) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function downloadByUrl(url) {
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename(url);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function safeFilename(url) {
    const domain = window.location.hostname.replace(/[^a-z0-9\-\.]/gi, "_");
    const basename = (url.split("/").pop() || "image")
      .split("?")[0]
      .replace(/[^a-z0-9\-\.]/gi, "_");
    const ts = Date.now();
    return CONFIG.filenameTemplate
      .replace("{domain}", domain)
      .replace("{basename}", basename)
      .replace("{timestamp}", ts);
  }

  function showToast(msg, timeout = CONFIG.toastTimeout) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed",
      right: "12px",
      top: "12px",
      background: "rgba(0,0,0,0.8)",
      color: "white",
      padding: "8px 10px",
      borderRadius: "6px",
      zIndex: 10000,
    });
    document.body.appendChild(t);
    setTimeout(() => {
      try {
        document.body.removeChild(t);
      } catch (e) {}
    }, timeout);
  }

  init();
})();
