const slides = Array.from(document.querySelectorAll(".slide"));
const tabs = Array.from(document.querySelectorAll(".tab"));
const progressBar = document.querySelector("#progressBar");
const stepNow = document.querySelector("#stepNow");
const stepTotal = document.querySelector("#stepTotal");
const prevButton = document.querySelector("#prevSlide");
const nextButton = document.querySelector("#nextSlide");

let currentStep = 0;
let activeRecognition = null;
let magicScene = null;
let audioContext = null;
let selectedMascot = "";
let currentDetectiveAnswer = "listen";
let awardIndex = 0;
let lastMascotHoverAt = 0;
const selectedWords = new Set(["小兔子", "月亮船", "草莓蛋糕"]);

const apiBaseUrl = location.protocol === "file:" ? "http://localhost:3000" : "";
const mascotNames = {
  robot: "蓝耳小智",
  bunny: "云朵兔兔",
  kitten: "橘子小猫"
};
const awardKinds = ["kind-question", "kind-imagine", "kind-check", "kind-prompt", "kind-command"];
const awardPool = ["最会提问奖", "最有想象力奖", "最认真检查奖", "最清楚指令奖", "AI小小指挥官"];
const conceptImages = {
  listen: {
    title: "AI在听",
    src: "./images/ai-listen.svg",
    alt: "AI正在听小朋友说话的卡通图"
  },
  draw: {
    title: "AI在变",
    src: "./images/ai-draw.svg",
    alt: "AI把词语变成故事和图画的卡通图"
  },
  mistake: {
    title: "AI会错",
    src: "./images/ai-mistake.svg",
    alt: "AI需要小侦探帮忙检查错误的卡通图"
  }
};
const gameScenes = {
  rainbow: {
    title: "彩虹操场",
    theme: "rainbow",
    prompt: "把中文和操场里的好朋友连起来。",
    pairs: [
      { id: "ball", left: "球", right: "ball", picture: "ball-picture" },
      { id: "bag", left: "书包", right: "bag", picture: "bag-picture" },
      { id: "run", left: "跑步", right: "run", picture: "run-picture" }
    ]
  },
  forest: {
    title: "糖果森林",
    theme: "forest",
    prompt: "小立立闻到甜甜的味道啦，找出水果和点心。",
    pairs: [
      { id: "apple", left: "苹果", right: "apple", picture: "apple-picture" },
      { id: "banana", left: "香蕉", right: "banana", picture: "banana-picture" },
      { id: "cake", left: "蛋糕", right: "cake", picture: "cake-picture" }
    ]
  },
  space: {
    title: "星星太空",
    theme: "space",
    prompt: "小立立飞到太空，帮它找到星星朋友。",
    pairs: [
      { id: "star", left: "星星", right: "star", picture: "star-picture" },
      { id: "moon", left: "月亮", right: "moon", picture: "moon-picture" },
      { id: "rocket", left: "火箭", right: "rocket", picture: "rocket-picture" }
    ]
  },
  ocean: {
    title: "海底泡泡",
    theme: "ocean",
    prompt: "泡泡飘起来啦，把海底朋友连起来。",
    pairs: [
      { id: "fish", left: "小鱼", right: "fish", picture: "fish-picture" },
      { id: "shell", left: "贝壳", right: "shell", picture: "shell-picture" },
      { id: "bubble", left: "泡泡", right: "bubble", picture: "bubble-picture" }
    ]
  },
  library: {
    title: "魔法图书馆",
    theme: "library",
    prompt: "书架亮起来了，找到学习小伙伴。",
    pairs: [
      { id: "book", left: "书", right: "book", picture: "book-picture" },
      { id: "pen", left: "笔", right: "pen", picture: "pen-picture" },
      { id: "lamp", left: "台灯", right: "lamp", picture: "lamp-picture" }
    ]
  },
  moon: {
    title: "月亮小船",
    theme: "moon",
    prompt: "月亮船出发，连起夜空里的好朋友。",
    pairs: [
      { id: "boat", left: "小船", right: "boat", picture: "boat-picture" },
      { id: "cloud", left: "云朵", right: "cloud", picture: "cloud-picture" },
      { id: "sleep", left: "睡觉", right: "sleep", picture: "sleep-picture" }
    ]
  }
};
let selectedGameScenes = ["rainbow", "forest", "space"];
let currentGameSceneIndex = 0;
const selectedMatchCards = {
  left: null,
  middle: null,
  right: null
};
let matchedCount = 0;

