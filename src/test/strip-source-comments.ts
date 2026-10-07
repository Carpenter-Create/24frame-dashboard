// Test helper: drop comments from source text before an anchored source
// check, so a commented-out copy of the checked line cannot satisfy it.
// Removes block comments (JSX {/* … */} included, across lines) and whole-line
// // comments.
export function stripSourceComments(src: string): string {
  return src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
}
