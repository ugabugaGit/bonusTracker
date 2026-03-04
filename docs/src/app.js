console.log("Bonus Opening Tracker: app.js loaded");

const SUPABASE_URL = "https://yqumvbayhsjqrvyfgdbx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6F6FG3fUChpZ-FKj1CEf9w_yWou2Eh-";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

sb.auth.onAuthStateChange((event, session) => {
  console.log("[Supabase auth]", event, session?.user?.email ?? null);
});

document.addEventListener("DOMContentLoaded", () => {
  const authModal = document.getElementById("authModal");
  const authLogin = document.getElementById("auth-login");
  const authCreate = document.getElementById("auth-create");
  const authLogout = document.getElementById("auth-logout");
  const authClose = document.getElementById("auth-close");
  const authMiniStatus = document.getElementById("auth-mini-status");

  const authTitle = authModal?.querySelector(".authmodal__title");
  const nameWrap = document.getElementById("authNameWrap");
  const confirmWrap = document.getElementById("authConfirmWrap");

  const elDisplayName = document.getElementById("authDisplayName");
  const elEmail = document.getElementById("authEmail");
  const elPass = document.getElementById("authPass");
  const elPass2 = document.getElementById("authPass2");

  const authSubmit = document.getElementById("auth-submit");
  const authHint = document.getElementById("authHint");

  if (
    !authModal ||
    !authLogin ||
    !authCreate ||
    !authLogout ||
    !authClose ||
    !authSubmit
  ) {
    console.warn(
      "[Auth] Markup missing. Check ids: authModal, auth-login, auth-create, auth-logout, auth-close, auth-submit",
    );
    return;
  }

  let mode = "login";

  function getDisplayName(session) {
    const user = session?.user;
    const md = user?.user_metadata || {};
    return md.display_name || md.full_name || md.name || null;
  }

  function setMode(nextMode) {
    mode = nextMode === "signup" ? "signup" : "login";

    const isSignup = mode === "signup";
    authModal.classList.toggle("is-signup", isSignup);

    if (nameWrap) nameWrap.style.display = isSignup ? "" : "none";
    if (confirmWrap) confirmWrap.style.display = isSignup ? "" : "none";

    if (authTitle)
      authTitle.textContent = isSignup ? "Create Account" : "Log in";
    authSubmit.textContent = isSignup ? "Create account" : "Log in";

    if (elPass)
      elPass.setAttribute(
        "autocomplete",
        isSignup ? "new-password" : "current-password",
      );
    if (elPass2)
      elPass2?.setAttribute(
        "autocomplete",
        isSignup ? "new-password" : "new-password",
      );

    if (authHint) authHint.textContent = "";

    setTimeout(() => {
      if (isSignup) elDisplayName?.focus();
      else elEmail?.focus();
    }, 0);
  }

  function openAuthModal(nextMode) {
    authModal.classList.add("is-open");
    authModal.setAttribute("aria-hidden", "false");
    setMode(nextMode);
  }

  function closeAuthModal() {
    authModal.classList.remove("is-open");
    authModal.setAttribute("aria-hidden", "true");
  }

  authLogin.addEventListener("click", () => openAuthModal("login"));
  authCreate.addEventListener("click", () => openAuthModal("signup"));
  authClose.addEventListener("click", closeAuthModal);

  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuthModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && authModal.classList.contains("is-open"))
      closeAuthModal();
  });

  function setAuthUI(session) {
    const user = session?.user;
    const displayName = getDisplayName(session);

    if (user) {
      authMiniStatus.textContent = displayName || "Logged in";
      authLogin.style.display = "none";
      authCreate.style.display = "none";
      authLogout.style.display = "";
    } else {
      authMiniStatus.textContent = "Not logged in";
      authLogin.style.display = "";
      authCreate.style.display = "";
      authLogout.style.display = "none";
    }
  }

  async function doLogin() {
    const email = elEmail?.value?.trim() || "";
    const password = elPass?.value || "";

    if (!email || !password) {
      if (authHint) authHint.textContent = "Enter email and password.";
      return;
    }

    if (authHint) authHint.textContent = "Logging in...";
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (authHint) authHint.textContent = "Login error: " + error.message;
      return;
    }
    setAuthUI(data.session);
    closeAuthModal();
  }

  async function doSignup() {
    const display_name = elDisplayName?.value?.trim() || "";
    const email = elEmail?.value?.trim() || "";
    const password = elPass?.value || "";
    const password2 = elPass2?.value || "";

    if (!display_name) {
      if (authHint) authHint.textContent = "Display name is required.";
      return;
    }
    if (!email || !password) {
      if (authHint) authHint.textContent = "Email and password are required.";
      return;
    }
    if (password !== password2) {
      if (authHint) authHint.textContent = "Passwords do not match.";
      return;
    }

    if (authHint) authHint.textContent = "Creating account...";
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { display_name } },
    });

    if (error) {
      if (authHint) authHint.textContent = "Sign up error: " + error.message;
      return;
    }

    if (data.session) {
      setAuthUI(data.session);
      closeAuthModal();
    } else {
      if (authHint)
        authHint.textContent =
          "Account created. Check your email to confirm, then log in.";
    }
  }

  authSubmit.addEventListener("click", async () => {
    if (mode === "signup") await doSignup();
    else await doLogin();
  });

  [elDisplayName, elEmail, elPass, elPass2].forEach((el) => {
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") authSubmit.click();
    });
  });

  authLogout.addEventListener("click", async () => {
    const { error } = await sb.auth.signOut();
    if (error) return alert("Logout error: " + error.message);
    setAuthUI(null);
  });

  sb.auth.getSession().then(({ data }) => setAuthUI(data.session));
  sb.auth.onAuthStateChange((_event, session) => setAuthUI(session));
});

sb.auth.getSession().then(({ data }) => {
  setAuthUI(data.session);
  if (data.session) loadOpeningsFromCloud();
});

sb.auth.onAuthStateChange((_event, session) => {
  setAuthUI(session);
  if (session) loadOpeningsFromCloud();
});

const views = {
  stats: document.getElementById("view-stats"),
  archive: document.getElementById("view-archive"),
  new: document.getElementById("view-new"),
};

const menuButtons = document.querySelectorAll(".menu__btn");

function showView(viewKey) {
  Object.entries(views).forEach(([key, el]) => {
    el.hidden = key !== viewKey;
  });

  menuButtons.forEach((btn) => {
    btn.classList.toggle("menu__btn--active", btn.dataset.view === viewKey);
  });
}

menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showView(btn.dataset.view);
  });
});

showView("stats");

const addGameForm = document.getElementById("add-game-form");
const gameNameInput = document.getElementById("game-name-input");
const betSizeInput = document.getElementById("bet-size-input");
const betCurrencySelect = document.getElementById("bet-currency-select");
const gameList = document.getElementById("game-list");
const isSuperInput = document.getElementById("is-super-input");
const isHiddenInput = document.getElementById("is-hidden-input");
const startNewOpeningBtn = document.getElementById("start-new-opening-btn");
const finishOpeningBtn = document.getElementById("finish-opening-btn");
const cancelOpeningBtn = document.getElementById("cancel-opening-btn");
const shuffleOpeningBtn = document.getElementById("shuffle-opening-btn");
const shuffleAddBtn = document.getElementById("shuffle-add-btn");

const archiveList = document.getElementById("archive-list");
const archiveDetail = document.getElementById("archive-detail");
const archiveSortSelect = document.getElementById("archive-sort");
const archiveTagSelect = document.getElementById("archive-tag");
const archiveOnly100xInput = document.getElementById("archive-only100x");
const archiveSearchInput = document.getElementById("archive-search");

const statsTbody = document.getElementById("stats-tbody");
const statsSortSelect = document.getElementById("stats-sort");
const statsSearchInput = document.getElementById("stats-search");

const clearArchiveFilterBtn = document.getElementById(
  "clear-archive-filter-btn",
);
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importInput = document.getElementById("import-input");

const totalsBetEl = document.getElementById("totals-bet");
const totalsWinEl = document.getElementById("totals-win");
const totalsProfitEl = document.getElementById("totals-profit");
const totalsRoiEl = document.getElementById("totals-roi");

const finishModal = document.getElementById("finish-modal");
const finishModalClose = document.getElementById("finish-modal-close");
const finishModalCancel = document.getElementById("finish-modal-cancel");
const finishModalSave = document.getElementById("finish-modal-save");

const finishSumGames = document.getElementById("finish-sum-games");
const finishSumSuper = document.getElementById("finish-sum-super");
const finishSumHidden = document.getElementById("finish-sum-hidden");
const finishSumBet = document.getElementById("finish-sum-bet");
const finishSumWin = document.getElementById("finish-sum-win");
const finishSumProfit = document.getElementById("finish-sum-profit");
const finishSumRoi = document.getElementById("finish-sum-roi");
const finishSumRows = document.getElementById("finish-sum-rows");

const countGamesEl = document.getElementById("count-games");
const countSuperEl = document.getElementById("count-super");
const countHiddenEl = document.getElementById("count-hidden");

const fxDisplaySelect = document.getElementById("fx-display");
const openingCurrencySelect = document.getElementById(
  "opening-currency-select",
);

const startingBalanceInput = document.getElementById("starting-balance-input");
const breakEvenXEl = document.getElementById("break-even-x");
const currentAvgXEl = document.getElementById("current-avg-x");
const bestWinGameEl = document.getElementById("best-win-game");
const endBalanceEl = document.getElementById("end-balance");
const startOpeningBtn = document.getElementById("start-opening-btn");

