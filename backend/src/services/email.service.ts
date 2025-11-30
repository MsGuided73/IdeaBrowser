/**
 * Email Service
 * Handles sending verification and password reset emails
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Create email transporter
const createTransporter = () => {
  if (env.NODE_ENV === 'development') {
    // Use a test service like Ethereal for development
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: env.EMAIL_USER || 'test@example.com',
        pass: env.EMAIL_PASS || 'testpass',
      },
    });
  }

  // Production email configuration
  return nodemailer.createTransporter({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
};

/**
 * Send email verification
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const transporter = createTransporter();

  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: env.EMAIL_FROM || 'noreply@bizwiz.com',
    to: email,
    subject: 'Verify your BizWiz account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to BizWiz NeuroBoard!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>

        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>

        <p>This link will expire in 24 hours.</p>

        <p>If you didn't create an account, please ignore this email.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          BizWiz NeuroBoard - AI-Powered Business Idea Generation
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Verification email sent', { email });
  } catch (error) {
    logger.error('Failed to send verification email', { error, email });
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const transporter = createTransporter();

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: env.EMAIL_FROM || 'noreply@bizwiz.com',
    to: email,
    subject: 'Reset your BizWiz password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>You requested a password reset for your BizWiz account. Click the button below to reset your password:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>

        <p>This link will expire in 1 hour.</p>

        <p>If you didn't request a password reset, please ignore this email.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          BizWiz NeuroBoard - AI-Powered Business Idea Generation
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent', { email });
  } catch (error) {
    logger.error('Failed to send password reset email', { error, email });
    throw error;
  }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: env.EMAIL_FROM || 'noreply@bizwiz.com',
    to: email,
    subject: 'Welcome to BizWiz NeuroBoard!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to BizWiz NeuroBoard, ${name}!</h2>

        <p>Your email has been verified and your account is now active. You can now:</p>

        <ul style="line-height: 1.6;">
          <li>Generate innovative business ideas with AI</li>
          <li>Create interactive whiteboards for brainstorming</li>
          <li>Save and organize your business concepts</li>
          <li>Access trend analysis and market insights</li>
          <li>Collaborate with others on your ideas</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${env.FRONTEND_URL}/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Get Started
          </a>
        </div>

        <p>Need help? Check out our <a href="${env.FRONTEND_URL}/help" style="color: #2563eb;">help center</a> or contact support.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          BizWiz NeuroBoard - AI-Powered Business Idea Generation
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Welcome email sent', { email, name });
  } catch (error) {
    logger.error('Failed to send welcome email', { error, email });
    // Don't throw error for welcome emails
  }
}
