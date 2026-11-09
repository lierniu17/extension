var content = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  function isHTMLElement(el) {
    return !!el && el.nodeType === 1;
  }
  function isInputElement(el) {
    return el?.nodeType === 1 && el.tagName === "INPUT";
  }
  function isTextAreaElement(el) {
    return el?.nodeType === 1 && el.tagName === "TEXTAREA";
  }
  function isSelectElement(el) {
    return el?.nodeType === 1 && el.tagName === "SELECT";
  }
  function isAnchorElement(el) {
    return el?.nodeType === 1 && el.tagName === "A";
  }
  function getIframeOffset(element) {
    const frame = element.ownerDocument.defaultView?.frameElement;
    if (!frame) return { x: 0, y: 0 };
    const rect = frame.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }
  function getNativeValueSetter(element) {
    return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value").set;
  }
  async function waitFor(seconds) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
  }
  async function movePointerToElement(element, x, y) {
    const offset = getIframeOffset(element);
    window.dispatchEvent(
      new CustomEvent("PageAgent::MovePointerTo", {
        detail: { x: x + offset.x, y: y + offset.y }
      })
    );
    await waitFor(0.3);
  }
  async function clickPointer() {
    window.dispatchEvent(new CustomEvent("PageAgent::ClickPointer"));
  }
  async function enablePassThrough() {
    window.dispatchEvent(new CustomEvent("PageAgent::EnablePassThrough"));
  }
  async function disablePassThrough() {
    window.dispatchEvent(new CustomEvent("PageAgent::DisablePassThrough"));
  }
  function getElementByHint(selectorMap, hint) {
    const interactiveNode = selectorMap.get(hint.toLowerCase());
    if (interactiveNode?.ref && isHTMLElement(interactiveNode.ref)) {
      return interactiveNode.ref;
    }
    const el = document.querySelector(`[data-pa-hint="${hint.toUpperCase()}"]`);
    if (el && isHTMLElement(el)) {
      return el;
    }
    throw new Error(`No interactive element found for hint "${hint}"`);
  }
  let lastClickedElement = null;
  function blurLastClickedElement() {
    if (lastClickedElement) {
      lastClickedElement.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
      lastClickedElement.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false }));
      lastClickedElement.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      lastClickedElement.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
      lastClickedElement.blur();
      lastClickedElement = null;
    }
  }
  async function clickElement(element) {
    blurLastClickedElement();
    lastClickedElement = element;
    await scrollIntoViewIfNeeded(element);
    const frame = element.ownerDocument.defaultView?.frameElement;
    if (frame) await scrollIntoViewIfNeeded(frame);
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    await movePointerToElement(element, x, y);
    await clickPointer();
    await waitFor(0.1);
    const doc = element.ownerDocument;
    await enablePassThrough();
    const hitTarget = doc.elementFromPoint(x, y);
    await disablePassThrough();
    const target = hitTarget instanceof HTMLElement && element.contains(hitTarget) ? hitTarget : element;
    const pointerOpts = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerType: "mouse"
    };
    const mouseOpts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
    target.dispatchEvent(new PointerEvent("pointerover", pointerOpts));
    target.dispatchEvent(new PointerEvent("pointerenter", { ...pointerOpts, bubbles: false }));
    target.dispatchEvent(new MouseEvent("mouseover", mouseOpts));
    target.dispatchEvent(new MouseEvent("mouseenter", { ...mouseOpts, bubbles: false }));
    target.dispatchEvent(new PointerEvent("pointerdown", pointerOpts));
    target.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
    element.focus({ preventScroll: true });
    target.dispatchEvent(new PointerEvent("pointerup", pointerOpts));
    target.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
    target.click();
    await waitFor(0.2);
  }
  async function inputTextElement(element, text) {
    const isContentEditable = element.isContentEditable;
    if (!isInputElement(element) && !isTextAreaElement(element) && !isContentEditable) {
      throw new Error("Element is not an input, textarea, or contenteditable");
    }
    await clickElement(element);
    if (isContentEditable) {
      if (element.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "deleteContent"
        })
      )) {
        element.innerText = "";
        element.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "deleteContent"
          })
        );
      }
      if (element.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text
        })
      )) {
        element.innerText = text;
        element.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: text
          })
        );
      }
      const planASucceeded = element.innerText.trim() === text.trim();
      if (!planASucceeded) {
        element.focus();
        const doc = element.ownerDocument;
        const selection = (doc.defaultView || window).getSelection();
        const range = doc.createRange();
        range.selectNodeContents(element);
        selection?.removeAllRanges();
        selection?.addRange(range);
        doc.execCommand("delete", false);
        doc.execCommand("insertText", false, text);
      }
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.blur();
    } else {
      getNativeValueSetter(element).call(element, text);
    }
    if (!isContentEditable) {
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await waitFor(0.1);
    blurLastClickedElement();
  }
  async function selectOptionElement(selectElement, optionText) {
    if (!isSelectElement(selectElement)) {
      throw new Error("Element is not a select element");
    }
    const options = Array.from(selectElement.options);
    const option = options.find((opt) => opt.textContent?.trim() === optionText.trim());
    if (!option) {
      throw new Error(`Option with text "${optionText}" not found in select element`);
    }
    selectElement.value = option.value;
    selectElement.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(0.1);
  }
  async function scrollIntoViewIfNeeded(element) {
    const el = element;
    if (typeof el.scrollIntoViewIfNeeded === "function") {
      el.scrollIntoViewIfNeeded();
    } else {
      element.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }
  }
  async function scrollVertically(scroll_amount, element) {
    if (element) {
      const targetElement = element;
      let currentElement = targetElement;
      let scrollSuccess = false;
      let scrolledElement = null;
      let actualDelta = 0;
      let beforeAtSuccess = 0;
      let maxAtSuccess = 0;
      let attempts = 0;
      const dy2 = scroll_amount;
      while (currentElement && attempts < 10) {
        const computedStyle = window.getComputedStyle(currentElement);
        const hasScrollableY = /(auto|scroll|overlay)/.test(computedStyle.overflowY) || computedStyle.scrollbarWidth && computedStyle.scrollbarWidth !== "auto" || computedStyle.scrollbarGutter && computedStyle.scrollbarGutter !== "auto";
        const canScrollVertically = currentElement.scrollHeight > currentElement.clientHeight;
        if (hasScrollableY && canScrollVertically) {
          const beforeScroll = currentElement.scrollTop;
          const maxScroll = currentElement.scrollHeight - currentElement.clientHeight;
          let clampedAmount = dy2;
          if (clampedAmount > 0) clampedAmount = Math.min(clampedAmount, maxScroll - beforeScroll);
          else clampedAmount = Math.max(clampedAmount, -beforeScroll);
          currentElement.scrollTop = beforeScroll + clampedAmount;
          const afterScroll = currentElement.scrollTop;
          const delta = afterScroll - beforeScroll;
          if (Math.abs(delta) > 0.5) {
            scrollSuccess = true;
            scrolledElement = currentElement;
            actualDelta = delta;
            beforeAtSuccess = beforeScroll;
            maxAtSuccess = maxScroll;
            break;
          }
        }
        if (currentElement === document.body || currentElement === document.documentElement) break;
        currentElement = currentElement.parentElement;
        attempts++;
      }
      console.log("[scrollVertically] container mode", {
        requestedDy: dy2,
        success: scrollSuccess,
        containerTag: scrolledElement?.tagName,
        before: beforeAtSuccess,
        delta: actualDelta,
        max: maxAtSuccess
      });
      if (!scrollSuccess) {
        return `❌ No scrollable container found for element (${targetElement.tagName}).`;
      }
      const after = beforeAtSuccess + actualDelta;
      const reachedBottom = dy2 > 0 && after >= maxAtSuccess - 1;
      const reachedTop = dy2 < 0 && after <= 1;
      const tail = reachedBottom ? " Reached bottom — do NOT scroll further down." : reachedTop ? " Reached top — do NOT scroll further up." : "";
      return `✅ Scrolled container <${scrolledElement?.tagName}> by ${actualDelta}px (scrollTop: ${beforeAtSuccess}→${after} / max ${maxAtSuccess}).${tail}`;
    }
    const dy = scroll_amount;
    const bigEnough = (el2) => el2.clientHeight >= window.innerHeight * 0.5;
    const canScroll = (el2) => el2 && /(auto|scroll|overlay)/.test(getComputedStyle(el2).overflowY) && el2.scrollHeight > el2.clientHeight && bigEnough(el2);
    let el = document.activeElement;
    while (el && !canScroll(el) && el !== document.body) el = el.parentElement;
    el = canScroll(el) ? el : Array.from(document.querySelectorAll("*")).find(canScroll) || document.scrollingElement || document.documentElement;
    const viewportH = window.innerHeight;
    if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
      const scrollBefore = window.scrollY;
      const scrollMax = document.documentElement.scrollHeight - viewportH;
      window.scrollBy(0, dy);
      const scrollAfter = window.scrollY;
      const scrolled = scrollAfter - scrollBefore;
      console.log("[scrollVertically] page mode", {
        requestedDy: dy,
        before: scrollBefore,
        after: scrollAfter,
        delta: scrolled,
        max: scrollMax,
        viewportH
      });
      if (Math.abs(scrolled) < 1) {
        return dy > 0 ? `⚠️ Already at the bottom of the page (scrollY ${scrollBefore} / max ${scrollMax}). Do NOT scroll down again — there is no more content below.` : `⚠️ Already at the top of the page (scrollY ${scrollBefore}). Do NOT scroll up again.`;
      }
      const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1;
      const reachedTop = dy < 0 && scrollAfter <= 1;
      const tail = reachedBottom ? " Reached bottom — do NOT scroll further down." : reachedTop ? " Reached top — do NOT scroll further up." : "";
      return `✅ Scrolled page by ${scrolled}px (scrollY: ${scrollBefore}→${scrollAfter} / max ${scrollMax}, viewport ${viewportH}px).${tail}`;
    } else {
      const warningMsg = `Document not scrollable; fell back to container <${el.tagName}>.`;
      console.log(`[scrollVertically] ${warningMsg}`);
      const scrollBefore = el.scrollTop;
      const scrollMax = el.scrollHeight - el.clientHeight;
      el.scrollBy({ top: dy, behavior: "smooth" });
      await waitFor(0.1);
      const scrollAfter = el.scrollTop;
      const scrolled = scrollAfter - scrollBefore;
      console.log("[scrollVertically] container fallback", {
        requestedDy: dy,
        containerTag: el.tagName,
        before: scrollBefore,
        after: scrollAfter,
        delta: scrolled,
        max: scrollMax
      });
      if (Math.abs(scrolled) < 1) {
        return dy > 0 ? `⚠️ ${warningMsg} Already at the bottom (scrollTop ${scrollBefore} / max ${scrollMax}). Do NOT scroll down again.` : `⚠️ ${warningMsg} Already at the top (scrollTop ${scrollBefore}). Do NOT scroll up again.`;
      }
      const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1;
      const reachedTop = dy < 0 && scrollAfter <= 1;
      const tail = reachedBottom ? " Reached bottom — do NOT scroll further down." : reachedTop ? " Reached top — do NOT scroll further up." : "";
      return `✅ ${warningMsg} Scrolled by ${scrolled}px (scrollTop: ${scrollBefore}→${scrollAfter} / max ${scrollMax}).${tail}`;
    }
  }
  async function scrollHorizontally(scroll_amount, element) {
    if (element) {
      const targetElement = element;
      let currentElement = targetElement;
      let scrollSuccess = false;
      let scrolledElement = null;
      let scrollDelta = 0;
      let attempts = 0;
      const dx2 = scroll_amount;
      while (currentElement && attempts < 10) {
        const computedStyle = window.getComputedStyle(currentElement);
        const hasScrollableX = /(auto|scroll|overlay)/.test(computedStyle.overflowX) || computedStyle.scrollbarWidth && computedStyle.scrollbarWidth !== "auto" || computedStyle.scrollbarGutter && computedStyle.scrollbarGutter !== "auto";
        const canScrollHorizontally = currentElement.scrollWidth > currentElement.clientWidth;
        if (hasScrollableX && canScrollHorizontally) {
          const beforeScroll = currentElement.scrollLeft;
          const maxScroll = currentElement.scrollWidth - currentElement.clientWidth;
          let scrollAmount = dx2 / 3;
          if (scrollAmount > 0) {
            scrollAmount = Math.min(scrollAmount, maxScroll - beforeScroll);
          } else {
            scrollAmount = Math.max(scrollAmount, -beforeScroll);
          }
          currentElement.scrollLeft = beforeScroll + scrollAmount;
          const afterScroll = currentElement.scrollLeft;
          const actualScrollDelta = afterScroll - beforeScroll;
          if (Math.abs(actualScrollDelta) > 0.5) {
            scrollSuccess = true;
            scrolledElement = currentElement;
            scrollDelta = actualScrollDelta;
            break;
          }
        }
        if (currentElement === document.body || currentElement === document.documentElement) {
          break;
        }
        currentElement = currentElement.parentElement;
        attempts++;
      }
      if (scrollSuccess) {
        return `Scrolled container (${scrolledElement?.tagName}) horizontally by ${scrollDelta}px`;
      } else {
        return `No horizontally scrollable container found for element (${targetElement.tagName})`;
      }
    }
    const dx = scroll_amount;
    const bigEnough = (el2) => el2.clientWidth >= window.innerWidth * 0.5;
    const canScroll = (el2) => el2 && /(auto|scroll|overlay)/.test(getComputedStyle(el2).overflowX) && el2.scrollWidth > el2.clientWidth && bigEnough(el2);
    let el = document.activeElement;
    while (el && !canScroll(el) && el !== document.body) el = el.parentElement;
    el = canScroll(el) ? el : Array.from(document.querySelectorAll("*")).find(canScroll) || document.scrollingElement || document.documentElement;
    if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
      const scrollBefore = window.scrollX;
      const scrollMax = document.documentElement.scrollWidth - window.innerWidth;
      window.scrollBy(dx, 0);
      const scrollAfter = window.scrollX;
      const scrolled = scrollAfter - scrollBefore;
      if (Math.abs(scrolled) < 1) {
        return dx > 0 ? `⚠️ Already at the right edge of the page, cannot scroll right further.` : `⚠️ Already at the left edge of the page, cannot scroll left further.`;
      }
      const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1;
      const reachedLeft = dx < 0 && scrollAfter <= 1;
      if (reachedRight)
        return `✅ Scrolled page by ${scrolled}px. Reached the right edge of the page.`;
      if (reachedLeft) return `✅ Scrolled page by ${scrolled}px. Reached the left edge of the page.`;
      return `✅ Scrolled page horizontally by ${scrolled}px.`;
    } else {
      const warningMsg = `The document is not scrollable. Falling back to container scroll.`;
      console.log(`[PageController] ${warningMsg}`);
      const scrollBefore = el.scrollLeft;
      const scrollMax = el.scrollWidth - el.clientWidth;
      el.scrollBy({ left: dx, behavior: "smooth" });
      await waitFor(0.1);
      const scrollAfter = el.scrollLeft;
      const scrolled = scrollAfter - scrollBefore;
      if (Math.abs(scrolled) < 1) {
        return dx > 0 ? `⚠️ ${warningMsg} Already at the right edge of container (${el.tagName}), cannot scroll right further.` : `⚠️ ${warningMsg} Already at the left edge of container (${el.tagName}), cannot scroll left further.`;
      }
      const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1;
      const reachedLeft = dx < 0 && scrollAfter <= 1;
      if (reachedRight)
        return `✅ ${warningMsg} Scrolled container (${el.tagName}) by ${scrolled}px. Reached the right edge.`;
      if (reachedLeft)
        return `✅ ${warningMsg} Scrolled container (${el.tagName}) by ${scrolled}px. Reached the left edge.`;
      return `✅ ${warningMsg} Scrolled container (${el.tagName}) horizontally by ${scrolled}px.`;
    }
  }
  const DEFAULT_HINT_CHARACTERS = "sadfjklewcmpgh";
  function generateHintStrings(linkCount, characters = DEFAULT_HINT_CHARACTERS) {
    if (linkCount <= 0) return [];
    const chars = characters.toLowerCase();
    if (chars.length <= 1) return Array.from({ length: linkCount }, (_, i) => String(i));
    let hints = [""];
    let offset = 0;
    while (hints.length - offset < linkCount || hints.length === 1) {
      const hint = hints[offset++];
      for (const ch of chars) {
        hints.push(ch + hint);
      }
    }
    hints = hints.slice(offset, offset + linkCount);
    return hints.sort().map((str) => [...str].reverse().join(""));
  }
  const HIGHLIGHT_CONTAINER_ID = "playwright-highlight-container";
  function renderHintMarkers(nodes) {
    let container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
    if (container) container.remove();
    container = document.createElement("div");
    container.id = HIGHLIGHT_CONTAINER_ID;
    container.setAttribute("data-page-agent-ignore", "true");
    const hasPopoverSupport = typeof container.showPopover === "function";
    if (hasPopoverSupport) {
      container.popover = "manual";
    }
    Object.assign(container.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "2147483640",
      backgroundColor: "transparent",
      overflow: "visible"
    });
    document.body.appendChild(container);
    if (hasPopoverSupport) {
      try {
        ;
        container.showPopover();
      } catch (_e) {
      }
    }
    const fragment = document.createDocumentFragment();
    const allCleanupFns = [];
    for (const item of nodes) {
      const element = item.node;
      const hintStr = item.hintLabel;
      const rects = element.getClientRects();
      if (!rects || rects.length === 0) continue;
      const firstRect = rects[0];
      if (firstRect.width === 0 && firstRect.height === 0) continue;
      const iframeOffset = { x: 0, y: 0 };
      if (item.parentIframe) {
        const iframeRect = item.parentIframe.getBoundingClientRect();
        iframeOffset.x = iframeRect.left;
        iframeOffset.y = iframeRect.top;
      }
      const label = document.createElement("div");
      label.className = "internal-vimium-hint-marker vimiumHintMarker";
      Object.assign(label.style, {
        position: "fixed",
        display: "block",
        whiteSpace: "nowrap",
        overflow: "hidden",
        fontSize: "11px",
        padding: "1px 3px 0px 3px",
        background: "linear-gradient(to bottom, #fff785 0%, #ffc542 100%)",
        border: "solid 1px #c38a22",
        borderRadius: "3px",
        boxShadow: "0px 3px 7px 0px rgba(0, 0, 0, 0.3)",
        pointerEvents: "none",
        top: `${firstRect.top + iframeOffset.y - 1}px`,
        left: `${firstRect.left + iframeOffset.x - 1}px`
      });
      label.innerHTML = hintStr.toUpperCase().split("").map(
        (ch) => `<span style="color:#302505;font-family:Helvetica,Arial,sans-serif;font-weight:bold;font-size:11px;text-shadow:0 1px 0 rgba(255,255,255,0.6)">${ch}</span>`
      ).join("");
      fragment.appendChild(label);
      const updatePosition = () => {
        const newRects = element.getClientRects();
        if (newRects.length > 0) {
          const off = { x: 0, y: 0 };
          if (item.parentIframe) {
            const ir = item.parentIframe.getBoundingClientRect();
            off.x = ir.left;
            off.y = ir.top;
          }
          const r = newRects[0];
          label.style.top = `${r.top + off.y - 1}px`;
          label.style.left = `${r.left + off.x - 1}px`;
          label.style.display = "block";
        } else {
          label.style.display = "none";
        }
      };
      let lastCall = 0;
      const throttledUpdate = () => {
        const now = performance.now();
        if (now - lastCall < 16) return;
        lastCall = now;
        updatePosition();
      };
      window.addEventListener("scroll", throttledUpdate, true);
      window.addEventListener("resize", throttledUpdate);
      allCleanupFns.push(() => {
        window.removeEventListener("scroll", throttledUpdate, true);
        window.removeEventListener("resize", throttledUpdate);
        label.remove();
      });
    }
    container.appendChild(fragment);
    (window._highlightCleanupFunctions = window._highlightCleanupFunctions || []).push(...allCleanupFns);
  }
  const pagenterStrategy = (args = {}) => {
    const {
      viewportExpansion = 0,
      debugMode = false,
      interactiveBlacklist = [],
      interactiveWhitelist = [],
      extractionMode = "interactive"
    } = args;
    let highlightCounter = 0;
    const LARGE_PAGE_ELEMENT_THRESHOLD = 1e4;
    const totalElementCount = document.querySelectorAll("*").length;
    const skipListenerDetection = totalElementCount > LARGE_PAGE_ELEMENT_THRESHOLD;
    const extraData = /* @__PURE__ */ new WeakMap();
    function addExtraData(element, data) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
      extraData.set(element, { ...extraData.get(element), ...data });
    }
    const interactiveMeta = /* @__PURE__ */ new WeakMap();
    function setInteractiveMeta(element, meta) {
      interactiveMeta.set(element, { ...interactiveMeta.get(element), ...meta });
    }
    function getInteractiveMeta(element) {
      return interactiveMeta.get(element) || {};
    }
    const DOM_CACHE = {
      boundingRects: /* @__PURE__ */ new WeakMap(),
      clientRects: /* @__PURE__ */ new WeakMap(),
      computedStyles: /* @__PURE__ */ new WeakMap(),
      // 遍历结束后清空缓存，释放内存
      clearCache: () => {
        DOM_CACHE.boundingRects = /* @__PURE__ */ new WeakMap();
        DOM_CACHE.clientRects = /* @__PURE__ */ new WeakMap();
        DOM_CACHE.computedStyles = /* @__PURE__ */ new WeakMap();
      }
    };
    function getCachedBoundingRect(element) {
      if (!element) return null;
      if (DOM_CACHE.boundingRects.has(element)) return DOM_CACHE.boundingRects.get(element);
      const rect = element.getBoundingClientRect();
      if (rect) DOM_CACHE.boundingRects.set(element, rect);
      return rect;
    }
    function getCachedComputedStyle(element) {
      if (!element) return null;
      if (DOM_CACHE.computedStyles.has(element)) return DOM_CACHE.computedStyles.get(element);
      const style = window.getComputedStyle(element);
      if (style) DOM_CACHE.computedStyles.set(element, style);
      return style;
    }
    function getCachedClientRects(element) {
      if (!element) return null;
      if (DOM_CACHE.clientRects.has(element)) return DOM_CACHE.clientRects.get(element);
      const rects = element.getClientRects();
      if (rects) DOM_CACHE.clientRects.set(element, rects);
      return rects;
    }
    const DOM_HASH_MAP = {};
    const ID = { current: 0 };
    const HIGHLIGHT_CONTAINER_ID2 = "playwright-highlight-container";
    const collectedInteractiveNodes = [];
    function isScrollableElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
      const style = getCachedComputedStyle(element);
      if (!style) return null;
      const display = style.display;
      if (display === "inline" || display === "inline-block") return null;
      const overflowX = style.overflowX;
      const overflowY = style.overflowY;
      const hasScrollbarSignal = style.scrollbarWidth && style.scrollbarWidth !== "auto" || style.scrollbarGutter && style.scrollbarGutter !== "auto";
      const scrollableX = overflowX === "auto" || overflowX === "scroll";
      const scrollableY = overflowY === "auto" || overflowY === "scroll";
      if (!scrollableX && !scrollableY && !hasScrollbarSignal) return null;
      const scrollWidth = element.scrollWidth - element.clientWidth;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const threshold = 4;
      if (scrollWidth < threshold && scrollHeight < threshold) return null;
      if (!scrollableY && !hasScrollbarSignal && scrollWidth < threshold) return null;
      if (!scrollableX && !hasScrollbarSignal && scrollHeight < threshold) return null;
      const scrollData = {
        top: element.scrollTop,
        right: element.scrollWidth - element.clientWidth - element.scrollLeft,
        bottom: element.scrollHeight - element.clientHeight - element.scrollTop,
        left: element.scrollLeft
      };
      addExtraData(element, { scrollable: true, scrollData });
      return scrollData;
    }
    function isTextNodeVisible(textNode) {
      try {
        if (viewportExpansion === -1) {
          const parentElement2 = textNode.parentElement;
          if (!parentElement2) return false;
          try {
            return parentElement2.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
          } catch (e) {
            const style = window.getComputedStyle(parentElement2);
            return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
          }
        }
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rects = range.getClientRects();
        if (!rects || rects.length === 0) return false;
        let isAnyRectVisible = false;
        let isAnyRectInViewport = false;
        for (const rect of rects) {
          if (rect.width > 0 && rect.height > 0) {
            isAnyRectVisible = true;
            if (!(rect.bottom < -viewportExpansion || rect.top > window.innerHeight + viewportExpansion || rect.right < -viewportExpansion || rect.left > window.innerWidth + viewportExpansion)) {
              isAnyRectInViewport = true;
              break;
            }
          }
        }
        if (!isAnyRectVisible || !isAnyRectInViewport) return false;
        const parentElement = textNode.parentElement;
        if (!parentElement) return false;
        try {
          return parentElement.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        } catch (e) {
          const style = window.getComputedStyle(parentElement);
          return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
        }
      } catch (e) {
        return false;
      }
    }
    const SPA_JSON_SCRIPT_IDS = /* @__PURE__ */ new Set([
      "__next_data__",
      "__nuxt_data__",
      "__remix_data__",
      "__next_router_state_tree__"
    ]);
    const SPA_JSON_SCRIPT_TYPES = /* @__PURE__ */ new Set(["application/json", "application/ld+json", "importmap"]);
    function isSpaJsonScript(element) {
      if (element.tagName?.toLowerCase() !== "script") return false;
      const id = (element.id || "").toLowerCase();
      if (id && SPA_JSON_SCRIPT_IDS.has(id)) return true;
      const type = (element.getAttribute("type") || "").toLowerCase().trim();
      if (type && SPA_JSON_SCRIPT_TYPES.has(type)) return true;
      return false;
    }
    const SEMANTIC_DATA_ATTRS = /* @__PURE__ */ new Set([
      "data-testid",
      "data-cy",
      "data-test",
      "data-state",
      "data-scrollable",
      "data-value",
      "data-index",
      "data-id",
      "data-toggle",
      "data-action",
      "data-date-format"
    ]);
    const DATA_ATTR_MAX_LENGTH = 100;
    function shouldKeepAttribute(name, value) {
      if (!name.startsWith("data-")) return true;
      if (SEMANTIC_DATA_ATTRS.has(name)) return true;
      if (value && value.length > DATA_ATTR_MAX_LENGTH) return false;
      return true;
    }
    function isElementAccepted(element) {
      if (!element || !element.tagName) return false;
      const alwaysAccept = /* @__PURE__ */ new Set([
        "body",
        "div",
        "main",
        "article",
        "section",
        "nav",
        "header",
        "footer"
      ]);
      const tagName = element.tagName.toLowerCase();
      if (alwaysAccept.has(tagName)) return true;
      const leafElementDenyList = /* @__PURE__ */ new Set([
        "svg",
        "script",
        "style",
        "link",
        "meta",
        "noscript",
        "template"
      ]);
      if (leafElementDenyList.has(tagName)) return false;
      if (isSpaJsonScript(element)) return false;
      return true;
    }
    function isElementVisible(element) {
      const style = getCachedComputedStyle(element);
      return element.offsetWidth > 0 && element.offsetHeight > 0 && style?.visibility !== "hidden" && style?.display !== "none";
    }
    function getVisibleClientRect(element) {
      const rects = getCachedClientRects(element);
      if (!rects || rects.length === 0) return null;
      const style = getCachedComputedStyle(element);
      if (style?.visibility !== "visible") return null;
      for (const rect of rects) {
        if (rect.width < 3 || rect.height < 3) continue;
        if (viewportExpansion !== -1) {
          if (rect.bottom < -viewportExpansion || rect.top > window.innerHeight + viewportExpansion || rect.right < -viewportExpansion || rect.left > window.innerWidth + viewportExpansion) {
            continue;
          }
        }
        return rect;
      }
      return null;
    }
    let checkForAngularJs = null;
    function initAngularJsCheck() {
      if (checkForAngularJs !== null) return;
      const angularElements = document.getElementsByClassName("ng-scope");
      if (angularElements.length === 0) {
        checkForAngularJs = () => false;
      } else {
        const ngAttributes = [];
        for (const prefix of ["", "data-", "x-"]) {
          for (const separator of ["-", ":", "_"]) {
            ngAttributes.push(`${prefix}ng${separator}click`);
          }
        }
        checkForAngularJs = function(element) {
          for (const attribute of ngAttributes) {
            if (element.hasAttribute(attribute)) return true;
          }
          return false;
        };
      }
    }
    const interactiveCursors = /* @__PURE__ */ new Set([
      "pointer",
      "move",
      "text",
      "grab",
      "grabbing",
      "cell",
      "copy",
      "alias",
      "all-scroll",
      "col-resize",
      "context-menu",
      "crosshair",
      "e-resize",
      "ew-resize",
      "help",
      "n-resize",
      "ne-resize",
      "nesw-resize",
      "ns-resize",
      "nw-resize",
      "nwse-resize",
      "row-resize",
      "s-resize",
      "se-resize",
      "sw-resize",
      "vertical-text",
      "w-resize",
      "zoom-in",
      "zoom-out"
    ]);
    const nonInteractiveCursors = /* @__PURE__ */ new Set([
      "not-allowed",
      "no-drop",
      "wait",
      "progress",
      "initial",
      "inherit"
    ]);
    const interactiveElementTags = /* @__PURE__ */ new Set([
      "a",
      "button",
      "input",
      "select",
      "textarea",
      "details",
      "summary",
      "label",
      "option",
      "optgroup",
      "fieldset",
      "legend"
    ]);
    const interactiveRoles = /* @__PURE__ */ new Set([
      "button",
      "link",
      "menu",
      "menubar",
      "menuitem",
      "menuitemradio",
      "menuitemcheckbox",
      "radio",
      "checkbox",
      "tab",
      "switch",
      "slider",
      "spinbutton",
      "combobox",
      "searchbox",
      "textbox",
      "listbox",
      "option",
      "scrollbar"
    ]);
    const explicitDisableTags = /* @__PURE__ */ new Set(["disabled", "readonly"]);
    function isInteractiveElement(element) {
      const result2 = { isClickable: false, possibleFalsePositive: false, secondClassCitizen: false };
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return result2;
      if (interactiveBlacklist.includes(element)) return result2;
      if (interactiveWhitelist.includes(element)) {
        result2.isClickable = true;
        return result2;
      }
      const tagName = element.tagName.toLowerCase();
      const style = getCachedComputedStyle(element);
      const ariaDisabled = element.getAttribute("aria-disabled");
      if (ariaDisabled && ["", "true"].includes(ariaDisabled.toLowerCase())) return result2;
      if (tagName !== "html" && style?.cursor && interactiveCursors.has(style.cursor)) {
        result2.isClickable = true;
        return result2;
      }
      initAngularJsCheck();
      if (checkForAngularJs(element)) {
        result2.isClickable = true;
        return result2;
      }
      if (element.hasAttribute("onclick")) {
        result2.isClickable = true;
        return result2;
      }
      const role = element.getAttribute("role");
      const ariaRole = element.getAttribute("aria-role");
      if (role && interactiveRoles.has(role.toLowerCase()) || ariaRole && interactiveRoles.has(ariaRole.toLowerCase())) {
        result2.isClickable = true;
        return result2;
      }
      const contentEditable = element.getAttribute("contentEditable");
      if (contentEditable != null && ["", "contenteditable", "true"].includes(contentEditable.toLowerCase())) {
        result2.isClickable = true;
        return result2;
      }
      if (element.isContentEditable) {
        result2.isClickable = true;
        return result2;
      }
      if (element.hasAttribute("jsaction")) {
        const jsactionRules = element.getAttribute("jsaction").split(";");
        for (const rule of jsactionRules) {
          const parts = rule.trim().split(":");
          if (parts.length >= 1 && parts.length <= 2) {
            const [eventType, ...rest] = parts.length === 1 ? ["click", ...parts[0].trim().split(".")] : [parts[0], ...parts[1].trim().split(".")];
            const namespace = rest[0] || "";
            const actionName = rest[1] || "_";
            if (eventType === "click" && namespace !== "none" && actionName !== "_") {
              result2.isClickable = true;
              return result2;
            }
          }
        }
      }
      if (element.classList && (element.classList.contains("button") || element.classList.contains("dropdown-toggle") || element.getAttribute("data-index") || element.getAttribute("data-toggle") === "dropdown" || element.getAttribute("aria-haspopup") === "true")) {
        result2.isClickable = true;
        return result2;
      }
      if (interactiveElementTags.has(tagName)) {
        if (style?.cursor && nonInteractiveCursors.has(style.cursor)) return result2;
        for (const disableTag of explicitDisableTags) {
          if (element.hasAttribute(disableTag) || element.getAttribute(disableTag) === "true" || element.getAttribute(disableTag) === "")
            return result2;
        }
        if (element.disabled) return result2;
        if (element.readOnly) return result2;
        if (element.inert) return result2;
        if (tagName === "input" && element.getAttribute("type")?.toLowerCase() === "hidden")
          return result2;
        if (tagName === "label" && element.control != null && element.control.disabled) return result2;
        result2.isClickable = true;
        return result2;
      }
      if (["div", "ol", "ul"].includes(tagName)) {
        if (element.clientHeight < element.scrollHeight && isScrollableElement(element)) {
          result2.isClickable = true;
          return result2;
        }
      }
      if (skipListenerDetection) {
        if (element.hasAttribute("onclick") || typeof element.onclick === "function") {
          result2.isClickable = true;
          return result2;
        }
      } else
        try {
          if (typeof getEventListeners === "function") {
            const listeners = getEventListeners(element);
            const mouseEvents = ["click", "mousedown", "mouseup", "dblclick"];
            for (const eventType of mouseEvents) {
              if (listeners[eventType] && listeners[eventType].length > 0) {
                result2.isClickable = true;
                return result2;
              }
            }
          }
          const getEventListenersForNode = element?.ownerDocument?.defaultView?.getEventListenersForNode || window.getEventListenersForNode;
          if (typeof getEventListenersForNode === "function") {
            const listeners = getEventListenersForNode(element);
            const interactionEvents = [
              "click",
              "mousedown",
              "mouseup",
              "keydown",
              "keyup",
              "submit",
              "change",
              "input",
              "focus",
              "blur"
            ];
            for (const eventType of interactionEvents) {
              for (const listener of listeners) {
                if (listener.type === eventType) {
                  result2.isClickable = true;
                  return result2;
                }
              }
            }
          }
          const commonMouseAttrs = ["onclick", "onmousedown", "onmouseup", "ondblclick"];
          for (const attr of commonMouseAttrs) {
            if (element.hasAttribute(attr) || typeof element[attr] === "function") {
              result2.isClickable = true;
              return result2;
            }
          }
        } catch (e) {
        }
      if (isScrollableElement(element)) {
        result2.isClickable = true;
        return result2;
      }
      const className = element.getAttribute("class")?.toLowerCase();
      if (className && (className.includes("button") || className.includes("btn"))) {
        result2.isClickable = true;
        result2.possibleFalsePositive = true;
        return result2;
      }
      if (tagName === "span") {
        result2.possibleFalsePositive = true;
      }
      const tabIndexValue = element.getAttribute("tabindex");
      const tabIndex = tabIndexValue ? parseInt(tabIndexValue) : -1;
      if (!result2.isClickable && !(tabIndex < 0) && !isNaN(tabIndex)) {
        result2.isClickable = true;
        result2.secondClassCitizen = true;
        return result2;
      }
      return result2;
    }
    function getElementFromPoint(x, y, root, stack) {
      if (root == null) root = document;
      if (stack == null) stack = [];
      const element = root.elementsFromPoint ? root.elementsFromPoint(x, y)[0] : root.elementFromPoint(x, y);
      if (stack.includes(element)) return element;
      stack.push(element);
      if (element && element.shadowRoot) {
        return getElementFromPoint(x, y, element.shadowRoot, stack) || element;
      }
      return element;
    }
    function isTopElement(element) {
      if (viewportExpansion === -1) return true;
      const rects = getCachedClientRects(element);
      if (!rects || rects.length === 0) return false;
      let isAnyRectInViewport = false;
      for (const rect2 of rects) {
        if (rect2.width > 0 && rect2.height > 0 && !(rect2.bottom < -viewportExpansion || rect2.top > window.innerHeight + viewportExpansion || rect2.right < -viewportExpansion || rect2.left > window.innerWidth + viewportExpansion)) {
          isAnyRectInViewport = true;
          break;
        }
      }
      if (!isAnyRectInViewport) return false;
      const doc = element.ownerDocument;
      if (doc !== window.document) return true;
      let rect = Array.from(rects).find((r) => r.width > 0 && r.height > 0);
      if (!rect) return false;
      const shadowRoot = element.getRootNode();
      if (shadowRoot instanceof ShadowRoot) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        try {
          const topEl = shadowRoot.elementFromPoint(centerX, centerY);
          if (!topEl) return false;
          let current = topEl;
          while (current && current !== shadowRoot) {
            if (current === element) return true;
            current = current.parentElement;
          }
          return false;
        } catch (e) {
          return true;
        }
      }
      const checkPoints = [
        { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 },
        { x: rect.left + 0.1, y: rect.top + 0.1 },
        { x: rect.right - 0.1, y: rect.top + 0.1 },
        { x: rect.left + 0.1, y: rect.bottom - 0.1 },
        { x: rect.right - 0.1, y: rect.bottom - 0.1 }
      ];
      return checkPoints.some(({ x, y }) => {
        try {
          const topEl = getElementFromPoint(x, y);
          if (!topEl) return false;
          return element.contains(topEl) || topEl.contains(element);
        } catch (e) {
          return true;
        }
      });
    }
    function isInExpandedViewport(element, viewportExpansion2) {
      if (viewportExpansion2 === -1) return true;
      const rects = element.getClientRects();
      if (!rects || rects.length === 0) {
        const boundingRect = getCachedBoundingRect(element);
        if (!boundingRect || boundingRect.width === 0 || boundingRect.height === 0) return false;
        return !(boundingRect.bottom < -viewportExpansion2 || boundingRect.top > window.innerHeight + viewportExpansion2 || boundingRect.right < -viewportExpansion2 || boundingRect.left > window.innerWidth + viewportExpansion2);
      }
      for (const rect of rects) {
        if (rect.width === 0 || rect.height === 0) continue;
        if (!(rect.bottom < -viewportExpansion2 || rect.top > window.innerHeight + viewportExpansion2 || rect.right < -viewportExpansion2 || rect.left > window.innerWidth + viewportExpansion2)) {
          return true;
        }
      }
      return false;
    }
    const INTERACTIVE_ARIA_ATTRS = [
      "aria-expanded",
      "aria-checked",
      "aria-selected",
      "aria-pressed",
      "aria-haspopup",
      "aria-controls",
      "aria-owns",
      "aria-activedescendant",
      "aria-valuenow",
      "aria-valuetext",
      "aria-valuemax",
      "aria-valuemin",
      "aria-autocomplete"
    ];
    function hasInteractiveAria(el) {
      for (let i = 0; i < INTERACTIVE_ARIA_ATTRS.length; i++) {
        if (el.hasAttribute(INTERACTIVE_ARIA_ATTRS[i])) return true;
      }
      return false;
    }
    function isInteractiveCandidate(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      const tagName = element.tagName.toLowerCase();
      const fastPathTags = /* @__PURE__ */ new Set([
        "a",
        "button",
        "input",
        "select",
        "textarea",
        "details",
        "summary",
        "label"
      ]);
      if (fastPathTags.has(tagName)) return true;
      return element.hasAttribute("onclick") || element.hasAttribute("role") || element.hasAttribute("tabindex") || hasInteractiveAria(element) || element.hasAttribute("data-action") || element.hasAttribute("jsaction") || element.getAttribute("contenteditable") === "true";
    }
    const DISTINCT_INTERACTIVE_TAGS = /* @__PURE__ */ new Set([
      "a",
      "button",
      "input",
      "select",
      "textarea",
      "summary",
      "details",
      "label",
      "option",
      "li"
    ]);
    const DISTINCT_INTERACTIVE_ROLES = /* @__PURE__ */ new Set([
      "button",
      "link",
      "menuitem",
      "menuitemradio",
      "menuitemcheckbox",
      "radio",
      "checkbox",
      "tab",
      "switch",
      "slider",
      "spinbutton",
      "combobox",
      "searchbox",
      "textbox",
      "listbox",
      "listitem",
      "treeitem",
      "row",
      "option",
      "scrollbar"
    ]);
    function isHeuristicallyInteractive(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      if (!isElementVisible(element)) return false;
      const hasInteractiveAttributes = element.hasAttribute("role") || element.hasAttribute("tabindex") || element.hasAttribute("onclick") || typeof element.onclick === "function";
      const hasInteractiveClass = /\b(btn|clickable|menu|item|entry|link)\b/i.test(
        element.className || ""
      );
      const isInKnownContainer = Boolean(
        element.closest('button,a,[role="button"],.menu,.dropdown,.list,.toolbar')
      );
      const hasVisibleChildren = [...element.children].some(isElementVisible);
      const isParentBody = element.parentElement && element.parentElement.isSameNode(document.body);
      return (isInteractiveElement(element).isClickable || hasInteractiveAttributes || hasInteractiveClass) && hasVisibleChildren && isInKnownContainer && !isParentBody;
    }
    function isElementDistinctInteraction(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      const tagName = element.tagName.toLowerCase();
      const role = element.getAttribute("role");
      if (tagName === "iframe") return true;
      if (DISTINCT_INTERACTIVE_TAGS.has(tagName)) return true;
      if (role && DISTINCT_INTERACTIVE_ROLES.has(role)) return true;
      if (element.isContentEditable || element.getAttribute("contenteditable") === "true") return true;
      if (element.hasAttribute("data-testid") || element.hasAttribute("data-cy") || element.hasAttribute("data-test"))
        return true;
      if (element.hasAttribute("onclick") || typeof element.onclick === "function") return true;
      if (hasInteractiveAria(element)) return true;
      if (!skipListenerDetection) {
        try {
          const getEventListenersForNode = element?.ownerDocument?.defaultView?.getEventListenersForNode || window.getEventListenersForNode;
          if (typeof getEventListenersForNode === "function") {
            const listeners = getEventListenersForNode(element);
            const interactionEvents = [
              "click",
              "mousedown",
              "mouseup",
              "keydown",
              "keyup",
              "submit",
              "change",
              "input",
              "focus",
              "blur"
            ];
            for (const eventType of interactionEvents) {
              for (const listener of listeners) {
                if (listener.type === eventType) return true;
              }
            }
          }
          const commonEventAttrs = [
            "onmousedown",
            "onmouseup",
            "onkeydown",
            "onkeyup",
            "onsubmit",
            "onchange",
            "oninput",
            "onfocus",
            "onblur"
          ];
          if (commonEventAttrs.some((attr) => element.hasAttribute(attr))) return true;
        } catch (e) {
        }
      }
      if (isHeuristicallyInteractive(element)) return true;
      if (extraData.get(element)?.scrollable) return true;
      return false;
    }
    function handleHighlighting(nodeData, node, parentIframe, isParentHighlighted) {
      if (!nodeData.isInteractive) return false;
      let shouldHighlight = false;
      if (!isParentHighlighted) {
        shouldHighlight = true;
      } else {
        if (isElementDistinctInteraction(node)) {
          shouldHighlight = true;
        }
      }
      if (shouldHighlight) {
        nodeData.isInViewport = isInExpandedViewport(node, viewportExpansion);
        if (nodeData.isInViewport || viewportExpansion === -1) {
          nodeData._tempOrder = highlightCounter++;
          collectedInteractiveNodes.push({
            nodeId: `pending_${nodeData._tempOrder}`,
            nodeData,
            node,
            parentIframe
          });
          return true;
        }
      }
      return false;
    }
    function buildDomTree(node, parentIframe = null, isParentHighlighted = false) {
      if (!node || node.id === HIGHLIGHT_CONTAINER_ID2 || node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
        return null;
      }
      if (node.dataset?.browserUseIgnore === "true" || node.dataset?.pageAgentIgnore === "true") {
        return null;
      }
      if (node.getAttribute && node.getAttribute("aria-hidden") === "true") {
        return null;
      }
      if (node === document.body) {
        const nodeData2 = { tagName: "body", attributes: {}, children: [] };
        for (const child of node.childNodes) {
          try {
            const domElement = buildDomTree(child, parentIframe, false);
            if (domElement) nodeData2.children.push(domElement);
          } catch (e) {
          }
        }
        const id2 = `${ID.current++}`;
        DOM_HASH_MAP[id2] = nodeData2;
        return id2;
      }
      if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) return null;
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent?.trim();
        if (!textContent) return null;
        const parentElement = node.parentElement;
        if (!parentElement) return null;
        const parentTag = parentElement.tagName.toLowerCase();
        if (parentTag === "script" || parentTag === "style") return null;
        const id2 = `${ID.current++}`;
        DOM_HASH_MAP[id2] = {
          type: "TEXT_NODE",
          text: textContent,
          isVisible: isTextNodeVisible(node)
        };
        return id2;
      }
      if (node.nodeType === Node.ELEMENT_NODE && !isElementAccepted(node)) return null;
      if (viewportExpansion !== -1 && !node.shadowRoot) {
        const rect = getCachedBoundingRect(node);
        const style = getCachedComputedStyle(node);
        const isFixedOrSticky = style && (style.position === "fixed" || style.position === "sticky");
        const hasSize = node.offsetWidth > 0 || node.offsetHeight > 0;
        if (!rect || !isFixedOrSticky && !hasSize && (rect.bottom < -viewportExpansion || rect.top > window.innerHeight + viewportExpansion || rect.right < -viewportExpansion || rect.left > window.innerWidth + viewportExpansion)) {
          return null;
        }
      }
      const nodeData = {
        tagName: node.tagName.toLowerCase(),
        attributes: {},
        children: []
      };
      if (isInteractiveCandidate(node) || node.tagName.toLowerCase() === "iframe" || node.tagName.toLowerCase() === "body") {
        const attributeNames = node.getAttributeNames?.() || [];
        for (const name of attributeNames) {
          const value = node.getAttribute(name);
          if (!shouldKeepAttribute(name, value)) continue;
          nodeData.attributes[name] = value;
        }
        if (node.tagName.toLowerCase() === "input" && (node.type === "checkbox" || node.type === "radio")) {
          nodeData.attributes.checked = node.checked ? "true" : "false";
        }
      }
      let nodeWasHighlighted = false;
      if (node.nodeType === Node.ELEMENT_NODE) {
        nodeData.isVisible = isElementVisible(node);
        if (nodeData.isVisible) {
          nodeData.isTopElement = isTopElement(node);
          const role = node.getAttribute("role");
          const isMenuContainer = role === "menu" || role === "menubar" || role === "listbox";
          if (nodeData.isTopElement || isMenuContainer) {
            const interactiveResult = isInteractiveElement(node);
            nodeData.isInteractive = interactiveResult.isClickable;
            if (interactiveResult.isClickable) {
              setInteractiveMeta(node, {
                possibleFalsePositive: interactiveResult.possibleFalsePositive,
                secondClassCitizen: interactiveResult.secondClassCitizen
              });
            }
            nodeWasHighlighted = handleHighlighting(nodeData, node, parentIframe, isParentHighlighted);
            nodeData.ref = node;
            if (nodeData.isInteractive && Object.keys(nodeData.attributes).length === 0) {
              const attributeNames = node.getAttributeNames?.() || [];
              for (const name of attributeNames) {
                const value = node.getAttribute(name);
                if (!shouldKeepAttribute(name, value)) continue;
                nodeData.attributes[name] = value;
              }
            }
          }
        }
      }
      if (node.tagName) {
        const tagName = node.tagName.toLowerCase();
        if (tagName === "iframe") {
          try {
            const iframeDoc = node.contentDocument || node.contentWindow?.document;
            if (iframeDoc) {
              for (const child of iframeDoc.childNodes) {
                try {
                  const domElement = buildDomTree(child, node, false);
                  if (domElement) nodeData.children.push(domElement);
                } catch (e) {
                }
              }
            }
          } catch (e) {
          }
        } else if (
          // contentEditable / TinyMCE 富文本编辑器
          node.isContentEditable || node.getAttribute("contenteditable") === "true" || node.id === "tinymce" || node.classList.contains("mce-content-body") || tagName === "body" && node.getAttribute("data-id")?.startsWith("mce_")
        ) {
          for (const child of node.childNodes) {
            try {
              const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted);
              if (domElement) nodeData.children.push(domElement);
            } catch (e) {
            }
          }
        } else {
          if (node.shadowRoot) {
            nodeData.shadowRoot = true;
            for (const child of node.shadowRoot.childNodes) {
              try {
                const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted);
                if (domElement) nodeData.children.push(domElement);
              } catch (e) {
              }
            }
          }
          for (const child of node.childNodes) {
            try {
              const passHighlightStatusToChild = nodeWasHighlighted || isParentHighlighted;
              const domElement = buildDomTree(child, parentIframe, passHighlightStatusToChild);
              if (domElement) nodeData.children.push(domElement);
            } catch (e) {
            }
          }
        }
      }
      if (nodeData.tagName === "a" && nodeData.children.length === 0 && !nodeData.attributes.href) {
        const rect = getCachedBoundingRect(node);
        const hasSize = rect && rect.width > 0 && rect.height > 0 || node.offsetWidth > 0 || node.offsetHeight > 0;
        if (!hasSize) return null;
      }
      nodeData.extra = extraData.get(node) || null;
      const id = `${ID.current++}`;
      DOM_HASH_MAP[id] = nodeData;
      return id;
    }
    function filterFalsePositives(nodes) {
      try {
        const reversed = [...nodes].reverse();
        const descendantsToCheck = [1, 2, 3];
        const filtered = reversed.filter((item, position) => {
          try {
            const meta = getInteractiveMeta(item.node);
            if (!meta.possibleFalsePositive) return true;
            const lookbackWindow = 6;
            let index = Math.max(0, position - lookbackWindow);
            while (index < position) {
              let candidateDescendant = reversed[index].node;
              for (const _ of descendantsToCheck) {
                candidateDescendant = candidateDescendant?.parentElement;
                if (candidateDescendant === item.node) return false;
              }
              index++;
            }
            return true;
          } catch (e) {
            return true;
          }
        });
        return filtered.reverse();
      } catch (e) {
        console.warn("[yaww] filterFalsePositives failed, skipping:", e);
        return nodes;
      }
    }
    function filterOccluded(nodes) {
      try {
        return nodes.filter((item) => {
          try {
            const meta = getInteractiveMeta(item.node);
            if (meta.secondClassCitizen) return false;
            const rect = getVisibleClientRect(item.node);
            if (!rect) return false;
            const midEl = getElementFromPoint(
              rect.left + rect.width * 0.5,
              rect.top + rect.height * 0.5
            );
            if (midEl && (item.node.contains(midEl) || midEl.contains(item.node))) return true;
            const corners = [
              [rect.left + 0.1, rect.top + 0.1],
              [rect.right - 0.1, rect.top + 0.1],
              [rect.left + 0.1, rect.bottom - 0.1],
              [rect.right - 0.1, rect.bottom - 0.1]
            ];
            for (const [x, y] of corners) {
              const el = getElementFromPoint(x, y);
              if (el && (item.node.contains(el) || el.contains(item.node))) return true;
            }
            return false;
          } catch (e) {
            return true;
          }
        });
      } catch (e) {
        console.warn("[yaww] filterOccluded failed, skipping:", e);
        return nodes;
      }
    }
    function findMainContentRoot() {
      const semantic = document.querySelector('main, [role="main"], article');
      if (semantic) return semantic;
      let best = null;
      let bestLen = 0;
      for (const child of document.body.children) {
        const tag = child.tagName?.toLowerCase();
        if (["script", "style", "nav", "header", "footer", "aside"].includes(tag)) continue;
        const len = (child.textContent || "").length;
        if (len > bestLen) {
          bestLen = len;
          best = child;
        }
      }
      return bestLen > 200 ? best : document.body;
    }
    const traversalRoot = extractionMode === "main_content" ? findMainContentRoot() : document.body;
    let rootId = null;
    try {
      rootId = buildDomTree(traversalRoot);
    } catch (e) {
      console.error("[yaww] buildDomTree crashed:", e);
      const fallbackId = `${ID.current++}`;
      DOM_HASH_MAP[fallbackId] = { tagName: "body", attributes: {}, children: [] };
      DOM_CACHE.clearCache();
      return { rootId: fallbackId, map: DOM_HASH_MAP, interactiveNodes: [] };
    }
    try {
      let filteredNodes = [...collectedInteractiveNodes];
      filteredNodes = filterFalsePositives(filteredNodes);
      if (viewportExpansion !== -1) {
        filteredNodes = filterOccluded(filteredNodes);
      }
      const filteredSet = new Set(filteredNodes);
      for (const item of collectedInteractiveNodes) {
        if (!filteredSet.has(item)) {
          item.nodeData.isInteractive = false;
        }
        delete item.nodeData._tempOrder;
      }
      for (const item of filteredNodes) {
        try {
          const el = item.node;
          if (!el) continue;
          const rect = getCachedBoundingRect(el);
          if (!rect || rect.width === 0 || rect.height === 0) continue;
          let cx = rect.left + rect.width / 2;
          let cy = rect.top + rect.height / 2;
          if (item.parentIframe) {
            const iframeRect = item.parentIframe.getBoundingClientRect();
            if (iframeRect) {
              cx += iframeRect.left;
              cy += iframeRect.top;
            }
          }
          item.nodeData.clickCoords = {
            x: Math.round(cx),
            y: Math.round(cy),
            // 保留元素完整尺寸信息，便于未来做偏移计算
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        } catch (e) {
        }
      }
      DOM_CACHE.clearCache();
      return { rootId, map: DOM_HASH_MAP, interactiveNodes: filteredNodes };
    } catch (e) {
      console.error("[yaww] Post-processing crashed:", e);
      for (const item of collectedInteractiveNodes) {
        delete item.nodeData._tempOrder;
      }
      DOM_CACHE.clearCache();
      return { rootId, map: DOM_HASH_MAP, interactiveNodes: collectedInteractiveNodes };
    }
  };
  const DEFAULT_VIEWPORT_EXPANSION = -1;
  function resolveViewportExpansion(viewportExpansion) {
    return viewportExpansion ?? DEFAULT_VIEWPORT_EXPANSION;
  }
  const SEMANTIC_TAGS = /* @__PURE__ */ new Set([
    "nav",
    "menu",
    // 'main',
    "header",
    "footer",
    "aside",
    // 'article',
    // 'form',
    "dialog"
  ]);
  const newElementsCache = /* @__PURE__ */ new WeakMap();
  function getFlatTree(config) {
    const viewportExpansion = resolveViewportExpansion(config.viewportExpansion);
    const interactiveBlacklist = [];
    for (const item of config.interactiveBlacklist || []) {
      if (typeof item === "function") {
        interactiveBlacklist.push(item());
      } else {
        interactiveBlacklist.push(item);
      }
    }
    const interactiveWhitelist = [];
    for (const item of config.interactiveWhitelist || []) {
      if (typeof item === "function") {
        interactiveWhitelist.push(item());
      } else {
        interactiveWhitelist.push(item);
      }
    }
    const result2 = pagenterStrategy({
      viewportExpansion,
      debugMode: true,
      interactiveBlacklist,
      interactiveWhitelist,
      extractionMode: config.extractionMode || "interactive"
    });
    const elements = { rootId: result2.rootId, map: result2.map };
    const interactiveNodes = result2.interactiveNodes || [];
    const hintStrings = generateHintStrings(interactiveNodes.length);
    for (let i = 0; i < interactiveNodes.length; i++) {
      interactiveNodes[i].nodeData.hintLabel = hintStrings[i];
    }
    for (const key of Object.keys(elements.map)) {
      const node = elements.map[key];
      if (node.isInteractive && !node.hintLabel) {
        node.isInteractive = false;
      }
    }
    if (config.showHintMarkers !== false) {
      const renderNodes = interactiveNodes.filter((_n, i) => hintStrings[i]).map((n, i) => ({
        node: n.node,
        parentIframe: n.parentIframe,
        hintLabel: hintStrings[i]
      }));
      renderHintMarkers(renderNodes);
    }
    const currentUrl = window.location.href;
    for (const nodeId in elements.map) {
      const node = elements.map[nodeId];
      if (node.isInteractive && node.ref) {
        const ref = node.ref;
        if (!newElementsCache.has(ref)) {
          newElementsCache.set(ref, currentUrl);
          node.isNew = true;
        }
      }
    }
    return elements;
  }
  const globRegexCache = /* @__PURE__ */ new Map();
  function globToRegex(pattern) {
    let regex = globRegexCache.get(pattern);
    if (!regex) {
      const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      regex = new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
      globRegexCache.set(pattern, regex);
    }
    return regex;
  }
  function matchAttributes(attrs, patterns) {
    const result2 = {};
    for (const pattern of patterns) {
      if (pattern.includes("*")) {
        const regex = globToRegex(pattern);
        for (const key of Object.keys(attrs)) {
          if (regex.test(key) && attrs[key].trim()) {
            result2[key] = attrs[key].trim();
          }
        }
      } else {
        const value = attrs[pattern];
        if (value && value.trim()) {
          result2[pattern] = value.trim();
        }
      }
    }
    return result2;
  }
  function flatTreeToString(flatTree, includeAttributes = [], keepSemanticTags = false) {
    const DEFAULT_INCLUDE_ATTRIBUTES = [
      "title",
      "type",
      "checked",
      "name",
      "role",
      "value",
      "placeholder",
      "data-date-format",
      "alt",
      "aria-label",
      "aria-expanded",
      "data-state",
      "aria-checked",
      // @edit added for better form handling
      "id",
      "for",
      // for jump check
      "target",
      // absolute position dropdown menu
      "aria-haspopup",
      "aria-controls",
      "aria-owns",
      // content editable
      "contenteditable",
      // class names for better element identification
      "class"
    ];
    const includeAttrs = [...includeAttributes, ...DEFAULT_INCLUDE_ATTRIBUTES];
    const capTextLength = (text, maxLength) => {
      if (text.length > maxLength) {
        return text.substring(0, maxLength) + "...";
      }
      return text;
    };
    const buildTreeNode = (nodeId) => {
      const node = flatTree.map[nodeId];
      if (!node) return null;
      if (node.type === "TEXT_NODE") {
        const textNode = node;
        return {
          type: "text",
          text: textNode.text,
          isVisible: textNode.isVisible,
          parent: null,
          children: []
        };
      } else {
        const elementNode = node;
        const children = [];
        if (elementNode.children) {
          for (const childId of elementNode.children) {
            const child = buildTreeNode(childId);
            if (child) {
              child.parent = null;
              children.push(child);
            }
          }
        }
        return {
          type: "element",
          tagName: elementNode.tagName,
          attributes: elementNode.attributes ?? {},
          isVisible: elementNode.isVisible ?? false,
          isInteractive: elementNode.isInteractive ?? false,
          isTopElement: elementNode.isTopElement ?? false,
          isNew: elementNode.isNew ?? false,
          hintLabel: elementNode.hintLabel,
          parent: null,
          children,
          extra: elementNode.extra ?? {}
        };
      }
    };
    const setParentReferences = (node, parent = null) => {
      node.parent = parent;
      for (const child of node.children) {
        setParentReferences(child, node);
      }
    };
    const rootNode = buildTreeNode(flatTree.rootId);
    if (!rootNode) return "";
    setParentReferences(rootNode);
    const hasParentWithHintLabel = (node) => {
      let current = node.parent;
      while (current) {
        if (current.type === "element" && current.hintLabel !== void 0) {
          return true;
        }
        current = current.parent;
      }
      return false;
    };
    const processNode = (node, depth, result22) => {
      let nextDepth = depth;
      const depthStr = "	".repeat(depth);
      if (node.type === "element") {
        const isSemantic = keepSemanticTags && node.tagName && SEMANTIC_TAGS.has(node.tagName);
        if (node.hintLabel !== void 0) {
          nextDepth += 1;
          const text = getAllTextTillNextClickableElement(node);
          let attributesHtmlStr = "";
          if (includeAttrs.length > 0 && node.attributes) {
            const attributesToInclude = matchAttributes(node.attributes, includeAttrs);
            const keys = Object.keys(attributesToInclude);
            if (keys.length > 1) {
              const keysToRemove = /* @__PURE__ */ new Set();
              const seenValues = {};
              for (const key of keys) {
                const value = attributesToInclude[key];
                if (value.length > 5) {
                  if (value in seenValues) {
                    keysToRemove.add(key);
                  } else {
                    seenValues[value] = key;
                  }
                }
              }
              for (const key of keysToRemove) {
                delete attributesToInclude[key];
              }
            }
            if (attributesToInclude.role === node.tagName) {
              delete attributesToInclude.role;
            }
            const attrsToRemoveIfTextMatches = ["aria-label", "placeholder", "title"];
            for (const attr of attrsToRemoveIfTextMatches) {
              if (attributesToInclude[attr] && attributesToInclude[attr].toLowerCase().trim() === text.toLowerCase().trim()) {
                delete attributesToInclude[attr];
              }
            }
            if (Object.keys(attributesToInclude).length > 0) {
              attributesHtmlStr = Object.entries(attributesToInclude).map(([key, value]) => {
                if (key === "class") {
                  const classes = value.trim().split(/\s+/);
                  const capped = classes.slice(0, 5).map((c) => capTextLength(c, 30)).join(" ");
                  return `${key}=${capped}`;
                }
                return `${key}=${capTextLength(value, 30)}`;
              }).join(" ");
            }
          }
          const hintIndicator = node.isNew ? `*[${node.hintLabel}]` : `[${node.hintLabel}]`;
          let line = `${depthStr}${hintIndicator}<${node.tagName ?? ""}`;
          if (attributesHtmlStr) {
            line += ` ${attributesHtmlStr}`;
          }
          if (node.extra) {
            if (node.extra.scrollable) {
              let scrollDataText = "";
              if (node.extra.scrollData?.left)
                scrollDataText += `left=${node.extra.scrollData.left}, `;
              if (node.extra.scrollData?.top) scrollDataText += `top=${node.extra.scrollData.top}, `;
              if (node.extra.scrollData?.right)
                scrollDataText += `right=${node.extra.scrollData.right}, `;
              if (node.extra.scrollData?.bottom)
                scrollDataText += `bottom=${node.extra.scrollData.bottom}`;
              line += ` data-scrollable="${scrollDataText}"`;
            }
          }
          if (text) {
            const trimmedText = text.trim();
            if (!attributesHtmlStr) {
              line += " ";
            }
            line += `>${trimmedText}`;
          } else if (!attributesHtmlStr) {
            line += " ";
          }
          line += " />";
          result22.push(line);
        }
        const emitSemantic = isSemantic && node.hintLabel === void 0;
        const mark = emitSemantic ? result22.length : -1;
        if (emitSemantic) {
          result22.push(`${depthStr}<${node.tagName}>`);
          nextDepth += 1;
        }
        for (const child of node.children) {
          processNode(child, nextDepth, result22);
        }
        if (emitSemantic) {
          if (result22.length === mark + 1) {
            result22.pop();
          } else {
            result22.push(`${depthStr}</${node.tagName}>`);
          }
        }
      } else if (node.type === "text") {
        if (hasParentWithHintLabel(node)) {
          return;
        }
        if (node.parent && node.parent.type === "element" && node.parent.isVisible && node.parent.isTopElement) {
          result22.push(`${depthStr}${node.text ?? ""}`);
        }
      }
    };
    const result2 = [];
    processNode(rootNode, 0, result2);
    return result2.join("\n");
  }
  const getAllTextTillNextClickableElement = (node, maxDepth = -1) => {
    const textParts = [];
    const collectText = (currentNode, currentDepth) => {
      if (maxDepth !== -1 && currentDepth > maxDepth) {
        return;
      }
      if (currentNode.type === "element" && currentNode !== node && currentNode.hintLabel !== void 0) {
        return;
      }
      if (currentNode.type === "text" && currentNode.text) {
        textParts.push(currentNode.text);
      } else if (currentNode.type === "element") {
        for (const child of currentNode.children) {
          collectText(child, currentDepth + 1);
        }
      }
    };
    collectText(node, 0);
    return textParts.join("\n").trim();
  };
  function getSelectorMap(flatTree) {
    const selectorMap = /* @__PURE__ */ new Map();
    const keys = Object.keys(flatTree.map);
    for (const key of keys) {
      const node = flatTree.map[key];
      if (node.isInteractive && typeof node.hintLabel === "string") {
        selectorMap.set(node.hintLabel, node);
      }
    }
    return selectorMap;
  }
  function getElementTextMap(simplifiedHTML) {
    const lines = simplifiedHTML.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    const elementTextMap = /* @__PURE__ */ new Map();
    for (const line of lines) {
      const regex = /^\*?\[([a-z]+)\]<[^>]+>([^<]*)/;
      const match = regex.exec(line);
      if (match) {
        elementTextMap.set(match[1], line);
      }
    }
    return elementTextMap;
  }
  function cleanUpHighlights() {
    const cleanupFunctions = window._highlightCleanupFunctions || [];
    for (const cleanup of cleanupFunctions) {
      if (typeof cleanup === "function") {
        cleanup();
      }
    }
    window._highlightCleanupFunctions = [];
  }
  window.addEventListener("popstate", () => {
    cleanUpHighlights();
  });
  window.addEventListener("hashchange", () => {
    cleanUpHighlights();
  });
  window.addEventListener("beforeunload", () => {
    cleanUpHighlights();
  });
  const navigation = window.navigation;
  if (navigation && typeof navigation.addEventListener === "function") {
    navigation.addEventListener("navigate", () => {
      cleanUpHighlights();
    });
  } else {
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        cleanUpHighlights();
      }
    }, 500);
  }
  function getPageInfo() {
    const viewport_width = window.innerWidth;
    const viewport_height = window.innerHeight;
    const page_width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth || 0);
    const page_height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight || 0
    );
    const scroll_x = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scroll_y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const pixels_below = Math.max(0, page_height - (window.innerHeight + scroll_y));
    const pixels_right = Math.max(0, page_width - (window.innerWidth + scroll_x));
    return {
      // Current viewport dimensions
      viewport_width,
      viewport_height,
      // Total page dimensions
      page_width,
      page_height,
      // Current scroll position
      scroll_x,
      scroll_y,
      pixels_above: scroll_y,
      pixels_below,
      pages_above: viewport_height > 0 ? scroll_y / viewport_height : 0,
      pages_below: viewport_height > 0 ? pixels_below / viewport_height : 0,
      total_pages: viewport_height > 0 ? page_height / viewport_height : 0,
      current_page_position: scroll_y / Math.max(1, page_height - viewport_height),
      pixels_left: scroll_x,
      pixels_right
    };
  }
  function patchReact(pageController) {
    const reactRootElements = document.querySelectorAll(
      '[data-reactroot], [data-reactid], [data-react-checksum], #root, #app, [id^="root-"], [id^="app-"], #adex-wrapper, #adex-root'
    );
    for (const element of reactRootElements) {
      element.setAttribute("data-page-agent-not-interactive", "true");
    }
  }
  class PageController extends EventTarget {
    config;
    /** Corresponds to eval_page in browser-use */
    flatTree = null;
    /**
     * All hint-label-mapped interactive elements (Vimium-style alphabet hints)
     * Corresponds to DOMState.selector_map in browser-use
     */
    selectorMap = /* @__PURE__ */ new Map();
    /** Hint label -> element text description mapping */
    elementTextMap = /* @__PURE__ */ new Map();
    /**
     * Simplified HTML for LLM consumption.
     * Corresponds to clickable_elements_to_string in browser-use
     */
    simplifiedHTML = "<EMPTY>";
    /** last time the tree was updated */
    lastTimeUpdate = 0;
    /** Whether the tree has been indexed at least once */
    isIndexed = false;
    /** Visual mask overlay for blocking user interaction during automation */
    mask = null;
    maskReady = null;
    constructor(config = {}) {
      super();
      this.config = config;
      patchReact();
      if (config.enableMask) this.initMask();
    }
    /**
     * Initialize mask asynchronously (dynamic import to avoid CSS loading in Node)
     */
    initMask() {
      if (this.maskReady !== null) return;
      this.maskReady = (async () => {
        const { SimulatorMask: SimulatorMask2 } = await Promise.resolve().then(() => SimulatorMaskSNxPmVn);
        this.mask = new SimulatorMask2();
      })();
    }
    // ======= State Queries =======
    /**
     * Get current page URL
     */
    async getCurrentUrl() {
      return window.location.href;
    }
    /**
     * Get last tree update timestamp
     */
    async getLastUpdateTime() {
      return this.lastTimeUpdate;
    }
    /**
     * Get structured browser state for LLM consumption.
     * Automatically calls updateTree() to refresh the DOM state.
     */
    async getBrowserState() {
      const url = window.location.href;
      const title = document.title;
      const pi = getPageInfo();
      const viewportExpansion = resolveViewportExpansion(this.config.viewportExpansion);
      await this.updateTree();
      const content2 = this.simplifiedHTML;
      const titleLine = `Current Page: [${title}](${url})`;
      const maxScrollY = Math.max(0, pi.page_height - pi.viewport_height);
      const fitHint = pi.total_pages <= 1.05 ? " — entire page already fits in viewport, scrolling will reveal NO new content" : pi.total_pages <= 1.5 ? ` — page is only ~${pi.total_pages.toFixed(1)} viewports tall; one round-trip scroll exposes everything, then STOP scrolling` : "";
      const pageInfoLine = `Page info: viewport ${pi.viewport_width}x${pi.viewport_height}px, page ${pi.page_width}x${pi.page_height}px (${pi.total_pages.toFixed(1)} viewports tall). ScrollY ${pi.scroll_y}/${maxScrollY} (${pi.pixels_above}px above, ${pi.pixels_below}px below)${fitHint}.`;
      const elementsLabel = viewportExpansion === -1 ? "Interactive elements from top layer of the current page (full page):" : "Interactive elements from top layer of the current page inside the viewport:";
      const hasContentAbove = pi.pixels_above > 4;
      const scrollHintAbove = hasContentAbove && viewportExpansion !== -1 ? `... ${pi.pixels_above}px above viewport — scroll up to see more ...` : "[Start of page]";
      const header = `${titleLine}
${pageInfoLine}

${elementsLabel}

${scrollHintAbove}`;
      const hasContentBelow = pi.pixels_below > 4;
      const footer = hasContentBelow && viewportExpansion !== -1 ? `... ${pi.pixels_below}px below viewport — scroll down to see more ...` : "[End of page]";
      return { url, title, header, content: content2, footer };
    }
    // ======= DOM Tree Operations =======
    /**
     * Update DOM tree, returns simplified HTML for LLM.
     * This is the main method to refresh the page state.
     * Automatically bypasses mask during DOM extraction if enabled.
     *
     * @param overrides Optional DomConfig overrides for this single update.
     *   e.g. `{ viewportExpansion: 0 }` to restrict to viewport-only,
     *   or `{ highlightOpacity: 0.15 }` to make markers more visible.
     */
    async updateTree(overrides) {
      this.dispatchEvent(new Event("beforeUpdate"));
      this.lastTimeUpdate = Date.now();
      if (this.mask) {
        this.mask.wrapper.style.pointerEvents = "none";
      }
      cleanUpHighlights();
      const blacklist = [
        ...this.config.interactiveBlacklist || [],
        ...Array.from(document.querySelectorAll("[data-page-agent-not-interactive]"))
      ];
      const mergedConfig = {
        ...this.config,
        ...overrides,
        interactiveBlacklist: blacklist
      };
      this.flatTree = getFlatTree(mergedConfig);
      this.simplifiedHTML = flatTreeToString(
        this.flatTree,
        mergedConfig.includeAttributes ?? this.config.includeAttributes,
        mergedConfig.keepSemanticTags ?? this.config.keepSemanticTags
      );
      this.selectorMap.clear();
      this.selectorMap = getSelectorMap(this.flatTree);
      this.elementTextMap.clear();
      this.elementTextMap = getElementTextMap(this.simplifiedHTML);
      this.isIndexed = true;
      if (this.mask) {
        this.mask.wrapper.style.pointerEvents = "auto";
      }
      this.dispatchEvent(new Event("afterUpdate"));
      return this.simplifiedHTML;
    }
    /**
     * Clean up all element highlights
     */
    async cleanUpHighlights() {
      console.log("[PageController] cleanUpHighlights");
      cleanUpHighlights();
    }
    // ======= Element Actions =======
    /**
     * Click element by hint label
     */
    async clickElement(hint) {
      try {
        const element = getElementByHint(this.selectorMap, hint);
        const elemText = this.elementTextMap.get(hint.toLowerCase());
        await clickElement(element);
        if (isAnchorElement(element) && element.target === "_blank") {
          return {
            success: true,
            message: `✅ Clicked element (${elemText ?? hint}). ⚠️ Link opened in a new tab.`
          };
        }
        return {
          success: true,
          message: `✅ Clicked element (${elemText ?? hint}).`
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to click element: ${error}`
        };
      }
    }
    /**
     * Input text into element by hint label
     */
    async inputText(hint, text) {
      try {
        const element = getElementByHint(this.selectorMap, hint);
        const elemText = this.elementTextMap.get(hint.toLowerCase());
        await inputTextElement(element, text);
        return {
          success: true,
          message: `✅ Input text (${text}) into element (${elemText ?? hint}).`
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to input text: ${error}`
        };
      }
    }
    /**
     * Select dropdown option by hint label and option text
     */
    async selectOption(hint, optionText) {
      try {
        const element = getElementByHint(this.selectorMap, hint);
        const elemText = this.elementTextMap.get(hint.toLowerCase());
        await selectOptionElement(element, optionText);
        return {
          success: true,
          message: `✅ Selected option (${optionText}) in element (${elemText ?? hint}).`
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to select option: ${error}`
        };
      }
    }
    /**
     * Scroll vertically
     */
    async scroll(options) {
      try {
        const { down, numPages, pixels, hint } = options;
        if (hint === void 0) {
          const viewportH = window.innerHeight;
          const pageH = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight || 0
          );
          const totalViewports = viewportH > 0 ? pageH / viewportH : 1;
          if (totalViewports <= 1.1) {
            return {
              success: false,
              message: `❌ Page is only ${totalViewports.toFixed(2)} viewports tall — the entire page already fits in your current observation. Scrolling will reveal NO new content. Use execute_javascript (e.g. querySelectorAll) for bulk data extraction, or interact with visible elements directly.`
            };
          }
        }
        const scrollAmount = (pixels ?? numPages * window.innerHeight) * (down ? 1 : -1);
        const element = hint !== void 0 ? getElementByHint(this.selectorMap, hint) : null;
        console.log("[scroll]", {
          down,
          numPages,
          pixels,
          hint,
          resolvedTarget: element ? element.tagName : "page",
          scrollAmountPx: scrollAmount,
          viewportH: window.innerHeight
        });
        const message = await scrollVertically(scrollAmount, element);
        return {
          success: true,
          message
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to scroll: ${error}`
        };
      }
    }
    /**
     * Scroll horizontally
     */
    async scrollHorizontally(options) {
      try {
        const { right, pixels, hint } = options;
        const scrollAmount = pixels * (right ? 1 : -1);
        const element = hint !== void 0 ? getElementByHint(this.selectorMap, hint) : null;
        const message = await scrollHorizontally(scrollAmount, element);
        return {
          success: true,
          message
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Failed to scroll horizontally: ${error}`
        };
      }
    }
    /**
     * Execute arbitrary JavaScript on the page
     */
    async executeJavascript(script) {
      try {
        const asyncFunction = eval(`(async () => { ${script} })`);
        const result = await asyncFunction();
        return {
          success: true,
          message: `✅ Executed JavaScript. Result: ${result}`
        };
      } catch (error) {
        return {
          success: false,
          message: `❌ Error executing JavaScript: ${error}`
        };
      }
    }
    // ======= Mask Operations =======
    /**
     * Show the visual mask overlay.
     * Only works after mask is setup.
     */
    async showMask() {
      await this.maskReady;
      this.mask?.show();
    }
    /**
     * Hide the visual mask overlay.
     * Only works after mask is setup.
     */
    async hideMask() {
      await this.maskReady;
      this.mask?.hide();
    }
    /**
     * Show or hide the visual AI cursor on the mask.
     */
    async setMaskCursorVisible(visible2) {
      await this.maskReady;
      this.mask?.setCursorVisible(visible2);
    }
    /**
     * Dispose and clean up resources
     */
    dispose() {
      cleanUpHighlights();
      this.flatTree = null;
      this.selectorMap.clear();
      this.elementTextMap.clear();
      this.simplifiedHTML = "<EMPTY>";
      this.isIndexed = false;
      this.mask?.dispose();
      this.mask = null;
    }
  }
  function initPageController() {
    let pageController = null;
    let intervalID = null;
    const myTabIdPromise = chrome.runtime.sendMessage({ type: "PAGE_CONTROL", action: "get_my_tab_id" }).then((response) => {
      return response.tabId;
    }).catch((error) => {
      console.error("[RemotePageController.ContentScript]: Failed to get my tab id", error);
      return null;
    });
    async function getPC() {
      if (!pageController) {
        const storage = await chrome.storage.local.get([
          "advancedConfig",
          "agentMode",
          "developerMode"
        ]);
        const isScript = storage.agentMode === "script";
        const showHintMarkers = isScript ? false : !!storage.developerMode;
        pageController = new PageController({
          enableMask: false,
          viewportExpansion: 400,
          showHintMarkers
        });
      }
      return pageController;
    }
    intervalID = window.setInterval(async () => {
      try {
        const agentHeartbeat = (await chrome.storage.local.get("agentHeartbeat")).agentHeartbeat;
        const now = Date.now();
        const agentInTouch = typeof agentHeartbeat === "number" && now - agentHeartbeat < 2e3;
        const isAgentRunning = (await chrome.storage.local.get("isAgentRunning")).isAgentRunning;
        const currentTabId = (await chrome.storage.local.get("currentTabId")).currentTabId;
        const shouldShowMask = isAgentRunning && agentInTouch && currentTabId === await myTabIdPromise;
        if (shouldShowMask) {
          const pc = await getPC();
          pc.initMask();
          const agentMode = (await chrome.storage.local.get("agentMode")).agentMode;
          await pc.setMaskCursorVisible(agentMode !== "script");
          await pc.showMask();
        } else {
          if (pageController) {
            pageController.hideMask();
            const keepUntil = (await chrome.storage.local.get("keepHighlightsUntil")).keepHighlightsUntil;
            if (!(typeof keepUntil === "number" && Date.now() < keepUntil)) {
              pageController.cleanUpHighlights();
            }
          }
        }
        if (!isAgentRunning && agentInTouch) {
          if (pageController) {
            pageController.dispose();
            pageController = null;
          }
        }
      } catch {
        if (intervalID) {
          window.clearInterval(intervalID);
          intervalID = null;
        }
      }
    }, 500);
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type !== "PAGE_CONTROL") {
        return;
      }
      const { action, payload } = message;
      const methodName = getMethodName(action);
      getPC().then((pc) => {
        switch (action) {
          case "get_last_update_time":
          case "get_browser_state":
          case "update_tree":
          case "clean_up_highlights":
          case "click_element":
          case "input_text":
          case "select_option":
          case "scroll":
          case "scroll_horizontally":
          case "execute_javascript":
            return pc[methodName](...payload || []);
          default:
            return { success: false, error: `Unknown PAGE_CONTROL action: ${action}` };
        }
      }).then((result2) => sendResponse(result2)).catch(
        (error) => sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
      return true;
    });
  }
  function getMethodName(action) {
    switch (action) {
      case "get_last_update_time":
        return "getLastUpdateTime";
      case "get_browser_state":
        return "getBrowserState";
      case "update_tree":
        return "updateTree";
      case "clean_up_highlights":
        return "cleanUpHighlights";
      // DOM actions
      case "click_element":
        return "clickElement";
      case "input_text":
        return "inputText";
      case "select_option":
        return "selectOption";
      case "scroll":
        return "scroll";
      case "scroll_horizontally":
        return "scrollHorizontally";
      case "execute_javascript":
        return "executeJavascript";
      default:
        return action;
    }
  }
  const OVERLAY_ID = "__pa_element_picker_overlay__";
  const TOOLTIP_ID = "__pa_element_picker_tooltip__";
  const HINT_ID = "__pa_element_picker_hint__";
  const FLASH_ID = "__pa_element_picker_flash__";
  const STYLE_ID = "__pa_element_picker_style__";
  const FLASH_DURATION_MS = 800;
  const SELF_ELEMENT_IDS = /* @__PURE__ */ new Set([OVERLAY_ID, TOOLTIP_ID, HINT_ID, FLASH_ID]);
  let active = false;
  let currentTarget = null;
  let activeOptions = {};
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
@keyframes __pa_picker_hint_in {
	from { opacity: 0; transform: translate(-50%, -8px); }
	to   { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes __pa_picker_pulse {
	0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.55); }
	70%  { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
	100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
}
@keyframes __pa_picker_flash {
	0%   { opacity: 0; transform: scale(1); }
	30%  { opacity: 1; transform: scale(1); }
	100% { opacity: 0; transform: scale(1.04); }
}
#${HINT_ID} {
	position: fixed; top: 12px; left: 50%;
	transform: translate(-50%, 0);
	z-index: 2147483647;
	display: inline-flex; align-items: center; gap: 8px;
	padding: 8px 14px;
	background: rgba(15,23,42,0.92);
	color: #f8fafc;
	font: 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	letter-spacing: 0.2px;
	border-radius: 999px;
	box-shadow: 0 4px 16px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.06) inset;
	pointer-events: none;
	animation: __pa_picker_hint_in 160ms ease-out;
}
#${HINT_ID} .pa-dot {
	width: 8px; height: 8px; border-radius: 50%;
	background: #3b82f6;
	animation: __pa_picker_pulse 1.4s infinite;
}
#${HINT_ID} .pa-kbd {
	display: inline-flex; align-items: center;
	padding: 2px 6px;
	background: rgba(255,255,255,0.10);
	border: 1px solid rgba(255,255,255,0.16);
	border-radius: 4px;
	font: 600 10.5px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
	color: #e2e8f0;
}
#${HINT_ID} .pa-sep { opacity: 0.4; }
#${FLASH_ID} {
	position: fixed; pointer-events: none; z-index: 2147483647;
	border: 2px solid #22c55e;
	background: rgba(34,197,94,0.18);
	border-radius: 4px;
	animation: __pa_picker_flash ${FLASH_DURATION_MS}ms ease-out forwards;
}
`;
    document.documentElement.appendChild(style);
  }
  function getOverlay() {
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = OVERLAY_ID;
      Object.assign(el.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "2147483647",
        border: "2px solid #3b82f6",
        background: "rgba(59,130,246,0.10)",
        borderRadius: "3px",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.6) inset, 0 4px 12px rgba(59,130,246,0.18)",
        transition: "all 0.08s ease-out",
        display: "none"
      });
      document.documentElement.appendChild(el);
    }
    return el;
  }
  function getTooltip() {
    let el = document.getElementById(TOOLTIP_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = TOOLTIP_ID;
      Object.assign(el.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "2147483647",
        background: "#1e293b",
        color: "#e2e8f0",
        fontSize: "11px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        padding: "4px 8px",
        borderRadius: "4px",
        maxWidth: "420px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        display: "none"
      });
      document.documentElement.appendChild(el);
    }
    return el;
  }
  function showHint(opts) {
    let el = document.getElementById(HINT_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = HINT_ID;
      document.documentElement.appendChild(el);
    }
    const title = opts.hintTitle ?? "Click an element to pick";
    const esc = opts.hintEsc ?? "Esc to cancel";
    el.textContent = "";
    const dot = document.createElement("span");
    dot.className = "pa-dot";
    const titleNode = document.createElement("span");
    titleNode.textContent = title;
    const sep = document.createElement("span");
    sep.className = "pa-sep";
    sep.textContent = "·";
    const kbd = document.createElement("span");
    kbd.className = "pa-kbd";
    kbd.textContent = "Esc";
    const escLabel = document.createElement("span");
    escLabel.textContent = esc;
    el.append(dot, titleNode, sep, kbd, escLabel);
  }
  function flashAt(rect) {
    const el = document.createElement("div");
    el.id = FLASH_ID;
    Object.assign(el.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
    document.documentElement.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
    setTimeout(() => el.remove(), FLASH_DURATION_MS + 200);
  }
  function handleMouseMove(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || SELF_ELEMENT_IDS.has(target.id)) return;
    currentTarget = target;
    const rect = target.getBoundingClientRect();
    const overlay = getOverlay();
    Object.assign(overlay.style, {
      display: "block",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
    const tooltip = getTooltip();
    const tag = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : "";
    const cls = target.className && typeof target.className === "string" ? "." + target.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    tooltip.textContent = `<${tag}${id}${cls}> ${dims}`;
    const tooltipY = rect.top > 30 ? rect.top - 24 : rect.bottom + 4;
    Object.assign(tooltip.style, {
      display: "block",
      left: `${Math.max(4, rect.left)}px`,
      top: `${tooltipY}px`
    });
  }
  function blockEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") {
      e.stopImmediatePropagation();
    }
  }
  function handleContextMenu(e) {
    blockEvent(e);
    deactivate("cancelled");
  }
  function handleClick(e) {
    blockEvent(e);
    const target = currentTarget && !SELF_ELEMENT_IDS.has(currentTarget.id ?? "") ? currentTarget : document.elementFromPoint(e.clientX, e.clientY);
    if (!target || SELF_ELEMENT_IDS.has(target.id)) {
      deactivate("cancelled");
      return;
    }
    const data = extractElementData(target);
    const rect = target.getBoundingClientRect();
    deactivate("picked", { silent: true });
    flashAt(rect);
    chrome.runtime.sendMessage({ type: "ELEMENT_PICKED", data }).catch(() => {
    });
  }
  function handleKeyDown(e) {
    if (e.key === "Escape") {
      blockEvent(e);
      deactivate("cancelled");
    }
  }
  function handleVisibilityChange() {
    if (document.visibilityState === "hidden" && active) {
      deactivate("stopped", { silent: true });
    }
  }
  function extractElementData(el) {
    const rect = el.getBoundingClientRect();
    const attrs = {};
    for (const attr of el.attributes) {
      if (attr.name !== "style") {
        attrs[attr.name] = attr.value.slice(0, 200);
      }
    }
    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      classList: [...el.classList],
      attributes: attrs,
      cssSelector: generateCSSSelector(el),
      xpath: generateXPath(el),
      // 暴露给消费方使用，但 sidepanel 默认不写入输入框
      textContent: (el.textContent || "").trim().slice(0, 200),
      boundingRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      parentChain: getParentChain(el),
      innerHTML: el.innerHTML.slice(0, 500),
      outerHTML: el.outerHTML.slice(0, 1e3)
    };
  }
  function generateCSSSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let current = el;
    while (current && current !== document.body && parts.length < 5) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      const meaningful = [...current.classList].filter(
        (c) => !/^(css-|_|jsx-)/.test(c) && c.length < 40
      );
      if (meaningful.length > 0) {
        selector += `.${meaningful.slice(0, 2).map(CSS.escape).join(".")}`;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((s) => s.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${idx})`;
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(" > ");
  }
  function generateXPath(el) {
    const parts = [];
    let current = el;
    while (current && current.nodeType === 1) {
      const element = current;
      let step = element.tagName.toLowerCase();
      if (element.id) {
        parts.unshift(`//${step}[@id="${element.id}"]`);
        return parts.join("/");
      }
      const parent = element.parentNode;
      if (parent) {
        const siblings = [...parent.childNodes].filter(
          (n) => n.nodeType === 1 && n.tagName === element.tagName
        );
        if (siblings.length > 1) {
          const idx = siblings.indexOf(element) + 1;
          step += `[${idx}]`;
        }
      }
      parts.unshift(step);
      current = element.parentNode;
    }
    return "/" + parts.join("/");
  }
  function getParentChain(el) {
    const chain = [];
    let current = el.parentElement;
    while (current && current !== document.documentElement && chain.length < 8) {
      const tag = current.tagName.toLowerCase();
      const id = current.id ? `#${current.id}` : "";
      const cls = current.className && typeof current.className === "string" ? "." + current.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      chain.unshift(`${tag}${id}${cls}`);
      current = current.parentElement;
    }
    return chain;
  }
  function activate(options = {}) {
    if (active) return;
    active = true;
    activeOptions = options;
    ensureStyles();
    showHint(activeOptions);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", blockEvent, true);
    document.addEventListener("mouseup", blockEvent, true);
    document.addEventListener("pointerdown", blockEvent, true);
    document.addEventListener("pointerup", blockEvent, true);
    document.addEventListener("auxclick", blockEvent, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.documentElement.style.cursor = "crosshair";
  }
  function deactivate(reason = "stopped", options = {}) {
    if (!active) return;
    active = false;
    currentTarget = null;
    activeOptions = {};
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("contextmenu", handleContextMenu, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("mousedown", blockEvent, true);
    document.removeEventListener("mouseup", blockEvent, true);
    document.removeEventListener("pointerdown", blockEvent, true);
    document.removeEventListener("pointerup", blockEvent, true);
    document.removeEventListener("auxclick", blockEvent, true);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.documentElement.style.cursor = "";
    for (const id of [OVERLAY_ID, TOOLTIP_ID, HINT_ID, FLASH_ID]) {
      document.getElementById(id)?.remove();
    }
    if (!options.silent) {
      chrome.runtime.sendMessage({ type: "ELEMENT_PICKER_STOPPED", reason }).catch(() => {
      });
    }
  }
  const DEBUG_PREFIX = "[Content]";
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_end",
    main() {
      console.debug(`${DEBUG_PREFIX} Loaded on ${window.location.href}`);
      initPageController();
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === "ELEMENT_PICKER") {
          if (message.action === "start") {
            activate({
              hintTitle: message.payload?.hintTitle,
              hintEsc: message.payload?.hintEsc
            });
          } else if (message.action === "stop") {
            deactivate("stopped", { silent: true });
          }
          sendResponse({ ok: true });
        }
      });
      chrome.runtime.sendMessage({
        type: "TIPSCRIPT_QUERY",
        url: window.location.href
      }).then(async (response) => {
        if (!response?.scripts?.length) return;
        const autoScripts = response.scripts.filter(
          (mz) => mz.triggerMode === "auto" && mz.enabled
        );
        if (!autoScripts.length) return;
        const { advancedConfig } = await chrome.storage.local.get("advancedConfig");
        const delaySec = Math.max(
          3,
          Math.min(
            60,
            advancedConfig?.autoExecDelaySec || 3
          )
        );
        await new Promise((resolve) => {
          if (document.readyState === "complete") {
            setTimeout(resolve, delaySec * 1e3);
          } else {
            window.addEventListener("load", () => setTimeout(resolve, delaySec * 1e3), {
              once: true
            });
          }
        });
        for (const mz of autoScripts) {
          console.debug(
            `${DEBUG_PREFIX} Auto-executing TipScript (after ${delaySec}s delay): ${mz.name}`
          );
          try {
            await chrome.runtime.sendMessage({
              type: "TIPSCRIPT_EXECUTE",
              script: mz.script
            });
          } catch (err) {
            console.error(`${DEBUG_PREFIX} TipScript "${mz.name}" failed:`, err);
          }
        }
      }).catch(() => {
      });
      exposePagenterBridge();
    }
  });
  function exposePagenterBridge() {
    const CHANNEL_TO_MSG = {
      PAGENTER_API_CALL_REQUEST: "PAGENTER_API_CALL",
      PAGENTER_MCP_CALL_REQUEST: "PAGENTER_MCP_CALL",
      PAGENTER_API_LIST_REQUEST: "PAGENTER_API_LIST",
      // TipScript 调用 LLM 的桥接通道
      PAGENTER_LLM_CALL_REQUEST: "PAGENTER_LLM_CALL",
      // 跨步骤 KV 中转
      PAGENTER_KV_SET_REQUEST: "PAGENTER_KV_SET",
      PAGENTER_KV_GET_REQUEST: "PAGENTER_KV_GET",
      PAGENTER_KV_LIST_REQUEST: "PAGENTER_KV_LIST",
      PAGENTER_KV_DELETE_REQUEST: "PAGENTER_KV_DELETE"
    };
    window.addEventListener("message", async (e) => {
      if (e.source !== window) return;
      const data = e.data;
      if (!data || typeof data !== "object") return;
      const msgType = CHANNEL_TO_MSG[data.channel];
      if (!msgType) return;
      const { id, payload } = data;
      try {
        const result2 = await chrome.runtime.sendMessage({
          type: msgType,
          payload
        });
        window.postMessage(
          {
            channel: data.channel.replace("_REQUEST", "_RESPONSE"),
            id,
            payload: result2?.data,
            error: result2?.error
          },
          "*"
        );
      } catch (err) {
        window.postMessage(
          {
            channel: data.channel.replace("_REQUEST", "_RESPONSE"),
            id,
            error: err instanceof Error ? err.message : String(err)
          },
          "*"
        );
      }
    });
  }
  function print$1(method, ...args) {
    return;
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  var WxtLocationChangeEvent = class WxtLocationChangeEvent2 extends Event {
    static EVENT_NAME = getUniqueEventName("wxt:locationchange");
    constructor(newUrl, oldUrl) {
      super(WxtLocationChangeEvent2.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  function getUniqueEventName(eventName) {
    return `${browser?.runtime?.id}:${"content"}:${eventName}`;
  }
  const supportsNavigationApi = typeof globalThis.navigation?.addEventListener === "function";
  function createLocationWatcher(ctx) {
    let lastUrl;
    let watching = false;
    return { run() {
      if (watching) return;
      watching = true;
      lastUrl = new URL(location.href);
      if (supportsNavigationApi) globalThis.navigation.addEventListener("navigate", (event) => {
        const newUrl = new URL(event.destination.url);
        if (newUrl.href === lastUrl.href) return;
        window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
        lastUrl = newUrl;
      }, { signal: ctx.signal });
      else ctx.setInterval(() => {
        const newUrl = new URL(location.href);
        if (newUrl.href !== lastUrl.href) {
          window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
          lastUrl = newUrl;
        }
      }, 1e3);
    } };
  }
  var ContentScriptContext = class ContentScriptContext2 {
    static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName("wxt:content-script-started");
    id;
    abortController;
    locationWatcher = createLocationWatcher(this);
    constructor(contentScriptName, options) {
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.id = Math.random().toString(36).slice(2);
      this.abortController = new AbortController();
      this.stopOldScripts();
      this.listenForNewerScripts();
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime?.id == null) this.notifyInvalidated();
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
    * Add a listener that is called when the content script's context is
    * invalidated.
    *
    * @example
    *   browser.runtime.onMessage.addListener(cb);
    *   const removeInvalidatedListener = ctx.onInvalidated(() => {
    *     browser.runtime.onMessage.removeListener(cb);
    *   });
    *   // ...
    *   removeInvalidatedListener();
    *
    * @returns A function to remove the listener.
    */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
    * Return a promise that never resolves. Useful if you have an async function
    * that shouldn't run after the context is expired.
    *
    * @example
    *   const getValueFromStorage = async () => {
    *     if (ctx.isInvalid) return ctx.block();
    *
    *     // ...
    *   };
    */
    block() {
      return new Promise(() => {
      });
    }
    /**
    * Wrapper around `window.setInterval` that automatically clears the interval
    * when invalidated.
    *
    * Intervals can be cleared by calling the normal `clearInterval` function.
    */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
    * Wrapper around `window.setTimeout` that automatically clears the interval
    * when invalidated.
    *
    * Timeouts can be cleared by calling the normal `setTimeout` function.
    */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
    * Wrapper around `window.requestAnimationFrame` that automatically cancels
    * the request when invalidated.
    *
    * Callbacks can be canceled by calling the normal `cancelAnimationFrame`
    * function.
    */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
    * Wrapper around `window.requestIdleCallback` that automatically cancels the
    * request when invalidated.
    *
    * Callbacks can be canceled by calling the normal `cancelIdleCallback`
    * function.
    */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      target.addEventListener?.(type.startsWith("wxt:") ? getUniqueEventName(type) : type, handler, {
        ...options,
        signal: this.signal
      });
    }
    /**
    * @internal
    * Abort the abort controller and execute all `onInvalidated` listeners.
    */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(`Content script "${this.contentScriptName}" context invalidated`);
    }
    stopOldScripts() {
      document.dispatchEvent(new CustomEvent(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, { detail: {
        contentScriptName: this.contentScriptName,
        messageId: this.id
      } }));
      window.postMessage({
        type: ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE,
        contentScriptName: this.contentScriptName,
        messageId: this.id
      }, "*");
    }
    verifyScriptStartedEvent(event) {
      const isSameContentScript = event.detail?.contentScriptName === this.contentScriptName;
      const isFromSelf = event.detail?.messageId === this.id;
      return isSameContentScript && !isFromSelf;
    }
    listenForNewerScripts() {
      const cb = (event) => {
        if (!(event instanceof CustomEvent) || !this.verifyScriptStartedEvent(event)) return;
        this.notifyInvalidated();
      };
      document.addEventListener(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, cb);
      this.onInvalidated(() => document.removeEventListener(ContentScriptContext2.SCRIPT_STARTED_MESSAGE_TYPE, cb));
    }
  };
  function initPlugins() {
  }
  function print(method, ...args) {
    return;
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      return await main(new ContentScriptContext("content", options));
    } catch (err) {
      logger.error(`The content script "${"content"}" crashed on startup!`, err);
      throw err;
    }
  })();
  function computeBorderGeometry(pixelWidth, pixelHeight, borderWidth, glowWidth) {
    const shortSide = Math.max(1, Math.min(pixelWidth, pixelHeight));
    const borderWidthPx = Math.min(borderWidth, 20);
    const glowWidthPx = glowWidth;
    const totalThick = Math.min(borderWidthPx + glowWidthPx, shortSide);
    const insetX = Math.min(totalThick, Math.floor(pixelWidth / 2));
    const insetY = Math.min(totalThick, Math.floor(pixelHeight / 2));
    const toClipX = (x) => x / pixelWidth * 2 - 1;
    const toClipY = (y) => y / pixelHeight * 2 - 1;
    const x0 = 0;
    const x1 = pixelWidth;
    const y0 = 0;
    const y1 = pixelHeight;
    const xi0 = insetX;
    const xi1 = pixelWidth - insetX;
    const yi0 = insetY;
    const yi1 = pixelHeight - insetY;
    const X0 = toClipX(x0);
    const X1 = toClipX(x1);
    const Y0 = toClipY(y0);
    const Y1 = toClipY(y1);
    const Xi0 = toClipX(xi0);
    const Xi1 = toClipX(xi1);
    const Yi0 = toClipY(yi0);
    const Yi1 = toClipY(yi1);
    const u0 = 0;
    const v0 = 0;
    const u1 = 1;
    const v1 = 1;
    const ui0 = insetX / pixelWidth;
    const ui1 = 1 - insetX / pixelWidth;
    const vi0 = insetY / pixelHeight;
    const vi1 = 1 - insetY / pixelHeight;
    const positions = new Float32Array([
      // Top strip
      X0,
      Y0,
      X1,
      Y0,
      X0,
      Yi0,
      X0,
      Yi0,
      X1,
      Y0,
      X1,
      Yi0,
      // Bottom strip
      X0,
      Yi1,
      X1,
      Yi1,
      X0,
      Y1,
      X0,
      Y1,
      X1,
      Yi1,
      X1,
      Y1,
      // Left strip
      X0,
      Yi0,
      Xi0,
      Yi0,
      X0,
      Yi1,
      X0,
      Yi1,
      Xi0,
      Yi0,
      Xi0,
      Yi1,
      // Right strip
      Xi1,
      Yi0,
      X1,
      Yi0,
      Xi1,
      Yi1,
      Xi1,
      Yi1,
      X1,
      Yi0,
      X1,
      Yi1
    ]);
    const uvs = new Float32Array([
      // Top strip
      u0,
      v0,
      u1,
      v0,
      u0,
      vi0,
      u0,
      vi0,
      u1,
      v0,
      u1,
      vi0,
      // Bottom strip
      u0,
      vi1,
      u1,
      vi1,
      u0,
      v1,
      u0,
      v1,
      u1,
      vi1,
      u1,
      v1,
      // Left strip
      u0,
      vi0,
      ui0,
      vi0,
      u0,
      vi1,
      u0,
      vi1,
      ui0,
      vi0,
      ui0,
      vi1,
      // Right strip
      ui1,
      vi0,
      u1,
      vi0,
      ui1,
      vi1,
      ui1,
      vi1,
      u1,
      vi0,
      u1,
      vi1
    ]);
    return { positions, uvs };
  }
  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) || "Unknown shader error";
      gl.deleteShader(shader);
      throw new Error(info);
    }
    return shader;
  }
  function createProgram(gl, vertexSource, fragmentSource) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program) || "Unknown link error";
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      throw new Error(info);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }
  const fragmentShaderSource = `#version 300 es
precision lowp float;
in vec2 vUV;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uBorderWidth;
uniform float uGlowWidth;
uniform float uBorderRadius;
uniform vec3 uColors[4];
uniform float uGlowExponent;
uniform float uGlowFactor;
const float PI = 3.14159265359;
const float TWO_PI = 2.0 * PI;
const float HALF_PI = 0.5 * PI;
const vec4 startPositions = vec4(0.0, PI, HALF_PI, 1.5 * PI);
const vec4 speeds = vec4(-1.9, -1.9, -1.5, 2.1);
const vec4 innerRadius = vec4(PI * 0.8, PI * 0.7, PI * 0.3, PI * 0.1);
const vec4 outerRadius = vec4(PI * 1.2, PI * 0.9, PI * 0.6, PI * 0.4);
float random(vec2 st) {
return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
vec2 random2(vec2 st) {
return vec2(random(st), random(st + 1.0));
}
float aaStep(float edge, float d) {
float width = fwidth(d);
return smoothstep(edge - width * 0.5, edge + width * 0.5, d);
}
float aaFract(float x) {
float f = fract(x);
float w = fwidth(x);
float smooth_f = f * (1.0 - smoothstep(1.0 - w, 1.0, f));
return smooth_f;
}
float sdRoundedBox(in vec2 p, in vec2 b, in float r) {
vec2 q = abs(p) - b + r;
return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
float getInnerGlow(vec2 p, vec2 b, float radius) {
float dist_x = b.x - abs(p.x);
float dist_y = b.y - abs(p.y);
float glow_x = smoothstep(radius, 0.0, dist_x);
float glow_y = smoothstep(radius, 0.0, dist_y);
return 1.0 - (1.0 - glow_x) * (1.0 - glow_y);
}
float getVignette(vec2 uv) {
vec2 vignetteUv = uv;
vignetteUv = vignetteUv * (1.0 - vignetteUv);
float vignette = vignetteUv.x * vignetteUv.y * 25.0;
vignette = pow(vignette, 0.16);
vignette = 1.0 - vignette;
return vignette;
}
float uvToAngle(vec2 uv) {
vec2 center = vec2(0.5);
vec2 dir = uv - center;
return atan(dir.y, dir.x) + PI;
}
void main() {
vec2 uv = vUV;
vec2 pos = uv * uResolution;
vec2 centeredPos = pos - uResolution * 0.5;
vec2 size = uResolution - uBorderWidth;
vec2 halfSize = size * 0.5;
float dBorderBox = sdRoundedBox(centeredPos, halfSize, uBorderRadius);
float border = aaStep(0.0, dBorderBox);
float glow = getInnerGlow(centeredPos, halfSize, uGlowWidth);
float vignette = getVignette(uv);
glow *= vignette;
float posAngle = uvToAngle(uv);
vec4 lightCenter = mod(startPositions + speeds * uTime, TWO_PI);
vec4 angleDist = abs(posAngle - lightCenter);
vec4 disToLight = min(angleDist, TWO_PI - angleDist) / TWO_PI;
float intensityBorder[4];
intensityBorder[0] = 1.0;
intensityBorder[1] = smoothstep(0.4, 0.0, disToLight.y);
intensityBorder[2] = smoothstep(0.4, 0.0, disToLight.z);
intensityBorder[3] = smoothstep(0.2, 0.0, disToLight.w) * 0.5;
vec3 borderColor = vec3(0.0);
for(int i = 0; i < 4; i++) {
borderColor = mix(borderColor, uColors[i], intensityBorder[i]);
}
borderColor *= 1.1;
borderColor = clamp(borderColor, 0.0, 1.0);
float intensityGlow[4];
intensityGlow[0] = smoothstep(0.9, 0.0, disToLight.x);
intensityGlow[1] = smoothstep(0.7, 0.0, disToLight.y);
intensityGlow[2] = smoothstep(0.4, 0.0, disToLight.z);
intensityGlow[3] = smoothstep(0.1, 0.0, disToLight.w) * 0.7;
vec4 breath = smoothstep(0.0, 1.0, sin(uTime * 1.0 + startPositions * PI) * 0.2 + 0.8);
vec3 glowColor = vec3(0.0);
glowColor += uColors[0] * intensityGlow[0] * breath.x;
glowColor += uColors[1] * intensityGlow[1] * breath.y;
glowColor += uColors[2] * intensityGlow[2] * breath.z;
glowColor += uColors[3] * intensityGlow[3] * breath.w * glow;
glow = pow(glow, uGlowExponent);
glow *= random(pos + uTime) * 0.1 + 1.0;
glowColor *= glow * uGlowFactor;
glowColor = clamp(glowColor, 0.0, 1.0);
vec3 color = mix(glowColor, borderColor + glowColor * 0.2, border);
float alpha = mix(glow, 1.0, border);
outColor = vec4(color, alpha);
}`;
  const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
