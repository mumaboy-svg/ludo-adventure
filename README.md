# 飞行棋大冒险

这是一个双方向项目：

- **网页版**：放在 `web/`，入口为 `web/index.html`，适合本地浏览器打开或发布到 GitHub Pages。
- **微信小游戏版**：放在 `minigame/`，入口为 `minigame/game.js` / `minigame/game.json`，用微信开发者工具打开 `minigame/` 目录。

根目录的 `index.html` 只是跳转页，用于兼容 GitHub Pages 默认入口，会自动跳转到 `web/index.html`。

## 推荐打开方式

### 网页版

- 正式游戏入口：`web/index.html`
- 飞机棋子测试页：`web/tests/test_planes.html`
- 根目录跳转入口：`index.html`

### 微信小游戏版

- 微信开发者工具导入目录：`minigame/`
- 小游戏入口：`minigame/game.js`
- 小游戏配置：`minigame/game.json`
- 项目配置：`minigame/project.config.json`

## 当前目录结构

```text
.
├── index.html              # 根跳转页，自动跳转到 web/index.html
├── web/                    # 网页版方向
│   ├── index.html          # 网页版正式入口
│   ├── assets/             # 网页版素材
│   │   ├── audio/
│   │   └── images/
│   └── tests/              # 网页版测试页
├── minigame/               # 微信小游戏方向
│   ├── game.js             # 小游戏主逻辑
│   ├── game.json           # 小游戏运行配置
│   ├── project.config.json # 微信开发者工具项目配置
│   └── assets/             # 小游戏素材
├── docs/                   # 项目文档、更新流程、修改说明
├── templates/              # 更新公告模板
├── backups/                # 历史备份快照
└── archive/                # 旧版根文件、旧版小程序结构等归档
```

## 文件放置规则

### 网页版 `web/`

- 网页版主页面放在 `web/index.html`。
- 网页版图片素材放在 `web/assets/images/`。
- 网页版音频素材放在 `web/assets/audio/`。
- 网页版测试页放在 `web/tests/`。
- `web/index.html` 内部资源路径以 `./assets/...` 为准，移动素材时需要同步修改引用。

### 微信小游戏版 `minigame/`

- 用微信开发者工具打开 `minigame/` 目录，不要打开仓库根目录。
- 小游戏主文件为 `minigame/game.js` 和 `minigame/game.json`。
- 小游戏素材优先放在 `minigame/assets/minigame/`；目前代码中使用 `assets/minigame/...` 相对路径。
- `project.private.config.json` 是本机私有配置，不进入版本管理。

### 共享资料

- 项目记录、修改说明、更新流程放在 `docs/`。
- 发布公告模板放在 `templates/`。
- 历史备份放在 `backups/`。
- 不再直接使用、但暂时保留的旧文件放在 `archive/`。

## 当前素材

### 网页版

- 飞机棋子：`web/assets/images/plane_R.webp`、`plane_Y.webp`、`plane_B.webp`、`plane_G.webp`
- 首页 Logo：`web/assets/images/ui/title_logo.webp`
- 网页版首页背景：`web/assets/images/ui/home_bg_desktop.webp`
- 手机版首页背景：`web/assets/images/ui/home_bg_mobile.webp`
- 任务中心背景：`web/assets/images/ui/task_center_bg_desktop.webp`、`task_center_bg_mobile.webp`
- 设置页面背景：`web/assets/images/ui/settings_bg_desktop.webp`、`settings_bg_mobile.webp`
- 主菜单按钮底图：`web/assets/images/ui/button_continue.webp`、`button_new_game.webp`、`button_quick_start.webp`
- 主菜单按钮图标：`web/assets/images/ui/icon_continue.webp`、`icon_new_game.webp`、`icon_quick_start.webp`
- 骰子音效：`web/assets/audio/dice_roll.mp3`

### 微信小游戏版

- 小游戏棋子：`minigame/assets/minigame/images/plane_R.png` 等
- 小游戏 UI：`minigame/assets/minigame/ui/`
- 小游戏骰子音效：`minigame/assets/audio/dice_roll.mp3`

## 更新和发布流程

- 更新流程总则：`docs/更新流程.md`
- 发布检查表：`docs/release/发布检查表.md`
- 双端发布说明：`docs/release/发布说明.md`
- 更新日志：`CHANGELOG.md`
- 玩家公告模板：`templates/更新公告模板.md`

版本号采用 `主版本.功能版本.修订版本`：

- 重大玩法或存档不兼容更新：升级主版本，例如 `v2.0.0`
- 新功能或明显内容更新：升级功能版本，例如 `v1.1.0`
- Bug 修复和小调整：升级修订版本，例如 `v1.0.1`

## 发布说明

- GitHub Pages 若以仓库根目录发布，会先打开根目录 `index.html`，再跳转到 `web/index.html`。
- 如果发布平台允许指定发布目录，也可以直接将 `web/` 作为静态站点根目录。
- 微信小游戏发布请使用微信开发者工具导入 `minigame/`。
