import { useEffect, useState } from 'react'
import styles from './Header.module.css'

interface HeaderProps {
  kioskName: string
  description: string
}

export function Header({ kioskName, description }: HeaderProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <svg className={styles.logoIcon} width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <rect width="34" height="34" rx="4" fill="#C8102E"/>
          <rect x="8" y="8" width="5" height="18" fill="#fff"/>
          <rect x="15" y="13" width="4" height="13" fill="#fff"/>
          <rect x="21" y="18" width="4" height="8" fill="#fff"/>
        </svg>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>ГОРОД</span>
          <span className={styles.logoSub}>РЯДОМ</span>
        </div>
      </div>

      <div className={styles.kioskInfo}>
        <div className={styles.youAreHere}>
          <span className={styles.dot} />
          <span className={styles.kioskName}>{kioskName}</span>
        </div>
        <span className={styles.kioskDistrict}>{description ? `${description} · ` : ''}Вы здесь</span>
      </div>

      <div className={styles.timeBlock}>
        <span className={styles.time}>{timeStr}</span>
        <span className={styles.date}>{dateStr}</span>
      </div>
    </header>
  )
}
