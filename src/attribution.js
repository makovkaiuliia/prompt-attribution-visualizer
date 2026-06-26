// Pure helpers mapping analyzer output onto the real prompt/response text.
// Framework-free on purpose: this matching logic is the core of the tool and is easy
// to reason about / unit-test in isolation.

// Tailwind bg classes ordered weak -> strong influence.
const INFLUENCE_COLORS = ['bg-yellow-100', 'bg-yellow-200', 'bg-yellow-300', 'bg-orange-300', 'bg-orange-400']

// Map a 0..100 influence to a color class.
// Clamped so influence=100 can't overflow the array — this was the original off-by-one
// bug: floor(100 / 100 * 5) === 5 -> bgColors[5] === undefined -> broken className.
export function colorForInfluence(influence) {
  const raw = Math.floor((Number(influence) / 100) * INFLUENCE_COLORS.length)
  const i = Math.max(0, Math.min(INFLUENCE_COLORS.length - 1, raw))
  return INFLUENCE_COLORS[i]
}

// Overlap-safe highlighting of the prompt for a set of spans.
// Builds a per-character owner map (highest influence wins on overlap), then groups
// consecutive characters with the same owner into runs. Fixes the original renderer,
// which produced duplicated / negative slices when matches overlapped.
//
// Returns ordered runs: { text, span | null }.
export function buildPromptHighlights(prompt, spans) {
  const owner = new Array(prompt.length).fill(-1) // index into spans, or -1
  const lower = prompt.toLowerCase()

  spans.forEach((span, idx) => {
    const needle = (span?.text || '').trim()
    if (!needle) return

    const nl = needle.toLowerCase()
    let pos = lower.indexOf(nl)
    while (pos !== -1) {
      for (let i = pos; i < pos + needle.length; i++) {
        const cur = owner[i]
        if (cur === -1 || (spans[cur].influence || 0) < (span.influence || 0)) {
          owner[i] = idx
        }
      }
      pos = lower.indexOf(nl, pos + 1)
    }
  })

  const runs = []
  let i = 0
  while (i < prompt.length) {
    const cur = owner[i]
    let j = i + 1
    while (j < prompt.length && owner[j] === cur) j++
    runs.push({ text: prompt.slice(i, j), span: cur === -1 ? null : spans[cur] })
    i = j
  }
  return runs
}
