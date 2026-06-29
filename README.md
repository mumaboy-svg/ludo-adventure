# 飞行棋大冒险

这是一个单文件 HTML 为主的飞行棋 + 大冒险游戏项目，支持本地直接打开，也适合发布到 GitHub Pages。

## 推荐打开方式

- 正式游戏入口：`index.html`
- 飞机棋子测试页：`tests/test_planes.html`

## 目录结构

```text
.
├── index.html              # 正式游戏页面，GitHub Pages 默认入口
├── assets/
│   ├── audio/              # 游戏音效
│   └── images/             # 棋子、图片素材
├── docs/                   # 项目记录、修改说明、设计说明
└── tests/                  # 测试页、展示页、临时验证页面
```

## 文件放置规则

- 游戏主页面放在项目根目录，优先使用 `index.html`，方便 GitHub Pages 直接访问。
- 图片素材放在 `assets/images/`。
- 音频素材放在 `assets/audio/`。
- 说明文档、更新记录、对话记录放在 `docs/`。
- 临时测试页面和素材预览页面放在 `tests/`。

## 当前素材

- 飞机棋子：`assets/images/plane_R.png`、`plane_Y.png`、`plane_B.png`、`plane_G.png`
- 首页 Logo：`assets/images/ui/title_logo.png`
- 网页版首页背景：`assets/images/ui/home_bg_desktop.png`
- 手机版首页背景：`assets/images/ui/home_bg_mobile.png`
- 任务中心背景：`assets/images/ui/task_center_bg_desktop.png`、`task_center_bg_mobile.png`
- 主菜单按钮底图：`assets/images/ui/button_continue.png`、`button_new_game.png`、`button_quick_start.png`
- 主菜单按钮图标：`assets/images/ui/icon_continue.png`、`icon_new_game.png`、`icon_quick_start.png`
- 额外素材：`assets/images/红色小飞机.png`
- 骰子音效：`assets/audio/dice_roll.mp3`

## 更新和发布流程

- 更新流程总则：`docs/更新流程.md`
- 发布检查表：`docs/release/发布检查表.md`
- 更新日志：`CHANGELOG.md`
- 玩家公告模板：`templates/更新公告模板.md`

版本号采用 `主版本.功能版本.修订版本`：

- 重大玩法或存档不兼容更新：升级主版本，例如 `v2.0.0`
- 新功能或明显内容更新：升级功能版本，例如 `v1.1.0`
- Bug 修复和小调整：升级修订版本，例如 `v1.0.1`

## 发布说明

如果发布到 GitHub Pages，仓库根目录下的 `index.html` 会作为默认首页。不要把正式入口移动到子目录，否则需要重新配置 Pages 或链接路径。
