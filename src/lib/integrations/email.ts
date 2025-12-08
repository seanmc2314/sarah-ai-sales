import nodemailer from 'nodemailer'
import { Attachment } from 'nodemailer/lib/mailer'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromName?: string
  fromEmail?: string
}

export interface EmailTemplate {
  subject: string
  htmlBody: string
  textBody: string
  attachments?: Attachment[]
}

export interface EmailRecipient {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  customFields?: Record<string, string>
}

export class EmailService {
  private transporter: nodemailer.Transporter
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password
      }
    })
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email service verification failed:', error)
      return false
    }
  }

  private personalizeContent(content: string, recipient: EmailRecipient): string {
    let personalized = content

    // Replace common placeholders
    personalized = personalized.replace(/{{firstName}}/g, recipient.firstName || '')
    personalized = personalized.replace(/{{lastName}}/g, recipient.lastName || '')
    personalized = personalized.replace(/{{fullName}}/g,
      `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim())
    personalized = personalized.replace(/{{company}}/g, recipient.company || '')
    personalized = personalized.replace(/{{email}}/g, recipient.email)

    // Replace custom fields
    if (recipient.customFields) {
      Object.entries(recipient.customFields).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g')
        personalized = personalized.replace(placeholder, value)
      })
    }

    return personalized
  }

  async sendEmail(
    recipient: EmailRecipient,
    template: EmailTemplate,
    options?: {
      replyTo?: string
      trackOpens?: boolean
      scheduledAt?: Date
    }
  ): Promise<string> {
    try {
      const personalizedSubject = this.personalizeContent(template.subject, recipient)
      const personalizedHtml = this.personalizeContent(template.htmlBody, recipient)
      const personalizedText = this.personalizeContent(template.textBody, recipient)

      const mailOptions = {
        from: {
          name: this.config.fromName || 'Sarah AI',
          address: this.config.fromEmail || this.config.user
        },
        to: recipient.email,
        subject: personalizedSubject,
        text: personalizedText,
        html: personalizedHtml,
        attachments: template.attachments,
        replyTo: options?.replyTo
      }

      const result = await this.transporter.sendMail(mailOptions)
      return result.messageId
    } catch (error) {
      console.error('Failed to send email:', error)
      throw new Error(`Failed to send email to ${recipient.email}`)
    }
  }

  async sendBulkEmails(
    recipients: EmailRecipient[],
    template: EmailTemplate,
    options?: {
      batchSize?: number
      delayBetweenBatches?: number
      replyTo?: string
    }
  ): Promise<{
    successful: string[]
    failed: { email: string; error: string }[]
  }> {
    const batchSize = options?.batchSize || 10
    const delay = options?.delayBetweenBatches || 5000
    const results = {
      successful: [] as string[],
      failed: [] as { email: string; error: string }[]
    }

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      const batchPromises = batch.map(async (recipient) => {
        try {
          const messageId = await this.sendEmail(recipient, template, options)
          results.successful.push(recipient.email)
          return { success: true, email: recipient.email, messageId }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          results.failed.push({ email: recipient.email, error: errorMessage })
          return { success: false, email: recipient.email, error: errorMessage }
        }
      })

      await Promise.allSettled(batchPromises)

      // Delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return results
  }

  async createVideoEmailTemplate(
    videoUrl: string,
    personalMessage: string,
    callToAction: string
  ): Promise<EmailTemplate> {
    const subject = '{{firstName}}, here\'s a personalized message from Sarah AI'

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Personal Message from Sarah AI</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2c3e50;">Hi {{firstName}},</h2>

              <p>${personalMessage}</p>

              <div style="text-align: center; margin: 30px 0;">
                  <video width="400" height="300" controls poster="${videoUrl.replace('.mp4', '_thumbnail.jpg')}">
                      <source src="${videoUrl}" type="video/mp4">
                      Your browser does not support the video tag.
                  </video>
              </div>

              <p>${callToAction}</p>

              <div style="text-align: center; margin: 30px 0;">
                  <a href="https://calendly.com/your-calendar-link"
                     style="background-color: #3498db; color: white; padding: 12px 30px;
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                      Schedule a Free Consultation
                  </a>
              </div>

              <p style="margin-top: 30px;">Best regards,<br>
              Sarah AI<br>
              Supreme One Training</p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #666;">
                  This email was sent to {{email}}. If you'd prefer not to receive these emails,
                  <a href="#unsubscribe">click here to unsubscribe</a>.
              </p>
          </div>
      </body>
      </html>
    `

    const textBody = `
Hi {{firstName}},

${personalMessage}

I've created a personal video message for you: ${videoUrl}

${callToAction}

To schedule a free consultation, visit: https://calendly.com/your-calendar-link

Best regards,
Sarah AI
Supreme One Training

---
This email was sent to {{email}}. Reply STOP to unsubscribe.
    `

    return {
      subject,
      htmlBody,
      textBody
    }
  }
}