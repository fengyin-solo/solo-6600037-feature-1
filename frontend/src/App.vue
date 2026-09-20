<template>
  <div class="min-h-screen bg-slate-900 text-slate-200">
    <header class="border-b border-slate-700 px-6 py-4">
      <h1 class="text-2xl font-bold text-cyan-400">光学干涉衍射仿真实验台</h1>
      <p class="text-sm text-slate-500 mt-1">双缝干涉 · 单缝衍射 · 牛顿环 · 波长调节 · 光强热力图</p>
    </header>
    <div class="flex flex-col lg:flex-row gap-4 p-4">
      <div class="lg:w-1/4 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">实验类型</h3>
          <div class="space-y-1">
            <button v-for="exp in experiments" :key="exp.id" @click="store.setExperiment(exp.id)"
              :class="['w-full text-left p-2 rounded border text-sm transition-all', store.currentExperiment === exp.id ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400' : 'border-slate-700 text-slate-300 hover:border-slate-500']">
              {{ exp.name }}
            </button>
          </div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-4">
          <h3 class="text-sm font-bold text-slate-400">参数调节</h3>
          <div>
            <label class="text-xs text-slate-500">波长 λ = {{ store.params.wavelength }} nm</label>
            <input type="range" min="380" max="780" step="5" v-model.number="store.params.wavelength" @input="store.onParamInput()" class="w-full accent-cyan-500" />
            <div class="flex justify-between text-xs mt-0.5">
              <span style="color:#8b5cf6">380</span><span style="color:#06b6d4">500</span><span style="color:#22c55e">550</span><span style="color:#eab308">600</span><span style="color:#dc2626">780</span>
            </div>
          </div>
          <div v-if="store.currentExperiment !== 'newton'">
            <label class="text-xs text-slate-500">缝宽/间距 d = {{ store.params.slitWidth }} μm</label>
            <input type="range" min="10" max="200" step="5" v-model.number="store.params.slitWidth" @input="store.onParamInput()" class="w-full accent-purple-500" />
          </div>
          <div v-if="store.currentExperiment === 'double'">
            <label class="text-xs text-slate-500">缝间距 D = {{ store.params.slitSeparation }} μm</label>
            <input type="range" min="50" max="500" step="10" v-model.number="store.params.slitSeparation" @input="store.onParamInput()" class="w-full accent-green-500" />
          </div>
          <div>
            <label class="text-xs text-slate-500">屏幕距离 L = {{ store.params.screenDistance }} mm</label>
            <input type="range" min="100" max="2000" step="50" v-model.number="store.params.screenDistance" @input="store.onParamInput()" class="w-full accent-orange-500" />
          </div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 text-sm">
          <h3 class="text-sm font-bold text-slate-400 mb-3">理论公式</h3>
          <div class="space-y-2 text-xs text-slate-400">
            <div v-if="store.currentExperiment === 'double'" class="bg-slate-900 rounded p-2">
              <div class="text-cyan-400 font-bold">双缝干涉</div>
              <div>亮纹: y = kλL/d (k=0,±1,±2...)</div>
              <div>条纹间距: Δy = λL/d</div>
              <div class="text-yellow-400 mt-1">Δy = {{ store.result.fringe?.toFixed(2) }} mm</div>
            </div>
            <div v-if="store.currentExperiment === 'single'" class="bg-slate-900 rounded p-2">
              <div class="text-cyan-400 font-bold">单缝衍射</div>
              <div>暗纹: a·sinθ = kλ</div>
              <div>中央亮纹宽: 2λL/a</div>
              <div class="text-yellow-400 mt-1">中央宽 = {{ store.result.centralWidth?.toFixed(2) }} mm</div>
            </div>
            <div v-if="store.currentExperiment === 'newton'" class="bg-slate-900 rounded p-2">
              <div class="text-cyan-400 font-bold">牛顿环</div>
              <div>暗环半径: r = √(nλR)</div>
              <div>R: 曲率半径</div>
            </div>
          </div>
        </div>
      </div>
      <div class="lg:w-3/4 space-y-4">
        <div v-if="store.currentExperiment === 'double'" class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-400">对照实验（双缝干涉）</h3>
            <span v-show="store.adjusting" class="text-xs text-cyan-400 animate-pulse">调整中…</span>
          </div>
          <div v-if="!store.baseline" class="flex items-center justify-between gap-3">
            <p class="text-xs text-slate-500">尚未固定基准参数。固定一组基准后，调整波长或缝间距即可并排对照两组条纹与光强曲线。</p>
            <button @click="store.setBaseline()" class="shrink-0 px-3 py-1.5 text-xs rounded border border-cyan-600 text-cyan-400 hover:bg-cyan-900/40 transition-all">固定当前参数为基准</button>
          </div>
          <div v-else class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-slate-900 rounded p-2">
                <div class="text-xs text-slate-400 mb-1 truncate">
                  <span class="text-slate-300 font-bold">基准</span>
                  λ={{ store.baseline.wavelength }}nm · d={{ store.baseline.slitWidth }}μm · D={{ store.baseline.slitSeparation }}μm · L={{ store.baseline.screenDistance }}mm
                </div>
                <canvas ref="cmpBasePatternRef" class="w-full rounded" style="height: 56px; background: black;"></canvas>
                <canvas ref="cmpBaseCurveRef" class="w-full rounded mt-1" style="height: 56px; background: #0b1120;"></canvas>
                <div class="text-xs text-slate-500 mt-1">Δy = {{ store.baselineFringe?.toFixed(2) }} mm</div>
              </div>
              <div class="bg-slate-900 rounded p-2">
                <div class="text-xs text-slate-400 mb-1 truncate">
                  <span class="text-cyan-400 font-bold">当前</span>
                  λ={{ store.params.wavelength }}nm · d={{ store.params.slitWidth }}μm · D={{ store.params.slitSeparation }}μm · L={{ store.params.screenDistance }}mm
                </div>
                <canvas ref="cmpCurPatternRef" class="w-full rounded" style="height: 56px; background: black;"></canvas>
                <canvas ref="cmpCurCurveRef" class="w-full rounded mt-1" style="height: 56px; background: #0b1120;"></canvas>
                <div class="text-xs text-yellow-400 mt-1">Δy = {{ store.result.fringe?.toFixed(2) }} mm</div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-3">
              <p v-if="store.isIdenticalToBaseline" class="text-xs text-slate-500">当前参数与基准一致，两组条纹相同。</p>
              <p v-else class="text-xs text-slate-500">条纹间距 Δy：{{ fringeDeltaText }}</p>
              <div class="flex gap-2 shrink-0">
                <button @click="store.setBaseline()" class="px-2 py-1 text-xs rounded border border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition-all">更新基准为当前</button>
                <button @click="store.clearBaseline()" class="px-2 py-1 text-xs rounded border border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400 transition-all">清除基准</button>
              </div>
            </div>
          </div>
          <p v-if="store.notice" class="text-xs text-cyan-300 mt-2">{{ store.notice }}</p>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">干涉/衍射图样</h3>
          <canvas ref="patternRef" class="w-full rounded" style="height: 200px; background: black;"></canvas>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">光强分布曲线</h3>
          <canvas ref="intensityRef" class="w-full rounded" style="height: 200px; background: #0f172a;"></canvas>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">2D 热力图</h3>
          <canvas ref="heatmapRef" class="w-full rounded" style="height: 200px; background: black;"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useOpticsStore } from './store/optics'