void main() {
vUV = aUV;
gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  const DEFAULT_COLORS = [
    "rgb(57, 182, 255)",
    "rgb(189, 69, 251)",
    "rgb(255, 87, 51)",
    "rgb(255, 214, 0)"
  ];
  function parseColor(colorStr) {
    const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) {
      throw new Error(`Invalid color format: ${colorStr}`);
    }
    const [, r, g, b] = match;
    return [parseInt(r) / 255, parseInt(g) / 255, parseInt(b) / 255];
  }
  class Motion {
    element;
    canvas;
    options;
    running = false;
    disposed = false;
    startTime = 0;
    lastTime = 0;
    rafId = null;
    glr;
    observer;
    constructor(options = {}) {
      this.options = {
        width: options.width ?? 600,
        height: options.height ?? 600,
        ratio: options.ratio ?? window.devicePixelRatio ?? 1,
        borderWidth: options.borderWidth ?? 8,
        glowWidth: options.glowWidth ?? 200,
        borderRadius: options.borderRadius ?? 8,
        mode: options.mode ?? "light",
        ...options
      };
      this.canvas = document.createElement("canvas");
      if (this.options.classNames) {
        this.canvas.className = this.options.classNames;
      }
      if (this.options.styles) {
        Object.assign(this.canvas.style, this.options.styles);
      }
      this.canvas.style.display = "block";
      this.canvas.style.transformOrigin = "center";
      this.canvas.style.pointerEvents = "none";
      this.element = this.canvas;
      this.setupGL();
      if (!this.options.skipGreeting) this.greet();
    }
    start() {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      if (this.running) return;
      if (!this.glr) {
        console.error("WebGL resources are not initialized.");
        return;
      }
      this.running = true;
      this.startTime = performance.now();
      this.resize(this.options.width ?? 600, this.options.height ?? 600, this.options.ratio);
      this.glr.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.glr.gl.useProgram(this.glr.program);
      this.glr.gl.uniform2f(this.glr.uResolution, this.canvas.width, this.canvas.height);
      this.checkGLError(this.glr.gl, "start: after initial setup");
      const loop = () => {
        if (!this.running || !this.glr) return;
        this.rafId = requestAnimationFrame(loop);
        const now = performance.now();
        const delta = now - this.lastTime;
        if (delta < 1e3 / 32) return;
        this.lastTime = now;
        const t = (now - this.startTime) * 1e-3;
        this.render(t);
      };
      this.rafId = requestAnimationFrame(loop);
    }
    pause() {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      this.running = false;
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.running = false;
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      const { gl, vao, positionBuffer, uvBuffer, program } = this.glr;
      if (vao) gl.deleteVertexArray(vao);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (uvBuffer) gl.deleteBuffer(uvBuffer);
      gl.deleteProgram(program);
      if (this.observer) this.observer.disconnect();
      this.canvas.remove();
    }
    resize(width, height, ratio) {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      this.options.width = width;
      this.options.height = height;
      if (ratio) this.options.ratio = ratio;
      if (!this.running) return;
      const { gl, program, vao, positionBuffer, uvBuffer, uResolution } = this.glr;
      const dpr = ratio ?? this.options.ratio ?? window.devicePixelRatio ?? 1;
      const desiredWidth = Math.max(1, Math.floor(width * dpr));
      const desiredHeight = Math.max(1, Math.floor(height * dpr));
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      if (this.canvas.width !== desiredWidth || this.canvas.height !== desiredHeight) {
        this.canvas.width = desiredWidth;
        this.canvas.height = desiredHeight;
      }
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.checkGLError(gl, "resize: after viewport setup");
      const { positions, uvs } = computeBorderGeometry(
        this.canvas.width,
        this.canvas.height,
        this.options.borderWidth * dpr,
        this.options.glowWidth * dpr
      );
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      const aPosition = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      this.checkGLError(gl, "resize: after position buffer update");
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      const aUV = gl.getAttribLocation(program, "aUV");
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
      this.checkGLError(gl, "resize: after UV buffer update");
      gl.useProgram(program);
      gl.uniform2f(uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.glr.uBorderWidth, this.options.borderWidth * dpr);
      gl.uniform1f(this.glr.uGlowWidth, this.options.glowWidth * dpr);
      gl.uniform1f(this.glr.uBorderRadius, this.options.borderRadius * dpr);
      this.checkGLError(gl, "resize: after uniform updates");
      const now = performance.now();
      this.lastTime = now;
      const t = (now - this.startTime) * 1e-3;
      this.render(t);
    }
    /**
     * Automatically resizes the canvas to match the dimensions of the given element.
     * @note using ResizeObserver
     */
    autoResize(sourceElement) {
      if (this.observer) {
        this.observer.disconnect();
      }
      this.observer = new ResizeObserver(() => {
        const rect = sourceElement.getBoundingClientRect();
        this.resize(rect.width, rect.height);
      });
      this.observer.observe(sourceElement);
    }
    fadeIn() {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      return new Promise((resolve, reject) => {
        const animation = this.canvas.animate(
          [
            { opacity: 0, transform: "scale(1.2)" },
            { opacity: 1, transform: "scale(1)" }
          ],
          { duration: 300, easing: "ease-out", fill: "forwards" }
        );
        animation.onfinish = () => resolve();
        animation.oncancel = () => reject("canceled");
      });
    }
    fadeOut() {
      if (this.disposed) throw new Error("Motion instance has been disposed.");
      return new Promise((resolve, reject) => {
        const animation = this.canvas.animate(
          [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(1.2)" }
          ],
          { duration: 300, easing: "ease-in", fill: "forwards" }
        );
        animation.onfinish = () => resolve();
        animation.oncancel = () => reject("canceled");
      });
    }
    checkGLError(gl, context) {
      let error = gl.getError();
      if (error !== gl.NO_ERROR) {
        console.group(`🔴 WebGL Error in ${context}`);
        while (error !== gl.NO_ERROR) {
          const errorName = this.getGLErrorName(gl, error);
          console.error(`${errorName} (0x${error.toString(16)})`);
          error = gl.getError();
        }
        console.groupEnd();
      }
    }
    getGLErrorName(gl, error) {
      switch (error) {
        case gl.INVALID_ENUM:
          return "INVALID_ENUM";
        case gl.INVALID_VALUE:
          return "INVALID_VALUE";
        case gl.INVALID_OPERATION:
          return "INVALID_OPERATION";
        case gl.INVALID_FRAMEBUFFER_OPERATION:
          return "INVALID_FRAMEBUFFER_OPERATION";
        case gl.OUT_OF_MEMORY:
          return "OUT_OF_MEMORY";
        case gl.CONTEXT_LOST_WEBGL:
          return "CONTEXT_LOST_WEBGL";
        default:
          return "UNKNOWN_ERROR";
      }
    }
    setupGL() {
      const gl = this.canvas.getContext("webgl2", { antialias: false, alpha: true });
      if (!gl) {
        throw new Error("WebGL2 is required but not available.");
      }
      const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
      this.checkGLError(gl, "setupGL: after createProgram");
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      this.checkGLError(gl, "setupGL: after VAO creation");
      const pw = this.canvas.width || 2;
      const ph = this.canvas.height || 2;
      const { positions, uvs } = computeBorderGeometry(
        pw,
        ph,
        this.options.borderWidth,
        this.options.glowWidth
      );
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      const aPosition = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      this.checkGLError(gl, "setupGL: after position buffer setup");
      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      const aUV = gl.getAttribLocation(program, "aUV");
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
      this.checkGLError(gl, "setupGL: after UV buffer setup");
      const uResolution = gl.getUniformLocation(program, "uResolution");
      const uTime = gl.getUniformLocation(program, "uTime");
      const uBorderWidth = gl.getUniformLocation(program, "uBorderWidth");
      const uGlowWidth = gl.getUniformLocation(program, "uGlowWidth");
      const uBorderRadius = gl.getUniformLocation(program, "uBorderRadius");
      const uColors = gl.getUniformLocation(program, "uColors");
      const uGlowExponent = gl.getUniformLocation(program, "uGlowExponent");
      const uGlowFactor = gl.getUniformLocation(program, "uGlowFactor");
      gl.useProgram(program);
      gl.uniform1f(uBorderWidth, this.options.borderWidth);
      gl.uniform1f(uGlowWidth, this.options.glowWidth);
      gl.uniform1f(uBorderRadius, this.options.borderRadius);
      if (this.options.mode === "dark") {
        gl.uniform1f(uGlowExponent, 2);
        gl.uniform1f(uGlowFactor, 1.8);
      } else {
        gl.uniform1f(uGlowExponent, 1);
        gl.uniform1f(uGlowFactor, 1);
      }
      const colorVecs = (this.options.colors || DEFAULT_COLORS).map(parseColor);
      for (let i = 0; i < colorVecs.length; i++) {
        gl.uniform3f(gl.getUniformLocation(program, `uColors[${i}]`), ...colorVecs[i]);
      }
      this.checkGLError(gl, "setupGL: after uniform setup");
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      this.glr = {
        gl,
        program,
        vao,
        positionBuffer,
        uvBuffer,
        uResolution,
        uTime,
        uBorderWidth,
        uGlowWidth,
        uBorderRadius,
        uColors
      };
    }
    render(t) {
      if (!this.glr) return;
      const { gl, program, vao, uTime } = this.glr;
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform1f(uTime, t);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 24);
      this.checkGLError(gl, "render: after draw call");
      gl.bindVertexArray(null);
    }
    greet() {
      console.log(
        `%c🌈 ai-motion ${"0.4.8"} 🌈`,
        "background: linear-gradient(90deg, #39b6ff, #bd45fb, #ff5733, #ffd600); color: white; text-shadow: 0 0 2px rgba(0, 0, 0, 0.2); font-weight: bold; font-size: 1em; padding: 2px 12px; border-radius: 6px;"
      );
    }
  }
  (function() {
    try {
      if (typeof document != "undefined") {
        var elementStyle = document.createElement("style");
        elementStyle.appendChild(document.createTextNode(`._wrapper_nj0e2_1 {\r
	position: fixed;\r
	inset: 0;\r
	z-index: 2147483641; /* 确保在所有元素之上，除了 panel */\r
	cursor: wait;\r
	overflow: hidden;\r
\r
	display: none;\r
}\r
\r
._wrapper_nj0e2_1._visible_nj0e2_21 {\r
	display: block;\r
}\r
/* AI 光标样式 */\r
._cursor_15el4_3 {\r
	position: absolute;\r
	width: var(--cursor-size, 75px);\r
	height: var(--cursor-size, 75px);\r
	pointer-events: none;\r
	z-index: 10000;\r
}\r
\r
._cursorBorder_15el4_19 {\r
	position: absolute;\r
	width: 100%;\r
	height: 100%;\r
	background: linear-gradient(45deg, rgb(57, 182, 255), rgb(189, 69, 251));\r
	mask-image: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%20fill='none'%3e%3cg%3e%3cpath%20d='M%2015%2042%20L%2015%2036.99%20Q%2015%2031.99%2023.7%2031.99%20L%2028.05%2031.99%20Q%2032.41%2031.99%2032.41%2021.99%20L%2032.41%2017%20Q%2032.41%2012%2041.09%2016.95%20L%2076.31%2037.05%20Q%2085%2042%2076.31%2046.95%20L%2041.09%2067.05%20Q%2032.41%2072%2032.41%2062.01%20L%2032.41%2057.01%20Q%2032.41%2052.01%2023.7%2052.01%20L%2019.35%2052.01%20Q%2015%2052.01%2015%2047.01%20Z'%20fill='none'%20stroke='%23000000'%20stroke-width='6'%20stroke-miterlimit='10'%20style='stroke:%20light-dark(rgb(0,%200,%200),%20rgb(255,%20255,%20255));'/%3e%3c/g%3e%3c/svg%3e");\r
	mask-size: 100% 100%;\r
	mask-repeat: no-repeat;\r
\r
	transform-origin: center;\r
	transform: rotate(-135deg) scale(1.2);\r
	margin-left: -10px;\r
	margin-top: -18px;\r
}\r
\r
._cursorFilling_15el4_49 {\r
	position: absolute;\r
	width: 100%;\r
	height: 100%;\r
	background: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3e%3cdefs%3e%3c/defs%3e%3cg%20xmlns='http://www.w3.org/2000/svg'%20style='filter:%20drop-shadow(light-dark(rgba(0,%200,%200,%200.4),%20rgba(237,%20237,%20237,%200.4))%203px%204px%204px);'%3e%3cpath%20d='M%2015%2042%20L%2015%2036.99%20Q%2015%2031.99%2023.7%2031.99%20L%2028.05%2031.99%20Q%2032.41%2031.99%2032.41%2021.99%20L%2032.41%2017%20Q%2032.41%2012%2041.09%2016.95%20L%2076.31%2037.05%20Q%2085%2042%2076.31%2046.95%20L%2041.09%2067.05%20Q%2032.41%2072%2032.41%2062.01%20L%2032.41%2057.01%20Q%2032.41%2052.01%2023.7%2052.01%20L%2019.35%2052.01%20Q%2015%2052.01%2015%2047.01%20Z'%20fill='%23ffffff'%20stroke='none'%20style='fill:%20%23ffffff;'/%3e%3c/g%3e%3c/svg%3e");\r
	background-size: 100% 100%;\r
	background-repeat: no-repeat;\r
\r
	transform-origin: center;\r
	transform: rotate(-135deg) scale(1.2);\r
	margin-left: -10px;\r
	margin-top: -18px;\r
}\r
\r
._cursorRipple_15el4_77 {\r
	position: absolute;\r
	width: 100%;\r
	height: 100%;\r
	pointer-events: none;\r
	margin-left: -50%;\r
	margin-top: -50%;\r
\r
	&::after {\r
		content: '';\r
		opacity: 0;\r
		position: absolute;\r
		inset: 0;\r
		border: 4px solid rgba(57, 182, 255, 1);\r
		border-radius: 50%;\r
	}\r
}\r
\r
._cursor_15el4_3._clicking_15el4_113 ._cursorRipple_15el4_77::after {\r
	animation: _cursor-ripple_15el4_1 300ms ease-out forwards;\r
}\r
\r
@keyframes _cursor-ripple_15el4_1 {\r
	0% {\r
		transform: scale(0);\r
		opacity: 1;\r
	}\r
	100% {\r
		transform: scale(2);\r
		opacity: 0;\r
	}\r
}`));
        document.head.appendChild(elementStyle);
      }
    } catch (e) {
      console.error("vite-plugin-css-injected-by-js", e);
    }
  })();
  function hasDarkModeClass() {
    const DEFAULT_DARK_MODE_CLASSES = ["dark", "dark-mode", "theme-dark", "night", "night-mode"];
    const htmlElement = document.documentElement;
    const bodyElement = document.body || document.documentElement;
    for (const className of DEFAULT_DARK_MODE_CLASSES) {
      if (htmlElement.classList.contains(className) || bodyElement?.classList.contains(className)) {
        return true;
      }
    }
    const darkThemeAttribute = htmlElement.getAttribute("data-theme");
    if (darkThemeAttribute?.toLowerCase().includes("dark")) {
      return true;
    }
    return false;
  }
  function parseRgbColor(colorString) {
    const rgbMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(colorString);
    if (!rgbMatch) {
      return null;
    }
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    };
  }
  function isColorDark(colorString, threshold = 128) {
    if (!colorString || colorString === "transparent" || colorString.startsWith("rgba(0, 0, 0, 0)")) {
      return false;
    }
    const rgb = parseRgbColor(colorString);
    if (!rgb) {
      return false;
    }
    const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    return luminance < threshold;
  }
  function isBackgroundDark() {
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body || document.documentElement);
    const htmlBgColor = htmlStyle.backgroundColor;
    const bodyBgColor = bodyStyle.backgroundColor;
    if (isColorDark(bodyBgColor)) {
      return true;
    } else if (bodyBgColor === "transparent" || bodyBgColor.startsWith("rgba(0, 0, 0, 0)")) {
      return isColorDark(htmlBgColor);
    }
    return false;
  }
  function isPageDark() {
    try {
      if (hasDarkModeClass()) {
        return true;
      }
      if (isBackgroundDark()) {
        return true;
      }
      return false;
    } catch (error) {
      console.warn("Error determining if page is dark:", error);
      return false;
    }
  }
  const wrapper = "_wrapper_nj0e2_1";
  const visible = "_visible_nj0e2_21";
  const styles = {
    wrapper,
    visible
  };
  const cursor = "_cursor_15el4_3";
  const cursorBorder = "_cursorBorder_15el4_19";
  const cursorFilling = "_cursorFilling_15el4_49";
  const cursorRipple = "_cursorRipple_15el4_77";
  const clicking = "_clicking_15el4_113";
  const cursorStyles = {
    cursor,
    cursorBorder,
    cursorFilling,
    cursorRipple,
    clicking
  };
  class SimulatorMask extends EventTarget {
    shown = false;
    wrapper = document.createElement("div");
    motion = null;
    #disposed = false;
    #cursor = document.createElement("div");
    #currentCursorX = 0;
    #currentCursorY = 0;
    #targetCursorX = 0;
    #targetCursorY = 0;
    constructor() {
      super();
      this.wrapper.id = "page-agent-runtime_simulator-mask";
      this.wrapper.className = styles.wrapper;
      this.wrapper.setAttribute("data-browser-use-ignore", "true");
      this.wrapper.setAttribute("data-page-agent-ignore", "true");
      try {
        const motion = new Motion({
          mode: isPageDark() ? "dark" : "light",
          styles: { position: "absolute", inset: "0" }
        });
        this.motion = motion;
        this.wrapper.appendChild(motion.element);
        motion.autoResize(this.wrapper);
      } catch (e) {
        console.warn("[SimulatorMask] Motion overlay unavailable:", e);
      }
      this.wrapper.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("mouseup", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("mousemove", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("wheel", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("keydown", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.wrapper.addEventListener("keyup", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      this.#createCursor();
      document.body.appendChild(this.wrapper);
      this.#moveCursorToTarget();
      const movePointerToListener = (event) => {
        const { x, y } = event.detail;
        this.setCursorPosition(x, y);
      };
      const clickPointerListener = () => {
        this.triggerClickAnimation();
      };
      const enablePassThroughListener = () => {
        this.wrapper.style.pointerEvents = "none";
      };
      const disablePassThroughListener = () => {
        this.wrapper.style.pointerEvents = "auto";
      };
      window.addEventListener("PageAgent::MovePointerTo", movePointerToListener);
      window.addEventListener("PageAgent::ClickPointer", clickPointerListener);
      window.addEventListener("PageAgent::EnablePassThrough", enablePassThroughListener);
      window.addEventListener("PageAgent::DisablePassThrough", disablePassThroughListener);
      this.addEventListener("dispose", () => {
        window.removeEventListener("PageAgent::MovePointerTo", movePointerToListener);
        window.removeEventListener("PageAgent::ClickPointer", clickPointerListener);
        window.removeEventListener("PageAgent::EnablePassThrough", enablePassThroughListener);
        window.removeEventListener("PageAgent::DisablePassThrough", disablePassThroughListener);
      });
    }
    #createCursor() {
      this.#cursor.className = cursorStyles.cursor;
      const rippleContainer = document.createElement("div");
      rippleContainer.className = cursorStyles.cursorRipple;
      this.#cursor.appendChild(rippleContainer);
      const fillingLayer = document.createElement("div");
      fillingLayer.className = cursorStyles.cursorFilling;
      this.#cursor.appendChild(fillingLayer);
      const borderLayer = document.createElement("div");
      borderLayer.className = cursorStyles.cursorBorder;
      this.#cursor.appendChild(borderLayer);
      this.wrapper.appendChild(this.#cursor);
    }
    #moveCursorToTarget() {
      if (this.#disposed) return;
      const newX = this.#currentCursorX + (this.#targetCursorX - this.#currentCursorX) * 0.2;
      const newY = this.#currentCursorY + (this.#targetCursorY - this.#currentCursorY) * 0.2;
      const xDistance = Math.abs(newX - this.#targetCursorX);
      if (xDistance > 0) {
        if (xDistance < 2) {
          this.#currentCursorX = this.#targetCursorX;
        } else {
          this.#currentCursorX = newX;
        }
        this.#cursor.style.left = `${this.#currentCursorX}px`;
      }
      const yDistance = Math.abs(newY - this.#targetCursorY);
      if (yDistance > 0) {
        if (yDistance < 2) {
          this.#currentCursorY = this.#targetCursorY;
        } else {
          this.#currentCursorY = newY;
        }
        this.#cursor.style.top = `${this.#currentCursorY}px`;
      }
      requestAnimationFrame(() => this.#moveCursorToTarget());
    }
    setCursorPosition(x, y) {
      this.#targetCursorX = x;
      this.#targetCursorY = y;
    }
    triggerClickAnimation() {
      this.#cursor.classList.remove(cursorStyles.clicking);
      void this.#cursor.offsetHeight;
      this.#cursor.classList.add(cursorStyles.clicking);
    }
    setCursorVisible(visible2) {
      this.#cursor.style.display = visible2 ? "" : "none";
    }
    show() {
      if (this.shown) return;
      this.shown = true;
      this.motion?.start();
      this.motion?.fadeIn();
      this.wrapper.classList.add(styles.visible);
      this.#currentCursorX = window.innerWidth / 2;
      this.#currentCursorY = window.innerHeight / 2;
      this.#targetCursorX = this.#currentCursorX;
      this.#targetCursorY = this.#currentCursorY;
      this.#cursor.style.left = `${this.#currentCursorX}px`;
      this.#cursor.style.top = `${this.#currentCursorY}px`;
    }
    hide() {
      if (!this.shown) return;
      this.shown = false;
      this.motion?.fadeOut();
      this.motion?.pause();
      this.#cursor.classList.remove(cursorStyles.clicking);
      setTimeout(() => {
        this.wrapper.classList.remove(styles.visible);
      }, 800);
    }
    dispose() {
      this.#disposed = true;
      console.log("dispose SimulatorMask");
      this.motion?.dispose();
      this.wrapper.remove();
      this.dispatchEvent(new Event("dispose"));
    }
  }
  const SimulatorMaskSNxPmVn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    SimulatorMask
  }, Symbol.toStringTag, { value: "Module" }));
  return result;
})();

content;