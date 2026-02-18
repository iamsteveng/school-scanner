import { describe, it, expect } from 'vitest'
import { enforceCadence } from '../shared/cadencePolicy'

describe('cadence policy', () => {
  it('FREE + daily => ineligible(cadence_mismatch)', () => {
    const res = enforceCadence('FREE', 'daily')
    expect(res.status).toBe('ineligible')
    if (res.status === 'ineligible') {
      expect(res.reason).toBe('cadence_mismatch')
    }
  })

  it('FREE + weekly => eligible', () => {
    const res = enforceCadence('FREE', 'weekly')
    expect(res.status).toBe('eligible')
  })

  it('PREMIUM + weekly => ineligible(cadence_mismatch)', () => {
    const res = enforceCadence('PREMIUM', 'weekly')
    expect(res.status).toBe('ineligible')
    if (res.status === 'ineligible') {
      expect(res.reason).toBe('cadence_mismatch')
    }
  })

  it('PREMIUM + daily => eligible', () => {
    const res = enforceCadence('PREMIUM', 'daily')
    expect(res.status).toBe('eligible')
  })

  it('invalid plan => ineligible(invalid_plan)', () => {
    const res = enforceCadence('ENTERPRISE', 'daily')
    expect(res.status).toBe('ineligible')
    if (res.status === 'ineligible') {
      expect(res.reason).toBe('invalid_plan')
    }
  })
})
