import React from 'react' // eslint-disable-line no-unused-vars
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'

const renderPage = (page) => render(
  <MemoryRouter initialEntries={['/login']}>
    {page}
  </MemoryRouter>
)

describe('authentication pages', () => {
  it('submits login credentials and displays server errors', async () => {
    const handleLogin = vi.fn()
      .mockRejectedValueOnce({ response: { data: { error: { message: 'Invalid credentials.' } } } })
      .mockResolvedValueOnce({ id: 'user-1' })

    renderPage(<LoginPage handleLogin={handleLogin} />)

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'student@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'FixturePass1!' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid credentials.')).toBeTruthy()
    expect(handleLogin).toHaveBeenCalledWith('student@example.com', 'FixturePass1!')

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(handleLogin).toHaveBeenCalledTimes(2))
  })

  it('rejects weak registration passwords before calling the auth handler', async () => {
    const handleRegister = vi.fn()
    renderPage(<RegisterPage handleLogin={handleRegister} />)

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Study Student' } })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'student@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'weak' } })
    fireEvent.click(screen.getByRole('button', { name: /register now/i }))

    expect(await screen.findByText('Please choose a stronger password that meets all requirements.')).toBeTruthy()
    expect(handleRegister).not.toHaveBeenCalled()
  })

  it('submits valid registration data', async () => {
    const handleRegister = vi.fn().mockResolvedValue({ id: 'user-1' })
    renderPage(<RegisterPage handleLogin={handleRegister} />)

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Study Student' } })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'student@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'FixturePass1!' } })
    fireEvent.click(screen.getByRole('button', { name: /register now/i }))

    await waitFor(() => expect(handleRegister).toHaveBeenCalledWith(
      'Study Student',
      'student@example.com',
      'FixturePass1!'
    ))
  })
})
