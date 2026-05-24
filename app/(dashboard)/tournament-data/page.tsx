import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const dynamic = 'force-dynamic'

const dataSources = [
  {
    name: 'WSOP (World Series of Poker)',
    game: 'ポーカー',
    region: '北米',
    method: 'HTML',
    legal: 'ok',
    frequency: '24h',
    status: 'researching',
    note: '年間スケジュール公開。robots.txt確認済み。商用利用条件確認要。',
  },
  {
    name: 'WPT (World Poker Tour)',
    game: 'ポーカー',
    region: '全球',
    method: 'HTML',
    legal: 'check',
    frequency: '24h',
    status: 'researching',
    note: '公式サイトにイベントカレンダーあり。',
  },
  {
    name: 'PokerStars Live',
    game: 'ポーカー',
    region: '全球',
    method: 'HTML / 問い合わせ',
    legal: 'pending',
    frequency: '6h',
    status: 'pending',
    note: '公式問い合わせで許諾確認中。アプリにも詳細データあり。',
  },
  {
    name: 'APT (Asia Poker Tour)',
    game: 'ポーカー',
    region: 'アジア',
    method: 'HTML',
    legal: 'check',
    frequency: '24h',
    status: 'researching',
    note: 'アジア圏中心。日本語圏ユーザーにリーチしやすい。',
  },
  {
    name: 'PokerAtlas',
    game: 'ポーカー',
    region: '北米',
    method: 'API (要契約)',
    legal: 'pending',
    frequency: '1h',
    status: 'pending',
    note: '北米中心。公開APIなし。商用利用は提携・許諾確認が必要。',
  },
  {
    name: 'Hendon Mob',
    game: 'ポーカー',
    region: '全球',
    method: 'Data Feed',
    legal: 'pending',
    frequency: '24h',
    status: 'pending',
    note: '結果DBとして強い。Data Feedはライセンス契約前提。スクレイピングリスク大。',
  },
  {
    name: 'Triton Poker',
    game: 'ポーカー',
    region: '全球',
    method: 'HTML',
    legal: 'check',
    frequency: '48h',
    status: 'todo',
    note: 'ハイローラー大会。賞金額が大きくSEO価値高い。',
  },
  {
    name: 'カジノ公式サイト (各種)',
    game: 'バカラ / BJ',
    region: '全球',
    method: 'PDF / SNS / HTML',
    legal: 'check',
    frequency: '手動',
    status: 'todo',
    note: 'グローバル統一APIなし。カジノのイベントページ・PDFが主データ源。',
  },
]

const coverage = [
  { game: 'ポーカー', sources: 7, status: 80, color: 'bg-green-500' },
  { game: 'バカラ', sources: 1, status: 15, color: 'bg-yellow-500' },
  { game: 'ブラックジャック', sources: 1, status: 15, color: 'bg-yellow-500' },
]

const nextActions = [
  { priority: 'P0', action: 'データモデル確定 (tournament_series / events / venues)', owner: '実装担当' },
  { priority: 'P0', action: 'WSOP と WPT の robots.txt・利用規約を文書化', owner: 'データチーム' },
  { priority: 'P0', action: 'CSV テンプレート作成（ポーカー用）', owner: '実装担当' },
  { priority: 'P0', action: '初期データ 50件 手動入力', owner: 'データチーム' },
  { priority: 'P1', action: 'PokerStars Live への問い合わせ送付', owner: 'ビジネス担当' },
  { priority: 'P1', action: 'PokerAtlas・Hendon Mob へのデータ提携打診', owner: 'ビジネス担当' },
  { priority: 'P1', action: 'バカラ・BJ 大会のカジノリストアップ', owner: 'データチーム' },
  { priority: 'P2', action: '多言語対応 (英語版 /en/tournaments)', owner: '実装担当' },
]

const legalBadge = (l: string) => {
  if (l === 'ok') return <Badge className="bg-green-600 text-white">確認済</Badge>
  if (l === 'check') return <Badge variant="secondary">要確認</Badge>
  return <Badge variant="outline">未確認</Badge>
}

