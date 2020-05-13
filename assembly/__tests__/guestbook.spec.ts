import { addMessage, getMessages } from '../main'
import { PostedMessage, messages } from '../model'

afterEach( () => {
  while (messages.length > 0) {
    messages.pop()
  }
})

describe('addMessage', () => {
  it('adds a message to the PersistentVector', () => {
    addMessage('some unique id', 'hey')
    expect(messages.length).toBe(1, 'should only contain one message')
    expect(messages[0].id).toBe('some unique id')
    expect(messages[0].text).toBe('hey')
  })
})

describe('getMessages', () => {
  it('returns an array of messages', () => {
    addMessage('another unique id', 'hey')
    const messagesArr = getMessages()
    assert(Array.isArray(messagesArr))
    expect(messagesArr.length).toBe(1)
    expect(messagesArr[0].id).toBe('another unique id')
    expect(messagesArr[0].text).toBe('hey')
  })

  it('only shows the last ten messages', () => {
    for (let i: i32 = 0; i < 11; i++) {
      const id = i.toString()
      const text = 'message #' + i.toString()
      addMessage(id, text)
    }
    const messagesArr = getMessages()
    expect(messagesArr.length).toBe(10)
    const messageIDs: string[] = messagesArr.map<string>(m => m.id)
    expect(messageIDs).not.toIncludeEqual('0', "shouldn't contain the first element")
  })
})
