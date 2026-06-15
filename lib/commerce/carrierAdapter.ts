/**
 * Carrier adapter interface (Commerce Operations Phase 1C — the honest boundary).
 *
 * Everything in this file is INTENTIONALLY UNIMPLEMENTED. Live carrier rates, label purchase, and tracking
 * synchronization require external carrier credentials (USPS/UPS/FedEx, or an aggregator like EasyPost/Shippo)
 * that this environment does not have and that cannot be tested in a sandbox. Rather than fake it, 1C ships:
 *   • a working IN-HOUSE rate engine (lib/commerce/shippingRates.ts) — merchant-defined zones + rate rules,
 *     server-authoritative, fully tested; and
 *   • this typed interface, so a real adapter can be dropped in later WITHOUT touching checkout/order code.
 *
 * The certification is explicit: in-house rating is certified; carrier integration is a defined,
 * NOT-YET-IMPLEMENTED boundary. Any deployment wanting live labels/rates implements CarrierAdapter against a
 * provider and wires it where noted.
 */

export interface Address {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal: string;
  country: string; // ISO-2
}

export interface Parcel {
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface LiveRate {
  carrier: string;       // 'usps' | 'ups' | 'fedex' | ...
  service: string;       // 'Priority' | 'Ground' | ...
  amount: number;
  currency: string;
  estDeliveryDays?: number;
}

export interface PurchasedLabel {
  carrier: string;
  service: string;
  trackingNumber: string;
  labelUrl: string;      // PDF/PNG to print
  amount: number;
}

export interface TrackingUpdate {
  status: 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'returned';
  detail?: string;
  occurredAt: string;    // ISO
}

/**
 * A real implementation calls a carrier/aggregator API. None is provided here.
 * Wiring points (when implemented):
 *   • getLiveRates → offer alongside the in-house quote at checkout.
 *   • buyLabel     → called from a merchant "buy label" action; persist trackingNumber to merchant_orders.
 *   • getTracking  → a poller updates the shipments row status (in_transit/exception/returned) automatically,
 *                    replacing today's manual mark_delivered/confirm flow.
 */
export interface CarrierAdapter {
  getLiveRates(from: Address, to: Address, parcel: Parcel): Promise<LiveRate[]>;
  buyLabel(from: Address, to: Address, parcel: Parcel, carrier: string, service: string): Promise<PurchasedLabel>;
  getTracking(carrier: string, trackingNumber: string): Promise<TrackingUpdate[]>;
}

/** The sentinel returned where an adapter would be injected. Calling it throws — by design. */
export const NO_CARRIER_ADAPTER: CarrierAdapter = {
  async getLiveRates() { throw new Error('No carrier adapter configured: live rates require external carrier credentials (Phase 1C boundary). Use the in-house rate engine.'); },
  async buyLabel() { throw new Error('No carrier adapter configured: label purchase requires external carrier credentials (Phase 1C boundary).'); },
  async getTracking() { throw new Error('No carrier adapter configured: tracking sync requires external carrier credentials (Phase 1C boundary). Tracking is recorded manually.'); },
};