const activeGameNameEl = document.getElementById("active-game-name");
const activeGameAvgXEl = document.getElementById("active-game-avgx");
const activeGameLast30El = document.getElementById("active-game-last30");
const activeGameMaxXEl = document.getElementById("active-game-maxx");

const activeGameBetEl = document.getElementById("active-game-bet");
const hudWinInputEl = document.getElementById("hud-win-input");

let activeGameId = null;

function focusHudWinInput() {
  if (!hudWinInputEl) return;
  hudWinInputEl.focus();
  hudWinInputEl.select();
}

function findNextIncompleteGameId() {
  const ordered = getOrderedGamesForRender();
  const next = ordered.find((g) => !isFiniteNumber(g.win));
  return next ? Number(next.id) : ordered[0] ? Number(ordered[0].id) : null;
}

function setActiveGameId(id, opts = {}) {
  const { focus = true } = opts;
  const n = Number(id);
  if (!Number.isFinite(n)) return;
  activeGameId = n;
  renderActiveGameInfo();
  renderGameList();
  if (focus) focusHudWinInput();
}
const finishHintEl = document.getElementById("finish-hint");

const phasePre = document.getElementById("new-phase-pre");
const phaseAdd = document.getElementById("new-phase-add");
const phasePlay = document.getElementById("new-phase-play");

const openingStickyEl = document.querySelector(".opening-sticky");

let currentOpeningGames = [];
let archiveFilterName = null;
let archiveSortKey = "newest";
let archiveTagFilter = "all";
let archiveOnly100x = false;
let archiveSearchQuery = "";

let currentOpeningStartBalance = null;
let currentOpeningStartBalanceInput = null;
let currentOpeningCurrency = "ARS";
let openingStarted = false;
let openingOrder = [];
let openingPrepared = false;
let editingGameId = null;

const STORAGE_KEY = "bonus-opening-tracker.currentOpeningGames";
const ARCHIVE_KEY = "bonus-opening-tracker.archive";
const ARCHIVE_UI_KEY = "bonus-opening-tracker.archiveUI";

const ARCHIVE_LAST_NUMBER_KEY = "bonus-opening-tracker.archiveLastNumber";
const BONUS_COST_X = 100;
const START_BAL_KEY = "bonus-opening-tracker.currentOpeningStartBalance";
const OPENING_STARTED_KEY = "bonus-opening-tracker.openingStarted";
const OPENING_ORDER_KEY = "bonus-opening-tracker.openingOrder";
const OPENING_PREPARED_KEY = "bonus-opening-tracker.openingPrepared";

const FX_KEY = "bonus-opening-tracker.fx";

const FX_RATES = {
  arsPerEUR: 1636.97,
  arsPerUSD: 1390.2,
};

let fx = {
  base: "ARS",
  display: "ARS",
};

function loadFx() {
  try {
    const raw = localStorage.getItem(FX_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return;
    if (obj.display) fx.display = obj.display;
  } catch {}
}

function saveFx() {
  try {
    localStorage.setItem(FX_KEY, JSON.stringify({ display: fx.display }));
  } catch {}
}

function loadArchiveUI() {
  try {
    const raw = localStorage.getItem(ARCHIVE_UI_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return;
    if (obj.sort) archiveSortKey = String(obj.sort);
    if (obj.tag) archiveTagFilter = String(obj.tag);
    if (typeof obj.only100x === "boolean") archiveOnly100x = obj.only100x;
    if (typeof obj.q === "string") archiveSearchQuery = obj.q;
  } catch {}
}

function saveArchiveUI() {
  try {
    localStorage.setItem(
      ARCHIVE_UI_KEY,
      JSON.stringify({
        sort: archiveSortKey,
        tag: archiveTagFilter,
        only100x: !!archiveOnly100x,
        q: archiveSearchQuery || "",
      }),
    );
  } catch {}
}

function initArchiveUI() {
  if (archiveSortSelect) archiveSortSelect.value = archiveSortKey;
  if (archiveTagSelect) archiveTagSelect.value = archiveTagFilter;
  if (archiveOnly100xInput) archiveOnly100xInput.checked = !!archiveOnly100x;
  if (archiveSearchInput) archiveSearchInput.value = archiveSearchQuery || "";

  if (archiveSortSelect) {
    archiveSortSelect.addEventListener("change", () => {
      archiveSortKey = archiveSortSelect.value || "newest";
      saveArchiveUI();
      renderArchiveList();
    });
  }

  if (archiveTagSelect) {
    archiveTagSelect.addEventListener("change", () => {
      archiveTagFilter = archiveTagSelect.value || "all";
      saveArchiveUI();
      renderArchiveList();
    });
  }

  if (archiveOnly100xInput) {
    archiveOnly100xInput.addEventListener("change", () => {
      archiveOnly100x = !!archiveOnly100xInput.checked;
      saveArchiveUI();
      renderArchiveList();
    });
  }

  if (archiveSearchInput) {
    archiveSearchInput.addEventListener("input", () => {
      archiveSearchQuery = archiveSearchInput.value || "";
      saveArchiveUI();
      renderArchiveList();
    });
  }
}

function getArsPerUnit(code) {
  if (code === "ARS") return 1;
  if (code === "EUR")
    return Number.isFinite(FX_RATES.arsPerEUR) ? FX_RATES.arsPerEUR : null;
  if (code === "USD")
    return Number.isFinite(FX_RATES.arsPerUSD) ? FX_RATES.arsPerUSD : null;
  return null;
}

function isCurrencyReady(code) {
  if (code === "ARS") return true;
  const r = getArsPerUnit(code);
  return Number.isFinite(r) && r > 0;
}

function toARS(amount, code) {
  const r = getArsPerUnit(code);
  if (!Number.isFinite(amount)) return null;
  if (!r || r <= 0) return null;
  return Number(amount) * r;
}

function fromARS(amountARS, code) {
  const r = getArsPerUnit(code);
  if (!Number.isFinite(amountARS)) return null;
  if (code === "ARS") return Number(amountARS);
  if (!r || r <= 0) return null;
  return Number(amountARS) / r;
}

function formatMoneyFromARS(amountARS) {
  const code = fx.display || "ARS";
  const v = fromARS(amountARS, code);
  if (v === null) return "—";

  const num = Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (code === "EUR") return `€${num}`;
  if (code === "USD") return `$${num}`;
  return `ARS ${num}`;
}

function currencySymbol(code) {
  if (code === "EUR") return "€";
  if (code === "USD") return "$";
  return "ARS";
}

function initFxUI() {
  if (!fxDisplaySelect) return;
  fxDisplaySelect.value = fx.display || "ARS";

  fxDisplaySelect.addEventListener("change", () => {
    const next = fxDisplaySelect.value;
    if (!isCurrencyReady(next)) {
      alert("USD rate is not configured in code yet (FX_RATES.arsPerUSD).");
      fxDisplaySelect.value = fx.display || "ARS";
      return;
    }
    fx.display = next;
    saveFx();
    renderStats();
    renderOverallTotals();
    renderArchiveList();
    renderNewOpeningSummary();
    renderGameList();
    if (finishModal && !finishModal.classList.contains("hidden"))
      renderFinishModal();
  });
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sumWins(games) {
  return (games || []).reduce((s, g) => {
    const w = g.win === null || g.win === undefined ? null : Number(g.win);
    return s + (w !== null && Number.isFinite(w) ? w : 0);
  }, 0);
}

function isFiniteNumber(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v));
}

function normalizeName(s) {
  return String(s || "").trim();
}

function saveCurrentOpening() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOpeningGames));
}

function loadCurrentOpening() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      currentOpeningGames = parsed.map((g) => {
        if (!g || typeof g !== "object") return g;
        return {
          ...g,
          betCurrency: g.betCurrency || "ARS",
          winCurrency: g.winCurrency || g.betCurrency || "ARS",
          betInput: isFiniteNumber(g.betInput) ? Number(g.betInput) : null,
          winInput: isFiniteNumber(g.winInput)
            ? Number(g.winInput)
            : isFiniteNumber(g.win)
              ? Number(g.win)
              : null,
        };
      });
    }
  } catch {}
}

function saveCurrentStartBalance() {
  localStorage.setItem(
    START_BAL_KEY,
    JSON.stringify({
      currency: currentOpeningCurrency,
      input: currentOpeningStartBalanceInput,
      ars: currentOpeningStartBalance,
    }),
  );
}

function loadCurrentStartBalance() {
  const raw = localStorage.getItem(START_BAL_KEY);
  if (!raw) return;
  try {
    const v = JSON.parse(raw);

    if (isFiniteNumber(v)) {
      currentOpeningCurrency = "ARS";
      currentOpeningStartBalanceInput = Number(v);
      currentOpeningStartBalance = Number(v);
      return;
    }

    if (v && typeof v === "object") {
      currentOpeningCurrency = v.currency || "ARS";
      currentOpeningStartBalanceInput = isFiniteNumber(v.input)
        ? Number(v.input)
        : null;
      currentOpeningStartBalance = isFiniteNumber(v.ars) ? Number(v.ars) : null;
    }
  } catch {}
}

function saveOpeningState() {
  localStorage.setItem(OPENING_STARTED_KEY, JSON.stringify(openingStarted));
  localStorage.setItem(OPENING_ORDER_KEY, JSON.stringify(openingOrder));
  localStorage.setItem(OPENING_PREPARED_KEY, JSON.stringify(openingPrepared));
}

