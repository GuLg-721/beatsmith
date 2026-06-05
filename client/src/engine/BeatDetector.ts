/**
 * BeatDetector - 节拍检测算法
 * 基于能量的 onset detection + 频谱通量
 */

export interface Beat {
  time: number // 毫秒
  strength: number // 0-1 强度
}

/**
 * 从 PCM 数据中检测节拍
 * @param pcmData 原始 PCM 数据
 * @param sampleRate 采样率
 * @returns 检测到的节拍数组
 */
export function detectBeats(pcmData: Float32Array, sampleRate: number): Beat[] {
  const frameSize = 1024
  const hopSize = 512
  const frames = Math.floor((pcmData.length - frameSize) / hopSize)

  // 1. 计算每帧的短时能量
  const energies: number[] = []
  for (let i = 0; i < frames; i++) {
    const start = i * hopSize
    let energy = 0
    for (let j = 0; j < frameSize; j++) {
      energy += pcmData[start + j] ** 2
    }
    energies.push(energy / frameSize)
  }

  // 2. 计算频谱通量（相邻帧的能量差）
  const flux: number[] = [0]
  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1]
    flux.push(diff > 0 ? diff : 0)
  }

  // 3. 自适应阈值（局部均值 + 常数）
  const windowSize = 10
  const thresholdOffset = 0.1
  const peaks: number[] = []

  for (let i = windowSize; i < flux.length - windowSize; i++) {
    // 计算局部均值
    let localSum = 0
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      localSum += flux[j]
    }
    const localMean = localSum / (windowSize * 2 + 1)
    const threshold = localMean + thresholdOffset

    // 峰值检测
    if (flux[i] > threshold && flux[i] > flux[i - 1] && flux[i] >= flux[i + 1]) {
      // 最小间隔 150ms（防止同一拍被检测多次）
      const minInterval = 0.15
      const timeSeconds = (i * hopSize) / sampleRate
      if (peaks.length === 0 || timeSeconds - peaks[peaks.length - 1] > minInterval) {
        peaks.push(timeSeconds)
      }
    }
  }

  // 4. 转换为 Beat 对象
  const maxFlux = Math.max(...flux, 1)
  return peaks.map(time => ({
    time: time * 1000, // 转换为毫秒
    strength: Math.min(1, flux[Math.round((time * sampleRate) / hopSize)] / maxFlux)
  }))
}

/**
 * 从节拍数组估算 BPM
 * @param beats 节拍数组
 * @returns 估算的 BPM
 */
export function estimateBPM(beats: Beat[]): number {
  if (beats.length < 2) return 0

  // 计算相邻节拍的间隔
  const intervals: number[] = []
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i].time - beats[i - 1].time)
  }

  // 对间隔进行直方图统计
  const histogram: Record<number, number> = {}
  const binSize = 20 // 20ms 的桶

  intervals.forEach(interval => {
    const bin = Math.round(interval / binSize) * binSize
    histogram[bin] = (histogram[bin] || 0) + 1
  })

  // 找到最常见的间隔
  let maxCount = 0
  let mostCommonInterval = 0
  for (const [interval, count] of Object.entries(histogram)) {
    if (count > maxCount) {
      maxCount = count
      mostCommonInterval = parseInt(interval)
    }
  }

  if (mostCommonInterval === 0) return 0

  // 转换为 BPM
  let bpm = 60000 / mostCommonInterval

  // 如果 BPM 太低或太高，可能是倍数关系
  while (bpm < 60) bpm *= 2
  while (bpm > 200) bpm /= 2

  return Math.round(bpm)
}

/**
 * 根据 BPM 生成时间轴上的节拍点
 * @param bpm BPM
 * @param durationMs 总时长（毫秒）
 * @param offsetMs 偏移量（毫秒）
 * @returns 节拍时间点数组（毫秒）
 */
export function generateBeatTimeline(bpm: number, durationMs: number, offsetMs: number = 0): number[] {
  if (bpm <= 0) return []

  const intervalMs = 60000 / bpm
  const beats: number[] = []

  for (let time = offsetMs; time < durationMs; time += intervalMs) {
    beats.push(time)
  }

  return beats
}
