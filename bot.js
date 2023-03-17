const TELEGRAM = {
  TOKEN: '52....:AA...', // Get it from @BotFather https://core.telegram.org/bots#6-botfather
  SECRET: 'VerYSecret1337', // A-Z, a-z, 0-9, _ and - . Random secret to secure the webhook endpoint & prevent unauthorized access.
  WEBHOOK: '/endpoint',
}
const OPENAI = {
  TOKEN: 'sk-xxx', // Get it from https://platform.openai.com/account/api-keys
  MODEL: 'gpt-3.5-turbo', // List of available models https://platform.openai.com/docs/models
  TEMPERATURE: 0.3, // Higher (like 0.8) means more random / creative, while lower 0.2 will make it more focused and deterministic (https://platform.openai.com/docs/api-reference/completions/create#completions/create-temperature)
  MAX_TOKENS: 500, // https://platform.openai.com/docs/api-reference/completions/create#completions/create-max_tokens
  MAX_MESSAGE: 10, // Higher will increase tokens, because we send the previous context on new message.
  MAX_MESSAGE_LENGTH: 100, // Maximum message length / characters.
}

/**
 * Wait for requests to the worker
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname === TELEGRAM.WEBHOOK) {
    event.respondWith(handleWebhook(event))
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, TELEGRAM.WEBHOOK, TELEGRAM.SECRET))
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event))
  } else {
    event.respondWith(new Response('No handler for this request'))
  }
})

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
function handleWebhook(event) {
  // Check secret
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== TELEGRAM.SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Handle the request async
  const handler = async function () {
    const update = await event.request.json()
    await onUpdate(update)
  }
  event.waitUntil(handler())
  return new Response('Ok')
}

/**
 * Handle incoming Update
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate(update) {
  if ('message' in update) {
    await onMessage(update.message)
  }
}

/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
async function onMessage(message) {
  if (!message.text || (message.text && message.text.trim() == '')) {
    return sendPlainText(message.chat.id, 'Empty message 🤖');
  }

  if (message.text.length >= OPENAI.MAX_MESSAGE_LENGTH) {
    return sendPlainText(message.chat.id, 'Please don\'t send long text or I will die 🩻');
  }

  if (message.text.startsWith('/start')) {
    return sendPlainText(message.chat.id, 'Hello, I\'m bot🤖 How can I assist you today?')
  }

  if (message.text.startsWith('/clear')) {
    await MESSAGES.delete(message.from.id);
    return sendPlainText(message.chat.id, 'I\'ve reset the conversation, so let\'s begin anew');
  }

  let lastMessages = await MESSAGES.get(message.from.id, { type: 'json' });
  if (lastMessages) {
    if (lastMessages.length >= OPENAI.MAX_MESSAGE) {
      await MESSAGES.delete(message.from.id);
      return sendPlainText(message.chat.id, 'Sorry, I cannot reply anymore. Please start a new topic.');
    }

    lastMessages.push({ role: 'user', content: message.text });
  } else {
    lastMessages = [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: message.text }]
  }

  let ai = await callChatGPT(lastMessages);
  lastMessages.push({ role: 'assistant', content: ai });
  await MESSAGES.put(message.from.id, JSON.stringify(lastMessages));

  return sendPlainText(message.chat.id, ai)
}

/**
 * Get ChatGPT's response from a given prompt 
 * 
 * @param {Object} prompt 
 * @returns {String} asdasd 
 */
async function callChatGPT(prompt) {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI.TOKEN}`
    },
    body: JSON.stringify({
      'model': OPENAI.MODEL,
      'max_tokens': OPENAI.MAX_TOKENS,
      'temperature': OPENAI.TEMPERATURE,
      'messages': typeof prompt === 'string' ? [{ "role": "user", "content": prompt }] : prompt,
    })
  };

  return fetch('https://api.openai.com/v1/chat/completions', requestOptions)
    .then(response => response.json())
    .then(data => {
      if (!data || !data.choices) {
        return JSON.stringify(data);
      }
      const responseText = data.choices[0].message.content;
      if (!responseText) {
        return JSON.stringify(data);
      }
      return responseText;
    })
    .catch(error => error);
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText(chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text
  }))).json()
}

/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook(event, requestUrl, suffix, secret) {
  // https://core.telegram.org/bots/api#setwebhook
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
async function unRegisterWebhook(event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Return url to telegram api, optionally with parameters added
 */
function apiUrl(methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TELEGRAM.TOKEN}/${methodName}${query}`
}

if (typeof MESSAGES === 'undefined') {
  console.error('Please bind KV as MESSAGES');
}