const actions = {
  summary: { label: "Tạo bản tóm tắt", title: "Bản tóm tắt của bạn", inputLabel: "NỘI DUNG BÀI GIẢNG", placeholder: "Dán ghi chú, nội dung bài giảng hoặc tài liệu bạn muốn học vào đây..." },
  explain: { label: "Giải thích cho mình", title: "Cùng hiểu kiến thức nhé", inputLabel: "NỘI DUNG HOẶC KHÁI NIỆM", placeholder: "Nhập khái niệm hoặc dán phần bài học bạn muốn hiểu rõ hơn..." },
  quiz: { label: "Tạo câu hỏi trắc nghiệm", title: "Bài luyện tập của bạn", inputLabel: "NỘI DUNG TẠO CÂU HỎI", placeholder: "Dán nội dung bài học để tạo câu hỏi trắc nghiệm..." },
  plan: { label: "Lập kế hoạch ôn tập", title: "Kế hoạch học tập", inputLabel: "NỘI DUNG CẦN ÔN TẬP", placeholder: "Dán nội dung bài học hoặc các chủ đề bạn cần ôn..." },
};

const todayKey = (() => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
})();

const state = {
  action: "summary",
  lastResult: null,
  sessions: localStorage.getItem("studymate.day") === todayKey
    ? Number(localStorage.getItem("studymate.sessions") || 0)
    : 0,
  materials: Number(localStorage.getItem("studymate.materials") || 0),
  aiConfigured: false,
};

const $ = (selector) => document.querySelector(selector);
const input = $("#study-input");
const topicInput = $("#topic-input");
const levelSelect = $("#level-select");
const output = $("#output-content");
const generateButton = $("#generate-button");
const copyButton = $("#copy-button");

function setAction(action) {
  if (!actions[action]) return;
  state.action = action;
  document.querySelectorAll(".tool-tab").forEach((tab) => {
    const active = tab.dataset.action === action;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-action-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.actionLink === action);
  });
  const config = actions[action];
  $("#input-label").textContent = config.inputLabel;
  input.placeholder = config.placeholder;
  $("#button-label").textContent = config.label;
  $("#output-title").textContent = config.title;
  $("#output-subtitle").textContent = "Kết quả học tập sẽ xuất hiện ở đây";
  $("#level-wrap").hidden = action === "plan";
  document.querySelectorAll(".plan-option").forEach((option) => { option.hidden = action !== "plan"; });
}

function updateStats() {
  $("#session-count").textContent = String(state.sessions);
  $("#material-count").textContent = String(state.materials);
  const progress = Math.min(100, Math.round((state.sessions / 2) * 100));
  $(".goal-ring").style.background = `conic-gradient(#4dae83 ${progress * 3.6}deg, #edf2ef 0)`;
  $(".goal-ring").setAttribute("aria-label", `Hoàn thành ${progress} phần trăm`);
  $(".goal-ring span").textContent = `${progress}%`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function setMode(mode) {
  const badge = $("#mode-badge");
  badge.className = `mode-badge ${mode}`;
  badge.innerHTML = mode === "live"
    ? '<span class="status-dot"></span> AI đã cấu hình'
    : '<span class="status-dot"></span> Chế độ demo';
}

async function checkMode() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error("Trạng thái máy chủ không khả dụng");
    const data = await response.json();
    state.aiConfigured = Boolean(data.aiEnabled);
    setMode(state.aiConfigured ? "live" : "demo");
  } catch {
    setMode("demo");
  }
}

