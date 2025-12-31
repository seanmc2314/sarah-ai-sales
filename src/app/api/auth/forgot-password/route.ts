import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a temporary password has been sent.'
      })
    }

    // Generate temporary password
    const tempPassword = generateTempPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    // Generate reset token (for additional security)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Update user with temp password and reset info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
        mustChangePassword: true
      }
    })

    // Send email with temporary password
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.office365.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'sarahai@supremeone.net',
        pass: process.env.EMAIL_PASSWORD || process.env.SARAH_EMAIL_PASSWORD
      }
    })

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://supremeone.net/assets/logo.png" alt="Supreme One" style="height: 60px; width: auto;">
        </div>

        <h2 style="color: #1e40af; margin-bottom: 20px;">Password Reset Request</h2>

        <p>Hi ${user.name || 'there'},</p>

        <p>We received a request to reset your password for Supreme One CRM. Here is your temporary password:</p>

        <div style="background: linear-gradient(135deg, #1e40af, #dc2626); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
          <p style="margin: 0; font-size: 14px;">Your Temporary Password</p>
          <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</p>
        </div>

        <p><strong>Important:</strong></p>
        <ul>
          <li>This temporary password expires in <strong>1 hour</strong></li>
          <li>You will be prompted to create a new password after logging in</li>
          <li>If you did not request this reset, please contact support immediately</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:4000'}/auth/signin"
             style="background: linear-gradient(135deg, #1e40af, #dc2626); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Sign In Now
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #666; text-align: center;">
          This email was sent from Supreme One CRM.<br>
          © ${new Date().getFullYear()} Supreme One Dealer Services. All rights reserved.
        </p>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: {
        name: 'Sarah AI - Supreme One',
        address: process.env.EMAIL_USER || 'sarahai@supremeone.net'
      },
      to: user.email,
      subject: 'Your Supreme One CRM Password Reset',
      html: emailHtml,
      text: `
Password Reset Request

Hi ${user.name || 'there'},

We received a request to reset your password for Supreme One CRM.

Your Temporary Password: ${tempPassword}

Important:
- This temporary password expires in 1 hour
- You will be prompted to create a new password after logging in
- If you did not request this reset, please contact support immediately

Sign in at: ${process.env.NEXTAUTH_URL || 'http://localhost:4000'}/auth/signin

© ${new Date().getFullYear()} Supreme One Dealer Services. All rights reserved.
      `
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a temporary password has been sent.'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
