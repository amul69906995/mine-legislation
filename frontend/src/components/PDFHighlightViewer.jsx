import { useEffect, useRef, useState, useCallback } from "react";

// ─── OCR-aware fuzzy matching ────────────────────────────────────────────────

/** Strips punctuation, collapses whitespace, lowercases */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Token-overlap sliding-window search.
 * Returns the range of pdfWords indices that best match chunkText,
 * plus a confidence score (0–1).
 *
 * Why tokens instead of chars?
 *   OCR may swap characters inside a word but rarely invents/drops whole words.
 *   A Jaccard score over word bags is fast and robust to char-level noise.
 */
function findBestTokenWindow(pdfWords, chunkText) {
  const chunkTokens = normalize(chunkText).split(" ").filter(Boolean);
  if (!chunkTokens.length || !pdfWords.length) return null;

  const chunkBag = {};
  chunkTokens.forEach((t) => (chunkBag[t] = (chunkBag[t] || 0) + 1));

  const windowSize = chunkTokens.length;
  // Allow window to be 20 % larger/smaller to absorb OCR insertions/deletions
  const minWin = Math.max(1, Math.floor(windowSize * 0.8));
  const maxWin = Math.ceil(windowSize * 1.2);

  let best = { score: 0, start: 0, end: 0 };

  for (let winLen = minWin; winLen <= maxWin; winLen++) {
    // Build initial window bag
    const winBag = {};
    for (let i = 0; i < Math.min(winLen, pdfWords.length); i++) {
      const t = pdfWords[i].norm;
      winBag[t] = (winBag[t] || 0) + 1;
    }

    for (let i = 0; i <= pdfWords.length - winLen; i++) {
      if (i > 0) {
        // slide: remove outgoing word, add incoming word
        const out = pdfWords[i - 1].norm;
        winBag[out]--;
        if (winBag[out] === 0) delete winBag[out];
        const inn = pdfWords[i + winLen - 1].norm;
        winBag[inn] = (winBag[inn] || 0) + 1;
      }

      // Intersection count (sum of min counts)
      let inter = 0;
      for (const [t, cnt] of Object.entries(chunkBag)) {
        inter += Math.min(cnt, winBag[t] || 0);
      }
      // Union = |A| + |B| - intersection  (multiset)
      const union =
        chunkTokens.length +
        Object.values(winBag).reduce((a, b) => a + b, 0) -
        inter;
      const score = union > 0 ? inter / union : 0;

      if (score > best.score) {
        best = { score, start: i, end: i + winLen - 1 };
      }
    }
  }

  return best.score > 0.25 ? best : null; // 25 % overlap threshold
}

// ─── PDF.js loader (lazy, CDN) ───────────────────────────────────────────────

let pdfjsLib = null;
let pdfjsPromise = null;

