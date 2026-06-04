import { Analytics } from '@vercel/analytics/react'
import { SnakeGame } from '@/components/snake-game'


const env = import.meta.env.VITE_ENV 
function App() {
  return (
    <div className="font-sans antialiased">
      <SnakeGame />
      <Analytics />
    </div>
  )
}

export default App
