import React, { useState } from "react";

interface SongItem {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
}

export default function App() {
  const [status, setStatus] = useState("等待扫描音乐库...");
  const [folder, setFolder] = useState("");
  const [songs, setSongs] = useState<SongItem[]>([]);

  const handleSelectFolder = async () => {
    const selectedFolder = await window.appleMetaFix?.selectFolder();

    if (!selectedFolder) {
      return;
    }

    setFolder(selectedFolder);
    setStatus("正在扫描音乐库...");

    const result = await window.appleMetaFix?.scanFolder(selectedFolder);
    setSongs(result || []);
    setStatus(`扫描完成，共发现 ${result?.length || 0} 首歌曲`);
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
        <h2>歌曲列表</h2>
        <table>
          <thead>
            <tr>
              <th>文件</th>
              <th>标题</th>
              <th>艺术家</th>
              <th>专辑</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr key={song.path}>
                <td>{song.path}</td>
                <td>{song.title || "-"}</td>
                <td>{song.artist || "-"}</td>
                <td>{song.album || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
