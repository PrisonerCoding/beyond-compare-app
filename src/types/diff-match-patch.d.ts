declare module 'diff-match-patch' {
  class diff_match_patch {
    diff_main(text1: string, text2: string): Array<[number, string]>
    diff_cleanupSemantic(diffs: Array<[number, string]>): void
    diff_prettyHtml(diffs: Array<[number, string]>): string
    diff_text1(diffs: Array<[number, string]>): string
    diff_text2(diffs: Array<[number, string]>): string
    diff_levenshtein(diffs: Array<[number, string]>): number
    patch_make(text1: string, diffs: Array<[number, string]>): Array<object>
    patch_apply(patches: Array<object>, text1: string): [string, Array<boolean>]
  }

  export = diff_match_patch
}