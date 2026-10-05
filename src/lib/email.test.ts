import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildMagicLinkEmail, buildNotificationEmail, buildOtpEmail, buildSignInWithCodeEmail } from "./email";
import { buildHouseGrantEmail, buildTeamInviteEmail } from "./email-invite-templates";
import {
  EMAIL_ACCENT,
  EMAIL_ADDRESS,
  EMAIL_BODY_SIZE,
  applyEmailCopyright,
  emailCopyright,
  emailCopyrightPlaceholder,
  EMAIL_FORMAT_DETECTION,
  EMAIL_GEIST_HREF,
  EMAIL_HEADLINE_SIZE,
  EMAIL_INK,
  EMAIL_LEGAL_URL,
  EMAIL_LOGO_DISPLAY,
  EMAIL_LOGO_URL,
  EMAIL_SITE_LABEL,
  EMAIL_SITE_URL,
} from "./email-house";

const SPORTY_BLUE = "#1769FF";

const AUTH_TEMPLATE = resolve(__dirname, "../../supabase/templates/magic_link.html");
const AUTH_CONFIG = readFileSync(resolve(__dirname, "../../supabase/config.toml"), "utf8");

function productResidue(html: string): string {
  return html.replaceAll("Global Content Holdings LLC", "").replaceAll(EMAIL_LEGAL_URL, "");
}

function withoutAnchors(html: string): string {
  return html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "");
}

function assertFormatDetectionWellFormed(html: string) {
  const fd = html.indexOf('name="format-detection"');
  const geist = html.indexOf(EMAIL_GEIST_HREF) !== -1 ? html.indexOf(EMAIL_GEIST_HREF) : html.indexOf("fonts.googleapis.com/css2?family=Geist");
  expect(fd).toBeGreaterThan(-1);
  expect(geist).toBeGreaterThan(fd);
  expect(html.slice(fd, geist)).toMatch(/content="[^"]+"\s*\/?>/);
  expect(html).toContain(`content="${EMAIL_FORMAT_DETECTION}">`);
}

function assertCoinbaseScale(html: string) {
  expect(EMAIL_HEADLINE_SIZE).toBeGreaterThan(23);
  expect(EMAIL_BODY_SIZE).toBeGreaterThan(15);
  expect(html).toContain(`font-size:${EMAIL_HEADLINE_SIZE}px`);
  expect(html).toContain(`font-size:${EMAIL_BODY_SIZE}px`);
  expect(html).toContain(`width:${EMAIL_LOGO_DISPLAY}px;height:${EMAIL_LOGO_DISPLAY}px`);
}

