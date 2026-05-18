import { logger } from '@/lib/logger';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

interface SMSProvider {
  name: string;
  send(to: string, message: string): Promise<SMSResult>;
  supports(phoneNumber: string): boolean;
}

class AfricasTalkingProvider implements SMSProvider {
  name = 'africastalking';
  private apiKey = process.env.AFRICASTALKING_API_KEY || '';
  private username = process.env.AFRICASTALKING_USERNAME || '';
  private baseUrl = 'https://api.africastalking.com/version1/messaging';

  supports(phone: string): boolean {
    const africanPrefixes = ['+254', '+255', '+256', '+233', '+234', '+27', '+237', '+225', '+221', '+250', '+251', '+260', '+263', '+267'];
    return africanPrefixes.some((prefix) => phone.startsWith(prefix));
  }

  async send(to: string, message: string): Promise<SMSResult> {
    if (!this.apiKey || !this.username) {
      return { success: false, provider: this.name, error: "Africa's Talking not configured" };
    }

    try {
      const body = new URLSearchParams({ username: this.username, to, message });
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          apiKey: this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      const data = await response.json();
      const recipient = data?.SMSMessageData?.Recipients?.[0];

      if (recipient?.status === 'Success' || recipient?.statusCode === 101) {
        return { success: true, provider: this.name, messageId: recipient.messageId };
      }

      return { success: false, provider: this.name, error: recipient?.status || 'Unknown error' };
    } catch (error) {
      return { success: false, provider: this.name, error: error instanceof Error ? error.message : 'Request failed' };
    }
  }
}

class TwilioProvider implements SMSProvider {
  name = 'twilio';
  private accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  private authToken = process.env.TWILIO_AUTH_TOKEN || '';
  private fromNumber = process.env.TWILIO_FROM_NUMBER || '';

  supports(): boolean {
    return true;
  }

  async send(to: string, message: string): Promise<SMSResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return { success: false, provider: this.name, error: 'Twilio not configured' };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const body = new URLSearchParams({ To: to, From: this.fromNumber, Body: message });
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      const data = await response.json();
      if (data.sid) {
        return { success: true, provider: this.name, messageId: data.sid };
      }
      return { success: false, provider: this.name, error: data.message || 'Unknown error' };
    } catch (error) {
      return { success: false, provider: this.name, error: error instanceof Error ? error.message : 'Request failed' };
    }
  }
}

const providers: SMSProvider[] = [new AfricasTalkingProvider(), new TwilioProvider()];

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const normalized = to.replace(/\s+/g, '').replace(/^00/, '+');
  if (!normalized.startsWith('+') || normalized.length < 10) {
    return { success: false, provider: 'none', error: 'Invalid phone number format' };
  }

  for (const provider of providers) {
    if (!provider.supports(normalized)) continue;
    const result = await provider.send(normalized, message);
    if (result.success) {
      logger.info(`[SMS] Sent via ${result.provider} to ${normalized.slice(0, 7)}***`);
      return result;
    }
    logger.warn(`[SMS] ${provider.name} failed: ${result.error}`);
  }

  return { success: false, provider: 'none', error: 'All SMS providers failed or unconfigured' };
}

export async function sendReceiptSMS(to: string, receipt: {
  merchantName: string;
  amount: string;
  currency: string;
  txHash?: string;
}): Promise<SMSResult> {
  const shortTx = receipt.txHash ? `${receipt.txHash.slice(0, 10)}...` : '';
  const message = `VFIDE Receipt\n${receipt.merchantName}\nAmount: ${receipt.currency} ${receipt.amount}\n${shortTx ? `Tx: ${shortTx}` : ''}\nThank you!`;
  return sendSMS(to, message);
}

export async function sendRemittanceNotification(to: string, data: {
  senderName: string;
  amount: string;
  currency: string;
}): Promise<SMSResult> {
  return sendSMS(to, `${data.senderName} sent you ${data.currency} ${data.amount} via VFIDE. Funds are in your account.`);
}
