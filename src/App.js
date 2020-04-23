import 'regenerator-runtime/runtime'
import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import Big from 'big.js'
import { v4 as uuid } from 'uuid'
import useCachedUpdater from './useCachedUpdater'
import useSubscribedGetter from './useSubscribedGetter'

const SUGGESTED_DONATION = '1'
const BOATLOAD_OF_GAS = Big(1).times(10 ** 16).toFixed()

const App = ({ contract, currentUser, nearConfig, wallet }) => {
  const [
    addMessage,
    syncingMessages,
    updateSyncingMessages
  ] = useCachedUpdater(
    contract.addMessage,
    {
      initialCacheValue: [],
      onFunctionCall: (cache, message) => {
        const newCache = [...cache, message]
        return newCache
      },
      onError: (cache, error, message) => {
        const messages = [...cache]
        const index = messages.findIndex(m => m.id === message.id)
        messages[index].error = error.message
        updateSyncingMessages(messages)
      }
    }
  )

  const persistedMessages = useSubscribedGetter(contract.getMessages, {
    initialValue: [],
    onUpdate: persistedMessages => {
      const persistedIDs = persistedMessages.map(m => m.id)
      const newSyncingMessages = syncingMessages.filter(m =>
        !persistedIDs.includes(m.id)
      )
      updateSyncingMessages(newSyncingMessages)
    }
  })

  const onSubmit = useCallback(e => {
    e.preventDefault()

    const { message, donation } = e.target.elements

    addMessage(
      {
        id: uuid(),
        text: message.value,
        sender: currentUser.accountId,
        donation: donation.value || 0
      },
      BOATLOAD_OF_GAS,
      Big(donation.value || '0').times(10 ** 24).toFixed()
    )

    message.value = ''
    donation.value = SUGGESTED_DONATION
    message.focus()
  }, [])

  const signIn = useCallback(() => {
    wallet.requestSignIn(
      nearConfig.contractName,
      'NEAR Guest Book'
    )
  }, [])

  const signOut = useCallback(() => {
    wallet.signOut()
    window.location = '/'
  }, [])

  return (
    <main>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1>NEAR Guest Book</h1>
        {currentUser
          ? <button onClick={signOut}>Log out</button>
          : <button onClick={signIn}>Log in</button>
        }
      </header>
      {currentUser && (
        <form onSubmit={onSubmit}>
          <p>Sign the guest book, { currentUser.accountId }!</p>
          <p className="highlight">
            <label htmlFor="message">Message:</label>
            <input
              autoComplete="off"
              autoFocus
              id="message"
              required
            />
          </p>
          <p>
            <label htmlFor="donation">Donation (optional):</label>
            <input
              autoComplete="off"
              defaultValue={SUGGESTED_DONATION}
              id="donation"
              max={Big(currentUser.balance).div(10 ** 24)}
              min="0"
              step="0.01"
              type="number"
            />
            <span title="NEAR Tokens">Ⓝ</span>
          </p>
          <button type="submit">
            Sign
          </button>
        </form>
      )}
      {(!!persistedMessages.length || !!syncingMessages.length) && (
        <h2>Messages</h2>
      )}
      {persistedMessages.map((message, i) => (
        // TODO: format as cards, add timestamp
        <p key={i} className={message.premium ? 'is-premium' : ''}>
          <strong>{message.sender}</strong>:<br/>
          {message.text}
        </p>
      ))}
      {syncingMessages.map((message, i) => (
        <p key={i} style={{ color: 'gray' }}>
          <strong>{message.sender}</strong>:<br/>
          {message.text}
          {message.error && (
            <>
              <br />
              <span style={{ color: 'var(--red)' }}>
                Syncing failed! {message.error}
              </span>
              <br />
              <button onClick={() => {
                const messages = [...syncingMessages]
                const index = messages.findIndex(m => m.id === message.id)
                delete messages[index].error
                updateSyncingMessages(messages)
                contract.addMessage(
                  message,
                  BOATLOAD_OF_GAS,
                  Big(message.donation).times(10 ** 24).toFixed()
                )
              }}>
                Retry
              </button>
            </>
          )}
        </p>
      ))}
    </main>
  )
}

App.propTypes = {
  contract: PropTypes.shape({
    addMessage: PropTypes.func.isRequired,
    getMessages: PropTypes.func.isRequired
  }).isRequired,
  currentUser: PropTypes.shape({
    accountId: PropTypes.string.isRequired,
    balance: PropTypes.string.isRequired
  }),
  nearConfig: PropTypes.shape({
    contractName: PropTypes.string.isRequired
  }).isRequired,
  wallet: PropTypes.shape({
    requestSignIn: PropTypes.func.isRequired,
    signOut: PropTypes.func.isRequired
  }).isRequired
}

export default App
