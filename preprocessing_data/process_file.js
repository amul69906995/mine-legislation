const { saveToMongoDb } = require('./db_helpers')
const { v4: uuidv4 } = require('uuid');
const { PDFParse } = require('pdf-parse');

// CONFIG
const TARGET_CHARS = 5000;
const OVERLAP_CHARS = Math.floor(TARGET_CHARS * 0.1);

// helpers
function detectHeadersFooters(pageTexts) {
    const lineCounts = new Map();
    pageTexts.forEach(p => {
        const lines = p.split(/\r?\n/).slice(0, 4).concat(p.split(/\r?\n/).slice(-4)); // check top and bottom
        lines.forEach(l => {
            const s = l.trim();
            if (!s) return;
            lineCounts.set(s, (lineCounts.get(s) || 0) + 1);
        });
    });
    const threshold = Math.max(3, Math.floor(pageTexts.length * 0.6));
    const repeated = new Set();
    for (const [line, count] of lineCounts) if (count >= threshold) repeated.add(line);
    return repeated;
}

function stripHeadersFooters(pageTexts, repeatedSet) {
    return pageTexts.map(p => p.split(/\r?\n/).filter(l => !repeatedSet.has(l.trim())).join('\n'));
}

function findSectionBoundaries(fullText) {
    // returns array of {index, title}
    const lines = fullText.split(/\r?\n/);
    const boundaries = [];
    let cumulative = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // patterns used for these legal files
        if (/^CHAPTER\b/i.test(line) || /^\d{1,4}\.\s+[A-Z]/.test(line) || /^(Section|Regulation|Rule)\b/i.test(line)) {
            boundaries.push({ pos: cumulative, title: line });
        }
        cumulative += lines[i].length + 1; // + newline
    }
    // ensure start boundary
    if (boundaries.length === 0) boundaries.push({ pos: 0, title: 'start' });
    return boundaries;
}

// async function chunkBySections(fullText, boundaries, fileInfo, path) {
//     let chunkIndex = 0;
//     for (let i = 0; i < boundaries.length; i++) {
//         const start = boundaries[i].pos;
//         const end = (i + 1 < boundaries.length) ? boundaries[i + 1].pos : fullText.length;
//         let text = fullText.slice(start, end).trim();
//         const title = boundaries[i].title || 'section';
//         if (!text) continue;
//         // if too long, split with overlap
//         if (text.length <= TARGET_CHARS) {
//             const chunkObj = {
//                 _id: uuidv4(),
//                 file_name: path.split('/').pop(),
//                 doc_hint: fileInfo.doc_hint,
//                 source_path: path,
//                 jurisdiction_level: fileInfo.jurisdiction_level || null,
//                 mineral_scope: fileInfo.mineral_scope || fileInfo.mineral_type || null,
//                 section_title: title,
//                 chunk_index: chunkIndex++,
//                 text: text,
//                 snippet: text.slice(0, 300),
//                 split_reason: title.includes('(sub)') ? 'by_length' : 'by_section',
//                 created_at: new Date().toISOString()
//             };
//             await saveToMongoDb(chunkObj);
//             console.log(chunkObj)

//         } else {
//             // sliding window split at paragraph boundaries
//             let cursor = 0;
//             while (cursor < text.length) {
//                 let endCursor = Math.min(text.length, cursor + TARGET_CHARS);
//                 // try to break at nearest newline before endCursor
//                 const br = text.lastIndexOf('\n\n', endCursor);
//                 if (br > cursor + 100) endCursor = br;
//                 const sub = text.slice(cursor, endCursor).trim();
//                 const chunkObj = {
//                     _id: uuidv4(),
//                     file_name: path.split('/').pop(),
//                     doc_hint: fileInfo.doc_hint,
//                     source_path: path,
//                     jurisdiction_level: fileInfo.jurisdiction_level || null,
//                     mineral_scope: fileInfo.mineral_scope || fileInfo.mineral_type || null,
//                     section_title: title + ' (sub)',
//                     chunk_index: chunkIndex++,
//                     text: sub,
//                     snippet: sub.slice(0, 300),
//                     split_reason: title.includes('(sub)') ? 'by_length' : 'by_section',
//                     created_at: new Date().toISOString()
//                 };
//                 await saveToMongoDb(chunkObj);
//                 console.log(chunkObj)
//                 cursor = endCursor - OVERLAP_CHARS;
//                 if (cursor < 0) cursor = 0;
//             }
//         }
//     }
// }

// put at top of file if not already:
// const { v4: uuidv4 } = require('uuid');

