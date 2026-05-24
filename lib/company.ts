import {
  Bell,
  Calculator,
  Lightbulb,
  Megaphone,
  Package,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type DepartmentKey =
  | 'schedule'
  | 'manager'
  | 'planning'
  | 'inventory'
  | 'staff'
  | 'accounting'
  | 'marketing'

export interface DepartmentKpi {
  label: string
  value: string
  note: string
  pendingDetails?: string[]
}

export interface DepartmentDefinition {
  key: DepartmentKey
  title: string
  shortTitle: string
  href: string
  icon: LucideIcon
  level: number
  reportsTo: string
  description: string
  obsidianDirectory: string
  procedurePath: string
  memoryDirectory: string
  kpis: DepartmentKpi[]
  sections: Array<{
    title: string
    items: string[]
  }>
}

const baseAgentPath = 'Agent'

export const companyName = 'アミューズメントカジノバーmillion'
export const ownerName = 'やくしん'

export const departments: DepartmentDefinition[] = [
  {
    key: 'schedule',
    title: '秘書・スケジュール管理部門',
    shortTitle: '秘書・スケジュール',
    href: '/schedule',
    icon: Bell,
    level: 1,
    reportsTo: 'やくしん',
    description: 'オーナー直下で意思決定、予定、連絡、部門間の優先順位を整理します。',
    obsidianDirectory: `${baseAgentPath}/秘書・スケジュール管理部門`,
    procedurePath: `${baseAgentPath}/秘書・スケジュール管理部門/業務手順書/基本手順.md`,
    memoryDirectory: `${baseAgentPath}/秘書・スケジュール管理部門/メモリ`,
    kpis: [
      {
        label: '確認待ち案件',
        value: '6件',
        note: 'オーナー判断待ちと部門連絡を含む',
        pendingDetails: [
          'シフト変更申請 3件',
          '有給申請の承認',
          '店長からの緊急連絡確認',
          '週末イベント日程の最終判断',
        ],
      },
      {
        label: '未確認連絡',
        value: '3件',
        note: '返信待ちの重要連絡',
        pendingDetails: [
          '店長部門: 週末配置変更への返信待ち',
          '経理部門: 仕入れ請求書の確認依頼',
          'マーケティング部門: LINE配信文面の最終確認',
        ],
      },
      {
        label: '今週の会議',
        value: '4件',
        note: '定例と企画確認を含む',
        pendingDetails: [
          '月曜 18:00 店長定例: 売上進捗と現場課題',
          '水曜 16:00 企画確認: 週末トーナメント準備',
          '木曜 15:00 在庫・経理確認: 発注と支払い予定',
          '金曜 17:30 全体共有: 週末営業前の最終確認',
        ],
      },
    ],
    sections: [
      {
        title: 'やくしん連携',
        items: ['本日の報告事項を整理', '意思決定が必要な案件を抽出', '優先指示を各部門へ展開'],
      },
      {
        title: 'スケジュール管理',
        items: ['未読連絡の回収', '重要予定のリマインド', '日程変更の関係者通知'],
      },
    ],
  },
  {
    key: 'manager',
    title: '店長部門',
    shortTitle: '店長',
    href: '/manager',
    icon: Store,
    level: 2,
    reportsTo: '秘書・スケジュール管理部門',
    description: '店舗運営、現場判断、各部門の実行状況を統括します。',
    obsidianDirectory: `${baseAgentPath}/店長部門`,
    procedurePath: `${baseAgentPath}/店長部門/業務手順書/基本手順.md`,
    memoryDirectory: `${baseAgentPath}/店長部門/メモリ`,
    kpis: [
      { label: '本日の売上目標', value: '¥180,000', note: '通常営業日の目安' },
      {
        label: '確認待ち案件',
        value: '5件',
        note: '承認または現場判断が必要',
        pendingDetails: [
          'VIP対応方針の確認',
          '当日スタッフ追加配置の承認',
          '高額景品交換の判断',
          '営業中トラブル報告の対応確認',
          '週末売上目標の修正承認',
        ],
      },
      { label: '本日の配置', value: '12名', note: 'ホール、ディーラー、管理を含む' },
    ],
    sections: [
      {
        title: '店舗運営',
        items: ['売上と客数の進捗確認', 'VIPと常連対応の共有', '営業中の重要連絡を整理'],
      },
      {
        title: '部門連携',
        items: ['企画・在庫・経理の進捗確認', '現場判断が難しい案件の上申', '各部門への指示展開'],
      },
    ],
  },
  {
    key: 'planning',
    title: '企画部門',
    shortTitle: '企画',
    href: '/planning',
    icon: Lightbulb,
    level: 3,
    reportsTo: '店長部門',
    description: 'イベント、トーナメント、キャンペーン施策を企画し進行管理します。',
    obsidianDirectory: `${baseAgentPath}/企画部門`,
    procedurePath: `${baseAgentPath}/企画部門/業務手順書/基本手順.md`,
    memoryDirectory: `${baseAgentPath}/企画部門/メモリ`,
    kpis: [
      { label: '進行中企画', value: '5件', note: '今月実施予定の企画' },
      {
        label: '確認待ち案件',
        value: '2件',
        note: '店長確認が必要な企画',
        pendingDetails: [
          '週末トーナメント予算の承認',
          '初心者講習イベント告知文の確認',
          '常連向け特典内容の最終判断',
        ],
      },
      { label: '来店目標', value: '180名', note: '対象イベントの合計目標' },
    ],
    sections: [
      {
        title: '企画パイプライン',
        items: ['週末トーナメント案の精査', '初心者講習イベントの準備', '常連向け特典キャンペーン'],
      },
      {
        title: '確認ポイント',
        items: ['景品と予算の上限確認', '必要スタッフ数の調整', '告知開始日の確定'],
      },
    ],
  },
  {
    key: 'inventory',
    title: '在庫管理部門',
    shortTitle: '在庫',
    href: '/inventory',
    icon: Package,
    level: 3,
    reportsTo: '店長部門',
    description: 'ドリンク、景品、ゲーム用品、発注状況を管理します。',
    obsidianDirectory: `${baseAgentPath}/在庫管理部門`,
    procedurePath: `${baseAgentPath}/在庫管理部門/業務手順書/基本手順.md`,
    memoryDirectory: `${baseAgentPath}/在庫管理部門/メモリ`,
    kpis: [
      {
        label: '確認待ち案件',
        value: '8件',
        note: '安全在庫を下回った品目',
        pendingDetails: [
          '備品発注の承認',
          '在庫不足アラート確認',
          'ドリンク追加仕入れの判断',
          '破損チップ補充申請',
          'イベント用景品の発注可否',
        ],
      },
      { label: '棚卸進捗', value: '72%', note: '今月の確認済みカテゴリ' },
      { label: '今月の仕入予定', value: '¥320,000', note: '仮集計の仕入予算' },
    ],
    sections: [
      {
        title: '在庫サマリー',
        items: ['ドリンク在庫の不足確認', 'カードとチップ類の状態確認', '消耗品の発注候補を整理'],
      },
      {
        title: '運用メモ',
        items: ['週次棚卸の結果を反映', 'イベント前の追加発注確認', '破損と紛失の記録を残す'],
      },
    ],
  },
  {
    key: 'staff',
    title: 'スタッフ管理部門',
    shortTitle: 'スタッフ',
    href: '/staff',
    icon: Users,
    level: 3,
    reportsTo: '店長部門',
    description: '在籍情報、シフト、教育状況、評価メモを管理します。',
    obsidianDirectory: `${baseAgentPath}/スタッフ管理部門`,
    procedurePath: `${baseAgentPath}/スタッフ管理部門/業務手順書/基本手順.md`,
    memoryDirectory: `${baseAgentPath}/スタッフ管理部門/メモリ`,
    kpis: [
      { label: '在籍スタッフ', value: '28名', note: '社員、アルバイト、業務委託を含む' },
      {
        label: '確認待ち案件',
        value: '4件',
        note: '今週予定されている面談',
        pendingDetails: [
          '新規採用候補の面談結果確認',
          'シフト希望未提出者への対応判断',
          '研修完了チェックの承認',
          '昇給候補スタッフの評価確認',
        ],
      },
      { label: '研修未完了', value: '6名', note: 'ルール・接客研修の未完了者' },
    ],
    sections: [
      {
        title: 'スタッフ状況',
        items: ['新規採用候補の確認', 'シフト提出状況の確認', '欠勤と遅刻傾向の確認'],
      },
      {
        title: '育成と評価',
        items: ['ディーラー研修の進捗管理', '接客品質メモの更新', '昇給と役割変更候補の整理'],
      },
    ],
  },
  {
    key: 'accounting',
    title: '経理部門',
    shortTitle: '経理',
    href: '/accounting',
    icon: Calculator,
    level: 3,
    reportsTo: '店長部門',
    description: '売上、経費、給与、精算状況を確認し、店舗収支を管理します。',
    obsidianDirectory: `${baseAgentPath}/経理部門`,
    procedurePath: `${baseAgentPath}/経理部門/業務手順書/基本手順.md`,
    memoryDirectory: `${baseAgentPath}/経理部門/メモリ`,
    kpis: [
      { label: '今月売上', value: '¥2,450,000', note: '仮入力を含む概算' },
      {
        label: '確認待ち案件',
        value: '7件',
        note: '領収書確認待ち',
        pendingDetails: [
          '未精算経費の承認',
          '領収書不足分の確認',
          'イベント経費の科目判断',
          '仕入請求書の支払い確認',
          '給与集計差分の確認',
        ],
      },
      { label: '給与集計', value: '86%', note: '勤怠反映済み割合' },
    ],
    sections: [
      {
        title: '収支サマリー',
        items: ['日次売上の確認', '仕入と備品経費の分類', 'イベント別利益の確認'],
      },
      {
        title: '処理待ち',
        items: ['月末支払い予定の整理', 'スタッフ給与の最終確認', '不足領収書の回収'],
      },
    ],
  },
  {
    key: 'marketing',
    title: 'マーケティング・集客・情報部門',
    shortTitle: 'マーケティング',
    href: '/marketing',
    icon: Megaphone,
    level: 3,
    reportsTo: '店長部門',
    description: 'SNS、広告、告知、顧客情報を管理し、来店導線を強化します。',
    obsidianDirectory: `${baseAgentPath}/マーケティング部門`,
    procedurePath: `${baseAgentPath}/マーケティング部門/業務手順書/基本手順.md`,
    memoryDirectory: `${baseAgentPath}/マーケティング部門/メモリ`,
    kpis: [
      { label: '今週の予約導線', value: '42件', note: 'SNSと紹介を含む' },
      {
        label: '確認待ち案件',
        value: '9本',
        note: 'Instagram、X、LINE向け',
        pendingDetails: [
          'Instagram投稿文の確認',
          'LINE配信日時の承認',
          'イベント告知画像の最終確認',
          '紹介キャンペーン文面の修正判断',
          '新規リード対応状況の確認',
        ],
      },
      { label: '新規リード', value: '18名', note: 'イベント告知からの反応' },
    ],
    sections: [
      {
        title: '集客チャネル',
        items: ['SNS投稿カレンダーの管理', 'LINE配信文面の準備', '紹介キャンペーンの反応確認'],
      },
      {
        title: '情報管理',
        items: ['イベント写真と告知素材の整理', '顧客属性メモの更新', '反応の良い投稿テーマの記録'],
      },
    ],
  },
]

export function getDepartment(key: DepartmentKey) {
  return departments.find((department) => department.key === key)
}