function playUiSound(type = "tap") {
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;

    if (!audioContext) {
      audioContext = new AudioCtor();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies = {
      hover: [660, 880],
      tap: [740, 1040],
      magic: [523, 784]
    };
    const [startFrequency, endFrequency] = frequencies[type] || frequencies.tap;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(type === "hover" ? 0.018 : 0.035, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch {
    // Some browsers block audio until user interaction; the UI should stay smooth.
  }
}

function showStep(step) {
  const direction = step >= currentStep ? 1 : -1;
  currentStep = Math.max(0, Math.min(step, slides.length - 1));

  while (slides[currentStep]?.classList.contains("is-hidden-step")) {
    const nextStep = currentStep + direction;
    if (nextStep < 0 || nextStep >= slides.length) break;
    currentStep = nextStep;
  }

  const visibleSlides = slides.filter((slide) => !slide.classList.contains("is-hidden-step"));
  const visibleIndex = visibleSlides.indexOf(slides[currentStep]);

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === currentStep);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", Number(tab.dataset.jump) === currentStep);
  });

  stepNow.textContent = String(Math.max(visibleIndex, 0) + 1);
  if (stepTotal) {
    stepTotal.textContent = String(visibleSlides.length || slides.length);
  }
  progressBar.style.width = `${((Math.max(visibleIndex, 0) + 1) / (visibleSlides.length || slides.length)) * 100}%`;
  prevButton.disabled = !slides.slice(0, currentStep).some((slide) => !slide.classList.contains("is-hidden-step"));
  nextButton.disabled = !slides.slice(currentStep + 1).some((slide) => !slide.classList.contains("is-hidden-step"));
}

function getValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("当前浏览器不支持朗读功能，建议使用 Chrome 或 Edge。");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
  const voices = window.speechSynthesis.getVoices();
  const cuteVoice =
    voices.find((voice) => voice.lang.toLowerCase().startsWith("zh") && /female|xiaoxiao|xiaoyi|huihui|tingting|yaoyao|meijia|hanhan/i.test(voice.name)) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("zh"));

  if (cuteVoice) {
    utterance.voice = cuteVoice;
  }

  utterance.lang = "zh-CN";
  utterance.rate = 0.9;
  utterance.pitch = 1.45;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function readFromSelector(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  speakText(target.innerText || target.value || target.textContent);
}

function showMagicBurst() {
  const burst = document.querySelector("#magicBurst");
  if (!burst) return;

  burst.classList.remove("is-active");
  burst.offsetHeight;
  burst.classList.add("is-active");
  sparkle();
  setTimeout(() => burst.classList.remove("is-active"), 900);
}

function showFullMagic() {
  const fullMagic = document.querySelector("#fullMagic");
  if (!fullMagic) return;

  fullMagic.classList.remove("is-active");
  fullMagic.offsetHeight;
  fullMagic.classList.add("is-active");
  setTimeout(() => fullMagic.classList.remove("is-active"), 1800);
}

function updateFloatingMascot() {
  const floating = document.querySelector("#floatingMascot");
  if (!floating) return;
  if (!selectedMascot) {
    floating.className = "floating-mascot";
    floating.querySelector("p").textContent = "";
    return;
  }

  floating.className = `floating-mascot ${selectedMascot} is-visible`;
  floating.querySelector("p").textContent = mascotNames[selectedMascot] || "小助手";
}

function selectMascot(mascot) {
  selectedMascot = mascot.dataset.mascot || "robot";
  document.querySelectorAll("[data-mascot]").forEach((item) => {
    item.classList.toggle("is-selected", item === mascot);
  });
  updateFloatingMascot();
  showMagicBurst();
  showFullMagic();
  speakText(`${mascot.dataset.name}来陪你闯关啦`);
}

function setConceptVisual(type) {
  const visual = document.querySelector("#conceptVisual");
  const title = document.querySelector("#conceptTitle");
  const conceptImage = document.querySelector("#conceptImage");
  if (!visual || !title || !conceptImage) return;

  const concept = conceptImages[type] || conceptImages.listen;
  visual.className = `concept-visual is-${type}`;
  title.textContent = concept.title;
  conceptImage.src = concept.src;
  conceptImage.alt = concept.alt;
  playUiSound("tap");
}

