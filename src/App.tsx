import { Layout, Menu, Typography } from 'antd'
import './App.css'

const menuItems = [
  { key: 'home', label: '首页' },
  { key: 'bank', label: '题库' },
  { key: 'history', label: '练习记录' },
  { key: 'settings', label: '设置' },
]

function App() {
  return (
    <Layout className="app-layout">
      <Layout.Sider width={240} className="app-sider" theme="light">
        <div className="brand">MathDamo</div>
        <Menu
          mode="inline"
          theme="light"
          defaultSelectedKeys={['home']}
          items={menuItems}
        />
      </Layout.Sider>

      <Layout.Content className="main-content">
        <Typography.Title level={1}>欢迎使用 MathDamo</Typography.Title>
        <Typography.Paragraph>
          已改为 Ant Design 6 左侧导航布局。这里可以开始放你的业务内容。
        </Typography.Paragraph>
      </Layout.Content>
    </Layout>
  )
}

export default App
