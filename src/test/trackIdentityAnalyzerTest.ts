import { TrackIdentityAnalyzer } from "../services/TrackIdentityAnalyzer";

const analyzer = new TrackIdentityAnalyzer();

const cases = [
  {
    name: "同艺人版本",
    local: "Machico",
    remote: "Machico",
  },
  {
    name: "CV角色多人版本",
    local: "Machico",
    remote: "Tsubasa Ibuki (CV: Machico), Matsuri Tokugawa",
  },
  {
    name: "完全不同艺人",
    local: "Machico",
    remote: "Unknown Artist",
  },
];

for (const item of cases) {
  console.log(item.name, analyzer.analyze(item.local, item.remote));
}
