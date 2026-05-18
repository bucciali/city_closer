import { useEffect, useRef, useState } from 'react'
import type { POI } from '../../types'
import { CATEGORY_LABELS, CATEGORY_ICONS, DEFAULT_POI_ICON } from '../../data/mockData'
import styles from './Panel.module.css'

type FilterCategory = POI['category'] | 'all'

interface NearbyTabProps {
  pois: POI[]
  selectedPOIId: string | null
  onPOISelect: (id: string) => void
  onBuildRouteToPOI: (poi: POI) => void
  isBuilding: boolean
}

const FILTERS: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: 'Всё' },
  { value: 'shop', label: 'Магазины' },
  { value: 'cafe', label: 'Кафе' },
  { value: 'park', label: 'Парки' },
  { value: 'transport', label: 'Транспорт' },
  { value: 'pharmacy', label: 'Аптеки' },
  { value: 'other', label: 'Другое' },
]

/**
 * Картинка POI с фолбэком на иконку категории.
 * Если URL битый или заблокирован (офлайн-киоск) — onError → иконка.
 */
function PoiThumb({ src, iconSvg }: { src?: string; iconSvg: string }) {
  const [failed, setFailed] = useState(false)
  // Новый src (фон-обогащение / рефреш данных) — сбрасываем флаг,
  // иначе залипший failed навсегда подменяет валидную картинку иконкой.
  useEffect(() => {
    setFailed(false)
  }, [src])
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    )
  }
  return <span dangerouslySetInnerHTML={{ __html: iconSvg }} />
}

export function NearbyTab({
  pois,
  selectedPOIId,
  onPOISelect,
  onBuildRouteToPOI,
  isBuilding,
}: NearbyTabProps) {
  const [filter, setFilter] = useState<FilterCategory>('all')
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())

  const filtered = filter === 'all' ? pois : pois.filter((p) => p.category === filter)
  const sorted = [...filtered].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))

  useEffect(() => {
    if (!selectedPOIId) return
    const poi = pois.find((p) => p.id === selectedPOIId)
    if (!poi) return

    // если активный фильтр прячет POI — снимаем, ждём пока перерендерится
    if (filter !== 'all' && poi.category !== filter) {
      setFilter('all')
      return
    }

    const el = cardRefs.current.get(selectedPOIId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selectedPOIId, filter, pois])

  return (
    <div className={styles.tabContent}>
      <div className={styles.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`${styles.filterChip} ${filter === f.value ? styles.filterChipActive : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.poiList}>
        {sorted.map((poi) => {
          const iconSvg = (poi.category && CATEGORY_ICONS[poi.category]) || DEFAULT_POI_ICON
          const isActive = selectedPOIId === poi.id
          return (
            <article
              key={poi.id}
              ref={(el) => {
                if (el) cardRefs.current.set(poi.id, el)
                else cardRefs.current.delete(poi.id)
              }}
              className={`${styles.poiCard} ${isActive ? styles.poiCardActive : ''}`}
            >
              <button
                type="button"
                className={styles.poiCardMain}
                onClick={() => onPOISelect(poi.id)}
              >
                <div className={styles.poiImage}>
                  <PoiThumb src={poi.imageUrl} iconSvg={iconSvg} />
                </div>
                <div className={styles.poiBody}>
                  <div className={styles.poiName}>{poi.name}</div>
                  {poi.description && <div className={styles.poiDesc}>{poi.description}</div>}
                  <div className={styles.poiMeta}>
                    {poi.category && (
                      <span className={styles.categoryTag}>{CATEGORY_LABELS[poi.category]}</span>
                    )}
                    {poi.distance != null && (
                      <span className={styles.distance}>
                        {poi.distance < 1000
                          ? `${Math.round(poi.distance)} м`
                          : `${(poi.distance / 1000).toFixed(1)} км`}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                className={styles.poiRouteBtn}
                disabled={isBuilding}
                onClick={() => onBuildRouteToPOI(poi)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="2.5" cy="8" r="1.5" />
                  <circle cx="13.5" cy="8" r="1.5" />
                  <line x1="4" y1="8" x2="12" y2="8" />
                  <polyline points="9.5,5.5 12,8 9.5,10.5" />
                </svg>
                <span>{isBuilding ? 'Строим…' : 'Построить маршрут'}</span>
              </button>
            </article>
          )
        })}
      </div>

      {sorted.length === 0 && (
        <p className={styles.hint}>Нет мест в этой категории поблизости</p>
      )}
    </div>
  )
}
