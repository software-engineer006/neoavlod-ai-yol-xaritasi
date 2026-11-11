const controls = document.querySelector('.example-controls')
const exampleButtons = controls.querySelectorAll('button[aria-controls]')

controls.addEventListener('click', (event) => {
  const selected = event.target.closest('button[aria-controls]')
  if (!selected) return

  for (const button of exampleButtons) {
    const isSelected = button === selected
    button.setAttribute('aria-pressed', String(isSelected))
    document.getElementById(button.getAttribute('aria-controls')).hidden = !isSelected
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
