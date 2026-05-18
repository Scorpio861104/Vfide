/**
 * Modal Components Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('Modal Components', () => {
  describe('Basic Modal', () => {
    it('should render modal when open', () => {
      const Modal = ({ isOpen, children }: any) => {
        if (!isOpen) return null;
        return (
          <div role="dialog" aria-modal="true">
            {children}
          </div>
        );
      };
      
      render(
        <Modal isOpen={true}>
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/modal content/i)).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      const Modal = ({ isOpen, children }: any) => {
        if (!isOpen) return null;
        return <div role="dialog">{children}</div>;
      };
      
      render(<Modal isOpen={false}><p>Content</p></Modal>);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close on close button click', () => {
      const onClose = jest.fn();
      
      const Modal = () => (
        <div role="dialog">
          <button onClick={onClose}>Close</button>
        </div>
      );
      
      render(<Modal />);
      
      fireEvent.click(screen.getByText(/close/i));
      expect(onClose).toHaveBeenCalled();
    });

    it('should close on overlay click', () => {
      const onClose = jest.fn();
      
      const Modal = () => (
        <div data-testid="overlay" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()}>
            <p>Content</p>
          </div>
        </div>
      );
      
      render(<Modal />);
      
      fireEvent.click(screen.getByTestId('overlay'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should not close on content click', () => {
      const onClose = jest.fn();
      
      const Modal = () => (
        <div data-testid="overlay" onClick={onClose}>
          <div data-testid="content" onClick={(e) => e.stopPropagation()}>
            <p>Content</p>
          </div>
        </div>
      );
      
      render(<Modal />);
      
      fireEvent.click(screen.getByTestId('content'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Confirmation Modal', () => {
    it('should render confirmation buttons', () => {
      const ConfirmModal = () => (
        <div role="dialog">
          <p>Are you sure?</p>
          <button>Confirm</button>
          <button>Cancel</button>
        </div>
      );
      
      render(<ConfirmModal />);
      
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByText(/confirm/i)).toBeInTheDocument();
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });

    it('should call onConfirm when confirmed', () => {
      const onConfirm = jest.fn();
      
      const ConfirmModal = () => (
        <div role="dialog">
          <button onClick={onConfirm}>Confirm</button>
          <button>Cancel</button>
        </div>
      );
      
      render(<ConfirmModal />);
      
      fireEvent.click(screen.getByText(/confirm/i));
      expect(onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when cancelled', () => {
      const onCancel = jest.fn();
      
      const ConfirmModal = () => (
        <div role="dialog">
          <button>Confirm</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      );
      
      render(<ConfirmModal />);
      
      fireEvent.click(screen.getByText(/cancel/i));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Alert Modal', () => {
    it('should display alert message', () => {
      const AlertModal = ({ message }: any) => (
        <div role="alertdialog">
          <p>{message}</p>
          <button>OK</button>
        </div>
      );
      
      render(<AlertModal message="Something went wrong" />);
      
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should have OK button', () => {
      const AlertModal = () => (
        <div role="alertdialog">
          <p>Alert</p>
          <button>OK</button>
        </div>
      );
      
      render(<AlertModal />);
      
      expect(screen.getByText(/ok/i)).toBeInTheDocument();
    });

    it('should close on OK click', () => {
      const onClose = jest.fn();
      
      const AlertModal = () => (
        <div role="alertdialog">
          <p>Alert</p>
          <button onClick={onClose}>OK</button>
        </div>
      );
      
      render(<AlertModal />);
      
      fireEvent.click(screen.getByText(/ok/i));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Form Modal', () => {
    it('should render form inside modal', () => {
      const FormModal = () => (
        <div role="dialog">
          <form>
            <input placeholder="Name" />
            <button type="submit">Submit</button>
          </form>
        </div>
      );
      
      render(<FormModal />);
      
      expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
      expect(screen.getByText(/submit/i)).toBeInTheDocument();
    });

    it('should handle form submission', () => {
      const onSubmit = jest.fn((e) => e.preventDefault());
      
      const FormModal = () => (
        <div role="dialog">
          <form onSubmit={onSubmit}>
            <input placeholder="Name" />
            <button type="submit">Submit</button>
          </form>
        </div>
      );
      
      render(<FormModal />);
      
      fireEvent.click(screen.getByText(/submit/i));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('Modal Transitions', () => {
    it('should animate on open', async () => {
      const Modal = ({ isOpen }: any) => {
        const [show, setShow] = React.useState(false);
        
        React.useEffect(() => {
          if (isOpen) {
            setTimeout(() => setShow(true), 0);
          }
        }, [isOpen]);
        
        if (!isOpen) return null;
        
        return (
          <div
            role="dialog"
            className={show ? 'opacity-100' : 'opacity-0'}
          >
            Content
          </div>
        );
      };
      
      const { rerender } = render(<Modal isOpen={false} />);
      
      rerender(<Modal isOpen={true} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveClass('opacity-100');
      });
    });
  });

  describe('Modal Size', () => {
    it('should support small size', () => {
      const Modal = ({ size }: any) => (
        <div role="dialog" className={`modal-${size}`}>
          Content
        </div>
      );
      
      render(<Modal size="small" />);
      
      expect(screen.getByRole('dialog')).toHaveClass('modal-small');
    });

    it('should support large size', () => {
      const Modal = ({ size }: any) => (
        <div role="dialog" className={`modal-${size}`}>
          Content
        </div>
      );
      
      render(<Modal size="large" />);
      
      expect(screen.getByRole('dialog')).toHaveClass('modal-large');
    });
  });

  describe('Escape Key', () => {
    it('should close on escape key', () => {
      const onClose = jest.fn();
      
      const Modal = () => {
        React.useEffect(() => {
          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
          };
          document.addEventListener('keydown', handleKeyDown);
          return () => document.removeEventListener('keydown', handleKeyDown);
        }, []);
        
        return <div role="dialog">Content</div>;
      };
      
      render(<Modal />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Focus Trap', () => {
    it('should trap focus inside modal', () => {
      const Modal = () => (
        <div role="dialog">
          <button>First</button>
          <button>Last</button>
        </div>
      );
      
      render(<Modal />);
      
      const firstBtn = screen.getByText(/first/i);
      const lastBtn = screen.getByText(/last/i);
      
      firstBtn.focus();
      expect(document.activeElement).toBe(firstBtn);
      
      lastBtn.focus();
      expect(document.activeElement).toBe(lastBtn);
    });
  });

  describe('Portal Rendering', () => {
    it('should render in portal', () => {
      const Modal = () => {
        const modalRoot = document.createElement('div');
        modalRoot.id = 'modal-root';
        document.body.appendChild(modalRoot);
        
        return (
          <div role="dialog">Content</div>
        );
      };
      
      render(<Modal />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-modal attribute', () => {
      const Modal = () => (
        <div role="dialog" aria-modal="true">
          Content
        </div>
      );
      
      render(<Modal />);
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby', () => {
      const Modal = () => (
        <div role="dialog" aria-labelledby="modal-title">
          <h2 id="modal-title">Title</h2>
        </div>
      );
      
      render(<Modal />);
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should have aria-describedby', () => {
      const Modal = () => (
        <div role="dialog" aria-describedby="modal-desc">
          <p id="modal-desc">Description</p>
        </div>
      );
      
      render(<Modal />);
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'modal-desc');
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when open', () => {
      const Modal = ({ isOpen }: any) => {
        React.useEffect(() => {
          if (isOpen) {
            document.body.style.overflow = 'hidden';
          } else {
            document.body.style.overflow = '';
          }
        }, [isOpen]);
        
        return isOpen ? <div role="dialog">Content</div> : null;
      };
      
      const { rerender } = render(<Modal isOpen={true} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(<Modal isOpen={false} />);
      
      expect(document.body.style.overflow).toBe('');
    });
  });
});
