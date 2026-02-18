import { describe, it, expect } from 'vitest'
import { aggregateSelectedSchoolUpdates, type SummaryUpdateRecord } from '../shared/summaryAggregation'

const fixtureUpdates: SummaryUpdateRecord[] = [
  { schoolId: 's1', updateId: 'a-1', at: 100 },
  { schoolId: 's1', updateId: 'a-1', at: 100 }, // duplicate
  { schoolId: 's1', updateId: 'a-2', at: 200 },
  { schoolId: 's2', updateId: 'b-1', at: 150 },
  { schoolId: 's3', updateId: 'c-1', at: 180 }, // unselected in tests
]

describe('summary aggregation', () => {
  it('aggregates only selected schools', () => {
    const result = aggregateSelectedSchoolUpdates({
      selectedSchoolIds: ['s1', 's2'],
      updates: fixtureUpdates,
      windowStart: 0,
      windowEnd: 1_000,
    })

    expect(result.selectedSchoolCount).toBe(2)
    expect(result.updatedSchoolCount).toBe(2)
    expect(result.missedSchoolsCount).toBe(0)
    expect(result.missedSchoolsMessage).toBeNull()
    expect(result.totalRelevantUpdates).toBe(3)
    expect(result.updateCountsBySchool).toEqual({
      s1: 2,
      s2: 1,
    })
  })

  it('respects inclusive window boundaries', () => {
    const result = aggregateSelectedSchoolUpdates({
      selectedSchoolIds: ['s1', 's2'],
      updates: fixtureUpdates,
      windowStart: 100,
      windowEnd: 150,
    })

    expect(result.totalRelevantUpdates).toBe(2)
    expect(result.missedSchoolsCount).toBe(0)
    expect(result.missedSchoolsMessage).toBeNull()
    expect(result.updateCountsBySchool).toEqual({
      s1: 1,
      s2: 1,
    })
  })

  it('returns deterministic counts on repeated runs with same fixture data', () => {
    const first = aggregateSelectedSchoolUpdates({
      selectedSchoolIds: ['s1', 's2'],
      updates: fixtureUpdates,
      windowStart: 0,
      windowEnd: 1_000,
    })
    const second = aggregateSelectedSchoolUpdates({
      selectedSchoolIds: ['s1', 's2'],
      updates: fixtureUpdates,
      windowStart: 0,
      windowEnd: 1_000,
    })

    expect(second).toEqual(first)
  })

  it('computes missedSchoolsCount for mixed update/no-update scenarios', () => {
    const result = aggregateSelectedSchoolUpdates({
      selectedSchoolIds: ['s1', 's2', 's4'],
      updates: fixtureUpdates,
      windowStart: 0,
      windowEnd: 1_000,
    })

    expect(result.selectedSchoolCount).toBe(3)
    expect(result.updatedSchoolCount).toBe(2)
    expect(result.missedSchoolsCount).toBe(1)
    expect(result.missedSchoolsMessage).toBe('1 selected school had no updates in this window.')
  })

  it('keeps missed-school messaging redacted (count-only, no school names)', () => {
    const result = aggregateSelectedSchoolUpdates({
      selectedSchoolIds: ['Alpha Primary School', 'Beta Primary School'],
      updates: [
        { schoolId: 'Alpha Primary School', updateId: 'alpha-1', at: 101 },
      ],
      windowStart: 0,
      windowEnd: 1_000,
    })

    expect(result.missedSchoolsCount).toBe(1)
    expect(result.missedSchoolsMessage).toBe('1 selected school had no updates in this window.')
    expect(result.missedSchoolsMessage).not.toContain('Alpha Primary School')
    expect(result.missedSchoolsMessage).not.toContain('Beta Primary School')
  })

  it('uses pluralized redacted message when multiple selected schools are missed', () => {
    const result = aggregateSelectedSchoolUpdates({
      selectedSchoolIds: ['Gamma Primary School', 'Delta Primary School', 'Epsilon Primary School'],
      updates: [{ schoolId: 'Gamma Primary School', updateId: 'g-1', at: 101 }],
      windowStart: 0,
      windowEnd: 1_000,
    })

    expect(result.missedSchoolsCount).toBe(2)
    expect(result.missedSchoolsMessage).toBe('2 selected schools had no updates in this window.')
    expect(result.missedSchoolsMessage).not.toContain('Gamma Primary School')
    expect(result.missedSchoolsMessage).not.toContain('Delta Primary School')
    expect(result.missedSchoolsMessage).not.toContain('Epsilon Primary School')
  })
})
