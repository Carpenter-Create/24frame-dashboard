import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  FORM_CONTROL_BARE_CLASS,
  FORM_CONTROL_BOX_CLASS,
  FORM_CONTROL_FOCUS_CLASS,
  FORM_CONTROL_TEXT_CLASS,
  HOUSE_VOICE_FOCUS_HOST_CLASS,
  HOUSE_VOICE_MIC_CLASS,
  formControlClass,
} from "./form-control";

const globals = readFileSync("src/app/globals.css", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");
const inputSrc = readFileSync("src/components/ui/input.tsx", "utf8");
const textareaSrc = readFileSync("src/components/ui/textarea.tsx", "utf8");
const accountForm = readFileSync("src/app/(app)/account/account-profile-form.tsx", "utf8");
const companyForm = readFileSync("src/app/(app)/account/company-profile-form.tsx", "utf8");
const companyEditor = readFileSync("src/components/settings/company-name-editor.tsx", "utf8");
const socialEdit = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");
const socialEditName = readFileSync("src/components/social/social-profile-name.tsx", "utf8");
const socialEditHandle = readFileSync("src/components/social/social-profile-handle-edit.tsx", "utf8");
const socialBio = readFileSync("src/components/social/social-profile-bio.tsx", "utf8");
const socialForms = [
  "src/components/social/social-create-compose.tsx",
  "src/components/social/social-dm-compose.tsx",
  "src/components/social/social-bio-form.tsx",
  "src/components/social/social-group-forms.tsx",
  "src/components/social/social-profile-create-form.tsx",
  "src/components/social/social-profile-photo-form.tsx",
  "src/components/social/social-story-reply.tsx",
  "src/components/social/social-message-button.tsx",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const socialExplore = readFileSync("src/app/(app)/social/explore/page.tsx", "utf8");
const houseLeadSearch = readFileSync("src/components/chrome/house-lead-search.tsx", "utf8");
const housePageSearch = readFileSync("src/components/chrome/house-page-search.tsx", "utf8");

function walkTsx(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walkTsx(path, acc);
    else if (name.endsWith(".tsx") && !name.includes(".test.")) acc.push(path);
  }
  return acc;
}

const SKIP_TYPES = /type=["'](hidden|file|checkbox|radio|submit|button|reset|image|range|color)["']/;

function rawTextControls(src: string): string[] {
  const hits: string[] = [];
  const startRe = /<(input|textarea)\b/g;
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(src))) {
    let i = match.index + match[0].length;
    let depth = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth = Math.max(0, depth - 1);
      else if (ch === ">" && depth === 0) {
        const tag = src.slice(match.index, i + 1);
        if (match[1] === "input" && SKIP_TYPES.test(tag)) break;
        hits.push(tag.replace(/\s+/g, " "));
        break;
      }
      i += 1;
    }
  }
  return hits;
}