function loadOpeningState() {
  try {
    openingStarted =
      JSON.parse(localStorage.getItem(OPENING_STARTED_KEY)) === true;
  } catch {
    openingStarted = false;
  }

  try {
    const o = JSON.parse(localStorage.getItem(OPENING_ORDER_KEY));
    openingOrder = Array.isArray(o) ? o : [];
  } catch {
    openingOrder = [];
  }

  try {
    openingPrepared =
      JSON.parse(localStorage.getItem(OPENING_PREPARED_KEY)) === true;
  } catch {
    openingPrepared = false;
  }
}

function setStartBalanceLocked(locked) {
  if (!startingBalanceInput) return;
  startingBalanceInput.disabled = !!locked;
}

function renderPhases() {
  if (!phasePre || !phaseAdd || !phasePlay) return;

  const showPre = !openingPrepared && !openingStarted;
  const showAdd = openingPrepared && !openingStarted;
  const showPlay = openingStarted;

  phasePre.hidden = !showPre;
  phaseAdd.hidden = !showAdd;
  phasePlay.hidden = !showPlay;

  setOpeningHudActive(showPlay);
}

function setOpeningHudActive(active) {
  if (!document?.body) return;

  if (!active) {
    document.documentElement.style.setProperty("--opening-hud-h", "0px");
    return;
  }

  requestAnimationFrame(() => {
    const h = openingStickyEl
      ? Math.ceil(openingStickyEl.getBoundingClientRect().height)
      : 0;
    document.documentElement.style.setProperty("--opening-hud-h", `${h}px`);
  });
}

window.addEventListener("resize", () => {
  if (!document?.body?.classList?.contains("opening-hud-active")) return;
  setOpeningHudActive(true);
});

function renderNewOpeningCounter() {
  if (!countGamesEl || !countSuperEl || !countHiddenEl) return;

  countGamesEl.textContent = String(currentOpeningGames.length);
  countSuperEl.textContent = String(
    currentOpeningGames.filter((g) => g.isSuper && !g.isHidden).length,
  );
  countHiddenEl.textContent = String(
    currentOpeningGames.filter((g) => g.isHidden).length,
  );
}

function updatePreButtonState() {
  if (!startNewOpeningBtn) return;
  const ok =
    isFiniteNumber(currentOpeningStartBalance) &&
    Number(currentOpeningStartBalance) >= 0;
  startNewOpeningBtn.disabled = !ok || openingStarted || openingPrepared;
}

function updateStartButtonState() {
  if (!startOpeningBtn) return;
  startOpeningBtn.disabled =
    openingStarted ||
    currentOpeningGames.length === 0 ||
    !isFiniteNumber(currentOpeningStartBalance);
}

function isAllWinsFilled() {
  if (!openingStarted) return false;
  if (!currentOpeningGames.length) return false;
  return currentOpeningGames.every((g) => isFiniteNumber(g.win));
}

function updateFinishButtonState() {
  if (!finishOpeningBtn) return;
  if (!finishHintEl) return;

  const canFinish = isAllWinsFilled();
  finishOpeningBtn.disabled = !canFinish;

  if (!openingStarted) {
    finishHintEl.textContent = "";
    return;
  }

  if (canFinish) {
    finishHintEl.textContent = "Ready to finish ✅";
    return;
  }

  const left = currentOpeningGames.filter((g) => !isFiniteNumber(g.win)).length;
  finishHintEl.textContent = `Missing wins: ${left}`;
}

function updateShuffleButtonsState() {
  if (shuffleAddBtn) {
    shuffleAddBtn.disabled = openingStarted || currentOpeningGames.length < 2;
  }
  if (shuffleOpeningBtn) {
    shuffleOpeningBtn.disabled =
      !openingStarted || currentOpeningGames.length < 2;
  }
}

if (startingBalanceInput) {
  startingBalanceInput.addEventListener("input", () => {
    const raw =
      startingBalanceInput.value === ""
        ? null
        : Number(startingBalanceInput.value);
    currentOpeningStartBalanceInput = isFiniteNumber(raw) ? Number(raw) : null;

    if (currentOpeningStartBalanceInput === null) {
      currentOpeningStartBalance = null;
    } else {
      const ars = toARS(
        currentOpeningStartBalanceInput,
        currentOpeningCurrency,
      );
      currentOpeningStartBalance = ars === null ? null : ars;
    }

    saveCurrentStartBalance();
    updatePreButtonState();
    updateStartButtonState();
    renderNewOpeningSummary();
  });

  if (openingCurrencySelect) {
    openingCurrencySelect.addEventListener("change", () => {
      const next = openingCurrencySelect.value || "ARS";
      if (!isCurrencyReady(next)) {
        alert("USD rate is not configured in code yet (FX_RATES.arsPerUSD).");
        openingCurrencySelect.value = currentOpeningCurrency || "ARS";
        return;
      }
      currentOpeningCurrency = next;
      if (currentOpeningStartBalanceInput !== null) {
        const ars = toARS(
          currentOpeningStartBalanceInput,
          currentOpeningCurrency,
        );
        currentOpeningStartBalance = ars === null ? null : ars;
      }
      saveCurrentStartBalance();
      updatePreButtonState();
      updateStartButtonState();
      renderNewOpeningSummary();

      if (betCurrencySelect) betCurrencySelect.value = currentOpeningCurrency;
    });
  }
}

function getDefaultTierOrderedIds() {
  const normal = currentOpeningGames.filter((g) => !g.isSuper && !g.isHidden);
  const superG = currentOpeningGames.filter((g) => g.isSuper && !g.isHidden);
  const hidden = currentOpeningGames.filter((g) => g.isHidden);
  return [...normal, ...superG, ...hidden].map((g) => g.id);
}

function shuffleByTierKeepOrder(games) {
  const normal = games.filter((g) => !g.isSuper && !g.isHidden);
  const superG = games.filter((g) => g.isSuper && !g.isHidden);
  const hidden = games.filter((g) => g.isHidden);

  shuffle(normal);
  shuffle(superG);
  shuffle(hidden);

  return [...normal, ...superG, ...hidden];
}

function getOrderedGamesForRender() {
  const games = currentOpeningGames;

  if (Array.isArray(openingOrder) && openingOrder.length) {
    const byId = new Map(games.map((g) => [Number(g.id), g]));
    const ordered = [];

    for (const id of openingOrder) {
      const g = byId.get(Number(id));
      if (g) ordered.push(g);
    }

    for (const g of games) {
      if (openingOrder.some((x) => Number(x) === Number(g.id))) continue;
      ordered.push(g);
    }

    return ordered;
  }

  const ids = getDefaultTierOrderedIds();
  const byId = new Map(games.map((g) => [Number(g.id), g]));
  return ids.map((id) => byId.get(Number(id))).filter(Boolean);
}

function renderNewOpeningSummary() {
  if (!breakEvenXEl || !currentAvgXEl || !bestWinGameEl || !endBalanceEl)
    return;

  const games = currentOpeningGames;

  const totalBet = games.reduce((s, g) => {
    const b = Number(g.bet);
    return s + (Number.isFinite(b) ? b : 0);
  }, 0);

  const done = games.filter((g) => {
    const w = g.win === null || g.win === undefined ? null : Number(g.win);
    const b = Number(g.bet);
    return w !== null && Number.isFinite(w) && Number.isFinite(b) && b > 0;
  });

  const sumBetDone = done.reduce((s, g) => s + Number(g.bet), 0);
  const sumWinDone = done.reduce((s, g) => s + Number(g.win), 0);

  const currentAvgX = sumBetDone > 0 ? sumWinDone / sumBetDone : null;
  const remainingBet = totalBet - sumBetDone;

  const start = currentOpeningStartBalance;
  const targetWin = isFiniteNumber(start) ? Number(start) : null;

  const remainingNeededWin =
    targetWin === null ? null : Math.max(targetWin - sumWinDone, 0);

  const breakEvenX =
    targetWin === null
      ? null
      : totalBet <= 0
        ? null
        : remainingBet <= 0
          ? 0
          : remainingNeededWin / remainingBet;

  let best = null;
  for (const g of done) {
    if (!best || Number(g.win) > Number(best.win)) best = g;
  }

  const endBalance = sumWinDone;

  breakEvenXEl.textContent =
    breakEvenX === null ? "-" : `${breakEvenX.toFixed(2)}x`;
  currentAvgXEl.textContent =
    currentAvgX === null ? "-" : `${currentAvgX.toFixed(2)}x`;

  if (!best) {
    bestWinGameEl.textContent = "-";
  } else {
    const x = Number(best.win) / Number(best.bet);
    bestWinGameEl.textContent = `${best.name} (${formatMoneyFromARS(Number(best.win))} | ${x.toFixed(2)}x)`;
  }

  endBalanceEl.textContent = formatMoneyFromARS(endBalance);
  renderActiveGameInfo();
}

function isWinFilled(game) {
  return isFiniteNumber(game.win);
}

function getActiveWinIndex(ordered) {
  for (let i = 0; i < ordered.length; i++) {
    if (!isWinFilled(ordered[i])) return i;
  }
  return ordered.length > 0 ? ordered.length - 1 : 0;
}

function getActiveGame() {
  const ordered = getOrderedGamesForRender();
  if (!ordered.length) return null;
  const id = Number(activeGameId);
  if (Number.isFinite(id)) {
    const found = ordered.find((g) => Number(g.id) === id);
    if (found) return found;
  }
  const nextId = findNextIncompleteGameId();
  if (nextId !== null) activeGameId = nextId;
  return ordered.find((g) => Number(g.id) === Number(activeGameId)) || null;
}

