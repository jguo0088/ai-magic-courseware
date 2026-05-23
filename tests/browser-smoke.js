const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const edgePath = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
].find((item) => fs.existsSync(item));

if (!edgePath) {
  console.log("browser smoke skipped: Microsoft Edge not found");
  process.exit(0);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const userData = path.join(root, ".edge-cdp-temp");
  const browser = childProcess.spawn(
    edgePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--remote-debugging-port=9333",
      `--user-data-dir=${userData}`,
      "http://localhost:3000"
    ],
    { stdio: "ignore" }
  );

  try {
    await delay(1600);
    const tabs = await (await fetch("http://127.0.0.1:9333/json")).json();
    const pageTarget = tabs.find((tab) => tab.type === "page") || tabs[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let messageId = 0;
    const pending = new Map();

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    };

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    const send = (method, params = {}) =>
      new Promise((resolve) => {
        messageId += 1;
        pending.set(messageId, resolve);
        ws.send(JSON.stringify({ id: messageId, method, params }));
      });

    const evaluate = async (expression) => {
      const response = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
      if (response.result.exceptionDetails) {
        throw new Error(JSON.stringify(response.result.exceptionDetails, null, 2));
      }
      return response.result.result.value;
    };

    const waitFor = async (expression, timeoutMs = 5000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        if (await evaluate(expression)) return true;
        await delay(150);
      }
      return false;
    };

    await send("Runtime.enable");
    await send("Page.enable");
    await send("Page.navigate", { url: "http://localhost:3000" });
    assert.equal(await waitFor(`Boolean(document.querySelector('#lifeExampleImage')?.src && document.querySelector('.slide.is-active h2')?.textContent)`), true);
    await evaluate(`document.querySelector('#coverStart')?.click()`);
    await delay(1050);
    assert.equal(await evaluate(`document.querySelector('#courseCover')?.classList.contains('is-hidden')`), true);

    const home = JSON.parse(
      await evaluate(`JSON.stringify({
        title: document.querySelector('.slide.is-active h2')?.textContent,
        hasLifeImage: Boolean(document.querySelector('#lifeExampleImage')?.src),
        magicButtonRemoved: !document.querySelector('#icebreakerSpark') || getComputedStyle(document.querySelector('#icebreakerSpark')).display === 'none'
      })`)
    );
    assert.match(home.title, /开场破冰/);
    assert.equal(home.hasLifeImage, true);
    assert.equal(home.magicButtonRemoved, true);

    await evaluate(`document.querySelector('[data-jump="8"]').click()`);
    await delay(250);
    await evaluate(`document.querySelector('#buildGame').click()`);
    await delay(250);
    await evaluate(`window.__finishMemorySpell && window.__finishMemorySpell()`);
    await delay(100);
    await evaluate(`document.querySelector('#nextGameScene').click()`);
    await delay(250);
    const game = JSON.parse(
      await evaluate(`JSON.stringify({
        title: document.querySelector('#memoryTitle')?.textContent,
        status: document.querySelector('#memoryStatus')?.textContent,
        cards: document.querySelectorAll('.memory-card').length,
        feedback: document.querySelector('#gameFeedback')?.textContent
      })`)
    );
    assert.match(game.title, /记忆翻牌/);
    assert.equal(/H5/.test(game.title), false);
    assert.equal(game.cards, 12);
    assert.ok(game.status);
    assert.ok(game.feedback && game.feedback.length > 0);

    await evaluate(`document.querySelector('[data-jump="9"]').click()`);
    await delay(250);
    await evaluate(`document.querySelector('.detective-vote[data-vote="no"]').click()`);
    await delay(250);
    const detective = JSON.parse(
      await evaluate(`JSON.stringify({
        title: document.querySelector('.slide.is-active h2')?.textContent,
        feedback: document.querySelector('#detectiveNewFeedback')?.textContent
      })`)
    );
    assert.match(detective.title, /对不对/);
    assert.ok(detective.feedback && detective.feedback.length > 0);

    await evaluate(`document.querySelector('[data-jump="10"]').click()`);
    await delay(250);
    await evaluate(`document.querySelector('#fraudNext').click()`);
    await delay(100);
    await evaluate(`document.querySelector('[data-fraud-answer="ai"]').click()`);
    await delay(250);
    const fraud = JSON.parse(
      await evaluate(`JSON.stringify({
        title: document.querySelector('.slide.is-active h2')?.textContent,
        image: document.querySelector('#fraudImage')?.getAttribute('src'),
        feedback: document.querySelector('#fraudFeedback')?.textContent,
        correct: document.querySelector('#fraudImageFrame')?.classList.contains('is-correct')
      })`)
    );
    assert.match(fraud.title, /AI图片/);
    assert.match(fraud.image, /ai2\.png/);
    assert.equal(fraud.correct, true);
    assert.ok(fraud.feedback && fraud.feedback.length > 0);

    await evaluate(`document.querySelector('#fraudImage').click()`);
    await delay(100);
    const fullscreenOpen = await evaluate(`document.querySelector('#imageFullscreenOverlay')?.classList.contains('is-open')`);
    assert.equal(fullscreenOpen, true);
    await evaluate(`document.querySelector('#imageFullscreenImg').click()`);
    await delay(100);
    const fullscreenClosed = await evaluate(`!document.querySelector('#imageFullscreenOverlay')?.classList.contains('is-open')`);
    assert.equal(fullscreenClosed, true);

    ws.close();
    console.log("browser smoke checks passed");
  } finally {
    browser.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
