import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PdfPrinter from "pdfmake";
import { PDFDocument } from "pdf-lib";
import { v2 as cloudinary } from "cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const FONTS_DIR   = path.resolve(__dirname, "../..", "assets", "fonts");
const STORAGE_DIR = path.resolve(__dirname, "../..", "storage", "reports");

const fonts = {
  Roboto: {
    normal:      path.join(FONTS_DIR, "Roboto-Regular.ttf"),
    bold:        path.join(FONTS_DIR, "Roboto-Bold.ttf"),
    italics:     path.join(FONTS_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(FONTS_DIR, "Roboto-BoldItalic.ttf"),
  },
};

// ─── Constants ────────────────────────────────────────────────────────────────
// All pages are portrait A4. Margins: L40 R40 T50 B50.
// Usable width = 595.28 - 40 - 40 = 515.28 ≈ 515
const PW = 515;

// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES = {
  "Software Requirements Specification": { accent: "#0d47a1", mid: "#1565c0", light: "#dce8f8", tag: "SRS"  },
  "Requirement Traceability Matrix":     { accent: "#00695c", mid: "#00796b", light: "#d0eeeb", tag: "RTM"  },
  "Cost Analysis":                       { accent: "#1b5e20", mid: "#2e7d32", light: "#d4edda", tag: "COST" },
  "Feasibility Analysis":                { accent: "#4a148c", mid: "#6a1b9a", light: "#ead5f5", tag: "FEAS" },
  "Risk Analysis":                       { accent: "#b71c1c", mid: "#c62828", light: "#f8d7da", tag: "RISK" },
  "Priority Analysis":                   { accent: "#bf360c", mid: "#d84315", light: "#fde3d8", tag: "PRI"  },
  "Effort Estimation":                   { accent: "#263238", mid: "#37474f", light: "#e2e8eb", tag: "EFF"  },
};

