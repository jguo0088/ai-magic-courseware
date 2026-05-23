const { GEMINI_IMAGE_MODEL, callGemini, extractImage, getUpstreamError, readBody, sendJson, sendOptions } = require("../lib/gemini");

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    sendOptions(response);
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readBody(request);
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
};
