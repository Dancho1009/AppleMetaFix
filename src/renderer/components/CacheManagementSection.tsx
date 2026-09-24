import React, { useEffect, useState } from "react";
import { AppConfig } from "../../config/AppConfig";

interface CacheStats {
  searchCount: number;
  trackCount: number;
  sizeBytes: number;
  lastCleanupTime: string | null;
}

interface CacheCleanupResult {
  searchDeleted: number;
  trackDeleted: number;
  totalDeleted: number;
  cleanupTime: string;
  stats: CacheStats;
}

interface Props {
  open: boolean;
  config: AppConfig;
  onChange: (patch: Partial<AppConfig["cache"]>) => void;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return size.toFixed(digits) + " " + units[unitIndex];
}

function formatCleanupTime(value: string | null): string {
  if (!value) return "尚未清理";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function CacheManagementSection({
  open,
  config,
  onChange,
}: Props) {
  const api: any = (window as any).appleMetaFix;
  const [stats, setStats] = useState<CacheStats>({
    searchCount: 0,
    trackCount: 0,
    sizeBytes: 0,
    lastCleanupTime: null,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const result = await api.getCacheStats();
      if (result) {
        setStats(result);
      }
    } catch (error) {
      console.error("[CACHE:UI] 获取缓存统计失败", error);
    }
  };

  useEffect(() => {
    if (!open) return;

    setMessage("");
    refresh();
  }, [open]);

  const cleanupExpired = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = (await api.cleanupExpiredCache()) as CacheCleanupResult;
      setStats(result.stats);
      setMessage(
        "已清理过期缓存：" +
          result.searchDeleted +
          " 条搜索缓存，" +
          result.trackDeleted +
          " 条歌曲缓存",
      );
    } catch (error) {
      console.error("[CACHE:UI] 清理失败", error);
      setMessage("清理失败");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("确定删除全部 Apple Music 缓存吗？此操作无法恢复。")) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = (await api.clearCache()) as CacheCleanupResult;
      setStats(result.stats);
      setMessage(
        "已清空全部缓存：" +
          result.searchDeleted +
          " 条搜索缓存，" +
          result.trackDeleted +
          " 条歌曲缓存",
      );
    } catch (error) {
      console.error("[CACHE:UI] 清空失败", error);
      setMessage("清空失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="settings-section">
      <h3>缓存管理</h3>

      <div className="settings-field">
        <span>搜索缓存</span>
        <strong>{stats.searchCount}</strong>
      </div>

      <div className="settings-field">
        <span>歌曲缓存</span>
        <strong>{stats.trackCount}</strong>
      </div>

      <div className="settings-field">
        <span>缓存大小（估算）</span>
        <strong>{formatBytes(stats.sizeBytes)}</strong>
      </div>

      <div className="settings-field">
        <span>上次清理</span>
        <strong>{formatCleanupTime(stats.lastCleanupTime)}</strong>
      </div>

      <label className="settings-field">
        <span>缓存保留时间（天）</span>
        <div className="token-input-row">
          <input
            type="number"
            min={1}
            max={3650}
            value={config.cache.retentionDays}
            onChange={(event) =>
              onChange({
                retentionDays: Math.min(
                  3650,
                  Math.max(1, Number(event.target.value) || 1),
                ),
              })
            }
          />
          <button
            className="danger-light-button"
            type="button"
            disabled={loading}
            onClick={clearAll}
          >
            清空缓存
          </button>
        </div>
        <small>保留时间在保存设置后生效；清空缓存会立即执行。</small>
      </label>

      <div className="settings-footer">
        <button
          className="secondary-button"
          type="button"
          disabled={loading}
          onClick={cleanupExpired}
        >
          {loading ? "处理中..." : "按当前已保存期限清理过期缓存"}
        </button>
      </div>

      {message && <small>{message}</small>}
    </section>
  );
}
