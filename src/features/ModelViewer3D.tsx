import { Alert, Button, Typography } from 'antd'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
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

export function ModelViewer3D() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const contextRef = useRef<LoadedContext | null>(null)
  const requestRef = useRef<number | null>(null)
  const cleanupUrlsRef = useRef<Array<() => void>>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modelName, setModelName] = useState('')

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
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const ambient = new THREE.AmbientLight('#ffffff', 0.7)
    const directional = new THREE.DirectionalLight('#ffffff', 1.1)
    directional.position.set(6, 10, 8)

    const grid = new THREE.GridHelper(20, 20, '#94a3b8', '#e2e8f0')
    scene.add(ambient, directional, grid)

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

  return (
    <section className="model-viewer3d">
      <Typography.Title level={3}>3d模型查看器</Typography.Title>
      <Typography.Paragraph>
        使用 Three.js 加载 glTF 模型。支持旋转、缩放、平移视角；如是 .gltf 文件，请连同相关 .bin 与贴图一起选择。
      </Typography.Paragraph>

      <div className="model-viewer3d-toolbar">
        <Button type="primary" onClick={handleOpenFileDialog} loading={loading}>
          选择模型文件
        </Button>
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

      <div ref={containerRef} className="model-viewer3d-canvas" />
    </section>
  )
}
