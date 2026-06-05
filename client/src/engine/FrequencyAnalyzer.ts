/**
 * FrequencyAnalyzer - 频谱分析器
 * 将原始 FFT 数据转换为可视化的频谱条
 */

export interface SpectrumBar {
  value: number // 0-1 归一化值
  frequency: number // 对应的频率
}

/**
 * 将 Uint8Array 频谱数据转换为 N 个频谱条
 * @param frequencyData 原始 FFT 数据
 * @param barCount 要生成的频谱条数量
 * @returns 归一化的频谱条数组
 */
export function getSpectrumBars(frequencyData: Uint8Array, barCount: number): SpectrumBar[] {
  if (frequencyData.length === 0) {
    return Array.from({ length: barCount }, () => ({ value: 0, frequency: 0 }))
  }

  const bars: SpectrumBar[] = []
  const binCount = frequencyData.length

  // 将频谱数据分组到 N 个条中
  // 使用对数分组（低频更详细，高频更粗略）
  const logMin = Math.log(1)
  const logMax = Math.log(binCount)

  for (let i = 0; i < barCount; i++) {
    const logStart = logMin + (logMax - logMin) * (i / barCount)
    const logEnd = logMin + (logMax - logMin) * ((i + 1) / barCount)
    const startBin = Math.floor(Math.exp(logStart))
    const endBin = Math.min(Math.ceil(Math.exp(logEnd)), binCount)

    // 取该范围内的最大值
    let maxVal = 0
    for (let j = startBin; j < endBin; j++) {
      maxVal = Math.max(maxVal, frequencyData[j])
    }

    bars.push({
      value: maxVal / 255, // 归一化到 0-1
      frequency: ((startBin + endBin) / 2) * (44100 / 2 / binCount) // 估算频率
    })
  }

  return bars
}

/**
 * 计算整体能量值（用于脉冲效果）
 * @param frequencyData 原始 FFT 数据
 * @returns 0-1 的能量值
 */
export function getEnergy(frequencyData: Uint8Array): number {
  if (frequencyData.length === 0) return 0

  let sum = 0
  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i]
  }

  return sum / (frequencyData.length * 255)
}

/**
 * 获取低频能量（低音）
 */
export function getBassEnergy(frequencyData: Uint8Array): number {
  if (frequencyData.length === 0) return 0

  // 取前 1/4 的频谱（低频部分）
  const bassRange = Math.floor(frequencyData.length / 4)
  let sum = 0
  for (let i = 0; i < bassRange; i++) {
    sum += frequencyData[i]
  }

  return sum / (bassRange * 255)
}
