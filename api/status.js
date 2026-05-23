const { GEMINI_IMAGE_MODEL, GEMINI_TEXT_MODEL, getGeminiApiKey, sendJson, sendOptions } = require("../lib/gemini");

module.exports = function handler(request, response) {
  if (request.method === "OPTIONS") {
    sendOptions(response);
    return;
  }

  sendJson(response, 200, {
    provider: "gemini",
    geminiApiKeyConfigured: Boolean(getGeminiApiKey()),
    textModel: GEMINI_TEXT_MODEL,
    imageModel: GEMINI_IMAGE_MODEL
  });
};
