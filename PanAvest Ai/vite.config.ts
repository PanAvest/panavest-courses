import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.POLLINATIONS_API_KEY
  const baseUrl = env.POLLINATIONS_BASE_URL || 'https://gen.pollinations.ai'
  const model = env.POLLINATIONS_MODEL || 'openai'

  return {
    plugins: [
      react(),
      {
        name: 'panavest-ai-proxy',
        configureServer(server) {
          server.middlewares.use('/api/ai', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })

            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}')
                const prompt = String(parsed.prompt || '')

                if (!prompt) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing prompt' }))
                  return
                }

                const isBadPollinations = (text: string) => {
                  const s = (text || '').toLowerCase()
                  return (
                    s.includes('important notice') ||
                    s.includes('legacy text api') ||
                    s.includes('being deprecated') ||
                    s.includes('migrate to our new service') ||
                    s.includes('enter.pollinations.ai')
                  )
                }

                const callPollinationsChat = async (useKey: boolean) => {
                  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(useKey && apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                    },
                    body: JSON.stringify({
                      model,
                      messages: [{ role: 'user', content: prompt }],
                      temperature: 0.3,
                      max_tokens: 260,
                    }),
                  })

                const textBody = await response.text()
                if (!response.ok || !textBody) {
                  const preview = textBody ? textBody.slice(0, 500) : 'empty response'
                  throw new Error(`Pollinations error (${response.status}): ${preview}`)
                }

                  let parsed: any
                  try {
                    parsed = JSON.parse(textBody)
                } catch (err) {
                  throw new Error(textBody.slice(0, 500))
                }

                const message = parsed?.choices?.[0]?.message || {}
                const text = message?.content || ''
                const blocks = Array.isArray(message?.content_blocks) ? message.content_blocks : []
                const blockText = blocks
                  .filter((b: any) => b?.type === 'text' && typeof b?.text === 'string')
                  .map((b: any) => b.text)
                  .join('\n')
                const finalText = text || blockText
                if (!finalText || isBadPollinations(finalText)) {
                  const preview = finalText ? finalText.slice(0, 500) : 'empty content'
                  throw new Error(`Pollinations error (${response.status}): ${preview}`)
                }

                return finalText
              }

              const callPollinationsText = async (useKey: boolean) => {
                const query = new URLSearchParams({
                  model,
                  temperature: '0.3',
                })
                if (useKey && apiKey) query.set('key', apiKey)
                const url = `${baseUrl}/text/${encodeURIComponent(prompt)}?${query.toString()}`
                const response = await fetch(url, { method: 'GET' })
                const textBody = await response.text()
                if (!response.ok || !textBody) {
                  const preview = textBody ? textBody.slice(0, 500) : 'empty response'
                  throw new Error(`Pollinations error (${response.status}): ${preview}`)
                }
                if (isBadPollinations(textBody)) {
                  throw new Error(`Pollinations error (${response.status}): ${textBody.slice(0, 500)}`)
                }
                return textBody
              }

              let text = ''
              try {
                if (apiKey) {
                  try {
                    text = await callPollinationsChat(true)
                  } catch {
                    text = await callPollinationsText(true)
                  }
                } else {
                  try {
                    text = await callPollinationsChat(false)
                  } catch {
                    text = await callPollinationsText(false)
                  }
                }
              } catch (err) {
                try {
                  text = await callPollinationsChat(false)
                } catch {
                  text = await callPollinationsText(false)
                }
              }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ text: text || '' }))
              } catch (err: any) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err?.message || 'PanAvest AI request failed' }))
              }
            })
          })
        },
      },
    ],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          admin: resolve(__dirname, 'admin.html'),
        },
      },
    },
  }
})
