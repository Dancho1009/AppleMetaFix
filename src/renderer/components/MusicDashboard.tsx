import React from "react";

export interface LibraryStats {
  songs?: number;
  artists?: number;
  albums?: number;
  totalSize?: number;
  formats?: Record<string, number>;
  cover?: {
    exists?: number;
    missing?: number;
  };
  lyrics?: {
    embedded?: number;
    external?: number;
    missing?: number;
  };
}

interface MusicDashboardProps {
  stats?: LibraryStats;
  onFilter?: (filter: string) => void;
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

export default function MusicDashboard({
  stats,
}: MusicDashboardProps) {
  if (!stats) return null;

  const embedded = stats.lyrics?.embedded || 0;
  const external = stats.lyrics?.external || 0;
  const missing = stats.lyrics?.missing || 0;
  const coverExists = stats.cover?.exists || 0;

  return (
    <section className="card dashboard compact-dashboard">
      <div className="dashboard-header">
        <h2>音乐库</h2>
        <div className="dashboard-summary" style={{ display: "flex", gap: "24px" }}>
          <span>{stats.songs || 0} 首歌曲</span>
          <span>{stats.artists || 0} 位艺术家</span>
          <span>{stats.albums || 0} 张专辑</span>
          <span>{formatSize(stats.totalSize)}</span>
        </div>
      </div>

      <div className="dashboard-row" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span className="dashboard-label">格式</span>
        {Object.entries(stats.formats || {}).map(([name, count]) => (
          <span className="dashboard-tag" key={name}>{name} {count}</span>
        ))}
        <span className="dashboard-label" style={{ marginLeft: "12px" }}>封面</span>
        <span className="dashboard-tag">{coverExists}/{stats.songs || 0}</span>
        <span className="dashboard-label lyrics-label" style={{ marginLeft: "12px" }}>歌词</span>
        <span className="dashboard-tag">内嵌 {embedded}</span>
        <span className="dashboard-tag">LRC {external}</span>
        <span className="dashboard-tag">缺失 {missing}</span>
      </div>
    </section>
  );
}
