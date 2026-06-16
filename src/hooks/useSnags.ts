'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Snag } from '@/types'

interface UseSnagOptions {
  projectId?: string
  unitId?: string
  status?: string
}

export function useSnags(options: UseSnagOptions = {}) {
  const [snags, setSnags] = useState<Snag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSnags = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.projectId) params.set('project_id', options.projectId)
      if (options.unitId) params.set('unit_id', options.unitId)
      if (options.status) params.set('status', options.status)

      const res = await fetch(`/api/snags?${params}`)
      if (!res.ok) throw new Error('Failed to fetch snags')
      const data = await res.json()
      setSnags(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [options.projectId, options.unitId, options.status])

  useEffect(() => {
    fetchSnags()
  }, [fetchSnags])

  return { snags, loading, error, refetch: fetchSnags }
}
