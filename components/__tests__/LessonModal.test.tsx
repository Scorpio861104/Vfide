import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LessonModal, { LessonContent } from "@/components/modals/LessonModal";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Mock framer-motion
jest.mock('framer-motion', () => {
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
    m: motion,
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
});;

describe("LessonModal", () => {
  const mockLesson: LessonContent = {
    title: "Test Lesson",
    duration: "5 min",
    description: "A test lesson description",
    sections: [
      {
        heading: "Section 1",
        content: "Section 1 content",
        points: ["Point 1", "Point 2"],
      },
      {
        heading: "Section 2",
        content: "Section 2 content",
      },
    ],
    keyTakeaways: ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it("renders nothing when lesson is null", () => {
    const { container } = render(
      <LessonModal isOpen={true} onClose={mockOnClose} lesson={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders lesson content when open with valid lesson", () => {
    render(
      <LessonModal isOpen={true} onClose={mockOnClose} lesson={mockLesson} />
    );

    expect(screen.getByText("Test Lesson")).toBeInTheDocument();
    expect(screen.getByText("A test lesson description")).toBeInTheDocument();
    expect(screen.getByText("5 min")).toBeInTheDocument();
  });

  it("renders all lesson sections", () => {
    render(
      <LessonModal isOpen={true} onClose={mockOnClose} lesson={mockLesson} />
    );

    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByText("Section 1 content")).toBeInTheDocument();
    expect(screen.getByText("Point 1")).toBeInTheDocument();
    expect(screen.getByText("Point 2")).toBeInTheDocument();

    expect(screen.getByText("Section 2")).toBeInTheDocument();
    expect(screen.getByText("Section 2 content")).toBeInTheDocument();
  });

  it("renders key takeaways", () => {
    render(
      <LessonModal isOpen={true} onClose={mockOnClose} lesson={mockLesson} />
    );

    expect(screen.getByText("Key Takeaways")).toBeInTheDocument();
    expect(screen.getByText("Takeaway 1")).toBeInTheDocument();
    expect(screen.getByText("Takeaway 2")).toBeInTheDocument();
    expect(screen.getByText("Takeaway 3")).toBeInTheDocument();
  });

  it("renders Complete Lesson button", () => {
    render(
      <LessonModal isOpen={true} onClose={mockOnClose} lesson={mockLesson} />
    );

    const button = screen.getByText("Complete Lesson");
    expect(button).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <LessonModal isOpen={false} onClose={mockOnClose} lesson={mockLesson} />
    );

    expect(screen.queryByText("Test Lesson")).not.toBeInTheDocument();
  });
});
