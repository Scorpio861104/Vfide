/**
 * Social Commerce Components — barrel export
 *
 * ShareProductToFeed — Button + modal for merchants to post products to the social feed
 * ShoppablePost     — In-feed product card with "Buy now" that opens checkout
 * PurchaseProofEvent — Auto-generated feed event after purchase ("Alice bought from Bob")
 */

export { ShareProductToFeed } from './ShareProductToFeed';
export { ShoppablePost } from './ShoppablePost';
export { PurchaseProofEvent } from './PurchaseProofEvent';
export type { ShoppableProduct, ShareProductToFeedProps, ShoppablePostProps, PurchaseProofEventProps } from './social-commerce-types';
