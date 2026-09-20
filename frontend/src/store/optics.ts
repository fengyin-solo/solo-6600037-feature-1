import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export interface OpticsParams {
  wavelength: number
  slitWidth: number
  slitSeparation: number
  screenDistance: number
}

const STORAGE_KEY = 'optics-compare-v1'

const defaultParams = (): OpticsParams => ({ wavelength: 550, slitWidth: 50, slitSeparation: 200, screenDistance: 1000 })

export const useOpticsStore = defineStore('optics', () => {
  const currentExperiment = ref('double')
  const params = ref<OpticsParams>(defaultParams())
  const intensityData = ref<number[]>([])
  const result = ref<{ fringe?: number; centralWidth?: number }>({})

  // ---- 双缝干涉对照实验 ----
  const baseline = ref<OpticsParams | null>(null)
  const baselineIntensityData = ref<number[]>([])
  const baselineFringe = ref<number | null>(null)
  const notice = ref('')
  const adjusting = ref(false)
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  let adjustTimer: ReturnType<typeof setTimeout> | undefined

  // 刷新后恢复最近一次对照（基准 + 当前参数 + 实验类型）
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved.params) params.value = { ...defaultParams(), ...saved.params }
      if (typeof saved.currentExperiment === 'string') currentExperiment.value = saved.currentExperiment
      if (saved.baseline) baseline.value = { ...saved.baseline }
    }
  } catch { /* 本地数据损坏时忽略，使用默认值 */ }

  watch([params, currentExperiment, baseline], () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentExperiment: currentExperiment.value,
        params: params.value,
        baseline: baseline.value,
      }))
    } catch { /* 存储不可用时静默跳过 */ }
  }, { deep: true })

  // 双缝干涉（含单缝包络），与 compute 中保持同一套物理公式
  function doubleSlit(p: OpticsParams): { data: number[]; fringe: number } {
    const lambda = p.wavelength * 1e-9
    const aM = p.slitWidth * 1e-6
    const dM = p.slitSeparation * 1e-6
    const LM = p.screenDistance * 1e-3
    const N = 800
    const xMax = 20e-3
    const data: number[] = []
    for (let i = 0; i < N; i++) {
      const x = (i / N - 0.5) * xMax * 2
      const delta = Math.PI * dM * x / (lambda * LM)
      const beta = Math.PI * aM * x / (lambda * LM) || 1e-10
      const single = Math.sin(beta) / beta
      data.push(Math.max(0, Math.cos(delta) ** 2 * single ** 2))
    }
    return { data, fringe: Math.round(lambda * LM / dM * 1e3 * 100) / 100 }
  }

  function recomputeBaseline() {
    if (!baseline.value) {
      baselineIntensityData.value = []
      baselineFringe.value = null
      return
    }
    const { data, fringe } = doubleSlit(baseline.value)
    baselineIntensityData.value = data
    baselineFringe.value = fringe
  }

  const isIdenticalToBaseline = computed(() =>
    !!baseline.value &&
    baseline.value.wavelength === params.value.wavelength &&
    baseline.value.slitWidth === params.value.slitWidth &&
    baseline.value.slitSeparation === params.value.slitSeparation &&
    baseline.value.screenDistance === params.value.screenDistance
  )

  function showNotice(msg: string) {
    notice.value = msg
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => { notice.value = '' }, 2000)
  }

  function setBaseline() {
    baseline.value = { ...params.value }
    recomputeBaseline()
    showNotice('已固定当前参数为基准')
  }

  function clearBaseline() {
    baseline.value = null
    recomputeBaseline()
    showNotice('已清除基准')
  }

  function setExperiment(id: string) { currentExperiment.value = id; compute() }

  function compute() {
    const { wavelength: lam, slitWidth: a, slitSeparation: d, screenDistance: L } = params.value
    const lambda = lam * 1e-9
    const aM = a * 1e-6
    const LM = L * 1e-3
    const N = 800
    const data: number[] = []

    if (currentExperiment.value === 'double') {
      const r = doubleSlit(params.value)
      result.value.fringe = r.fringe
      intensityData.value = r.data
      return
    } else if (currentExperiment.value === 'single') {
      result.value.centralWidth = Math.round(2 * lambda * LM / aM * 1e3 * 100) / 100
      const xMax = 20e-3
      for (let i = 0; i < N; i++) {
        const x = (i / N - 0.5) * xMax * 2
        const beta = Math.PI * aM * x / (lambda * LM) || 1e-10
        const intensity = (Math.sin(beta) / beta) ** 2
        data.push(Math.max(0, intensity))
      }
    } else { // newton
      const R = 1.0
      for (let i = 0; i < N; i++) {
        const r = (i / N) * 5e-3
        const path = r * r / (2 * R)
        const phi = 2 * Math.PI * path / lambda + Math.PI
        const intensity = 0.5 * (1 - Math.cos(phi))
        data.push(Math.max(0, intensity))
      }
    }

    intensityData.value = data
  }

  // 滑杆输入：标记“调整中”（快速连续调整时给出克制反馈），并重新计算
  function onParamInput() {
    adjusting.value = true
    clearTimeout(adjustTimer)
    adjustTimer = setTimeout(() => { adjusting.value = false }, 300)
    compute()
  }

  // 若从本地恢复了基准，补算其强度数据
  recomputeBaseline()

  return {
    currentExperiment, params, intensityData, result,
    baseline, baselineIntensityData, baselineFringe, notice, adjusting, isIdenticalToBaseline,
    setBaseline, clearBaseline, setExperiment, compute, onParamInput,
  }
})
