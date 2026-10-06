import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { NEW_STARTER_COLUMNS, rowCells, type NewStarterRow } from "@/lib/reports/new-starter-report";

/**
 * New Starter Report as a landscape A4 PDF: title, filter summary, generated
 * time, a table whose header repeats on every page, and "Page X of Y".
 *
 * Cells wrap to the column width (long emails break mid-address rather than
 * running into the next column) and are capped at MAX_CELL_LINES with an
 * ellipsis.
 */

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 36;
const FONT_SIZE = 8;
const LINE_H = 10;
const CELL_PAD = 4;
export const MAX_CELL_LINES = 3;

/** Column widths in points; they sum to the printable width (770). */
export const COLUMN_WIDTHS = [120, 80, 175, 70, 60, 135, 130];

const BLUE = rgb(0.12, 0.31, 0.47); // #1F4E79, the email header colour
const GREY = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0, 0, 0);
const RULE = rgb(0.85, 0.85, 0.85);
const HEADER_BG = rgb(0.93, 0.95, 0.97);

/** Measures text; matches PDFFont.widthOfTextAtSize so tests can stub it. */
export type Measure = (text: string) => number;

/**
 * Standard PDF fonts only encode WinAnsi. A name with "ł" or an emoji would
 * make pdf-lib throw mid-report, so strip accents where that maps cleanly
 * and replace anything else with "?".
 */
export function toWinAnsi(text: string, supported: Set<number>): string {
  let out = "";
  for (const ch of text.replace(/[\r\n\t]+/g, " ")) {
    const cp = ch.codePointAt(0)!;
    if (supported.has(cp)) {
      out += ch;
      continue;
    }
    const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    out += base && [...base].every((c) => supported.has(c.codePointAt(0)!)) ? base : "?";
  }
  return out;
}

/** Splits a token that is wider than the column into pieces that fit. */
function breakToken(token: string, width: number, measure: Measure): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const ch of token) {
    if (current && measure(current + ch) > width) {
      pieces.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * Word-wraps `text` into lines no wider than `width`. Over-long words (email
 * addresses) are broken by character. More than `maxLines` lines are cut and
 * the last line ends with an ellipsis.
 */
export function wrapText(text: string, width: number, measure: Measure, maxLines = MAX_CELL_LINES): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (measure(word) <= width) {
      line = word;
    } else {
      const pieces = breakToken(word, width, measure);
      lines.push(...pieces.slice(0, -1));
      line = pieces[pieces.length - 1] ?? "";
    }
  }
  if (line) lines.push(line);

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > width) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

export interface NewStarterPdfMeta {
  filterSummary: string;
  generatedAt: Date;
  generatedBy?: string | null;
}

export async function buildNewStarterPdf(rows: NewStarterRow[], meta: NewStarterPdfMeta): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("New Starter Report");
  pdf.setAuthor("PRL Site Solutions");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const charset = new Set(font.getCharacterSet());
  // "…" is in WinAnsi, so the ellipsis survives sanitising.
  const clean = (t: string) => toWinAnsi(t, charset);
  const measureWith = (f: PDFFont) => (t: string) => f.widthOfTextAtSize(t, FONT_SIZE);

  const tableWidth = PAGE_W - MARGIN * 2;
  let page!: PDFPage;
  let y = 0;

  const drawRow = (cells: string[], f: PDFFont, background?: ReturnType<typeof rgb>) => {
    const wrapped = cells.map((c, i) => wrapText(clean(c || "-"), COLUMN_WIDTHS[i] - CELL_PAD * 2, measureWith(f)));
    const lines = Math.max(1, ...wrapped.map((w) => w.length));
    const height = lines * LINE_H + CELL_PAD * 2;
    if (background) {
      page.drawRectangle({ x: MARGIN, y: y - height, width: tableWidth, height, color: background });
    }
    let x = MARGIN;
    wrapped.forEach((cellLines, i) => {
      cellLines.forEach((text, li) => {
        page.drawText(text, {
          x: x + CELL_PAD,
          y: y - CELL_PAD - FONT_SIZE - li * LINE_H + 1,
          size: FONT_SIZE,
          font: f,
          color: f === bold ? GREY : BLACK,
        });
      });
      x += COLUMN_WIDTHS[i];
    });
    y -= height;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + tableWidth, y }, thickness: 0.5, color: RULE });
    return height;
  };

  const rowHeight = (cells: string[], f: PDFFont) =>
    Math.max(1, ...cells.map((c, i) => wrapText(clean(c || "-"), COLUMN_WIDTHS[i] - CELL_PAD * 2, measureWith(f)).length)) *
      LINE_H +
    CELL_PAD * 2;

  const generated = meta.generatedAt.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const startPage = (first: boolean) => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    if (first) {
      page.drawText("PRL SITE SOLUTIONS", { x: MARGIN, y: y - 14, size: 14, font: bold, color: BLUE });
      y -= 32;
      page.drawText("New Starter Report", { x: MARGIN, y, size: 12, font: bold, color: BLACK });
      y -= 16;
      for (const line of wrapText(clean(meta.filterSummary), tableWidth, (t) => font.widthOfTextAtSize(t, 9), 4)) {
        page.drawText(line, { x: MARGIN, y, size: 9, font, color: GREY });
        y -= 12;
      }
      const by = meta.generatedBy ? ` by ${meta.generatedBy}` : "";
      page.drawText(clean(`Generated ${generated}${by} · ${rows.length} starter${rows.length === 1 ? "" : "s"}`), {
        x: MARGIN,
        y,
        size: 9,
        font,
        color: GREY,
      });
      y -= 12;
      page.drawText("Confidential: contains National Insurance numbers.", {
        x: MARGIN,
        y,
        size: 8,
        font: bold,
        color: rgb(0.7, 0, 0),
      });
      y -= 14;
    } else {
      page.drawText("New Starter Report (continued)", { x: MARGIN, y: y - 9, size: 9, font: bold, color: GREY });
      y -= 18;
    }
    drawRow([...NEW_STARTER_COLUMNS], bold, HEADER_BG);
  };

  startPage(true);
  const footerSpace = MARGIN + 14;

  if (rows.length === 0) {
    page.drawText("No starters match these filters.", { x: MARGIN + CELL_PAD, y: y - 14, size: 9, font, color: GREY });
  }
  for (const r of rows) {
    const cells = rowCells(r);
    if (y - rowHeight(cells, font) < footerSpace) startPage(false);
    drawRow(cells, font);
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 8),
      y: MARGIN - 12,
      size: 8,
      font,
      color: GREY,
    });
    p.drawText("PRL Site Solutions · New Starter Report", { x: MARGIN, y: MARGIN - 12, size: 8, font, color: GREY });
  });

  return pdf.save();
}
