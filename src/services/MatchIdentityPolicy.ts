import { TrackIdentityResult } from "./TrackIdentityAnalyzer";

export interface IdentityPenaltyResult {
  penalty: number;
  reasons: string[];
  level: "none" | "warning" | "danger";
}

/**
 * 根据歌曲身份分析结果调整匹配置信度。
 * 独立于字段评分，避免不同录音版本因标题相同而获得过高分数。
 */
export class MatchIdentityPolicy {
  evaluate(identity: TrackIdentityResult): IdentityPenaltyResult {
    const reasons: string[] = [];
    let penalty = 0;

    if (identity.identity === "different_recording") {
      penalty += 45;
      reasons.push("检测到可能为不同录音版本");
    }

    if (identity.identity === "possible_version") {
      penalty += 15;
      reasons.push("检测到可能存在版本差异");
    }

    if (identity.artistMatch === "group") {
      penalty += 12;
      reasons.push("Apple Music结果包含多人演唱信息");
    }

    if (identity.artistMatch === "performer") {
      penalty += 12;
      reasons.push("本地艺人与Apple Music表演者关系不完全一致");
    }

    if (identity.versionRisk >= 70) {
      penalty += 15;
      reasons.push("版本风险较高");
    } else if (identity.versionRisk >= 50) {
      penalty += 8;
      reasons.push("存在版本风险");
    }

    const finalPenalty = Math.min(penalty, 60);

    return {
      penalty: finalPenalty,
      reasons,
      level:
        finalPenalty >= 40
          ? "danger"
          : finalPenalty > 0
            ? "warning"
            : "none",
    };
  }
}
