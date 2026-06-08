import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type State = 'idle' | 'loading' | 'success' | 'error'

export function MailingListForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setState('loading')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok) {
        setState('success')
        setMessage('You\'re on the list!')
        setEmail('')
      } else {
        setState('error')
        setMessage(data.error ?? 'Something went wrong.')
      }
    } catch {
      setState('error')
      setMessage('Could not connect to server.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <p className="text-sm text-muted-foreground">Get notified about updates</p>
      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={state === 'loading' || state === 'success'}
          // onKeyDown={}}
        />
        <Button type="submit" disabled={state === 'loading' || state === 'success'}>
          {state === 'loading' ? 'Joining…' : 'Join'}
        </Button>
      </form>
      {message && (
        <p className={`text-sm ${state === 'success' ? 'text-green-600' : 'text-destructive'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
