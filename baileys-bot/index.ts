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

// ─── Config ───────────────────────────────────────────────────────────────────

const VERCEL_API_URL = process.env.VERCEL_API_URL
const BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY
const SESSION_DIR = join(process.cwd(), 'session')

if (!VERCEL_API_URL || !BOT_API_KEY) {
  console.error('[Bot] Missing VERCEL_API_URL or WHATSAPP_BOT_API_KEY env vars')
  process.exit(1)
}

// Minimal logger (suppress Baileys debug noise)
const logger = pino({ level: 'warn' })

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
      console.log('\n[Bot] Escanea este QR con WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
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
