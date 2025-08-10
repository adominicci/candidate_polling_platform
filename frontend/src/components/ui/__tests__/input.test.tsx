import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../input'

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText(/enter text/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('h-10', 'w-full', 'rounded-md', 'border', 'border-input')
  })

  it('handles text input', async () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} placeholder="Type here" />)
    
    const input = screen.getByPlaceholderText(/type here/i)
    await userEvent.type(input, 'Hello World')
    
    expect(input).toHaveValue('Hello World')
    expect(handleChange).toHaveBeenCalled()
  })

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />)
    expect(screen.getByPlaceholderText(/email/i)).toHaveAttribute('type', 'email')

    rerender(<Input type="password" placeholder="Password" />)
    expect(screen.getByPlaceholderText(/password/i)).toHaveAttribute('type', 'password')

    rerender(<Input type="number" placeholder="Age" />)
    expect(screen.getByPlaceholderText(/age/i)).toHaveAttribute('type', 'number')
  })

  it('shows error state', () => {
    render(<Input error placeholder="Error input" />)
    
    const input = screen.getByPlaceholderText(/error input/i)
    expect(input).toHaveClass('border-red-500', 'focus-visible:ring-red-500')
  })

  it('displays helper text', () => {
    render(<Input helperText="This is helper text" placeholder="Input" />)
    
    expect(screen.getByText(/this is helper text/i)).toBeInTheDocument()
    expect(screen.getByText(/this is helper text/i)).toHaveClass('text-muted-foreground')
  })

  it('displays error helper text', () => {
    render(
      <Input 
        error 
        helperText="This is an error message" 
        placeholder="Error input" 
      />
    )
    
    const helperText = screen.getByText(/this is an error message/i)
    expect(helperText).toBeInTheDocument()
    expect(helperText).toHaveClass('text-red-600')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />)
    
    const input = screen.getByPlaceholderText(/disabled input/i)
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" placeholder="Custom" />)
    
    const input = screen.getByPlaceholderText(/custom/i)
    expect(input).toHaveClass('custom-class')
  })

  it('forwards HTML input props', () => {
    render(
      <Input
        required
        maxLength={100}
        pattern="[a-z]+"
        data-testid="test-input"
        placeholder="Test input"
      />
    )
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('required')
    expect(input).toHaveAttribute('maxLength', '100')
    expect(input).toHaveAttribute('pattern', '[a-z]+')
  })

  it('supports controlled input', async () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('')
      
      return (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Controlled input"
        />
      )
    }

    render(<TestComponent />)
    
    const input = screen.getByPlaceholderText(/controlled input/i)
    await userEvent.type(input, 'test')
    
    expect(input).toHaveValue('test')
  })

  it('supports uncontrolled input', () => {
    render(<Input defaultValue="default value" placeholder="Uncontrolled" />)
    
    const input = screen.getByPlaceholderText(/uncontrolled/i)
    expect(input).toHaveValue('default value')
  })

  it('handles focus events', async () => {
    const handleFocus = jest.fn()
    const handleBlur = jest.fn()
    
    render(
      <Input
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Focus test"
      />
    )
    
    const input = screen.getByPlaceholderText(/focus test/i)
    
    await userEvent.click(input)
    expect(handleFocus).toHaveBeenCalled()
    expect(input).toHaveFocus()
    
    await userEvent.tab()
    expect(handleBlur).toHaveBeenCalled()
    expect(input).not.toHaveFocus()
  })

  it('has proper focus styles', () => {
    render(<Input placeholder="Focus styles" />)
    
    const input = screen.getByPlaceholderText(/focus styles/i)
    expect(input).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    )
  })

  it('supports form validation', async () => {
    render(
      <form data-testid="test-form">
        <Input required placeholder="Required field" />
        <button type="submit">Submit</button>
      </form>
    )
    
    const form = screen.getByTestId('test-form')
    const submitButton = screen.getByRole('button', { name: /submit/i })
    
    // Submit form without filling required field
    fireEvent.submit(form)
    
    const input = screen.getByPlaceholderText(/required field/i)
    expect(input).toBeInvalid()
  })

  it('handles number input correctly', async () => {
    const handleChange = jest.fn()
    render(
      <Input
        type="number"
        onChange={handleChange}
        placeholder="Enter number"
      />
    )
    
    const input = screen.getByPlaceholderText(/enter number/i)
    await userEvent.type(input, '123')
    
    expect(input).toHaveValue(123)
  })

  it('handles file input correctly', () => {
    render(<Input type="file" accept=".pdf,.doc" data-testid="file-input" />)
    
    const input = screen.getByTestId('file-input')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', '.pdf,.doc')
  })

  it('maintains accessibility standards', () => {
    render(
      <div>
        <label htmlFor="accessible-input">Accessible Label</label>
        <Input
          id="accessible-input"
          aria-describedby="help-text"
          placeholder="Accessible input"
          helperText="This helps describe the input"
        />
      </div>
    )
    
    const input = screen.getByLabelText(/accessible label/i)
    expect(input).toHaveAttribute('aria-describedby', 'help-text')
  })

  describe('Error States', () => {
    it('shows error border without helper text', () => {
      render(<Input error placeholder="Error only" />)
      
      const input = screen.getByPlaceholderText(/error only/i)
      expect(input).toHaveClass('border-red-500')
    })

    it('combines error state with custom className', () => {
      render(
        <Input
          error
          className="custom-error"
          placeholder="Custom error"
        />
      )
      
      const input = screen.getByPlaceholderText(/custom error/i)
      expect(input).toHaveClass('border-red-500', 'custom-error')
    })
  })
})