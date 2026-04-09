(function () {
  "use strict";

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
})();
