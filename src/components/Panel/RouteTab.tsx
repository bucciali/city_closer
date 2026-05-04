import { useState } from 'react'
import type { Kiosk, Route, RoutePoint } from '../../types'
import styles from './Panel.module.css'

interface RouteTabProps {
  kiosks: Kiosk[]
  currentKioskId: string
  activeRoute: Route | null
  onBuildRoute: (points: RoutePoint[]) => void
  onClearRoute: () => void
  isBuilding: boolean
}

export function RouteTab({
  kiosks,
  currentKioskId,
  activeRoute,
  onBuildRoute,
  onClearRoute,
  isBuilding,
}: RouteTabProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const otherKiosks = kiosks.filter((k) => k.id !== currentKioskId)
  const currentKiosk = kiosks.find((k) => k.id === currentKioskId)

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleBuild() {
    if (selectedIds.length === 0) return
    const allIds = [currentKioskId, ...selectedIds]
    const points: RoutePoint[] = allIds.map((id, i) => {
      const k = kiosks.find((k) => k.id === id)!
      return { kioskId: id, kioskName: k.name, position: k.position, order: i }
    })
    onBuildRoute(points)
  }

  function handleClear() {
    setSelectedIds([])
    onClearRoute()
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.routeStartBlock}>
        <div className={styles.routeStepDot} data-type="start" />
        <div className={styles.routeStepInfo}>
          <span className={styles.routeStepLabel}>Начало маршрута</span>
          <span className={styles.routeStepName}>{currentKiosk?.name ?? '—'}</span>
          <span className={styles.routeStepSub}>Вы здесь</span>
        </div>
      </div>

      <div className={styles.routeDivider} />

      <div className={styles.sectionLabel}>Добавить точки маршрута</div>
      <div className={styles.kioskPickerList}>
        {otherKiosks.map((k) => {
          const selected = selectedIds.includes(k.id)
          const order = selectedIds.indexOf(k.id)
          return (
            <button
              key={k.id}
              className={`${styles.kioskPickerItem} ${selected ? styles.kioskPickerItemSelected : ''}`}
              onClick={() => toggle(k.id)}
            >
              <div className={styles.kioskPickerCheck}>
                {selected ? (
                  <span className={styles.orderBadge}>{order + 1}</span>
                ) : (
                  <span className={styles.unchecked} />
                )}
              </div>
              <div className={styles.kioskPickerInfo}>
                <span className={styles.kioskPickerName}>{k.name}</span>
                <span className={styles.kioskPickerSub}>{k.description}</span>
              </div>
              <span className={styles.kioskPickerIcon}>›</span>
            </button>
          )
        })}
      </div>

      <div className={styles.routeActions}>
        <button
          className={styles.buildBtn}
          disabled={selectedIds.length === 0 || isBuilding}
          onClick={handleBuild}
        >
          {isBuilding ? 'Строим...' : `Построить маршрут${selectedIds.length > 0 ? ` (${selectedIds.length + 1})` : ''}`}
        </button>

        {activeRoute && !isBuilding && (
          <div className={styles.routeStats}>
            <div className={styles.routeStat}>
              <span className={styles.routeStatLabel}>Дистанция</span>
              <span className={styles.routeStatValue}>
                {activeRoute.totalDistance >= 1000
                  ? `${(activeRoute.totalDistance / 1000).toFixed(1)} км`
                  : `${Math.round(activeRoute.totalDistance)} м`}
              </span>
            </div>
            <div className={styles.routeStatDivider} />
            <div className={styles.routeStat}>
              <span className={styles.routeStatLabel}>Время</span>
              <span className={styles.routeStatValue}>
                ~{activeRoute.estimatedTime} мин
              </span>
            </div>
          </div>
        )}

        {selectedIds.length > 0 && (
          <button className={styles.clearBtn2} onClick={handleClear}>
            Очистить
          </button>
        )}
      </div>

      <p className={styles.routeNote}>Данные: OpenStreetMap</p>
    </div>
  )
}
