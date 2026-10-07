import { describe, expect, it } from "vitest";

import { stripSourceComments } from "./strip-source-comments";

describe("stripSourceComments", () => {
  it("drops block, JSX and whole-line comments, and keeps the code", () => {
    const src = [
      "/*",
      "export const A = `${B} t-body`;",
      "*/",
      'export const A = "literal";',
      "  {/*",
      "  <span className={A}>{x}</span>",
      "  */}",
      "  <span className={A}>{y}</span>",
      "  // <li className={C}>",
      "  <li className={C}>",
    ].join("\n");
    const out = stripSourceComments(src);
    expect(out).not.toMatch(/^export const A = `\$\{B\} t-body`;$/m);
    expect(out).not.toMatch(/^\s*<span className=\{A\}>\{x\}<\/span>$/m);
    expect(out).not.toContain("// <li");
    expect(out).toMatch(/^export const A = "literal";$/m);
    expect(out).toMatch(/^\s*<span className=\{A\}>\{y\}<\/span>$/m);
    expect(out).toMatch(/^\s*<li className=\{C\}>$/m);
  });
});
