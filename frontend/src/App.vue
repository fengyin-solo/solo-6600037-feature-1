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
            <input type="range" min="380" max="780" step="5" v-model.number="store.params.wavelength" @input="onParamInput" class="w-full accent-cyan-500" />
            <div class="flex justify-between text-xs mt-0.5">
              <span style="color:#8b5cf6">380</span><span style="color:#06b6d4">500</span><span style="color:#22c55e">550</span><span style="color:#eab308">600</span><span style="color:#dc2626">780</span>
            </div>
          </div>
          <div v-if="store.currentExperiment !== 'newton'">
            <label class="text-xs text-slate-500">缝宽/间距 d = {{ store.params.slitWidth }} μm</label>
            <input type="range" min="10" max="200" step="5" v-model.number="store.params.slitWidth" @input="onParamInput" class="w-full accent-purple-500" />
          </div>
          <div v-if="store.currentExperiment === 'double'">
            <label class="text-xs text-slate-500">缝间距 D = {{ store.params.slitSeparation }} μm</label>
            <input type="range" min="50" max="500" step="10" v-model.number="store.params.slitSeparation" @input="onParamInput" class="w-full accent-green-500" />
          </div>
          <div>
            <label class="text-xs text-slate-500">屏幕距离 L = {{ store.params.screenDistance }} mm</label>
            <input type="range" min="100" max="2000" step="50" v-model.number="store.params.screenDistance" @input="onParamInput" class="w-full accent-orange-500" />
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
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">干涉/衍射图样</h3>
          <canvas ref="patternRef" class="w-full rounded" style="height: 200px; background: black;"></canvas>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">光强分布曲线</h3>
          <canvas ref="intensityRef" class="w-full rounded" style="height: 200px; background: #0f172a;"></canvas>
        </div>
        <div v-if="store.currentExperiment === 'double'" class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-400">双缝对照实验</h3>
            <div class="space-x-2">
              <button @click="store.setBaseline()"
                class="px-3 py-1 text-xs rounded border border-cyan-600 text-cyan-400 hover:bg-cyan-900/40 transition-all">设为基准</button>
              <button v-if="store.baseline" @click="store.clearBaseline()"
                class="px-3 py-1 text-xs rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-all">清除基准</button>
            </div>
          </div>
          <p v-if="statusText" class="text-xs text-slate-500 mb-3">{{ statusText }}</p>
          <div v-if="store.baseline" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-slate-500 mb-1"
                  :title="`a=${store.baseline.slitWidth}μm L=${store.baseline.screenDistance}mm`">
                  基准 · λ={{ store.baseline.wavelength }}nm · D={{ store.baseline.slitSeparation }}μm · Δy={{ store.baselineFringe?.toFixed(2) }}mm
                </div>
                <canvas ref="basePatternRef" class="w-full rounded" style="height: 120px; background: black;"></canvas>
              </div>
              <div>
                <div class="text-xs text-cyan-500 mb-1">
                  当前 · λ={{ store.params.wavelength }}nm · D={{ store.params.slitSeparation }}μm · Δy={{ store.result.fringe?.toFixed(2) }}mm
                </div>
                <canvas ref="curPatternRef" class="w-full rounded" style="height: 120px; background: black;"></canvas>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <canvas ref="baseIntensityRef" class="w-full rounded" style="height: 140px; background: #0f172a;"></canvas>
              <canvas ref="curIntensityRef" class="w-full rounded" style="height: 140px; background: #0f172a;"></canvas>
            </div>
          </div>
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useOpticsStore } from './store/optics'

const store = useOpticsStore()
const patternRef = ref<HTMLCanvasElement | null>(null)
const intensityRef = ref<HTMLCanvasElement | null>(null)
const heatmapRef = ref<HTMLCanvasElement | null>(null)
const basePatternRef = ref<HTMLCanvasElement | null>(null)
const curPatternRef = ref<HTMLCanvasElement | null>(null)
const baseIntensityRef = ref<HTMLCanvasElement | null>(null)
const curIntensityRef = ref<HTMLCanvasElement | null>(null)

const statusText = computed(() => {
  switch (store.compareStatus) {
    case 'no-baseline': return '尚未设置基准参数 — 点击「设为基准」固定当前参数，再调节波长或缝间距进行对照'
    case 'identical': return '当前参数与基准一致，两组图样相同'
    case 'adjusting': return '参数调整中…'
    default: return ''
  }
})

function onParamInput() { store.compute(); store.noteAdjusting() }

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

function paintPattern(canvas: HTMLCanvasElement | null, data: number[], nm: number, height: number) {
  if (!canvas || !data.length) return
  canvas.width = canvas.clientWidth
  canvas.height = height
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

function paintIntensity(canvas: HTMLCanvasElement | null, data: number[], nm: number, height: number) {
  if (!canvas || !data.length) return
  canvas.width = canvas.clientWidth
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, W, H)
  const [r, g, b] = wavelengthToRGB(nm)
  ctx.beginPath()
  ctx.strokeStyle = `rgb(${r},${g},${b})`
  ctx.lineWidth = 2
  data.forEach((v, i) => {
    const x = i / (data.length - 1) * W
    const y = H - v * (H - 10) - 5
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.fillStyle = `rgba(${r},${g},${b},0.15)`
  ctx.lineTo(W, H); ctx.lineTo(0, H)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
  ctx.setLineDash([])
}

function renderCompare() {
  if (!store.baseline) return
  paintPattern(basePatternRef.value, store.baselineData, store.baseline.wavelength, 120)
  paintPattern(curPatternRef.value, store.intensityData, store.params.wavelength, 120)
  paintIntensity(baseIntensityRef.value, store.baselineData, store.baseline.wavelength, 140)
  paintIntensity(curIntensityRef.value, store.intensityData, store.params.wavelength, 140)
}

function renderAll() { drawPattern(); drawIntensity(); drawHeatmap(); renderCompare() }

onMounted(() => { store.compute(); setTimeout(renderAll, 100) })
watch(() => store.intensityData, () => renderAll(), { deep: true })
// 基准变更或切回双缝实验时，等待对照画布挂载后再重绘
watch(() => [store.baseline, store.currentExperiment], () => nextTick(renderAll))
</script>
