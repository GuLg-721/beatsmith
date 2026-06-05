/**
 * AudioEngine - Web Audio API 封装
 * 负责音频加载、播放控制、时间同步、频谱分析
 */
export class AudioEngine {
  private context: AudioContext | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private analyserNode: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private buffer: AudioBuffer | null = null

  private startTime = 0 // audioContext.currentTime when play started
  private pauseOffset = 0 // how far into the buffer we were when paused
  private _isPlaying = false
  private _isLoaded = false

  // 回调
  private onEndCallback: (() => void) | null = null

  /**
   * 初始化 AudioContext（需要用户交互后调用）
   */
  init() {
    if (this.context) return
    this.context = new AudioContext()
    this.analyserNode = this.context.createAnalyser()
    this.analyserNode.fftSize = 2048
    this.gainNode = this.context.createGain()
    this.gainNode.connect(this.analyserNode)
    this.analyserNode.connect(this.context.destination)
  }

  /**
   * 从 URL 加载音频
   */
  async load(url: string): Promise<void> {
    this.init()
    if (!this.context) throw new Error('AudioContext not initialized')

    // 恢复 suspended 状态
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    this.buffer = await this.context.decodeAudioData(arrayBuffer)
    this._isLoaded = true
    this.pauseOffset = 0
  }

  /**
   * 从 File 对象加载音频
   */
  async loadFromFile(file: File): Promise<void> {
    this.init()
    if (!this.context) throw new Error('AudioContext not initialized')

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    const arrayBuffer = await file.arrayBuffer()
    this.buffer = await this.context.decodeAudioData(arrayBuffer)
    this._isLoaded = true
    this.pauseOffset = 0
  }

  /**
   * 播放
   */
  play(onEnd?: () => void) {
    if (!this.context || !this.buffer || this._isPlaying) return

    this.sourceNode = this.context.createBufferSource()
    this.sourceNode.buffer = this.buffer
    this.sourceNode.connect(this.gainNode!)

    this.onEndCallback = onEnd || null

    this.sourceNode.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false
        this.pauseOffset = 0
        this.onEndCallback?.()
      }
    }

    this.sourceNode.start(0, this.pauseOffset)
    this.startTime = this.context.currentTime
    this._isPlaying = true
  }

  /**
   * 暂停
   */
  pause() {
    if (!this.context || !this._isPlaying) return

    this.pauseOffset = this.getCurrentTime()
    this.sourceNode?.stop()
    this.sourceNode = null
    this._isPlaying = false
  }

  /**
   * 停止
   */
  stop() {
    if (!this._isPlaying) {
      this.pauseOffset = 0
      return
    }

    this.sourceNode?.stop()
    this.sourceNode = null
    this._isPlaying = false
    this.pauseOffset = 0
  }

  /**
   * 跳转到指定时间（毫秒）
   */
  seek(timeMs: number) {
    const wasPlaying = this._isPlaying
    if (wasPlaying) {
      this.sourceNode?.stop()
      this.sourceNode = null
      this._isPlaying = false
    }

    this.pauseOffset = timeMs / 1000

    if (wasPlaying) {
      this.play()
    }
  }

  /**
   * 获取当前播放位置（毫秒）
   * 使用 AudioContext.currentTime 保证精度
   */
  getCurrentTime(): number {
    if (!this.context) return 0
    if (!this._isPlaying) return this.pauseOffset * 1000
    return (this.context.currentTime - this.startTime + this.pauseOffset) * 1000
  }

  /**
   * 获取总时长（毫秒）
   */
  getDuration(): number {
    if (!this.buffer) return 0
    return this.buffer.duration * 1000
  }

  /**
   * 获取频谱数据（Uint8Array, 0-255）
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0)
    const data = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(data)
    return data
  }

  /**
   * 获取时域波形数据（Uint8Array, 0-255）
   */
  getWaveformData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0)
    const data = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteTimeDomainData(data)
    return data
  }

  /**
   * 设置音量 (0-1)
   */
  setVolume(value: number) {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, value)), this.context!.currentTime)
    }
  }

  /**
   * 获取音频缓冲区的原始 PCM 数据
   */
  getPCMData(): Float32Array | null {
    if (!this.buffer) return null
    // 返回第一个声道的数据
    return this.buffer.getChannelData(0)
  }

  get isPlaying() {
    return this._isPlaying
  }

  get isLoaded() {
    return this._isLoaded
  }

  get audioContext() {
    return this.context
  }

  /**
   * 销毁引擎
   */
  destroy() {
    this.stop()
    this.buffer = null
    this._isLoaded = false
    this.context?.close()
    this.context = null
  }
}
