/**
 * VFIDE Developer SDK
 * 
 * Embeddable widgets and API for third-party integrations.
 * Provides payment buttons, donation widgets, and subscription handling.
 */

// ============================================================================
// Types
// ============================================================================

export interface VFIDEConfig {
  apiKey?: string;
  environment: 'mainnet' | 'testnet';
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
}

export interface PaymentRequest {
  recipient: string;
  amount: string;
  token?: string;
  chainId?: number;
  description?: string;
  metadata?: Record<string, string>;
  callbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  chainId?: number;
  error?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionConfig {
  recipient: string;
  amount: string;
  token?: string;
  interval: 'daily' | 'weekly' | 'monthly';
  description?: string;
  trialDays?: number;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: 'active' | 'cancelled' | 'paused';
  nextPaymentDate: number;
  streamId?: string;
}

export interface DonationConfig {
  recipient: string;
  suggestedAmounts?: string[];
  allowCustom?: boolean;
  token?: string;
  message?: string;
}

export interface WidgetOptions {
  container: HTMLElement | string;
  width?: string;
  height?: string;
  borderRadius?: string;
  showBranding?: boolean;
}

// ============================================================================
// Events
// ============================================================================

type PaymentEventType = 'payment:started' | 'payment:completed' | 'payment:failed' | 'payment:cancelled';
type SubscriptionEventType = 'subscription:created' | 'subscription:cancelled' | 'subscription:renewed';
type EventType = PaymentEventType | SubscriptionEventType | 'widget:loaded' | 'widget:error';

interface EventPayload {
  type: EventType;
  data: unknown;
  timestamp: number;
}

type EventCallback = (payload: EventPayload) => void;

// ============================================================================
// SDK Core
// ============================================================================

class VFIDESDK {
  private config: VFIDEConfig;
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private isInitialized = false;

  constructor() {
    this.config = {
      environment: 'mainnet',
      theme: 'auto',
    };
  }

  /**
   * Initialize the SDK
   */
  init(config: VFIDEConfig): void {
    this.config = { ...this.config, ...config };
    this.isInitialized = true;
    this.emit('widget:loaded', { config: this.config });
  }

  /**
   * Subscribe to events
   */
  on(event: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an event
   */
  private emit(type: EventType, data: unknown): void {
    const payload: EventPayload = { type, data, timestamp: Date.now() };
    this.listeners.get(type)?.forEach((callback) => callback(payload));
  }

  /**
   * Create a payment button
   */
  createPaymentButton(
    request: PaymentRequest,
    options: WidgetOptions
  ): { destroy: () => void } {
    const container = this.getContainer(options.container);
    if (!container) {
      throw new Error('Container not found');
    }

    // Create button element with explicit DOM nodes to avoid HTML parsing sinks.
    const button = document.createElement('button');
    button.className = 'vfide-payment-button';
    const svgNs = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(svgNs, 'svg');
    icon.setAttribute('width', '20');
    icon.setAttribute('height', '20');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    ['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'].forEach((d) => {
      const path = document.createElementNS(svgNs, 'path');
      path.setAttribute('d', d);
      icon.appendChild(path);
    });
    button.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = `Pay ${request.amount} ${request.token || 'ETH'}`;
    button.appendChild(label);

    this.applyStyles(button, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#fff',
      backgroundColor: this.config.primaryColor || '#6366f1',
      border: 'none',
      borderRadius: options.borderRadius || '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = 'none';
    });

    button.addEventListener('click', async () => {
      await this.processPayment(request);
    });

    container.appendChild(button);

    return {
      destroy: () => {
        button.remove();
      },
    };
  }

