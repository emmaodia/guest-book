import { useEffect, useState } from 'react'
import isEqual from 'lodash/isEqual'
import * as localStorage from './localStorage'

const POLL_INTERVAL = 5000

const cacheName = fn => fn.name + ':subscription'

async function refreshFromChain (fn, onUpdate, setState) {
  const fresh = await fn()
  const cached = localStorage.get(cacheName(fn))

  if (!isEqual(fresh, cached)) {
    localStorage.set(cacheName(fn), fresh)
    onUpdate(fresh)
    setState(fresh)
  }
}

export default function useSubscription (fn, { initialValue, onUpdate = () => {} } = {}) {
  const [state, setState] = useState(
    localStorage.get(cacheName(fn)) || initialValue
  )

  useEffect(() => {
    refreshFromChain(fn, onUpdate, setState)

    const interval = setInterval(
      () => refreshFromChain(fn, onUpdate, setState),
      POLL_INTERVAL
    )

    return () => clearInterval(interval)
  }, [onUpdate])

  return state
}
