/**
 * Form Components Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Form Components', () => {
  describe('Input Validation', () => {
    it('should validate email input', async () => {
      const EmailInput = () => {
        const [email, setEmail] = React.useState('');
        const [error, setError] = React.useState('');
        
        const validate = (value: string) => {
          if (!value.includes('@')) {
            setError('Invalid email');
          } else {
            setError('');
          }
        };
        
        return (
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validate(e.target.value);
              }}
              placeholder="Email"
            />
            {error && <span role="alert">{error}</span>}
          </div>
        );
      };
      
      render(<EmailInput />);
      
      const input = screen.getByPlaceholderText(/email/i);
      await userEvent.type(input, 'invalid');
      
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email/i);
      
      await userEvent.clear(input);
      await userEvent.type(input, 'valid@email.com');
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should validate password strength', async () => {
      const PasswordInput = () => {
        const [password, setPassword] = React.useState('');
        const [strength, setStrength] = React.useState('');
        
        const checkStrength = (value: string) => {
          if (value.length < 8) setStrength('Weak');
          else if (value.length < 12) setStrength('Medium');
          else setStrength('Strong');
        };
        
        return (
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                checkStrength(e.target.value);
              }}
              placeholder="Password"
            />
            {strength && <span>{strength}</span>}
          </div>
        );
      };
      
      render(<PasswordInput />);
      
      const input = screen.getByPlaceholderText(/password/i);
      
      await userEvent.type(input, 'short');
      expect(screen.getByText(/weak/i)).toBeInTheDocument();
      
      await userEvent.clear(input);
      await userEvent.type(input, 'mediumpass');
      expect(screen.getByText(/medium/i)).toBeInTheDocument();
      
      await userEvent.clear(input);
      await userEvent.type(input, 'verystrongpassword');
      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const onSubmit = jest.fn((e) => e.preventDefault());
      
      const Form = () => (
        <form onSubmit={onSubmit}>
          <input required placeholder="Name" defaultValue="Test Name" />
          <button type="submit">Submit</button>
        </form>
      );
      
      render(<Form />);
      
      fireEvent.click(screen.getByText(/submit/i));
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should handle form submission', async () => {
      const onSubmit = jest.fn();
      
      const LoginForm = () => {
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          onSubmit({
            email: formData.get('email'),
            password: formData.get('password'),
          });
        };
        
        return (
          <form onSubmit={handleSubmit}>
            <input name="email" placeholder="Email" />
            <input name="password" type="password" placeholder="Password" />
            <button type="submit">Login</button>
          </form>
        );
      };
      
      render(<LoginForm />);
      
      await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123');
      fireEvent.click(screen.getByText(/login/i));
      
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should show loading state during submission', async () => {
      const Form = () => {
        const [loading, setLoading] = React.useState(false);
        
        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setLoading(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          setLoading(false);
        };
        
        return (
          <form onSubmit={handleSubmit}>
            <input placeholder="Email" />
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        );
      };
      
      render(<Form />);
      
      fireEvent.click(screen.getByText(/submit/i));
      
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText(/submit/i)).toBeInTheDocument();
      });
    });

    it('should display success message', async () => {
      const Form = () => {
        const [success, setSuccess] = React.useState(false);
        
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          setSuccess(true);
        };
        
        return (
          <div>
            <form onSubmit={handleSubmit}>
              <input placeholder="Email" />
              <button type="submit">Submit</button>
            </form>
            {success && <div role="status">Success!</div>}
          </div>
        );
      };
      
      render(<Form />);
      
      fireEvent.click(screen.getByText(/submit/i));
      
      expect(screen.getByRole('status')).toHaveTextContent(/success/i);
    });

    it('should display error message', async () => {
      const Form = () => {
        const [error, setError] = React.useState('');
        
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          setError('Submission failed');
        };
        
        return (
          <div>
            <form onSubmit={handleSubmit}>
              <input placeholder="Email" />
              <button type="submit">Submit</button>
            </form>
            {error && <div role="alert">{error}</div>}
          </div>
        );
      };
      
      render(<Form />);
      
      fireEvent.click(screen.getByText(/submit/i));
      
      expect(screen.getByRole('alert')).toHaveTextContent(/failed/i);
    });
  });

  describe('Field Interactions', () => {
    it('should handle text input', async () => {
      const TextInput = () => {
        const [value, setValue] = React.useState('');
        return (
          <div>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Text"
            />
            <p>Value: {value}</p>
          </div>
        );
      };
      
      render(<TextInput />);
      
      const input = screen.getByPlaceholderText(/text/i);
      await userEvent.type(input, 'Hello');
      
      expect(screen.getByText(/value: hello/i)).toBeInTheDocument();
    });

    it('should handle checkbox input', () => {
      const Checkbox = () => {
        const [checked, setChecked] = React.useState(false);
        return (
          <div>
            <label>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              Accept terms
            </label>
            <p>Checked: {checked.toString()}</p>
          </div>
        );
      };
      
      render(<Checkbox />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(screen.getByText(/checked: true/i)).toBeInTheDocument();
    });

    it('should handle select input', async () => {
      const Select = () => {
        const [value, setValue] = React.useState('');
        return (
          <div>
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">Select...</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
            </select>
            <p>Selected: {value}</p>
          </div>
        );
      };
      
      render(<Select />);
      
      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'option1');
      
      expect(screen.getByText(/selected: option1/i)).toBeInTheDocument();
    });

    it('should handle textarea input', async () => {
      const Textarea = () => {
        const [value, setValue] = React.useState('');
        return (
          <div>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Message"
            />
            <p>Length: {value.length}</p>
          </div>
        );
      };
      
      render(<Textarea />);
      
      const textarea = screen.getByPlaceholderText(/message/i);
      await userEvent.type(textarea, 'Hello World');
      
      expect(screen.getByText(/length: 11/i)).toBeInTheDocument();
    });
  });

  describe('Form Reset', () => {
    it('should reset form fields', () => {
      const Form = () => {
        const [value, setValue] = React.useState('');
        
        return (
          <div>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Text"
            />
            <button onClick={() => setValue('')}>Reset</button>
          </div>
        );
      };
      
      render(<Form />);
      
      const input = screen.getByPlaceholderText(/text/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test' } });
      
      expect(input.value).toBe('test');
      
      fireEvent.click(screen.getByText(/reset/i));
      
      expect(input.value).toBe('');
    });
  });

  describe('Real-time Validation', () => {
    it('should validate as user types', async () => {
      const AmountInput = () => {
        const [amount, setAmount] = React.useState('');
        const [error, setError] = React.useState('');
        
        const validate = (value: string) => {
          if (parseFloat(value) < 0) {
            setError('Amount must be positive');
          } else {
            setError('');
          }
        };
        
        return (
          <div>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                validate(e.target.value);
              }}
              placeholder="Amount"
            />
            {error && <span role="alert">{error}</span>}
          </div>
        );
      };
      
      render(<AmountInput />);
      
      const input = screen.getByPlaceholderText(/amount/i);
      await userEvent.type(input, '-5');
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Field Focus', () => {
    it('should focus first field on mount', () => {
      const Form = () => {
        const inputRef = React.useRef<HTMLInputElement>(null);
        
        React.useEffect(() => {
          inputRef.current?.focus();
        }, []);
        
        return <input ref={inputRef} placeholder="Email" />;
      };
      
      render(<Form />);
      
      expect(document.activeElement).toBe(screen.getByPlaceholderText(/email/i));
    });

    it('should handle tab navigation', async () => {
      const Form = () => (
        <form>
          <input placeholder="First" />
          <input placeholder="Second" />
          <button>Submit</button>
        </form>
      );
      
      render(<Form />);
      
      const first = screen.getByPlaceholderText(/first/i);
      first.focus();
      
      expect(document.activeElement).toBe(first);
      
      await userEvent.tab();
      
      expect(document.activeElement).toBe(screen.getByPlaceholderText(/second/i));
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels', () => {
      const Form = () => (
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" />
        </div>
      );
      
      render(<Form />);
      
      const label = screen.getByText(/email/i);
      const input = screen.getByLabelText(/email/i);
      
      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should have aria attributes', () => {
      const Form = () => (
        <input
          aria-label="Search"
          aria-required="true"
          aria-invalid="false"
        />
      );
      
      render(<Form />);
      
      const input = screen.getByLabelText(/search/i);
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });
  });
});
