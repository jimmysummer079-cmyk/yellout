import { VoiceEffect } from '../types';

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * 生成一段柔和模拟的人声音频波形缓冲（用于无麦克风或测试广场回声）
 */
export async function createSimulatedSpeechBuffer(
  ctx: AudioContext,
  durationSec: number,
  effect: VoiceEffect
): Promise<AudioBuffer> {
  const sampleRate = ctx.sampleRate;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  // 基础人声共振峰模拟（喉音 + 呼吸摩擦音 + 语气起伏）
  let baseFreq = effect === 'deep' ? 95 : effect === 'robotic' ? 140 : 210;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // 语调慢速波动（模拟句子起伏）
    const prosody = 1 + 0.15 * Math.sin(2 * Math.PI * 1.8 * t) + 0.1 * Math.sin(2 * Math.PI * 0.4 * t);
    const f = baseFreq * prosody;

    // 基音频
    const fundamental = Math.sin(2 * Math.PI * f * t);
    const harmonic1 = 0.5 * Math.sin(2 * Math.PI * f * 2 * t);
    const harmonic2 = 0.25 * Math.sin(2 * Math.PI * f * 3 * t);
    // 气息白噪摩擦声
    const breathNoise = (Math.random() * 2 - 1) * 0.15;

    // 语流包络（间歇停顿）
    const speechCadence = Math.max(0, Math.sin(2 * Math.PI * 2.2 * t)) * Math.max(0, Math.sin(2 * Math.PI * 0.6 * t));
    const envelope = Math.min(1, t * 4) * Math.min(1, (durationSec - t) * 4) * (0.3 + 0.7 * speechCadence);

    data[i] = (fundamental + harmonic1 + harmonic2 + breathNoise) * envelope * 0.4;
  }

  return buffer;
}

/**
 * 带有 DSP 音效的播放控制器
 */
export class DSPVoicePlayer {
  private ctx: AudioContext;
  private currentSource: AudioBufferSourceNode | null = null;
  private carrierOsc: OscillatorNode | null = null;
  private isCurrentlyPlaying = false;
  private timerId: number | null = null;

  constructor() {
    this.ctx = getAudioContext();
  }

  public async play(
    audioBlobOrBuffer: Blob | AudioBuffer | null,
    durationSec: number,
    effect: VoiceEffect,
    onProgress?: (progress: number) => void,
    onEnded?: () => void
  ) {
    this.stop();

    let buffer: AudioBuffer;
    if (audioBlobOrBuffer instanceof AudioBuffer) {
      buffer = audioBlobOrBuffer;
    } else if (audioBlobOrBuffer instanceof Blob) {
      try {
        const arrayBuffer = await audioBlobOrBuffer.arrayBuffer();
        buffer = await this.ctx.decodeAudioData(arrayBuffer);
      } catch (err) {
        console.warn('Decode error, falling back to simulated speech:', err);
        buffer = await createSimulatedSpeechBuffer(this.ctx, durationSec, effect);
      }
    } else {
      buffer = await createSimulatedSpeechBuffer(this.ctx, durationSec, effect);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    this.currentSource = source;

    // 变调与 DSP 链
    let lastNode: AudioNode = source;

    if (effect === 'deep') {
      // 厚重：降低播放速率 + 低音棚级增益
      source.playbackRate.value = 0.84;
      const lowFilter = this.ctx.createBiquadFilter();
      lowFilter.type = 'lowshelf';
      lowFilter.frequency.value = 220;
      lowFilter.gain.value = 7.5;

      const highCut = this.ctx.createBiquadFilter();
      highCut.type = 'highshelf';
      highCut.frequency.value = 3200;
      highCut.gain.value = -9.0;

      lastNode.connect(lowFilter);
      lowFilter.connect(highCut);
      lastNode = highCut;
    } else if (effect === 'robotic') {
      // 机械：调频调制 (Ring Modulation)
      const ringGain = this.ctx.createGain();
      ringGain.gain.value = 0.5;

      const carrier = this.ctx.createOscillator();
      carrier.type = 'square';
      carrier.frequency.value = 46; // 46Hz 金属机械振颤
      this.carrierOsc = carrier;

      const carrierGain = this.ctx.createGain();
      carrierGain.gain.value = 0.45;

      carrier.connect(carrierGain.gain);
      lastNode.connect(ringGain);
      ringGain.connect(carrierGain);
      carrier.start();

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'peaking';
      bandpass.frequency.value = 1400;
      bandpass.Q.value = 2.5;
      bandpass.gain.value = 6;

      carrierGain.connect(bandpass);
      lastNode = bandpass;
    } else if (effect === 'ethereal') {
      // 空灵：轻微升调 + 回声空间延迟 (Echo/Reverb)
      source.playbackRate.value = 1.14;

      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.22;

      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.38;

      const wetGain = this.ctx.createGain();
      wetGain.gain.value = 0.45;

      const dryGain = this.ctx.createGain();
      dryGain.gain.value = 0.7;

      const highpass = this.ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 350;

      lastNode.connect(highpass);
      highpass.connect(dryGain);
      highpass.connect(delay);

      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wetGain);

      const merger = this.ctx.createGain();
      dryGain.connect(merger);
      wetGain.connect(merger);
      lastNode = merger;
    }

    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0.9;
    lastNode.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    this.isCurrentlyPlaying = true;
    const actualDuration = buffer.duration / (source.playbackRate.value || 1);
    const startTime = this.ctx.currentTime;

    source.start();

    // 进度追踪
    const updateProgress = () => {
      if (!this.isCurrentlyPlaying) return;
      const elapsed = this.ctx.currentTime - startTime;
      const progress = Math.min(1, elapsed / actualDuration);
      if (onProgress) onProgress(progress);

      if (progress >= 1) {
        this.stop();
        if (onEnded) onEnded();
      } else {
        this.timerId = window.requestAnimationFrame(updateProgress);
      }
    };
    this.timerId = window.requestAnimationFrame(updateProgress);

    source.onended = () => {
      this.stop();
      if (onEnded) onEnded();
    };
  }

