import React from "react";

export interface LibraryStats {
  songs?: number;
  artists?: number;
  albums?: number;
  totalSize?: number;
  formats?: Record<string, number>;
  lyrics?: {
    embedded?: number;
    external?: number;
    missing?: number;
  };
}

function formatSize(size?: number) {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(2)} ${units[index]}`;
}

export default function MusicDashboard({ stats }: { stats?: LibraryStats }) {
  if (!stats) return null;

  return (
    <section className="card dashboard">
      <h2>音乐库概览</h2>
      <div className="dashboard-grid">
        <div>歌曲数量<br /><strong>{stats.songs || 0}</strong></div>
        <div>艺术家<br /><strong>{stats.artists || 0}</strong></div>
        <div>专辑<br /><strong>{stats.albums || 0}</strong></div>
        <div>容量<br /><strong>{formatSize(stats.totalSize)}</strong></div>
      </div>

      <h3>格式分布</h3>
      <div>
        {Object.entries(stats.formats || {}).map(([name, count]) => (
          <p key={name}>{name}: {count}</p>
        ))}
      </div>

      <h3>歌词状态</h3>
      <p>内嵌歌词: {stats.lyrics?.embedded || 0}</p>
      <p>外置 LRC: {stats.lyrics?.external || 0}</p>
      <p>缺少歌词: {stats.lyrics?.missing || 0}</p>
    </section>
  );
}
