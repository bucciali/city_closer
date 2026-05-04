import { useEffect, useState } from 'react'
import { searchService } from '../../services/api'
import type { SearchResult } from '../../types'
import styles from './Panel.module.css'

interface SearchTabProps {
  onKioskSelect: (id: string) => void
  onPOISelect: (id: string) => void
}

const DEBOUNCE_MS = 300

export function SearchTab({ onKioskSelect, onPOISelect }: SearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const r = await searchService.query(q)
        if (cancelled) return
        setResults(r)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Ошибка поиска')
        setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const kioskHits = results.filter((r) => r.type === 'kiosk')
  const poiHits = results.filter((r) => r.type === 'poi')
  const hasResults = results.length > 0

  return (
    <div className={styles.tabContent}>
      <div className={styles.searchInputWrap}>
        <span className={styles.searchIcon}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5"/>
            <line x1="13.5" y1="13.5" x2="17" y2="17"/>
          </svg>
        </span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Поиск мест, киосков..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => setQuery('')}>×</button>
        )}
      </div>

      {!query && (
        <p className={styles.hint}>Введите название места или достопримечательности</p>
      )}

      {query && loading && <p className={styles.hint}>Поиск…</p>}

      {query && !loading && error && <p className={styles.hint}>{error}</p>}

      {query && !loading && !error && !hasResults && (
        <p className={styles.hint}>Ничего не найдено по запросу «{query}»</p>
      )}

      {kioskHits.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Киоски</div>
          {kioskHits.map((k) => (
            <button key={`kiosk-${k.id}`} className={styles.resultRow} onClick={() => onKioskSelect(k.id)}>
              <span className={styles.resultIcon}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="13" height="13" rx="2.5"/>
                  <circle cx="9" cy="9" r="2.5"/>
                </svg>
              </span>
              <div className={styles.resultInfo}>
                <span className={styles.resultName}>{k.name}</span>
                {k.description && <span className={styles.resultSub}>{k.description}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {poiHits.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Места</div>
          {poiHits.map((p) => (
            <button key={`poi-${p.id}`} className={styles.resultRow} onClick={() => onPOISelect(p.id)}>
              <span className={styles.resultIcon}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="7" r="2.5"/>
                  <path d="M9 1.5C6.1 1.5 3.75 3.85 3.75 6.75c0 4.2 5.25 9.75 5.25 9.75s5.25-5.55 5.25-9.75C14.25 3.85 11.9 1.5 9 1.5z"/>
                </svg>
              </span>
              <div className={styles.resultInfo}>
                <span className={styles.resultName}>{p.name}</span>
                {p.description && <span className={styles.resultSub}>{p.description}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