const store = useOpticsStore()
const patternRef = ref<HTMLCanvasElement | null>(null)
const intensityRef = ref<HTMLCanvasElement | null>(null)
const heatmapRef = ref<HTMLCanvasElement | null>(null)
const cmpBasePatternRef = ref<HTMLCanvasElement | null>(null)
const cmpBaseCurveRef = ref<HTMLCanvasElement | null>(null)
const cmpCurPatternRef = ref<HTMLCanvasElement | null>(null)
const cmpCurCurveRef = ref<HTMLCanvasElement | null>(null)

const fringeDeltaText = computed(() => {
  if (store.baselineFringe == null || store.result.fringe == null) return ''
  const diff = Math.round((store.result.fringe - store.baselineFringe) * 100) / 100
  const sign = diff >= 0 ? '+' : ''
  return `${store.baselineFringe.toFixed(2)} → ${store.result.fringe.toFixed(2)} mm（${sign}${diff.toFixed(2)}）`
})

const experiments = [
  { id: 'double', name: '双缝干涉 (Young实验)' },
  { id: 'single', name: '单缝衍射 (Fraunhofer)' },
  { id: 'newton', name: '牛顿环干涉' },
]

function wavelengthToRGB(nm: number): [number, number, number] {
  let r = 0, g = 0, b = 0
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1.0 }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1.0 }
  else if (nm >= 490 && nm < 510) { g = 1.0; b = -(nm - 510) / 20 }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1.0 }
  else if (nm >= 580 && nm < 645) { r = 1.0; g = -(nm - 645) / 65 }
  else if (nm >= 645 && nm <= 780) { r = 1.0 }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function drawPattern() {
  const canvas = patternRef.value
  if (!canvas || !store.intensityData.length) return
  canvas.width = canvas.clientWidth
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, W, H)
  const [r, g, b] = wavelengthToRGB(store.params.wavelength)
  const data = store.intensityData
  for (let x = 0; x < W; x++) {
    const idx = Math.round(x / W * (data.length - 1))
    const intensity = data[idx] || 0
    const alpha = Math.min(1, intensity)
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.fillRect(x, 0, 1, H)
  }
}