async function chunkBySections(fullText, boundaries, fileInfo, sourcePath) {
  let chunkIndex = 0;

  // small helper to remove obvious page-number footers like "-- 2 of 121 --" or "Page 2 of 121"
  function removeCommonPageFootersLine(line) {
    return line.replace(/^\s*[-–—]{0,2}\s*\d+\s*(of|\/)\s*\d+\s*[-–—]{0,2}\s*$/i, '')
               .replace(/^\s*Page\s+\d+\s*(of|\/)\s*\d+\s*$/i, '');
  }

  // optional dedupe (useful while debugging to stop identical inserts)
  const seenSnippets = new Set();

  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].pos;
    const end = (i + 1 < boundaries.length) ? boundaries[i + 1].pos : fullText.length;
    let text = fullText.slice(start, end).trim();
    const title = boundaries[i].title || 'section';
    if (!text) continue;

    // normalize lines (strip obvious page-footers lines)
    text = text.split(/\r?\n/).map(l => l.trim()).map(removeCommonPageFootersLine).filter(Boolean).join('\n');

    // short section -> single chunk
    if (text.length <= TARGET_CHARS) {
      const chunkObj = {
        _id: uuidv4(),
        file_name: sourcePath.split(/[\\/]/).pop(),
        doc_hint: fileInfo.doc_hint,
        source_path: sourcePath,
        jurisdiction_level: fileInfo.jurisdiction_level || null,
        mineral_scope: fileInfo.mineral_scope || fileInfo.mineral_type || null,
        section_title: title,
        chunk_index: chunkIndex++,
        text,
        snippet: text.slice(0, 300),
        split_reason: 'by_section',
        created_at: new Date().toISOString()
      };

      // optional dedupe guard
      const key = chunkObj.snippet;
      if (!seenSnippets.has(key)) {
        try {
          await saveToMongoDb(chunkObj);
          seenSnippets.add(key);
        } catch (err) {
          console.error('saveToMongoDb failed for chunk:', err);
          // decide: continue processing other chunks (we continue)
        }
      } else {
        console.log('skipped duplicate chunk snippet');
      }

      continue;
    }

    // long section -> sliding window with robust guards
    let cursor = 0;
    let lastSavedEnd = -1;

    while (cursor < text.length) {
      // preferred end
      let endCursor = Math.min(text.length, cursor + TARGET_CHARS);

      // try to break at nearest paragraph boundary before endCursor
      const br = text.lastIndexOf('\n\n', endCursor);
      if (br > cursor + 50) endCursor = br;

      // ensure progress: if endCursor <= cursor, try fallback strategies
      if (endCursor <= cursor) {
        // try next single newline after cursor
        const nextNL = text.indexOf('\n', cursor + 50);
        if (nextNL > cursor) {
          endCursor = Math.min(text.length, nextNL);
        } else {
          // force advance to avoid infinite loop
          endCursor = Math.min(text.length, cursor + TARGET_CHARS);
          if (endCursor <= cursor) {
            console.warn('Cannot advance endCursor; breaking to avoid infinite loop', { cursor, textLength: text.length });
            break;
          }
        }
      }

      // slice and clean sub
      let sub = text.slice(cursor, endCursor).trim();
      // remove page-footer-like lines inside the slice
      sub = sub.split(/\r?\n/).map(l => l.trim()).map(removeCommonPageFootersLine).filter(Boolean).join('\n');
      if (!sub) {
        // nothing meaningful, break
        break;
      }

      // avoid saving identical slice twice
      if (endCursor === lastSavedEnd) {
        console.warn('Detected same endCursor as last saved end; breaking to avoid duplicate', { cursor, endCursor });
        break;
      }

      const chunkObj = {
        _id: uuidv4(),
        file_name: sourcePath.split(/[\\/]/).pop(),
        doc_hint: fileInfo.doc_hint,
        source_path: sourcePath,
        jurisdiction_level: fileInfo.jurisdiction_level || null,
        mineral_scope: fileInfo.mineral_scope || fileInfo.mineral_type || null,
        section_title: title + ' (sub)',
        chunk_index: chunkIndex++,
        text: sub,
        snippet: sub.slice(0, 300),
        split_reason: 'by_length',
        created_at: new Date().toISOString()
      };

      // optional dedupe guard
      const key = chunkObj.snippet;
      if (!seenSnippets.has(key)) {
        try {
          await saveToMongoDb(chunkObj);
          seenSnippets.add(key);
        } catch (err) {
          console.error('saveToMongoDb failed for sub-chunk:', err);
          // continue to next piece
        }
      } else {
        console.log('skipped duplicate sub-chunk snippet');
      }

      lastSavedEnd = endCursor;

      // if we wrote the final piece, stop splitting this section
      if (endCursor >= text.length) break;

      // advance cursor with overlap but ensure strict progress
      const nextCursor = endCursor - OVERLAP_CHARS;
      if (nextCursor <= cursor) {
        // fallback: use endCursor (no overlap) if that advances; else break
        if (endCursor > cursor) {
          cursor = endCursor;
        } else {
          console.warn('Cannot advance cursor; breaking', { cursor, endCursor });
          break;
        }
      } else {
        cursor = nextCursor;
      }
    } 
  } 
}


async function extractPdfPagesToText(path) {
    const parser = new PDFParse({ url: path });
    const parsed = await parser.getText();
    // pdf-parse gives text for all pages combined; if you need per-page, use a parser that supports pages or split heuristically
    // For now: naive split by form feed \f (pdf-parse uses it)
    const pages = parsed.text.split('\f').map(p => p.trim()).filter(Boolean);
    return pages;
}

// main exported function
const processAFile = async (fileInfo) => {
    console.log("processing file .......", fileInfo.doc_hint);

    const path = fileInfo.path;
    const pages = await extractPdfPagesToText(path);
    //console.log(pages)
    const repeated = detectHeadersFooters(pages);
    //console.log("repeated....",repeated)
    const cleanedPages = stripHeadersFooters(pages, repeated);
    //console.log("cleaned pages .........",cleanedPages)
    const fullText = cleanedPages.join('\n\n');
    //console.log("full text......", fullText)
    // find section boundaries
    const boundaries = findSectionBoundaries(fullText);
    //console.log("boundries.........",boundaries)
    // chunk
    await chunkBySections(fullText, boundaries, fileInfo, path);
    console.log("all file processed......")
};
module.exports = { processAFile }