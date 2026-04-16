import { Alert, Button, Card, Select, Space, Typography } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import './SimpleRecorder.css'

const DEFAULT_AUDIO_TYPE = 'audio/webm;codecs=opus'

interface AudioDeviceOption {
  value: string
  label: string
}

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext
}

const isSupportedMimeType = (mimeType: string) => {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) {
    return false
  }
  return MediaRecorder.isTypeSupported(mimeType)
}

const drawWaveform = (
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  dataArray: Uint8Array<ArrayBuffer>,
) => {
  const context = canvas.getContext('2d')
  if (!context) return

  const { width, height } = canvas
  analyser.getByteTimeDomainData(dataArray)

  context.clearRect(0, 0, width, height)
  context.fillStyle = '#f8fafc'
  context.fillRect(0, 0, width, height)

  context.lineWidth = 2
  context.strokeStyle = '#1d4ed8'
  context.beginPath()

  const sliceWidth = width / dataArray.length
  let x = 0

  for (let i = 0; i < dataArray.length; i += 1) {
    const normalizedValue = dataArray[i] / 128.0
    const y = (normalizedValue * height) / 2

    if (i === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }

    x += sliceWidth
  }

  context.lineTo(width, height / 2)
  context.stroke()
}

export function SimpleRecorder() {
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'granted' | 'denied'>('idle')
  const [audioDevices, setAudioDevices] = useState<AudioDeviceOption[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>()
  const [isRecording, setIsRecording] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFilename, setDownloadFilename] = useState<string>('recording.webm')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const waveformDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const clearWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#f8fafc'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#94a3b8'
    context.font = '14px sans-serif'
    context.textAlign = 'center'
    context.fillText('等待录音中...', canvas.width / 2, canvas.height / 2)
  }, [])

  const stopWaveform = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    waveformDataRef.current = null
    clearWaveform()
  }, [clearWaveform])

  const stopTracks = useCallback(() => {
    if (!streamRef.current) return
    streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const loadAudioInputs = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const inputDevices = devices
      .filter((device) => device.kind === 'audioinput')
      .map((device, index) => ({
        value: device.deviceId,
        label: device.label || `麦克风 ${index + 1}`,
      }))

    setAudioDevices(inputDevices)

    if (!inputDevices.some((item) => item.value === selectedDeviceId)) {
      setSelectedDeviceId(inputDevices[0]?.value)
      return
    }

    if (!selectedDeviceId && inputDevices.length > 0) {
      setSelectedDeviceId(inputDevices[0].value)
    }
  }, [selectedDeviceId])

  const startWaveform = useCallback(async (stream: MediaStream) => {
    const webkitWindow = window as WindowWithWebkitAudioContext
    const AudioContextClass = window.AudioContext || webkitWindow.webkitAudioContext
    if (!AudioContextClass) {
      setErrorMessage('当前浏览器不支持音频可视化。')
      return
    }

    const audioContext = new AudioContextClass()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    const source = audioContext.createMediaStreamSource(stream)

    source.connect(analyser)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    waveformDataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))

    const animate = () => {
      const canvas = canvasRef.current
      const activeAnalyser = analyserRef.current
      const dataArray = waveformDataRef.current
      if (!canvas || !activeAnalyser || !dataArray) return

      drawWaveform(canvas, activeAnalyser, dataArray)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()
  }, [])

  const requestPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('当前浏览器不支持麦克风访问。')
      return
    }

    setErrorMessage('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setPermissionStatus('granted')
      stream.getTracks().forEach((track) => track.stop())
      await loadAudioInputs()
    } catch {
      setPermissionStatus('denied')
      setErrorMessage('麦克风权限被拒绝，请在浏览器设置中允许访问。')
    }
  }, [loadAudioInputs])

  const startRecording = useCallback(async () => {
    if (!selectedDeviceId) {
      setErrorMessage('请先选择麦克风设备。')
      return
    }

    if (!window.MediaRecorder) {
      setErrorMessage('当前浏览器不支持录音。')
      return
    }

    setErrorMessage('')

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
        },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const mimeType = isSupportedMimeType(DEFAULT_AUDIO_TYPE) ? DEFAULT_AUDIO_TYPE : ''
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      streamRef.current = stream
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
        setDownloadUrl(null)
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blobType = mediaRecorder.mimeType || 'audio/webm'
        const fileExt = blobType.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunksRef.current, { type: blobType })
        const url = URL.createObjectURL(blob)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

        setDownloadUrl(url)
        setDownloadFilename(`recording-${timestamp}.${fileExt}`)
        setIsRecording(false)
        stopTracks()
        stopWaveform()
      }

      mediaRecorder.onerror = () => {
        setErrorMessage('录音过程中发生错误，请重试。')
        setIsRecording(false)
        stopTracks()
        stopWaveform()
      }

      mediaRecorder.start()
      setIsRecording(true)
      await startWaveform(stream)
    } catch {
      setErrorMessage('无法启动录音，请确认设备可用并重试。')
      setIsRecording(false)
      stopTracks()
      stopWaveform()
    }
  }, [downloadUrl, selectedDeviceId, startWaveform, stopTracks, stopWaveform])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    if (recorder.state !== 'inactive') {
      recorder.stop()
    }
  }, [])

  useEffect(() => {
    clearWaveform()
  }, [clearWaveform])

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return undefined

    const handleDeviceChange = () => {
      if (permissionStatus === 'granted') {
        void loadAudioInputs()
      }
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [loadAudioInputs, permissionStatus])

  useEffect(() => {
    return () => {
      stopTracks()
      stopWaveform()
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl, stopTracks, stopWaveform])

  return (
    <div className="simple-recorder-page">
      <Card title="简单录音机" className="simple-recorder-card">
        <Space direction="vertical" size={16} className="simple-recorder-stack">
          <Typography.Paragraph className="simple-recorder-help">
            先申请麦克风权限，然后选择设备并开始录音。停止后可直接下载音频文件。
          </Typography.Paragraph>

          {errorMessage ? (
            <Alert type="error" showIcon message={errorMessage} />
          ) : null}

          {permissionStatus !== 'granted' ? (
            <Button type="primary" onClick={() => void requestPermission()}>
              申请麦克风权限
            </Button>
          ) : (
            <Alert type="success" showIcon message="麦克风权限已开启" />
          )}

          <Space wrap>
            <Select
              className="simple-recorder-device-select"
              placeholder="选择麦克风"
              value={selectedDeviceId}
              options={audioDevices}
              disabled={permissionStatus !== 'granted' || isRecording}
              onChange={setSelectedDeviceId}
            />

            {!isRecording ? (
              <Button
                type="primary"
                onClick={() => void startRecording()}
                disabled={permissionStatus !== 'granted' || !selectedDeviceId}
              >
                开始录音
              </Button>
            ) : (
              <Button danger onClick={stopRecording}>
                结束录音
              </Button>
            )}
          </Space>

          <canvas ref={canvasRef} className="simple-recorder-waveform" width={880} height={220} />

          {downloadUrl ? (
            <a href={downloadUrl} download={downloadFilename} className="simple-recorder-download-link">
              下载录音文件
            </a>
          ) : (
            <Typography.Text type="secondary">录音结束后将在这里提供下载链接。</Typography.Text>
          )}
        </Space>
      </Card>
    </div>
  )
}