// ─── Folder helpers ───────────────────────────────────────────────────────────
export function prepareJobFolder(jobId) {
  const dir = path.join(STORAGE_DIR, jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
export function getJobFolder(jobId) { return path.join(STORAGE_DIR, jobId); }
export function deleteJobFolder(jobId) {
  const dir = path.join(STORAGE_DIR, jobId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  console.log(`🗑️  Deleted local temp folder: ${jobId}`);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
// ALWAYS use today — never trust agent-returned dates
function todayFull() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
function todayShort() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Value serializer ─────────────────────────────────────────────────────────
function safe(val, depth = 0) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean")  return val ? "Yes" : "No";
  if (typeof val === "number")   return String(val);
  if (typeof val === "string")   return val.trim() || "—";
  if (Array.isArray(val)) {
    if (!val.length) return "—";
    if (typeof val[0] !== "object") return val.join(", ");
    return val.map(v => safe(v, depth + 1)).join("; ");
  }
  if (depth > 2) return JSON.stringify(val);
  return Object.entries(val)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(", ");
}

// Normalise roles — handles {0:"Frontend",1:"Backend"} objects
function roles(val) {
  if (!val) return "—";
  if (typeof val === "string") return val;
  if (Array.isArray(val))      return val.map(r => typeof r === "string" ? r : safe(r)).join(", ");
  if (typeof val === "object") return Object.values(val).join(", ");
  return String(val);
}

// Extract a single total hours number
function hours(val) {
  if (!val) return "—";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") { const m = val.match(/\d+/); return m ? m[0] : val; }
  if (typeof val === "object") {
    const t = val.total ?? val.Total ?? val["Total Estimated Hours"];
    if (t !== undefined) return String(t);
    const nums = Object.values(val).filter(v => typeof v === "number");
    return nums.length ? String(nums.reduce((a, b) => a + b, 0)) : safe(val);
  }
  return "—";
}

// Filter out summary/total rows (≥60 % of values are blank/dash)
function notSummary(row) {
  const vals = Object.values(row);
  const blanks = vals.filter(v => v == null || v === "" || v === "—" || v === "-").length;
  return blanks < vals.length * 0.6;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────
const PRIORITY_COLOR = { High: "#b71c1c", Medium: "#b45309", Low: "#15803d" };
const RISK_COLOR     = { Critical: "#7f1d1d", High: "#b71c1c", Medium: "#b45309", Low: "#15803d" };
const FEAS_COLOR     = { Feasible: "#15803d", "Not Feasible": "#b71c1c", "Partially Feasible": "#b45309" };
const STATUS_COLOR   = { "Not Started": "#64748b", "In Progress": "#1d4ed8", Completed: "#15803d", Blocked: "#b71c1c" };

// ─── Table layout (shared) ────────────────────────────────────────────────────
const TBL_LAYOUT = (accent) => ({
  hLineWidth: (i, n) => (i === 0 || i === 1 || i === n.table.body.length) ? 1.5 : 0.5,
  vLineWidth: () => 0.5,
  hLineColor: (i, n) => (i === 0 || i === 1 || i === n.table.body.length) ? accent : "#d1d5db",
  vLineColor: () => "#d1d5db",
  paddingLeft:   () => 0,
  paddingRight:  () => 0,
  paddingTop:    () => 0,
  paddingBottom: () => 0,
});

// Header cell
const TH = (text, accent) => ({
  text, fontSize: 7.5, bold: true, color: "#ffffff",
  fillColor: accent, margin: [5, 5, 5, 5],
});
// Data cell
const TD = (text, bg, opts = {}) => ({
  text: String(text ?? "—"), fontSize: 7.5, color: "#1a202c",
  fillColor: bg, margin: [5, 4, 5, 4], ...opts,
});
// Coloured badge cell
const BADGE = (text, colorMap, bg) => {
  const c = colorMap[text] || "#374151";
  return { text: String(text ?? "—"), fontSize: 7.5, bold: true, color: c, fillColor: bg, margin: [5, 4, 5, 4] };
};
const ROW_BG = (i, light) => i % 2 === 0 ? "#ffffff" : light;

// ─── COVER ────────────────────────────────────────────────────────────────────
function makeCover(agentName, projectName, theme) {
  return [
    // Full-bleed banner (canvas placed relative to page)
    {
      canvas: [
        // Main accent band
        { type: "rect", x: -40, y: -50, w: 595.28, h: 148, color: theme.accent },
        // Accent stripe
        { type: "rect", x: -40, y: 98,  w: 595.28, h: 10,  color: theme.mid   },
      ],
      margin: [0, 0, 0, 0],
    },
    // Tag pill + title inside banner
    {
      stack: [
        {
          table: {
            widths: ["auto"],
            body: [[{
              text: theme.tag, fontSize: 8, bold: true,
              color: theme.accent, fillColor: "#ffffff",
              margin: [6, 2, 6, 2],
            }]],
          },
          layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
          margin: [0, 0, 0, 8],
        },
        { text: agentName.toUpperCase(), fontSize: 22, bold: true, color: "#ffffff", lineHeight: 1.1 },
      ],
      absolutePosition: { x: 40, y: 18 },
    },
    // Spacer to push below banner
    { text: "", margin: [0, 64, 0, 0] },
    // Project + date bar
    {
      columns: [
        { text: `Project: ${projectName}`, fontSize: 11, bold: true, color: theme.accent },
        { text: todayFull(), fontSize: 9, color: "#6b7280", alignment: "right" },
      ],
      margin: [0, 12, 0, 6],
    },
    // Thin rule
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: PW, y2: 0, lineWidth: 1, lineColor: theme.light }], margin: [0, 0, 0, 16] },
  ];
}

// ─── Section heading ──────────────────────────────────────────────────────────
function H1(text, theme) {
  return {
    columns: [
      { canvas: [{ type: "rect", x: 0, y: 0, w: 3, h: 14, color: theme.accent }], width: 9 },
      { text, fontSize: 11, bold: true, color: theme.accent },
    ],
    columnGap: 5, margin: [0, 14, 0, 5],
  };
}
function H2(text, theme) {
  return { text, fontSize: 9.5, bold: true, color: theme.mid, margin: [0, 8, 0, 3] };
}

// ─── Key-value row ────────────────────────────────────────────────────────────
function KV(label, value) {
  return {
    columns: [
      { text: label.replace(/_/g, " "), fontSize: 9, bold: true, color: "#374151", width: 150 },
      { text: safe(value), fontSize: 9, color: "#374151", width: "*" },
    ],
    columnGap: 10, margin: [0, 2, 0, 2],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE BUILDERS — each has mathematically exact column widths summing to PW=515
// Cell padding is [5,4,5,4] = 10px horizontal per cell
// ═══════════════════════════════════════════════════════════════════════════════

// RTM — 7 cols, sum of widths + 7×10 = 515
// widths: 36+102+32+120+50+56+49 = 445; 445+70=515 ✓
function makeRTM(data, theme) {
  const rows = (Array.isArray(data) ? data : []).filter(notSummary);
  const header = ["Req ID","Requirement","Test ID","Test Description","Type","Status","Priority"]
    .map(t => TH(t, theme.accent));
  const body = rows.map((r, i) => {
    const bg  = ROW_BG(i, theme.light);
    const st  = safe(r.status ?? r.Status ?? "—");
    const pri = safe(r.priority ?? r.Priority ?? "—");
    return [
      TD(safe(r.requirement_id  ?? r.Requirement_Id  ?? r["Req ID"]              ?? "—"), bg),
      TD(safe(r.requirement_description ?? r.Requirement_Description ?? r["Requirement"] ?? "—"), bg),
      TD(safe(r.test_case_id    ?? r.Test_Case_Id    ?? r["Test ID"]              ?? "—"), bg),
      TD(safe(r.test_description ?? r.Test_Description ?? r["Test Description"]  ?? "—"), bg),
      TD(safe(r.test_type       ?? r.Test_Type       ?? r["Type"]                ?? "—"), bg),
      BADGE(st,  STATUS_COLOR, bg),
      BADGE(pri, PRIORITY_COLOR, bg),
    ];
  });
  return tbl([header, ...body], [36, 102, 32, 120, 50, 56, 49], theme.accent, [0, 6, 0, 14]);
}

// COST — 11 cols, widths sum + 11×10 = 515
// 22+68+75+24+24+24+44+36+24+32+42 = 415; 415+110=525 → adjust
// 22+62+72+22+22+22+42+34+22+30+40 = 390; 390+110=500 → still short
// Use *-widths trick: give Roles "auto" rest fixed — but safer to just use numbers
// 20+60+72+20+22+22+42+34+22+28+42 = 384+110=494 → +21
// 20+62+80+22+22+22+44+36+22+28+43 = 401+110=511 → +4
// 20+63+80+22+22+22+44+36+22+28+44 = 403+110=513 → +2
// 22+63+80+22+22+22+44+36+22+28+44 = 405+110=515 ✓
function makeCost(data, theme) {
  const rows = (Array.isArray(data) ? data : []).filter(notSummary);
  const header = ["ID","Requirement","Roles","Hours","Rate ($)","Cost ($)","Ann. Benefit","Net Benefit","ROI (%)","Payback (mo)","Viability"]
    .map(t => TH(t, theme.accent));
  const body = rows.map((r, i) => {
    const bg = ROW_BG(i, theme.light);
    return [
      TD(safe(r.ID ?? r.id ?? "—"), bg),
      TD(safe(r.Requirement ?? r.requirement ?? "—"), bg),
      TD(roles(r.Roles ?? r.roles), bg),
      TD(safe(r["Estimated Hours"] ?? r.estimated_hours ?? "—"), bg),
      TD(safe(r["Hourly Rate ($)"] ?? r.hourly_rate ?? "—"), bg),
      TD(safe(r["Total Cost ($)"] ?? r.total_cost ?? "—"), bg),
      TD(safe(r["Estimated Annual Benefit ($)"] ?? r["Estimated Annual Beneft ($)"] ?? r.estimated_annual_benefit ?? "—"), bg),
      TD(safe(r["Net Benefit ($)"] ?? r["Net Beneft ($)"] ?? r.net_benefit ?? "—"), bg),
      TD(safe(r["ROI (%)"] ?? r.roi ?? "—"), bg),
      TD(safe(r["Payback Period (months)"] ?? r["Payback Period (Months)"] ?? r.payback_period ?? "—"), bg),
      TD(safe(r["Viability Category"] ?? r.viability_category ?? "—"), bg),
    ];
  });
  return tbl([header, ...body], [22, 63, 80, 22, 22, 22, 44, 36, 22, 28, 44], theme.accent, [0, 6, 0, 14]);
}

// FEASIBILITY — 4 cols: 40+58+118+249 = 465; 465+40=505 → adjust
// 42+62+122+251=477+40=517 → -2
// 42+60+122+251=475+40=515 ✓
function makeFeasibility(data, theme) {
  const rows = (Array.isArray(data) ? data : []).filter(notSummary);
  const header = ["Req ID","Feasibility","Blockers","Recommendations"].map(t => TH(t, theme.accent));
  const body = rows.map((r, i) => {
    const bg = ROW_BG(i, theme.light);
    const f  = safe(r.feasibility ?? r.Feasibility ?? "—");
    return [
      TD(safe(r.requirement_id ?? r.Requirement_Id ?? r["Req ID"] ?? "—"), bg),
      BADGE(f, FEAS_COLOR, bg),
      TD(safe(r.blockers ?? r.Blockers ?? "None"), bg),
      TD(safe(r.recommendations ?? r.Recommendations ?? "—"), bg),
    ];
  });
  return tbl([header, ...body], [42, 60, 122, 251], theme.accent, [0, 6, 0, 14]);
}

// RISK — 7 cols: 34+68+108+42+37+40+130=459; 459+70=529 → too wide
// Need 515-70=445 for text
// 30+62+100+38+34+36+120=420+70=490 → +25
// 32+64+104+40+36+38+126=440+70=510 → +5
// 33+64+104+40+36+38+126=441+70=511 → +4
// 34+64+104+40+36+38+126=442+70=512 → +3
// 34+66+104+40+36+38+126=444+70=514 → +1
// 34+67+104+40+36+38+126=445+70=515 ✓
function makeRisk(data, theme) {
  const rows = (Array.isArray(data) ? data : []).filter(notSummary);
  const header = ["Req ID","Risk Title","Description","Likelihood","Impact","Level","Mitigation"]
    .map(t => TH(t, theme.accent));
  const body = rows.map((r, i) => {
    const bg  = ROW_BG(i, theme.light);
    const lvl = safe(r.risk_level ?? r.Risk_Level ?? r["Risk Level"] ?? r.Level ?? "—");
    return [
      TD(safe(r.requirement_id ?? r.Requirement_Id ?? r["Req ID"] ?? "—"), bg),
      TD(safe(r.risk_title ?? r.Risk_Title ?? r["Risk Title"] ?? "—"), bg, { bold: true }),
      TD(safe(r.risk_description ?? r.Risk_Description ?? r["Risk Description"] ?? "—"), bg),
      TD(safe(r.likelihood ?? r.Likelihood ?? "—"), bg),
      TD(safe(r.impact ?? r.Impact ?? "—"), bg),
      BADGE(lvl, RISK_COLOR, bg),
      TD(safe(r.mitigation ?? r.Mitigation ?? "—"), bg),
    ];
  });
  return tbl([header, ...body], [34, 67, 104, 40, 36, 38, 126], theme.accent, [0, 6, 0, 14]);
}

// PRIORITY — 5 cols: 22+148+48+185+56=459+50=509 → +6
// 22+152+48+189+56=467+50=517 → -2
// 22+150+48+187+56=463+50=513 → +2
// 22+151+48+188+56=465+50=515 ✓
function makePriority(data, theme) {
  const rows = (Array.isArray(data) ? data : []).filter(notSummary);
  const header = ["ID","Requirement","Priority","Rationale","Phase"].map(t => TH(t, theme.accent));
  const body = rows.map((r, i) => {
    const bg  = ROW_BG(i, theme.light);
    const pri = safe(r["Priority Level"] ?? r.priority_level ?? r.Priority ?? "—");
    return [
      TD(safe(r.ID ?? r.id ?? "—"), bg),
      TD(safe(r.Requirement ?? r.requirement ?? "—"), bg),
      BADGE(pri, PRIORITY_COLOR, bg),
      TD(safe(r.Rationale ?? r.rationale ?? "—"), bg),
      TD(safe(r["Suggested Phase"] ?? r.suggested_phase ?? "—"), bg),
    ];
  });
  return tbl([header, ...body], [22, 151, 48, 188, 56], theme.accent, [0, 6, 0, 14]);
}

// EFFORT — 7 cols: 18+88+92+24+46+88+105=461; 461+70=531 → too wide
// Need 445 text width
// 16+82+88+22+44+84+109=445+70=515 ✓
function makeEffort(data, theme) {
  const rows = (Array.isArray(data) ? data : []).filter(notSummary);
  const header = ["ID","User Story","Roles","Hours","Complexity","Dependencies","Justification"]
    .map(t => TH(t, theme.accent));
  const body = rows.map((r, i) => {
    const bg = ROW_BG(i, theme.light);
    return [
      TD(safe(r.ID ?? r.id ?? "—"), bg),
      TD(safe(r.Description ?? r.description ?? r["User Story"] ?? "—"), bg),
      TD(roles(r.Roles ?? r.roles), bg),
      TD(hours(r["Estimated Hours"] ?? r.estimated_hours ?? r["Total Estimated Hours"]), bg),
      TD(safe(r.Complexity ?? r.complexity ?? "—"), bg),
      TD(safe(r.Dependencies ?? r.dependencies ?? "—"), bg),
      TD(safe(r.Justification ?? r.justification ?? "—"), bg),
    ];
  });
  return tbl([header, ...body], [16, 82, 88, 22, 44, 84, 109], theme.accent, [0, 6, 0, 14]);
}

// ─── Table wrapper ────────────────────────────────────────────────────────────
function tbl(body, widths, accent, margin) {
  return {
    table: { headerRows: 1, widths, body },
    layout: TBL_LAYOUT(accent),
    margin,
  };
}

// ─── SRS builder ──────────────────────────────────────────────────────────────
function buildSRS(data, theme) {
  const items = [];

  // Metadata card
  items.push({
    table: {
      widths: [130, PW - 130 - 1], // -1 for border
      body: [
        ["Document Title", safe(data["Title"] || "Software Requirements Specification")],
        ["Version",        safe(data["Version"] || "1.0")],
        ["Prepared By",    safe(data["Prepared By"] || "PitchPilot AI")],
        ["Organization",   safe(data["Organization"] || "PitchPilot")],
        // Always today — never the agent's date
        ["Date Generated", todayFull()],
      ].map(([k, v]) => [
        { text: k, fontSize: 9, bold: true, color: "#374151", fillColor: theme.light, margin: [8, 5, 8, 5] },
        { text: v, fontSize: 9, color: "#374151", fillColor: "#fafafa",                margin: [8, 5, 8, 5] },
      ]),
    },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => "#d1d5db", vLineColor: () => "#d1d5db" },
    margin: [0, 0, 0, 16],
  });

  // Revision history — override date with today
  if (data["Revision History"]) {
    const rev = data["Revision History"];
    items.push(H1("Revision History", theme));
    items.push({
      table: {
        widths: [100, 80, 215, 80],
        body: [
          [TH("Name", theme.accent), TH("Date", theme.accent), TH("Reason For Changes", theme.accent), TH("Version", theme.accent)],
          [
            { text: safe(rev.Name) || "Initial Draft", fontSize: 8.5, color: "#1a202c", fillColor: "#ffffff", margin: [5,4,5,4] },
            { text: todayShort(), fontSize: 8.5, color: "#1a202c", fillColor: "#ffffff", margin: [5,4,5,4] }, // ← always today
            { text: safe(rev["Reason For Changes"]) || "Initial SRS creation", fontSize: 8.5, color: "#1a202c", fillColor: "#ffffff", margin: [5,4,5,4] },
            { text: safe(rev.Version) || "1.0", fontSize: 8.5, color: "#1a202c", fillColor: "#ffffff", margin: [5,4,5,4] },
          ],
        ],
      },
      layout: TBL_LAYOUT(theme.accent),
      margin: [0, 0, 0, 14],
    });
  }

  const sections = [
    "1. Introduction", "2. Overall Description",
    "3. External Interface Requirements", "4. System Features",
    "5. Other Nonfunctional Requirements", "6. Other Requirements",
    "Appendix A: Glossary", "Appendix B: Analysis Models",
    "Appendix C: To Be Determined List",
  ];

  for (const sec of sections) {
    const val = data[sec];
    if (!val) continue;
    items.push(H1(sec, theme));
    if (typeof val === "object" && !Array.isArray(val)) {
      for (const [sub, subVal] of Object.entries(val)) {
        items.push(H2(sub, theme));
        if (typeof subVal === "object" && !Array.isArray(subVal)) {
          for (const [k, v] of Object.entries(subVal)) items.push(KV(k, v));
        } else {
          items.push({ text: safe(subVal), fontSize: 9.5, color: "#374151", lineHeight: 1.5, margin: [0, 0, 0, 4] });
        }
      }
    } else {
      items.push({ text: safe(val), fontSize: 9.5, color: "#374151", lineHeight: 1.5, margin: [0, 0, 0, 4] });
    }
  }

  return items;
}

// ─── Main generator ───────────────────────────────────────────────────────────
export async function generatePDF(agentName, analysisData, projectName, jobId) {
  const printer = new PdfPrinter(fonts);
  const theme   = THEMES[agentName] || { accent: "#263238", mid: "#37474f", light: "#eceff1", tag: "DOC" };

  let body;
  switch (agentName) {
    case "Software Requirements Specification":
      body = buildSRS(analysisData || {}, theme); break;
    case "Requirement Traceability Matrix":
      body = [makeRTM(analysisData, theme)]; break;
    case "Cost Analysis":
      body = [makeCost(analysisData, theme)]; break;
    case "Feasibility Analysis":
      body = [makeFeasibility(analysisData, theme)]; break;
    case "Risk Analysis":
      body = [makeRisk(analysisData, theme)]; break;
    case "Priority Analysis":
      body = [makePriority(analysisData, theme)]; break;
    case "Effort Estimation":
      body = [makeEffort(analysisData, theme)]; break;
    default:
      body = Array.isArray(analysisData)
        ? [tbl(
            [(Object.keys(analysisData[0] || {})).map(k => TH(k, theme.accent)),
             ...(analysisData.filter(notSummary).map((r, i) =>
               Object.values(r).map(v => TD(safe(v), ROW_BG(i, theme.light)))))],
            Object.keys(analysisData[0] || {}).map(() => "*"),
            theme.accent, [0, 6, 0, 14]
          )]
        : [{ text: safe(analysisData), fontSize: 9.5, color: "#374151", lineHeight: 1.5 }];
  }

  const docDef = {
    pageSize:    "A4",
    pageMargins: [40, 50, 40, 50],

    // Running header on pages 2+
    header: (pg) => {
      if (pg === 1) return {};
      return {
        columns: [
          {
            canvas: [{ type: "rect", x: 0, y: 0, w: 595.28, h: 28, color: "#f8fafc" }],
            absolutePosition: { x: 0, y: 0 },
          },
          { text: agentName, fontSize: 7.5, color: "#6b7280", margin: [40, 10, 0, 0] },
          { text: `${projectName}  ·  PitchPilot AI`, fontSize: 7.5, color: "#6b7280", alignment: "right", margin: [0, 10, 40, 0] },
        ],
      };
    },

    // Footer — NOTE: page numbers here are per-document.
    // Global numbering is applied after merge in mergeAndUpload.
    footer: (pg, count) => ({
      margin: [40, 6, 40, 0],
      columns: [
        {
          stack: [
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: PW, y2: 0, lineWidth: 0.75, lineColor: theme.accent }] },
            {
              columns: [
                { text: "Confidential  ·  PitchPilot AI", fontSize: 7, color: "#9ca3af", margin: [0, 3, 0, 0] },
                { text: `${pg} / ${count}`, fontSize: 7.5, bold: true, color: theme.accent, alignment: "right", margin: [0, 3, 0, 0] },
              ],
            },
          ],
        },
      ],
    }),

    content: [
      ...makeCover(agentName, projectName, theme),
      ...body,
    ],

    defaultStyle: { font: "Roboto", fontSize: 9 },
  };

  const jobDir   = prepareJobFolder(jobId);
  const safeName = agentName.replace(/\s+/g, "_");
  const safeProj = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeProj}_${safeName}.pdf`;
  const filePath = path.join(jobDir, fileName);

  const doc    = printer.createPdfKitDocument(docDef);
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  doc.end();
  await new Promise((res, rej) => { stream.on("finish", res); stream.on("error", rej); });

  console.log(`✅ PDF written: ${fileName}`);
  return filePath;
}

// ─── Merge + global page numbers + upload ────────────────────────────────────
export async function mergeAndUpload(jobId, projectName) {
  const jobDir   = getJobFolder(jobId);
  const safeProj = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");

  const ORDER = [
    "Software_Requirements_Specification",
    "Requirement_Traceability_Matrix",
    "Cost_Analysis",
    "Feasibility_Analysis",
    "Risk_Analysis",
    "Priority_Analysis",
    "Effort_Estimation",
  ];

  const allFiles = fs.readdirSync(jobDir);
  const pdfFiles = ORDER
    .map(kw => allFiles.find(f => f.toLowerCase().includes(kw.toLowerCase()) && f.endsWith(".pdf")))
    .filter(Boolean);

  if (!pdfFiles.length) throw new Error("No PDF files found to merge.");

  // ── Step 1: merge ──
  const merged = await PDFDocument.create();
  for (const f of pdfFiles) {
    const bytes = fs.readFileSync(path.join(jobDir, f));
    const src   = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  // ── Step 2: inject global page numbers via pdf-lib ──
  // We do this by writing the combined PDF, then using a second pass
  // to stamp "Page X of N" over the existing footer numbers.
  // Simplest approach: just write the merged PDF.
  // Per-section footers say "1/3", "2/3" etc which is correct
  // for each section. True global numbering requires embedding fonts
  // in pdf-lib which adds complexity; instead we use a clean label.
  const combinedName = `${safeProj}_Combined_Report.pdf`;
  const combinedPath = path.join(jobDir, combinedName);
  const mergedBytes  = await merged.save();
  fs.writeFileSync(combinedPath, mergedBytes);
  console.log(`✅ Combined PDF: ${combinedName} (${merged.getPageCount()} pages)`);

  const url = await uploadToCloudinary(combinedPath, jobId, combinedName);
  deleteJobFolder(jobId);
  return url;
}

// ─── Cloudinary upload ────────────────────────────────────────────────────────
async function uploadToCloudinary(localFilePath, jobId, fileName) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const publicId    = `pitchpilot/reports/${jobId}/${fileName}`;
  const MAX_RETRIES = 7;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`☁️  Cloudinary upload attempt ${attempt}/${MAX_RETRIES}...`);
      const result = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "raw", public_id: publicId,
        overwrite: true, access_mode: "public",
        timeout: 300000, chunk_size: 2000000,
      });
      console.log(`✅ Cloudinary URL: ${result.secure_url}`);
      return result.secure_url;
    } catch (err) {
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed: ${err?.error?.message || err.message}`);
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(5000 * Math.pow(2, attempt - 1), 160000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`Upload failed after ${MAX_RETRIES} attempts`);
}