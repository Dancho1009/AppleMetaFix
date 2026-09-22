import React, { useEffect, useMemo, useState } from "react";
import {
  AppConfig,
  AppleMusicDisplayFieldKey,
  DEFAULT_APP_CONFIG,
  normalizeAppConfig,
} from "../../config/AppConfig";
import { MATCH_RESULT_FIELDS } from "../services/DisplayConfigService";
import SidePanel from "./SidePanel";

interface SettingsPanelProps {
  open: boolean;
  config: AppConfig;
  onClose: () => void;
  onSaved: (config: AppConfig) => void;
}

const STOREFRONTS = [
  { value: "auto", label: "自动检测" },
  { value: "us", label: "美国 (us)" },
  { value: "jp", label: "日本 (jp)" },
  { value: "cn", label: "中国大陆 (cn)" },
  { value: "hk", label: "香港 (hk)" },
  { value: "tw", label: "台湾 (tw)" },
  { value: "kr", label: "韩国 (kr)" },
  { value: "gb", label: "英国 (gb)" },
];

export default function SettingsPanel({
  open,
  config,
  onClose,
  onSaved,
}: SettingsPanelProps) {
  const api: any = (window as any).appleMetaFix;
  const [draft, setDraft] = useState<AppConfig>(() => normalizeAppConfig(config));
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeAppConfig(config));
    setShowToken(false);
    setError("");
  }, [open, config]);

  const storefrontOptions = useMemo(() => {
    if (STOREFRONTS.some((item) => item.value === draft.appleMusic.storefront)) {
      return STOREFRONTS;
    }

    return [
      ...STOREFRONTS,
      {
        value: draft.appleMusic.storefront,
        label: draft.appleMusic.storefront + "（自定义）",
      },
    ];
  }, [draft.appleMusic.storefront]);

  const updateAppleMusic = (patch: Partial<AppConfig["appleMusic"]>) => {
    setDraft((current) => ({
      ...current,
      appleMusic: {
        ...current.appleMusic,
        ...patch,
      },
    }));
  };

  const updateDisplayField = (
    key: AppleMusicDisplayFieldKey,
    enabled: boolean,
  ) => {
    setDraft((current) => ({
      ...current,
      display: {
        ...current.display,
        appleMusic: {
          ...current.display.appleMusic,
          [key]: enabled,
        },
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    setError("");

    try {
      const saved = normalizeAppConfig(await api.updateConfig(draft));
      onSaved(saved);
      onClose();
    } catch (saveError) {
      console.error("[CONFIG:UI] 保存设置失败", saveError);
      setError("保存设置失败，请查看日志。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel
      open={open}
      title="设置"
      subtitle="修改后保存即可立即应用，无需重启应用。"
      onClose={onClose}
      width="normal"
      footer={
        <div className="settings-footer">
          <div className="settings-footer-left">
            <button
              className="danger-light-button"
              onClick={() => setDraft(normalizeAppConfig(DEFAULT_APP_CONFIG))}
              disabled={saving}
            >
              恢复全部默认
            </button>
            {error && <span className="settings-error">{error}</span>}
          </div>

          <div>
            <button
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              取消
            </button>
            <button onClick={save} disabled={saving}>
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </div>
      }
    >
      <section className="settings-section">
        <h3>Apple Music</h3>

        <label className="settings-field">
          <span>Media User Token</span>
          <div className="token-input-row">
            <input
              type={showToken ? "text" : "password"}
              value={draft.appleMusic.mediaUserToken}
              placeholder="输入 media-user-token"
              onChange={(event) =>
                updateAppleMusic({ mediaUserToken: event.target.value })
              }
            />
            <button
              className="secondary-button token-toggle"
              onClick={() => setShowToken((value) => !value)}
            >
              {showToken ? "隐藏" : "显示"}
            </button>
          </div>
          <small>仅保存在本地 config/config.json，不提交到 Git。</small>
        </label>

        <label className="settings-field">
          <span>Storefront</span>
          <select
            value={draft.appleMusic.storefront}
            onChange={(event) =>
              updateAppleMusic({ storefront: event.target.value })
            }
          >
            {storefrontOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <small>
            选择“自动检测”时继续根据歌曲语言自动选择 Apple Music 区域。
          </small>
        </label>

        <label className="settings-field">
          <span>候选搜索数量</span>
          <input
            type="number"
            min={1}
            max={25}
            value={draft.appleMusic.candidateLimit}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              updateAppleMusic({
                candidateLimit: Math.min(25, Math.max(1, Math.round(next))),
              });
            }}
          />
          <small>
            范围 1–25。当前搜索请求已使用该值，后续候选列表将直接复用。
          </small>
        </label>
      </section>

      <section className="settings-section">
        <div className="settings-section-title">
          <div>
            <h3>Apple Music 详情显示</h3>
            <p>控制歌曲详情页匹配结果中显示的字段。</p>
          </div>
          <button
            className="secondary-button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                display: {
                  ...current.display,
                  appleMusic: {
                    ...DEFAULT_APP_CONFIG.display.appleMusic,
                  },
                },
              }))
            }
          >
            恢复字段默认值
          </button>
        </div>

        <div className="settings-switch-list">
          {MATCH_RESULT_FIELDS.map((field) => (
            <label className="settings-switch-row" key={field.key}>
              <span>{field.label}</span>
              <input
                type="checkbox"
                checked={draft.display.appleMusic[field.key]}
                onChange={(event) =>
                  updateDisplayField(field.key, event.target.checked)
                }
              />
            </label>
          ))}
        </div>
      </section>
    </SidePanel>
  );
}
