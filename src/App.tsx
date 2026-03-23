import './App.css'

function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">MathDamo</div>
        <nav aria-label="主导航">
          <a className="nav-item active" href="#">
            首页
          </a>
          <a className="nav-item" href="#">
            题库
          </a>
          <a className="nav-item" href="#">
            练习记录
          </a>
          <a className="nav-item" href="#">
            设置
          </a>
        </nav>
      </aside>

      <main className="main-content">
        <h1>欢迎使用 MathDamo</h1>
        <p>已移除 Vite 示例页面。这里可以开始放你的业务内容。</p>
      </main>
    </div>
  )
}

export default App
