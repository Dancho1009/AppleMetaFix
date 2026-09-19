import React, { useState } from "react";

interface SongItem {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  year?: number;
  genre?: string;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "-";

  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${min}:${sec}`;
}

export default function App() {
  const [status, setStatus] = useState("等待扫描音乐库...");
  const [folder, setFolder] = useState("");
  const [songs, setSongs] = useState<SongItem[]>([]);

  const handleSelectFolder = async () => {
    try {
      if (!window.appleMetaFix) {
        setStatus("错误：Electron preload 未加载");
        return;
      }

      setStatus("正在打开文件夹选择窗口...");

      const selectedFolder = await window.appleMetaFix.selectFolder();

      if (!selectedFolder) {
        setStatus("已取消选择文件夹");
        return;
      }

      setFolder(selectedFolder);
      setStatus("正在扫描音乐库...");

      const result = await window.appleMetaFix.scanFolder(selectedFolder);
      setSongs(result || []);
      setStatus(`扫描完成，共发现 ${result?.length || 0} 首歌曲`);
    } catch (error) {
      console.error(error);
      setStatus(`选择文件夹失败: ${String(error)}`);
    }
  };

  return (
    <main style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1>AppleMetaFix</h1>
      <p>Apple Music 元数据增强工具</p>

      <button onClick={handleSelectFolder}>选择音乐文件夹</button>
      <p>{folder || "未选择文件夹"}</p>

      <section style={{ marginTop: 24 }}>
        <h2>扫描状态</h2>
        <p>{status}</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>歌曲列表</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>标题</th>
              <th>艺术家</th>
              <th>专辑</th>
              <th>年份</th>
              <th>类型</th>
              <th>时长</th>
              <th>路径</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr key={song.path}>
                <td>{song.title || "-"}</td>
                <td>{song.artist || "-"}</td>
                <td>{song.album || "-"}</td>
                <td>{song.year || "-"}</td>
                <td>{song.genre || "-"}</td>
                <td>{formatDuration(song.duration)}</td>
                <td>{song.path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
