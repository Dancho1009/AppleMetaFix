import React, { useState } from "react";

export default function App() {
  const [status, setStatus] = useState("等待扫描音乐库...");
  const [folder, setFolder] = useState("");

  const handleSelectFolder = () => {
    setFolder("未连接文件选择器");
    setStatus("准备接入 Electron 文件夹选择功能...");
  };

  return (
    <main style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1>AppleMetaFix</h1>
      <p>Apple Music 元数据增强工具</p>

      <section>
        <button onClick={handleSelectFolder}>选择音乐文件夹</button>
        <p>{folder}</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>扫描状态</h2>
        <p>{status}</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>功能模块</h2>
        <ul>
          <li>本地音乐元数据扫描</li>
          <li>Apple Music 匹配</li>
          <li>封面与歌词增强</li>
          <li>Tag 写入</li>
        </ul>
      </section>
    </main>
  );
}
