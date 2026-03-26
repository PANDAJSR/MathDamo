import { Alert, Button, Switch, Typography } from 'antd'
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import './ModelViewer3D.css'

type LoadedContext = {
  controls: OrbitControls
  root: THREE.Group
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
}

const MIN_CANVAS_HEIGHT = 280
const MAX_CANVAS_HEIGHT = 960

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.geometry?.dispose()

    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        material.dispose()
      }
      return
    }

    mesh.material?.dispose()
  })
}

function applyMaterialRenderMode(root: THREE.Object3D, forceDoubleSided: boolean) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      material.side = forceDoubleSided ? THREE.DoubleSide : THREE.FrontSide
      material.needsUpdate = true
    }
  })
}

export function ModelViewer3D() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const contextRef = useRef<LoadedContext | null>(null)
  const requestRef = useRef<number | null>(null)
  const cleanupUrlsRef = useRef<Array<() => void>>([])
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modelName, setModelName] = useState('')
  const [forceDoubleSided, setForceDoubleSided] = useState(false)
  const [canvasHeight, setCanvasHeight] = useState(() =>
    window.matchMedia('(max-width: 640px)').matches ? 420 : 560,
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#f8fafc')

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000)
    camera.position.set(4, 3, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = true
    controls.enableZoom = true
    controls.touches.ONE = THREE.TOUCH.ROTATE
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN

    const ambient = new THREE.AmbientLight('#ffffff', 1.0)
    const hemisphere = new THREE.HemisphereLight('#f8fbff', '#d7deea', 0.9)
    const directional = new THREE.DirectionalLight('#ffffff', 1.6)
    directional.position.set(6, 10, 8)
    const fill = new THREE.DirectionalLight('#f5f8ff', 0.8)
    fill.position.set(-6, 4, -3)

    const grid = new THREE.GridHelper(20, 20, '#94a3b8', '#e2e8f0')
    scene.add(ambient, hemisphere, directional, fill, grid)

    const root = new THREE.Group()
    scene.add(root)

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth
      const height = container.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(container)

    const renderLoop = () => {
      controls.update()
      renderer.render(scene, camera)
      requestRef.current = window.requestAnimationFrame(renderLoop)
    }

    renderLoop()
    contextRef.current = { controls, root, scene, camera }

    return () => {
      resizeObserver.disconnect()

      if (requestRef.current !== null) {
        window.cancelAnimationFrame(requestRef.current)
      }

      controls.dispose()
      root.clear()
      renderer.dispose()

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  const revokeAllUrls = () => {
    for (const cleanup of cleanupUrlsRef.current) {
      cleanup()
    }
    cleanupUrlsRef.current = []
  }

  const clearCurrentModel = () => {
    const context = contextRef.current
    if (!context) return

    for (const child of [...context.root.children]) {
      context.root.remove(child)
      disposeObject(child)
    }
  }

  useEffect(
    () => () => {
      clearCurrentModel()
      revokeAllUrls()
    },
    [],
  )

  useEffect(() => {
    const context = contextRef.current
    if (!context) return

    for (const child of context.root.children) {
      applyMaterialRenderMode(child, forceDoubleSided)
    }
  }, [forceDoubleSided])

  const handleOpenFileDialog = () => {
    inputRef.current?.click()
  }

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    const context = contextRef.current
    if (!context) return

    const gltfFile = files.find((file) => /\.(gltf|glb)$/i.test(file.name))
    if (!gltfFile) {
      setError('请选择 .gltf 或 .glb 文件。')
      event.target.value = ''
      return
    }

    setLoading(true)
    setError('')
    setModelName(gltfFile.name)

    clearCurrentModel()
    revokeAllUrls()

    const fileMap = new Map<string, File>()
    for (const file of files) {
      fileMap.set(normalizePath(file.name), file)
      if (file.webkitRelativePath) {
        fileMap.set(normalizePath(file.webkitRelativePath), file)
      }
    }

    const manager = new THREE.LoadingManager()

    manager.setURLModifier((url) => {
      if (/^(blob:|data:|https?:)/i.test(url)) {
        return url
      }

      const stripped = normalizePath(url.split('?')[0].split('#')[0])
      const fullMatch = fileMap.get(stripped)
      const basename = stripped.split('/').pop()
      const baseMatch = basename ? fileMap.get(basename) : null
      const matched = fullMatch ?? baseMatch

      if (!matched) {
        return url
      }

      const objectUrl = URL.createObjectURL(matched)
      cleanupUrlsRef.current.push(() => URL.revokeObjectURL(objectUrl))
      return objectUrl
    })

    const loader = new GLTFLoader(manager)
    const entryUrl = URL.createObjectURL(gltfFile)
    cleanupUrlsRef.current.push(() => URL.revokeObjectURL(entryUrl))

    loader.load(
      entryUrl,
      (gltf) => {
        applyMaterialRenderMode(gltf.scene, forceDoubleSided)
        context.root.add(gltf.scene)

        const box = new THREE.Box3().setFromObject(gltf.scene)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z, 1)

        gltf.scene.position.sub(center)

        const distance = (maxDim * 1.6) / Math.tan((context.camera.fov * Math.PI) / 360)
        context.camera.position.set(distance, distance * 0.6, distance)
        context.camera.lookAt(0, 0, 0)
        context.controls.target.set(0, 0, 0)
        context.controls.update()

        setLoading(false)
      },
      undefined,
      () => {
        setError('模型加载失败。请确认已同时选择 glTF 所需的 .bin/贴图资源文件。')
        setLoading(false)
      },
    )

    event.target.value = ''
  }

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    resizeStateRef.current = { startY: event.clientY, startHeight: canvasHeight }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleResizePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = resizeStateRef.current
    if (!state) return

    const nextHeight = state.startHeight + (event.clientY - state.startY)
    setCanvasHeight(Math.max(MIN_CANVAS_HEIGHT, Math.min(MAX_CANVAS_HEIGHT, nextHeight)))
  }

  const handleResizePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    resizeStateRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section className="model-viewer3d">
      <Typography.Title level={3}>3d模型查看器</Typography.Title>
      <Typography.Paragraph>
        使用 Three.js 加载 glTF 模型。支持旋转、缩放、平移视角；触屏支持单指旋转、双指捏合缩放与双指平移；如是
        .gltf 文件，请连同相关 .bin 与贴图一起选择。可在右下角拖拽手柄上下调整视图高度。
      </Typography.Paragraph>

      <div className="model-viewer3d-toolbar">
        <Button type="primary" onClick={handleOpenFileDialog} loading={loading}>
          选择模型文件
        </Button>
        <Typography.Text>强制双面渲染</Typography.Text>
        <Switch checked={forceDoubleSided} onChange={setForceDoubleSided} />
        <input
          ref={inputRef}
          className="model-viewer3d-input"
          type="file"
          accept=".glb,.gltf,.bin,image/*"
          multiple
          onChange={handleFilesChange}
        />
        <Typography.Text type="secondary">
          {modelName ? `当前模型：${modelName}` : '尚未选择模型'}
        </Typography.Text>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <div className="model-viewer3d-canvas-frame" style={{ height: `${canvasHeight}px` }}>
        <div ref={containerRef} className="model-viewer3d-canvas" />
        <div
          className="model-viewer3d-resizer"
          role="slider"
          aria-label="调整3d视图高度"
          aria-valuemin={MIN_CANVAS_HEIGHT}
          aria-valuemax={MAX_CANVAS_HEIGHT}
          aria-valuenow={Math.round(canvasHeight)}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
        />
      </div>
    </section>
  )
}