function computeAllTimeStats() {
  const archive = loadArchive();
  const byName = new Map();

  const openingsChrono = [...archive].reverse();

  for (const opening of openingsChrono) {
    for (const g of opening.games) {
      const name = normalizeName(g.name);
      if (!name) continue;

      const bet = Number(g.bet);
      const win = g.win === null || g.win === undefined ? null : Number(g.win);
      const x = win === null ? null : win / bet;

      if (!byName.has(name)) {
        byName.set(name, {
          name,
          times: 0,
          maxBet: 0,
          maxWin: 0,
          maxX: 0,
          bestOpeningNumber: null,
          totalBet: 0,
          totalWin: 0,
          xSum: 0,
          xCount: 0,
          xHistory: [],
        });
      }

      const s = byName.get(name);
      s.times += 1;

      if (Number.isFinite(bet)) s.totalBet += bet;
      if (win !== null && Number.isFinite(win)) s.totalWin += win;

      if (Number.isFinite(bet)) s.maxBet = Math.max(s.maxBet, bet);
      if (win !== null && Number.isFinite(win))
        s.maxWin = Math.max(s.maxWin, win);

      if (x !== null && Number.isFinite(x)) {
        if (x > s.maxX) {
          s.maxX = x;
          s.bestOpeningNumber = opening.number;
        }
        s.xSum += x;
        s.xCount += 1;
        s.xHistory.push(x);
      }
    }
  }

  return Array.from(byName.values()).map((s) => {
    const cost = s.totalBet * BONUS_COST_X;
    const profit = s.totalWin - cost;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;

    const avgX = s.xCount === 0 ? 0 : s.xSum / s.xCount;
    const last30 = s.xHistory.slice(-30);
    const last30AvgX = last30.length
      ? last30.reduce((a, b) => a + b, 0) / last30.length
      : 0;

    return {
      ...s,
      profit,
      roi,
      avgX,
      last30AvgX,
    };
  });
}

function getStatsMap() {
  const rows = computeAllTimeStats();
  const m = new Map();
  for (const r of rows) m.set(r.name.toLowerCase(), r);
  return m;
}

function renderActiveGameInfo() {
  if (
    !activeGameNameEl ||
    !activeGameAvgXEl ||
    !activeGameLast30El ||
    !activeGameMaxXEl
  )
    return;

  if (!openingStarted) {
    activeGameNameEl.textContent = "-";
    activeGameAvgXEl.textContent = "-";
    activeGameLast30El.textContent = "-";
    activeGameMaxXEl.textContent = "-";
    return;
  }

  const g = getActiveGame();
  if (!g) {
    activeGameNameEl.textContent = "-";
    activeGameAvgXEl.textContent = "-";
    activeGameLast30El.textContent = "-";
    activeGameMaxXEl.textContent = "-";
    return;
  }

  activeGameNameEl.textContent = g.name;

  if (activeGameBetEl) {
    const betMain = formatMoneyFromARS(Number(g.bet));
    const betAlt = isFiniteNumber(g.betInput)
      ? ` (${g.betCurrency} ${Number(g.betInput).toFixed(2)})`
      : "";
    activeGameBetEl.textContent = `${betMain}${betAlt}`;
  }

  if (hudWinInputEl) {
    const c = g.winCurrency || currentOpeningCurrency || "ARS";
    hudWinInputEl.placeholder = currencySymbol(c);
    const v = g.winInput;
    hudWinInputEl.value =
      v === null || typeof v === "undefined" ? "" : String(v);
  }

  const statsMap = getStatsMap();
  const s = statsMap.get(normalizeName(g.name).toLowerCase());

  if (!s) {
    activeGameAvgXEl.textContent = "-";
    activeGameLast30El.textContent = "-";
    activeGameMaxXEl.textContent = "-";
    return;
  }

  activeGameAvgXEl.textContent = `${Number(s.avgX).toFixed(2)}x`;
  activeGameLast30El.textContent =
    s.last30AvgX > 0 ? `${Number(s.last30AvgX).toFixed(2)}x` : "-";
  activeGameMaxXEl.textContent =
    s.maxX > 0 ? `${Number(s.maxX).toFixed(2)}x` : "-";
}

function focusInputByGameId(id) {
  setActiveGameId(id, { focus: true });
}

function focusActiveWinInput() {
  focusHudWinInput();
}

