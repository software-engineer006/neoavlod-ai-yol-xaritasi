const maxBodyBytes = 4096
const maxAttempts = 5
const windowMs = 60_000
const attempts = new Map()

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M} .ʻʼ‘’'-]{1,79}$/u
const phonePattern = /^\+?[0-9 ()-]+$/

function json(status, payload, headers = {}) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

function normalizePhone(value) {
  if (!phonePattern.test(value)) return null

  const digits = value.replace(/\D/g, '')
  if (!value.startsWith('+') && digits.length === 9) return `+998${digits}`
  if (digits.length >= 10 && digits.length <= 15 && digits[0] !== '0') return `+${digits}`
  return null
}

async function readJson(request) {
  if (!request.body) throw new SyntaxError('Missing body')
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let length = 0
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > maxBodyBytes) {
      void reader.cancel()
      throw new RangeError('Request too large')
    }
    text += decoder.decode(value, { stream: true })
  }
  return JSON.parse(text + decoder.decode())
}

function allowAttempt(ip) {
  const now = Date.now()
  for (const [key, entry] of attempts) {
    if (entry.expires <= now) attempts.delete(key)
  }
  const entry = attempts.get(ip)
  if (entry) {
    if (entry.count >= maxAttempts) return false
    entry.count++
    return true
  }
  if (attempts.size >= 4096) return false
  attempts.set(ip, { count: 1, expires: now + windowMs })
  return true
}

export async function register(request, env, send = fetch) {
  if (request.method !== 'POST') {
    return json(405, { error: 'Bu so‘rov usuli ishlamaydi.' }, { Allow: 'POST' })
  }
  const origin = request.headers.get('origin')
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
      (origin && origin !== new URL(request.url).origin)) {
    return json(403, { error: 'Arizani saytning o‘zidan yuboring.' })
  }
  const type = request.headers.get('content-type')?.split(';')[0].trim()
  if (type !== 'application/json') return json(415, { error: 'So‘rov formati yaroqsiz.' })

  const token = env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = env.admin_tg_id?.trim()
  if (!token || !/^\d+:[\w-]+$/.test(token) || !/^-?\d+$/.test(chatId ?? '')) {
    return json(503, { error: 'Ariza qabul qilish xizmati hozircha faol emas. Keyinroq urinib ko‘ring.' })
  }
  if (!allowAttempt(request.headers.get('cf-connecting-ip') ?? 'local')) {
    return json(429, { error: 'Bir daqiqa kutib, qayta urinib ko‘ring.' }, { 'Retry-After': '60' })
  }

  let data
  try {
    data = await readJson(request)
  } catch (error) {
    return error instanceof RangeError
      ? json(413, { error: 'So‘rov hajmi juda katta.' })
      : json(400, { error: 'So‘rovni o‘qib bo‘lmadi.' })
  }

  const name = typeof data?.name === 'string' ? data.name.trim().replace(/ +/g, ' ') : ''
  const phone = typeof data?.contact === 'string' && data.contact.length <= 48
    ? normalizePhone(data.contact.trim()) : null

  if (data?.website || !namePattern.test(name) || !phone || data?.consent !== true) {
    return json(422, { error: 'Ism, telefon raqami va rozilikni tekshiring.' })
  }

  const message = [
    'Neoavlod · AI kursiga yangi ariza',
    '',
    `Ism: ${name}`,
    `Telefon: ${phone}`,
    'Manba: AI yo‘l xaritasi',
  ].join('\n')

  try {
    const response = await send(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        link_preview_options: { is_disabled: true },
        protect_content: true,
      }),
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    })
    const result = await response.json()
    if (response.ok && result.ok === true) return json(200, { ok: true })
  } catch {
    // Return a safe message without logging the token or applicant details.
  }

  return json(502, { error: 'Ariza yetkazilgani tasdiqlanmadi. Birozdan keyin qayta urinib ko‘ring.' })
}
