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
})
