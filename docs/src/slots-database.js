const SLOT_DATABASE = [];

// Active opening controls are initialized after app.js has loaded.
// This keeps the starting balance locked during normal play and requires
// an explicit Edit -> Save action before it can be changed.
setTimeout(() => {
  const initStartingBalanceEditor = () => {
    const summaryCard = document.querySelector("#new-phase-play .summary-card");
    const breakEvenRow = document.getElementById("break-even-x")?.closest(".row");
    if (!summaryCard || !breakEvenRow) return;
    if (document.getElementById("active-start-balance-row")) return;

    const row = document.createElement("div");
    row.className = "row";
    row.id = "active-start-balance-row";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "Starting balance:";

    const value = document.createElement("div");
    value.className = "value";

    const display = document.createElement("span");
    display.id = "active-start-balance-display";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.id = "active-start-balance-edit";
    editBtn.textContent = "Edit";
    editBtn.style.marginLeft = "8px";

    value.append(display, editBtn);
    row.append(label, value);
    summaryCard.insertBefore(row, breakEvenRow);

    const renderDisplay = () => {
      if (!display) return;
      if (!isFiniteNumber(currentOpeningStartBalanceInput)) {
        display.textContent = "-";
        return;
      }

      const inputValue = Number(currentOpeningStartBalanceInput).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      display.textContent = `${currencySymbol(currentOpeningCurrency)}${inputValue}`;
    };

    const setEditing = (editing) => {
      value.innerHTML = "";

      if (!editing) {
        const nextDisplay = document.createElement("span");
        nextDisplay.id = "active-start-balance-display";
        value.append(nextDisplay);
        display = nextDisplay;

        const nextEditBtn = document.createElement("button");
        nextEditBtn.type = "button";
        nextEditBtn.id = "active-start-balance-edit";
        nextEditBtn.textContent = "Edit";
        nextEditBtn.style.marginLeft = "8px";
        value.append(nextEditBtn);
        nextEditBtn.addEventListener("click", () => setEditing(true));

        renderDisplay();
        return;
      }

      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.01";
      input.min = "0";
      input.value = isFiniteNumber(currentOpeningStartBalanceInput)
        ? String(currentOpeningStartBalanceInput)
        : "";
      input.style.maxWidth = "140px";

      const select = document.createElement("select");
      ["ARS", "EUR", "USD"].forEach((code) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = code;
        select.appendChild(option);
      });
      select.value = currentOpeningCurrency || "ARS";

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.textContent = "Save";
      saveBtn.style.marginLeft = "8px";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.marginLeft = "6px";

      value.append(input, select, saveBtn, cancelBtn);
      input.focus();
      input.select();

      cancelBtn.addEventListener("click", () => setEditing(false));

      saveBtn.addEventListener("click", () => {
        const nextInput = input.value === "" ? null : Number(input.value);
        const nextCurrency = select.value || "ARS";

        if (!isFiniteNumber(nextInput) || Number(nextInput) < 0) {
          alert("Starting balance must be a valid number greater than or equal to 0.");
          input.focus();
          return;
        }

        if (!isCurrencyReady(nextCurrency)) {
          alert("This currency is not configured correctly.");
          return;
        }

        const nextARS = toARS(Number(nextInput), nextCurrency);
        if (!isFiniteNumber(nextARS) || Number(nextARS) < 0) {
          alert("Could not convert the starting balance.");
          return;
        }

        currentOpeningStartBalanceInput = Number(nextInput);
        currentOpeningCurrency = nextCurrency;
        currentOpeningStartBalance = Number(nextARS);

        saveCurrentStartBalance();

        if (openingCurrencySelect) openingCurrencySelect.value = nextCurrency;
        if (betCurrencySelect) betCurrencySelect.value = nextCurrency;
        if (startingBalanceInput) {
          startingBalanceInput.value = String(nextInput);
          startingBalanceInput.disabled = true;
        }

        setEditing(false);

        // renderNewOpeningSummary uses currentOpeningStartBalance, so the
        // break-even average X updates immediately after saving.
        renderNewOpeningSummary();
        updatePreButtonState();
        updateStartButtonState();
        updateFinishButtonState();
      });
    };

    editBtn.addEventListener("click", () => setEditing(true));
    renderDisplay();
  };

  initStartingBalanceEditor();
}, 0);

// During an active opening, the "Best win game" metric is ranked by X
// (win / bet), not by the absolute monetary win.
setTimeout(() => {
  if (typeof renderNewOpeningSummary !== "function") return;
  const originalRenderNewOpeningSummary = renderNewOpeningSummary;

  window.renderNewOpeningSummary = function () {
    originalRenderNewOpeningSummary();

    if (!bestWinGameEl) return;

    const done = currentOpeningGames.filter((g) => {
      const win = Number(g.win);
      const bet = Number(g.bet);
      return Number.isFinite(win) && Number.isFinite(bet) && bet > 0;
    });

    if (!done.length) {
      bestWinGameEl.textContent = "-";
      return;
    }

    const best = done.reduce((currentBest, game) => {
      const x = Number(game.win) / Number(game.bet);
      if (!currentBest) return game;
      return x > Number(currentBest.win) / Number(currentBest.bet)
        ? game
        : currentBest;
    }, null);

    const x = Number(best.win) / Number(best.bet);
    bestWinGameEl.textContent = `${best.name} (${formatMoneyFromARS(Number(best.win))} | ${x.toFixed(2)}x)`;
  };
}, 0);