function renderGameList() {
  if (!gameList) return;

  gameList.innerHTML = "";

  if (currentOpeningGames.length === 0) {
    const li = document.createElement("li");
    li.className = "game-item";

    const isActive = openingStarted && Number(activeGameId) === Number(game.id);
    if (isActive) li.classList.add("game-item--active");
    li.textContent = "No games added yet.";
    gameList.appendChild(li);
    updateFinishButtonState();
    updateShuffleButtonsState();
    renderActiveGameInfo();
    return;
  }

  const ordered = getOrderedGamesForRender();

  ordered.forEach((game, idx) => {
    const li = document.createElement("li");
    li.className = "game-item";

    const xValue = isFiniteNumber(game.win)
      ? Number(game.win) / Number(game.bet)
      : null;
    const xText = xValue === null ? "X: -" : `X: ${xValue.toFixed(2)}`;
    const xClass = xValue !== null && xValue >= 100 ? "x-good" : "x-bad";

    let tagHtml = "";
    if (game.isHidden)
      tagHtml = `<span class="tag-pill tag-hidden">HIDDEN</span>`;
    else if (game.isSuper)
      tagHtml = `<span class="tag-pill tag-super">SUPER</span>`;

    const showWin = openingStarted;

    const winDisplay = !isFiniteNumber(game.win)
      ? "-"
      : `${formatMoneyFromARS(Number(game.win))}` +
        (isFiniteNumber(game.winInput)
          ? ` <span class="muted">(${game.winCurrency || currentOpeningCurrency || "ARS"} ${Number(game.winInput).toFixed(2)})</span>`
          : "");

    li.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
        <div>
          <span class="game-num">#${idx + 1}</span>
          <strong>${game.name}</strong>
          ${tagHtml}
          <br />
          Bet: ${formatMoneyFromARS(Number(game.bet))}${isFiniteNumber(game.betInput) ? ` <span class="muted">(${game.betCurrency} ${Number(game.betInput).toFixed(2)})</span>` : ""}<br />
          Win: <span class="win-text" data-id="${game.id}">${winDisplay}</span>
          <span class="x-multiplier ${xClass}" data-id="${game.id}">${xText}</span>
        </div>

        <button type="button" class="remove-game-btn" data-id="${game.id}">
          Remove
        </button>
      </div>
    `;

    gameList.appendChild(li);
  });

  const removeBtns = gameList.querySelectorAll(".remove-game-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      if (!Number.isFinite(id)) return;

      const game = currentOpeningGames.find((g) => Number(g.id) === id);
      const name = game ? game.name : "this game";

      const ok = confirm(`Remove "${name}" from current opening?`);
      if (!ok) return;

      currentOpeningGames = currentOpeningGames.filter(
        (g) => Number(g.id) !== id,
      );
      saveCurrentOpening();

      if (openingOrder && openingOrder.length) {
        openingOrder = openingOrder.filter((x) => Number(x) !== id);
        saveOpeningState();
      }

      if (editingGameId === id) editingGameId = null;

      renderGameList();
      renderNewOpeningCounter();
      renderNewOpeningSummary();
      updateStartButtonState();
      updateFinishButtonState();
      updateShuffleButtonsState();
    });
  });

  const editBtns = gameList.querySelectorAll(".edit-win-btn");
  editBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!openingStarted) return;
      const id = Number(btn.dataset.editId);
      if (!Number.isFinite(id)) return;

      editingGameId = id;
      renderGameList();
      focusInputByGameId(id);
    });
  });

  updateFinishButtonState();
  updateShuffleButtonsState();
  renderActiveGameInfo();
}

function renderNewOpeningDefaultsForOrder() {
  if (!openingOrder || !openingOrder.length) {
    openingOrder = getDefaultTierOrderedIds();
    saveOpeningState();
  }
}

if (addGameForm) {
  addGameForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!openingPrepared || openingStarted) return;

    const name = normalizeName(gameNameInput.value);
    const betInput = Number(betSizeInput.value);
    const betCurrency =
      betCurrencySelect && betCurrencySelect.value
        ? betCurrencySelect.value
        : currentOpeningCurrency || "ARS";

    if (!name) return;
    if (!Number.isFinite(betInput) || betInput <= 0) return;
    if (!isCurrencyReady(betCurrency)) {
      alert("USD rate is not configured in code yet (FX_RATES.arsPerUSD).");
      return;
    }

    const betARS = toARS(betInput, betCurrency);
    if (betARS === null || betARS <= 0) return;

    const isSuper = !!(isSuperInput && isSuperInput.checked);
    const isHidden = !!(isHiddenInput && isHiddenInput.checked);

    const id = Date.now() + Math.floor(Math.random() * 1000);

    currentOpeningGames.push({
      id,
      name,
      bet: betARS,
      betInput: betInput,
      betCurrency: betCurrency,
      win: null,
      winInput: null,
      winCurrency: betCurrency,
      isSuper: isHidden ? false : isSuper,
      isHidden: isHidden,
    });

    gameNameInput.value = "";
    betSizeInput.value = "";
    if (isSuperInput) isSuperInput.checked = false;
    if (isHiddenInput) isHiddenInput.checked = false;
    gameNameInput.focus();

    saveCurrentOpening();

    if (openingOrder && openingOrder.length) {
      openingOrder = [];
      saveOpeningState();
    }

    renderNewOpeningCounter();
    renderNewOpeningSummary();
    updateStartButtonState();
    updateShuffleButtonsState();
    renderGameList();
  });
}

if (isHiddenInput && isSuperInput) {
  isHiddenInput.addEventListener("change", () => {
    if (isHiddenInput.checked) isSuperInput.checked = false;
  });
  isSuperInput.addEventListener("change", () => {
    if (isSuperInput.checked) isHiddenInput.checked = false;
  });
}

if (startNewOpeningBtn) {
  startNewOpeningBtn.addEventListener("click", () => {
    if (!isFiniteNumber(currentOpeningStartBalance)) return;

    if (currentOpeningGames.length > 0 || openingStarted || openingPrepared) {
      const ok = confirm(
        "Start a new opening setup? This will clear current games and results!",
      );
      if (!ok) return;
    }

    currentOpeningGames = [];
    saveCurrentOpening();

    openingStarted = false;
    openingPrepared = true;
    openingOrder = [];
    editingGameId = null;

    saveOpeningState();
    setStartBalanceLocked(false);

    renderPhases();
    renderGameList();
    renderNewOpeningCounter();
    renderNewOpeningSummary();
    updateStartButtonState();
    updatePreButtonState();
    updateFinishButtonState();
    updateShuffleButtonsState();
  });
}

if (startOpeningBtn) {
  startOpeningBtn.addEventListener("click", () => {
    if (!openingPrepared) return;

    if (currentOpeningGames.length === 0) {
      alert("Add at least one game first!");
      return;
    }

    if (!isFiniteNumber(currentOpeningStartBalance)) {
      alert("Set Starting balance first!");
      return;
    }

    if (openingStarted) return;

    const baseOrdered =
      openingOrder && openingOrder.length
        ? getOrderedGamesForRender()
        : shuffleByTierKeepOrder(currentOpeningGames);

    openingOrder = baseOrdered.map((g) => g.id);

    openingStarted = true;
    saveOpeningState();
    setStartBalanceLocked(true);

    renderPhases();
    renderGameList();
    renderNewOpeningSummary();
    updateStartButtonState();
    updateFinishButtonState();
    updateShuffleButtonsState();
    setActiveGameId(findNextIncompleteGameId(), { focus: true });
  });

  if (hudWinInputEl) {
    hudWinInputEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      if (!openingStarted) return;

      const g = getActiveGame();
      if (!g) return;

      const raw = hudWinInputEl.value;
      const v = raw === "" ? null : Number(raw);
      if (v !== null && !Number.isFinite(v)) return;

      g.winInput = v === null ? null : v;

      if (g.winInput === null) {
        g.win = null;
      } else {
        const c = g.winCurrency || currentOpeningCurrency || "ARS";
        if (!isCurrencyReady(c)) {
          alert("USD rate is not configured in code yet (FX_RATES.arsPerUSD).");
          return;
        }
        const ars = toARS(g.winInput, c);
        g.win = ars === null ? null : ars;
      }

      saveCurrentOpening();

      renderNewOpeningSummary();
      updateFinishButtonState();
      renderGameList();

      const nextId = findNextIncompleteGameId();
      if (nextId !== null) setActiveGameId(nextId, { focus: true });
    });
  }
}

if (shuffleAddBtn) {
  shuffleAddBtn.addEventListener("click", () => {
    if (!openingPrepared || openingStarted) return;
    if (currentOpeningGames.length < 2) return;

    const ordered = shuffleByTierKeepOrder(currentOpeningGames);
    openingOrder = ordered.map((g) => g.id);
    saveOpeningState();

    renderGameList();
  });
}

if (shuffleOpeningBtn) {
  shuffleOpeningBtn.addEventListener("click", () => {
    if (!openingStarted) return;
    if (currentOpeningGames.length < 2) return;

    const ordered = getOrderedGamesForRender();
    const activeIdx = getActiveWinIndex(ordered);

    const before = ordered.slice(0, activeIdx);
    const activeAndAfter = ordered.slice(activeIdx);

    const reshuffledRest = shuffleByTierKeepOrder(activeAndAfter);
    const nextOrder = [...before, ...reshuffledRest];

    openingOrder = nextOrder.map((g) => g.id);
    saveOpeningState();

    renderGameList();
    renderNewOpeningSummary();
    updateFinishButtonState();
    setActiveGameId(findNextIncompleteGameId(), { focus: true });
  });
}

if (cancelOpeningBtn) {
  cancelOpeningBtn.addEventListener("click", () => {
    const ok = confirm(
      "Cancel Opening? This will clear all games and results!",
    );
    if (!ok) return;

    currentOpeningGames = [];
    saveCurrentOpening();

    openingStarted = false;
    openingPrepared = false;
    openingOrder = [];
    editingGameId = null;
    saveOpeningState();

    currentOpeningStartBalance = null;
    saveCurrentStartBalance();
    if (startingBalanceInput) startingBalanceInput.value = "";

    setStartBalanceLocked(false);

    renderPhases();
    renderGameList();
    renderNewOpeningCounter();
    renderNewOpeningSummary();
    updatePreButtonState();
    updateStartButtonState();
    updateFinishButtonState();
    updateShuffleButtonsState();
  });
}

if (finishOpeningBtn) {
  finishOpeningBtn.addEventListener("click", () => {
    if (!openingStarted) return;
    if (!isAllWinsFilled()) return;
    openFinishModal();
  });
}

if (finishModal) {
  finishModal.addEventListener("click", (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close === "1")
      closeFinishModal();
  });
}

if (finishModalClose)
  finishModalClose.addEventListener("click", closeFinishModal);
if (finishModalCancel)
  finishModalCancel.addEventListener("click", closeFinishModal);

function loadArchive() {
  const raw = localStorage.getItem(ARCHIVE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const archive = Array.isArray(parsed) ? parsed : [];
    return archive.filter(
      (o) => o && Array.isArray(o.games) && o.games.length > 0,
    );
  } catch {
    return [];
  }
}

function saveArchive(archive) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
}

function getNextArchiveNumber() {
  const raw = localStorage.getItem(ARCHIVE_LAST_NUMBER_KEY);
  const last = raw ? Number(raw) : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  localStorage.setItem(ARCHIVE_LAST_NUMBER_KEY, String(next));
  return next;
}

let _archiveSyncTimer = null;
let _archiveSyncInFlight = false;

function requestArchiveSync() {
  if (_archiveSyncTimer) clearTimeout(_archiveSyncTimer);
  _archiveSyncTimer = setTimeout(() => {
    syncArchiveFromCloud();
  }, 150);
}

async function syncArchiveFromCloud() {
  if (!sb || !sb.auth || !sb.from) return;
  if (_archiveSyncInFlight) return;
  _archiveSyncInFlight = true;
  try {
    const { data: sessData, error: sessErr } = await sb.auth.getSession();
    if (sessErr) throw sessErr;
    const session = sessData?.session;
    if (!session) return;

    const { data, error } = await sb
      .from("openings")
      .select("payload,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const remote = (data || [])
      .map((r) => r && r.payload)
      .filter((o) => o && Array.isArray(o.games) && o.games.length > 0);

    saveArchive(remote);

    const maxNum = remote.reduce((m, o) => {
      const n = Number(o.number);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    localStorage.setItem(ARCHIVE_LAST_NUMBER_KEY, String(maxNum || 0));

    renderArchiveList();
    renderStats();
    renderOverallTotals();
  } catch (e) {
    console.warn("[Supabase] Archive sync failed", e);
  } finally {
    _archiveSyncInFlight = false;
  }
}

async function saveArchiveEntryToCloud(entry) {
  try {
    const { data: sessData } = await sb.auth.getSession();
    const session = sessData?.session;
    if (!session) return { ok: false, reason: "no-session" };

    const { error } = await sb.from("openings").insert({
      user_id: session.user.id,
      payload: entry,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}
function computeOpeningTotals(opening) {
  const games = opening && Array.isArray(opening.games) ? opening.games : [];

  let totalBet = 0;
  let totalWin = 0;
  let count100x = 0;

  for (const g of games) {
    const bet = Number(g.bet);
    const win = g.win === null || g.win === undefined ? null : Number(g.win);

    if (Number.isFinite(bet)) totalBet += bet;
    if (win !== null && Number.isFinite(win)) totalWin += win;

    if (
      win !== null &&
      Number.isFinite(win) &&
      Number.isFinite(bet) &&
      bet > 0
    ) {
      const x = win / bet;
      if (x >= 100) count100x += 1;
    }
  }

  const totalCost = totalBet * BONUS_COST_X;

  const done = games.filter(
    (g) =>
      g.win !== null &&
      g.win !== undefined &&
      Number.isFinite(Number(g.win)) &&
      Number.isFinite(Number(g.bet)) &&
      Number(g.bet) > 0,
  );

  const sumBetDone = done.reduce((s, g) => s + Number(g.bet), 0);
  const sumWinDone = done.reduce((s, g) => s + Number(g.win), 0);
  const avgXKnown = sumBetDone > 0 ? sumWinDone / sumBetDone : null;

  const startBalance =
    opening &&
    opening.startBalance !== null &&
    opening.startBalance !== undefined &&
    Number.isFinite(Number(opening.startBalance))
      ? Number(opening.startBalance)
      : null;

  const endBalanceAuto = sumWins(games);

  const profit = startBalance === null ? 0 : endBalanceAuto - startBalance;
  const roi =
    startBalance !== null && startBalance > 0
      ? (profit / startBalance) * 100
      : 0;

  return {
    totalBet,
    totalCost,
    totalWin,
    profit,
    roi,
    count100x,
    avgXKnown,
    startBalance,
    endBalanceAuto,
  };
}

function openFinishModal() {
  if (!finishModal) return;

  const ordered = getOrderedGamesForRender();
  const t = computeOpeningTotals({ games: ordered });

  const superCount = ordered.filter((g) => g.isSuper && !g.isHidden).length;
  const hiddenCount = ordered.filter((g) => g.isHidden).length;

  finishSumGames.textContent = String(ordered.length);
  finishSumSuper.textContent = String(superCount);
  if (finishSumHidden) finishSumHidden.textContent = String(hiddenCount);

  finishSumBet.textContent =
    currentOpeningStartBalance === null
      ? "-"
      : formatMoneyFromARS(Number(currentOpeningStartBalance));

  finishSumWin.textContent = formatMoneyFromARS(t.totalWin);

  const sb = currentOpeningStartBalance;
  const profit = isFiniteNumber(sb) ? t.totalWin - Number(sb) : 0;

  const roi =
    isFiniteNumber(sb) && Number(sb) > 0 ? (profit / Number(sb)) * 100 : 0;

  finishSumProfit.textContent = formatMoneyFromARS(profit);
  finishSumProfit.style.color = profit >= 0 ? "green" : "red";
  finishSumRoi.textContent = `${roi.toFixed(1)}%`;

  finishSumRows.innerHTML = ordered
    .map((g, i) => {
      const win = g.win === null || g.win === undefined ? null : Number(g.win);
      const bet = Number(g.bet);
      const x = win === null ? null : win / bet;

      const winText = win === null ? "-" : win.toFixed(2);
      const xText = x === null ? "-" : x.toFixed(2);

      const tag = g.isHidden ? "HIDDEN" : g.isSuper ? "SUPER" : "";

      return `<tr>
        <td>${i + 1}</td>
        <td>${String(g.name)}</td>
        <td>${formatMoneyFromARS(bet)}</td>
        <td>${winText === "-" ? "-" : formatMoneyFromARS(win)}</td>
        <td>${xText}x</td>
        <td>${tag}</td>
      </tr>`;
    })
    .join("");

  finishModal.hidden = false;
}

function closeFinishModal() {
  if (!finishModal) return;
  finishModal.hidden = true;
}

if (finishModalSave) {
  finishModalSave.addEventListener("click", async () => {
    const archive = loadArchive();

    const maxNum = archive.reduce((m, o) => {
      const n = Number(o && o.number);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    const number = maxNum + 1;
    localStorage.setItem(ARCHIVE_LAST_NUMBER_KEY, String(number));

    const snapshotGames = getOrderedGamesForRender().map((g) => ({ ...g }));

    const entry = {
      number,
      createdAt: new Date().toISOString(),
      startBalance: currentOpeningStartBalance,
      games: snapshotGames,
    };

    const cloudRes = await saveArchiveEntryToCloud(entry);
    if (!cloudRes.ok && cloudRes.reason !== "no-session") {
      console.warn("[Supabase] Save failed:", cloudRes.reason);
      alert("Cloud save failed (saved locally only): " + cloudRes.reason);
    }

    archive.unshift(entry);
    saveArchive(archive);

    currentOpeningGames = [];
    saveCurrentOpening();

    openingStarted = false;
    openingPrepared = false;
    openingOrder = [];
    editingGameId = null;
    saveOpeningState();
    setStartBalanceLocked(false);

    currentOpeningStartBalance = null;
    saveCurrentStartBalance();
    if (startingBalanceInput) startingBalanceInput.value = "";

    renderPhases();
    renderGameList();
    renderArchiveList();
    renderStats();
    renderOverallTotals();
    renderNewOpeningCounter();
    renderNewOpeningSummary();
    updatePreButtonState();
    updateStartButtonState();
    updateFinishButtonState();
    updateShuffleButtonsState();

    closeFinishModal();

    if (cloudRes.ok) {
      requestArchiveSync();
    }

    alert(`Saved to Archive as #${number}`);
  });
}

