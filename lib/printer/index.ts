export interface PrintReceiptData {
  merchantName: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  tax?: number;
  tip?: number;
  total: number;
  txHash?: string;
  paymentMethod?: string;
  date?: Date;
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const INIT = [ESC, 0x40];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const CENTER = [ESC, 0x61, 0x01];
const LEFT = [ESC, 0x61, 0x00];
const CUT = [GS, 0x56, 0x41, 0x00];
const DOUBLE_HEIGHT = [ESC, 0x21, 0x10];
const NORMAL = [ESC, 0x21, 0x00];

function textToBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function line(text: string): number[] {
  return [...textToBytes(text), LF];
}

function separator(width = 32): number[] {
  return line('─'.repeat(width));
}

function formatLine(left: string, right: string, width = 32): string {
  const gap = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, gap)) + right;
}

export function buildReceiptBytes(data: PrintReceiptData): Uint8Array {
  const now = data.date || new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const commands: number[] = [
    ...INIT,
    ...CENTER, ...DOUBLE_HEIGHT, ...BOLD_ON, ...line(data.merchantName), ...NORMAL, ...BOLD_OFF,
    ...CENTER, ...line(dateStr), ...LEFT, LF,
    ...separator(),
    ...data.items.flatMap((item) => line(formatLine(`${item.name} x${item.qty}`, `$${(item.price * item.qty).toFixed(2)}`))),
    ...separator(),
    ...BOLD_ON,
    ...line(formatLine('Subtotal', `$${data.subtotal.toFixed(2)}`)),
    ...(data.tax ? line(formatLine('Tax', `$${data.tax.toFixed(2)}`)) : []),
    ...(data.tip ? line(formatLine('Tip', `$${data.tip.toFixed(2)}`)) : []),
    ...line(formatLine('TOTAL', `$${data.total.toFixed(2)}`)),
    ...BOLD_OFF, LF,
    ...(data.paymentMethod ? line(`Paid via: ${data.paymentMethod}`) : []),
    ...(data.txHash ? line(`Tx: ${data.txHash.slice(0, 16)}...`) : []),
    LF, ...CENTER, ...line('Thank you!'), LF, LF, ...CUT,
  ];

  return new Uint8Array(commands);
}

const BT_PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const BT_PRINTER_CHAR = '00002af1-0000-1000-8000-00805f9b34fb';

export async function printReceipt(data: PrintReceiptData): Promise<{ success: boolean; error?: string }> {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    return { success: false, error: 'Bluetooth not available' };
  }

  try {
    const bluetoothNavigator = navigator as Navigator & {
      bluetooth: {
        requestDevice: (options: any) => Promise<any>;
      };
    };

    const device = await bluetoothNavigator.bluetooth.requestDevice({
      filters: [{ services: [BT_PRINTER_SERVICE] }],
      optionalServices: [BT_PRINTER_SERVICE],
    });
    const server = await device.gatt?.connect();
    if (!server) return { success: false, error: 'Printer connection failed' };

    const service = await server.getPrimaryService(BT_PRINTER_SERVICE);
    const characteristic = await service.getCharacteristic(BT_PRINTER_CHAR);
    const bytes = buildReceiptBytes(data);

    for (let i = 0; i < bytes.length; i += 20) {
      await characteristic.writeValue(bytes.slice(i, i + 20));
    }

    server.disconnect();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Print failed' };
  }
}

export function isPrinterSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}
