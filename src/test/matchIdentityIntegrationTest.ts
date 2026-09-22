import { TrackIdentityAnalyzer } from "../services/TrackIdentityAnalyzer";
import { MatchIdentityPolicy } from "../services/MatchIdentityPolicy";

/**
 * 验证歌曲身份分析与风险策略组合行为。
 * 重点覆盖日系角色歌曲、多人成员版本场景。
 */
function main() {
  const analyzer = new TrackIdentityAnalyzer();
  const policy = new MatchIdentityPolicy();

  const cases = [
    {
      name: "同艺人版本",
      local: "Machico",
      remote: "Machico",
    },
    {
      name: "CV多人版本",
      local: "Machico",
      remote: "Tsubasa Ibuki (CV: Machico), Matsuri Tokugawa (CV: Ayaka Ohashi)",
    },
    {
      name: "完全不同艺人",
      local: "Machico",
      remote: "Unknown Artist",
    },
  ];

  for (const item of cases) {
    const identity = analyzer.analyze(item.local, item.remote);
    const penalty = policy.evaluate(identity);

    console.log(item.name, {
      identity,
      penalty,
    });
  }
}

main();
