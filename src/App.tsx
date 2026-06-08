import { Button, Layout, Menu } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { FlavorChallenge } from './features/FlavorChallenge'
import { LuckyWheel } from './features/LuckyWheel'
import { parseSharedWheelConfigFromSearch } from './features/luckyWheel/share'
import { MathQuest } from './features/MathQuest'
import { ModelViewer3D } from './features/ModelViewer3D'
import { NineGridAdventure } from './features/NineGridAdventure'
import { PiRacer } from './features/PiRacer'
import { ShapeScaleDemo } from './features/ShapeScaleDemo'
import { SimpleRecorder } from './features/SimpleRecorder'
import { SymmetryGuardians } from './features/SymmetryGuardians'

const fullMenuItems = [
  { key: 'shape-scale', label: '图形的放大和缩小' },
  { key: 'model-viewer', label: '3d模型查看器' },
  { key: 'lucky-wheel', label: '转盘' },
  { key: 'simple-recorder', label: '简单录音机' },
  { key: 'pi-racer', label: '极速圆周率' },
  { key: 'flavor-challenge', label: '调味师大挑战' },
  { key: 'math-quest', label: '趣味数学闯关' },
  { key: 'nine-grid-adventure', label: '九宫格数字大冒险' },
  { key: 'symmetry-guardians', label: '对称守卫者' },
]

const mathGameMenuItems = [
  { key: 'pi-racer', label: '极速圆周率' },
  { key: 'flavor-challenge', label: '调味师大挑战' },
  { key: 'math-quest', label: '趣味数学闯关' },
  { key: 'nine-grid-adventure', label: '九宫格数字大冒险' },
]

const isElectronApp = new URLSearchParams(window.location.search).get('mode') === 'electron'
const menuItems = isElectronApp ? mathGameMenuItems : fullMenuItems
const defaultMenuKey = isElectronApp ? 'pi-racer' : 'shape-scale'
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
  const [navCollapsed, setNavCollapsed] = useState(false)

  useEffect(() => {
    if (sharedWheelConfig) return
    if (isElectronApp) document.title = '数学互动小游戏'

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
    if (activeKey === 'math-quest') return <MathQuest />
    if (activeKey === 'nine-grid-adventure') return <NineGridAdventure />
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
      {navCollapsed && (
        <Button
          className="nav-toggle nav-toggle--floating"
          type="primary"
          onClick={() => setNavCollapsed(false)}
          aria-label="显示导航栏"
        >
          显示导航
        </Button>
      )}

      <Layout.Sider
        width={240}
        collapsedWidth={0}
        collapsed={navCollapsed}
        trigger={null}
        className="app-sider"
        theme="light"
      >
        <div className="sider-header">
          <div className="brand">{isElectronApp ? '数学互动小游戏' : 'MathDamo'}</div>
          <Button
            className="nav-toggle"
            size="small"
            onClick={() => setNavCollapsed(true)}
            aria-label="隐藏导航栏"
          >
            隐藏导航
          </Button>
        </div>
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
