# AI魔法小助手课件网页

用于政立路小学一年级“庆六一 · 家长进课堂”的互动课件。

## 打开方式

普通预览：

```powershell
start .\index.html
```

启用 AI 画图：

```powershell
$env:GEMINI_API_KEY="你的 Gemini API Key"
node .\server.js
```

也可以用 Google 常见环境变量名：

```powershell
$env:GOOGLE_API_KEY="你的 Gemini API Key"
node .\server.js
```

切换图片模型：

```powershell
$env:GEMINI_API_KEY="你的 Gemini API Key"
$env:GEMINI_IMAGE_MODEL="gemini-3.1-flash-image-preview"
node .\server.js
```

然后在浏览器打开：

```text
http://localhost:3000
```

## 课堂环节

1. 小助手醒来啦
2. AI是什么
3. 三词故事机
4. 提示词魔法棒
5. AI画画
6. 一起创造小立立
7. AI小侦探
8. 礼品宝箱
9. 今日通关

## 说明

- 三词故事和简短提示词使用文字输入。
- 长画面咒语、小立立造型、奖项文本保留麦克风输入。
- 故事生成通过本地 `server.js` 调用 Gemini 文本模型，默认 `gemini-2.5-flash`。
- 图片生成通过本地 `server.js` 调用 Gemini 图片模型，默认 `gemini-2.5-flash-image`，可用 `GEMINI_IMAGE_MODEL` 切换。
- 故事、任务和总结支持浏览器朗读，并使用更高音调模拟亲切姐姐风格。
- Gemini API Key 不会写进前端页面。

## 固定保存 Gemini Key（推荐）

如果不想每次开新终端都重新输入环境变量，可以在项目根目录新建 `.env.local`：

```text
GEMINI_API_KEY=你的 Gemini API Key
```

然后重新启动服务：

```powershell
node .\server.js
```

打开 `http://localhost:3000/api/status`，看到 `geminiApiKeyConfigured:true` 就表示第8关图片生成可以使用。`.env.local` 已被 `.gitignore` 忽略，不会进入代码仓库。
