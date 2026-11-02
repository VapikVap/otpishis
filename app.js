// Ссылка «на чай». Оставьте пустой строкой, чтобы скрыть.
const TIP_URL = "";
const REPO = "https://github.com/VapikVap/otpishis";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => s.toLowerCase().replace(/ё/g, "е").trim();

// Вкладки
function openTab(id) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
}
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => openTab(t.dataset.tab)));
document.querySelectorAll("[data-goto]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); openTab(a.dataset.goto); }));
const startTab = location.hash.slice(1);
if (["catalog", "refund", "claim"].includes(startTab)) openTab(startTab);

if (TIP_URL) { $("#tip").hidden = false; $("#tip-link").href = TIP_URL; }

// Каталог
let data = { categories: {}, services: [] };
let activeCat = "";

function render() {
  const q = norm($("#q").value);
  const items = data.services.filter((s) => {
    if (activeCat && s.category !== activeCat) return false;
    if (!q) return true;
    return [s.name, ...(s.aliases || [])].some((x) => norm(x).includes(q));
  });
  $("#list").innerHTML = items.map(card).join("");
  $("#empty").hidden = items.length > 0;
  if (items.length === 1) $("#list details").open = true;
}

function card(s) {
  const steps = s.steps.map((x) => `<li>${esc(x)}</li>`).join("");
  const note = s.notes ? `<div class="note">${esc(s.notes)}</div>` : "";
  const links = (s.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)} ↗</a>`).join("");
  const checked = s.checked ? `Проверено: ${esc(s.checked)}` : "Ещё не проверено сообществом";
  const fix = `${REPO}/issues/new?template=fix.yml&title=${encodeURIComponent("Поправить: " + s.name)}`;
  return `<details class="card svc" id="${esc(s.id)}">
    <summary>${esc(s.name)}<span class="cat">${esc(data.categories[s.category] || "")}</span></summary>
    <ol>${steps}</ol>${note}
    <div class="meta">${links}<span>${checked}</span><a href="${fix}" target="_blank" rel="noopener">Не совпадает?</a></div>
  </details>`;
}

function renderCats() {
  const used = new Set(data.services.map((s) => s.category));
  const chips = [["", "Все"], ...Object.entries(data.categories).filter(([k]) => used.has(k))];
  $("#cats").innerHTML = chips.map(([k, v]) => `<button class="chip${k === activeCat ? " active" : ""}" data-cat="${k}">${esc(v)}</button>`).join("");
  $("#cats").querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { activeCat = b.dataset.cat; renderCats(); render(); }));
}

$("#q").addEventListener("input", render);

fetch("data/services.json")
  .then((r) => r.json())
  .then((d) => { data = d; data.services.sort((a, b) => a.name.localeCompare(b.name, "ru")); renderCats(); render(); })
  .catch(() => { $("#list").innerHTML = `<p class="empty">Не удалось загрузить список. Откройте сайт через веб-сервер, а не как файл.</p>`; });

// Претензия
const REASONS = {
  unauthorized: "Указанную подписку (услугу) я не оформлял(а) и согласия на её подключение и списание денежных средств не давал(а). Подключение дополнительных платных услуг без согласия потребителя запрещено (п. 3 ст. 16 Закона РФ «О защите прав потребителей»).",
  cancelled: "Подписку (автопродление) я отменил(а) до даты списания, однако денежные средства были списаны повторно. Оснований для списания не имелось.",
  trial: "Бесплатный пробный период был автоматически преобразован в платную подписку без надлежащего и явного уведомления о стоимости и дате списания. Согласия на платное продление я не давал(а).",
  unused: "После автоматического продления я услугами не пользовался(ась). Настоящим заявляю об отказе от исполнения договора в соответствии со ст. 32 Закона РФ «О защите прав потребителей» и ст. 782 ГК РФ.",
};

function fmtDate(v) {
  if (!v) return "«__» ______ 20__";
  const [y, m, d] = v.split("-");
  return `${d}.${m}.${y}`;
}

function buildClaim() {
  const f = Object.fromEntries(new FormData($("#claim-form")));
  const blank = (v, w = "____________") => (v && v.trim()) || w;
  const today = new Date().toLocaleDateString("ru-RU");
  const amount = f.amount ? `${Number(f.amount).toLocaleString("ru-RU")} руб.` : "______ руб.";
  const details = f.details && f.details.trim() ? `\n${f.details.trim()}\n` : "";
  return `Кому: ${blank(f.company)}
От: ${blank(f.name)}
Контакты для ответа: ${blank(f.contact)}

ПРЕТЕНЗИЯ
о возврате денежных средств

${fmtDate(f.date)} с моего счёта (аккаунт / номер / карта: ${blank(f.account)}) в вашу пользу списаны денежные средства в размере ${amount} за подписку (услугу).

${REASONS[f.reason]}
${details}
Как потребитель, я вправе в любое время отказаться от исполнения договора об оказании услуг при условии оплаты исполнителю фактически понесённых им расходов (ст. 32 Закона РФ «О защите прав потребителей»). Фактически услуги мне не оказывались.

На основании изложенного ТРЕБУЮ:
1. Отключить подписку и автоматическое продление, удалить привязку моего платёжного средства.
2. Вернуть списанные денежные средства в размере ${amount} в течение 10 дней с момента получения настоящей претензии тем же способом, которым они были списаны.
3. Дать письменный ответ на указанные контакты.

В случае отказа или отсутствия ответа я буду вынужден(а) обратиться в Роспотребнадзор, в банк с заявлением об оспаривании операции и в суд с требованием о взыскании суммы, неустойки, компенсации морального вреда и штрафа в размере 50% от присуждённой суммы (п. 6 ст. 13 Закона РФ «О защите прав потребителей»).

Дата: ${today}
Подпись: ____________ / ${blank(f.name)} /
`;
}

function updateClaim() { $("#claim-out").value = buildClaim(); }
$("#claim-form").addEventListener("input", updateClaim);
$("#claim-form").addEventListener("submit", (e) => e.preventDefault());
updateClaim();

$("#copy").addEventListener("click", async () => {
  const btn = $("#copy");
  try { await navigator.clipboard.writeText($("#claim-out").value); }
  catch { $("#claim-out").select(); document.execCommand("copy"); }
  btn.textContent = "Скопировано ✓";
  setTimeout(() => (btn.textContent = "Скопировать"), 1500);
});

$("#download").addEventListener("click", () => {
  const blob = new Blob([$("#claim-out").value], { type: "text/plain;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "pretenziya.txt" });
  a.click();
  URL.revokeObjectURL(a.href);
});
