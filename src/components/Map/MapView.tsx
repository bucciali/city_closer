import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import type { Kiosk, POI, POICategory, Route } from '../../types'
import { CATEGORY_ICONS, DEFAULT_POI_ICON } from '../../data/mockData'
import styles from './MapView.module.css'

// Fix default icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const currentKioskIcon = L.divIcon({
  className: '',
  html: `<div class="kiosk-marker kiosk-marker--current">
    <div class="kiosk-marker__pulse"></div>
    <div class="kiosk-marker__dot"></div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

const kioskIcon = L.divIcon({
  className: '',
  html: `<div class="kiosk-marker">
    <div class="kiosk-marker__dot"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function poiIcon(category: POICategory | undefined) {
  const svg = (category && CATEGORY_ICONS[category]) || DEFAULT_POI_ICON
  return L.divIcon({
    className: '',
    html: `<div class="poi-marker">${svg}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

interface FlyToProps {
  center: [number, number]
}
function FlyTo({ center }: FlyToProps) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 1.2 })
  }, [center, map])
  return null
}

function MapReady() {
  const map = useMap()
  useEffect(() => {
    // Force tile load after container is sized
    setTimeout(() => { map.invalidateSize() }, 100)
  }, [map])
  return null
}

interface MapViewProps {
  kiosks: Kiosk[]
  pois: POI[]
  currentKioskId: string
  activeRoute: Route | null
  selectedKioskId: string | null
  onKioskClick: (id: string) => void
  onPOIClick: (id: string) => void
}

export function MapView({
  kiosks,
  pois,
  currentKioskId,
  activeRoute,
  selectedKioskId,
  onKioskClick,
  onPOIClick,
}: MapViewProps) {
  const currentKiosk = kiosks.find((k) => k.id === currentKioskId)
  const center: [number, number] = currentKiosk
    ? [currentKiosk.position.lat, currentKiosk.position.lng]
    : [55.7539, 37.6208]

  const focusKiosk = kiosks.find((k) => k.id === selectedKioskId)
  const flyTarget: [number, number] = focusKiosk
    ? [focusKiosk.position.lat, focusKiosk.position.lng]
    : center

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={center}
        zoom={15}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <MapReady />
        {selectedKioskId && <FlyTo center={flyTarget} />}

        {/* Kiosk markers */}
        {kiosks.map((kiosk) => (
          <Marker
            key={kiosk.id}
            position={[kiosk.position.lat, kiosk.position.lng]}
            icon={kiosk.id === currentKioskId ? currentKioskIcon : kioskIcon}
            eventHandlers={{ click: () => onKioskClick(kiosk.id) }}
          >
            <Popup className={styles.popup}>
              <strong>{kiosk.name}</strong>
              {kiosk.description && (
                <>
                  <br />
                  <span>{kiosk.description}</span>
                </>
              )}
            </Popup>
          </Marker>
        ))}

        {/* POI markers */}
        {pois.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.position.lat, poi.position.lng]}
            icon={poiIcon(poi.category)}
            eventHandlers={{ click: () => onPOIClick(poi.id) }}
          >
            <Popup className={styles.popup}>
              <strong>{poi.name}</strong>
              <br />
              <span>{poi.description}</span>
            </Popup>
          </Marker>
        ))}

        {/* Active route */}
        {activeRoute?.segments?.map((segment, i) => (
          <Polyline
            key={i}
            positions={segment.map((p) => [p.lat, p.lng])}
            color="var(--accent)"
            weight={4}
            opacity={0.85}
            dashArray="8 4"
          />
        ))}
      </MapContainer>

      {/* OSM attribution */}
      <div className={styles.attribution}>
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
      </div>
    </div>
  )
}
