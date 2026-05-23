const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(response, status, payload) {
  setCors(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function sendOptions(response) {
  setCors(response);
  response.statusCode = 204;
  response.end();
}

function readBody(request) {
  if (request.body && typeof request.body === "object") {
    return Promise.resolve(request.body);
  }

  if (typeof request.body === "string") {
    try {
      return Promise.resolve(JSON.parse(request.body || "{}"));
    } catch {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("请求内容太长。"));
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
    request.on("error", reject);
  });
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

async function callGemini(model, prompt, mode) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("还没有配置 GEMINI_API_KEY，AI生成暂时不能使用。");
  }

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

module.exports = {
  GEMINI_TEXT_MODEL,
  GEMINI_IMAGE_MODEL,
  callGemini,
  extractImage,
  extractText,
  getGeminiApiKey,
  getUpstreamError,
  readBody,
  sendJson,
  sendOptions
};
