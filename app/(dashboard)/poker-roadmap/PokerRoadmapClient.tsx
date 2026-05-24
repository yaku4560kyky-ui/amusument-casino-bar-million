'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Chapter = {
  id: string
  nav: string
  title: string
  icon: string
  suit: 'gold' | 'spade' | 'heart' | 'club' | 'diamond' | 'multi'
  markdown: string
}

type LockState = Record<string, { locked?: boolean; unlockAt?: string }>
type LockApiResponse = { locks?: Array<{ pageKey?: string; isLocked?: boolean }> }
type QaItem = { question: string; answer: string; createdAt: string }
type ClickEffect = { id: number; x: number; y: number }

const adminPassword = '8944'
const lockStorageKey = 'pokerRoadmapLocks'
const qaStorageKey = 'pokerRoadmapQa'

const suitClass = {
  gold: 'text-[#e8c76a]',
  spade: 'text-[#e8e8e8]',
  heart: 'text-[#e53e3e]',
  club: 'text-[#48bb78]',
  diamond: 'text-[#4299e1]',
  multi: 'bg-gradient-to-r from-[#e8e8e8] via-[#e53e3e] to-[#48bb78] bg-clip-text text-transparent',
}

function ClickFeedbackLayer() {
  const [effects, setEffects] = useState<ClickEffect[]>([])

  useEffect(() => {
    const showFeedback = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const clickedElement = target.closest('button, a, input[type="range"]')
      if (!clickedElement) return

      const id = Date.now() + Math.random()
      setEffects((current) => [...current, { id, x: event.clientX, y: event.clientY }])
    }

    document.addEventListener('click', showFeedback, true)
    return () => document.removeEventListener('click', showFeedback, true)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {effects.map((effect) => (
        <span
          key={effect.id}
          className="absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#e8c76a] bg-[#c9a84c22] text-[10px] font-bold tracking-[0.12em] text-[#fff6d8] shadow-[0_0_28px_rgba(232,199,106,.55)] animate-[clickBurst_.7s_ease-out_forwards]"
          style={{ left: effect.x, top: effect.y }}
          onAnimationEnd={() => setEffects((current) => current.filter((item) => item.id !== effect.id))}
        >
          <span className="rounded-full bg-[#0a0e0add] px-2 py-1">CLICK</span>
        </span>
      ))}
    </div>
  )
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return map[char]
  })
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[\[回答:\s*([\s\S]+?)\]\]/g, (_, content) => {
      const formattedContent = content.trim().split(/\r?\n/).map(inlineMarkdown).join('<br>')
      return `<details class="answer-box"><summary>回答を表示</summary><div class="answer-content">${formattedContent}</div></details>`
    })
    .replace(/\[中級者以上のアドバイス\]/g, '<span class="pro-advice-label">💡 中級者以上のアドバイス</span>')
    .replace(/\[中級者以上からの注意\]/g, '<span class="pro-caution-label">⚠️ 中級者以上からの注意</span>')
}

function answerDetails(content: string) {
  const formattedContent = content.trim().split(/\r?\n/).map(inlineMarkdown).join('<br>')
  return `<details class="answer-box"><summary>回答を表示</summary><div class="answer-content">${formattedContent}</div></details>`
}

function splitTableRow(row: string) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => inlineMarkdown(cell.trim()))
}

function markdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  const html: string[] = []
  let inCode = false
  let codeLines: string[] = []
  let inList = false
  let inSummary = false

  const closeList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  const closeSummary = () => {
    if (inSummary) {
      html.push('</div>')
      inSummary = false
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        codeLines = []
        inCode = false
      } else {
        closeList()
        inCode = true
      }
      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    if (!line.trim()) {
      closeList()
      continue
    }

    if (line.trim().startsWith('[[回答:')) {
      closeList()
      const answerLines = [line.trim().replace(/^\[\[回答:\s*/, '')]

      while (!answerLines[answerLines.length - 1].includes(']]') && index + 1 < lines.length) {
        index += 1
        answerLines.push(lines[index])
      }

      const answer = answerLines.join('\n').replace(/\]\]\s*$/, '')
      html.push(answerDetails(answer))
      continue
    }

    if (/^\|.*\|\s*$/.test(line) && index + 1 < lines.length && /^\|?\s*:?-{2,}:?/.test(lines[index + 1])) {
      closeList()
      const header = splitTableRow(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && /^\|.*\|\s*$/.test(lines[index])) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      index -= 1

      html.push('<div class="overflow-x-auto my-6 rounded-lg border border-[#c9a84c40]"><table class="w-full min-w-[34rem] border-collapse bg-[#0f170f] text-sm">')
      html.push('<thead><tr>')
      header.forEach((cell) => html.push(`<th class="border border-[#c9a84c40] bg-[#c9a84c22] px-3 py-2 text-left font-semibold text-[#e8c76a]">${cell}</th>`))
      html.push('</tr></thead><tbody>')
      rows.forEach((row) => {
        html.push('<tr>')
        row.forEach((cell) => html.push(`<td class="border border-[#c9a84c30] px-3 py-2 align-top text-[#f0e8d0]">${cell}</td>`))
        html.push('</tr>')
      })
      html.push('</tbody></table></div>')
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      closeList()
      const level = heading[1].length
      const text = inlineMarkdown(heading[2])
      if (level === 1) {
        closeSummary()
        html.push(`<h1>${text}</h1>`)
      } else if (level === 2) {
        closeSummary()
        if (heading[2].trim() === 'この章のまとめ') {
          html.push('<div class="summary-card">')
          inSummary = true
        }
        html.push(`<h2>${text}</h2>`)
      } else {
        html.push(`<h3>${text}</h3>`)
      }
      continue
    }

    if (/^---+$/.test(line)) {
      closeList()
      html.push('<hr>')
      continue
    }

    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      closeList()
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`)
      continue
    }

    const listItem = /^\s*-\s+(.+)$/.exec(line)
    if (listItem) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${inlineMarkdown(listItem[1])}</li>`)
      continue
    }

    closeList()
    
    // 計算式・公式の強調（太字 ** で囲まれている場合も考慮）
    const trimmedLine = line.trim().replace(/^\*\*(.+)\*\*$/, '$1')
    if (trimmedLine.startsWith('計算式:') || trimmedLine.startsWith('公式:')) {
      html.push(`<div class="formula-box">${inlineMarkdown(line)}</div>`)
    } else if (trimmedLine.startsWith('結論:')) {
      html.push(`<div class="conclusion-box">${inlineMarkdown(line)}</div>`)
    } else {
      html.push(`<p>${inlineMarkdown(line)}</p>`)
    }
  }

  closeList()
  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }
  closeSummary()

  return html.join('\n')
}

