import type { ReactNode } from 'react'
import type { Kiosk, POI, Route, RoutePoint } from '../../types'
import { NearbyTab } from '../Panel/NearbyTab'
import { RouteTab } from '../Panel/RouteTab'
import { SearchTab } from '../Panel/SearchTab'
import styles from './BottomPanel.module.css'

type Tab = 'nearby' | 'route' | 'search'

interface BottomPanelProps {
  kiosks: Kiosk[]
  pois: POI[]
  currentKioskId: string
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  selectedPOIId: string | null
  onKioskSelect: (id: string) => void
  onPOISelect: (id: string) => void
  activeRoute: Route | null
  onBuildRoute: (points: RoutePoint[]) => void
  onBuildRouteToPOI: (poi: POI) => void
  onClearRoute: () => void
  isBuilding: boolean
}

const NearbyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="7.5" r="2.5"/>
    <path d="M9 1.5C6.1 1.5 3.75 3.85 3.75 6.75c0 4.2 5.25 9.75 5.25 9.75s5.25-5.55 5.25-9.75C14.25 3.85 11.9 1.5 9 1.5z"/>
  </svg>
)
const RouteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="3.5" cy="9" r="2"/>
    <circle cx="14.5" cy="9" r="2"/>
    <line x1="5.5" y1="9" x2="12.5" y2="9"/>
    <polyline points="10,6.5 13,9 10,11.5"/>
  </svg>
)
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="8.5" cy="8.5" r="5"/>
    <line x1="12.5" y1="12.5" x2="16" y2="16"/>
  </svg>
)

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'nearby', label: 'Рядом', icon: <NearbyIcon /> },
  { id: 'route', label: 'Маршрут', icon: <RouteIcon /> },
  { id: 'search', label: 'Поиск', icon: <SearchIcon /> },
]

export function BottomPanel({
  kiosks,
  pois,
  currentKioskId,
  activeTab,
  onTabChange,
  selectedPOIId,
  onKioskSelect,
  onPOISelect,
  activeRoute,
  onBuildRoute,
  onBuildRouteToPOI,
  onClearRoute,
  isBuilding,
}: BottomPanelProps) {
  return (
    <div className={styles.panel}>
      {/* Tab bar */}
      <nav className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            <span className={styles.tabIcon}>{t.icon}</span>
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Active route strip */}
      {activeRoute && (
        <div className={styles.routeStrip}>
          <span className={styles.routeStripIcon}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="2.5" cy="8" r="1.5"/><circle cx="13.5" cy="8" r="1.5"/><line x1="4" y1="8" x2="12" y2="8"/><polyline points="9.5,5.5 12,8 9.5,10.5"/>
            </svg>
          </span>
          <div className={styles.routeStripInfo}>
            <span className={styles.routeStripTitle}>Маршрут активен</span>
            <span className={styles.routeStripMeta}>
              {activeRoute.points.length} точки
              {activeRoute.totalDistance > 0 && ` · ${(activeRoute.totalDistance / 1000).toFixed(1)} км`}
              {activeRoute.estimatedTime > 0 ? ` · ~${activeRoute.estimatedTime} мин` : ' · расчёт...'}
            </span>
          </div>
          <button className={styles.routeStripClose} onClick={onClearRoute}>×</button>
        </div>
      )}

      {/* Tab content */}
      <div className={styles.content}>
        {activeTab === 'nearby' && (
          <NearbyTab
            pois={pois}
            selectedPOIId={selectedPOIId}
            onPOISelect={onPOISelect}
            onBuildRouteToPOI={onBuildRouteToPOI}
            isBuilding={isBuilding}
          />
        )}
        {activeTab === 'route' && (
          <RouteTab
            kiosks={kiosks}
            currentKioskId={currentKioskId}
            activeRoute={activeRoute}
            onBuildRoute={onBuildRoute}
            onClearRoute={onClearRoute}
            isBuilding={isBuilding}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab
            onKioskSelect={onKioskSelect}
            onPOISelect={onPOISelect}
          />
        )}
      </div>
    </div>
  )
}
