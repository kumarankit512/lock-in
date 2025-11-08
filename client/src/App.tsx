import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import FocusAndHabits from './components/FocusAndHabits'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <FocusAndHabits/>
    </>
  )
}

export default App