function renderArchiveList() {
  if (!archiveList) return;
  updateArchiveFilterUI();

  const archive = loadArchive();
  archiveList.innerHTML = "";

  let filtered = archiveFilterName
    ? archive.filter((o) =>
        o.games.some(
          (g) => normalizeName(g.name).toLowerCase() === archiveFilterName,
        ),
      )
    : archive;

  if (archiveTagFilter === "super") {
    filtered = filtered.filter((o) =>
      o.games.some((g) => g.isSuper && !g.isHidden),
    );
  } else if (archiveTagFilter === "hidden") {
    filtered = filtered.filter((o) => o.games.some((g) => g.isHidden));
  }

  if (archiveOnly100x) {
    filtered = filtered.filter((o) => {
      const t = computeOpeningTotals(o);
      return t.count100x > 0;
    });
  }

  const q = String(archiveSearchQuery || "")
    .trim()
    .toLowerCase();
  if (q) {
    filtered = filtered.filter((o) => {
      const numMatch = String(o.number || "").includes(q);
      const gameMatch = (o.games || []).some((g) =>
        normalizeName(g.name).toLowerCase().includes(q),
      );
      return numMatch || gameMatch;
    });
  }

  filtered = filtered.slice();
  filtered.sort((a, b) => {
    if (archiveSortKey === "oldest") return Number(a.number) - Number(b.number);
    if (archiveSortKey === "profit")
      return computeOpeningTotals(b).profit - computeOpeningTotals(a).profit;
    if (archiveSortKey === "roi")
      return computeOpeningTotals(b).roi - computeOpeningTotals(a).roi;
    if (archiveSortKey === "end")
      return (
        computeOpeningTotals(b).endBalanceAuto -
        computeOpeningTotals(a).endBalanceAuto
      );
    if (archiveSortKey === "avgX") {
      const aa = computeOpeningTotals(a).avgXKnown;
      const bb = computeOpeningTotals(b).avgXKnown;
      return (bb ?? -Infinity) - (aa ?? -Infinity);
    }
    if (archiveSortKey === "count100x")
      return (
        computeOpeningTotals(b).count100x - computeOpeningTotals(a).count100x
      );

    return Number(b.number) - Number(a.number);
  });

  if (filtered.length === 0) {
    const li = document.createElement("li");
    li.className = "archive-item";
    li.textContent = archiveFilterName
      ? `No archived openings for "${archiveFilterName}".`
      : "No archived openings yet.";
    archiveList.appendChild(li);
    return;
  }

  filtered.forEach((opening) => {
    const totalGames = opening.games.length;
    const superCount = opening.games.filter(
      (g) => g.isSuper && !g.isHidden,
    ).length;
    const hiddenCount = opening.games.filter((g) => g.isHidden).length;
    const t = computeOpeningTotals(opening);

    const startText =
      opening.startBalance === null || opening.startBalance === undefined
        ? "-"
        : formatMoneyFromARS(Number(opening.startBalance));

    const avgXText = t.avgXKnown === null ? "-" : `${t.avgXKnown.toFixed(2)}x`;
    const endText = formatMoneyFromARS(t.endBalanceAuto);

    const li = document.createElement("li");
    li.className = "archive-item";

    const badge =
      t.count100x > 0
        ? ` <span class="badge-100x-inline">🔥 ${t.count100x}x 100x+</span>`
        : "";

    li.innerHTML = `
      <strong>#${opening.number}</strong>${badge}<br />
      Start: ${startText} | AvgX: ${avgXText} | End: ${endText}<br />
      Games: ${totalGames} | SUPER: ${superCount} | HIDDEN: ${hiddenCount}<br />
      Profit: ${formatMoneyFromARS(t.profit)} | ROI: ${t.roi.toFixed(1)}%
    `;

    li.style.cursor = "pointer";
    li.addEventListener("click", () => {
      renderArchiveDetail(opening);
    });

    archiveList.appendChild(li);
  });
}

function updateArchiveFilterUI() {
  if (!clearArchiveFilterBtn) return;
  const any =
    !!archiveFilterName ||
    archiveSortKey !== "newest" ||
    archiveTagFilter !== "all" ||
    !!archiveOnly100x ||
    !!String(archiveSearchQuery || "").trim();
  clearArchiveFilterBtn.hidden = !any;
}

if (clearArchiveFilterBtn) {
  clearArchiveFilterBtn.addEventListener("click", () => {
    archiveFilterName = null;
    archiveSortKey = "newest";
    archiveTagFilter = "all";
    archiveOnly100x = false;
    archiveSearchQuery = "";
    saveArchiveUI();

    if (archiveSortSelect) archiveSortSelect.value = archiveSortKey;
    if (archiveTagSelect) archiveTagSelect.value = archiveTagFilter;
    if (archiveOnly100xInput) archiveOnly100xInput.checked = false;
    if (archiveSearchInput) archiveSearchInput.value = "";

    renderArchiveDetail(null);
    renderArchiveList();
    updateArchiveFilterUI();
  });
}

function formatX(game) {
  if (game.win === null || game.win === undefined) return null;
  return Number(game.win) / Number(game.bet);
}

