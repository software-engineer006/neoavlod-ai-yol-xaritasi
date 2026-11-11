import assert from 'node:assert/strict'
import { test } from 'node:test'
import { register } from './registration.mjs'

const url = 'https://registration.example/api/register'
const env = { TELEGRAM_BOT_TOKEN: '123456:fake-token-for-test', admin_tg_id: '1234' }
const applicant = { name: 'Sinov O‘quvchi', contact: '90 123 45 67', consent: true }
let nextIP = 0

function request(data, headers = {}, ip = `test-${nextIP++}`) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip, ...headers },
    body: JSON.stringify(data),
  })
}

test('returns success after Telegram confirms delivery to the configured chat', async () => {
  const result = await register(request(applicant), env, async (destination, options) => {
    assert.equal(destination, 'https://api.telegram.org/bot123456:fake-token-for-test/sendMessage')
    const payload = JSON.parse(options.body)
    assert.equal(payload.chat_id, env.admin_tg_id)
    assert.match(payload.text, /Sinov O‘quvchi/)
    assert.match(payload.text, /Telefon: \+998901234567/)
    assert.equal(payload.protect_content, true)
    return Response.json({ ok: true })
  })
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), { ok: true })
})

test('rejects absent consent, invalid contact, and cross-origin submissions', async () => {
  const neverSend = async () => assert.fail('Unexpected Telegram request')
  assert.equal((await register(request({ ...applicant, consent: false }), env, neverSend)).status, 422)
  assert.equal((await register(request({ ...applicant, contact: '@sample_user' }), env, neverSend)).status, 422)
  assert.equal((await register(request(applicant, { Origin: 'https://unrelated.example' }), env, neverSend)).status, 403)
})

test('returns useful failure states for missing admin and Telegram rejection', async () => {
  const unconfigured = await register(request(applicant), { ...env, admin_tg_id: '' })
  assert.equal(unconfigured.status, 503)

  const rejected = await register(request({ ...applicant, contact: '+998 90 123 45 67' }), env, async () => {
    return Response.json({ ok: false }, { status: 403 })
  })
  assert.equal(rejected.status, 502)
  assert.equal((await rejected.json()).ok, undefined)
})

test('rejects large bodies and limits repeated requests', async () => {
  const neverSend = async () => assert.fail('Unexpected Telegram request')
  const large = await register(request({ ...applicant, website: 'a'.repeat(5000) }), env, neverSend)
  assert.equal(large.status, 413)

  const send = async () => Response.json({ ok: true })
  for (let count = 0; count < 5; count++) {
    assert.equal((await register(request(applicant, {}, 'rate-test'), env, send)).status, 200)
  }
  assert.equal((await register(request(applicant, {}, 'rate-test'), env, neverSend)).status, 429)
})
