import { TrackIdentityResult } from "./TrackIdentityAnalyzer";

export interface IdentityPenaltyResult {
  penalty: number;
  reasons: string[];
}

/**
 * 根据歌曲身份分析结果调整匹配置信度。
 * 该策略独立于字段评分，避免将不同录音版本误判为高置信匹配。
 */
export class MatchIdentityPolicy {
  evaluate(identity: TrackIdentityResult): IdentityPenaltyResult {
    const reasons: string[] = [];
    let penalty = 0;

    if (identity.identity === "different_recording") {
      penalty += 40;
      reasons.push("检测到可能为不同录音版本");
    }

    if (identity.identity === "possible_version") {
      penalty += 15;
      reasons.push("检测到可能存在版本差异");
    }

    if (identity.artistMatch === "group") {
      penalty += 10;
      reasons.push("Apple Music结果包含多人演唱信息");
    }

    if (identity.artistMatch === "performer") {
      penalty += 10;
      reasons.push("本地艺人与Apple Music表演者关系不完全一致");
    }

    if (identity.versionRisk >= 50) {
      penalty += 10;
      reasons.push("版本风险较高");
    }

    return {
      penalty: Math.min(penalty, 60),
      reasons,
    };
  }
}
