import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface OpticsParams {
  wavelength: number
  slitWidth: number
  slitSeparation: number
  screenDistance: number
}

const STORAGE_KEY = 'optics-compare-state'

function loadSaved(): { experiment: string; params: Partial<OpticsParams>; baseline: OpticsParams | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { experiment: 'double', params: {}, baseline: null }
    const s = JSON.parse(raw)
    return {
      experiment: typeof s.experiment === 'string' ? s.experiment : 'double',
      params: s.params && typeof s.params === 'object' ? s.params : {},
      baseline: s.baseline && typeof s.baseline === 'object' ? s.baseline : null,
    }
  } catch {
    return { experiment: 'double', params: {}, baseline: null }
  }
}

export const useOpticsStore = defineStore('optics', () => {
  const saved = loadSaved()
  const currentExperiment = ref(saved.experiment)
  const params = ref<OpticsParams>({ wavelength: 550, slitWidth: 50, slitSeparation: 200, screenDistance: 1000, ...saved.params })
  const intensityData = ref<number[]>([])
  const result = ref<{ fringe?: number; centralWidth?: number }>({})

  // 对照实验: 基准参数与其图样数据
  const baseline = ref<OpticsParams | null>(saved.baseline)
  const baselineData = ref<number[]>([])
  const baselineFringe = ref<number | null>(null)
  // 对照状态提示: '' 正常 | 'no-baseline' 无基准 | 'identical' 参数相同 | 'adjusting' 快速调整中
  const compareStatus = ref<'' | 'no-baseline' | 'identical' | 'adjusting'>('')
  const compareActive = computed(() => currentExperiment.value === 'double' && baseline.value !== null)

  let persistTimer: ReturnType<typeof setTimeout> | undefined
  let adjustTimer: ReturnType<typeof setTimeout> | undefined

  function persist() {
    clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          experiment: currentExperiment.value,
          params: params.value,
          baseline: baseline.value,
        }))
      } catch { /* 存储不可用时静默忽略 */ }
    }, 300)
  }

  function computeFor(p: OpticsParams, exp: string) {
    const lambda = p.wavelength * 1e-9
    const aM = p.slitWidth * 1e-6
    const dM = p.slitSeparation * 1e-6
    const LM = p.screenDistance * 1e-3
    const N = 800
    const data: number[] = []
    const xMax = 20e-3
    const out: { data: number[]; fringe?: number; centralWidth?: number } = { data }

    if (exp === 'double') {
      out.fringe = Math.round(lambda * LM / dM * 1e3 * 100) / 100
      for (let i = 0; i < N; i++) {
        const x = (i / N - 0.5) * xMax * 2
        const delta = Math.PI * dM * x / (lambda * LM)
        const beta = Math.PI * aM * x / (lambda * LM) || 1e-10
        const single = Math.sin(beta) / beta
        data.push(Math.max(0, Math.cos(delta) ** 2 * single ** 2))
      }
    } else if (exp === 'single') {
      out.centralWidth = Math.round(2 * lambda * LM / aM * 1e3 * 100) / 100
      for (let i = 0; i < N; i++) {
        const x = (i / N - 0.5) * xMax * 2
        const beta = Math.PI * aM * x / (lambda * LM) || 1e-10
        data.push(Math.max(0, (Math.sin(beta) / beta) ** 2))
      }
    } else { // newton
      const R = 1.0
      for (let i = 0; i < N; i++) {
        const r = (i / N) * 5e-3
        const path = r * r / (2 * R)
        const phi = 2 * Math.PI * path / lambda + Math.PI
        data.push(Math.max(0, 0.5 * (1 - Math.cos(phi))))
      }
    }
    return out
  }

  function paramsEqual(a: OpticsParams, b: OpticsParams) {
    return a.wavelength === b.wavelength && a.slitWidth === b.slitWidth &&
      a.slitSeparation === b.slitSeparation && a.screenDistance === b.screenDistance
  }

  function refreshCompareStatus() {
    if (!baseline.value) { compareStatus.value = 'no-baseline'; return }
    compareStatus.value = paramsEqual(params.value, baseline.value) ? 'identical' : ''
  }

  // 快速连续调整时防抖，避免提示与重绘抖动
  function noteAdjusting() {
    if (!compareActive.value) return
    compareStatus.value = 'adjusting'
    clearTimeout(adjustTimer)
    adjustTimer = setTimeout(refreshCompareStatus, 250)
  }

  function setExperiment(id: string) { currentExperiment.value = id; compute(); refreshCompareStatus() }

  function compute() {
    const out = computeFor(params.value, currentExperiment.value)
    intensityData.value = out.data
    result.value = { fringe: out.fringe, centralWidth: out.centralWidth }
    persist()
  }

  function setBaseline() {
    baseline.value = { ...params.value }
    const out = computeFor(baseline.value, 'double')
    baselineData.value = out.data
    baselineFringe.value = out.fringe ?? null
    refreshCompareStatus()
    persist()
  }

  function clearBaseline() {
    baseline.value = null
    baselineData.value = []
    baselineFringe.value = null
    refreshCompareStatus()
    persist()
  }

  // 刷新后恢复最近一次对照的基准数据
  if (baseline.value) {
    const out = computeFor(baseline.value, 'double')
    baselineData.value = out.data
    baselineFringe.value = out.fringe ?? null
  }
  refreshCompareStatus()

  return {
    currentExperiment, params, intensityData, result,
    baseline, baselineData, baselineFringe, compareStatus, compareActive,
    setExperiment, compute, setBaseline, clearBaseline, noteAdjusting,
  }
})
