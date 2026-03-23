import { Layout, Menu } from 'antd'
import './App.css'
import { ShapeScaleDemo } from './features/ShapeScaleDemo'

const menuItems = [
  { key: 'shape-scale', label: '图形的放大和缩小' },
]

function App() {
  return (
    <Layout className="app-layout">
      <Layout.Sider width={240} className="app-sider" theme="light">
        <div className="brand">MathDamo</div>
        <Menu
          mode="inline"
          theme="light"
          defaultSelectedKeys={['shape-scale']}
          items={menuItems}
        />
      </Layout.Sider>

      <Layout.Content className="main-content">
        <ShapeScaleDemo />
      </Layout.Content>
    </Layout>
  )
}

export default App