  public stop() {
    this.isCurrentlyPlaying = false;
    if (this.timerId) {
      window.cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
    if (this.carrierOsc) {
      try {
        this.carrierOsc.stop();
        this.carrierOsc.disconnect();
      } catch {
        // ignore
      }
      this.carrierOsc = null;
    }
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // ignore
      }
      this.currentSource = null;
    }
  }

  public isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }
}

/**
 * 麦克风录音机，包含实时音量监测
 */
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private isRecordingState = false;
  private volumeCallback: ((volume: number) => void) | null = null;
  private animFrameId: number | null = null;

  public async start(onVolumeChange?: (vol: number) => void): Promise<boolean> {
    this.audioChunks = [];
    this.volumeCallback = onVolumeChange || null;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported, using simulation mode');
        this.isRecordingState = true;
        this.startSimulatedVolume();
        return true;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = getAudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);
      this.isRecordingState = true;
      this.monitorVolume();
      return true;
    } catch (err) {
      console.warn('Microphone permission not granted or device missing. Running simulated recording:', err);
      this.isRecordingState = true;
      this.startSimulatedVolume();
      return true;
    }
  }

  private monitorVolume() {
    if (!this.analyser || !this.isRecordingState) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    const normalizedVol = Math.min(1, avg / 128);

    if (this.volumeCallback) {
      this.volumeCallback(normalizedVol);
    }

    this.animFrameId = window.requestAnimationFrame(() => this.monitorVolume());
  }

  private startSimulatedVolume() {
    const loop = () => {
      if (!this.isRecordingState) return;
      // 模拟说话时的音量波动
      const simulatedVol = 0.25 + 0.45 * Math.sin(Date.now() / 150) * Math.cos(Date.now() / 320) + Math.random() * 0.2;
      if (this.volumeCallback) {
        this.volumeCallback(Math.max(0.1, Math.min(1, simulatedVol)));
      }
      this.animFrameId = window.requestAnimationFrame(loop);
    };
    loop();
  }

  public stop(): Promise<{ blob: Blob | null; waveform: number[] }> {
    return new Promise((resolve) => {
      this.isRecordingState = false;
      if (this.animFrameId) {
        window.cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }

      // 生成美观的波形图数据
      const waveform: number[] = [];
      for (let i = 0; i < 28; i++) {
        waveform.push(Math.round((0.2 + Math.random() * 0.75) * 100) / 100);
      }

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          });
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }
          resolve({ blob, waveform });
        };
        this.mediaRecorder.stop();
      } else {
        // 模拟生成
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }
        resolve({ blob: null, waveform });
      }
    });
  }

  public cancel() {
    this.isRecordingState = false;
    if (this.animFrameId) {
      window.cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}

/**
 * 车窗夜雨沉浸底噪合成器 (Web Audio 实时物理模拟)
 * 模拟中年人下班停在车库、雨夜坐在车内的温暖私密包裹感
 */
export class AmbientRainSound {
  private ctx: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlayingState = false;
  private rainIntervalId: number | null = null;

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public start() {
    if (this.isPlayingState) return;
    try {
      this.ctx = getAudioContext();
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // 生成粉红/布朗噪声（柔和的雨声基底）
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
        b6 = white * 0.115926;
      }

      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = noiseBuffer;
      this.noiseSource.loop = true;

      // 模拟车窗滤音：低通滤波（车内沉闷隔音感）
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 650;

      // 高切微调，使雨声非常柔和不刺耳
      const highShelf = this.ctx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 2000;
      highShelf.gain.value = -12;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(0.28, this.ctx.currentTime + 1.2);

      this.noiseSource.connect(filter);
      filter.connect(highShelf);
      highShelf.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.noiseSource.start();
      this.isPlayingState = true;

      // 偶尔模拟一两颗雨滴打在车窗上的微小水珠声
      this.rainIntervalId = window.setInterval(() => {
        if (!this.isPlayingState || !this.ctx) return;
        if (Math.random() > 0.45) {
          try {
            const dropOsc = this.ctx.createOscillator();
            const dropGain = this.ctx.createGain();
            dropOsc.type = 'sine';
            const freq = 450 + Math.random() * 300;
            dropOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            dropOsc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.06);

            dropGain.gain.setValueAtTime(0.025, this.ctx.currentTime);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.06);

            dropOsc.connect(dropGain);
            dropGain.connect(this.ctx.destination);
            dropOsc.start();
            dropOsc.stop(this.ctx.currentTime + 0.07);
          } catch {
            // ignore
          }
        }
      }, 700);
    } catch (err) {
      console.warn('Ambient sound error:', err);
    }
  }

  public stop() {
    if (!this.isPlayingState) return;
    this.isPlayingState = false;
    if (this.rainIntervalId) {
      window.clearInterval(this.rainIntervalId);
      this.rainIntervalId = null;
    }
    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      if (this.noiseSource) {
        try {
          this.noiseSource.stop();
          this.noiseSource.disconnect();
        } catch {
          // ignore
        }
        this.noiseSource = null;
      }
    }, 550);
  }
}

