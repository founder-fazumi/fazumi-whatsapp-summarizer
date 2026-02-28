(function () {
  var ATTRS = [
    "fdprocessedid",
    "cz-shortcut-listen",
    "data-new-gr-c-s-check-loaded",
    "data-gr-ext-installed",
  ];

  function scrubElement(element) {
    for (var i = 0; i < ATTRS.length; i += 1) {
      if (element.hasAttribute(ATTRS[i])) {
        element.removeAttribute(ATTRS[i]);
      }
    }
  }

  function scrubTree(node) {
    if (!node || node.nodeType !== 1) {
      return;
    }

    scrubElement(node);

    var descendants = node.querySelectorAll("*");
    for (var i = 0; i < descendants.length; i += 1) {
      scrubElement(descendants[i]);
    }
  }

  scrubTree(document.documentElement);

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i += 1) {
      var mutation = mutations[i];

      if (mutation.type === "attributes" && mutation.target) {
        scrubTree(mutation.target);
      }

      if (mutation.type === "childList") {
        for (var j = 0; j < mutation.addedNodes.length; j += 1) {
          scrubTree(mutation.addedNodes[j]);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ATTRS,
  });

  window.setTimeout(function () {
    observer.disconnect();
  }, 4000);
})();
