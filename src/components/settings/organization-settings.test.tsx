import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ACCOUNT_INVITE } from "@/lib/account-invite";

describe("organization settings hosts Team with Mercury Users grammar", () => {
  it("renders Team on the Organization pane with Roles link and Invite a user", () => {
    const pane = readFileSync("src/components/settings/organization-settings.tsx", "utf8");
    const settings = readFileSync("src/lib/settings.ts", "utf8");
    const teamForm = readFileSync("src/components/settings/team-invite-form.tsx", "utf8");
    expect(pane).toContain("data-settings-section=\"team\"");
    expect(pane).toContain("data-settings-section=\"entities\"");
    expect(pane).toContain("TeamInviteForm");
    expect(pane).toContain("LegalEntitiesSection");
    expect(pane).toContain("signedAvatarUrls");
    expect(pane).toContain("SETTINGS_CONTENT_MEASURE_CLASS");
    expect(pane).not.toContain("<Card>");
    expect(pane).not.toContain("CardBody");
    expect(pane).not.toContain("card-surface");
    expect(pane).toContain("currentUserId");
    expect(settings).toContain("Team invite");
    expect(settings).not.toContain("organizationHref: \"/settings/team\"");
    expect(teamForm).toContain("data-roles-link");
    expect(teamForm).toContain("youSuffix");
    expect(teamForm).not.toContain("data-team-list-head");
    expect(ACCOUNT_INVITE.youSuffix).toBe("(you)");
    expect(ACCOUNT_INVITE.rolesLink).toBe("Roles");
  });
});