function renderArchiveDetail(opening) {
  if (!archiveDetail) return;

  if (!opening) {
    archiveDetail.hidden = true;
    archiveDetail.innerHTML = "";
    return;
  }

  let dirty = false;

  const t = computeOpeningTotals(opening);

  const startVal = opening.startBalance ?? "";
  const endText = formatMoneyFromARS(Number(t.endBalanceAuto));
  const avgXText = t.avgXKnown === null ? "-" : `${t.avgXKnown.toFixed(2)}x`;

  const rows = opening.games
    .map((g) => {
      const x = formatX(g);
      const xText = x === null ? "-" : x.toFixed(2);
      const tag = g.isHidden ? "HIDDEN" : g.isSuper ? "SUPER" : "";

      const bet = Number(g.bet);
      const win = g.win === null || g.win === undefined ? null : Number(g.win);
      const is100x =
        win !== null &&
        Number.isFinite(win) &&
        Number.isFinite(bet) &&
        bet > 0 &&
        win / bet >= 100;

      return `<tr data-game-id="${g.id}">
        <td><input type="text" class="archive-name-input" value="${g.name}" /></td>
        <td><input type="number" class="archive-bet-input" value="${g.bet}" step="0.01" /></td>
        <td><input type="number" class="archive-win-input" value="${g.win ?? ""}" step="0.01" /></td>
        <td class="archive-x-cell">${xText}x ${is100x ? `<span class="badge-100x-inline">🔥 100x+</span>` : ""}</td>
        <td>${tag}</td>
        <td>
          <button type="button" class="archive-remove-game-btn" data-game-id="${g.id}">Remove</button>
        </td>
      </tr>`;
    })
    .join("");

  archiveDetail.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px; flex-wrap:wrap;">
      <div>
        <strong>Opening #${opening.number}</strong><br />

        <div style="margin-top:8px; display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
          <label>
            Start (ARS)
            <input id="archive-start-balance" type="number" step="0.01" value="${startVal}">
          </label>

          <div style="min-width:180px;">
            <div style="color:rgba(255,255,255,0.65); font-size:12px; margin-bottom:6px;">End</div>
            <div id="archive-end-balance" style="font-weight:800;">${endText}</div>
          </div>
        </div>

        <div style="margin-top:8px;">
          AvgX: <span id="archive-avgx-known">${avgXText}</span><br />
          Total win: <span id="archive-total-win">${formatMoneyFromARS(t.totalWin)}</span><br />
          Profit: <span id="archive-profit">${formatMoneyFromARS(t.profit)}</span> | ROI: <span id="archive-roi">${t.roi.toFixed(1)}%</span>
        </div>
      </div>

      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button id="save-opening-btn" type="button" disabled>Save</button>
        <span id="save-hint" style="color:rgba(255,255,255,0.65); font-size:12px;"></span>
        <button id="delete-opening-btn" type="button">Delete</button>
        <button id="close-archive-detail-btn" type="button">Close</button>
      </div>
    </div>

    <div style="margin-top:12px; overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.12); padding:8px;">Game</th>
            <th style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.12); padding:8px;">Bet</th>
            <th style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.12); padding:8px;">Win</th>
            <th style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.12); padding:8px;">X</th>
            <th style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.12); padding:8px;">Tag</th>
            <th style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.12); padding:8px;">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  archiveDetail.hidden = false;

  const saveBtn = document.getElementById("save-opening-btn");
  const saveHint = document.getElementById("save-hint");

  function setDirty(v) {
    dirty = v;
    if (saveBtn) saveBtn.disabled = !dirty;
    if (saveHint) saveHint.textContent = dirty ? "Unsaved changes" : "";
  }

  function refreshDetailMetrics() {
    const tt = computeOpeningTotals(opening);

    const endEl = document.getElementById("archive-end-balance");
    if (endEl)
      endEl.textContent = formatMoneyFromARS(Number(tt.endBalanceAuto));

    const avgEl = document.getElementById("archive-avgx-known");
    if (avgEl)
      avgEl.textContent =
        tt.avgXKnown === null ? "-" : `${tt.avgXKnown.toFixed(2)}x`;

    const winEl = document.getElementById("archive-total-win");
    if (winEl) winEl.textContent = tt.totalWin.toFixed(2);

    const profitEl = document.getElementById("archive-profit");
    if (profitEl) profitEl.textContent = tt.profit.toFixed(2);

    const roiEl = document.getElementById("archive-roi");
    if (roiEl) roiEl.textContent = `${tt.roi.toFixed(1)}%`;
  }

  function saveArchiveEdit() {
    const archive = loadArchive();
    const idx = archive.findIndex((o) => o.number === opening.number);
    if (idx === -1) return;

    archive[idx] = opening;
    saveArchive(archive);

    renderArchiveList();
    renderStats();
    renderOverallTotals();
  }

  setDirty(false);

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveArchiveEdit();
      setDirty(false);
      if (saveHint) saveHint.textContent = "Saved ✅";
      setTimeout(() => {
        if (saveHint && !dirty) saveHint.textContent = "";
      }, 1200);
    });
  }

  const startInput = document.getElementById("archive-start-balance");
  if (startInput) {
    startInput.addEventListener("input", () => {
      const v = startInput.value === "" ? null : Number(startInput.value);
      opening.startBalance = Number.isFinite(v) ? v : null;
      setDirty(true);
      refreshDetailMetrics();
    });
  }

  const betInputs = archiveDetail.querySelectorAll(".archive-bet-input");
  const winInputs = archiveDetail.querySelectorAll(".archive-win-input");
  const nameInputs = archiveDetail.querySelectorAll(".archive-name-input");

  betInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest("tr");
      const gameId = Number(row.dataset.gameId);
      const game = opening.games.find((g) => Number(g.id) === gameId);
      if (!game) return;

      const bet = Number(input.value);
      if (!Number.isFinite(bet) || bet <= 0) return;

      game.bet = bet;
      setDirty(true);
      refreshDetailMetrics();
    });
  });

  winInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest("tr");
      const gameId = Number(row.dataset.gameId);
      const game = opening.games.find((g) => Number(g.id) === gameId);
      if (!game) return;

      const win = input.value === "" ? null : Number(input.value);
      if (win !== null && !Number.isFinite(win)) return;

      game.win = win;
      setDirty(true);
      refreshDetailMetrics();
    });
  });

  nameInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest("tr");
      const gameId = Number(row.dataset.gameId);
      const game = opening.games.find((g) => Number(g.id) === gameId);
      if (!game) return;

      const newName = normalizeName(input.value);
      if (!newName) return;
      game.name = newName;
      setDirty(true);
    });
  });

  const removeBtns = archiveDetail.querySelectorAll(".archive-remove-game-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const gameId = Number(btn.dataset.gameId);
      if (!Number.isFinite(gameId)) return;

      const game = opening.games.find((g) => Number(g.id) === gameId);
      const gameName = game ? game.name : "this game";

      const ok = confirm(
        `Remove "${gameName}" from Opening #${opening.number}?`,
      );
      if (!ok) return;

      opening.games = opening.games.filter((g) => Number(g.id) !== gameId);

      if (opening.games.length === 0) {
        const ok2 = confirm(
          `Opening #${opening.number} is now empty. Delete the whole opening?`,
        );
        const archive = loadArchive();

        if (ok2) {
          const next = archive.filter((o) => o.number !== opening.number);
          saveArchive(next);
          renderArchiveDetail(null);
          renderArchiveList();
          renderStats();
          renderOverallTotals();
          return;
        }
      }

      setDirty(true);
      renderArchiveDetail(opening);
    });
  });

  const closeBtn = document.getElementById("close-archive-detail-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (dirty) {
        const ok = confirm("You have unsaved changes. Close anyway?");
        if (!ok) return;
      }
      renderArchiveDetail(null);
    });
  }

  const deleteBtn = document.getElementById("delete-opening-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      const ok = confirm(
        `Delete Opening #${opening.number}? This cannot be undone!`,
      );
      if (!ok) return;

      const archive = loadArchive();
      const next = archive.filter((o) => o.number !== opening.number);
      saveArchive(next);

      renderArchiveDetail(null);
      renderArchiveList();
      renderStats();
      renderOverallTotals();

      alert(`Deleted Opening #${opening.number}`);
    });
  }
}

function sortStats(rows, sortKey) {
  const r = [...rows];

  if (sortKey === "name") {
    r.sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }

  const keyMap = {
    times: "times",
    maxWin: "maxWin",
    maxX: "maxX",
    avgX: "avgX",
    last30AvgX: "last30AvgX",
    maxBet: "maxBet",
    profit: "profit",
    roi: "roi",
  };

  const k = keyMap[sortKey] || "times";
  r.sort((a, b) => (b[k] ?? 0) - (a[k] ?? 0));
  return r;
}

