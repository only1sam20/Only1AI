import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

@Injectable()
export class AuthEmailService implements OnModuleInit {
  private readonly logger = new Logger(AuthEmailService.name);

  onModuleInit(): void {
    if (process.env.NODE_ENV !== 'production') return;
    if (!process.env.RESEND_API_KEY?.trim() || !process.env.EMAIL_FROM?.trim()) {
      throw new Error('RESEND_API_KEY and EMAIL_FROM are required when NODE_ENV is production.');
    }
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const verificationUrl = this.buildVerificationUrl(token);
    await this.sendTransactionalEmail({
      email,
      subject: 'Verify your Only1AI email address',
      html: this.renderVerificationEmail(verificationUrl),
      text: `Verify your Only1AI email address: ${verificationUrl}`,
      developmentPurpose: 'email verification',
      developmentUrl: verificationUrl,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = this.buildPasswordResetUrl(token);
    await this.sendTransactionalEmail({
      email,
      subject: 'Reset your Only1AI password',
      html: this.renderPasswordResetEmail(resetUrl),
      text: `Reset your Only1AI password: ${resetUrl}`,
      developmentPurpose: 'password reset',
      developmentUrl: resetUrl,
    });
  }

  private async sendTransactionalEmail({
    email,
    subject,
    html,
    text,
    developmentPurpose,
    developmentUrl,
  }: {
    email: string;
    subject: string;
    html: string;
    text: string;
    developmentPurpose: string;
    developmentUrl: string;
  }): Promise<void> {
    const resendApiKey = process.env.RESEND_API_KEY?.trim();

    if (!resendApiKey) {
      this.handleDevelopmentFallback(email, developmentPurpose, developmentUrl);
      return;
    }

    const emailFrom = process.env.EMAIL_FROM?.trim();
    if (!emailFrom) {
      throw new Error('EMAIL_FROM must be configured when RESEND_API_KEY is set.');
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10_000);

    try {
      const response = await fetch(RESEND_EMAILS_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [email],
          subject,
          html,
          text,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Resend rejected verification email (${response.status}): ${responseBody.slice(0, 500)}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildVerificationUrl(token: string): string {
    return this.buildWebUrl('/verify-email', token);
  }

  private buildPasswordResetUrl(token: string): string {
    return this.buildWebUrl('/reset-password', token);
  }

  private buildWebUrl(pathname: string, token: string): string {
    const webOrigin = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${webOrigin}${pathname}?token=${encodeURIComponent(token)}`;
  }

  private handleDevelopmentFallback(email: string, purpose: string, url: string): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`RESEND_API_KEY must be configured in production to send ${purpose} email.`);
    }

    // Tokens are intentionally exposed only in a non-production server log so
    // local development remains usable before a sending domain is configured.
    this.logger.warn(`Resend is not configured. Development ${purpose} link for ${email}: ${url}`);
  }

  private renderVerificationEmail(verificationUrl: string): string {
    const escapedUrl = this.escapeUrlForHtml(verificationUrl);
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<body style="font-family:Arial,sans-serif;background:#08111f;color:#e8eef8;padding:32px">',
      '<main style="max-width:560px;margin:auto;background:#101d31;border-radius:16px;padding:32px">',
      '<h1 style="margin-top:0">Welcome to Only1AI</h1>',
      '<p>Confirm your email address to activate your workspace.</p>',
      `<p><a href="${escapedUrl}" style="display:inline-block;background:#64e6bf;color:#082119;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Verify email address</a></p>`,
      '<p style="font-size:13px;color:#b6c2d4">If you did not create an Only1AI account, you can safely ignore this email.</p>',
      '</main>',
      '</body>',
      '</html>',
    ].join('');
  }

  private renderPasswordResetEmail(resetUrl: string): string {
    const escapedUrl = this.escapeUrlForHtml(resetUrl);
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<body style="font-family:Arial,sans-serif;background:#08111f;color:#e8eef8;padding:32px">',
      '<main style="max-width:560px;margin:auto;background:#101d31;border-radius:16px;padding:32px">',
      '<h1 style="margin-top:0">Reset your Only1AI password</h1>',
      '<p>Use the secure link below to choose a new password. This link expires in one hour.</p>',
      `<p><a href="${escapedUrl}" style="display:inline-block;background:#64e6bf;color:#082119;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Reset password</a></p>`,
      '<p style="font-size:13px;color:#b6c2d4">If you did not request a password reset, you can safely ignore this email.</p>',
      '</main>',
      '</body>',
      '</html>',
    ].join('');
  }

  private escapeUrlForHtml(url: string): string {
    return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