function loadPdfJs() {
  if (pdfjsLib) return Promise.resolve(pdfjsLib);
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PDFHighlightViewer({ source, onClose }) {
  const [status, setStatus] = useState("loading"); // loading | rendering | done | error
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [matchInfo, setMatchInfo] = useState(null); // { page, score }
  const containerRef = useRef(null);
  const matchRef = useRef(null); // DOM ref to first highlighted element

  const pdfUrl = (() => {
    const { country, mongoIdForFileName } = source.fields;
    return `https://res.cloudinary.com/dlvl67zqo/raw/upload/v1779032240/mine-legislation/${country}/${mongoIdForFileName}.pdf`;
  })();

  const chunkText = source.fields.chunk_text || "";

  const renderPdf = useCallback(async () => {
    try {
      const lib = await loadPdfJs();
      setStatus("rendering");

      const pdf = await lib.getDocument({ url: pdfUrl, withCredentials: false })
        .promise;
      const totalPages = pdf.numPages;
      setProgress({ current: 0, total: totalPages });

      let globalBestMatch = null; // { page, score, itemStart, itemEnd, pageObj }

      // ── Pass 1: find which page has best match ──────────────────────────
      for (let p = 1; p <= totalPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        // Build a flat array of { str, norm, itemIdx }
        const pdfWords = [];
        textContent.items.forEach((item, idx) => {
          normalize(item.str)
            .split(" ")
            .filter(Boolean)
            .forEach((norm) => pdfWords.push({ norm, itemIdx: idx }));
        });

        const match = findBestTokenWindow(pdfWords, chunkText);
        if (match && (!globalBestMatch || match.score > globalBestMatch.score)) {
          globalBestMatch = {
            page: p,
            score: match.score,
            wordStart: match.start,
            wordEnd: match.end,
            pdfWords,
            textContent,
          };
        }

        setProgress({ current: p, total: totalPages });
      }

      // ── Pass 2: render all pages, highlight the best match ─────────────
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";

      for (let p = 1; p <= totalPages; p++) {
        const page = await pdf.getPage(p);
        const scale = Math.min(
          (containerRef.current.clientWidth - 32) / page.getViewport({ scale: 1 }).width,
          1.8
        );
        const viewport = page.getViewport({ scale });

        // Wrapper div per page
        const pageDiv = document.createElement("div");
        pageDiv.className = "pdf-page-wrapper";
        pageDiv.style.cssText = `
          position: relative;
          width: ${viewport.width}px;
          height: ${viewport.height}px;
          margin: 0 auto 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
          border-radius: 4px;
          overflow: hidden;
          background: #fff;
        `;

        // Canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.cssText = "display:block;position:absolute;top:0;left:0;";
        pageDiv.appendChild(canvas);

        // Render page to canvas
        await page.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise;

        // Highlight overlay canvas
        if (globalBestMatch && globalBestMatch.page === p) {
          const { pdfWords, textContent, wordStart, wordEnd } = globalBestMatch;

          // Collect unique item indices that belong to the match window
          const matchedItemIdxs = new Set(
            pdfWords.slice(wordStart, wordEnd + 1).map((w) => w.itemIdx)
          );

          const hlCanvas = document.createElement("canvas");
          hlCanvas.width = viewport.width;
          hlCanvas.height = viewport.height;
          hlCanvas.style.cssText =
            "display:block;position:absolute;top:0;left:0;pointer-events:none;";
          const ctx = hlCanvas.getContext("2d");

          ctx.fillStyle = "rgba(255, 213, 0, 0.38)";
          ctx.strokeStyle = "rgba(230, 160, 0, 0.55)";
          ctx.lineWidth = 1;

          textContent.items.forEach((item, idx) => {
            if (!matchedItemIdxs.has(idx)) return;

            // pdfjs text item transform: [scaleX, skewY, skewX, scaleY, tx, ty]
            const tx = lib.Util.transform(viewport.transform, item.transform);
            const x = tx[4];
            const y = tx[5];
            const w = item.width * scale;
            const h = Math.abs(item.transform[3]) * scale;

            ctx.fillRect(x, y - h, w, h);
            ctx.strokeRect(x, y - h, w, h);
          });

          pageDiv.appendChild(hlCanvas);

          // Invisible anchor at the top of the match page for auto-scroll
          const anchor = document.createElement("div");
          anchor.id = "pdf-match-anchor";
          anchor.style.cssText =
            "position:absolute;top:0;left:0;width:1px;height:1px;";
          pageDiv.appendChild(anchor);
          matchRef.current = anchor;

          setMatchInfo({
            page: p,
            score: Math.round(globalBestMatch.score * 100),
          });
        }

        containerRef.current.appendChild(pageDiv);
      }

      setStatus("done");

      // Scroll to match after a short paint delay
      setTimeout(() => {
        matchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    } catch (err) {
      console.error("PDFHighlightViewer error:", err);
      setStatus("error");
    }
  }, [pdfUrl, chunkText]);

  useEffect(() => {
    renderPdf();
  }, [renderPdf]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="pdf-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pdf-modal">
        {/* ── Header ── */}
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <span className="pdf-modal-filename">{source.fields.file_name}</span>
            {matchInfo && (
              <span className="pdf-match-badge">
                Match p.{matchInfo.page} &nbsp;·&nbsp; {matchInfo.score}% confidence
              </span>
            )}
          </div>
          <div className="pdf-modal-actions">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-open-btn"
            >
              Open ↗
            </a>
            <button className="pdf-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* ── Chunk preview strip ── */}
        <div className="pdf-chunk-strip">
          <span className="chunk-label">Chunk</span>
          <p className="chunk-preview">{chunkText.slice(0, 260)}{chunkText.length > 260 ? "…" : ""}</p>
        </div>

        {/* ── Status bar ── */}
        {status !== "done" && status !== "error" && (
          <div className="pdf-status-bar">
            {status === "loading" && <span>Loading PDF…</span>}
            {status === "rendering" && (
              <>
                <div
                  className="pdf-progress-fill"
                  style={{
                    width: progress.total
                      ? `${(progress.current / progress.total) * 100}%`
                      : "0%",
                  }}
                />
                <span>
                  Scanning page {progress.current} / {progress.total}…
                </span>
              </>
            )}
          </div>
        )}
        {status === "error" && (
          <div className="pdf-error">Could not load PDF. Check network / CORS settings.</div>
        )}

        {/* ── Pages container ── */}
        <div className="pdf-pages-scroll">
          <div ref={containerRef} className="pdf-pages-inner" />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";

// ─── OCR-aware fuzzy matching ────────────────────────────────────────────────

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestTokenWindow(pdfWords, chunkText) {
  const chunkTokens = normalize(chunkText).split(" ").filter(Boolean);
  if (!chunkTokens.length || !pdfWords.length) return null;

  const chunkBag = {};
  chunkTokens.forEach((t) => (chunkBag[t] = (chunkBag[t] || 0) + 1));

  const windowSize = chunkTokens.length;
  const minWin = Math.max(1, Math.floor(windowSize * 0.8));
  const maxWin = Math.ceil(windowSize * 1.2);

  let best = { score: 0, start: 0, end: 0 };

  for (let winLen = minWin; winLen <= maxWin; winLen++) {
    const winBag = {};
    for (let i = 0; i < Math.min(winLen, pdfWords.length); i++) {
      const t = pdfWords[i].norm;
      winBag[t] = (winBag[t] || 0) + 1;
    }

    for (let i = 0; i <= pdfWords.length - winLen; i++) {
      if (i > 0) {
        const out = pdfWords[i - 1].norm;
        winBag[out]--;
        if (winBag[out] === 0) delete winBag[out];
        const inn = pdfWords[i + winLen - 1].norm;
        winBag[inn] = (winBag[inn] || 0) + 1;
      }

      let inter = 0;
      for (const [t, cnt] of Object.entries(chunkBag)) {
        inter += Math.min(cnt, winBag[t] || 0);
      }
      const union =
        chunkTokens.length +
        Object.values(winBag).reduce((a, b) => a + b, 0) -
        inter;
      const score = union > 0 ? inter / union : 0;

      if (score > best.score) {
        best = { score, start: i, end: i + winLen - 1 };
      }
    }
  }

  return best.score > 0.25 ? best : null;
}

// ─── PDF.js loader ────────────────────────────────────────────────────────────

let pdfjsLib = null;
let pdfjsPromise = null;

function loadPdfJs() {
  if (pdfjsLib) return Promise.resolve(pdfjsLib);
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return pdfjsPromise;
}

// ─── Tesseract loader ─────────────────────────────────────────────────────────

let tesseractLib = null;
let tesseractPromise = null;

function loadTesseract() {
  if (tesseractLib) return Promise.resolve(tesseractLib);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // Tesseract.js v4 UMD build
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js";
    script.onload = () => {
      tesseractLib = window.Tesseract;
      resolve(tesseractLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

// ─── OCR a single rasterised canvas ─────────────────────────────────────────

/**
 * Returns pdfWords-compatible array using Tesseract word bboxes.
 * Each entry: { norm, bbox: { x0, y0, x1, y1 } }   (bbox in canvas px)
 */
async function ocrCanvas(canvas) {
  const Tesseract = await loadTesseract();
  const { data } = await Tesseract.recognize(canvas, "eng", {
    // suppress Tesseract console spam
    logger: () => {},
  });

  const words = [];
  (data.words || []).forEach((word) => {
    const norm = normalize(word.text);
    if (!norm) return;
    norm.split(" ").filter(Boolean).forEach((tok) => {
      words.push({
        norm: tok,
        // itemIdx not relevant for scanned path — we store bbox directly
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      });
    });
  });
  return words;
}

// ─── Rasterise a PDF page to an off-screen canvas ───────────────────────────

async function rasterisePage(page, scale) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return { canvas, viewport };
}

// ─── Minimum word-count to trust the native text layer ───────────────────────
const MIN_TEXT_WORDS = 10;

// ─── Main component ───────────────────────────────────────────────────────────

export default function PDFHighlightViewer({ source, onClose }) {
  const [status, setStatus] = useState("loading");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [matchInfo, setMatchInfo] = useState(null);
  const containerRef = useRef(null);
  const matchRef = useRef(null);

  const pdfUrl = (() => {
    const { country, mongoIdForFileName } = source.fields;
    return `https://res.cloudinary.com/dlvl67zqo/raw/upload/v1779032240/mine-legislation/${country}/${mongoIdForFileName}.pdf`;
  })();

  const chunkText = source.fields.chunk_text || "";

  const renderPdf = useCallback(async () => {
    try {
      const lib = await loadPdfJs();
      setStatus("rendering");

      const pdf = await lib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
      const totalPages = pdf.numPages;
      setProgress({ current: 0, total: totalPages });

      let globalBestMatch = null;

      // ── Pass 1: find best-matching page ─────────────────────────────────
      for (let p = 1; p <= totalPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        // Build pdfWords from native text layer
        let pdfWords = [];
        textContent.items.forEach((item, idx) => {
          normalize(item.str)
            .split(" ")
            .filter(Boolean)
            .forEach((norm) => pdfWords.push({ norm, itemIdx: idx }));
        });

        let isScanned = false;

        // If the text layer is too sparse → OCR the page
        if (pdfWords.length < MIN_TEXT_WORDS) {
          isScanned = true;
          // Rasterise at 2× for better OCR accuracy (discarded after pass 1)
          const { canvas } = await rasterisePage(page, 2);
          pdfWords = await ocrCanvas(canvas);
        }

        const match = findBestTokenWindow(pdfWords, chunkText);
        if (match && (!globalBestMatch || match.score > globalBestMatch.score)) {
          globalBestMatch = {
            page: p,
            score: match.score,
            wordStart: match.start,
            wordEnd: match.end,
            pdfWords,
            textContent,
            isScanned,
          };
        }

        setProgress({ current: p, total: totalPages });
      }

      // ── Pass 2: render all pages ─────────────────────────────────────────
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";

      for (let p = 1; p <= totalPages; p++) {
        const page = await pdf.getPage(p);
        const scale = Math.min(
          (containerRef.current.clientWidth - 32) / page.getViewport({ scale: 1 }).width,
          1.8
        );
        const viewport = page.getViewport({ scale });

        const pageDiv = document.createElement("div");
        pageDiv.className = "pdf-page-wrapper";
        pageDiv.style.cssText = `
          position: relative;
          width: ${viewport.width}px;
          height: ${viewport.height}px;
          margin: 0 auto 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
          border-radius: 4px;
          overflow: hidden;
          background: #fff;
        `;

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.cssText = "display:block;position:absolute;top:0;left:0;";
        pageDiv.appendChild(canvas);

        await page.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise;

        // ── Highlight overlay ──────────────────────────────────────────────
        if (globalBestMatch && globalBestMatch.page === p) {
          const { pdfWords, textContent, wordStart, wordEnd, isScanned } = globalBestMatch;

          const hlCanvas = document.createElement("canvas");
          hlCanvas.width = viewport.width;
          hlCanvas.height = viewport.height;
          hlCanvas.style.cssText =
            "display:block;position:absolute;top:0;left:0;pointer-events:none;";
          const ctx = hlCanvas.getContext("2d");
          ctx.fillStyle = "rgba(255, 213, 0, 0.38)";
          ctx.strokeStyle = "rgba(230, 160, 0, 0.55)";
          ctx.lineWidth = 1;

          const matchedWords = pdfWords.slice(wordStart, wordEnd + 1);

          if (isScanned) {
            // ── Scanned path: use Tesseract bboxes ────────────────────────
            // The OCR was done at scale=2, so divide bbox coords by 2
            // then multiply by render scale to get canvas px.
            const ocrScale = 2;
            const bboxScale = scale / ocrScale;

            matchedWords.forEach(({ bbox }) => {
              if (!bbox) return;
              const x = bbox.x0 * bboxScale;
              const y = bbox.y0 * bboxScale;
              const w = (bbox.x1 - bbox.x0) * bboxScale;
              const h = (bbox.y1 - bbox.y0) * bboxScale;
              ctx.fillRect(x, y, w, h);
              ctx.strokeRect(x, y, w, h);
            });
          } else {
            // ── Native text layer path (original logic) ───────────────────
            const matchedItemIdxs = new Set(matchedWords.map((w) => w.itemIdx));
            textContent.items.forEach((item, idx) => {
              if (!matchedItemIdxs.has(idx)) return;
              const tx = lib.Util.transform(viewport.transform, item.transform);
              const x = tx[4];
              const y = tx[5];
              const w = item.width * scale;
              const h = Math.abs(item.transform[3]) * scale;
              ctx.fillRect(x, y - h, w, h);
              ctx.strokeRect(x, y - h, w, h);
            });
          }

          pageDiv.appendChild(hlCanvas);

          const anchor = document.createElement("div");
          anchor.id = "pdf-match-anchor";
          anchor.style.cssText =
            "position:absolute;top:0;left:0;width:1px;height:1px;";
          pageDiv.appendChild(anchor);
          matchRef.current = anchor;

          setMatchInfo({
            page: p,
            score: Math.round(globalBestMatch.score * 100),
            isScanned,
          });
        }

        containerRef.current.appendChild(pageDiv);
      }

      setStatus("done");
      setTimeout(() => {
        matchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    } catch (err) {
      console.error("PDFHighlightViewer error:", err);
      setStatus("error");
    }
  }, [pdfUrl, chunkText]);

  useEffect(() => {
    renderPdf();
  }, [renderPdf]);

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="pdf-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pdf-modal">
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <span className="pdf-modal-filename">{source.fields.file_name}</span>
            {matchInfo && (
              <span className="pdf-match-badge">
                {matchInfo.isScanned ? "OCR · " : ""}
                Match p.{matchInfo.page} &nbsp;·&nbsp; {matchInfo.score}% confidence
              </span>
            )}
          </div>
          <div className="pdf-modal-actions">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-open-btn">
              Open ↗
            </a>
            <button className="pdf-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="pdf-chunk-strip">
          <span className="chunk-label">Chunk</span>
          <p className="chunk-preview">
            {chunkText.slice(0, 260)}{chunkText.length > 260 ? "…" : ""}
          </p>
        </div>

        {status !== "done" && status !== "error" && (
          <div className="pdf-status-bar">
            {status === "loading" && <span>Loading PDF…</span>}
            {status === "rendering" && (
              <>
                <div
                  className="pdf-progress-fill"
                  style={{
                    width: progress.total
                      ? `${(progress.current / progress.total) * 100}%`
                      : "0%",
                  }}
                />
                <span>
                  Scanning page {progress.current} / {progress.total}…
                </span>
              </>
            )}
          </div>
        )}
        {status === "error" && (
          <div className="pdf-error">Could not load PDF. Check network / CORS settings.</div>
        )}

        <div className="pdf-pages-scroll">
          <div ref={containerRef} className="pdf-pages-inner" />
        </div>
      </div>
    </div>
  );
}