import { TrackIdentityAnalyzer } from "../services/TrackIdentityAnalyzer";
import { MatchIdentityPolicy } from "../services/MatchIdentityPolicy";

function run() {
  const analyzer = new TrackIdentityAnalyzer();
  const policy = new MatchIdentityPolicy();

  const cases = [
    {
      name: "同一艺术家",
      local: "Machico",
      remote: "Machico",
    },
    {
      name: "角色多人演唱版本",
      local: "Machico",
      remote: "Tsubasa Ibuki (CV: Machico), Matsuri Tokugawa (CV: Ayaka Ohashi)",
    },
    {
      name: "不同艺术家",
      local: "Machico",
      remote: "Unknown Artist",
    },
  ];

  for (const item of cases) {
    const identity = analyzer.analyze(item.local, item.remote);
    const risk = policy.evaluate(identity);

    console.log(item.name, {
      identity,
      risk,
    });
  }
}

run();