function drawIntensity() {
  const canvas = intensityRef.value
  if (!canvas || !store.intensityData.length) return
  canvas.width = canvas.clientWidth
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, W, H)
  const [r, g, b] = wavelengthToRGB(store.params.wavelength)
  const data = store.intensityData
  ctx.beginPath()
  ctx.strokeStyle = `rgb(${r},${g},${b})`
  ctx.lineWidth = 2
  data.forEach((v, i) => {
    const x = i / (data.length - 1) * W
    const y = H - v * (H - 10) - 5
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
  // Fill
  ctx.fillStyle = `rgba(${r},${g},${b},0.15)`
  ctx.lineTo(W, H); ctx.lineTo(0, H)
  ctx.closePath(); ctx.fill()
  // Axes
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; ctx.textAlign = 'center'
  ctx.fillText('0', W / 2, H - 2); ctx.fillText('光强 I', 30, 12); ctx.fillText('位置 x', W - 20, H - 2)
}

function drawHeatmap() {
  const canvas = heatmapRef.value
  if (!canvas || !store.intensityData.length) return
  canvas.width = canvas.clientWidth
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  const [r, g, b] = wavelengthToRGB(store.params.wavelength)
  const data = store.intensityData
  const imgData = ctx.createImageData(W, H)
  for (let x = 0; x < W; x++) {
    const idx = Math.round(x / W * (data.length - 1))
    const intensity = Math.min(1, data[idx] || 0)
    for (let y = 0; y < H; y++) {
      const dist = Math.abs(y - H / 2) / (H / 2)
      const alpha = intensity * (1 - dist * 0.8) * 255
      const pos = (y * W + x) * 4
      imgData.data[pos] = r; imgData.data[pos + 1] = g; imgData.data[pos + 2] = b; imgData.data[pos + 3] = alpha
    }
  }
  ctx.putImageData(imgData, 0, 0)
}

function renderAll() { drawPattern(); drawIntensity(); drawHeatmap() }

// ---- 对照实验小图（基准/当前并排）----
function drawMiniPattern(canvas: HTMLCanvasElement | null, data: number[], nm: number) {
  if (!canvas || !data.length) return
  canvas.width = canvas.clientWidth
  canvas.height = 56
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, W, H)
  const [r, g, b] = wavelengthToRGB(nm)
  for (let x = 0; x < W; x++) {
    const idx = Math.round(x / W * (data.length - 1))
    const alpha = Math.min(1, data[idx] || 0)
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.fillRect(x, 0, 1, H)
  }
}

function drawMiniCurve(canvas: HTMLCanvasElement | null, data: number[], nm: number) {
  if (!canvas || !data.length) return
  canvas.width = canvas.clientWidth
  canvas.height = 56
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = '#0b1120'
  ctx.fillRect(0, 0, W, H)
  const [r, g, b] = wavelengthToRGB(nm)
  ctx.beginPath()
  ctx.strokeStyle = `rgb(${r},${g},${b})`
  ctx.lineWidth = 1.5
  data.forEach((v, i) => {
    const x = i / (data.length - 1) * W
    const y = H - v * (H - 6) - 3
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
}

function renderCompare() {
  if (store.currentExperiment !== 'double' || !store.baseline) return
  drawMiniPattern(cmpBasePatternRef.value, store.baselineIntensityData, store.baseline.wavelength)
  drawMiniCurve(cmpBaseCurveRef.value, store.baselineIntensityData, store.baseline.wavelength)
  drawMiniPattern(cmpCurPatternRef.value, store.intensityData, store.params.wavelength)
  drawMiniCurve(cmpCurCurveRef.value, store.intensityData, store.params.wavelength)
}

onMounted(() => { store.compute(); setTimeout(() => { renderAll(); renderCompare() }, 100) })
watch(() => store.intensityData, () => { renderAll(); renderCompare() }, { deep: true })
watch(() => store.baselineIntensityData, () => nextTick(renderCompare))
watch(() => store.currentExperiment, () => nextTick(() => { renderAll(); renderCompare() }))
</script>
