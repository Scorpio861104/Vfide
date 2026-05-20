# Button & Handler Functionality Audit

Files scanned: **1251**
Findings: **high=0** **medium=0** **info=0**
Suppressed (`button-ok` markers): 7

## By category


## Findings

_No active findings._

## Suppressed (7) — marked `button-ok`

- **MEDIUM** [button-no-handler] app/theme/components/PreviewTab.tsx:22 — <button> has no onClick, no type="submit", no form, no spread{...props}, and is not disabled — likely dead button — _decorative theme-preview swatch buttons; intentionally inert_
- **MEDIUM** [button-no-handler] app/theme/components/PreviewTab.tsx:23 — <button> has no onClick, no type="submit", no form, no spread{...props}, and is not disabled — likely dead button — _decorative theme-preview swatch buttons; intentionally inert_
- **MEDIUM** [button-no-handler] app/theme-manager/page.tsx:212 — <button> has no onClick, no type="submit", no form, no spread{...props}, and is not disabled — likely dead button — _decorative theme color-swatch buttons; intentionally inert (no handler needed)_
- **MEDIUM** [button-no-handler] app/theme-manager/page.tsx:215 — <button> has no onClick, no type="submit", no form, no spread{...props}, and is not disabled — likely dead button — _decorative theme color-swatch buttons; intentionally inert (no handler needed)_
- **MEDIUM** [button-no-handler] app/theme-manager/page.tsx:218 — <button> has no onClick, no type="submit", no form, no spread{...props}, and is not disabled — likely dead button — _decorative theme color-swatch buttons; intentionally inert (no handler needed)_
- **MEDIUM** [button-no-handler] app/theme-manager/page.tsx:221 — <button> has no onClick, no type="submit", no form, no spread{...props}, and is not disabled — likely dead button — _decorative theme color-swatch buttons; intentionally inert (no handler needed)_
- **MEDIUM** [button-no-handler] app/theme-manager/page.tsx:224 — <button> has no onClick, no type="submit", no form, no spread{...props}, and is not disabled — likely dead button — _decorative theme color-swatch buttons; intentionally inert (no handler needed)_