function splitSentences(text) {
  return text.replace(/\s+/g, " ").match(/[^.!?。！？]+[.!?。！？]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
}

function keywordsFrom(text, limit = 7) {
  const stopWords = new Set("và là của có trong được các những một cho với từ về khi thì mà này đó như đến sẽ đã đang vào trên dưới bởi nên hoặc nếu theo giữa".split(" "));
  const words = text.toLocaleLowerCase("vi").match(/[\p{L}\p{N}]{4,}/gu) || [];
  const counts = new Map();
  for (const word of words) {
    if (!stopWords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

function makeDemoResult(action, text, options) {
  const sentences = splitSentences(text);
  const keywords = keywordsFrom(text);
  const topic = options.topic || keywords.slice(0, 2).join(" · ") || "Nội dung bài học";

  if (action === "summary") {
    const keySentences = sentences.length > 4
      ? [...new Set([sentences[0], ...sentences.slice(1).sort((a, b) => b.length - a.length).slice(0, 3)])]
      : sentences;
    return {
      title: `Tóm tắt: ${topic}`,
      intro: `Bài học tập trung vào ${topic}. Dưới đây là những ý chính được trích từ nội dung bạn cung cấp:`,
      bullets: keySentences.slice(0, 5),
      takeaway: keywords.length ? `Từ khóa cần ghi nhớ: ${keywords.join(" · ")}.` : "Hãy xem lại các ý chính và tự diễn đạt lại bằng lời của bạn.",
      demo: true,
    };
  }
  if (action === "explain") {
    return {
      title: `Cùng tìm hiểu: ${topic}`,
      intro: `Mình sẽ giúp bạn tiếp cận chủ đề ở mức ${options.level.toLocaleLowerCase("vi")}.`,
      bullets: [
        `Bắt đầu từ ý cốt lõi trong tài liệu: ${sentences[0] || text.slice(0, 180)}${text.length > 180 && !sentences[0] ? "…" : ""}`,
        keywords.length ? `Các khái niệm nổi bật trong nội dung là: ${keywords.slice(0, 4).join(", ")}.` : "Hãy chia chủ đề thành những phần nhỏ để dễ theo dõi.",
        "Thử tự giải thích lại khái niệm bằng một ví dụ quen thuộc; nếu còn vướng, hãy hỏi tiếp về phần cụ thể đó.",
      ],
      takeaway: "Đây là gợi ý demo dựa trên nội dung bạn nhập. Kết nối AI để nhận giải thích sâu hơn, kèm ví dụ phù hợp với trình độ của bạn.",
      demo: true,
    };
  }
  if (action === "quiz") {
    const candidates = sentences.filter((sentence) => sentence.length > 30);
    const questions = (candidates.length ? candidates : [text]).slice(0, 4).map((sentence, index) => {
      const answer = sentence.length > 120 ? `${sentence.slice(0, 117).trim()}…` : sentence;
      const distractors = [
        `Nội dung này không liên quan đến ${topic}.`,
        `Đây là một kết luận khác về ${topic}.`,
        `Thông tin này chưa được đề cập trong bài.`,
      ].filter((option) => option.toLocaleLowerCase("vi") !== answer.toLocaleLowerCase("vi"));
      return {
        question: index === 0 ? `Ý nào sau đây phản ánh đúng nội dung bài học về ${topic}?` : `Phát biểu nào được nêu trong phần tiếp theo của bài học?`,
        options: [answer, ...distractors.slice(0, 3)].sort((a, b) => a.localeCompare(b, "vi")),
        answer,
        explanation: "Đáp án được trích từ nội dung bạn đã cung cấp.",
      };
    });
    return { title: `Bài luyện tập: ${topic}`, intro: "Chọn một đáp án cho mỗi câu hỏi để xem phản hồi ngay.", questions, demo: true };
  }

  const days = Number(options.days);
  const minutes = Number(options.minutes);
  const topics = keywords.length ? keywords : [topic];
  const plan = Array.from({ length: days }, (_, index) => {
    const subject = topics[index % topics.length];
    const phases = ["Đọc hiểu và gạch chân ý chính", "Tóm tắt bằng lời của bạn", "Ôn lại khái niệm và ví dụ", "Tự kiểm tra kiến thức", "Ôn cách quãng và củng cố"];
    return {
      day: `Ngày ${index + 1}`,
      title: index === days - 1 ? "Ôn tập tổng hợp" : `Ôn chủ đề: ${subject}`,
      task: `${phases[index % phases.length]} · ${minutes} phút`,
    };
  });
  return { title: `Lộ trình ${days} ngày: ${topic}`, intro: `Kế hoạch gợi ý với ${minutes} phút mỗi ngày. Hãy điều chỉnh nhịp độ theo lịch học của bạn.`, plan, demo: true };
}

function addText(parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}

function renderResult(result, action) {
  output.replaceChildren();
  $("#output-title").textContent = result.title || actions[action].title;
  $("#output-subtitle").textContent = result.demo ? "Gợi ý cục bộ · Chưa kết nối AI" : "Được tạo riêng cho nội dung bạn cung cấp";
  const footnote = $("#output-footnote");
  footnote.replaceChildren();
  addText(footnote, "span", "", "✦");
  addText(footnote, "span", "", result.demo
    ? "Chế độ demo tạo gợi ý cục bộ; hãy cấu hình AI để có câu trả lời đầy đủ hơn."
    : "Hãy kiểm tra lại nội dung và điều chỉnh kế hoạch cho phù hợp với bạn.");

  if (result.intro) addText(output, "p", "result-paragraph", result.intro);
  if (result.bullets) {
    const section = document.createElement("section");
    section.className = "result-section";
    addText(section, "h4", "result-heading", "Ý chính");
    const list = document.createElement("ul");
    list.className = "result-list";
    result.bullets.forEach((item) => addText(list, "li", "", item));
    section.append(list);
    output.append(section);
  }
  if (result.takeaway) addText(output, "p", "result-callout", result.takeaway);
  if (result.questions) {
    result.questions.forEach((question, index) => {
      const card = document.createElement("article");
      card.className = "quiz-item";
      addText(card, "p", "quiz-question", `${index + 1}. ${question.question}`);
      const options = document.createElement("div");
      options.className = "quiz-options";
      question.options.forEach((option) => {
        const button = addText(options, "button", "quiz-option", option);
        button.type = "button";
        button.addEventListener("click", () => {
          options.querySelectorAll(".quiz-option").forEach((item) => {
            item.classList.remove("selected", "correct", "wrong");
            item.disabled = true;
          });
          const correct = option === question.answer;
          button.classList.add(correct ? "correct" : "wrong");
          if (!correct) {
            options.querySelectorAll(".quiz-option").forEach((item) => {
              if (item.textContent === question.answer) item.classList.add("correct");
            });
          }
          addText(card, "p", `quiz-feedback${correct ? "" : " wrong-text"}`, `${correct ? "Chính xác!" : "Chưa đúng."} ${question.explanation}`);
        }, { once: true });
      });
      card.append(options);
      output.append(card);
    });
  }
  if (result.plan) {
    result.plan.forEach((day) => {
      const row = document.createElement("div");
      row.className = "plan-day";
      addText(row, "div", "plan-day-label", day.day);
      const detail = document.createElement("div");
      detail.className = "plan-day-copy";
      addText(detail, "strong", "", day.title);
      addText(detail, "span", "", day.task);
      row.append(detail);
      output.append(row);
    });
  }
  state.lastResult = result;
  copyButton.hidden = false;
}

function showLoading() {
  output.replaceChildren();
  const loading = document.createElement("div");
  loading.className = "loading-state";
  const spinner = document.createElement("span");
  spinner.className = "spinner";
  spinner.setAttribute("aria-hidden", "true");
  loading.append(spinner);
  addText(loading, "span", "", "Đang chuẩn bị nội dung học tập...");
  output.append(loading);
  copyButton.hidden = true;
}

async function generate() {
  const text = input.value.trim();
  if (!text) {
    input.focus();
    showToast("Hãy thêm nội dung bài học trước nhé.");
    return;
  }
  if (text.length > 30000) {
    showToast("Nội dung tối đa 30.000 ký tự.");
    return;
  }
  const payload = {
    action: state.action,
    text,
    topic: topicInput.value.trim(),
    level: levelSelect.value,
    days: Number($("#days-select").value),
    minutes: Number($("#minutes-select").value),
  };
  generateButton.disabled = true;
  $("#button-label").textContent = "Đang xử lý...";
  showLoading();
  try {
    let result;
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        result = await response.json();
      } else if ((response.status !== 503 && response.status !== 404) || state.aiConfigured) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Không thể tạo nội dung lúc này.");
      }
    } catch (error) {
      if (error instanceof TypeError) {
        if (state.aiConfigured) throw new Error("Không thể kết nối máy chủ AI. Hãy kiểm tra máy chủ và thử lại.");
        result = makeDemoResult(payload.action, payload.text, payload);
      } else {
        throw error;
      }
    }
    if (!result) result = makeDemoResult(payload.action, payload.text, payload);
    if (result.error) throw new Error(result.error);
    renderResult(result, payload.action);
    state.sessions += 1;
    state.materials += 1;
    localStorage.setItem("studymate.day", todayKey);
    localStorage.setItem("studymate.sessions", String(state.sessions));
    localStorage.setItem("studymate.materials", String(state.materials));
    updateStats();
  } catch (error) {
    output.replaceChildren();
    addText(output, "p", "error-message", error.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
    $("#output-subtitle").textContent = "Không thể tạo nội dung";
  } finally {
    generateButton.disabled = false;
    $("#button-label").textContent = actions[state.action].label;
  }
}

function resultToText(result) {
  const lines = [result.title, result.intro];
  if (result.bullets) lines.push(...result.bullets.map((item) => `• ${item}`));
  if (result.takeaway) lines.push(`Ghi nhớ: ${result.takeaway}`);
  if (result.questions) result.questions.forEach((question, index) => lines.push(
    `${index + 1}. ${question.question}`,
    ...question.options.map((option, optionIndex) => `   ${String.fromCharCode(65 + optionIndex)}. ${option}`),
    `Đáp án: ${question.answer}`,
  ));
  if (result.plan) result.plan.forEach((day) => lines.push(`${day.day}: ${day.title} — ${day.task}`));
  return lines.filter(Boolean).join("\n");
}

document.querySelectorAll(".tool-tab").forEach((tab) => tab.addEventListener("click", () => setAction(tab.dataset.action)));
document.querySelectorAll("[data-action-link]").forEach((link) => link.addEventListener("click", () => setAction(link.dataset.actionLink)));
input.addEventListener("input", () => { $("#char-count").textContent = `${input.value.length.toLocaleString("vi-VN")} / 30.000 ký tự`; });
generateButton.addEventListener("click", generate);
input.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") generate();
});
copyButton.addEventListener("click", async () => {
  if (!state.lastResult) return;
  try {
    await navigator.clipboard.writeText(resultToText(state.lastResult));
    showToast("Đã sao chép kết quả.");
  } catch {
    showToast("Không thể sao chép. Hãy chọn và sao chép nội dung thủ công.");
  }
});

const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
$("#today-label").textContent = today.charAt(0).toLocaleUpperCase("vi") + today.slice(1);
updateStats();
checkMode();
