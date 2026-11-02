import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from '../utils/apiError'

describe('API error presentation', () => {
  it('prefers the centralized backend error message', () => {
    expect(getApiErrorMessage({
      response: { data: { error: { message: 'Database temporarily unavailable.' } } },
    })).toBe('Database temporarily unavailable.')
  })

  it('provides a local network diagnostic without exposing request details', () => {
    expect(getApiErrorMessage({ code: 'ERR_NETWORK' })).toContain('Cannot reach the server.')
  })

  it('falls back when the error has no safe user-facing message', () => {
    expect(getApiErrorMessage({ message: 'Request failed with status code 500' }, 'Try again.'))
      .toBe('Try again.')
  })
})