function syncWordInputs() {
  const words = Array.from(selectedWords).slice(0, 3);
  ["word1", "word2", "word3"].forEach((id, index) => {
    const input = document.querySelector(`#${id}`);
    if (input && words[index]) {
      input.value = words[index];
    }
  });
}

function toggleWordChip(button) {
  const word = button.dataset.word;
  if (!word) return;

  if (selectedWords.has(word)) {
    selectedWords.delete(word);
    button.classList.remove("is-selected");
  } else {
    if (selectedWords.size >= 3) {
      const first = selectedWords.values().next().value;
      selectedWords.delete(first);
      const oldButton = document.querySelector(`[data-word="${first}"]`);
      oldButton?.classList.remove("is-selected");
    }
    selectedWords.add(word);
    button.classList.add("is-selected");
  }

  syncWordInputs();
  playUiSound("tap");
}

function announceMascotHover(mascot) {
  const now = Date.now();
  if (now - lastMascotHoverAt < 1800) return;

  lastMascotHoverAt = now;
  playUiSound("hover");
  speakText("选我选我");
  mascot.classList.add("is-selected");
  setTimeout(() => {
    if (mascot.dataset.mascot !== selectedMascot) {
      mascot.classList.remove("is-selected");
    }
  }, 650);
}

function setLoading(selector, isLoading) {
  const loader = document.querySelector(selector);
  if (!loader) return;

  loader.classList.toggle("is-visible", isLoading);
  loader.setAttribute("aria-hidden", String(!isLoading));
}

async function makeStory() {
  const chipWords = Array.from(selectedWords).slice(0, 3);
  const words = chipWords.length === 3 ? chipWords : [getValue("word1"), getValue("word2"), getValue("word3")].filter(Boolean);
  const storyOutput = document.querySelector("#storyOutput");

  if (words.length < 3) {
    alert("请先写满三个词语。");
    return;
  }

  setLoading("#storyLoading", true);

  try {
    const response = await fetch(`${apiBaseUrl}/api/generate-story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "故事生成失败");
    }

    storyOutput.textContent = payload.story;
    sparkle();
  } catch (error) {
    storyOutput.textContent = "故事暂时没有生成成功，请稍后再试。";
    const message =
      error.message === "Failed to fetch"
        ? "没有连上本地Gemini服务。请先运行 node server.js，再用 http://localhost:3000 打开课件。"
        : error.message || "故事生成失败，请检查本地服务和 Gemini API Key。";
    alert(message);
  } finally {
    setLoading("#storyLoading", false);
  }
}

function buildPrompt() {
  const hero = getValue("hero") || "小猫";
  const color = getValue("color") || "可爱的";
  const place = getValue("place") || "教室";
  const action = getValue("action") || "开心玩耍";
  const mood = getValue("mood") || "开心";
  document.querySelector("#promptOutput").textContent =
    `请画一只${color}${hero}，在${place}里${action}，心情${mood}，画面明亮、可爱、适合一年级小朋友。`;
  sparkle();
}

async function requestImage(prompt, imageSelector, loadingSelector) {
  const image = document.querySelector(imageSelector);
  setLoading(loadingSelector, true);

  try {
    const response = await fetch(`${apiBaseUrl}/api/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "图片生成失败");
    }

    image.src = payload.image;
    image.classList.add("is-visible");
    sparkle();
  } catch (error) {
    const message =
      error.message === "Failed to fetch"
        ? "没有连上本地Gemini服务。请先运行 node server.js，再用 http://localhost:3000 打开课件。"
        : error.message || "图片生成失败，请检查本地服务和 Gemini API Key。";
    alert(message);
  } finally {
    setLoading(loadingSelector, false);
  }
}

function generateClassImage() {
  const prompt = `${getValue("artPrompt")} 明亮、童趣、柔和线条、适合小学一年级课堂大屏展示。`;
  requestImage(prompt, "#generatedImage", "#imageLoading");
}

function generateLili() {
  const prompt = `${getValue("liliPrompt")} 保持基础形象：头戴栗子帽，长着大眼睛和红脸蛋，造型非常萌。角色完整居中，背景是明亮温暖的小学教室，有黑板、课桌、六一彩旗和柔和阳光，亲切可爱，不出现真实校徽，不包含可读文字。`;
  requestImage(prompt, "#liliImage", "#liliLoading");
}

