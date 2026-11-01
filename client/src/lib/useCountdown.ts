import { useCallback, useEffect, useState } from 'react'

// Seconds left before the user can ask for a new OTP (the API allows one per minute).
export function useCountdown(initialSeconds = 0) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const restart = useCallback((seconds = 60) => setSecondsLeft(seconds), [])

  return { secondsLeft, restart }
}