describe("form-control SoT", () => {
  it("owns the 16px iOS no-zoom floor on t-control, not house t-body", () => {
    expect(FORM_CONTROL_TEXT_CLASS).toBe("t-control");
    expect(globals).toMatch(/\.t-control\s*\{[\s\S]*?font-size:\s*16px/);
    expect(globals).toMatch(/\.t-body\s*\{[\s\S]*?font-size:\s*var\(--text-base\)/);
    expect(globals).toMatch(/\.t-body-sm\s*\{[\s\S]*?font-size:\s*var\(--text-sm\)/);
    expect(formControlClass()).toContain("t-control");
    expect(formControlClass()).toContain("border-hairline");
    expect(formControlClass("bare")).toContain("bg-transparent");
    expect(FORM_CONTROL_BOX_CLASS).not.toContain("t-body");
    expect(FORM_CONTROL_BARE_CLASS).not.toContain("t-body");
    expect(FORM_CONTROL_BARE_CLASS).toContain("caret-ink");
    expect(FORM_CONTROL_BARE_CLASS).toContain("accent-ink");
    expect(FORM_CONTROL_FOCUS_CLASS).toContain("focus:outline-none");
    expect(FORM_CONTROL_FOCUS_CLASS).toContain("focus:ring-0");
    expect(FORM_CONTROL_FOCUS_CLASS).toContain("focus-visible:outline-none");
    expect(FORM_CONTROL_FOCUS_CLASS).toContain("focus-visible:ring-0");
    expect(FORM_CONTROL_FOCUS_CLASS).not.toContain("accent");
    expect(FORM_CONTROL_BOX_CLASS).toContain(FORM_CONTROL_FOCUS_CLASS);
    expect(FORM_CONTROL_BARE_CLASS).toContain(FORM_CONTROL_FOCUS_CLASS);
    expect(FORM_CONTROL_BARE_CLASS).not.toContain("caret-accent");
    expect(FORM_CONTROL_BARE_CLASS).not.toContain("focus:border-accent");
    expect(FORM_CONTROL_BARE_CLASS).not.toContain("focus:ring-accent");
    expect(FORM_CONTROL_BOX_CLASS).toContain("focus:border-ink-3");
    expect(FORM_CONTROL_BOX_CLASS).not.toContain("focus:border-accent");
    expect(FORM_CONTROL_BOX_CLASS).not.toContain("focus:ring-accent");
    expect(globals).toContain(":focus-visible:not(input):not(textarea):not(select)");
    expect(globals).not.toMatch(/(?:^|\n):focus-visible\s*\{/);
    expect(HOUSE_VOICE_FOCUS_HOST_CLASS).toContain(FORM_CONTROL_FOCUS_CLASS);
    expect(HOUSE_VOICE_FOCUS_HOST_CLASS).toContain("focus-within:ring-0");
    expect(HOUSE_VOICE_FOCUS_HOST_CLASS).not.toContain("focus-within:ring-2");
    expect(HOUSE_VOICE_MIC_CLASS).toContain("rounded-full");
    expect(HOUSE_VOICE_MIC_CLASS).toContain(FORM_CONTROL_FOCUS_CLASS);
    expect(houseLeadSearch).toContain("HOUSE_VOICE_FOCUS_HOST_CLASS");
    expect(housePageSearch).toContain("HOUSE_VOICE_FOCUS_HOST_CLASS");
    expect(socialForms).toContain("HOUSE_VOICE_FIELD_HOST_CLASS");
    expect(houseLeadSearch).not.toContain("focus:ring-accent");
    expect(housePageSearch).not.toContain("focus:ring-2");
    expect(socialForms).not.toContain("focus:ring-accent");
  });

  it("puts Input and Textarea on the shared class so future fields inherit", () => {
    expect(inputSrc).toContain("formControlClass");
    expect(textareaSrc).toContain("formControlClass");
    expect(inputSrc).not.toContain("t-body");
    expect(textareaSrc).not.toContain("t-body");
    expect(inputSrc).not.toContain("text-[16px]");
    expect(textareaSrc).not.toContain("text-[16px]");
  });

  it("does not use a maximum-scale viewport hack", () => {
    expect(layout).not.toContain("maximum-scale");
    expect(inputSrc).not.toContain("maximum-scale");
    expect(textareaSrc).not.toContain("maximum-scale");
    expect(globals).not.toContain("maximum-scale");
  });

  it("migrates Social Edit/Bio, Settings/account, composers, and search onto the primitive", () => {
    expect(socialEditName).toContain('variant="bare"');
    expect(socialEditName).toContain('id="social-edit-first-name"');
    expect(socialEditName).toContain('id="social-edit-middle-name"');
    expect(socialEditName).toContain('id="social-edit-last-name"');
    expect(socialEditName).not.toContain('id="social-edit-name"');
    expect(socialEditHandle).toContain('id="social-edit-handle"');
    expect(socialEditHandle).toContain("SocialHandleField");
    expect(socialEdit).not.toContain('id="social-edit-first-name"');
    expect(socialEdit).not.toContain('id="social-edit-handle"');
    expect(socialEdit).toContain("SocialProfileRolesEditor");
    expect(socialEdit).toContain("SocialProfileTopicsEditor");
    expect(socialEdit).toContain("SocialProfileImdbEditor");
    expect(socialEdit).toContain("SocialProfileNameEditor");
    expect(socialEdit).toContain("SocialProfileHandleEditor");
    expect(socialEditName).toContain("<Input");
    expect(socialEdit).toContain('type="file"');
    expect(socialBio).toContain("<Textarea");
    expect(socialBio).toContain('variant="bare"');
    expect(socialBio).toContain("data-social-bio-textarea");
    expect(socialBio).not.toContain("<textarea");
    expect(accountForm).toContain("<Input");
    expect(accountForm).not.toContain("ACCOUNT_FIELD_CLASS");
    expect(accountForm).not.toContain("text-[16px]");
    expect(companyForm).toContain("CompanyNameEditor");
    expect(companyForm).not.toContain("ACCOUNT_FIELD_CLASS");
    expect(companyEditor).toContain("<Input");
    expect(companyEditor).not.toContain("ACCOUNT_FIELD_CLASS");
    expect(socialForms).toContain("<Textarea");
    expect(socialForms).toContain('id="social-post-body"');
    expect(socialForms).toContain('id="social-create-body"');
    expect(socialForms).toContain('id="social-dm-body"');
    expect(socialForms).not.toContain("<textarea");
    expect(socialExplore).toContain("<Input");
    expect(socialExplore).toContain('id="social-explore-q"');
    expect(readFileSync("src/app/(app)/social/search/page.tsx", "utf8")).toContain("<Input");
    expect(readFileSync("src/app/(app)/social/search/page.tsx", "utf8")).toContain('id="social-search-q"');
    expect(houseLeadSearch).toContain("<Input");
    expect(houseLeadSearch).toContain("social-header-q");
    expect(houseLeadSearch).toContain("id={inputId}");
    expect(housePageSearch).toContain("<Input");
    expect(housePageSearch).toContain('variant="bare"');
    expect(housePageSearch).not.toContain("t-body-sm");
    expect(readFileSync("src/components/messages/ask-frame-ai-landing.tsx", "utf8")).toContain(
      'variant="bare"',
    );
    expect(readFileSync("src/components/messages/ask-frame-ai-thread.tsx", "utf8")).toContain(
      "<Input",
    );
  });

  it("leaves no raw text inputs outside Input/Textarea", () => {
    const files = [
      ...walkTsx("src/components"),
      ...walkTsx("src/app"),
    ];
    const leftovers: string[] = [];
    for (const file of files) {
      if (file.endsWith("src/components/ui/input.tsx")) continue;
      if (file.endsWith("src/components/ui/textarea.tsx")) continue;
      const src = readFileSync(file, "utf8");
      for (const hit of rawTextControls(src)) {
        leftovers.push(`${file}: ${hit}`);
      }
    }
    expect(leftovers).toEqual([]);
  });
});