const statusBadge = (s: string) => {
  if (s === 'active') return <Badge>稼働中</Badge>
  if (s === 'researching') return <Badge variant="secondary">調査中</Badge>
  if (s === 'pending') return <Badge variant="outline">待機中</Badge>
  return <Badge variant="outline">未着手</Badge>
}

const priorityBadge = (p: string) => {
  if (p === 'P0') return <Badge variant="destructive">P0</Badge>
  if (p === 'P1') return <Badge variant="secondary">P1</Badge>
  return <Badge variant="outline">P2</Badge>
}

export default async function TournamentDataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const researchingCount = dataSources.filter(s => s.status === 'researching').length
  const pendingCount = dataSources.filter(s => s.status === 'pending').length

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">大会データソース管理</h1>
        <p className="text-muted-foreground mt-1">
          ポーカー・バカラ・ブラックジャック大会情報の収集元監視とデータカバレッジ状況
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>データソース総数</CardDescription>
            <CardTitle className="text-2xl">{dataSources.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">ポーカー7 / バカラ・BJ各1</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>調査中</CardDescription>
            <CardTitle className="text-2xl">{researchingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">利用規約・robots.txt 確認中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>許諾待ち</CardDescription>
            <CardTitle className="text-2xl">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">問い合わせ・提携交渉中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>更新頻度 (目標)</CardDescription>
            <CardTitle className="text-2xl">6〜24h</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">大会期間中は15〜60分</p>
          </CardContent>
        </Card>
      </div>

      {/* Game type coverage */}
      <Card>
        <CardHeader>
          <CardTitle>ゲーム種別カバレッジ</CardTitle>
          <CardDescription>現時点でのデータソース充足率</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {coverage.map((c) => (
            <div key={c.game}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{c.game}</span>
                <span className="text-muted-foreground">{c.sources} ソース · {c.status}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${c.color} rounded-full transition-all`}
                  style={{ width: `${c.status}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-1">
            バカラ・ブラックジャックはグローバル統一APIがないため、Phase 2以降で個別カジノを開拓
          </p>
        </CardContent>
      </Card>

      {/* Data sources table */}
      <Card>
        <CardHeader>
          <CardTitle>データソース一覧</CardTitle>
          <CardDescription>各ソースの取得方式・法的状況・更新頻度</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ソース名</TableHead>
                <TableHead>ゲーム</TableHead>
                <TableHead>地域</TableHead>
                <TableHead>取得方式</TableHead>
                <TableHead>法的状況</TableHead>
                <TableHead>目標頻度</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map((s) => (
                <TableRow key={s.name}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.note}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.game}</TableCell>
                  <TableCell className="text-sm">{s.region}</TableCell>
                  <TableCell className="text-sm">{s.method}</TableCell>
                  <TableCell>{legalBadge(s.legal)}</TableCell>
                  <TableCell className="text-sm">{s.frequency}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Next actions */}
      <Card>
        <CardHeader>
          <CardTitle>次のアクション</CardTitle>
          <CardDescription>優先度別タスク — データ収集開始に向けて</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nextActions.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                {priorityBadge(a.priority)}
                <span className="flex-1 text-sm">{a.action}</span>
                <span className="text-xs text-muted-foreground shrink-0">{a.owner}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scraping rules */}
      <Card>
        <CardHeader>
          <CardTitle>データ収集ポリシー原則</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ['出典記録', 'ソースURL・取得日時・ライセンス状態を全イベントに保存'],
              ['robots.txt 遵守', '全ソースのrobots.txtと利用規約を取得前に確認・記録'],
              ['レート制限', 'HTML取得は低頻度・User-Agent明示・差分取得のみ'],
              ['優先順位', '公式API > RSS/ICS > PDF/Press Release > HTML'],
              ['商用利用', '収益化段階では提携・許諾を明示的に取得'],
              ['データ削除', 'ソースから削除要請があれば即座に対応する体制を整備'],
            ].map(([title, desc]) => (
              <div key={title} className="p-3 border rounded-lg">
                <div className="font-medium mb-0.5">{title}</div>
                <div className="text-muted-foreground text-xs">{desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