function updateGameScenePicker() {
  document.querySelectorAll("[data-game-scene]").forEach((button) => {
    button.classList.toggle("is-selected", selectedGameScenes.includes(button.dataset.gameScene));
  });
}

function toggleGameScene(button) {
  const scene = button.dataset.gameScene;
  if (!scene) return;

  if (selectedGameScenes.includes(scene)) {
    if (selectedGameScenes.length <= 1) {
      document.querySelector("#gameFeedback").textContent = "至少留一个地方给小立立冒险哦。";
    } else {
      selectedGameScenes = selectedGameScenes.filter((item) => item !== scene);
    }
  } else {
    if (selectedGameScenes.length >= 3) {
      selectedGameScenes.shift();
    }
    selectedGameScenes.push(scene);
  }

  updateGameScenePicker();
  playUiSound("tap");
}

function syncGameLiliImage() {
  const liliImage = document.querySelector("#liliImage");
  const gameImage = document.querySelector("#gameLiliImage");
  const gameLili = document.querySelector(".game-lili");
  if (!gameImage || !gameLili) return;

  if (liliImage?.src && liliImage.classList.contains("is-visible")) {
    gameImage.src = liliImage.src;
    gameLili.classList.add("has-custom-lili");
  } else {
    gameLili.classList.remove("has-custom-lili");
  }
}

function cardMarkup(pair, side) {
  if (side === "left") {
    return `<button class="matching-card" data-match-side="left" data-match-id="${pair.id}">${pair.left}</button>`;
  }
  if (side === "middle") {
    return `<button class="matching-card english-card" data-match-side="middle" data-match-id="${pair.id}">${pair.right}</button>`;
  }
  return `<button class="matching-card picture-card" data-match-side="right" data-match-id="${pair.id}"><span class="mini-picture ${pair.picture}"></span></button>`;
}

function renderGameScene() {
  const sceneKey = selectedGameScenes[currentGameSceneIndex] || selectedGameScenes[0] || "rainbow";
  const scene = gameScenes[sceneKey] || gameScenes.rainbow;
  const stage = document.querySelector("#gameStage");
  const leftColumn = document.querySelector("#leftMatchCards");
  const englishColumn = document.querySelector("#englishMatchCards");
  const pictureColumn = document.querySelector("#pictureMatchCards");
  const lines = document.querySelector("#matchLines");
  if (!stage || !leftColumn || !englishColumn || !pictureColumn || !lines) return;

  matchedCount = 0;
  clearSelectedMatchCards();
  stage.className = `game-stage theme-${scene.theme}`;
  document.querySelector("#gameSceneTitle").textContent = scene.title;
  document.querySelector("#gameScore").textContent = `${currentGameSceneIndex + 1} / ${selectedGameScenes.length}`;
  document.querySelector("#gameFeedback").textContent = scene.prompt;
  lines.innerHTML =
    '<defs><linearGradient id="rainbowLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ff7d6e"/><stop offset="0.35" stop-color="#ffd76a"/><stop offset="0.7" stop-color="#7bd8b8"/><stop offset="1" stop-color="#43a4f4"/></linearGradient></defs>';
  leftColumn.innerHTML = scene.pairs.map((pair) => cardMarkup(pair, "left")).join("");
  englishColumn.innerHTML = [...scene.pairs].reverse().map((pair) => cardMarkup(pair, "middle")).join("");
  pictureColumn.innerHTML = [scene.pairs[1], scene.pairs[2], scene.pairs[0]].map((pair) => cardMarkup(pair, "right")).join("");
  document.querySelectorAll(".matching-card").forEach((card) => {
    card.addEventListener("click", () => handleMatchCard(card));
  });
  syncGameLiliImage();
}

function buildRainbowGame() {
  if (selectedGameScenes.length === 0) {
    selectedGameScenes = ["rainbow"];
  }
  currentGameSceneIndex = 0;
  updateGameScenePicker();
  renderGameScene();
  sparkle();
  playUiSound("magic");
}

