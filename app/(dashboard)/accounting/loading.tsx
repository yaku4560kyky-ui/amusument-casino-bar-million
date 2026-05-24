import { Card, CardContent, CardHeader } from '@/components/ui/card'

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-700/35 ${className ?? ''}`} />
}

export default function AccountingLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-7 p-6">
      <section className="rounded-xl border border-amber-400/15 bg-card/70 p-6">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="mt-3 h-9 w-64" />
        <SkeletonBlock className="mt-3 h-4 max-w-2xl" />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-amber-400/20 bg-card/90 md:col-span-2">
          <CardHeader>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-12 w-56" />
          </CardHeader>
          <CardContent>
            <SkeletonBlock className="h-72 w-full" />
          </CardContent>
        </Card>
        <Card className="border-amber-400/10 bg-card/85">
          <CardHeader>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-400/15 bg-card/85">
        <CardHeader>
          <SkeletonBlock className="h-6 w-44" />
          <SkeletonBlock className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <SkeletonBlock className="h-72 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
