import { Layout, Menu } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { FlavorChallenge } from './features/FlavorChallenge'
import { LuckyWheel } from './features/LuckyWheel'
import { parseSharedWheelConfigFromSearch } from './features/luckyWheel/share'
import { MathQuest } from './features/MathQuest'
import { ModelViewer3D } from './features/ModelViewer3D'
import { PiRacer } from './features/PiRacer'
import { ShapeScaleDemo } from './features/ShapeScaleDemo'
import { SimpleRecorder } from './features/SimpleRecorder'
import { SymmetryGuardians } from './features/SymmetryGuardians'

const menuItems = [
  { key: 'shape-scale', label: '图形的放大和缩小' },
  { key: 'model-viewer', label: '3d模型查看器' },
  { key: 'lucky-wheel', label: '转盘' },
  { key: 'simple-recorder', label: '简单录音机' },
  { key: 'pi-racer', label: '极速圆周率' },
  { key: 'flavor-challenge', label: '调味师大挑战' },
  { key: 'math-quest', label: '趣味数学闯关' },
  { key: 'symmetry-guardians', label: '对称守卫者' },
]

const defaultMenuKey = 'shape-scale'
const menuKeySet = new Set(menuItems.map((item) => item.key))

const getMenuKeyFromHash = () => {
  const hashKey = window.location.hash.replace(/^#/, '')
  return menuKeySet.has(hashKey) ? hashKey : defaultMenuKey
}

function App() {
  const sharedWheelConfig = useMemo(
    () => parseSharedWheelConfigFromSearch(window.location.search),
    [],
  )
  const [activeKey, setActiveKey] = useState(getMenuKeyFromHash)

  useEffect(() => {
    if (sharedWheelConfig) return

    const syncByHash = () => {
      const key = getMenuKeyFromHash()
      setActiveKey(key)

      if (window.location.hash !== `#${key}`) {
        window.history.replaceState(null, '', `#${key}`)
      }
    }

    syncByHash()
    window.addEventListener('hashchange', syncByHash)
    return () => window.removeEventListener('hashchange', syncByHash)
  }, [sharedWheelConfig])

  const renderContent = () => {
    if (activeKey === 'shape-scale') return <ShapeScaleDemo />
    if (activeKey === 'model-viewer') return <ModelViewer3D />
    if (activeKey === 'lucky-wheel') return <LuckyWheel />
    if (activeKey === 'pi-racer') return <PiRacer />
    if (activeKey === 'flavor-challenge') return <FlavorChallenge />
    if (activeKey === 'math-quest') {
      return <MathQuest onBackHome={() => {
        setActiveKey(defaultMenuKey)
        window.location.hash = defaultMenuKey
      }} />
    }
    if (activeKey === 'symmetry-guardians') return <SymmetryGuardians />
    return <SimpleRecorder />
  }

  if (sharedWheelConfig) {
    return (
      <Layout className="app-layout app-layout--wheel-locked">
        <Layout.Content className="main-content main-content--wheel-locked">
          <LuckyWheel initialItems={sharedWheelConfig.items} lockedByShare />
        </Layout.Content>
      </Layout>
    )
  }

  return (
    <Layout className="app-layout">
      <Layout.Sider width={240} className="app-sider" theme="light">
        <div className="brand">MathDamo</div>
        <Menu
          mode="inline"
          theme="light"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={({ key }) => {
            const menuKey = String(key)
            if (window.location.hash === `#${menuKey}`) {
              setActiveKey(menuKey)
              return
            }
            window.location.hash = menuKey
          }}
        />
      </Layout.Sider>

      <Layout.Content className="main-content">
        {renderContent()}
      </Layout.Content>
    </Layout>
  )
}

export default App