function drawMatchLine(leftCard, rightCard) {
  const stage = document.querySelector("#gameStage");
  const lines = document.querySelector("#matchLines");
  if (!stage || !lines) return;

  const stageRect = stage.getBoundingClientRect();
  const leftRect = leftCard.getBoundingClientRect();
  const rightRect = rightCard.getBoundingClientRect();
  const x1 = leftRect.right - stageRect.left;
  const y1 = leftRect.top + leftRect.height / 2 - stageRect.top;
  const x2 = rightRect.left - stageRect.left;
  const y2 = rightRect.top + rightRect.height / 2 - stageRect.top;
  lines.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const middle = (x1 + x2) / 2;
  line.setAttribute("d", `M ${x1} ${y1} C ${middle} ${y1 - 22}, ${middle} ${y2 + 22}, ${x2} ${y2}`);
  line.setAttribute("class", "rainbow-match-line");
  lines.appendChild(line);
}

function clearSelectedMatchCards() {
  Object.keys(selectedMatchCards).forEach((side) => {
    selectedMatchCards[side]?.classList.remove("is-picked");
    selectedMatchCards[side] = null;
  });
}

function flashMatchCards(cards, className) {
  cards.forEach((card) => card.classList.add(className));
  setTimeout(() => {
    cards.forEach((card) => card.classList.remove(className, "is-picked"));
  }, 560);
}

function handleMatchCard(card) {
  if (card.disabled) return;

  const side = card.dataset.matchSide;
  if (!side || !Object.prototype.hasOwnProperty.call(selectedMatchCards, side)) return;

  if (selectedMatchCards[side] === card) {
    card.classList.remove("is-picked");
    selectedMatchCards[side] = null;
    return;
  }

  selectedMatchCards[side]?.classList.remove("is-picked");
  selectedMatchCards[side] = card;
  card.classList.add("is-picked");
  playUiSound("tap");

  const selectedSides = ["left", "middle", "right"];
  if (!selectedSides.every((item) => selectedMatchCards[item])) {
    document.querySelector("#gameFeedback").textContent = "还差一点：请把汉字、英语、图形三张卡都点出来。";
    return;
  }

  const leftCard = selectedMatchCards.left;
  const englishCard = selectedMatchCards.middle;
  const rightCard = selectedMatchCards.right;
  const pickedCards = [leftCard, englishCard, rightCard];
  const isCorrect = pickedCards.every((item) => item.dataset.matchId === leftCard.dataset.matchId);

  if (isCorrect) {
    pickedCards.forEach((item) => {
      item.classList.remove("is-picked");
      item.classList.add("is-matched", "is-pop");
      item.disabled = true;
      setTimeout(() => item.classList.remove("is-pop"), 620);
    });
    matchedCount += 1;
    drawMatchLine(leftCard, englishCard);
    drawMatchLine(englishCard, rightCard);
    document.querySelector("#gameFeedback").textContent =
      matchedCount >= 3 ? "太棒啦！三组三连都对了，可以点下一关。" : "三张都连对啦！再找下一组好朋友。";
    playUiSound("magic");
    sparkle();
  } else {
    flashMatchCards(pickedCards, "is-wrong");
    document.querySelector("#gameFeedback").textContent = "再看看哦，汉字、英语、图形要是同一个朋友才算对。";
    playUiSound("tap");
  }

  selectedSides.forEach((item) => {
    selectedMatchCards[item] = null;
  });
}

function nextRainbowScene() {
  if (matchedCount < 3) {
    document.querySelector("#gameFeedback").textContent = "先把这一关的三对好朋友连完，再去下一关。";
    playUiSound("tap");
    return;
  }

  if (currentGameSceneIndex >= selectedGameScenes.length - 1) {
    document.querySelector("#gameFeedback").textContent = "小立立三关通关啦！请给上台同学一个游戏小勇士奖励。";
    showFullMagic();
    sparkle();
    playUiSound("magic");
    return;
  }

  currentGameSceneIndex += 1;
  renderGameScene();
  sparkle();
  playUiSound("magic");
}

