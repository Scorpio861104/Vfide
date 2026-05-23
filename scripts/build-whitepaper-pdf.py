#!/usr/bin/env python3
"""
Build PDFs of WHITEPAPER.md and WHITEPAPER-EXECUTIVE-SUMMARY.md.
Run from repo root: python3 scripts/build-whitepaper-pdf.py
"""
import subprocess
import sys
from pathlib import Path
import markdown

ROOT = Path(__file__).resolve().parent.parent

CSS = """
@page {
  size: Letter;
  margin: 0.85in 0.85in 1in 0.85in;
  @bottom-center {
    content: "VFIDE White Paper · v1.0 · Page " counter(page) " of " counter(pages);
    font-family: Georgia, serif;
    font-size: 9pt;
    color: #666;
  }
}
html { font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.55; color: #1a1a1a; }
body { max-width: 7.0in; margin: 0 auto; }
h1 { font-size: 22pt; line-height: 1.2; margin: 0 0 0.4em 0; padding-bottom: 0.3em; border-bottom: 2px solid #1a1a1a; page-break-after: avoid; }
h2 { font-size: 15pt; line-height: 1.25; margin: 1.6em 0 0.5em 0; color: #0a2540; page-break-after: avoid; }
h3 { font-size: 12.5pt; margin: 1.2em 0 0.4em 0; color: #0a2540; page-break-after: avoid; }
p { margin: 0 0 0.7em 0; text-align: justify; orphans: 3; widows: 3; }
strong { color: #0a2540; }
em { font-style: italic; }
a { color: #0066cc; text-decoration: none; word-break: break-word; }
ul, ol { margin: 0.4em 0 0.9em 0; padding-left: 1.6em; }
li { margin-bottom: 0.25em; }
blockquote { border-left: 3px solid #b8c2cc; margin: 0.8em 0; padding: 0.2em 1em; color: #444; background: #f8f9fa; font-style: italic; page-break-inside: avoid; }
code { font-family: "SF Mono", "Menlo", "Consolas", monospace; font-size: 0.92em; background: #f4f4f6; padding: 1px 4px; border-radius: 3px; color: #b3306b; }
pre { background: #f4f4f6; border: 1px solid #e0e0e4; padding: 0.7em; overflow-x: auto; font-size: 9.5pt; border-radius: 4px; page-break-inside: avoid; }
pre code { background: none; padding: 0; color: #1a1a1a; }
table { border-collapse: collapse; margin: 0.8em 0 1.2em 0; font-size: 10pt; width: 100%; page-break-inside: avoid; }
th, td { border: 1px solid #c8c8d0; padding: 5px 9px; text-align: left; vertical-align: top; }
th { background: #0a2540; color: white; font-weight: 600; }
tr:nth-child(even) td { background: #f8f9fa; }
hr { border: none; border-top: 1px solid #c8c8d0; margin: 1.6em 0; }
.title-block { text-align: center; padding: 1.5em 0 1em 0; border-bottom: none; }
"""

HTML_TEMPLATE = """<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title><style>{css}</style></head>
<body>{body}</body></html>"""

def build(md_path: Path, pdf_path: Path, title: str):
    md_text = md_path.read_text(encoding="utf-8")
    html_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "sane_lists"],
    )
    html_doc = HTML_TEMPLATE.format(title=title, css=CSS, body=html_body)
    html_tmp = pdf_path.with_suffix(".tmp.html")
    html_tmp.write_text(html_doc, encoding="utf-8")
    cmd = [
        "wkhtmltopdf",
        "--enable-local-file-access",
        "--encoding", "utf-8",
        "--print-media-type",
        "--margin-top", "20mm",
        "--margin-bottom", "22mm",
        "--margin-left", "20mm",
        "--margin-right", "20mm",
        "--footer-font-size", "8",
        "--footer-font-name", "Georgia",
        "--footer-center", "VFIDE — Page [page] of [topage]",
        "--footer-spacing", "5",
        "--quiet",
        str(html_tmp), str(pdf_path),
    ]
    print(f"  → {pdf_path.relative_to(ROOT)}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("STDERR:", res.stderr)
        sys.exit(res.returncode)
    html_tmp.unlink()

def main():
    targets = [
        (ROOT / "WHITEPAPER.md", ROOT / "WHITEPAPER.pdf", "VFIDE White Paper"),
        (ROOT / "WHITEPAPER-EXECUTIVE-SUMMARY.md", ROOT / "WHITEPAPER-EXECUTIVE-SUMMARY.pdf", "VFIDE Executive Summary"),
    ]
    print("Building VFIDE white paper PDFs...")
    for md, pdf, title in targets:
        if not md.exists():
            print(f"  ! missing: {md.relative_to(ROOT)}")
            continue
        build(md, pdf, title)
    print("Done.")

if __name__ == "__main__":
    main()
