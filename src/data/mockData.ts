import type { POICategory } from '../types'

export const CATEGORY_LABELS: Record<POICategory, string> = {
  shop: 'Магазин',
  transport: 'Транспорт',
  cafe: 'Кафе',
  pharmacy: 'Аптека',
  park: 'Парк',
  other: 'Место',
}

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'

export const CATEGORY_ICONS: Record<POICategory, string> = {
  shop: `<svg viewBox="0 0 24 24" ${stroke}><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
  transport: `<svg viewBox="0 0 24 24" ${stroke}><rect x="6" y="4" width="12" height="13" rx="2"/><path d="M6 13h12"/><circle cx="9" cy="15.5" r="0.7" fill="currentColor" stroke="none"/><circle cx="15" cy="15.5" r="0.7" fill="currentColor" stroke="none"/><path d="M9 17l-1.5 3M15 17l1.5 3"/></svg>`,
  cafe: `<svg viewBox="0 0 24 24" ${stroke}><path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9h2a2 2 0 0 1 0 4h-2"/><path d="M8 5v-1M11 5v-1"/></svg>`,
  pharmacy: `<svg viewBox="0 0 24 24" ${stroke}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/></svg>`,
  park: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 4l5 8h-3l3 5H7l3-5H7z"/><path d="M12 17v3"/></svg>`,
  other: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="10" r="3"/><path d="M12 13v8"/></svg>`,
}

export const DEFAULT_POI_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="10" y="10" width="4" height="4"/></svg>`
