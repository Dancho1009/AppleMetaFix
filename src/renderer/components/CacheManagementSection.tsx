import React, { useEffect, useState } from "react";

interface CacheStats {
  searchCount?: number;
  trackCount?: number;
  [key: string]: unknown;
}

export default function CacheManagementSection() {
  const api: any = (window as any).appleMetaFix;
  const [stats, setStats] = useState<CacheStats>({});
  const [retentionDays, setRetentionDays] = useState(30);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const result = await api.getCacheStats();
      setStats(result || {});
    } catch (error) {
      console.error("[CACHE:UI] 获取缓存统计失败", error);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const cleanupExpired = async () => {
    setLoading(true);
    setMessage("");
    try {
      await api.cleanupExpiredCache();
      await refresh();
      setMessage("已清理过期缓存");
    } catch (error) {
      console.error("[CACHE:UI] 清理失败", error);
      setMessage("清理失败");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    setLoading(true);
    setMessage("");
    try {
      await api.clearCache();
      await refresh();
      setMessage("已清空全部缓存");
    } catch (error) {
      console.error("[CACHE:UI] 清空失败", error);
      setMessage("清空失败");
    } finally {
      setLoading(false);
    }
  };

  const saveRetentionDays = async () => {
    try {
      await api.setCacheRetentionDays(retentionDays);
      setMessage("缓存保留时间已更新");
    } catch (error) {
      console.error("[CACHE:UI] 更新保留时间失败", error);
      setMessage("更新失败");
    }
  };

  return (
    <section className="settings-section">
      <h3>缓存管理</h3>

      <div className="settings-field">
        <span>搜索缓存</span>
        <strong>{stats.searchCount ?? 0}</strong>
      </div>

      <div className="settings-field">
        <span>歌曲缓存</span>
        <strong>{stats.trackCount ?? 0}</strong>
      </div>

      <label className="settings-field">
        <span>缓存保留时间（天）</span>
        <div className="token-input-row">
          <input
            type="number"
            min={1}
            max={3650}
            value={retentionDays}
            onChange={(event) => setRetentionDays(Number(event.target.value))}
          />
          <button className="secondary-button" onClick={saveRetentionDays}>
            保存
          </button>
        </div>
      </label>

      <div className="settings-footer">
        <button className="secondary-button" disabled={loading} onClick={cleanupExpired}>
          清理过期缓存
        </button>
        <button className="danger-light-button" disabled={loading} onClick={clearAll}>
          清空全部缓存
        </button>
      </div>

      {message && <small>{message}</small>}
    </section>
  );
}
