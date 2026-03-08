// baileys-bot/index.ts — WhatsApp group bot for W Chaput Studio
//
// Architecture:
//   WhatsApp Groups → Baileys (this service, Railway) → Vercel Internal API → Claude + Supabase
//
// How it works:
//   1. Add the bot's WhatsApp number to your group(s)
//   2. Start any message with "bot: " to trigger the bot
//   3. The bot quotes your message and replies with the result
//
// Required env vars (Railway):
//   VERCEL_API_URL        — e.g. https://tu-app.vercel.app
//   WHATSAPP_BOT_API_KEY  — random secret, same value in Railway + Vercel
//   PORT                  — optional, defaults to 3000
//
// First-time setup:
//   Run locally with `npm run dev`, scan the QR code with the bot's WhatsApp account.
//   After scanning, the session/ folder is created — upload it to Railway as persistent volume.

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WAMessageContent,
  proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import qrcode from 'qrcode-terminal'
import QRCode from 'qrcode'
import http from 'http'

// ─── Config ───────────────────────────────────────────────────────────────────

const VERCEL_API_URL = process.env.VERCEL_API_URL
const BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY
const SESSION_DIR = join(process.cwd(), 'session')
const PORT = parseInt(process.env.PORT || '3000')

if (!VERCEL_API_URL || !BOT_API_KEY) {
  console.error('[Bot] Missing VERCEL_API_URL or WHATSAPP_BOT_API_KEY env vars')
  process.exit(1)
}

// Minimal logger (suppress Baileys debug noise)
const logger = pino({ level: 'warn' })

// Store latest QR code
let latestQR: string | null = null

// ─── HTTP Server for QR Code ──────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = req.url || '/'
  
  // Health check
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', qrAvailable: !!latestQR }))
    return
  }
  
  // QR Code endpoint
  if (url === '/qr') {
    if (!latestQR) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('QR code not available yet. Wait for the bot to generate one.')
      return
    }
    
    try {
      const qrBuffer = await QRCode.toBuffer(latestQR, { 
        type: 'png',
        width: 400,
        margin: 2
      })
      res.writeHead(200, { 
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache'
      })
      res.end(qrBuffer)
    } catch (err) {
      console.error('[Bot] Error generating QR image:', err)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Error generating QR code')
    }
    return
  }
  
  // Root endpoint - instructions
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>W Chaput WhatsApp Bot</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .qr-container { text-align: center; margin: 30px 0; }
        .qr-container img { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
        .status { padding: 10px; border-radius: 4px; margin: 20px 0; }
        .status.connected { background: #d4edda; color: #155724; }
        .status.waiting { background: #fff3cd; color: #856404; }
      </style>
    </head>
    <body>
      <h1>🤖 W Chaput WhatsApp Bot</h1>
      <div class="qr-container">
        <h2>Escanea el QR con WhatsApp</h2>
        <p>Abre WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo</p>
        <img src="/qr" alt="QR Code" onerror="this.style.display='none'; document.getElementById('error').style.display='block'">
        <p id="error" style="display:none; color: #856404;">QR no disponible aún. Espera unos segundos y recarga.</p>
      </div>
      <p><a href="/health">Ver estado del bot</a></p>
    </body>
    </html>
  `)
})

server.listen(PORT, () => {
  console.log(`[Bot] HTTP server running on port ${PORT}`)
  console.log(`[Bot] QR Code available at: http://localhost:${PORT}/qr`)
})

// ─── Message text extractor ───────────────────────────────────────────────────

function extractText(message: WAMessageContent | null | undefined): string {
  if (!message) return ''
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    ''
  ).trim()
}

// ─── Call Vercel internal API ─────────────────────────────────────────────────

async function processWithVercel(messageText: string, from: string, groupJid: string): Promise<string> {
  try {
    const res = await fetch(`${VERCEL_API_URL}/api/whatsapp/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BOT_API_KEY}`,
      },
      body: JSON.stringify({ message: messageText, from, groupJid }),
      signal: AbortSignal.timeout(25_000), // 25s timeout
    })

    if (!res.ok) {
      console.error(`[Bot] Vercel API error: ${res.status}`)
      return '❌ Error al conectar con el servidor. Intenta de nuevo.'
    }

    const data = (await res.json()) as { reply?: string }
    return data.reply ?? '❌ Respuesta vacía del servidor.'
  } catch (error) {
    console.error('[Bot] Error calling Vercel API:', error)
    return '❌ Error de conexión. Intenta de nuevo en un momento.'
  }
}

// ─── Bot startup ──────────────────────────────────────────────────────────────

async function startBot(): Promise<void> {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true })
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()

  console.log(`[Bot] Starting with Baileys v${version.join('.')}`)

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    browser: ['W Chaput Bot', 'Chrome', '1.0.0'],
    // Don't save message history (saves memory)
    getMessage: async () => undefined,
  })

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds)

  // Handle connection state
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      latestQR = qr
      console.log('\n[Bot] QR Code generado!')
      console.log(`[Bot] Abre: http://localhost:${PORT}/qr para ver el código`)
      console.log('[Bot] O escanea el QR en la terminal (modo texto):\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      latestQR = null
      console.log('[Bot] ✅ Connected to WhatsApp!')
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      console.log(`[Bot] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`)

      if (shouldReconnect) {
        // Wait 3s before reconnecting to avoid tight loops
        setTimeout(() => startBot(), 3_000)
      } else {
        console.log('[Bot] Logged out. Delete the session/ folder and restart to re-link.')
        process.exit(1)
      }
    }
  })

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only process real new messages (not history sync)
    if (type !== 'notify') return

    for (const msg of messages) {
      // Skip: sent by the bot itself or no message content
      if (msg.key.fromMe) continue
      if (!msg.message) continue

      const text = extractText(msg.message as WAMessageContent)
      if (!text) continue

      const sender = msg.key.participant ?? msg.key.remoteJid ?? 'unknown'
      const groupJid = msg.key.remoteJid!
      console.log(`[Bot] Message from ${sender}: "${text}"`)

      // Call Vercel API and reply
      const reply = await processWithVercel(text, sender, groupJid)
      await sock.sendMessage(groupJid, { text: reply }, { quoted: msg })
    }
  })
}

// Start the bot
startBot().catch((err) => {
  console.error('[Bot] Fatal error:', err)
  process.exit(1)
})
