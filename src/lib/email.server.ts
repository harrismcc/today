import { Resend } from 'resend'
import { env } from 'cloudflare:workers'

type AuthEmail = {
  subject: string
  text: string
  to: string
}

export async function sendAuthEmail({ subject, text, to }: AuthEmail) {
  const resend = new Resend(env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: env.AUTH_EMAIL_FROM,
    to,
    subject,
    text,
  })

  if (error) throw new Error(`Resend could not send email: ${error.message}`)
}
