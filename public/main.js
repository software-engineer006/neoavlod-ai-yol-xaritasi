const examples = {
  image: ['Qo‘lda yozilgan 7 raqami rasmi', '«Rasmda 7 raqami bor»'],
  text: ['Universitet e’lonining to‘liq matni', 'Sana, joy va qatnashish shartlari qisqa ro‘yxati'],
  agent: ['«Dars jadvalidagi bo‘sh vaqtni top» degan topshiriq', 'Jadvalni tekshiradi va mos vaqtlarni taklif qiladi'],
}

const controls = document.querySelector('.example-controls')
const exampleInput = document.querySelector('[data-example-input]')
const exampleOutput = document.querySelector('[data-example-output]')
controls.addEventListener('click', (event) => {
  const selected = event.target.closest('button[data-example]')
  if (!selected) return

  const [input, output] = examples[selected.dataset.example]
  exampleInput.textContent = input
  exampleOutput.textContent = output
  for (const button of controls.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button === selected))
  }
})

const form = document.querySelector('#registration-form')
const submit = form.querySelector('button[type="submit"]')
const message = form.querySelector('.form-message')
const initialLabel = submit.firstChild.textContent

function showStatus(text, state) {
  message.textContent = text
  message.dataset.state = state
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (submit.disabled || !form.reportValidity()) return

  const fields = new FormData(form)
  submit.disabled = true
  submit.firstChild.textContent = 'Ariza yuborilmoqda '
  form.setAttribute('aria-busy', 'true')
  showStatus('', '')

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fields.get('name'),
        contact: fields.get('contact'),
        website: fields.get('website'),
        consent: fields.get('consent') === 'on',
      }),
      signal: AbortSignal.timeout(12_000),
    })
    const result = await response.json()
    if (response.ok && result.ok === true) {
      form.reset()
      showStatus('Arizangiz yuborildi. O‘quv markazi siz bilan bog‘lanadi.', 'success')
    } else {
      showStatus(result.error ?? 'Ariza yuborilmadi. Qayta urinib ko‘ring.', 'error')
    }
  } catch {
    showStatus('Ulanishda muammo yuz berdi. Qayta urinib ko‘ring.', 'error')
  } finally {
    form.removeAttribute('aria-busy')
    submit.disabled = false
    submit.firstChild.textContent = initialLabel
  }
})