/**
 * 焚入虚空音效：火焰微燃与余烬消散在风中的呼啸感
 */
export function playBurnToAshSound() {
  try {
    const ctx = getAudioContext();
    // 1. 低沉叹息与呼啸
    const whooshOsc = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whooshOsc.type = 'triangle';
    whooshOsc.frequency.setValueAtTime(140, ctx.currentTime);
    whooshOsc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.6);

    whooshGain.gain.setValueAtTime(0.2, ctx.currentTime);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    whooshOsc.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    whooshOsc.start();
    whooshOsc.stop(ctx.currentTime + 0.65);

    // 2. 火星爆裂噼啪微音
    for (let i = 0; i < 6; i++) {
      const delay = Math.random() * 0.45;
      const crackleOsc = ctx.createOscillator();
      const crackleGain = ctx.createGain();
      crackleOsc.type = 'sawtooth';
      crackleOsc.frequency.setValueAtTime(1200 + Math.random() * 800, ctx.currentTime + delay);
      crackleGain.gain.setValueAtTime(0.06, ctx.currentTime + delay);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.03);

      crackleOsc.connect(crackleGain);
      crackleGain.connect(ctx.destination);
      crackleOsc.start(ctx.currentTime + delay);
      crackleOsc.stop(ctx.currentTime + delay + 0.04);
    }
  } catch {
    // ignore
  }
}
