import { Layout, Menu } from 'antd'
import { useState } from 'react'
import './App.css'
import { LuckyWheel } from './features/LuckyWheel'
import { ModelViewer3D } from './features/ModelViewer3D'
import { ShapeScaleDemo } from './features/ShapeScaleDemo'

const menuItems = [
  { key: 'shape-scale', label: '图形的放大和缩小' },
  { key: 'model-viewer', label: '3d模型查看器' },
  { key: 'lucky-wheel', label: '转盘' },
]

function App() {
  const [activeKey, setActiveKey] = useState('shape-scale')

  const renderContent = () => {
    if (activeKey === 'shape-scale') return <ShapeScaleDemo />
    if (activeKey === 'model-viewer') return <ModelViewer3D />
    return <LuckyWheel />
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
          onClick={({ key }) => setActiveKey(key)}
        />
      </Layout.Sider>

      <Layout.Content className="main-content">
        {renderContent()}
      </Layout.Content>
    </Layout>
  )
}

export default App
