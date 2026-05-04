export interface LatLng {
  lat: number
  lng: number
}

export interface Kiosk {
  id: string
  name: string
  position: LatLng
  description: string
}

export interface POI {
  id: string
  name: string
  position: LatLng
  description: string
  category?: POICategory
  distance?: number
  imageUrl?: string
  tags?: string[]
}

export type POICategory =
  | 'shop'
  | 'transport'
  | 'cafe'
  | 'pharmacy'
  | 'park'
  | 'other'

export interface RoutePoint {
  kioskId: string
  kioskName: string
  position: LatLng
  order: number
}

export interface Route {
  id: string
  points: RoutePoint[]
  totalDistance: number
  estimatedTime: number
  segments?: LatLng[][]
}

export interface SearchResult {
  id: string
  name: string
  type: 'kiosk' | 'poi'
  position?: LatLng
  description?: string
}
