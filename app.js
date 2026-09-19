/*
 * Instant Lead Response: the simulation.
 *
 * Nothing here sends anything. There is no network call, no key, no backend
 * and no third party script. Pressing the button walks a scripted timeline
 * and fills two panels with the messages a real install would send, which is
 * what makes this safe to host for free and safe to show a stranger.
 *
 * The clock labels on the timeline are the times a live install is set up to
 * hit. The real delays here are shorter, because a demo that made somebody
 * wait twelve seconds to see the third step would lose them. The page says
 * the timing is simulated, in the header chip and above the timeline.
 */

(function () {
  "use strict";

  /** The one fake lead this demo uses. Invented, and local to East County. */
  var LEAD = {
    name: "Maria Lopez",
    firstName: "Maria",
    company: "East County Comfort",
    job: "AC not cooling",
    city: "El Cajon",
    answer: "Emergency",
    source: "Web form",
    phone: "(619) 555-0148",
  };

  /**
   * How long each step waits before it completes, in milliseconds.
   *
   * These are demo pacing, not the clock shown on screen. Long enough that a
   * person sees three separate things happen, short enough that the whole run
   * is over in about three seconds.
   */
  var PACE = {
    /* A run that finished instantly would look like nothing happened, so the
       busy state is held long enough to read. */
    busy: 320,
    received: 420,
    reply: 780,
    qualify: 620,
    notify: 700,
  };

  var ORDER = ["received", "reply", "notify"];

  var els = {
    run: document.getElementById("run-fake-lead"),
    status: document.getElementById("run-status"),
    timeline: document.getElementById("timeline"),
    customerBody: document.getElementById("customer-body"),
    customerState: document.getElementById("customer-state"),
    ownerBody: document.getElementById("owner-body"),
    ownerState: document.getElementById("owner-state"),
  };

  var running = false;

  /** Report whether the visitor asked for less motion. */
  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Wait, unless the visitor asked for reduced motion.
   *
   * With reduced motion on, every step completes immediately. The sequence
   * still runs in order and the end state is identical, it just arrives
   * without the staging.
   */
  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, reducedMotion() ? 0 : ms);
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

  /** Fill one of the templates with this lead's details. */
  function fill(template) {
    return template
      .replace(/\{Name\}/g, LEAD.firstName)
      .replace(/\{Company\}/g, LEAD.company)
      .replace(/\{Job\}/g, LEAD.job)
      .replace(/\{City\}/g, LEAD.city)
      .replace(/\{Answer\}/g, LEAD.answer);
  }

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

  /** Show a line of status, or hide the region when given nothing. */
  function say(message, tone) {
    if (!message) {
      els.status.hidden = true;
      els.status.textContent = "";
      return;
    }
    els.status.hidden = false;
    els.status.textContent = message;
    els.status.setAttribute("data-tone", tone || "info");
  }

  /** Set the small state chip on a panel header. */
  function setPanelState(el, label, tone) {
    el.textContent = label;
    el.className = "chip " + (tone || "chip-quiet");
  }

  /* ------------------------------------------------------------- rendering */

  /** The inbound lead, as the customer's side of the thread starts. */
  function renderInbound() {
    els.customerBody.innerHTML =
      '<div class="bubble">' +
      '<div class="bubble-meta">' +
      "<span>" +
      esc(LEAD.source) +
      "</span><span>" +
      esc(LEAD.phone) +
      "</span>" +
      "</div>" +
      "<strong>" +
      esc(LEAD.name) +
      "</strong> in " +
      esc(LEAD.city) +
      ": " +
      esc(LEAD.job) +
      ". Asked for a callback." +
      "</div>";
    setPanelState(els.customerState, "Lead in", "chip-warn");
  }

  /** The automatic reply, and the one qualifying question. */
  function renderAutoReply() {
    var text = fill(
      "Hi {Name}, this is {Company}. We got your request about {Job}. Emergency or " +
        "flexible timing? Reply to this text and we'll lock a window.",
    );
    els.customerBody.insertAdjacentHTML(
      "beforeend",
      '<div class="bubble">' +
        '<div class="bubble-meta"><span>Auto-reply</span><span>8s after the form</span></div>' +
        esc(text) +
        "</div>",
    );
    setPanelState(els.customerState, "Replied", "chip-good");
  }

  /** The customer's answer, which is the one beat of qualifying. */
  function renderQualifyAnswer() {
    els.customerBody.insertAdjacentHTML(
      "beforeend",
      '<div class="bubble bubble-reply">' +
        '<div class="bubble-meta"><span>' +
        esc(LEAD.firstName) +
        " replied</span></div>" +
        esc(LEAD.answer) +
        ". It is 95 out and the house is not cooling." +
        "</div>",
    );
  }

  /** The SMS the owner gets while still on the job. */
  function renderOwnerNotify() {
    var text = fill(
      "New lead: {Name} · {Job} · {City}. They said: {Answer}. Reply now or open Jobber.",
    );
    els.ownerBody.innerHTML =
      '<div class="notify">' +
      '<div class="bubble-meta"><span>SMS to you</span><span>12s after the form</span></div>' +
      '<dl class="notify-line"><dt>Name</dt><dd>' +
      esc(LEAD.name) +
      "</dd></dl>" +
      '<dl class="notify-line"><dt>Job</dt><dd>' +
      esc(LEAD.job) +
      "</dd></dl>" +
      '<dl class="notify-line"><dt>City</dt><dd>' +
      esc(LEAD.city) +
      "</dd></dl>" +
      '<dl class="notify-line"><dt>Urgency</dt><dd>' +
      esc(LEAD.answer) +
      "</dd></dl>" +
      '<div class="notify-body">' +
      esc(text) +
      "</div>" +
      "</div>";
    setPanelState(els.ownerState, "Notified", "chip-good");
  }

  /* -------------------------------------------------------------- the run */

  /** Put the button into its busy state. */
  function startBusy() {
    running = true;
    els.run.disabled = true;
    els.run.setAttribute("aria-busy", "true");
    els.run.textContent = "Sending demo reply...";
  }

  /** Take the button out of its busy state, ready to run again. */
  function endBusy() {
    running = false;
    els.run.disabled = false;
    els.run.removeAttribute("aria-busy");
    els.run.textContent = "Run again";
  }

  /**
   * Walk the scripted timeline.
   *
   * Each step goes pending, then active, then done, in order. Nothing jumps
   * straight to done: a demo where all three completed in the same frame
   * would prove nothing about speed, which is the only thing this page is
   * trying to show.
   */
  async function runDemo() {
    if (running) return;

    startBusy();
    say("Sending demo reply...", "info");

    try {
      // Clear the previous run only now, so results stay on screen between
      // runs rather than blanking the moment somebody reaches for the button.
      // This is inside the try because it touches the DOM like everything
      // below it does: a failure here has to land in the same catch, or the
      // button stays disabled and the page is dead with no way back.
      resetSteps();
      setPanelState(els.customerState, "Waiting", "chip-quiet");
      setPanelState(els.ownerState, "Waiting", "chip-quiet");
      els.ownerBody.innerHTML =
        '<p class="panel-empty">Waiting on the qualifying answer.</p>';
      els.customerBody.innerHTML = '<p class="panel-empty">Lead coming in.</p>';

      await wait(PACE.busy);

      setStep("received", "active");
      await wait(PACE.received);
      renderInbound();
      setStep("received", "done");

      setStep("reply", "active");
      await wait(PACE.reply);
      renderAutoReply();
      setStep("reply", "done");

      await wait(PACE.qualify);
      renderQualifyAnswer();

      setStep("notify", "active");
      await wait(PACE.notify);
      renderOwnerNotify();
      setStep("notify", "done");

      say(
        "Demo finished. The customer got a reply in 8 seconds and you were notified at 12. " +
          "Nothing was actually sent.",
        "info",
      );
    } catch (error) {
      resetSteps();
      setPanelState(els.customerState, "Stopped", "chip-bad");
      setPanelState(els.ownerState, "Stopped", "chip-bad");
      say("Demo couldn't finish. Try Run again.", "error");
    } finally {
      endBusy();
    }
  }

  if (els.run) {
    els.run.addEventListener("click", function () {
      runDemo();
    });
  }

  // Exposed so the page can be driven by a test without clicking, and so a
  // failure path can be exercised on purpose rather than only in theory.
  window.instantLeadDemo = { run: runDemo, lead: LEAD, pace: PACE };
})();
