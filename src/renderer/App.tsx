import React from "react";

export default function App() {
  return (
    <main style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1>AppleMetaFix</h1>
      <p>Apple Music 元数据增强工具</p>

      <section>
        <button>选择音乐文件夹</button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>扫描状态</h2>
        <p>等待扫描音乐库...</p>
      </section>
    </main>
  );
}
