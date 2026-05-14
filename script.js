(function () {
  "use strict";

  var MIN_DISPLAY_MS = 2000;
  var HIDE_TRANSITION_MS = 450;
  var LOAD_FALLBACK_MS = 30000;

  var loaderEl = document.getElementById("page-loader");
  var pctEl = document.getElementById("page-loader-pct");
  var progressBarEl = document.getElementById("page-loader-progress");
  var statusEl = document.getElementById("page-loader-status");

  var loaderDone = false;
  var loaderStarted = performance.now();
  var displayedPct = 0;
  var targetPct = 3;

  function bumpProgress(minPct, statusText) {
    if (typeof minPct === "number") {
      targetPct = Math.max(targetPct, Math.min(100, minPct));
    }
    if (statusText && statusEl) {
      statusEl.textContent = statusText;
    }
  }

  function paintProgress(pct) {
    var clamped = Math.min(100, Math.max(0, pct));
    if (loaderEl) {
      loaderEl.style.setProperty("--loader-pct", String(clamped));
    }
    if (pctEl) {
      pctEl.textContent = String(Math.round(clamped));
    }
    if (progressBarEl) {
      progressBarEl.setAttribute("aria-valuenow", String(Math.round(clamped)));
    }
  }

  function loaderRafTick() {
    if (loaderDone) return;
    displayedPct += (targetPct - displayedPct) * 0.11;
    if (Math.abs(targetPct - displayedPct) < 0.22) {
      displayedPct = targetPct;
    }
    paintProgress(displayedPct);
    requestAnimationFrame(loaderRafTick);
  }

  requestAnimationFrame(loaderRafTick);

  window.setTimeout(function () {
    bumpProgress(9, null);
  }, 80);

  function onDomReady() {
    bumpProgress(28, "ページ構成を読み込み中…");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDomReady);
  } else {
    onDomReady();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      bumpProgress(52, "フォントを適用しています…");
    });
  } else {
    bumpProgress(46, "スタイルを適用しています…");
  }

  var heroVideo = document.querySelector(".hero-video");
  if (heroVideo) {
    var videoBumped = false;
    function onVideoReady() {
      if (videoBumped) return;
      videoBumped = true;
      bumpProgress(82, "動画・メディアを準備中…");
    }
    heroVideo.addEventListener("loadeddata", onVideoReady);
    heroVideo.addEventListener("canplay", onVideoReady);
    if (heroVideo.readyState >= 2) {
      onVideoReady();
    }
  } else {
    bumpProgress(72, "コンテンツを読み込み中…");
  }

  function hidePageLoader() {
    if (loaderDone) return;
    loaderDone = true;

    targetPct = 100;
    displayedPct = 100;
    paintProgress(100);
    if (statusEl) {
      statusEl.textContent = "表示の準備が完了しました";
    }

    var elapsed = performance.now() - loaderStarted;
    var remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    window.setTimeout(function () {
      document.body.classList.remove("is-loading");
      if (!loaderEl) return;

      loaderEl.classList.add("page-loader--hide");
      loaderEl.setAttribute("aria-busy", "false");

      window.setTimeout(function () {
        loaderEl.hidden = true;
        loaderEl.setAttribute("aria-hidden", "true");
      }, HIDE_TRANSITION_MS);
    }, remaining);
  }

  window.addEventListener("load", hidePageLoader);

  window.setTimeout(function () {
    if (!loaderDone) {
      if (statusEl) {
        statusEl.textContent = "読み込みに時間がかかっています。表示します…";
      }
      hidePageLoader();
    }
  }, LOAD_FALLBACK_MS);

  // 活用例タブ
  var tabs = document.querySelectorAll(".usecase-tabs .tab");
  var panels = document.querySelectorAll(".usecase-panels .panel");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("data-panel");
      if (!id) return;

      tabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");

      panels.forEach(function (panel) {
        var isMatch = panel.id === id;
        panel.classList.toggle("is-active", isMatch);
        panel.hidden = !isMatch;
      });
    });
  });

  // お問い合わせ → GAS: 従来の <form> POST + iframe（e.parameter に必ず乗る／no-cors fetch の空本文問題を避ける）
  var form = document.getElementById("contact-form");
  var note = document.getElementById("contact-form-note");
  var submitBtn = document.getElementById("contact-submit");
  var bridge = document.getElementById("gas-bridge-form");
  var frame = document.getElementById("gas-bridge-iframe");
  if (form && note && bridge) {
    var gasSubmitPending = false;
    var gasLoadTimer = null;
    if (frame) {
      frame.addEventListener("load", function () {
        if (gasLoadTimer) {
          clearTimeout(gasLoadTimer);
          gasLoadTimer = null;
        }
        if (!gasSubmitPending) return;
        gasSubmitPending = false;
        note.textContent =
          "送信しました。内容を確認のうえ、折り返しご連絡いたします。";
        note.className = "form-note form-note--ok";
        form.reset();
        if (submitBtn) submitBtn.disabled = false;
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var url =
        typeof window.GAS_WEB_APP_URL === "string" ? window.GAS_WEB_APP_URL.trim() : "";
      if (!url) {
        note.textContent =
          "送信先URLが未設定です。config.js の GAS_WEB_APP_URL に、GASのウェブアプリURL（/exec）を設定してください。";
        note.className = "form-note form-note--error";
        return;
      }

      var nameEl = document.getElementById("cf-name");
      var emailEl = document.getElementById("cf-email");
      var companyEl = document.getElementById("cf-company");
      var phoneEl = document.getElementById("cf-phone");
      var messageEl = document.getElementById("cf-message");
      var privacyEl = document.getElementById("cf-privacy");

      if (!nameEl || !emailEl || !messageEl || !privacyEl) return;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (!privacyEl.checked) {
        note.textContent = "個人情報の取り扱いへの同意が必要です。";
        note.className = "form-note form-note--error";
        return;
      }

      document.getElementById("gas-f-name").value = nameEl.value.trim();
      document.getElementById("gas-f-email").value = emailEl.value.trim();
      document.getElementById("gas-f-company").value = companyEl ? companyEl.value.trim() : "";
      document.getElementById("gas-f-phone").value = phoneEl ? phoneEl.value.trim() : "";
      document.getElementById("gas-f-message").value = messageEl.value.trim();
      document.getElementById("gas-f-privacy").value = "true";
      var secretInput = document.getElementById("gas-f-secret");
      var secret =
        typeof window.GAS_FORM_SECRET === "string" ? window.GAS_FORM_SECRET.trim() : "";
      if (secretInput) {
        secretInput.value = secret;
      }

      bridge.action = url;
      bridge.setAttribute("action", url);

      note.textContent = "送信中です…";
      note.className = "form-note";
      if (submitBtn) submitBtn.disabled = true;

      gasSubmitPending = true;
      if (gasLoadTimer) {
        clearTimeout(gasLoadTimer);
      }
      gasLoadTimer = setTimeout(function () {
        gasLoadTimer = null;
        if (!gasSubmitPending) return;
        gasSubmitPending = false;
        if (submitBtn) submitBtn.disabled = false;
        note.textContent =
          "反応が返ってきません。スプレッドシートに行が追記されているかご確認ください。引き続き送れない場合は、GASのデプロイURLと再デプロイをご確認ください。";
        note.className = "form-note form-note--error";
      }, 60000);
      bridge.submit();
    });
  }
})();
