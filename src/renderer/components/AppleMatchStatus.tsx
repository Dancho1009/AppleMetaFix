import React from "react";

export default function AppleMatchStatus({ match }: { match?: any }) {
  if (!match) {
    return <span className="dashboard-tag">未匹配</span>;
  }

  const confidence = match.confidence || "unknown";
  const score = match.score ?? 0;

  return (
    <div className="apple-match-status">
      <span>Apple Music</span>
      <span>{score}%</span>
      <span>{confidence}</span>
    </div>
  );
}
