import { useCallback, useState } from 'react'
import * as localStorage from './localStorage'

const cacheName = fn => fn.name + ':syncing'

export default function useCachedUpdater (fn, {
  initialCacheValue,
  onFunctionCall,
  onError = () => {}
}) {
  const [state, setState] = useState(
    localStorage.get(cacheName(fn)) || initialCacheValue
  )

  const wrappedFn = useCallback((...args) => {
    const newState = onFunctionCall(
      localStorage.get(cacheName(fn)) || initialCacheValue,
      ...args
    )
    setState(newState)
    localStorage.set(cacheName(fn), newState)
    return fn(...args).catch(err => onError(
      localStorage.get(cacheName(fn)) || initialCacheValue,
      err,
      ...args
    ))
  }, [onFunctionCall, onError])

  const setCache = useCallback(newCache => {
    setState(newCache)
    localStorage.set(cacheName(fn), newCache)
  }, [])

  return [wrappedFn, state, setCache]
}
