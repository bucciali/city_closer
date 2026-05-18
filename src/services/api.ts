/**
 * Vite dev proxy:
 *   /api/*      → localhost:8080  (Go gps_service)
 *   /routing/*  → localhost:8000  (Python route_service)
 */

import type { Kiosk, POI, LatLng, Route, RoutePoint, SearchResult } from '../types'

const GO_API = '/api/v1'
const PY_API = '/routing/v1'

// ── HTTP ────────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 8_000

/**
 * fetch с жёстким таймаутом через AbortController.
 * Зависший бэкенд на киоске не должен означать вечный спиннер.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`Таймаут запроса (${timeoutMs} мс): ${url}`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function getJSON<T>(url: string, timeoutMs?: number): Promise<T> {
  const res = await fetchWithTimeout(url, {}, timeoutMs)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json() as Promise<T>
}

async function postJSON<T>(
  url: string,
  body: unknown,
  timeoutMs?: number,
): Promise<T> {
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    timeoutMs,
  )
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.detail ?? '' } catch { /* ignore */ }
    throw new Error(`HTTP ${res.status} ${url}${detail ? ` — ${detail}` : ''}`)
  }
  return res.json() as Promise<T>
}

// ── Backend DTOs ────────────────────────────────────────────────────────────

interface BackendKiosk {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  created_at: string
}

interface BackendPoint {
  point_id: string
  name: string
  description: string | null
  latitude: number
  longitude: number
  type_id: string
  created_by: string
  created_at: string
}

interface BackendSearchResult {
  id: string
  name: string
  type: 'kiosk' | 'poi'
  // backend will add lat/lng later — already supported optionally
  latitude?: number
  longitude?: number
  description?: string
}

interface RouteGeoJSON {
  type: 'Feature'
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  properties: {
    total_distance_meters: number
    total_distance_km?: number
    estimated_time_minutes?: number
    number_of_waypoints?: number
    algorithm?: string
    waypoints?: number[]
    processing_time_ms?: number
  }
}

// ── Adapters ────────────────────────────────────────────────────────────────

function toKiosk(b: BackendKiosk): Kiosk {
  return {
    id: b.id,
    name: b.name,
    description: b.description ?? '',
    position: { lat: b.latitude, lng: b.longitude },
  }
}

function toPOI(b: BackendPoint): POI {
  return {
    id: b.point_id,
    name: b.name,
    description: b.description ?? '',
    position: { lat: b.latitude, lng: b.longitude },
    // category/tags/distance will arrive once backend exposes them
  }
}

function toSearchResult(b: BackendSearchResult): SearchResult {
  return {
    id: b.id,
    name: b.name,
    type: b.type,
    description: b.description,
    position:
      b.latitude != null && b.longitude != null
        ? { lat: b.latitude, lng: b.longitude }
        : undefined,
  }
}

// ── Services ────────────────────────────────────────────────────────────────

export const kioskService = {
  getAll: async (): Promise<Kiosk[]> => {
    const wrap = await getJSON<{ kiosks: BackendKiosk[] }>(`${GO_API}/kiosks`)
    return (wrap.kiosks ?? []).map(toKiosk)
  },
  getById: async (id: string): Promise<Kiosk> => {
    const wrap = await getJSON<{ kiosk: BackendKiosk }>(`${GO_API}/kiosks/${id}`)
    return toKiosk(wrap.kiosk)
  },
}

export const poiService = {
  getNearby: async (lat: number, lng: number, radius = 1000): Promise<POI[]> => {
    const list = await getJSON<BackendPoint[]>(
      `${GO_API}/points/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
    )
    return list.map(toPOI)
  },
}

export const searchService = {
  query: async (q: string): Promise<SearchResult[]> => {
    const list = await getJSON<BackendSearchResult[]>(
      `${GO_API}/search?q=${encodeURIComponent(q)}`,
    )
    return list.map(toSearchResult)
  },
}

// ── POI image enrichment via Wikipedia ──────────────────────────────────────

const IMG_CACHE_KEY = 'gorod-ryadom-poi-images-v1'

function readImgCache(): Record<string, string | null> {
  try {
    return JSON.parse(localStorage.getItem(IMG_CACHE_KEY) ?? '{}')
  } catch { return {} }
}

function writeImgCache(c: Record<string, string | null>) {
  try { localStorage.setItem(IMG_CACHE_KEY, JSON.stringify(c)) } catch { /* ignore quota */ }
}

export async function fetchPOIImage(name: string): Promise<string | null> {
  const cache = readImgCache()
  if (name in cache) return cache[name]

  // Внешний запрос (Wikipedia) — короткий таймаут + негатив-кэш:
  // офлайн-киоск не должен висеть и долбить сеть на каждом рендере.
  let url: string | null = null
  try {
    const res = await fetchWithTimeout(
      `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      {},
      5_000,
    )
    if (res.ok) {
      const data = await res.json()
      url = data?.thumbnail?.source ?? null
    }
  } catch {
    url = null
  }
  cache[name] = url
  writeImgCache(cache)
  return url
}

export const routingService = {
  buildRoute: async (
    waypoints: LatLng[],
    points: RoutePoint[],
  ): Promise<Route> => {
    if (waypoints.length < 2) throw new Error('need at least 2 waypoints')
    // Маршрутизация по реальному графу — тяжёлый запрос, даём больше времени.
    const geo = await postJSON<RouteGeoJSON>(
      `${PY_API}/route`,
      { waypoints: waypoints.map((p) => ({ lat: p.lat, lng: p.lng })) },
      30_000,
    )
    const segment: LatLng[] = geo.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
    return {
      id: `route-${Date.now()}`,
      points,
      totalDistance: geo.properties.total_distance_meters,
      estimatedTime: geo.properties.estimated_time_minutes ?? 0,
      segments: [segment],
    }
  },
}
