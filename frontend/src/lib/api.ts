import { authStore } from '../stores/AuthStore'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authStore.session?.access_token
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Type mirrors ──────────────────────────────────────────────────────────────

export interface DiagramSummary {
  id:         string
  name:       string
  isPublic:   boolean
  forkCount:  number
  createdAt:  string
  updatedAt:  string
}

export interface DiagramResponse extends DiagramSummary {
  topology:   unknown
  shareToken: string | null
}

export interface DiagramListResponse {
  items:    DiagramSummary[]
  total:    number
  page:     number
  pageSize: number
}

export interface ShareResponse {
  shareToken: string
  shareUrl:   string
  isPublic:   boolean
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  diagrams: {
    list: (page = 1) =>
      request<DiagramListResponse>(`/api/v1/diagrams?page=${page}`),

    get: (id: string) =>
      request<DiagramResponse>(`/api/v1/diagrams/${id}`),

    create: (name: string, topology: unknown) =>
      request<DiagramResponse>('/api/v1/diagrams', {
        method: 'POST',
        body:   JSON.stringify({ name, topology }),
      }),

    update: (id: string, name: string, topology: unknown) =>
      request<DiagramResponse>(`/api/v1/diagrams/${id}`, {
        method: 'PUT',
        body:   JSON.stringify({ name, topology }),
      }),

    delete: (id: string) =>
      request<void>(`/api/v1/diagrams/${id}`, { method: 'DELETE' }),

    share: (id: string) =>
      request<ShareResponse>(`/api/v1/diagrams/${id}/share`, { method: 'POST' }),

    unshare: (id: string) =>
      request<void>(`/api/v1/diagrams/${id}/share`, { method: 'DELETE' }),
  },

  shared: {
    get: (token: string) =>
      request<DiagramResponse>(`/api/v1/shared/${token}`),

    fork: (token: string) =>
      request<{ diagramId: string; name: string }>(`/api/v1/shared/${token}/fork`, { method: 'POST' }),
  },
}