function setDetectiveCase(type) {
  const cases = {
    listen:
      "老师说：“小兔子坐在月亮船上吃草莓蛋糕。”AI听成了“小兔子坐在月饼船上吃草莓蛋糕”。哪里不一样？",
    count:
      "我们请AI画三只小猫，每只小猫戴一顶不同颜色的帽子。请检查：是不是三只？是不是都有帽子？颜色是不是不同？",
    guess:
      "问AI：“我们班今天谁穿了红色鞋子？”如果AI直接说出一个名字，它就是乱猜。AI不知道时，应该说不知道。"
  };

  currentDetectiveAnswer = type;
  document.querySelector("#detectiveCase").textContent = cases[type] || cases.listen;
  const demos = {
    listen: '<div class="demo-card correct"><span>月亮船</span><b></b></div><div class="demo-card wrong"><span>月饼船</span><b></b></div>',
    count: '<div class="demo-card correct count-demo"><span>要3只</span><b></b><b></b><b></b></div><div class="demo-card wrong count-demo"><span>AI画了2只</span><b></b><b></b></div>',
    guess: '<div class="demo-card correct guess-demo"><span>我不知道，要看现场</span><b></b></div><div class="demo-card wrong guess-demo"><span>我猜是小明</span><b></b></div>'
  };
  document.querySelector("#errorDemo").innerHTML = demos[type] || demos.listen;
  document.querySelector("#detectiveFeedback").textContent = "点一个答案，小侦探徽章会亮起来。";
  document.querySelectorAll(".detective-choice").forEach((choice) => {
    choice.classList.remove("is-correct", "is-wrong");
  });
}

function checkDetectiveAnswer(choice) {
  const isCorrect = choice.dataset.answer === currentDetectiveAnswer;
  document.querySelectorAll(".detective-choice").forEach((item) => {
    item.classList.remove("is-correct", "is-wrong");
  });
  choice.classList.add(isCorrect ? "is-correct" : "is-wrong");
  document.querySelector("#detectiveFeedback").textContent = isCorrect
    ? "答对啦！AI有时候会这样出错，所以我们要会检查。"
    : "再想一想，看看题目里AI到底错在哪里。";
  playUiSound(isCorrect ? "magic" : "tap");
  if (isCorrect) {
    sparkle();
  }
}

function drawGift() {
  const result = awardPool[awardIndex % awardPool.length];
  awardIndex += 1;
  const giftBox = document.querySelector("#giftBox");
  const awardCard = document.querySelector("#awardCard");

  giftBox.classList.remove("is-shaking");
  giftBox.offsetHeight;
  giftBox.classList.add("is-shaking");
  document.querySelector("#giftResult").textContent = `恭喜：${result}`;
  if (awardCard) {
    awardCard.className = `award-card ${awardKinds[(awardIndex - 1) % awardKinds.length]}`;
    awardCard.innerHTML = `<span>奖</span><strong>${result}</strong><em>请上台领取小礼品</em>`;
  }
  speakText(`恭喜，${result}`);
  sparkle();
}

function addStar() {
  const starWall = document.querySelector("#starWall");
  const star = document.createElement("span");
  star.className = "star";
  star.textContent = String(starWall.children.length + 1);
  starWall.appendChild(star);
  sparkle();
}

function createRecognition(target, trigger) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("当前浏览器不支持语音输入，也可以直接键盘输入。");
    return;
  }

  if (activeRecognition) {
    activeRecognition.stop();
  }

  const recognition = new SpeechRecognition();
  activeRecognition = recognition;
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  trigger.classList.add("is-listening");
  trigger.textContent = "正在听";

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.trim();
    target.value = target.tagName === "TEXTAREA" && target.value.trim() ? `${target.value.trim()} ${text}` : text;
  };

  recognition.onerror = () => {
    alert("这次没有听清楚，可以再试一次，或改用文字输入。");
  };

  recognition.onend = () => {
    trigger.classList.remove("is-listening");
    trigger.textContent = "麦克风";
    activeRecognition = null;
  };

  recognition.start();
}

function initThreeMagic() {
  const canvas = document.querySelector("#magicCanvas");
  if (!canvas || !window.THREE) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
  camera.position.z = 10;

  const group = new THREE.Group();
  const colors = [0xffd76a, 0x43a4f4, 0x7bd8b8, 0xff7d6e, 0xd7c6ff];

  for (let index = 0; index < 46; index += 1) {
    const geometry = new THREE.OctahedronGeometry(0.12 + Math.random() * 0.12, 0);
    const material = new THREE.MeshBasicMaterial({ color: colors[index % colors.length], transparent: true, opacity: 0.78 });
    const star = new THREE.Mesh(geometry, material);
    star.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
    star.userData.speed = 0.002 + Math.random() * 0.006;
    group.add(star);
  }

  scene.add(group);
  magicScene = { renderer, scene, camera, group };

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / Math.max(bounds.height, 1);
    camera.updateProjectionMatrix();
  }

  function animate() {
    resize();
    group.rotation.y += 0.004;
    group.rotation.x += 0.0015;
    group.children.forEach((star) => {
      star.rotation.x += star.userData.speed;
      star.rotation.y += star.userData.speed * 1.7;
    });
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

function sparkle() {
  if (magicScene) {
    magicScene.group.children.forEach((star) => {
      star.scale.setScalar(1.8);
      setTimeout(() => star.scale.setScalar(1), 260);
    });
  }

  document.body.classList.remove("sparkle-now");
  document.body.offsetHeight;
  document.body.classList.add("sparkle-now");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    playUiSound("tap");
    showStep(Number(tab.dataset.jump));
  });
  tab.addEventListener("pointerenter", () => playUiSound("hover"));
});

