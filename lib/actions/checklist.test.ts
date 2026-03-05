import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock revalidatePath from next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase client
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockFrom,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Chain: from -> update -> eq -> returns { data: null, error: null }
  mockEq.mockResolvedValue({ data: null, error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
})

describe('updateChecklistTaskAction', () => {
  it('Test 1 (CHEC-03): returns error for invalid status "Hecho" — does not call supabase', async () => {
    const { updateChecklistTaskAction } = await import('@/lib/actions/checklist')

    const formData = new FormData()
    formData.set('taskId', '123e4567-e89b-12d3-a456-426614174000')
    formData.set('projectId', '123e4567-e89b-12d3-a456-426614174001')
    formData.set('status', 'Hecho')

    const result = await updateChecklistTaskAction(formData)

    expect(result).toHaveProperty('error')
    expect(result.error).toBeTruthy()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('Test 2 (CHEC-03): returns error for invalid taskId (not a UUID)', async () => {
    const { updateChecklistTaskAction } = await import('@/lib/actions/checklist')

    const formData = new FormData()
    formData.set('taskId', 'not-a-uuid')
    formData.set('projectId', '123e4567-e89b-12d3-a456-426614174001')
    formData.set('status', 'Completado')

    const result = await updateChecklistTaskAction(formData)

    expect(result).toHaveProperty('error')
    expect(result.error).toBeTruthy()
  })

  it('Test 3 (CHEC-03): valid taskId + projectId + status calls supabase and returns {}', async () => {
    const { updateChecklistTaskAction } = await import('@/lib/actions/checklist')

    const formData = new FormData()
    formData.set('taskId', '123e4567-e89b-12d3-a456-426614174000')
    formData.set('projectId', '123e4567-e89b-12d3-a456-426614174001')
    formData.set('status', 'Completado')

    const result = await updateChecklistTaskAction(formData)

    expect(result).toEqual({})
    expect(mockFrom).toHaveBeenCalledWith('checklist_tasks')
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'Completado' })
    expect(mockEq).toHaveBeenCalledWith('id', '123e4567-e89b-12d3-a456-426614174000')
  })

  it('Test 4 (CHEC-03): accepts partial patch — only status field required', async () => {
    const { updateChecklistTaskAction } = await import('@/lib/actions/checklist')

    const formData = new FormData()
    formData.set('taskId', '123e4567-e89b-12d3-a456-426614174000')
    formData.set('projectId', '123e4567-e89b-12d3-a456-426614174001')
    formData.set('status', 'En Proceso')
    // No assignee or due_date fields

    const result = await updateChecklistTaskAction(formData)

    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'En Proceso' })
  })
})
