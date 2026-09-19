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
    <section className="card dashboard compact-dashboard">
      <h2>音乐库概览</h2>
      <div className="dashboard-grid">
        <div>歌曲<strong>{stats.songs || 0}</strong></div>
        <div>艺术家<strong>{stats.artists || 0}</strong></div>
        <div>专辑<strong>{stats.albums || 0}</strong></div>
        <div>容量<strong>{formatSize(stats.totalSize)}</strong></div>
      </div>

      <div className="dashboard-row">
        <span>格式：</span>
        {Object.entries(stats.formats || {}).map(([name, count]) => (
          <span key={name}>{name} {count}</span>
        ))}
      </div>

      <div className="dashboard-row">
        <span>歌词：</span>
        <span>内嵌 {stats.lyrics?.embedded || 0}</span>
        <span>LRC {stats.lyrics?.external || 0}</span>
        <span>缺失 {stats.lyrics?.missing || 0}</span>
      </div>
    </section>
  );
}
