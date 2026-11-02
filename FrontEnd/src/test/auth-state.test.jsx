import React from 'react' // eslint-disable-line no-unused-vars
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMock = vi.hoisted(() => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}))

vi.mock('../services/api', () => apiMock)

import { useAuth } from '../hooks/useAuth'

describe('authentication state hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('stores the access token and user after login', async () => {
    const user = { id: 'user-1', name: 'Student' }
    apiMock.authAPI.login.mockResolvedValue({
      data: { data: { user, accessToken: 'access-token-fixture' } },
    })
    const setIsLoggedIn = vi.fn()
    const setUser = vi.fn()
    const { result } = renderHook(() => useAuth(setIsLoggedIn, setUser))

    await act(async () => {
      await result.current.login('student@example.com', 'FixturePass1!')
    })

    expect(apiMock.authAPI.login).toHaveBeenCalledWith({ email: 'student@example.com', password: 'FixturePass1!' })
    expect(localStorage.getItem('accessToken')).toBe('access-token-fixture')
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(user)
    expect(setIsLoggedIn).toHaveBeenCalledWith(true)
    expect(setUser).toHaveBeenCalledWith(user)
  })

  it('clears local authentication state even when logout API fails', async () => {
    localStorage.setItem('accessToken', 'stale-token')
    localStorage.setItem('user', JSON.stringify({ id: 'user-1' }))
    apiMock.authAPI.logout.mockRejectedValue(new Error('network failure'))
    const setIsLoggedIn = vi.fn()
    const setUser = vi.fn()
    const { result } = renderHook(() => useAuth(setIsLoggedIn, setUser))

    await act(async () => {
      await result.current.logout()
    })

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(setIsLoggedIn).toHaveBeenCalledWith(false)
    expect(setUser).toHaveBeenCalledWith(null)
  })
})
