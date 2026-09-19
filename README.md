# Instant Lead Response

A one-page demo of what happens to a lead in the first twelve seconds, built
for HVAC and plumbing owners in El Cajon and the rest of East County San Diego.

**Live demo: https://igorcsis.github.io/instant-lead-response/**

A homeowner fills in your form or calls and hangs up while you are on a roof in
Santee. In the demo you press one button and watch three things happen: the
lead lands, the customer gets a text back that names the job and asks one
qualifying question, and your phone buzzes with the name, the job, the city and
how hot it is. You never climbed down.

## The SMS is simulated

Nothing on this page sends anything. There is no backend, no API key, no
Twilio, no HighLevel, no queue and no third party script. Pressing the button
runs a scripted timeline in the browser and writes the messages a real install
would send into the two panels. That is stated in the header chip, which stays
on screen at every scroll position, and again above the timeline.

The clocks on the timeline (0s, 8s, 12s) are the targets a live install is set
up to hit. The demo's own delays are shorter, because a page that made you wait
twelve seconds for the third step would lose you before it got there.

## What a real install is

The demo is the shop window, not the product. A real install is done-for-you
and runs on tools that already exist:

- **HighLevel** for most shops, because the messaging, the pipeline and the
  templates are already in one place, or
- **a leaner Twilio setup** when someone only wants the missed-call text-back
  and the owner notify and nothing else.

Either way there is **A2P 10DLC registration** in the middle of it. US carriers
require a registered brand and campaign before application-to-person texting is
allowed to send, and that registration takes days, not minutes. It is the
reason the offer is priced as a deposit plus a second payment when the SMS is
actually cleared and sending, rather than a single payment on day one.

Your Jobber or Housecall Pro stays exactly where it is. This sits on top of the
system of record you already pay for, it does not replace it, and there is no
login, no migration and no seat to buy.

## Running it locally

There is no build step and nothing to install. The repository is the site.

```sh
git clone https://github.com/IgorCSIS/instant-lead-response.git
cd instant-lead-response
python3 -m http.server 8000
```

Then open http://localhost:8000.

Opening `index.html` straight off disk works too. The page uses no modules, no
fetch and no storage, so there is nothing for a file:// origin to trip over.

## What is in here

| Path | What it is |
| --- | --- |
| `index.html` | The whole page. One file, no templating. |
| `styles.css` | Hand-written CSS with custom properties. No framework, so nothing can be purged out from under a class name. |
| `app.js` | The simulation. One IIFE, no dependencies. |
| `assets/` | Logo and favicon, both SVG. |
| `.github/workflows/deploy.yml` | Uploads the repository root to GitHub Pages. No build. |

`app.js` exposes `window.instantLeadDemo` so the run can be driven from a
console or a headless browser without clicking.

## Accessibility and motion

The run reports itself through a single `role="status"` live region, so a
screen reader gets the same progress the timeline shows. The button carries
`aria-busy` while a run is in flight and cannot be double-fired. Tap targets are
44px. Every focusable thing has a visible focus ring.

With `prefers-reduced-motion: reduce` set, each step still runs in order and
lands in the same end state, it just arrives without the staged delays.

## Cost

Zero, to run and to host. Static files on GitHub Pages, no dependencies, no
services, nothing to renew.

## Want this on your own phone

Done-for-you install for East County trades: missed-call text-back, form
qualify and owner SMS, on top of Jobber or Housecall Pro. From $997, as a $497
deposit and $500 when your SMS is live and sending. Optional light support at
$149 a month. You keep paying your own messaging usage.

niftystudiodesigns@gmail.com

## Licence

MIT. See [LICENSE](LICENSE).

Built by Igor Lima, El Cajon / East County.
