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
  mockEq.mockResolvedValue({ data: null, error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
})

describe('toggleChecklistTaskAction', () => {
  it('returns error for invalid taskId (not a UUID)', async () => {
    const { toggleChecklistTaskAction } = await import('@/lib/actions/checklist')

    const formData = new FormData()
    formData.set('taskId', 'not-a-uuid')
    formData.set('projectId', '123e4567-e89b-12d3-a456-426614174001')
    formData.set('completed', 'true')

    const result = await toggleChecklistTaskAction(formData)

    expect(result).toHaveProperty('error')
    expect(result.error).toBeTruthy()
  })

  it('toggles task to Completado with completed_at', async () => {
    const { toggleChecklistTaskAction } = await import('@/lib/actions/checklist')

    const formData = new FormData()
    formData.set('taskId', '123e4567-e89b-12d3-a456-426614174000')
    formData.set('projectId', '123e4567-e89b-12d3-a456-426614174001')
    formData.set('completed', 'true')

    const result = await toggleChecklistTaskAction(formData)

    expect(result).toEqual({})
    expect(mockFrom).toHaveBeenCalledWith('checklist_tasks')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Completado', completed_at: expect.any(String) })
    )
  })

  it('toggles task to Pendiente with null completed_at', async () => {
    const { toggleChecklistTaskAction } = await import('@/lib/actions/checklist')

    const formData = new FormData()
    formData.set('taskId', '123e4567-e89b-12d3-a456-426614174000')
    formData.set('projectId', '123e4567-e89b-12d3-a456-426614174001')
    formData.set('completed', 'false')

    const result = await toggleChecklistTaskAction(formData)

    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'Pendiente', completed_at: null })
  })
})
