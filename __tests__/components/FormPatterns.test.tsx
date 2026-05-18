import { describe, expect, it, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Test implementations of common form patterns
interface FormInputProps {
  label: string
  name: string
  type?: 'text' | 'number' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  disabled,
  required,
}: FormInputProps) => (
  <div data-testid={`form-field-${name}`}>
    <label htmlFor={name}>{label}{required && ' *'}</label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      aria-invalid={!!error}
      aria-describedby={error ? `${name}-error` : undefined}
    />
    {error && <span id={`${name}-error`} data-testid={`error-${name}`}>{error}</span>}
  </div>
)

interface FormSelectProps {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  error?: string
  disabled?: boolean
}

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  disabled,
}: FormSelectProps) => (
  <div data-testid={`form-field-${name}`}>
    <label htmlFor={name}>{label}</label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <span data-testid={`error-${name}`}>{error}</span>}
  </div>
)

interface FormCheckboxProps {
  label: string
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const FormCheckbox = ({
  label,
  name,
  checked,
  onChange,
  disabled,
}: FormCheckboxProps) => (
  <div data-testid={`form-field-${name}`}>
    <label htmlFor={name}>
      <input
        id={name}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {label}
    </label>
  </div>
)

describe('FormInput', () => {
  it('renders with label', () => {
    render(
      <FormInput
        label="Username"
        name="username"
        value=""
        onChange={() => {}}
      />
    )
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(
      <FormInput
        label="Email"
        name="email"
        value=""
        onChange={() => {}}
        required
      />
    )
    expect(screen.getByText(/Email \*/)).toBeInTheDocument()
  })

  it('calls onChange when typing', () => {
    const onChange = jest.fn()
    render(
      <FormInput
        label="Name"
        name="name"
        value=""
        onChange={onChange}
      />
    )
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John' } })
    expect(onChange).toHaveBeenCalledWith('John')
  })

  it('shows error message', () => {
    render(
      <FormInput
        label="Email"
        name="email"
        value="invalid"
        onChange={() => {}}
        error="Invalid email format"
      />
    )
    expect(screen.getByTestId('error-email')).toHaveTextContent('Invalid email format')
  })

  it('can be disabled', () => {
    render(
      <FormInput
        label="Disabled"
        name="disabled"
        value=""
        onChange={() => {}}
        disabled
      />
    )
    expect(screen.getByLabelText('Disabled')).toBeDisabled()
  })

  it('shows placeholder', () => {
    render(
      <FormInput
        label="Search"
        name="search"
        value=""
        onChange={() => {}}
        placeholder="Enter search term..."
      />
    )
    expect(screen.getByPlaceholderText('Enter search term...')).toBeInTheDocument()
  })

  it('supports different input types', () => {
    render(
      <FormInput
        label="Password"
        name="password"
        type="password"
        value=""
        onChange={() => {}}
      />
    )
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })
})

describe('FormSelect', () => {
  const options = [
    { value: '', label: 'Select...' },
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]

  it('renders with label', () => {
    render(
      <FormSelect
        label="Country"
        name="country"
        value=""
        onChange={() => {}}
        options={options}
      />
    )
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
  })

  it('renders all options', () => {
    render(
      <FormSelect
        label="Country"
        name="country"
        value=""
        onChange={() => {}}
        options={options}
      />
    )
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  it('calls onChange when selecting', () => {
    const onChange = jest.fn()
    render(
      <FormSelect
        label="Country"
        name="country"
        value=""
        onChange={onChange}
        options={options}
      />
    )
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'option1' } })
    expect(onChange).toHaveBeenCalledWith('option1')
  })

  it('shows error message', () => {
    render(
      <FormSelect
        label="Country"
        name="country"
        value=""
        onChange={() => {}}
        options={options}
        error="Please select a country"
      />
    )
    expect(screen.getByTestId('error-country')).toHaveTextContent('Please select a country')
  })

  it('can be disabled', () => {
    render(
      <FormSelect
        label="Disabled"
        name="disabled"
        value=""
        onChange={() => {}}
        options={options}
        disabled
      />
    )
    expect(screen.getByLabelText('Disabled')).toBeDisabled()
  })
})

describe('FormCheckbox', () => {
  it('renders with label', () => {
    render(
      <FormCheckbox
        label="Accept terms"
        name="terms"
        checked={false}
        onChange={() => {}}
      />
    )
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument()
  })

  it('shows checked state', () => {
    render(
      <FormCheckbox
        label="Checked"
        name="checked"
        checked={true}
        onChange={() => {}}
      />
    )
    expect(screen.getByLabelText('Checked')).toBeChecked()
  })

  it('shows unchecked state', () => {
    render(
      <FormCheckbox
        label="Unchecked"
        name="unchecked"
        checked={false}
        onChange={() => {}}
      />
    )
    expect(screen.getByLabelText('Unchecked')).not.toBeChecked()
  })

  it('calls onChange when clicked', () => {
    const onChange = jest.fn()
    render(
      <FormCheckbox
        label="Toggle"
        name="toggle"
        checked={false}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByLabelText('Toggle'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('can be disabled', () => {
    render(
      <FormCheckbox
        label="Disabled"
        name="disabled"
        checked={false}
        onChange={() => {}}
        disabled
      />
    )
    expect(screen.getByLabelText('Disabled')).toBeDisabled()
  })
})
