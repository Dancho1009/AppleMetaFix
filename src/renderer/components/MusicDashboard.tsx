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

  const embedded = stats.lyrics?.embedded || 0;
  const external = stats.lyrics?.external || 0;
  const missing = stats.lyrics?.missing || 0;

  return (
    <section className="card dashboard compact-dashboard">
      <div className="dashboard-header">
        <h2>音乐库</h2>
        <div className="dashboard-summary">
          <span>{stats.songs || 0} 首歌曲</span>
          <span>{stats.artists || 0} 位艺术家</span>
          <span>{stats.albums || 0} 张专辑</span>
          <span>{formatSize(stats.totalSize)}</span>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="dashboard-group">
          <span className="dashboard-label">格式</span>
          {Object.entries(stats.formats || {}).map(([name, count]) => (
            <span className="dashboard-tag" key={name}>{name} {count}</span>
          ))}
        </div>

        <div className="dashboard-group">
          <span className="dashboard-label">歌词</span>
          <span className="dashboard-tag">内嵌 {embedded}</span>
          <span className="dashboard-tag">LRC {external}</span>
          <span className="dashboard-tag">缺失 {missing}</span>
        </div>
      </div>
    </section>
  );
}