  /**
   * Create a donation widget
   */
  createDonationWidget(
    donation: DonationConfig,
    options: WidgetOptions
  ): { destroy: () => void } {
    const container = this.getContainer(options.container);
    if (!container) {
      throw new Error('Container not found');
    }

    const widget = document.createElement('div');
    widget.className = 'vfide-donation-widget';

    const amounts = donation.suggestedAmounts || ['1', '5', '10', '25'];
    const tokenLabel = donation.token || 'ETH';

    const headerWrap = document.createElement('div');
    headerWrap.className = 'vfide-donation-header';
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = donation.message || 'Support us';
    headerWrap.appendChild(headerTitle);
    widget.appendChild(headerWrap);

    const amountWrap = document.createElement('div');
    amountWrap.className = 'vfide-donation-amounts';
    amounts.forEach((amt) => {
      const amountButton = document.createElement('button');
      amountButton.className = 'vfide-amount-btn';
      amountButton.dataset.amount = amt;
      amountButton.textContent = `${amt} ${tokenLabel}`;
      amountWrap.appendChild(amountButton);
    });
    if (donation.allowCustom !== false) {
      const custom = document.createElement('input');
      custom.type = 'number';
      custom.className = 'vfide-custom-amount';
      custom.placeholder = 'Custom';
      custom.min = '0';
      custom.step = '0.01';
      amountWrap.appendChild(custom);
    }
    widget.appendChild(amountWrap);

    const donateButton = document.createElement('button');
    donateButton.className = 'vfide-donate-btn';
    donateButton.textContent = 'Donate';
    widget.appendChild(donateButton);

    if (options.showBranding !== false) {
      const branding = document.createElement('div');
      branding.className = 'vfide-branding';
      branding.textContent = 'Powered by VFIDE';
      widget.appendChild(branding);
    }

    this.applyStyles(widget, {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '24px',
      backgroundColor: this.config.theme === 'dark' ? '#1a1a2e' : '#fff',
      color: this.config.theme === 'dark' ? '#fff' : '#1a1a2e',
      borderRadius: options.borderRadius || '16px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
      width: options.width || '320px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    // Style child elements
    const header = widget.querySelector('.vfide-donation-header h3') as HTMLElement;
    if (header) {
      this.applyStyles(header, {
        margin: '0',
        fontSize: '18px',
        fontWeight: '600',
      });
    }

    const amountContainer = widget.querySelector('.vfide-donation-amounts') as HTMLElement;
    if (amountContainer) {
      this.applyStyles(amountContainer, {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
      });
    }

    widget.querySelectorAll('.vfide-amount-btn').forEach((btn) => {
      const el = btn as HTMLElement;
      this.applyStyles(el, {
        padding: '12px',
        border: `2px solid ${this.config.primaryColor || '#6366f1'}`,
        borderRadius: '8px',
        backgroundColor: 'transparent',
        color: this.config.primaryColor || '#6366f1',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
      });
    });

    const customInput = widget.querySelector('.vfide-custom-amount') as HTMLInputElement;
    if (customInput) {
      this.applyStyles(customInput, {
        padding: '12px',
        border: `2px solid ${this.config.theme === 'dark' ? '#333' : '#e5e7eb'}`,
        borderRadius: '8px',
        backgroundColor: 'transparent',
        color: this.config.theme === 'dark' ? '#fff' : '#1a1a2e',
        fontSize: '14px',
        outline: 'none',
      });
    }

    const donateBtn = widget.querySelector('.vfide-donate-btn') as HTMLElement;
    if (donateBtn) {
      this.applyStyles(donateBtn, {
        padding: '14px',
        backgroundColor: this.config.primaryColor || '#6366f1',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      });
    }

    const branding = widget.querySelector('.vfide-branding') as HTMLElement;
    if (branding) {
      this.applyStyles(branding, {
        textAlign: 'center',
        fontSize: '12px',
        color: this.config.theme === 'dark' ? '#666' : '#9ca3af',
      });
    }

    // Add interactivity
    let selectedAmount = amounts[0];

    widget.querySelectorAll('.vfide-amount-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        widget.querySelectorAll('.vfide-amount-btn').forEach((b) => {
          (b as HTMLElement).style.backgroundColor = 'transparent';
          (b as HTMLElement).style.color = this.config.primaryColor || '#6366f1';
        });
        (btn as HTMLElement).style.backgroundColor = this.config.primaryColor || '#6366f1';
        (btn as HTMLElement).style.color = '#fff';
        selectedAmount = (btn as HTMLElement).dataset.amount || amounts[0];
        if (customInput) customInput.value = '';
      });
    });

    if (customInput) {
      customInput.addEventListener('input', () => {
        if (customInput.value) {
          selectedAmount = customInput.value;
          widget.querySelectorAll('.vfide-amount-btn').forEach((b) => {
            (b as HTMLElement).style.backgroundColor = 'transparent';
            (b as HTMLElement).style.color = this.config.primaryColor || '#6366f1';
          });
        }
      });
    }

    donateBtn?.addEventListener('click', async () => {
      if (!selectedAmount) return;
      await this.processPayment({
        recipient: donation.recipient,
        amount: selectedAmount,
        token: donation.token,
        description: 'Donation',
      });
    });

    container.appendChild(widget);

    return {
      destroy: () => {
        widget.remove();
      },
    };
  }

  /**
   * Create a subscription widget
   */
  createSubscriptionWidget(
    subscription: SubscriptionConfig,
    options: WidgetOptions
  ): { destroy: () => void } {
    const container = this.getContainer(options.container);
    if (!container) {
      throw new Error('Container not found');
    }

    const widget = document.createElement('div');
    widget.className = 'vfide-subscription-widget';

    const intervalText = {
      daily: 'per day',
      weekly: 'per week',
      monthly: 'per month',
    }[subscription.interval];

    const subHeader = document.createElement('div');
    subHeader.className = 'vfide-sub-header';

    const subTitle = document.createElement('h3');
    subTitle.textContent = subscription.description || 'Subscribe';
    subHeader.appendChild(subTitle);

    const subPrice = document.createElement('div');
    subPrice.className = 'vfide-sub-price';

    const amountSpan = document.createElement('span');
    amountSpan.className = 'vfide-amount';
    amountSpan.textContent = subscription.amount;
    subPrice.appendChild(amountSpan);

    const tokenSpan = document.createElement('span');
    tokenSpan.className = 'vfide-token';
    tokenSpan.textContent = subscription.token || 'ETH';
    subPrice.appendChild(tokenSpan);

    const intervalSpan = document.createElement('span');
    intervalSpan.className = 'vfide-interval';
    intervalSpan.textContent = intervalText;
    subPrice.appendChild(intervalSpan);

    subHeader.appendChild(subPrice);
    widget.appendChild(subHeader);

    if (subscription.trialDays) {
      const trial = document.createElement('div');
      trial.className = 'vfide-trial';
      trial.textContent = `${subscription.trialDays}-day free trial`;
      widget.appendChild(trial);
    }

    const subscribeButton = document.createElement('button');
    subscribeButton.className = 'vfide-subscribe-btn';
    subscribeButton.textContent = 'Subscribe with VFIDE';
    widget.appendChild(subscribeButton);

    const termsText = document.createElement('p');
    termsText.className = 'vfide-sub-terms';
    termsText.textContent = 'Payments stream continuously. Cancel anytime.';
    widget.appendChild(termsText);

    this.applyStyles(widget, {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '24px',
      backgroundColor: this.config.theme === 'dark' ? '#1a1a2e' : '#fff',
      color: this.config.theme === 'dark' ? '#fff' : '#1a1a2e',
      borderRadius: options.borderRadius || '16px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
      width: options.width || '320px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center',
    });

    const priceAmount = widget.querySelector('.vfide-amount') as HTMLElement;
    if (priceAmount) {
      this.applyStyles(priceAmount, {
        fontSize: '36px',
        fontWeight: '700',
        color: this.config.primaryColor || '#6366f1',
      });
    }

    const subscribeBtn = widget.querySelector('.vfide-subscribe-btn') as HTMLElement;
    if (subscribeBtn) {
      this.applyStyles(subscribeBtn, {
        padding: '14px',
        backgroundColor: this.config.primaryColor || '#6366f1',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
      });

      subscribeBtn.addEventListener('click', async () => {
        await this.createSubscription(subscription);
      });
    }

    const terms = widget.querySelector('.vfide-sub-terms') as HTMLElement;
    if (terms) {
      this.applyStyles(terms, {
        margin: '0',
        fontSize: '12px',
        color: this.config.theme === 'dark' ? '#666' : '#9ca3af',
      });
    }

    container.appendChild(widget);

    return {
      destroy: () => {
        widget.remove();
      },
    };
  }

  /**
   * Process a payment
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.emit('payment:started', request);

    try {
      // Open VFIDE payment modal or redirect
      const paymentUrl = this.buildPaymentUrl(request);
      
      // In production, this would open a modal or use postMessage
      const result = await this.openPaymentWindow(paymentUrl);
      
      this.emit('payment:completed', result);
      return result;
    } catch (error) {
      const result: PaymentResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
      this.emit('payment:failed', result);
      return result;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(config: SubscriptionConfig): Promise<SubscriptionResult> {
    this.emit('subscription:created', config);

    // In production, this would create a streaming payment
    return {
      subscriptionId: `sub_${Date.now()}`,
      status: 'active',
      nextPaymentDate: Date.now() + this.getIntervalMs(config.interval),
    };
  }

  /**
   * Build payment URL
   */
  private buildPaymentUrl(request: PaymentRequest): string {
    const base = this.config.environment === 'mainnet' 
      ? 'https://pay.vfide.io' 
      : 'https://testnet.pay.vfide.io';

    const params = new URLSearchParams({
      to: request.recipient,
      amount: request.amount,
      token: request.token || 'ETH',
      ...(request.chainId && { chain: request.chainId.toString() }),
      ...(request.description && { desc: request.description }),
      ...(request.callbackUrl && { callback: request.callbackUrl }),
      ...(request.successUrl && { success: request.successUrl }),
      ...(request.cancelUrl && { cancel: request.cancelUrl }),
    });

    return `${base}?${params.toString()}`;
  }

  /**
   * Open payment window
   */
  private async openPaymentWindow(url: string): Promise<PaymentResult> {
    return new Promise((resolve, reject) => {
      const width = 440;
      const height = 700;
      const left = (window.innerWidth - width) / 2 + window.screenX;
      const top = (window.innerHeight - height) / 2 + window.screenY;

      const popup = window.open(
        url,
        'vfide-payment',
        `width=${width},height=${height},left=${left},top=${top},popup=true`
      );

      if (!popup) {
        reject(new Error('Popup blocked'));
        return;
      }

      // Listen for messages from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== new URL(url).origin) return;

        if (event.data.type === 'VFIDE_PAYMENT_COMPLETE') {
          window.removeEventListener('message', handleMessage);
          resolve(event.data.result as PaymentResult);
        } else if (event.data.type === 'VFIDE_PAYMENT_CANCELLED') {
          window.removeEventListener('message', handleMessage);
          this.emit('payment:cancelled', {});
          reject(new Error('Payment cancelled'));
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup is closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          this.emit('payment:cancelled', {});
          reject(new Error('Payment window closed'));
        }
      }, 500);
    });
  }

  /**
   * Get container element
   */
  private getContainer(container: HTMLElement | string): HTMLElement | null {
    if (typeof container === 'string') {
      return document.querySelector(container);
    }
    return container;
  }

  /**
   * Apply styles to element
   */
  private applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(element.style, styles);
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(interval: 'daily' | 'weekly' | 'monthly'): number {
    const ms = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };
    return ms[interval];
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const vfide = new VFIDESDK();

// Also export for ES modules
export default vfide;

// UMD build would also set window.VFIDE = vfide
if (typeof window !== 'undefined') {
  (window as unknown as { VFIDE: VFIDESDK }).VFIDE = vfide;
}
