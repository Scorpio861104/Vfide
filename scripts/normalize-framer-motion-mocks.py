#!/usr/bin/env python3
"""
Normalize all jest.mock('framer-motion', ...) factories to a complete Proxy-based
mock that handles arbitrary motion.* element variants and AnimatePresence,
useAnimation, useScroll, useMotionValue, useTransform, useInView, etc.

The default mock in many test files only handles `motion.h1` or `motion.div`,
which causes "Element type is invalid" errors when a component uses
`motion.section`, `motion.span`, AnimatePresence, etc.

Strategy: replace the factory body with a Proxy that returns a forwardRef
component for any motion.<tag> access, plus stubs for the common hooks.

Idempotent via FRAMER_MOTION_MOCK_V1 sentinel.
"""
from __future__ import annotations
import re
from pathlib import Path

SENTINEL = "/* FRAMER_MOTION_MOCK_V1 */"

CANONICAL = """jest.mock('framer-motion', () => {
  /* FRAMER_MOTION_MOCK_V1 */
  const React = require('react');
  // Reusable component that strips motion-only props and renders the underlying tag.
  const __MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'drag',
    'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition',
    'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
    'onAnimationStart', 'onAnimationComplete', 'onUpdate', 'onPan',
    'onPanStart', 'onPanEnd', 'onTap', 'onTapStart', 'onTapCancel',
    'onHoverStart', 'onHoverEnd', 'onDrag', 'onDragStart', 'onDragEnd',
    'onDirectionLock', 'onViewportEnter', 'onViewportLeave',
    'viewport', 'custom', 'transformTemplate', 'inherit',
  ]);
  const __makeMotion = (tag) => React.forwardRef((props, ref) => {
    const sanitized = {};
    for (const k of Object.keys(props || {})) {
      if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k];
    }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({}, {
    get: (t, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!t[prop]) t[prop] = __makeMotion(prop === 'custom' ? 'div' : prop);
      return t[prop];
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }) => children,
    LayoutGroup: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    MotionConfig: ({ children }) => children,
    Reorder: { Group: ({ children }) => children, Item: ({ children }) => children },
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useAnimationControls: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollX: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollXProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useMotionValue: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useTransform: (v) => ({ get: () => 0, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useSpring: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useInView: () => true,
    useReducedMotion: () => false,
    useDragControls: () => ({ start: jest.fn() }),
    usePresence: () => [true, jest.fn()],
    useIsPresent: () => true,
    useMotionTemplate: () => ({ get: () => '', set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useViewportScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useCycle: (...args) => [args[0], jest.fn()],
    animate: jest.fn(),
    stagger: jest.fn(() => 0),
    transform: jest.fn((v) => v),
  };
});"""

START_RE = re.compile(r"jest\.mock\(\s*['\"]framer-motion['\"]\s*,")


def find_call_end(text: str, paren_open: int) -> int:
    if text[paren_open] != "(":
        return -1
    depth = 0; i = paren_open
    in_str = None; in_template = 0; in_lc = False; in_bc = False
    while i < len(text):
        c = text[i]; nxt = text[i+1] if i+1 < len(text) else ""
        if in_lc:
            if c == "\n": in_lc = False
            i += 1; continue
        if in_bc:
            if c == "*" and nxt == "/":
                in_bc = False; i += 2; continue
            i += 1; continue
        if in_str is not None:
            if c == "\\":
                i += 2; continue
            if c == in_str: in_str = None
            i += 1; continue
        if in_template:
            if c == "\\":
                i += 2; continue
            if c == "`":
                in_template -= 1
            i += 1; continue
        if c == "/" and nxt == "/":
            in_lc = True; i += 2; continue
        if c == "/" and nxt == "*":
            in_bc = True; i += 2; continue
        if c in "\"'":
            in_str = c; i += 1; continue
        if c == "`":
            in_template += 1; i += 1; continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def patch_file(p: Path) -> bool:
    src = p.read_text()
    if SENTINEL in src:
        return False
    m = START_RE.search(src)
    if not m:
        return False
    paren_open = src.find("(", m.start())
    if paren_open < 0:
        return False
    paren_close = find_call_end(src, paren_open)
    if paren_close < 0:
        return False
    new_src = src[:m.start()] + CANONICAL + src[paren_close+1:]
    p.write_text(new_src)
    return True


def main():
    changed = 0
    for f in Path("__tests__").rglob("*.test.ts*"):
        try:
            if patch_file(f):
                changed += 1
        except Exception as e:
            print(f"[err] {f}: {e}")
    # also components/__tests__
    for root in ["components", "hooks", "lib"]:
        rp = Path(root)
        if not rp.exists():
            continue
        for f in rp.rglob("*.test.ts*"):
            try:
                if patch_file(f):
                    changed += 1
            except Exception as e:
                print(f"[err] {f}: {e}")
    print(f"{changed} framer-motion mocks normalized")


if __name__ == "__main__":
    main()
