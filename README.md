# AppleMetaFix

Apple Music based local music metadata enhancement tool.

## Goal

AppleMetaFix helps enhance local music libraries by matching local audio files with Apple Music metadata.

Planned features:

- Scan local music files
- Read existing metadata
- Search Apple Music catalog
- Match candidates with confidence score
- Preview metadata changes
- Write metadata back to files
- Download artwork
- Export synchronized lyrics when available

## Architecture

```
Local Music Files
        |
        v
Metadata Scanner
        |
        v
Apple Music Provider
        |
        v
Match Engine
        |
        v
Review & Write
```

## Development Roadmap

### Phase 1
- Electron + React + TypeScript foundation
- Audio metadata scanner
- Basic UI

### Phase 2
- Apple Music metadata search
- Matching algorithm

### Phase 3
- Tag writer
- Artwork management
- Lyrics processing

## License

MIT