function assertSignInButton(html: string) {
  expect(html).toContain(">Sign in</a>");
  expect(html).toContain(`background:${SPORTY_BLUE}`);
  expect(html).toContain(`bgcolor="${SPORTY_BLUE}"`);
  expect(html).not.toContain("Sign in to 24Frame");
  expect(html).not.toMatch(/border-radius:\s*999px/);
  expect(html).not.toMatch(/<img[^>]*#1769FF/i);
}

function assertOtpNotLinkified(html: string, code: string) {
  expect(html).toContain(code);
  expect(html).toContain(`color:${EMAIL_INK}`);
  expect(html).toContain("text-decoration:none");
  expect(html).toContain('x-apple-data-detectors="false"');
  assertFormatDetectionWellFormed(html);
  expect(html).toContain("a[x-apple-data-detectors]");
  const codeIdx = html.indexOf(code);
  const region = html.slice(Math.max(0, codeIdx - 280), codeIdx + code.length + 40);
  expect(region).not.toMatch(/color:\s*#1769FF/i);
  expect(region).not.toMatch(/text-decoration:\s*underline/);
  expect(region).not.toMatch(/background:\s*#1769FF/i);
}

describe("buildOtpEmail", () => {
  it("includes the code and no banned words", () => {
    const { subject, text, html } = buildOtpEmail("012345");
    expect(text).toContain("012345");
    expect(html).toContain("012345");
    expect(subject).toBe("Your 24Frame access code");
    expect(subject.toLowerCase()).not.toMatch(/seamless|frictionless|elevate|amplify/);
    expect(text).toMatch(/10 minutes/);
  });

  it("uses the rematched house shell; OTP stays near-black", () => {
    const { subject, html } = buildOtpEmail("012345");
    expect(html).toContain("24Frame");
    expect(EMAIL_ACCENT).toBe(SPORTY_BLUE);
    expect(html).toContain(EMAIL_LOGO_URL);
    expect(html).toContain(EMAIL_SITE_URL);
    expect(html).toContain(EMAIL_SITE_LABEL);
    expect(html).toContain(`color:${SPORTY_BLUE}`);
    expect(html).toContain(emailCopyright());
    expect(html).toContain(EMAIL_ADDRESS);
    expect(html).not.toMatch(/background:\s*#1769FF/i);
    expect(html).not.toMatch(/border-radius:\s*999px/);
    assertOtpNotLinkified(html, "012345");
    expect(subject).not.toMatch(/Global Content|\bGC\b|globalcontent/i);
    expect(productResidue(html)).not.toMatch(/\bGC\b|globalcontent/i);
  });
});

describe("buildNotificationEmail", () => {
  it("puts Sporty Blue on the CTA link and names 24Frame in the product chrome", () => {
    const { text, html } = buildNotificationEmail({
      subject: '"North Wind" was returned for revision',
      body: "North Wind was returned for revision.",
      ctaLabel: "Review and resubmit",
      ctaUrl: "https://app.example/titles/1",
    });
    expect(text).toContain("24Frame");
    expect(text).not.toMatch(/Global Content|\bGC\b|globalcontent/i);
    expect(html).toContain("24Frame");
    expect(html).toContain(SPORTY_BLUE);
    expect(html).toContain('href="https://app.example/titles/1"');
    expect(html).toContain("Review and resubmit");
    expect(html).toContain(`style="color:${SPORTY_BLUE};text-decoration:none"`);
    expect(html).toContain(EMAIL_LOGO_URL);
    expect(html).toContain(EMAIL_SITE_LABEL);
    expect(html).toContain(emailCopyright());
    expect(html).not.toMatch(/background:\s*#1769FF/i);
    expect(html).not.toMatch(/border-radius:\s*999px/);
    expect(productResidue(html)).not.toMatch(/\bGC\b|globalcontent/i);
    expect(html).toContain("North Wind was returned for revision.");
  });
});

describe("buildMagicLinkEmail", () => {
  const signInUrl =
    "https://app.24frame.co/auth/callback?token_hash=test-token&type=email";

  it("is link-only house mail: filled Sign in button, no OTP code", () => {
    const { subject, text, html } = buildMagicLinkEmail(signInUrl);
    expect(subject).toBe("Your 24Frame sign-in link");
    expect(text).toContain(signInUrl);
    expect(text).not.toMatch(/enter this code/i);
    expect(html).toContain("Sign in");
    expect(html).toContain(`href="${signInUrl.replaceAll("&", "&amp;")}"`);
    expect(html).toContain(EMAIL_LOGO_URL);
    expect(html).toContain(EMAIL_SITE_LABEL);
    expect(html).toContain(emailCopyright());
    expect(html).toContain(EMAIL_ADDRESS);
    expect(html).not.toContain("{{ .Token }}");
    expect(html).not.toMatch(/enter this code/i);
    expect(html).not.toMatch(/letter-spacing:2px/);
    assertSignInButton(html);
    assertCoinbaseScale(html);
    assertFormatDetectionWellFormed(html);
    expect(subject).not.toMatch(/Global Content|\bGC\b|globalcontent/i);
    expect(productResidue(html)).not.toMatch(/\bGC\b|globalcontent/i);
    expect(html.toLowerCase()).not.toMatch(/seamless|frictionless|elevate|amplify/);
  });
});

describe("buildSignInWithCodeEmail", () => {
  const signInUrl =
    "https://app.24frame.co/auth/callback?token_hash=test-token&type=email";

  it("uses the same subject and house shell with an enterable OTP", () => {
    const { subject, text, html } = buildSignInWithCodeEmail(signInUrl, "847291");
    expect(subject).toBe("Your 24Frame sign-in link");
    expect(text).toContain(signInUrl);
    expect(text).toContain("Or enter this code: 847291");
    expect(html).toContain(`href="${signInUrl.replaceAll("&", "&amp;")}"`);
    expect(html).toContain("Or enter this code:");
    expect(html).toContain("847291");
    expect(html).not.toContain("{{ .Token }}");
    assertSignInButton(html);
    assertCoinbaseScale(html);
    assertOtpNotLinkified(html, "847291");
    expect(withoutAnchors(html)).toContain(`background:${SPORTY_BLUE}`);
    expect(subject).not.toMatch(/Global Content|\bGC\b|globalcontent/i);
    expect(productResidue(html)).not.toMatch(/\bGC\b|globalcontent/i);
  });
});

describe("Auth magic-link template", () => {
  it("is the house Auth mail HTML with a filled Sign in button, not a text-link-only CTA", () => {
    const html = readFileSync(AUTH_TEMPLATE, "utf8");
    expect(AUTH_CONFIG).toContain("[auth.email.template.magic_link]");
    expect(AUTH_CONFIG).toContain('subject = "Your 24Frame sign-in link"');
    expect(AUTH_CONFIG).toContain('content_path = "./supabase/templates/magic_link.html"');
    expect(html).toContain("24Frame");
    expect(html).toContain("Sign in");
    expect(html).not.toContain("Sign in to 24Frame</a>");
    expect(html).toContain("{{ .ConfirmationURL }}");
    expect(html).toContain("{{ .Token }}");
    expect(html).toContain("Or enter this code:");
    expect(html).toContain('font-size:24px;font-weight:600;letter-spacing:2px');
    assertFormatDetectionWellFormed(html);
    expect(html).toContain("x-apple-disable-message-reformatting");
    expect(html).toContain("a[x-apple-data-detectors]");
    expect(html).toContain('x-apple-data-detectors="false"');
    expect(html).toContain("&#8203;{{ .Token }}&#8203;");
    expect(html).toContain('class="otp"');
    const tokenIdx = html.indexOf("{{ .Token }}");
    const otpRegion = html.slice(Math.max(0, tokenIdx - 400), tokenIdx + 40);
    expect(otpRegion).toContain("color:#14171A");
    expect(otpRegion).toContain("text-decoration:none");
    expect(otpRegion).not.toMatch(/color:\s*#1769FF/i);
    expect(otpRegion).not.toMatch(/text-decoration:\s*underline/);
    expect(html).toContain(SPORTY_BLUE);
    expect(html).toContain(`background:${SPORTY_BLUE}`);
    expect(html).toContain(`bgcolor="${SPORTY_BLUE}"`);
    expect(html).toContain(">Sign in</a>");
    expect(html).toContain(EMAIL_LOGO_URL);
    expect(html).toContain('alt="24Frame"');
    expect(html).not.toMatch(/<img[^>]*#1769FF/i);
    expect(html).not.toContain("Built for the creator class.");
    expect(html).not.toContain("EMAIL_SLOGAN");
    expect(html).not.toContain("Radically different film distribution.");
    expect(html).toContain("https://24frame.co");
    expect(html).toContain("24frame.co");
    expect(html).toContain(EMAIL_LEGAL_URL);
    expect(html).toContain(emailCopyrightPlaceholder());
    expect(html).not.toMatch(/© \d{4}/);
    expect(applyEmailCopyright(html)).toContain(emailCopyright());
    expect(html).not.toContain("© 2026 Global Content Holdings LLC. All rights reserved.");
    expect(html).toContain("3839 McKinney Ave, Suite 155 #2276, Dallas, TX 75204");
    expect(html).toContain("#FAFAFB");
    expect(html).toContain("max-width:600px");
    expect(html).toContain("border-radius:14px");
    expect(html).toContain("#E6E8EB");
    expect(html).toContain("fonts.googleapis.com/css2?family=Geist");
    expect(html).toContain("font-size:28px");
    expect(html).toContain("font-size:17px");
    expect(html).toContain("width:88px;height:88px");
    expect(html).not.toMatch(/border-radius:\s*999px/);
    expect(productResidue(html)).not.toMatch(/\bGC\b|globalcontent/i);
    expect(html.toLowerCase()).not.toMatch(/seamless|frictionless|elevate|amplify/);
  });
});

describe("account invite mail", () => {
  const acceptUrl = "https://app.24frame.co/invite/accept?token=test-token";

  it("sends a team accept link that names the org and role", () => {
    const orgName = "Global Content Holdings LLC";
    const roleLabel = "Account owner";
    const { subject, text, html } = buildTeamInviteEmail(acceptUrl, orgName, roleLabel);
    expect(subject).toBe("Join Global Content Holdings LLC on 24Frame");
    expect(subject).not.toContain("Join a team on");
    expect(text).toBe(
      "You have been invited to join Global Content Holdings LLC on 24Frame as Account owner.\n\n" +
        `Accept the invite: ${acceptUrl}\n`,
    );
    expect(html).toContain(">Join Global Content Holdings LLC</p>");
    expect(html).toContain(
      "You have been invited to join Global Content Holdings LLC on 24Frame as Account owner.",
    );
    expect(html).not.toContain("Join a team");
    expect(html).not.toContain("join a team");
    expect(html).not.toContain("Built for the creator class.");
    expect(html).toContain(">Accept invite</a>");
    expect(html).toContain(`href="${acceptUrl}"`);
    expect(text.toLowerCase()).not.toMatch(/invite code|promo code|referral code/);
    expect(html.toLowerCase()).not.toMatch(/seamless|frictionless|elevate|amplify/);
    expect(productResidue(html)).not.toMatch(/\bGC\b|globalcontent/i);
  });

  it("escapes org name and role in team invite HTML", () => {
    const { subject, text, html } = buildTeamInviteEmail(
      acceptUrl,
      `Acme <script>alert(1)</script>`,
      `Viewer "lead"`,
    );
    expect(subject).toBe(`Join Acme <script>alert(1)</script> on 24Frame`);
    expect(text).toContain(`join Acme <script>alert(1)</script> on 24Frame as Viewer "lead"`);
    expect(html).toContain("Join Acme &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("as Viewer &quot;lead&quot;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("fails closed when the org name or role is missing", () => {
    expect(() => buildTeamInviteEmail(acceptUrl, "  ", "Viewer")).toThrow(
      /organization name/,
    );
    expect(() => buildTeamInviteEmail(acceptUrl, "Acme", "   ")).toThrow(/role label/);
  });

  it("sends a house grant accept link", () => {
    const { subject, text, html } = buildHouseGrantEmail(acceptUrl);
    expect(subject).toBe("Your 24Frame account");
    expect(text).toContain(acceptUrl);
    expect(html).toContain(">Accept invite</a>");
    expect(html.toLowerCase()).not.toMatch(/invite code|promo code/);
    expect(productResidue(html)).not.toMatch(/\bGC\b|globalcontent/i);
  });
});
