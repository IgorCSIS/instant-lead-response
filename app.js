/*
 * Instant Lead Response: the simulation.
 *
 * Nothing here sends anything. There is no network call, no key, no backend
 * and no third party script. Pressing the button walks a scripted timeline
 * and fills two panels with the messages a real install would send, which is
 * what makes this safe to host for free and safe to show a stranger.
 *
 * The run is paced to the real clock. The timeline is labelled 0s, 8s and 12s
 * and the steps actually land there, with an elapsed readout ticking beside
 * them, because the whole claim being made is about speed and a demo that
 * collapsed twelve seconds into two would be arguing against itself.
 */

(function () {
  "use strict";

  /** The homeowner, invented, and local to East County. */
  var LEAD = {
    name: "Maria Lopez",
    firstName: "Maria",
    company: "East County Comfort",
    job: "AC not cooling",
    city: "El Cajon",
    answer: "Emergency",
    phone: "(619) 555-0148",
  };

  /*
   * The two ways the same job walks in the door, and how each one differs.
   *
   * A web form hands you the name, the job and the city up front. A missed
   * call hands you a phone number and nothing else, so the text back has to
   * ask what is going on before there is anything to dispatch. Showing both
   * is the point: the second one is the case owners lose most often.
   */
  var SOURCES = {
    form: {
      label: "Web form",
      meta: "Web form",
      inbound:
        "<strong>{name}</strong> in {city}: {job}. Asked for a callback.",
      reply:
        "Hi {firstName}, this is {company}. We got your request about {job}. " +
        "Emergency or flexible timing? Reply to this text and we'll lock a window.",
      answer: "{answer}. It is 95 out and the house is not cooling.",
      notifyRows: [
        ["Name", "{name}"],
        ["Job", "{job}"],
        ["City", "{city}"],
        ["Urgency", "{answer}"],
      ],
      notifyBody:
        "New lead: {firstName} · {job} · {city}. They said: {answer}. " +
        "Reply now or open Jobber or Housecall Pro.",
      notes: {
        received: "Quote form on your site. Name, job and city arrive with it.",
        reply: "Template names the job and asks one qualifying question.",
        notify: "Name, job, city and urgency, on your phone.",
      },
    },

    call: {
      label: "Missed call",
      meta: "Missed call",
      inbound:
        "<strong>{phone}</strong> rang out after 22 seconds. No voicemail, no name, " +
        "nothing but the number.",
      reply:
        "Hi, this is {company}. Sorry we missed your call, we're on a job. What's " +
        "going on, and is it an emergency or flexible timing?",
      answer:
        "{job}, we're in {city}. {answer}, it is 95 out. This is {firstName} by the way.",
      notifyRows: [
        ["From", "{phone}"],
        ["Job", "{job}"],
        ["City", "{city}"],
        ["Urgency", "{answer}"],
      ],
      notifyBody:
        "Missed call: {phone} · {job} · {city}. They said: {answer}. " +
        "Reply now or open Jobber or Housecall Pro.",
      notes: {
        received: "Ring, no answer, no voicemail. All you have is the number.",
        reply: "Text back asks what is going on and how urgent it is.",
        notify: "Number, job, city and urgency, on your phone.",
      },
    },
  };

  /*
   * When each thing happens, in milliseconds from the press.
   *
   * These are the clock labels on the timeline, not decoration. A step turns
   * active the moment the one before it finishes and stays pulsing until its
   * own time comes up, so the pulse is what fills the wait rather than a
   * frozen screen.
   */
  var CLOCK = {
    receivedDone: 400,
    replyDone: 8000,
    answer: 10000,
    notifyDone: 12000,
  };

  /** The last number on the timeline, and where the elapsed readout stops. */
  var TOTAL_SECONDS = 12;

  var ORDER = ["received", "reply", "notify"];

  var els = {
    run: document.getElementById("run-fake-lead"),
    status: document.getElementById("run-status"),
    elapsed: document.getElementById("elapsed"),
    timeline: document.getElementById("timeline"),
    segments: Array.prototype.slice.call(document.querySelectorAll(".seg")),
    customerBody: document.getElementById("customer-body"),
    customerState: document.getElementById("customer-state"),
    ownerBody: document.getElementById("owner-body"),
    ownerState: document.getElementById("owner-state"),
  };

  var running = false;
  var sourceKey = "form";
  var ticker = null;

  /** Report whether the visitor asked for less motion. */
  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Wait until a given point on the run's clock.
   *
   * With reduced motion on, every wait resolves at once. The sequence still
   * walks pending, active then done in order and lands in the same end state,
   * it just arrives without the staging.
   */
  function waitUntil(startedAt, ms) {
    if (reducedMotion()) return Promise.resolve();
    var remaining = ms - (Date.now() - startedAt);
    return new Promise(function (resolve) {
      window.setTimeout(resolve, remaining > 0 ? remaining : 0);
    });
  }

  /** Escape text before it goes anywhere near innerHTML. */
  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Fill one of the templates above with this lead's details.
   *
   * The template is a literal in this file, so its markup is trusted. Every
   * value substituted into it is escaped on the way in, so a lead field can
   * never carry markup of its own.
   */
  function fill(template) {
    return template.replace(/\{(\w+)\}/g, function (whole, key) {
      return LEAD[key] === undefined ? whole : esc(LEAD[key]);
    });
  }

  /** The source the segmented control is currently set to. */
  function source() {
    return SOURCES[sourceKey];
  }

  /* ------------------------------------------------------------- timeline */

  /** Set a timeline step to pending, active or done. */
  function setStep(name, stateName) {
    var step = els.timeline.querySelector('[data-step="' + name + '"]');
    if (step) step.setAttribute("data-state", stateName);
  }

  /** Put every step back to pending, for a second run. */
  function resetSteps() {
    ORDER.forEach(function (name) {
      setStep(name, "pending");
    });
  }

  /** Rewrite the per-step notes for whichever source is selected. */
  function applyStepNotes() {
    var notes = source().notes;
    ORDER.forEach(function (name) {
      var note = els.timeline.querySelector('[data-step="' + name + '"] .step-note');
      if (note) note.textContent = notes[name];
    });
  }

  /** Show the elapsed readout at a whole number of seconds. */
  function showElapsed(seconds) {
    els.elapsed.textContent = Math.min(Math.max(seconds, 0), TOTAL_SECONDS) + "s";
  }

  /**
   * Start the elapsed readout ticking.
   *
   * Hidden from assistive tech on purpose: the status line already announces
   * each stage, and a counter updating ten times a second would talk over it.
   */
  function startClock(startedAt) {
    showElapsed(0);
    if (reducedMotion()) return;
    els.elapsed.setAttribute("data-running", "true");
    ticker = window.setInterval(function () {
      showElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 100);
  }

  /** Stop the readout and leave it on a final value. */
  function stopClock(seconds) {
    if (ticker !== null) {
      window.clearInterval(ticker);
      ticker = null;
    }
    els.elapsed.setAttribute("data-running", "false");
    showElapsed(seconds);
  }

  /* -------------------------------------------------------------- panels */

  /** Show a line of status under the button. */
  function say(message, tone) {
    els.status.textContent = message;
    els.status.setAttribute("data-tone", tone || "info");
  }

  /** Set the small state chip on a panel header. */
  function setPanelState(el, label, tone) {
    el.textContent = label;
    el.className = "chip " + (tone || "chip-quiet");
  }

  /** The inbound lead, as the customer's side of the thread starts. */
  function renderInbound() {
    els.customerBody.innerHTML =
      '<div class="bubble">' +
      '<div class="bubble-meta"><span>' +
      esc(source().meta) +
      "</span><span>" +
      esc(LEAD.phone) +
      "</span></div>" +
      fill(source().inbound) +
      "</div>";
    setPanelState(els.customerState, "Lead in", "chip-warn");
  }

  /** The automatic reply, and the one qualifying question. */
  function renderAutoReply() {
    els.customerBody.insertAdjacentHTML(
      "beforeend",
      '<div class="bubble">' +
        '<div class="bubble-meta"><span>Auto-reply</span><span>8s after the lead</span></div>' +
        fill(source().reply) +
        "</div>",
    );
    setPanelState(els.customerState, "Replied", "chip-done");
  }

  /** The customer's answer, which is the one beat of qualifying. */
  function renderQualifyAnswer() {
    els.customerBody.insertAdjacentHTML(
      "beforeend",
      '<div class="bubble bubble-reply">' +
        '<div class="bubble-meta"><span>' +
        esc(LEAD.firstName) +
        " replied</span></div>" +
        fill(source().answer) +
        "</div>",
    );
  }

  /** The SMS the owner gets while still on the job. */
  function renderOwnerNotify() {
    var rows = source()
      .notifyRows.map(function (pair) {
        return (
          '<dl class="notify-line"><dt>' +
          esc(pair[0]) +
          "</dt><dd>" +
          fill(pair[1]) +
          "</dd></dl>"
        );
      })
      .join("");

    els.ownerBody.innerHTML =
      '<div class="notify">' +
      '<div class="bubble-meta">' +
      "<span>SMS to you</span>" +
      '<span class="notify-tag">Demo</span>' +
      "<span>12s after the lead</span>" +
      "</div>" +
      rows +
      '<div class="notify-body">' +
      fill(source().notifyBody) +
      "</div>" +
      "</div>";
    setPanelState(els.ownerState, "Notified", "chip-done");
  }

  /** Put both panels back to the state a first-time visitor sees. */
  function clearPanels() {
    setPanelState(els.customerState, "Waiting", "chip-quiet");
    setPanelState(els.ownerState, "Waiting", "chip-quiet");
    els.customerBody.innerHTML =
      '<p class="panel-empty">No lead yet. Run a fake HVAC lead to see the reply and your notify.</p>';
    els.ownerBody.innerHTML =
      '<p class="panel-empty">Your phone buzzes with the name, the job and how hot it is, without climbing down.</p>';
  }

  /* -------------------------------------------------------------- the run */

  /** Lock the controls while a run is in flight. */
  function startBusy() {
    running = true;
    els.run.disabled = true;
    els.run.setAttribute("aria-busy", "true");
    els.run.textContent = "Sending demo reply…";
    els.segments.forEach(function (seg) {
      seg.disabled = true;
    });
  }

  /** Unlock the controls, ready to run again. */
  function endBusy() {
    running = false;
    els.run.disabled = false;
    els.run.removeAttribute("aria-busy");
    els.run.textContent = "Run again";
    els.segments.forEach(function (seg) {
      seg.disabled = false;
    });
  }

  /**
   * Walk the scripted timeline.
   *
   * Each step goes pending, then active, then done, in order, and completes
   * at the second its own label claims. Nothing jumps straight to done: a
   * demo where all three finished in the same frame would prove nothing about
   * speed, which is the only thing this page is trying to show.
   */
  async function runDemo() {
    if (running) return;

    startBusy();
    say("Sending demo reply…", "info");

    try {
      // Clear the previous run only now, so results stay on screen between
      // runs rather than blanking the moment somebody reaches for the button.
      // This is inside the try because it touches the DOM like everything
      // below it does: a failure here has to land in the same catch, or the
      // button stays disabled and the page is dead with no way back.
      resetSteps();
      setPanelState(els.customerState, "Waiting", "chip-quiet");
      setPanelState(els.ownerState, "Waiting", "chip-quiet");
      els.customerBody.innerHTML = '<p class="panel-empty">Lead coming in.</p>';
      els.ownerBody.innerHTML =
        '<p class="panel-empty">Waiting on the qualifying answer.</p>';

      var startedAt = Date.now();
      startClock(startedAt);

      setStep("received", "active");
      await waitUntil(startedAt, CLOCK.receivedDone);
      renderInbound();
      setStep("received", "done");

      setStep("reply", "active");
      await waitUntil(startedAt, CLOCK.replyDone);
      renderAutoReply();
      setStep("reply", "done");

      await waitUntil(startedAt, CLOCK.answer);
      renderQualifyAnswer();

      setStep("notify", "active");
      await waitUntil(startedAt, CLOCK.notifyDone);
      renderOwnerNotify();
      setStep("notify", "done");

      stopClock(TOTAL_SECONDS);

      // The demo has been seen, so the button stops competing with the one
      // call to action that actually matters further down the page.
      els.run.className = "btn btn-ghost";

      say(
        "Demo finished. The customer got a reply at 8 seconds and you were notified at 12. " +
          "Nothing was actually sent.",
        "info",
      );
    } catch (error) {
      stopClock(0);
      resetSteps();
      setPanelState(els.customerState, "Stopped", "chip-bad");
      setPanelState(els.ownerState, "Stopped", "chip-bad");
      say("Demo couldn't finish. Try Run again.", "error");
    } finally {
      endBusy();
    }
  }

  /* ---------------------------------------------------- segmented control */

  /**
   * Switch which way the lead arrives.
   *
   * Everything from the previous run is cleared, because leaving a web form
   * thread on screen under a Missed call heading would be the one dishonest
   * thing on the page.
   */
  function selectSource(key, moveFocus) {
    if (running || !SOURCES[key]) return;

    sourceKey = key;
    els.segments.forEach(function (seg) {
      var chosen = seg.getAttribute("data-source") === key;
      seg.setAttribute("aria-checked", chosen ? "true" : "false");
      seg.tabIndex = chosen ? 0 : -1;
      if (chosen && moveFocus) seg.focus();
    });

    resetSteps();
    applyStepNotes();
    clearPanels();
    stopClock(0);
    els.run.textContent = "Run fake lead";
    els.run.className = "btn btn-primary";
    say("Demo only. Nothing is sent.", "info");
  }

  els.segments.forEach(function (seg, index) {
    seg.addEventListener("click", function () {
      selectSource(seg.getAttribute("data-source"), false);
    });

    // Arrow keys move between options, the way a radio group is expected to.
    seg.addEventListener("keydown", function (event) {
      var step = 0;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") step = 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") step = -1;
      if (step === 0) return;
      event.preventDefault();
      var next = els.segments[(index + step + els.segments.length) % els.segments.length];
      selectSource(next.getAttribute("data-source"), true);
    });
  });

  if (els.run) {
    els.run.addEventListener("click", function () {
      runDemo();
    });
  }

  applyStepNotes();

  // Exposed so the page can be driven by a test without clicking, and so a
  // failure path can be exercised on purpose rather than only in theory.
  window.instantLeadDemo = {
    run: runDemo,
    select: selectSource,
    lead: LEAD,
    sources: SOURCES,
    clock: CLOCK,
  };
})();
