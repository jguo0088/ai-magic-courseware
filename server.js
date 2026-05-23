const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = __dirname;
const port = Number(process.env.PORT || 3000);

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(root, fileName);
    if (!fs.existsSync(envPath)) continue;

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex <= 0) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      const rawValue = trimmed.slice(equalsIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnv();

const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8"
};

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  response.end(JSON.stringify(payload));
}

function sendCorsPreflight(response) {
  response.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  });
  response.end();
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("请求内容太长"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function parseJsonFromText(text) {
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function makeGeminiBody(prompt, mode) {
  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  if (mode === "image") {
    body.generationConfig = {
      responseModalities: ["TEXT", "IMAGE"]
    };
  }

  return body;
}

async function callGeminiWithFetch(apiKey, model, prompt, mode) {
  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeGeminiBody(prompt, mode))
    }
  );

  const payload = await upstream.json();
  return { ok: upstream.ok, status: upstream.status, payload };
}

function callGeminiWithPowerShell(model, prompt, mode) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(root, "scripts", "gemini-generate.ps1");
    const inputPath = path.join(root, ".gemini-request.json");
    fs.writeFileSync(inputPath, JSON.stringify({ model, prompt, mode }), "utf8");
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-InputPath", inputPath],
      { cwd: root, windowsHide: true }
    );
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      fs.rm(inputPath, { force: true }, () => {});
      if (code !== 0) {
        const payload = parseJsonFromText(stderr);
        if (payload) {
          resolve({ ok: false, status: code || 500, payload });
          return;
        }

        reject(new Error(stderr.trim() || `Gemini request failed with exit code ${code}`));
        return;
      }

      try {
        resolve({ ok: true, status: 200, payload: JSON.parse(stdout) });
      } catch (error) {
        reject(new Error(`Gemini response was not JSON: ${error.message}`));
      }
    });

    child.stdin.end();
  });
}

async function callGemini(model, prompt, mode) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("还没有配置 GEMINI_API_KEY，AI生成暂时不能使用。");
  }

  try {
    return await callGeminiWithFetch(apiKey, model, prompt, mode);
  } catch {
    return callGeminiWithPowerShell(model, prompt, mode);
  }
}

function extractText(payload) {
  return (payload.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
}

function extractImage(payload) {
  for (const candidate of payload.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const inlineData = part.inlineData || part.inline_data;
      const data = inlineData?.data;
      const mimeType = inlineData?.mimeType || inlineData?.mime_type || "image/png";

      if (data) {
        return `data:${mimeType};base64,${data}`;
      }
    }
  }

  return "";
}

function getUpstreamError(payload, fallback) {
  return payload.error?.message || fallback;
}

function makeFallbackStory(words) {
  const [first, second, third] = words;
  return `六一这天，${first}发现了一艘闪闪发光的${second}。它坐上去飞到星星旁边，遇见了好多好朋友。大家一起分享${third}，笑声像小铃铛一样，把教室都点亮了。`;
}

async function generateStory(request, response) {
  try {
    const body = JSON.parse((await readBody(request)) || "{}");
    const words = Array.isArray(body.words) ? body.words.map((word) => String(word).trim()).filter(Boolean) : [];

    if (words.length < 3) {
      sendJson(response, 400, { error: "请先写满三个词语。" });
      return;
    }

    const prompt = [
      "请给小学一年级小朋友写一个适合六一课堂朗读的中文短故事。",
      `必须自然出现这三个词：${words.join("、")}。`,
      "故事要可爱、有画面感、积极温暖，控制在120字以内。",
      "只输出故事正文，不要标题，不要解释。"
    ].join("\n");

    const result = await callGemini(GEMINI_TEXT_MODEL, prompt, "text");
    if (!result.ok) {
      sendJson(response, result.status, { error: getUpstreamError(result.payload, "故事生成失败。") });
      return;
    }

    let story = extractText(result.payload);
    if (!story) {
      sendJson(response, 502, { error: "Gemini没有返回故事文字。" });
      return;
    }

    if (!words.every((word) => story.includes(word))) {
      story = makeFallbackStory(words);
    }

    story = story.replace(/\s+/g, " ").trim();
    if (story.length > 100) {
      story = `${story.slice(0, 100).replace(/[，。！？、；：,.!?;:]+$/, "")}。`;
    }

    sendJson(response, 200, { story });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "故事生成失败。" });
  }
}

async function generateImage(request, response) {
  try {
    const body = JSON.parse((await readBody(request)) || "{}");
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      sendJson(response, 400, { error: "请先写下画面咒语。" });
      return;
    }

    const result = await callGemini(GEMINI_IMAGE_MODEL, prompt, "image");
    if (!result.ok) {
      sendJson(response, result.status, { error: getUpstreamError(result.payload, "图片生成失败。") });
      return;
    }

    const image = extractImage(result.payload);
    if (!image) {
      sendJson(response, 502, { error: "Gemini没有返回图片。" });
      return;
    }

    sendJson(response, 200, { image });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "图片生成失败。" });
  }
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    sendCorsPreflight(response);
    return;
  }

  if (request.method === "GET" && request.url === "/api/status") {
    sendJson(response, 200, {
      provider: "gemini",
      geminiApiKeyConfigured: Boolean(getGeminiApiKey()),
      textModel: GEMINI_TEXT_MODEL,
      imageModel: GEMINI_IMAGE_MODEL
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/generate-story") {
    generateStory(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/generate-image") {
    generateImage(request, response);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`AI courseware running at http://localhost:${port}`);
});
