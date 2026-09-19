# AppleMetaFix 架构设计

## 项目概述

AppleMetaFix 是一个桌面端音乐元数据增强应用。

核心目标：

> 使用 Apple Music 等高质量数据源，对本地音乐文件进行识别、匹配、补全和修正。

## 整体架构

```
src/
├── main/
│   └── Electron 主进程
│
├── renderer/
│   └── React 用户界面
│
├── scanner/
│   └── 音频元数据扫描模块
│
├── providers/
│   └── 外部数据源接口
│
├── matcher/
│   └── 智能匹配与评分引擎
│
├── writer/
│   └── 音频标签写入模块
│
└── database/
    └── SQLite 本地数据库
```

## 核心工作流程

```
选择音乐目录
        |
        v
扫描音频文件
        |
        v
读取当前标签
        |
        v
搜索 Apple Music
        |
        v
计算匹配评分
        |
        v
用户确认
        |
        v
写回元数据
```

## 元数据匹配算法

候选歌曲评分：

| 项目 | 权重 |
|---|---:|
| 标题相似度 | 40% |
| 艺术家匹配 | 30% |
| 专辑匹配 | 15% |
| 时长匹配 | 10% |
| ISRC匹配 | 5% |

推荐策略：

- 95分以上：自动推荐
- 80-95分：人工确认
- 80分以下：忽略

## 数据提供器设计

初始数据源：

- Apple Music

未来支持：

- MusicBrainz
- LRCLIB
- 网易云音乐
- 其他歌词服务

## 安全设计

用户认证信息：

- media-user-token
- authorization token

不会直接写入源码。

计划使用系统安全存储：

- Windows Credential Manager
- macOS Keychain

## 后续扩展

未来可以作为独立服务被 Music_Organizer 调用：

```
AppleMetaFix
        |
        v
Music_Organizer
```
