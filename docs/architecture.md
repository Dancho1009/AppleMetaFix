# AppleMetaFix Architecture

## Overview

AppleMetaFix is designed as a desktop metadata enhancement application.

## Modules

```
src/
├── main/
│   └── Electron main process
├── renderer/
│   └── React UI
├── scanner/
│   └── Audio metadata scanner
├── providers/
│   └── External metadata providers
├── matcher/
│   └── Matching and scoring engine
├── writer/
│   └── Metadata writer
└── database/
    └── Local SQLite database
```

## Metadata Matching

Candidate score proposal:

- Title similarity: 40%
- Artist similarity: 30%
- Album similarity: 15%
- Duration similarity: 10%
- ISRC match: 5%

Suggested actions:

- >=95: automatic recommendation
- 80-95: manual confirmation
- <80: ignore

## Providers

Initial provider:

- Apple Music

Future providers:

- MusicBrainz
- LRCLIB
- Other lyric providers
