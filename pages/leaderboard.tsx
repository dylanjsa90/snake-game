import { useEffect, useState } from 'react'
import {
  fetchService,
  SNAKE_GAME,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '@/services/fetch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'all-time', label: 'All Time' },
  { value: 'daily', label: 'Today' },
  { value: 'monthly', label: 'This Month' },
]

function LeaderboardTable({ period }: { period: LeaderboardPeriod }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    fetchService
      .getLeaderboard(SNAKE_GAME, period)
      .then(data => {
        if (active) setEntries(data)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [period])

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return (
      <p className="py-8 text-center text-sm text-destructive">
        Couldn&apos;t load the leaderboard.
      </p>
    )
  }
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No scores yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(entry => (
          <TableRow key={entry.rank}>
            <TableCell className="font-mono text-muted-foreground">{entry.rank}</TableCell>
            <TableCell className="font-medium">{entry.username}</TableCell>
            <TableCell className="text-right font-mono">{entry.score}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function LeaderboardPage() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Snake Leaderboard</h1>
      <Tabs defaultValue="all-time">
        <TabsList>
          {PERIODS.map(p => (
            <TabsTrigger key={p.value} value={p.value}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PERIODS.map(p => (
          <TabsContent key={p.value} value={p.value}>
            <LeaderboardTable period={p.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
