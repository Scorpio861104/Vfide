export function isNFCSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

export async function writePaymentNFC(merchantSlug: string, amount: number, currency: string): Promise<{ success: boolean; error?: string }> {
  if (!isNFCSupported()) {
    return { success: false, error: 'NFC not supported on this device' };
  }

  try {
    const Reader = (window as unknown as { NDEFReader: new () => { write: (message: { records: { recordType: string; data: string }[] }) => Promise<void> } }).NDEFReader;
    const ndef = new Reader();
    const paymentUrl = `${window.location.origin}/pay/${merchantSlug}?amount=${amount}&currency=${currency}`;
    await ndef.write({ records: [{ recordType: 'url', data: paymentUrl }] });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'NFC write failed' };
  }
}

export async function readNFC(onRead: (url: string) => void): Promise<{ success: boolean; error?: string }> {
  if (!isNFCSupported()) {
    return { success: false, error: 'NFC not supported' };
  }

  try {
    const Reader = (window as unknown as { NDEFReader: new () => { scan: () => Promise<void>; onreading: ((event: { message: { records: { recordType: string; data: DataView | ArrayBuffer }[] } }) => void) | null } }).NDEFReader;
    const ndef = new Reader();
    await ndef.scan();
    ndef.onreading = (event) => {
      for (const record of event.message.records) {
        if (record.recordType === 'url') {
          const raw = record.data instanceof DataView ? record.data.buffer : record.data;
          onRead(new TextDecoder().decode(raw));
        }
      }
    };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'NFC read failed' };
  }
}
