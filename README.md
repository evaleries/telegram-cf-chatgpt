# Telegram BOT CF GPT

A Telegram bot that utilizes the power of ChatGPT to provide users with intelligent and engaging responses. 

I'm using telegram bot template from [cvzi/telegram-bot-cloudflare](https://github.com/cvzi/telegram-bot-cloudflare) and simply call API to chatgpt as a response.
With this bot, users can engage in natural language conversations and receive personalized responses that are tailored to their specific needs.
(generated by ChatGPT)

You can deploy this bot to cloudflare worker with tutorial from [cvzi](https://github.com/cvzi/telegram-bot-cloudflare#telegram-bot-on-cloudflare-workers).

## Requirements

To deploy the bot, you required to have: 

- Telegram Bot (from: @BotFather)
- Cloudflare Account
- OpenAI API Key

## Setup Instructions

1. Create Telegram bot via @BotFather on Telegram
2. Create Cloudflare Worker (Follow the steps by [cvzi](https://github.com/cvzi/telegram-bot-cloudflare#telegram-bot-on-cloudflare-workers))
3. Create Workers KV with name `messages`
4. Bind the KV with workers via Worker's Setting -> Tab Variables -> KV Namespace Bindings
5. Use variable name `MESSAGES` and choose `messages` KV Namespace, then press Save and deploy
6. Quick edit the worker, and copy bot.js to the Cloudflare code editor
7. Edit the `TELEGRAM` and `OPENAI` config in te code.
8. Register webhook and try the bot✨