function useLocalStorageState<T>(key: string, initialValue: T) {
  const initialValueRef = useRef(initialValue)
  const [value, setValue] = useState<T>(initialValue)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    window.queueMicrotask(() => {
      if (cancelled) return

      try {
        const raw = window.localStorage.getItem(key)
        if (raw) {
          setValue(JSON.parse(raw) as T)
        }
      } catch {
        setValue(initialValueRef.current)
      } finally {
        setLoaded(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [key])

  useEffect(() => {
    if (!loaded) return

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage may be blocked or full; keep the in-memory state usable.
    }
  }, [key, loaded, value])

  return [value, setValue] as const
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatUnlockTime(value: string) {
  const date = new Date(value)
  return `${date.getMonth() + 1}月${date.getDate()}日${date.getHours()}時${String(date.getMinutes()).padStart(2, '0')}分から閲覧可能`
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatReadableUnlockTime(value: string) {
  const date = new Date(value)
  const minutes = date.getMinutes()
  const minuteLabel = minutes === 0 ? '' : `${String(minutes).padStart(2, '0')}分`
  return `[${date.getMonth() + 1}月${date.getDate()}日${date.getHours()}時${minuteLabel}から閲覧可能]`
}

function formatUnlockLabel(value: string) {
  const date = new Date(value)
  const minutes = date.getMinutes()
  const minuteLabel = minutes === 0 ? '' : `${String(minutes).padStart(2, '0')}\u5206`
  return `[${date.getMonth() + 1}\u6708${date.getDate()}\u65e5${date.getHours()}\u6642${minuteLabel}\u304b\u3089\u95b2\u89a7\u53ef\u80fd]`
}

function StatsRadar() {
  const stats = [
    ['LP', 45, 8],
    ['TP', 14, 6],
    ['LAG', 34, 28],
    ['TAG', 23, 19],
    ['Maniac', 62, 44],
  ]

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {stats.map(([label, vpip, pfr]) => (
        <div key={label} className="rounded-lg border border-[#c9a84c30] bg-black/20 p-3">
          <div className="mb-2 font-mono text-sm text-[#e8c76a]">{label}</div>
          <div className="space-y-2 text-xs">
            <Meter label="VPIP" value={Number(vpip)} />
            <Meter label="PFR" value={Number(pfr)} color="bg-[#48bb78]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Meter({ label, value, color = 'bg-[#c9a84c]' }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[#a09070]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#0a0e0a]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function OutsChart() {
  const items = [
    ['4', 16, 8],
    ['6', 24, 12],
    ['8', 32, 16],
    ['9', 36, 18],
    ['15', 60, 30],
  ]

  return (
    <div className="space-y-3">
      {items.map(([outs, flop, turn]) => (
        <div key={outs} className="grid grid-cols-[3rem_1fr] items-center gap-3">
          <div className="font-mono text-sm text-[#e8c76a]">{outs} outs</div>
          <div className="space-y-1">
            <Meter label="Flop" value={Number(flop)} />
            <Meter label="Turn" value={Number(turn)} color="bg-[#4299e1]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function GtoBalance() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        ['GTOベース', '55%', 'border-[#c9a84c]'],
        ['Exploit調整', '30%', 'border-[#48bb78]'],
        ['観察・更新', '15%', 'border-[#4299e1]'],
      ].map(([label, value, border]) => (
        <div key={label} className={`rounded-lg border-l-4 ${border} bg-black/20 p-4`}>
          <div className="font-mono text-3xl text-[#e8c76a]">{value}</div>
          <div className="text-sm text-[#a09070]">{label}</div>
        </div>
      ))}
    </div>
  )
}

function BluffChart() {
  return (
    <div className="grid grid-cols-6 items-end gap-3 pt-4">
      {[
        ['25%', 20],
        ['33%', 25],
        ['50%', 33],
        ['75%', 43],
        ['100%', 50],
        ['200%', 67],
      ].map(([label, value]) => (
        <div key={label} className="flex h-56 flex-col justify-end gap-2 text-center">
          <div className="font-mono text-xs text-[#e8c76a]">{value}%</div>
          <div className="mx-auto w-full rounded-t bg-gradient-to-t from-[#a07830] to-[#e8c76a]" style={{ height: `${Number(value) * 2}px` }} />
          <div className="text-xs text-[#a09070]">{label}</div>
        </div>
      ))}
    </div>
  )
}

function EvCalculator() {
  const [pot, setPot] = useState(100)
  const [call, setCall] = useState(50)
  const [equity, setEquity] = useState(40)
  const ev = (equity / 100) * (pot + call) - (1 - equity / 100) * call

  return (
    <div className="space-y-4">
      <Slider label="ポット" value={pot} min={10} max={500} suffix="BB" onChange={setPot} />
      <Slider label="コール額" value={call} min={1} max={300} suffix="BB" onChange={setCall} />
      <Slider label="エクイティ" value={equity} min={0} max={100} suffix="%" onChange={setEquity} />
      <div className="flex items-center justify-between rounded-lg border border-[#c9a84c40] bg-black/25 p-4">
        <span className="text-[#a09070]">EV(コール)</span>
        <strong className={`font-mono text-2xl ${ev >= 0 ? 'text-[#48bb78]' : 'text-[#e53e3e]'}`}>
          {ev >= 0 ? '+' : ''}
          {ev.toFixed(2)}BB
        </strong>
      </div>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#e8c76a]">
      <span>
        {label}: <output className="font-mono">{value}</output>
        {suffix}
      </span>
      <input
        className="accent-[#c9a84c]"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function ChartPanel({ chapterId }: { chapterId: string }) {
  if (chapterId === 'ch1') return <Viz title="プレイヤータイプ別 VPIP / PFR"><StatsRadar /></Viz>
  if (chapterId === 'ch2') return <Viz title="アウツ数別エクイティ"><OutsChart /></Viz>
  if (chapterId === 'ch5') return <Viz title="GTO / Exploit バランス"><GtoBalance /></Viz>
  if (chapterId === 'ch7') return <Viz title="Interactive EV Calculator"><EvCalculator /></Viz>
  if (chapterId === 'ch8') return <Viz title="ベットサイズ別 ブラフ比率"><BluffChart /></Viz>
  return null
}

function Viz({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-lg border border-[#c9a84c40] bg-[#0a0e0a99] p-4">
      <h2 className="mb-4 border-b-2 border-[#c9a84c] pb-2 font-serif text-2xl text-[#f0e8d0]">{title}</h2>
      {children}
    </section>
  )
}

function QaPanel() {
  const [items, setItems] = useLocalStorageState<QaItem[]>(qaStorageKey, [])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  return (
    <section className="mt-8 rounded-lg border border-[#c9a84c40] bg-[#0a0e0a99] p-4">
      <h2 className="mb-4 border-b-2 border-[#c9a84c] pb-2 font-serif text-2xl text-[#f0e8d0]">質問投稿フォーム</h2>
      <div className="space-y-3">
        <textarea
          className="min-h-28 w-full rounded-lg border border-[#c9a84c40] bg-[#091109] p-3 text-[#f0e8d0] outline-none focus:border-[#c9a84c]"
          placeholder="質問やハンドレビューを入力"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <textarea
          className="min-h-20 w-full rounded-lg border border-[#c9a84c40] bg-[#091109] p-3 text-[#f0e8d0] outline-none focus:border-[#c9a84c]"
          placeholder="回答メモ（任意）"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        />
        <button
          className="rounded-lg border border-[#c9a84c40] bg-[#121b12] px-4 py-2 font-semibold text-[#e8c76a] hover:bg-[#c9a84c1a]"
          onClick={() => {
            if (!question.trim()) return
            setItems([{ question: question.trim(), answer: answer.trim(), createdAt: new Date().toISOString() }, ...items])
            setQuestion('')
            setAnswer('')
          }}
        >
          保存
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <article key={`${item.createdAt}-${index}`} className="rounded-lg border border-[#c9a84c30] bg-black/20 p-3">
            <time className="text-xs text-[#a09070]">{new Date(item.createdAt).toLocaleString('ja-JP')}</time>
            <p className="mt-2 text-[#f0e8d0]"><strong>Q:</strong> {item.question}</p>
            {item.answer ? <p className="mt-1 text-[#f0e8d0]"><strong>A:</strong> {item.answer}</p> : null}
            <button
              className="mt-3 text-xs font-semibold text-[#e53e3e]"
              onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              削除
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function chapterIdToPageKey(id: string) {
  return id === 'qa' ? 'qa' : id.replace(/^ch/, '')
}

export default function PokerRoadmapClient({
  chapters,
  serverLockedKeys = new Set(),
  isAdmin = false,
}: {
  chapters: readonly Chapter[]
  serverLockedKeys?: ReadonlySet<string>
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [localAdmin, setLocalAdmin] = useState(false)
  const admin = isAdmin && localAdmin
  const setAdmin = (next: boolean) => {
    setLocalAdmin(isAdmin && next)
  }
  const [now, setNow] = useState(() => Date.now())
  const [activeServerLockedKeys, setActiveServerLockedKeys] = useState(
    () => new Set(serverLockedKeys)
  )
  const activeServerLockedKeysRef = useRef(activeServerLockedKeys)
  const [locks, setLocks] = useLocalStorageState<LockState>(lockStorageKey, {})
  const renderedChapters = useMemo(
    () => chapters.map((chapter) => ({ ...chapter, html: markdownToHtml(chapter.markdown) })),
    [chapters]
  )

  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => event.preventDefault()
    const preventCopyKeys = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['a', 'c'].includes(event.key.toLowerCase())) {
        event.preventDefault()
      }
    }

    document.addEventListener('contextmenu', preventContextMenu)
    document.addEventListener('keydown', preventCopyKeys)
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu)
      document.removeEventListener('keydown', preventCopyKeys)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function refreshServerLocks() {
      try {
        const response = await fetch('/api/poker-roadmap/locks', { cache: 'no-store' })
        if (!response.ok) return

        const payload = (await response.json()) as LockApiResponse
        if (cancelled || !Array.isArray(payload.locks)) return

        const nextLockedKeys = new Set(
          payload.locks
            .filter((lock) => lock.isLocked && typeof lock.pageKey === 'string')
            .map((lock) => lock.pageKey as string)
        )
        const unlockedKeys = [...activeServerLockedKeysRef.current].some(
          (pageKey) => !nextLockedKeys.has(pageKey)
        )

        activeServerLockedKeysRef.current = nextLockedKeys
        setActiveServerLockedKeys(nextLockedKeys)
        if (unlockedKeys) router.refresh()
      } catch {
        // Keep the server-rendered lock state if a refresh request fails.
      }
    }

    const timer = window.setInterval(refreshServerLocks, 5000)
    window.addEventListener('focus', refreshServerLocks)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshServerLocks)
    }
  }, [router])

  const lockChapter = (id: string) => setLocks({ ...locks, [id]: { locked: true } })
  const unlockChapter = (id: string) => {
    const nextLocks = { ...locks }
    delete nextLocks[id]
    setLocks(nextLocks)
  }

  return (
    <div id="poker-roadmap-page" className="min-h-screen bg-[#0a0e0a] text-[#f0e8d0]">
      <style>{`
        #poker-roadmap-page,
        #poker-roadmap-page * {
          font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, "Yu Gothic", sans-serif !important;
        }

        @keyframes clickBurst {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.35); }
          18% { opacity: 1; transform: translate(-50%, -50%) scale(.82); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.65); }
        }

        .roadmap-markdown {
          line-height: 1.8;
        }

        .formula-box {
          position: relative;
          margin: 1.4rem 0;
          padding: 1.1rem 1.2rem 1.1rem 3.1rem;
          background: linear-gradient(135deg, rgba(201, 168, 76, 0.2), rgba(7, 16, 7, 0.9));
          border: 1px solid rgba(232, 199, 106, 0.58);
          border-left: 5px solid #e8c76a;
          border-radius: 0.5rem;
          color: #fff6d8;
          font-weight: 700;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24), inset 0 0 0 1px rgba(255, 246, 216, 0.06);
        }

        .formula-box::before {
          content: "fx";
          position: absolute;
          left: 0.9rem;
          top: 50%;
          transform: translateY(-50%);
          display: grid;
          place-items: center;
          width: 1.45rem;
          height: 1.45rem;
          border-radius: 999px;
          background: #e8c76a;
          color: #081008;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .conclusion-box {
          margin: 1.1rem 0;
          padding: 0.95rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(72, 187, 120, 0.38);
          background: rgba(72, 187, 120, 0.1);
          color: #d8ffe7;
          font-weight: 700;
        }

        .answer-box {
          margin: 1.1rem 0 1.6rem;
          border-radius: 0.5rem;
          background: rgba(72, 187, 120, 0.07);
          border: 1px solid rgba(72, 187, 120, 0.32);
          overflow: hidden;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        }

        .answer-box summary {
          padding: 0.85rem 1rem;
          cursor: pointer;
          color: #7ee787;
          font-weight: 600;
          user-select: none;
          transition: background 0.2s;
        }

        .answer-box summary:hover {
          background: rgba(72, 187, 120, 0.1);
        }

        .answer-content {
          padding: 1rem;
          border-top: 1px solid rgba(72, 187, 120, 0.2);
          background: rgba(0, 0, 0, 0.26);
          color: #f0e8d0;
        }

        .pro-advice-label {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          background: rgba(66, 153, 225, 0.15);
          color: #63b3ed;
          border-radius: 0.25rem;
          font-weight: bold;
          font-size: 0.9em;
          margin-bottom: 0.5rem;
        }

        .pro-caution-label {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          background: rgba(245, 101, 101, 0.15);
          color: #feb2b2;
          border-radius: 0.25rem;
          font-weight: bold;
          font-size: 0.9em;
          margin-bottom: 0.5rem;
        }

        .roadmap-markdown blockquote {
          margin: 1.5rem 0;
        }
      `}</style>
      <ClickFeedbackLayer />
      <header className="sticky top-0 z-20 border-b border-[#c9a84c40] bg-[linear-gradient(135deg,rgba(13,21,16,.98),rgba(26,35,24,.94))] px-4 py-5 shadow-2xl shadow-black/40 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="bg-gradient-to-r from-[#e8c76a] via-[#c9a84c] to-[#fff4b8] bg-clip-text font-serif text-3xl font-bold leading-tight text-transparent md:text-5xl">
              ♠♥ Poker Mastery Roadmap ♦♣
            </h1>
            <a 
              href="https://yaku4560kyky-ui.github.io/poker-roadmap/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-[#e8c76a] opacity-70 hover:opacity-100 transition-opacity underline decoration-[#c9a84c40] underline-offset-4"
            >
              External: yaku4560kyky-ui.github.io/poker-roadmap/
            </a>
          </div>
          <button
            className="shrink-0 rounded-lg border border-[#c9a84c40] bg-[#121b12] px-3 py-2 text-sm font-semibold text-[#e8c76a] hover:bg-[#c9a84c1a]"
            onClick={() => {
              if (admin) {
                setAdmin(false)
                return
              }
              setAdmin(window.prompt('Admin password') === adminPassword)
            }}
          >
            {admin ? '🔓 Admin' : '🔒 Admin'}
          </button>
        </div>
        <button
          className="mt-4 w-full rounded-lg border border-[#c9a84c40] bg-[#121b12] px-3 py-2 text-sm font-semibold text-[#e8c76a] md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          章一覧を{mobileOpen ? '閉じる' : '開く'}
        </button>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[16rem_minmax(0,1fr)] md:p-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className={`${mobileOpen ? 'block' : 'hidden'} h-fit rounded-lg border border-[#c9a84c30] bg-[#0d1510] p-3 shadow-2xl shadow-black/30 md:sticky md:top-28 md:block`}>
          <nav className="space-y-2">
            {chapters.map((chapter) => {
              const lock = locks[chapter.id]
              const lockedByTime = lock?.unlockAt ? now < new Date(lock.unlockAt).getTime() : false
              const pageKey = chapterIdToPageKey(chapter.id)
              const serverLocked = activeServerLockedKeys.has(pageKey)
              const isLocked = serverLocked || (isAdmin && Boolean(lock?.locked || lockedByTime))

              return (
                <a
                  key={chapter.id}
                  href={`/poker-roadmap?page=${pageKey}#${chapter.id}`}
                  className="flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-[#a09070] hover:border-[#c9a84c] hover:bg-[#c9a84c12] hover:text-[#e8c76a]"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className={`min-w-8 text-center font-serif text-xl ${suitClass[chapter.suit]}`}>{chapter.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{chapter.nav}</span>
                    {lockedByTime && lock?.unlockAt ? (
                      <span className="mt-1 block text-xs leading-snug text-[#e8c76a]">{formatUnlockLabel(lock.unlockAt)}</span>
                    ) : null}
                  </span>
                  {isLocked ? <span className="mt-2 size-2 shrink-0 rounded-full bg-[#e53e3e]" /> : null}
                </a>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-7">
          {renderedChapters.map((chapter) => {
            const lock = locks[chapter.id]
            const lockedByTime = lock?.unlockAt ? now < new Date(lock.unlockAt).getTime() : false
            const serverLocked = activeServerLockedKeys.has(chapterIdToPageKey(chapter.id))
            const lockedForViewer = serverLocked && !isAdmin

            return (
              <article
                key={chapter.id}
                id={chapter.id}
                className="relative overflow-hidden rounded-lg border border-[#c9a84c30] bg-[linear-gradient(180deg,rgba(26,35,24,.98),rgba(13,21,16,.98))] p-5 shadow-2xl shadow-black/30 md:p-8"
              >
                {admin ? (
                  <AdminControls
                    chapterId={chapter.id}
                    onLock={() => lockChapter(chapter.id)}
                    onUnlock={() => unlockChapter(chapter.id)}
                    onTimedLock={(unlockAt) => setLocks({ ...locks, [chapter.id]: { unlockAt } })}
                  />
                ) : null}

                {lockedForViewer ? (
                  <div className="flex min-h-32 items-center justify-center p-6 text-center font-serif text-2xl text-[#e8c76a]">
                    {serverLocked
                      ? '🔒 このチャプターは現在公開されていません'
                      : lockedByTime && lock?.unlockAt
                        ? formatUnlockLabel(lock.unlockAt)
                        : '閲覧可能日時は未設定です'}
                  </div>
                ) : (
                  <>
                    <div
                      className="roadmap-markdown select-none space-y-4 [&_.summary-card]:mt-8 [&_.summary-card]:rounded-lg [&_.summary-card]:border [&_.summary-card]:border-[#c9a84c] [&_.summary-card]:bg-[linear-gradient(135deg,rgba(201,168,76,.16),rgba(45,90,39,.18))] [&_.summary-card]:p-5 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-[#c9a84c] [&_blockquote]:bg-[#c9a84c14] [&_blockquote]:p-4 [&_blockquote]:text-[#fff5d1] [&_code]:font-mono [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-[#f0e8d0] md:[&_h1]:text-4xl [&_h2]:mt-8 [&_h2]:border-b-2 [&_h2]:border-[#c9a84c] [&_h2]:pb-2 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-[#f0e8d0] [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-[#e8c76a] [&_hr]:border-[#c9a84c40] [&_li]:my-1 [&_p]:leading-7 [&_p]:text-[#f0e8d0] [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[#48bb7859] [&_pre]:bg-[#081008] [&_pre]:p-4 [&_pre]:text-[#7ee787] [&_strong]:text-[#fff6d8] [&_ul]:list-disc [&_ul]:pl-6"
                      dangerouslySetInnerHTML={{ __html: chapter.html }}
                    />
                    <ChartPanel chapterId={chapter.id} />
                    {chapter.id === 'qa' ? <QaPanel /> : null}
                  </>
                )}
              </article>
            )
          })}
        </main>
      </div>
    </div>
  )
}

function AdminControls({
  chapterId,
  onLock,
  onUnlock,
  onTimedLock,
}: {
  chapterId: string
  onLock: () => void
  onUnlock: () => void
  onTimedLock: (unlockAt: string) => void
}) {
  const [value, setValue] = useState('')

  return (
    <div className="mb-5 flex flex-wrap gap-2 rounded-lg border border-dashed border-[#c9a84c40] bg-[#c9a84c10] p-3">
      <button className="rounded border border-[#c9a84c40] px-3 py-1 text-sm text-[#e8c76a]" onClick={onLock}>
        ロック
      </button>
      <button className="rounded border border-[#c9a84c40] px-3 py-1 text-sm text-[#e8c76a]" onClick={onUnlock}>
        解除
      </button>
      <input
        aria-label={`${chapterId} unlock time`}
        className="rounded border border-[#c9a84c40] bg-[#071007] px-3 py-1 text-sm text-[#f0e8d0]"
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        className="rounded border border-[#c9a84c40] px-3 py-1 text-sm text-[#e8c76a]"
        onClick={() => {
          if (value) onTimedLock(new Date(value).toISOString())
        }}
      >
        時間ロック
      </button>
    </div>
  )
}
