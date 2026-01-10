import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LessonModal, { LessonContent } from "@/components/LessonModal";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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
