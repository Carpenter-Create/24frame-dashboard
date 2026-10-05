import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lock = readFileSync("docs/design-locks/social-profile-stage-lock-v1.md", "utf8");
const linkedin = readFileSync("docs/design-locks/social-profile-header-linkedin-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");

describe("Social profile Stage lock v1 (founder picks 2026-10-03/04)", () => {
  // Each founder quote is guarded on a short verbatim anchor (its first
  // clause) under the verbatim heading.
  it("records the founder words verbatim and both picks", () => {
    expect(lock).toContain("## Founder words (verbatim, 2026-10-03/04)");
    for (const words of [
      "I need it significantly more in this energy.",
      "I'm happy to reimagine the visual experience",
      "I don't want the same layout",
      "Links are given far too much attention.",
      "keep our brand typography and colors too",
      "default is light mode but users can go to dark mode",
    ]) {
      expect(lock).toContain(`> ${words}`);
    }
    expect(lock).toContain('**"A · Stage"**');
    expect(lock).toContain('**"Frame once, phone area shown"**');
  });

  it("locks the desktop and phone specs and the editor's phone outline", () => {
    expect(lock).toContain("`aspect-[16/7]` at every desktop width, `--radius-xl` (24, new token)");
    expect(lock).toContain("`aspect-[61/55]` (mockup 366×330 at 390)");
    expect(lock).toContain("**2400×1050**");
    expect(lock).toContain("`coverPhoneSafeRegion`");
    expect(lock).toContain('labelled **"Phone view"**');
    expect(lock).toContain("Nothing outside it is dimmed");
    expect(lock).toContain("No SQL change");
  });

  it("records the review limits honestly and the checkpoints they raise", () => {
    // The steps the code uses, and the fit they guarantee.
    expect(lock).toContain("below **28rem**");
    expect(lock).toContain("from **40rem**");
    expect(lock).toContain("**two-line name inside 16:7**");
    expect(lock).not.toContain("The 16:7 box holds for every name that fits it.");
    expect(lock).not.toMatch(/below \*\*35rem\*\* of hero width/);
    // Long names grow the card, but the cover keeps its frame box.
    expect(lock).toContain("16:7 (or 61:55) box");
    // Landscape phones get the 16:7 frame.
    expect(lock).toContain("from **30rem** of viewport");
    // Founder checkpoints for what this pass could not decide.
    const openAt = lock.indexOf("## Founder checkpoints left open");
    expect(openAt).toBeGreaterThan(-1);
    const open = lock.slice(openAt);
    expect(open).toContain("- **Singular stat labels.**");
    expect(open).toContain("- **Long names.**");
    // Tab contrast is no longer open: the founder picked "Deeper blue text".
    expect(open).not.toContain("Active tab contrast");
    expect(open).not.toContain("accent-ink");
  });

  it("records the tab-contrast decision with the measured ratios (Adam 2026-10-04)", () => {
    expect(lock).toContain('| Active tab contrast (Adam, 2026-10-04) | **"Deeper blue text"** |');
    // The option text as offered, on its first clause.
    expect(lock).toContain('"Add one slightly darker shade of your Sporty Blue');
    expect(lock).toContain("Active: `--accent-wash` fill, `--accent-ink` text 600");
    const a11yAt = lock.indexOf("## Accessibility");
    const a11y = lock.slice(a11yAt, lock.indexOf("## OUT"));
    expect(a11y).toContain("- **Active tab label: decided");
    expect(a11y).toContain("measured **4.07:1**");
    expect(a11y).toContain("Light: **4.62:1** on the wash, 5.29:1 on white.");
    expect(a11y).toContain("6.17:1");
    expect(a11y).toContain("`HOUSE_RAIL_ACTIVE_CLASS`");
    expect(a11y).toContain("the write-compose voice mic while recording (`bg-accent/10`");
    expect(a11y).toContain("`--accent-ink`: 4.61:1 painted in headless Chromium, was 4.07:1");
    expect(a11y).not.toContain("so it is a founder checkpoint");
  });

  it("carries #760's zoom into the Stage editor with Stage numbers, and no public note in either lock", () => {
    // Stage lock: the editor includes zoom, capped against the 2400 output,
    // with the phone outline in frame space.
    expect(lock).toContain("LinkedIn-style **zoom**");
    expect(lock).toContain("- **Zoom (carried from the LinkedIn lock, Stage numbers).**");
    expect(lock).toContain("`min(iw, (16/7)·ih) / z`");
    expect(lock).toContain("half the **2400** output");
    expect(lock).toContain("The phone outline is **frame space**");
    expect(lock).toContain("- **S11 (carried G4/G11, Stage numbers):**");
    const editor = lock.slice(lock.indexOf("## Editor"), lock.indexOf("## States"));
    expect(editor).toContain("Hint, the Zoom slider, Cancel / Save and errors");
    expect(editor).not.toMatch(/Hint, public note/);
    // LinkedIn lock: its editor section keeps zoom and the note removal, and
    // its still-in-force list names both.
    const linkedinEditor = linkedin.slice(linkedin.indexOf("## Editor"));
    expect(linkedinEditor).toContain("- **Zoom (2026-10-04).**");
    expect(linkedinEditor).toContain('- No "Your cover photo is public." note.');
    expect(linkedinEditor).toContain("The hint, the Zoom slider, Cancel/Save and errors");
    expect(linkedin).toContain("the Zoom rules and the removed public note, and gates G8–G11");
    expect(linkedin).not.toContain("The hint, the public note");
  });

  it("marks what it supersedes, including the flush phone header, and keeps the editor rules", () => {
    expect(lock).toContain('decision 2, **"Edge to edge, flush"**');
    expect(lock).toContain("**Keeps (from the LinkedIn lock):**");
    expect(linkedin).toContain("**Header geometry SUPERSEDED** by [`social-profile-stage-lock-v1.md`]");
    expect(linkedin).toContain("**Still in force:** decision 3 (keep the original)");
    expect(readme).toContain("[`social-profile-stage-lock-v1.md`](social-profile-stage-lock-v1.md)");
    expect(current).toContain("Profile layout is A · Stage (founder pick)");
    expect(current).toContain("social-profile-stage-lock-v1.md");
    // CURRENT.md carries no ISO dates in the Stage line.
    const line = current.split("\n").find((row) => row.startsWith("Profile layout is A · Stage")) ?? "";
    expect(line).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