function renderStats() {
  if (!statsTbody) return;

  const sortKey = statsSortSelect ? statsSortSelect.value : "times";
  const query = statsSearchInput
    ? statsSearchInput.value.trim().toLowerCase()
    : "";

  let data = computeAllTimeStats();
  if (query) data = data.filter((s) => s.name.toLowerCase().includes(query));

  const rows = sortStats(data, sortKey);
  statsTbody.innerHTML = "";

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9">No data yet.</td>`;
    statsTbody.appendChild(tr);
    return;
  }

  for (const s of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <button type="button" class="stats-game-link" data-name="${s.name}">${s.name}</button>
        ${s.maxX >= 100 ? `<span class="badge-100x">🔥 100x+</span>` : ``}
      </td>
      <td>${s.times}</td>
      <td>${s.maxBet.toFixed(2)}</td>
      <td>${s.maxWin.toFixed(2)}</td>
      <td>
        ${s.maxX.toFixed(2)}x
        ${s.bestOpeningNumber !== null ? `(<button class="stats-opening-link" data-opening="${s.bestOpeningNumber}">#${s.bestOpeningNumber}</button>)` : ""}
      </td>
      <td>${s.avgX.toFixed(2)}x</td>
      <td>${s.last30AvgX > 0 ? s.last30AvgX.toFixed(2) + "x" : "-"}</td>
      <td style="color:${s.profit >= 0 ? "green" : "red"}">${formatMoneyFromARS(s.profit)}</td>
      <td>${s.roi.toFixed(1)}%</td>
    `;
    statsTbody.appendChild(tr);
  }

  const openingLinks = statsTbody.querySelectorAll(".stats-opening-link");
  openingLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const number = Number(btn.dataset.opening);
      if (!Number.isFinite(number)) return;

      const archive = loadArchive();
      const opening = archive.find((o) => o.number === number);
      if (!opening) return;

      archiveFilterName = null;
      renderArchiveDetail(null);
      renderArchiveList();
      updateArchiveFilterUI();
      showView("archive");
      renderArchiveDetail(opening);
    });
  });

  const gameLinks = statsTbody.querySelectorAll(".stats-game-link");
  gameLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = normalizeName(btn.dataset.name).toLowerCase();
      if (!name) return;

      archiveFilterName = name;
      renderArchiveDetail(null);
      renderArchiveList();
      updateArchiveFilterUI();
      showView("archive");
    });
  });
}

if (statsSortSelect) statsSortSelect.addEventListener("change", renderStats);
if (statsSearchInput) statsSearchInput.addEventListener("input", renderStats);

function computeOverallTotals() {
  const archive = loadArchive();

  let startSum = 0;
  let totalWin = 0;

  for (const opening of archive) {
    const sb = opening.startBalance;
    if (isFiniteNumber(sb)) startSum += Number(sb);

    for (const g of opening.games) {
      const win = g.win === null || g.win === undefined ? null : Number(g.win);
      if (win !== null && Number.isFinite(win)) totalWin += win;
    }
  }

  const profit = totalWin - startSum;
  const roi = startSum > 0 ? (profit / startSum) * 100 : 0;

  return { startSum, totalWin, profit, roi };
}

function renderOverallTotals() {
  if (!totalsBetEl || !totalsWinEl || !totalsProfitEl || !totalsRoiEl) return;

  const t = computeOverallTotals();

  totalsBetEl.textContent = formatMoneyFromARS(t.startSum);
  totalsWinEl.textContent = formatMoneyFromARS(t.totalWin);

  totalsProfitEl.textContent = formatMoneyFromARS(t.profit);
  totalsProfitEl.style.color = t.profit >= 0 ? "green" : "red";

  totalsRoiEl.textContent = `${t.roi.toFixed(1)}%`;
}

function buildBackupPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    currentOpeningGames,
    currentOpeningStartBalance,
    currentOpeningStartBalanceInput,
    currentOpeningCurrency,
    openingStarted,
    openingPrepared,
    openingOrder,
    archive: loadArchive(),
    archiveLastNumber: localStorage.getItem(ARCHIVE_LAST_NUMBER_KEY) || "0",
  };
}

function downloadJson(filename, dataObj) {
  const json = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const payload = buildBackupPayload();
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`bonus-opening-backup-${date}.json`, payload);
  });
}

function isValidBackup(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (obj.version !== 1) return false;
  if (!Array.isArray(obj.archive)) return false;
  if (!Array.isArray(obj.currentOpeningGames)) return false;
  return true;
}

function applyBackup(obj) {
  saveArchive(obj.archive);

  localStorage.setItem(
    ARCHIVE_LAST_NUMBER_KEY,
    String(obj.archiveLastNumber ?? "0"),
  );

  currentOpeningGames = obj.currentOpeningGames || [];
  saveCurrentOpening();

  currentOpeningCurrency = obj.currentOpeningCurrency || "ARS";

  currentOpeningStartBalanceInput = isFiniteNumber(
    obj.currentOpeningStartBalanceInput,
  )
    ? Number(obj.currentOpeningStartBalanceInput)
    : null;

  currentOpeningStartBalance = isFiniteNumber(obj.currentOpeningStartBalance)
    ? Number(obj.currentOpeningStartBalance)
    : null;

  saveCurrentStartBalance();

  if (openingCurrencySelect)
    openingCurrencySelect.value = currentOpeningCurrency || "ARS";
  if (betCurrencySelect)
    betCurrencySelect.value = currentOpeningCurrency || "ARS";

  if (startingBalanceInput)
    startingBalanceInput.value =
      currentOpeningStartBalanceInput === null
        ? ""
        : String(currentOpeningStartBalanceInput);

  openingStarted = obj.openingStarted === true;
  openingPrepared = obj.openingPrepared === true;
  openingOrder = Array.isArray(obj.openingOrder) ? obj.openingOrder : [];
  saveOpeningState();

  setStartBalanceLocked(openingStarted);

  renderPhases();
  renderGameList();
  renderArchiveList();
  renderStats();
  renderOverallTotals();
  renderNewOpeningCounter();
  renderNewOpeningSummary();

  updatePreButtonState();
  updateStartButtonState();
  updateFinishButtonState();
  updateShuffleButtonsState();
}

if (importBtn && importInput) {
  importBtn.addEventListener("click", () => {
    importInput.value = "";
    importInput.click();
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;

    const ok = confirm(
      "Importing a backup will REPLACE your current data. Continue?",
    );
    if (!ok) return;

    try {
      const text = await file.text();
      const obj = JSON.parse(text);

      if (!isValidBackup(obj)) {
        alert("Invalid backup file.");
        return;
      }

      applyBackup(obj);
      alert("Backup imported successfully!");
    } catch {
      alert("Failed to import backup. File might be corrupted.");
    }
  });
}

loadCurrentOpening();
loadCurrentStartBalance();
loadOpeningState();

loadFx();
initFxUI();

loadArchiveUI();
initArchiveUI();

setStartBalanceLocked(openingStarted);

if (openingCurrencySelect)
  openingCurrencySelect.value = currentOpeningCurrency || "ARS";
if (betCurrencySelect)
  betCurrencySelect.value = currentOpeningCurrency || "ARS";

if (startingBalanceInput && currentOpeningStartBalanceInput !== null) {
  startingBalanceInput.value = String(currentOpeningStartBalanceInput);
}

renderPhases();
renderGameList();
renderArchiveList();
renderStats();
renderOverallTotals();
renderNewOpeningCounter();
renderNewOpeningSummary();

updatePreButtonState();
updateStartButtonState();
updateFinishButtonState();
updateShuffleButtonsState();

console.log("app.js fully initialized✅");

(function () {
  const themeBtn = document.getElementById("theme-toggle");
  const KEY = "bt_theme";

  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light") document.body.classList.add("light-mode");
  } catch {}

  function setTheme(mode) {
    const isLight = mode === "light";
    document.body.classList.toggle("light-mode", isLight);
    try {
      localStorage.setItem(KEY, isLight ? "light" : "dark");
    } catch {}
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isLight = document.body.classList.contains("light-mode");
      setTheme(isLight ? "dark" : "light");
    });
  }

  document.addEventListener("keydown", (e) => {
    const tag =
      e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
    const typing =
      tag === "input" ||
      tag === "textarea" ||
      (e.target && e.target.isContentEditable);

    const finishModal = document.getElementById("finish-modal");
    const hud = document.getElementById("hud-win-input");
    const phasePlay = document.getElementById("new-phase-play");
    const isPlayVisible = phasePlay && !phasePlay.hasAttribute("hidden");

    if (e.key === "Escape") {
      if (finishModal && !finishModal.hasAttribute("hidden")) {
        const close = document.getElementById("finish-modal-close");
        if (close) close.click();
        return;
      }
      if (isPlayVisible && hud) {
        hud.focus();
        hud.select?.();
      }
      return;
    }

    if (!typing && e.key === "/") {
      const statsView = document.getElementById("view-stats");
      const archiveView = document.getElementById("view-archive");
      const statsVisible = statsView && !statsView.hasAttribute("hidden");
      const archiveVisible = archiveView && !archiveView.hasAttribute("hidden");
      const el = statsVisible
        ? document.getElementById("stats-search")
        : archiveVisible
          ? document.getElementById("archive-search")
          : null;
      if (el) {
        e.preventDefault();
        el.focus();
        el.select?.();
      }
      return;
    }

    if (!isPlayVisible) return;

    if (typing) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (typeof getOrderedGamesForRender !== "function") return;
      const ordered = getOrderedGamesForRender();
      if (!ordered || ordered.length === 0) return;

      const currentId =
        typeof activeGameId !== "undefined" ? Number(activeGameId) : null;
      const idx = ordered.findIndex((g) => Number(g.id) === currentId);
      const nextIndex =
        e.key === "ArrowDown"
          ? idx >= 0
            ? (idx + 1) % ordered.length
            : 0
          : idx >= 0
            ? (idx - 1 + ordered.length) % ordered.length
            : ordered.length - 1;

      const next = ordered[nextIndex];
      if (next && typeof setActiveGameId === "function")
        setActiveGameId(Number(next.id), { focus: true });
    }
  });
})();

async function loadOpeningsFromCloud() {
  const { data: sessionData } = await sb.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  const { data, error } = await sb
    .from("openings")
    .select("payload")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Cloud load error:", error);
    return;
  }

  if (!data) return;

  const cloudOpenings = data.map((r) => r.payload);

  const local = JSON.parse(localStorage.getItem("archive") || "[]");

  const merged = [...local];

  for (const item of cloudOpenings) {
    const exists = merged.some(
      (x) => JSON.stringify(x) === JSON.stringify(item),
    );
    if (!exists) merged.push(item);
  }

  localStorage.setItem("archive", JSON.stringify(merged));

  if (typeof renderArchiveList === "function") {
    renderArchiveList();
  }
}
