# 蛋蛋便签

一个可常驻桌面的轻量便签 / 待办应用，支持简易模式与标准模式自由切换。

## 功能

- 混合条目：同一条记录可写笔记，也可标记为待办
- 日期筛选：按今日、指定日期浏览条目
- 标签分类：创建标签并按标签筛选
- 桌面常驻：默认置顶，半透明毛玻璃背景
- 设置面板：透明度 0–100%、置顶、开机启动、界面模式
- 本地存储：SQLite 持久化，数据保存在本机

## 环境要求

- Node.js 18+
- Rust（通过 [rustup](https://rustup.rs/) 安装）
- Visual Studio Build Tools（C++ 工具链，用于编译 Tauri）
- WebView2 Runtime（Windows 11 通常自带）

## Windows 环境检查

先运行：

```bash
npm run env:check
```

它会检查：

- `node` / `npm`
- `rustc` / `cargo`
- `cl.exe` / `link.exe`（普通 PATH 中可能缺失）
- Visual Studio 开发者命令环境（关键）
- WebView2 Runtime

如果检查缺少 C++ 工具链，运行：

```bash
npm run env:install-cpp
```

或手动安装：

```bash
winget install --id Microsoft.VisualStudio.2022.BuildTools --exact --accept-package-agreements --accept-source-agreements --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

安装完成后重新打开终端，再执行：

```bash
npm run env:check
```

说明：即使 `cl.exe` / `link.exe` 显示 `[MISSING]`，只要 `Visual Studio Dev Command` 为 `[OK]`，就可以继续。`desktop:dev` / `desktop:build` 会自动进入 VS 开发者命令环境。

## 开发

```bash
npm install
npm run desktop:dev
```

## 打包 / 运行

构建可执行文件（推荐，跳过安装包打包）：

```bash
npm run desktop:build
```

直接运行已构建的程序：

```bash
npm run desktop:run
```

生成安装包（NSIS，可能被本机应用控制策略拦截）：

```bash
npm run desktop:bundle
```

可执行文件位置：

```text
src-tauri/target/release/app.exe
```

## 使用说明

1. 点击左上角 `+ 新建` 创建条目
2. 右侧编辑标题、内容、日期、标签
3. 勾选“作为待办”后可标记完成
4. 点击标题栏设置按钮，可调整透明度、置顶和开机启动
