(() => {
  const colors = ["#ffd76a", "#ff7d6e", "#7bd8b8", "#43a4f4", "#d7c6ff"];
  const apiBaseUrl = location.protocol === "file:" ? "http://localhost:3000" : "";
  let sprinkleLastAt = 0;
  let audioContext = null;
  let activeLifeExample = "xiaoai";
  let learningAppleCount = 0;
  let detectiveIndex = 0;
  let fraudIndex = 0;
  let memoryState = null;
  let memoryCodeTimer = null;
  let memoryCountdownTimer = null;

  const lifeExamples = {
    xiaoai: { title: "小爱同学", img: "./images/life-xiaoai-real.jpg", text: "它能听见我们的声音，再帮我们回答问题。" },
    vacuum: { title: "扫地机器人", img: "./images/life-vacuum-real.png", text: "它会一边走一边看路线，把地面打扫干净。" },
    car: { title: "智能汽车", img: "./images/life-car-real.jpg", text: "它会看路、看灯、看周围，但仍然需要人来检查。" }
  };

  const memoryAnimals = ["🐶", "🐱", "🐰", "🐼", "🦊", "🐸"];
  const memoryPrompt = "请帮我写一个适合一年级小学生的记忆翻牌小游戏。页面上有12张卡片，每张卡片是一个可爱的动物Emoji。游戏开始时，所有动物展示10秒钟，然后自动翻面变成问号。点击任意一张卡片，可以重新翻开看到动物。界面要大，色彩鲜艳，充满童趣，有动态效果及音效。";
  const fraudImages = ["./images/ai1.png", "./images/ai2.png", "./images/ai3.png", "./images/ai4.png"];

  const detectiveCases = [
    {
      question: "AI看图说：这只手有5根手指。对吗？",
      answer: "no",
      tip: "不对。图片里是6根手指，AI少数了一根。",
      visual: "fingers"
    },
    {
      question: "AI说：9.11 比 9.8 大。对吗？",
      answer: "no",
      tip: "不对。9.8可以看成9.80，9.80比9.11大。",
      visual: "number"
    },
    {
      question: "我想去洗车，洗车店距离我家50米。应该开车去还是走路去？AI说：走路去更合适。对吗？",
      answer: "yes",
      tip: "对。50米很近，走过去通常更方便，也更安全。",
      visual: "carwash"
    }
  ];

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function playTone(type = "tap") {
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioContext) audioContext = new AudioCtor();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const tones = { tap: [520, 760], good: [660, 990], wrong: [260, 180], magic: [523, 784] };
      const [start, end] = tones[type] || tones.tap;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(start, now);
      oscillator.frequency.exponentialRampToValueAtTime(end, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(type === "wrong" ? 0.026 : 0.035, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch {
      // Audio is decorative; browsers may block it before user interaction.
    }
  }

  function speakFeedback(text) {
    try {
      if (!("speechSynthesis" in window) || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 0.95;
      utterance.pitch = 1.35;
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find((voice) => /zh|Chinese|Mandarin|Xiaoxiao|Tingting/i.test(`${voice.lang} ${voice.name}`)) || null;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Voice feedback is a classroom flourish; keep the click flow working if blocked.
    }
  }

  function sparkle() {
    document.body.classList.remove("sparkle-now");
    document.body.offsetHeight;
    document.body.classList.add("sparkle-now");
  }

  function showCoverLaunch() {
    const burst = document.createElement("div");
    burst.className = "cover-launch-burst";
    burst.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 30; index += 1) {
      const item = document.createElement("span");
      item.style.setProperty("--x", `${Math.cos(index * 0.84) * (80 + (index % 5) * 22)}px`);
      item.style.setProperty("--y", `${Math.sin(index * 0.84) * (70 + (index % 6) * 20)}px`);
      item.style.setProperty("--delay", `${index * 18}ms`);
      item.style.setProperty("--color", colors[index % colors.length]);
      burst.appendChild(item);
    }
    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), 1200);
  }

  function addGlobalButtonSounds() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("button")) playTone("tap");
    }, true);
  }

  function cursorSprinkles() {
    document.body.classList.add("has-cursor-sprinkles");
    document.addEventListener("pointermove", (event) => {
      const now = Date.now();
      if (now - sprinkleLastAt < 45) return;
      sprinkleLastAt = now;
      const dot = document.createElement("span");
      const shape = ["dot", "star", "heart"][Math.floor(Math.random() * 3)];
      dot.className = `cursor-sprinkle ${shape}`;
      dot.style.setProperty("--sprinkle-x", `${event.clientX - 8}px`);
      dot.style.setProperty("--sprinkle-y", `${event.clientY - 8}px`);
      dot.style.setProperty("--drift-x", `${Math.round((Math.random() - 0.5) * 54)}px`);
      dot.style.setProperty("--drift-y", `${-28 - Math.round(Math.random() * 34)}px`);
      dot.style.setProperty("--sprinkle-rotate", `${Math.round(Math.random() * 180)}deg`);
      dot.style.setProperty("--sprinkle-color", colors[Math.floor(Math.random() * colors.length)]);
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 900);
    });
  }

  function setupImageFullscreen() {
    if (!qs("#imageFullscreenOverlay")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        '<div class="image-fullscreen-overlay" id="imageFullscreenOverlay" aria-hidden="true"><img id="imageFullscreenImg" alt="放大图片"></div>'
      );
    }
    const overlay = qs("#imageFullscreenOverlay");
    const fullImage = qs("#imageFullscreenImg");
    document.addEventListener("click", (event) => {
      const clickedImage = event.target.closest(".slide img");
      if (!clickedImage || event.target.closest("#imageFullscreenOverlay")) return;
      if (!clickedImage.currentSrc && !clickedImage.src) return;
      fullImage.src = clickedImage.currentSrc || clickedImage.src;
      fullImage.alt = clickedImage.alt || "放大图片";
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      event.preventDefault();
      event.stopPropagation();
      playTone("tap");
    }, true);
    overlay.addEventListener("click", () => {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      fullImage.removeAttribute("src");
      playTone("tap");
    });
  }

  function removeAction(selector) {
    qs(selector)?.classList.add("is-removed");
  }

  function hideApplauseStep() {
    qs('[data-step="11"]')?.classList.add("is-hidden-step");
    qs('[data-jump="11"]')?.classList.add("is-hidden");
    qs('[data-step="13"]')?.classList.add("is-hidden-step");
    qs('[data-jump="13"]')?.classList.add("is-hidden");
    if (window.showStep) window.showStep(0);
  }

  function setupCourseCover() {
    const cover = qs("#courseCover");
    const start = qs("#coverStart");
    if (!cover || !start) return;
    start.addEventListener("pointerenter", () => playTone("tap"));
    start.addEventListener("click", () => {
      cover.classList.add("is-launching");
      playTone("magic");
      sparkle();
      showCoverLaunch();
      window.setTimeout(() => {
        cover.classList.add("is-hidden");
        if (window.showStep) window.showStep(0);
      }, 880);
    });
  }

  function setupIcebreaker() {
    const slide = qs('[data-step="0"]');
    if (!slide) return;
    slide.classList.add("two-column-refresh", "icebreaker-refresh", "compact-slide");
    slide.querySelector("h2").textContent = "开场破冰：生活里哪些东西像会思考？";
    slide.querySelector(".lead").textContent = "点一点左边的生活小伙伴，右边会出现它的AI小本领。";
    removeAction("#icebreakerSpark");
    removeAction(".icebreaker-slide .play-button");
    qs(".hidden-ai")?.remove();
    qs(".costume-card")?.remove();
    qsa(".life-examples article", slide).forEach((card, index) => {
      const key = ["xiaoai", "vacuum", "car"][index];
      card.dataset.lifeExample = key;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.addEventListener("click", () => setLifeExample(key));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setLifeExample(key);
        }
      });
    });
    const board = qs(".icebreaker-stage", slide);
    if (board) {
      board.className = "life-picture-board";
      board.innerHTML = '<img id="lifeExampleImage" alt="生活里的AI例子"><strong id="lifeExampleTitle"></strong><p id="lifeExampleText"></p>';
      setLifeExample(activeLifeExample);
    }
  }

  function setLifeExample(key) {
    activeLifeExample = key;
    const data = lifeExamples[key] || lifeExamples.xiaoai;
    const image = qs("#lifeExampleImage");
    if (image) {
      image.src = data.img;
      image.alt = data.title;
    }
    if (qs("#lifeExampleTitle")) qs("#lifeExampleTitle").textContent = data.title;
    if (qs("#lifeExampleText")) qs("#lifeExampleText").textContent = data.text;
    qsa("[data-life-example]").forEach((item) => item.classList.toggle("is-active", item.dataset.lifeExample === key));
    playTone("good");
    sparkle();
  }

  function setupWelcome() {
    const slide = qs('[data-step="1"]');
    if (!slide) return;
    slide.classList.add("welcome-refresh", "compact-slide");
    removeAction("#sparkMagic");
    removeAction(".welcome-slide .play-button");
    slide.querySelector("h2").textContent = "选一个喜欢的小伙伴陪你闯关。";
    slide.querySelector(".lead").textContent = "点一个卡通小助手，它会变成右下角的悬浮小伙伴。";
  }

  function setupConcept() {
    const slide = qs('[data-step="2"]');
    if (!slide) return;
    slide.classList.add("two-column-refresh", "concept-refresh", "compact-slide");
    removeAction('[data-step="2"] .play-button');
    slide.querySelector("h2").textContent = "AI是什么：会听、会变、也会出错。";
    slide.querySelector(".lead").textContent = "点左边三个按钮，右边会换成对应图示。";
  }

  function setupLearning() {
    const slide = qs('[data-step="3"]');
    if (!slide) return;
    slide.classList.add("stage-wide", "learning-refresh", "compact-slide");
    const copy = qs(".slide-copy", slide);
    qs(".learning-board", slide)?.remove();
    if (!copy) return;
    copy.innerHTML = `
      <p class="step-label">第4关 · AI怎么学习</p>
      <h2>AI训练小实验：喂得越认真，猜得越准。</h2>
      <p class="lead">AI不是天生就会认苹果。我们先喂苹果图片，再用“像苹果的西红柿”考一考它。</p>
      <div class="training-lab">
        <div class="training-left">
          <div class="training-meter"><span>训练进度</span><b id="trainingMeter"></b></div>
          <div class="training-bot" id="trainingBot">
            <span class="bot-eye"></span><span class="bot-eye"></span>
            <strong id="botGuess">我还没学会，可能会乱猜。</strong>
          </div>
          <p class="learning-feedback" id="learningFeedback">先连续喂几次正确的苹果图片。</p>
        </div>
        <div class="training-actions">
          <button class="learning-choice" data-training="apple"><img class="training-photo" src="./images/train-red-apple.jpg" alt="">喂正确：红苹果</button>
          <button class="learning-choice" data-training="apple"><img class="training-photo" src="./images/train-green-apple.jpg" alt="">喂正确：绿苹果</button>
          <button class="learning-choice" data-training="apple"><img class="training-photo" src="./images/train-bitten-apple.jpg" alt="">喂正确：咬过的苹果</button>
          <button class="learning-choice is-tricky" data-training="tomato"><img class="training-photo" src="./images/train-tomato-real.jpg" alt="">考一考：像苹果的西红柿</button>
        </div>
      </div>
    `;
    qsa("[data-training]", slide).forEach((button) => {
      button.addEventListener("click", () => trainAi(button.dataset.training, button));
    });
  }

  function trainAi(kind, button) {
    qsa("[data-training]").forEach((item) => item.classList.remove("is-picked"));
    button.classList.add("is-picked");
    const meter = qs("#trainingMeter");
    const botGuess = qs("#botGuess");
    const feedback = qs("#learningFeedback");
    const bot = qs("#trainingBot");
    bot?.classList.remove("is-good-data", "is-bad-data");
    bot?.classList.add("is-thinking");
    setTimeout(() => bot?.classList.remove("is-thinking"), 520);
    if (kind === "apple") {
      learningAppleCount = Math.min(learningAppleCount + 1, 3);
      if (meter) meter.style.width = `${[0, 34, 67, 100][learningAppleCount]}%`;
      bot?.classList.add("is-good-data");
      const message =
          learningAppleCount === 1
            ? "我看到一个苹果了，但还不太确定。"
            : learningAppleCount === 2
              ? "我发现苹果常常圆圆的、有果柄。"
              : "我看过好几种苹果了，现在更会认苹果。";
      if (botGuess) botGuess.textContent = message;
      if (feedback) feedback.textContent = "正确数据进来了！AI慢慢学会找共同点。";
      playTone("good");
      speakFeedback(message);
      sparkle();
      return;
    }
    const earlyMistake = learningAppleCount < 3;
    bot?.classList.add("is-bad-data");
    const message = earlyMistake ? "它红红圆圆的，我可能会误认成苹果！" : "它有点像苹果，但叶子和形状不一样，更像西红柿。";
    if (botGuess) botGuess.textContent = message;
    if (feedback) feedback.textContent = earlyMistake ? "明显出错啦：训练不够时，AI容易把相似的东西认错。" : "训练更多以后，再加上检查，AI就更容易分清楚。";
    playTone(earlyMistake ? "wrong" : "good");
    speakFeedback(message);
  }

  function setupStory() {
    const slide = qs('[data-step="4"]');
    if (!slide) return;
    slide.querySelector("h2").textContent = "选三个词，AI变出一个小故事。";
    slide.querySelector(".lead").textContent = "请全班一起投票选三个词。选中的词会亮起来，然后点“变故事”。";
    qs(".word-inputs", slide)?.classList.add("is-removed");
    qs(".word-bank", slide)?.classList.add("refresh-word-bank");
  }

  function setupPromptDuel() {
    const slide = qs('[data-step="5"]');
    if (!slide) return;
    slide.classList.add("stage-wide", "compact-slide", "prompt-duel-slide");
    slide.innerHTML = `
      <div class="slide-copy">
        <p class="step-label">第6关 · 提示词魔法棒</p>
        <h2>说得越清楚，画面越接近想象。</h2>
        <p class="lead">左边只说一句，右边把颜色、地点、动作、风格都说清楚。点生成，比一比两张图。</p>
        <div class="prompt-duel">
          <article class="prompt-duel-card simple">
            <h3>普通指令</h3>
            <p class="prompt-text" id="simpleCatPrompt">画一只小猫。</p>
            <div class="duel-image-frame">
              <img id="simpleCatImage" alt="普通指令生成的小猫">
              <div class="cartoon-loader mini-loader" id="simpleCatLoading" aria-hidden="true"><div class="loader-bot"><span></span><span></span></div><p>左边正在画...</p></div>
            </div>
            <button class="primary-action" id="generateSimpleCat">生成左边</button>
          </article>
          <article class="prompt-duel-card magic">
            <h3>魔法指令</h3>
            <p class="prompt-text" id="magicCatPrompt">画一只橙色小猫，戴着黄色星星帽，在彩旗教室里和小机器人跳舞，画面明亮可爱，卡通风格。</p>
            <div class="duel-image-frame">
              <img id="magicCatImage" alt="详细指令生成的小猫">
              <div class="cartoon-loader mini-loader" id="magicCatLoading" aria-hidden="true"><div class="loader-bot"><span></span><span></span></div><p>右边正在画...</p></div>
            </div>
            <button class="primary-action" id="generateMagicCat">生成右边</button>
          </article>
        </div>
      </div>
    `;
    const simpleCatBackendPrompt = "画一只小猫。严格要求：画面里只能有一只小猫，不能出现第二只动物、人物、玩具、食物、家具、文字、装饰物、星星、彩旗、机器人或其他额外元素；纯白背景；小猫完整居中；简单可爱卡通风格。";
    qs("#generateSimpleCat")?.addEventListener("click", () => requestImage(simpleCatBackendPrompt, "#simpleCatImage", "#simpleCatLoading"));
    qs("#generateMagicCat")?.addEventListener("click", () => requestImage(`${qs("#magicCatPrompt").textContent} 适合小学一年级课堂，构图完整，色彩明亮。`, "#magicCatImage", "#magicCatLoading"));
  }

  async function requestImage(prompt, selector, loadingSelector) {
    const image = qs(selector);
    const loader = loadingSelector ? qs(loadingSelector) : null;
    if (!image) return;
    image.classList.remove("is-visible");
    loader?.classList.add("is-visible");
    try {
      const response = await fetch(`${apiBaseUrl}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const payload = await response.json();
      if (!response.ok || !payload.image) throw new Error(payload.error || "图片生成失败");
      image.src = payload.image;
      image.classList.add("is-visible");
      playTone("magic");
      sparkle();
    } catch (error) {
      alert(error.message || "图片生成失败，请检查 Gemini API Key。");
    } finally {
      loader?.classList.remove("is-visible");
    }
  }

  function setupArtDetectivePrompt() {
    const prompt = qs("#artPrompt");
    if (prompt) {
      prompt.value = "请画一张可爱卡通课堂侦探图：画面里有3只小猫戴帽子，其中2顶帽子是红色、1顶帽子是蓝色；黑板上写着大大的数字5；桌上有4颗星星贴纸。";
    }
    const slide = qs('[data-step="6"]');
    if (slide) {
      slide.querySelector("h2").textContent = "AI画画：我们来当小侦探找细节。";
      slide.querySelector(".lead").textContent = "这张图里有数量、颜色、文字和一个小错误。生成后，请小朋友们一起找出来。";
    }
    qs("#generateImage")?.addEventListener("click", requestArtDetectiveImage, true);
  }

  async function requestArtDetectiveImage(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const visiblePrompt = qs("#artPrompt")?.value || "";
    const hiddenPrompt = `${visiblePrompt} 后台要求：请故意加入一个小错误，把其中一只小猫画成小狗，但不要在画面上写出错误说明。`;
    await requestImage(hiddenPrompt, "#generatedImage", "#imageLoading");
  }

  function setupLili() {
    const preview = qs("#liliPreview");
    if (!preview) return;
    preview.classList.add("refresh-lili");
    const svg = qs("#liliPreview > svg");
    if (svg) svg.outerHTML = '<img class="lili-default-img" src="./images/lili-default.svg" alt="默认小立立">';
    const prompt = qs("#liliPrompt");
    if (prompt) prompt.value = "政立路小学卡通形象小立立，头戴栗子帽，长着大眼睛和红脸蛋，造型非常萌，戴红领巾，举着AI星星魔法棒，笑得很开心，完整角色，站在明亮的小学教室里，背景有黑板、课桌、六一彩旗和温暖阳光，可爱卡通风格。";
  }

  function selectedSceneKeys() {
    const keys = qsa("[data-game-scene].is-selected").map((button) => button.dataset.gameScene);
    return keys.length ? keys.slice(0, 3) : ["rainbow", "forest", "space"];
  }

  function setupMazeGame() {
    const slide = qs('[data-step="8"]');
    if (!slide) return;
    slide.classList.add("refresh-game", "memory-game-slide", "compact-slide");
    const copy = qs(".slide-copy", slide);
    const panel = qs(".game-panel", slide);
    if (copy) {
      copy.querySelector(".step-label").textContent = "第9关 · AI生成记忆翻牌";
      copy.querySelector("h2").textContent = "一键施法，现场变出小游戏。";
      copy.querySelector(".lead").textContent = "先点“一键施法”，看AI快速写代码。生成完毕后点“运行/预览”，全班一起记住小动物的位置。";
      qs(".scene-picker", copy)?.classList.add("is-removed");
      const actionRow = qs(".action-row", copy);
      if (actionRow) {
        actionRow.classList.add("memory-actions");
        qs("#buildGame", actionRow).textContent = "一键施法";
        const previewButton = qs("#nextGameScene", actionRow);
        previewButton.textContent = "运行 / 预览";
        previewButton.disabled = true;
      }
      if (!qs(".memory-spell-card", copy)) {
        if (actionRow) {
          actionRow.insertAdjacentHTML("beforebegin", memorySpellMarkup());
        } else {
          copy.insertAdjacentHTML("beforeend", memorySpellMarkup());
        }
      }
    }
    if (panel) {
      panel.innerHTML = `
        <div class="game-head"><p id="memoryTitle">记忆翻牌小游戏</p><strong id="memoryStatus">待施法</strong></div>
        <div class="memory-workbench">
          <section class="memory-code-panel" aria-label="AI生成代码">
            <div class="code-header"><span></span><span></span><span></span><strong id="codeStatus">等待一键施法</strong></div>
            <div class="spell-progress"><b id="spellProgress"></b></div>
            <pre id="memoryCode">// 点击“一键施法”，AI会开始写小游戏代码。</pre>
          </section>
          <section class="memory-preview-panel" aria-label="游戏预览">
            <div class="memory-stage" id="memoryStage">
              <div class="memory-start-card">
                <strong>见证奇迹</strong>
                <p>代码生成后，点击“运行 / 预览”。</p>
              </div>
            </div>
          </section>
        </div>
        <p class="game-feedback" id="gameFeedback">第一步：点“一键施法”，让AI写一个记忆翻牌小游戏。</p>
      `;
    }
    qs("#buildGame")?.addEventListener("click", beginMemorySpell, true);
    qs("#nextGameScene")?.addEventListener("click", previewMemoryGame, true);
    window.__finishMemorySpell = finishMemorySpell;
  }

  function memorySpellMarkup() {
    return `
      <article class="memory-spell-card">
        <strong>给AI的魔法指令</strong>
        <p>${memoryPrompt}</p>
      </article>
    `;
  }

  function beginMemorySpell(event) {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    clearInterval(memoryCodeTimer);
    clearInterval(memoryCountdownTimer);
    memoryState = { generated: false, cards: [], showingAll: false, countdown: 10 };
    const buildButton = qs("#buildGame");
    const previewButton = qs("#nextGameScene");
    if (buildButton) buildButton.disabled = true;
    if (previewButton) previewButton.disabled = true;
    qs("#memoryStatus").textContent = "施法中";
    qs("#codeStatus").textContent = "AI正在写代码...";
    qs("#gameFeedback").textContent = "AI正在写H5代码，大约10秒。小朋友们可以一起倒数。";
    qs("#memoryStage").innerHTML = '<div class="memory-start-card is-loading"><strong>AI正在写代码</strong><p>卡片、动画、音效正在准备...</p></div>';
    playTone("magic");
    const lines = [
      "const animals = ['🐶','🐱','🐰','🐼','🦊','🐸'];",
      "shuffle([...animals, ...animals]);",
      "showCardsForFiveSeconds();",
      "card.onclick = () => flipAnimal(card);",
      "playCuteSound('pop');",
      "renderBigColorfulH5Game();"
    ];
    let tick = 0;
    memoryCodeTimer = setInterval(() => {
      tick += 1;
      const progress = Math.min(100, tick * 5);
      qs("#spellProgress").style.width = `${progress}%`;
      qs("#memoryCode").textContent = lines.slice(0, Math.min(lines.length, Math.ceil(tick / 3))).join("\n");
      if (tick >= 20) finishMemorySpell();
    }, 500);
  }

  function finishMemorySpell() {
    clearInterval(memoryCodeTimer);
    if (!qs("#memoryCode")) return;
    memoryState = { generated: true, cards: [], showingAll: false, countdown: 10 };
    qs("#spellProgress").style.width = "100%";
    qs("#memoryStatus").textContent = "已生成";
    qs("#codeStatus").textContent = "代码生成完毕";
    qs("#memoryCode").textContent = [
      "const cards = createAnimalCards(12);",
      "showAllCards(10);",
      "setTimeout(hideAllCards, 10000);",
      "cards.forEach(card => card.onclick = flipCard);",
      "startMemoryChallenge();"
    ].join("\n");
    qs("#memoryStage").innerHTML = '<div class="memory-start-card is-ready"><strong>代码写好了</strong><p>点击“运行 / 预览”，右侧马上出现小游戏。</p></div>';
    qs("#gameFeedback").textContent = "第二步：代码生成完毕。点击“运行 / 预览”，见证奇迹。";
    const buildButton = qs("#buildGame");
    const previewButton = qs("#nextGameScene");
    if (buildButton) buildButton.disabled = false;
    if (previewButton) previewButton.disabled = false;
    playTone("good");
    sparkle();
  }

  function previewMemoryGame(event) {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    if (!memoryState?.generated) {
      qs("#gameFeedback").textContent = "先点“一键施法”，等AI把代码写完。";
      playTone("wrong");
      return;
    }
    startMemoryGame();
  }

  function startMemoryGame() {
    clearInterval(memoryCountdownTimer);
    const cards = shuffle([...memoryAnimals, ...memoryAnimals]).map((animal, index) => ({
      animal,
      id: `${animal}-${index}`,
      revealed: true
    }));
    memoryState = { generated: true, cards, showingAll: true, countdown: 10 };
    qs("#memoryStatus").textContent = "记忆10秒";
    qs("#gameFeedback").textContent = "看一看：12个小动物亮起来了！大家快记住位置，10、9、8、7、6、5、4、3、2、1！";
    renderMemoryCards();
    playTone("magic");
    memoryCountdownTimer = setInterval(() => {
      memoryState.countdown -= 1;
      qs("#memoryStatus").textContent = `${memoryState.countdown} 秒`;
      qs("#gameFeedback").textContent = `大家快盯住屏幕，记住小动物的位置！${memoryState.countdown}！`;
      if (memoryState.countdown <= 0) {
        clearInterval(memoryCountdownTimer);
        memoryState.showingAll = false;
        memoryState.cards.forEach((card) => { card.revealed = false; });
        qs("#memoryStatus").textContent = "开始猜";
        qs("#gameFeedback").textContent = "藏起来了！谁记得左上角第一个“？”下面是什么动物？";
        renderMemoryCards();
        playTone("good");
      }
    }, 1000);
  }

  function renderMemoryCards() {
    const stage = qs("#memoryStage");
    if (!stage || !memoryState) return;
    stage.innerHTML = `
      <div class="memory-countdown">${memoryState.showingAll ? memoryState.countdown : "?"}</div>
      <div class="memory-card-grid">
        ${memoryState.cards.map((card, index) => `<button class="memory-card ${card.revealed ? "is-revealed" : ""}" data-memory-index="${index}"><span>${card.revealed ? card.animal : "?"}</span></button>`).join("")}
      </div>
    `;
    qsa(".memory-card", stage).forEach((button) => button.addEventListener("click", () => revealMemoryCard(button)));
  }

  function revealMemoryCard(button) {
    if (!memoryState || memoryState.showingAll) return;
    const index = Number(button.dataset.memoryIndex);
    const card = memoryState.cards[index];
    if (!card || card.revealed) return;
    card.revealed = true;
    button.classList.add("is-revealed");
    button.innerHTML = `<span>${card.animal}</span>`;
    qs("#gameFeedback").textContent = `翻开啦！这张卡片下面是 ${card.animal}`;
    playTone("good");
    sparkle();
  }

  function shuffle(items) {
    return items
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item);
  }

  function setupDetective() {
    const slide = qs('[data-step="9"]');
    if (!slide) return;
    slide.classList.add("refresh-detective", "compact-slide");
    const copy = qs(".slide-copy", slide);
    if (copy) {
      copy.querySelector(".step-label").textContent = "第10关 · AI真假判断员";
      copy.querySelector("h2").textContent = "AI说得对不对？全班一起判断。";
      copy.querySelector(".lead").textContent = "";
      qs(".detective-actions", copy)?.remove();
    }
    const card = qs(".detective-card", slide);
    if (card) {
      card.innerHTML = `
        <div class="detective-scene-card">
          <p class="card-title">小侦探题目</p>
          <div class="detective-big-visual" id="detectiveVisual"></div>
          <button class="secondary-action" id="nextDetectiveCase">换一题</button>
        </div>
        <div class="detective-board-new">
          <div class="detective-ai-answer" id="detectiveQuestion"></div>
          <div class="detective-votes"><button class="detective-vote" data-vote="yes">对</button><button class="detective-vote" data-vote="no">不对</button></div>
          <p class="detective-feedback" id="detectiveNewFeedback">先举手投票，再点答案。</p>
        </div>
      `;
    }
    qsa(".detective-vote").forEach((button) => button.addEventListener("click", () => answerDetective(button)));
    qs("#nextDetectiveCase")?.addEventListener("click", () => {
      detectiveIndex = (detectiveIndex + 1) % detectiveCases.length;
      renderDetectiveCase();
    });
    renderDetectiveCase();
  }

  function detectiveSvg(type) {
    const common = '<rect width="300" height="210" rx="24" fill="#fff"/>';
    if (type === "fingers") return '<img src="./images/six-fingers-photo.jpg" alt="六根手指图片">';
    if (type === "number") return `<svg viewBox="0 0 300 210">${common}<text x="92" y="96" text-anchor="middle" font-size="44" font-weight="900" fill="#ff7d6e">9.11</text><text x="207" y="96" text-anchor="middle" font-size="44" font-weight="900" fill="#43a4f4">9.8</text><text x="150" y="154" text-anchor="middle" font-size="22" font-weight="800" fill="#253047">9.8 = 9.80</text></svg>`;
    return `<svg viewBox="0 0 300 210">${common}<rect x="40" y="104" width="118" height="54" rx="18" fill="#ff9ac2" stroke="#253047" stroke-width="6"/><circle cx="68" cy="164" r="16" fill="#253047"/><circle cx="132" cy="164" r="16" fill="#253047"/><path d="M196 72h46l28 42h-74z" fill="#dff7ff" stroke="#253047" stroke-width="6"/><path d="M186 114h90v42h-90z" fill="#ffd76a" stroke="#253047" stroke-width="6"/><path d="M58 72h88" stroke="#7bd8b8" stroke-width="12" stroke-linecap="round" stroke-dasharray="2 20"/><text x="150" y="196" text-anchor="middle" font-size="20" font-weight="800" fill="#253047">50米，很近</text></svg>`;
  }

  function renderDetectiveCase() {
    const item = detectiveCases[detectiveIndex];
    qs("#detectiveQuestion").textContent = item.question;
    qs("#detectiveVisual").innerHTML = detectiveSvg(item.visual);
    qs("#detectiveNewFeedback").textContent = "先举手投票，再点答案。";
    qsa(".detective-vote").forEach((button) => button.classList.remove("is-right", "is-wrong"));
  }

  function answerDetective(button) {
    const item = detectiveCases[detectiveIndex];
    const right = button.dataset.vote === item.answer;
    qsa(".detective-vote").forEach((vote) => vote.classList.remove("is-right", "is-wrong"));
    button.classList.add(right ? "is-right" : "is-wrong");
    qs("#detectiveNewFeedback").textContent = right ? item.tip : "再想一想：AI到底哪里没检查好？";
    playTone(right ? "good" : "wrong");
    if (right) sparkle();
  }

  function setupAiFraud() {
    const slide = qs('[data-step="10"]');
    if (!slide) return;
    slide.classList.add("ai-fraud-refresh", "compact-slide");
    const title = qs("h2", slide);
    const lead = qs(".lead", slide);
    if (title) title.textContent = "AI图片很逼真，我们要学会辨别。";
    if (lead) lead.textContent = "有些图片看起来像真的，但可能是AI生成的。遇到奇怪、吓人、要钱、要密码的图片，先停一停，问大人，别急着相信。";
    qs("#fraudPrev")?.addEventListener("click", () => switchFraudImage(-1));
    qs("#fraudNext")?.addEventListener("click", () => switchFraudImage(1));
    qsa("[data-fraud-answer]", slide).forEach((button) => {
      button.addEventListener("click", () => answerFraud(button));
    });
    renderFraudImage();
  }

  function renderFraudImage() {
    const image = qs("#fraudImage");
    const feedback = qs("#fraudFeedback");
    const frame = qs("#fraudImageFrame");
    if (image) {
      image.src = fraudImages[fraudIndex];
      image.alt = `AI图片辨别练习第${fraudIndex + 1}张`;
    }
    frame?.classList.remove("is-correct", "is-wrong");
    qsa("[data-fraud-answer]").forEach((button) => button.classList.remove("is-right", "is-wrong"));
    if (feedback) feedback.textContent = `第${fraudIndex + 1}张：看一看细节，再猜一猜它是不是AI图片。`;
  }

  function switchFraudImage(direction) {
    fraudIndex = (fraudIndex + direction + fraudImages.length) % fraudImages.length;
    renderFraudImage();
    playTone("tap");
  }

  function answerFraud(button) {
    const isRight = button.dataset.fraudAnswer === "ai";
    const frame = qs("#fraudImageFrame");
    const feedback = qs("#fraudFeedback");
    qsa("[data-fraud-answer]").forEach((item) => item.classList.remove("is-right", "is-wrong"));
    button.classList.add(isRight ? "is-right" : "is-wrong");
    frame?.classList.remove("is-correct", "is-wrong");
    frame?.classList.add(isRight ? "is-correct" : "is-wrong");
    if (feedback) {
      feedback.textContent = isRight
        ? "判断正确！这是一张AI图片。看到太逼真的图片，也要先想一想、查一查。"
        : "再想一想：这张图片是AI生成的，不能只看一眼就相信。";
    }
    playTone(isRight ? "good" : "wrong");
    if (isRight) sparkle();
  }

  function setupPass() {
    const slide = qs('[data-step="12"]');
    if (!slide) return;
    slide.classList.add("stage-wide", "compact-slide", "pass-refresh");
    slide.innerHTML = `
      <div class="slide-copy">
        <p class="step-label">第12关 · 今日通关</p>
        <h2>今天我们学会了五件重要的事。</h2>
        <div class="pass-card-grid">
          <article><span class="pass-icon ask-icon" aria-hidden="true"></span><strong>说清楚</strong><p>想让AI帮忙，要把要求讲明白。</p></article>
          <article><span class="pass-icon imagine-icon" aria-hidden="true"></span><strong>会想象</strong><p>AI可以帮我们写故事、画图、做游戏。</p></article>
          <article><span class="pass-icon learn-icon" aria-hidden="true"></span><strong>AI也要学习</strong><p>AI看过很多例子，才会慢慢变得更会认、更会答。</p></article>
          <article><span class="pass-icon check-icon" aria-hidden="true"></span><strong>要检查</strong><p>AI也会犯错，重要内容要自己看一看。</p></article>
          <article><span class="pass-icon shield-icon" aria-hidden="true"></span><strong>要防欺诈</strong><p>AI图片可能很逼真，遇到要钱要密码先问大人。</p></article>
        </div>
      </div>
      <div class="certificate">
        <p>恭喜通关</p>
        <strong>AI小小指挥家</strong>
        <span>会提问 · 会想象 · 会检查</span>
        <div class="badge-gift" aria-label="通关礼物"><b></b><em>通关礼物</em></div>
      </div>
    `;
  }

  function setupFinal() {
    const slide = qs('[data-step="13"]');
    if (!slide) return;
    slide.classList.add("final-refresh", "compact-slide");
    slide.innerHTML = `
      <div class="final-wide">
        <p class="step-label">第13关 · 我们都是小魔法师</p>
        <h2>未来的AI魔法，也可以由你们创造。</h2>
        <div class="final-bottom">
          <div class="chant-spell"><strong>全班一起念</strong><p>AI AI，好好学习，天天向上！</p></div>
          <article class="final-challenge"><span>课后小挑战</span><strong>问AI一个奇妙问题</strong><p>如果长颈鹿戴领带，应该戴在哪里？听完答案，再和爸爸妈妈一起判断它有没有道理。</p></article>
        </div>
      </div>
    `;
  }

  function init() {
    setupCourseCover();
    addGlobalButtonSounds();
    cursorSprinkles();
    setupImageFullscreen();
    setupIcebreaker();
    setupWelcome();
    setupConcept();
    setupLearning();
    setupStory();
    setupPromptDuel();
    setupArtDetectivePrompt();
    setupLili();
    setupMazeGame();
    setupDetective();
    setupAiFraud();
    hideApplauseStep();
    setupPass();
    setupFinal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
