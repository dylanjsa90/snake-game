const API_BASE = 'http://localhost:8000/api/v1'

export const SNAKE_GAME = 'snake'

export type AuthUser = { id: number; email: string; username: string }
export type GameScore = { id: number; game: string; score: number; created_at: string }
export type LeaderboardEntry = {
  rank: number
  username: string
  score: number
  achieved_at: string
}
export type LeaderboardPeriod = 'all-time' | 'daily' | 'monthly'

const defaultHeaders = {
  'Content-Type': 'spplication/json'
}
const fetcher = async (url: string, init: RequestInit) => {
  const token = localStorage.getItem("token");
  const headers = {
    ...defaultHeaders,
    ...(init?.headers ?? {}),
    ...(token ? {
        'Authorization': `Bearer ${token}`
      } : {}),
  }

  return fetch(url, {
    ...init,
    headers, 
  })
}


export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function throwApiError(res: Response): Promise<never> {
  let detail = res.statusText
  try {
    const body = await res.json()
    if (body?.detail) {
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    }
  } catch {
    // response had no JSON body; fall back to statusText
  }
  throw new ApiError(res.status, detail)
}

async function register(input: {
  email: string
  username: string
  password: string
}): Promise<AuthUser> {
  const res = await fetcher(`${API_BASE}/users/`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!res.ok) await throwApiError(res)
  return res.json()
}

// OAuth2 password flow: form-encoded body, email is sent as `username`.
async function login(input: { email: string; password: string }): Promise<string> {
  const res = await fetcher(`${API_BASE}/login/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: input.email, password: input.password }),
  })
  if (!res.ok) await throwApiError(res)
  const data = await res.json()
  return data.access_token as string
}

async function getMe(token: string): Promise<AuthUser> {
  const res = await fetcher(`${API_BASE}/login/test-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) await throwApiError(res)
  return res.json()
}

async function submitScore(formData: { game: string; score: number }): Promise<GameScore> {
  const res = await fetcher(`${API_BASE}/scores/`, {
    method: 'POST',
    // user_id is required by the backend schema even though it derives the
    // user from the bearer token.
    body: JSON.stringify({...formData }),
  })
  if (!res.ok) await throwApiError(res)
  return res.json()
}

async function getLeaderboard(
  game: string,
  period: LeaderboardPeriod,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/scores/leaderboard/${game}/${period}?limit=${limit}`)
  if (!res.ok) await throwApiError(res)
  return res.json()
}

export const fetchService = {
  register,
  login,
  getMe,
  submitScore,
  getLeaderboard,
}
