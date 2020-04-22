import { useCallback, useEffect, useState } from 'react'
import isEqual from 'lodash/isEqual'
import Big from 'big.js'
import * as localStorage from './localStorage'

const BOATLOAD_OF_GAS = Big(1).times(10 ** 16).toFixed()

const POLL_INTERVAL = 5000

const PERSISTED_MESSAGES = 'persisted-messages'
const LOCAL_MESSAGES = 'local-messages'
const initialPersistedMessages = localStorage.get(PERSISTED_MESSAGES)
const initialLocalMessages = localStorage.get(LOCAL_MESSAGES)

function updateLocalMessages () {
  const persistedIDs = localStorage.get(PERSISTED_MESSAGES).map(m => m.id)
  const localMessages = localStorage.get(LOCAL_MESSAGES) || []
  const refreshed = localMessages.filter(m => !persistedIDs.includes(m.id))
  localStorage.set(LOCAL_MESSAGES, refreshed)
  return refreshed
}

// Only update `messages` state when new
// data is available. This prevents components that use this custom hook from
// updating over & over again even though no data has changed.
//
// The `localStorage.set` call also caches this data in the browser's
// localStorage, so that data is available immediately when the user
// refreshes the page.
async function refreshMessages (contract, setMessages) {
  const newMessages = await contract.getMessages()
  const persistedMessages = localStorage.get(PERSISTED_MESSAGES)

  if (!isEqual(newMessages, persistedMessages)) {
    localStorage.set(PERSISTED_MESSAGES, newMessages)
    const localMessages = updateLocalMessages()
    setMessages([...newMessages, ...localMessages])
  }
}

export default function useSmartContract (contract) {
  const [messages, setMessages] = useState(
    initialPersistedMessages || initialLocalMessages
      ? [...(initialPersistedMessages || []), ...(initialLocalMessages || [])]
      : null
  )

  // Set up polling of the contract
  useEffect(() => {
    refreshMessages(contract, setMessages)
    const interval = setInterval(
      () => refreshMessages(contract, setMessages),
      POLL_INTERVAL
    )

    // Return a function from useEffect to help React clean up.
    // Learn more: https://reactjs.org/docs/hooks-effect.html#example-using-hooks-1
    return () => clearInterval(interval)
  }, [])

  const addMessage = useCallback(({ donation, id, sender, text }) => {
    const localMessages = localStorage.get(LOCAL_MESSAGES) || []
    localMessages.push({ id, sender, text })
    localStorage.set(LOCAL_MESSAGES, localMessages)
    setMessages([
      ...(localStorage.get(PERSISTED_MESSAGES) || []),
      ...localMessages
    ])
    contract.addMessage(
      { id, text },
      BOATLOAD_OF_GAS,
      Big(donation).times(10 ** 24).toFixed()
    )
  }, [])

  return { messages, addMessage }
}
