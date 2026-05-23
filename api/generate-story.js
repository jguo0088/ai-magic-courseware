const { GEMINI_TEXT_MODEL, callGemini, extractText, getUpstreamError, readBody, sendJson, sendOptions } = require("../lib/gemini");

function makeFallbackStory(words) {
  const [first, second, third] = words;
  return `六一这天，${first}发现了一艘闪闪发光的${second}。它坐上去飞到星星旁边，遇见了好多好朋友。大家一起分享${third}，笑声像小铃铛一样，把教室都点亮了。`;
}

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
    const words = Array.isArray(body.words) ? body.words.map((word) => String(word).trim()).filter(Boolean) : [];

    if (words.length < 3) {
      sendJson(response, 400, { error: "请先选满三个词语。" });
      return;
    }

    const prompt = [
      "请给小学一年级小朋友写一个适合六一课堂朗读的中文短故事。",
      `必须自然出现这三个词：${words.join("、")}。`,
      "故事要可爱、有画面感、积极温暖，控制在100字以内。",
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
};
