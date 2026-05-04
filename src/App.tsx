import { useEffect, useState } from 'react'
import { Header } from './components/Header/Header'
import { BottomPanel } from './components/BottomPanel/BottomPanel'
import { MapView } from './components/Map/MapView'
import { kioskService, poiService, routingService, fetchPOIImage } from './services/api'
import type { Kiosk, LatLng, POI, Route, RoutePoint } from './types'
import styles from './App.module.css'

type Tab = 'nearby' | 'route' | 'search'

const CURRENT_KIOSK_ID = import.meta.env.VITE_KIOSK_ID as string | undefined
const NEARBY_RADIUS_M = 1500

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('nearby')
  const [selectedKioskId, setSelectedKioskId] = useState<string | null>(null)
  const [selectedPOIId, setSelectedPOIId] = useState<string | null>(null)
  const [activeRoute, setActiveRoute] = useState<Route | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)

  const [kiosks, setKiosks] = useState<Kiosk[]>([])
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!CURRENT_KIOSK_ID) {
      setError('VITE_KIOSK_ID не задан в .env')
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const allKiosks = await kioskService.getAll()
        if (cancelled) return
        const me = allKiosks.find((k) => k.id === CURRENT_KIOSK_ID)
        if (!me) {
          setError(`Киоск ${CURRENT_KIOSK_ID} не найден на сервере`)
          setKiosks(allKiosks)
          setLoading(false)
          return
        }

        const nearbyPois = await poiService.getNearby(
          me.position.lat,
          me.position.lng,
          NEARBY_RADIUS_M,
        )
        if (cancelled) return

        const withDistance = nearbyPois.map((p) => ({
          ...p,
          distance: haversineMeters(me.position, p.position),
        }))

        setKiosks(allKiosks)
        setPois(withDistance)
        setLoading(false)

        // background enrichment — Wikipedia thumbnails (cached in localStorage)
        Promise.all(
          withDistance.map(async (p) => {
            const img = await fetchPOIImage(p.name)
            return img ? { ...p, imageUrl: img } : p
          }),
        ).then((enriched) => {
          if (!cancelled) setPois(enriched)
        })
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Ошибка загрузки данных')
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const currentKiosk = CURRENT_KIOSK_ID
    ? kiosks.find((k) => k.id === CURRENT_KIOSK_ID) ?? null
    : null

  async function handleBuildRoute(points: RoutePoint[]) {
    setIsBuilding(true)
    try {
      const waypoints = points.map((p) => p.position)
      const route = await routingService.buildRoute(waypoints, points)
      setActiveRoute(route)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось построить маршрут')
    } finally {
      setIsBuilding(false)
    }
  }

  function handleBuildRouteToPOI(poi: POI) {
    if (!currentKiosk) return
    const points: RoutePoint[] = [
      {
        kioskId: currentKiosk.id,
        kioskName: currentKiosk.name,
        position: currentKiosk.position,
        order: 0,
      },
      {
        kioskId: poi.id,
        kioskName: poi.name,
        position: poi.position,
        order: 1,
      },
    ]
    handleBuildRoute(points)
  }

  function handleClearRoute() {
    setActiveRoute(null)
  }

  if (loading) {
    return (
      <div className={styles.app}>
        <div className={styles.statusScreen}>Загрузка данных…</div>
      </div>
    )
  }

  if (error || !currentKiosk) {
    return (
      <div className={styles.app}>
        <div className={styles.statusScreen}>
          {error ?? 'Текущий киоск недоступен'}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <Header kioskName={currentKiosk.name} description={currentKiosk.description} />

      <div className={styles.mapArea}>
        <MapView
          kiosks={kiosks}
          pois={pois}
          currentKioskId={currentKiosk.id}
          activeRoute={activeRoute}
          selectedKioskId={selectedKioskId}
          onKioskClick={setSelectedKioskId}
          onPOIClick={setSelectedPOIId}
        />
      </div>

      <BottomPanel
        kiosks={kiosks}
        pois={pois}
        currentKioskId={currentKiosk.id}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedPOIId={selectedPOIId}
        onKioskSelect={(id) => { setSelectedKioskId(id); setActiveTab('nearby') }}
        onPOISelect={(id) => { setSelectedPOIId(id); setActiveTab('nearby') }}
        activeRoute={activeRoute}
        onBuildRoute={handleBuildRoute}
        onBuildRouteToPOI={handleBuildRouteToPOI}
        onClearRoute={handleClearRoute}
        isBuilding={isBuilding}
      />
    </div>
  )
}