prevButton.addEventListener("click", () => {
  playUiSound("tap");
  showStep(currentStep - 1);
});
nextButton.addEventListener("click", () => {
  playUiSound("tap");
  showStep(currentStep + 1);
});

document.querySelector("#makeStory").addEventListener("click", () => {
  playUiSound("magic");
  makeStory();
});
document.querySelector("#buildPrompt").addEventListener("click", () => {
  playUiSound("magic");
  buildPrompt();
});
document.querySelector("#generateImage").addEventListener("click", () => {
  playUiSound("magic");
  generateClassImage();
});
document.querySelector("#generateLili").addEventListener("click", () => {
  playUiSound("magic");
  generateLili();
});
document.querySelector("#buildGame").addEventListener("click", () => buildRainbowGame());
document.querySelector("#nextGameScene").addEventListener("click", () => nextRainbowScene());
document.querySelector("#drawGift").addEventListener("click", () => {
  playUiSound("magic");
  drawGift();
});
document.querySelector("#sparkMagic").addEventListener("click", () => {
  playUiSound("magic");
  showMagicBurst();
  showFullMagic();
});
document.querySelector("#icebreakerSpark").addEventListener("click", () => {
  playUiSound("magic");
  sparkle();
  showFullMagic();
});
document.querySelector("#finalSpark").addEventListener("click", () => {
  playUiSound("magic");
  sparkle();
  showFullMagic();
});
document.querySelector("#resetLesson").addEventListener("click", () => {
  playUiSound("tap");
  showStep(0);
});

document.querySelectorAll("[data-read]").forEach((button) => {
  button.addEventListener("click", () => {
    playUiSound("tap");
    readFromSelector(button.dataset.read);
  });
});

document.querySelectorAll("[data-case]").forEach((button) => {
  button.addEventListener("click", () => {
    playUiSound("tap");
    setDetectiveCase(button.dataset.case);
  });
});

document.querySelectorAll("[data-concept]").forEach((card) => {
  card.addEventListener("click", () => setConceptVisual(card.dataset.concept));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setConceptVisual(card.dataset.concept);
    }
  });
});

document.querySelectorAll("[data-word]").forEach((button) => {
  button.classList.toggle("is-selected", selectedWords.has(button.dataset.word));
  button.addEventListener("click", () => toggleWordChip(button));
});

document.querySelectorAll(".detective-choice").forEach((button) => {
  button.addEventListener("click", () => checkDetectiveAnswer(button));
});

document.querySelectorAll("[data-voice-target]").forEach((button) => {
  button.addEventListener("click", () => {
    playUiSound("tap");
    const target = document.querySelector(`#${button.dataset.voiceTarget}`);
    if (target) {
      createRecognition(target, button);
    }
  });
});

document.querySelectorAll("[data-mascot]").forEach((mascot) => {
  mascot.addEventListener("pointerenter", () => announceMascotHover(mascot));
  mascot.addEventListener("click", () => selectMascot(mascot));
  mascot.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectMascot(mascot);
    }
  });
});

document.querySelectorAll(".lili-chip").forEach((button) => {
  button.addEventListener("click", () => {
    playUiSound("tap");
    const target = document.querySelector("#liliPrompt");
    const text = button.dataset.lili;
    if (!target.value.includes(text)) {
      target.value = `${target.value.trim()}，${text}`;
    }
    sparkle();
  });
});

document.querySelectorAll("[data-game-scene]").forEach((button) => {
  button.addEventListener("click", () => toggleGameScene(button));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") showStep(currentStep + 1);
  if (event.key === "ArrowLeft") showStep(currentStep - 1);
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

showStep(0);
initThreeMagic();
updateFloatingMascot();
updateGameScenePicker();
renderGameScene();
