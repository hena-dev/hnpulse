export { mean, sumOver, weightedMean } from "./aggregate.ts";
export { type Bucket, type BucketPoint, bucketForRange, bucketSeries } from "./bucket.ts";
export { computeDelta } from "./delta.ts";
export {
  currentWindow,
  type IndexWindow,
  previousWindow,
  RANGE_DAYS,
  RANGE_IDS,
  type RangeId,
  sliceSeries,
} from "./range.ts";
export { ordersOfMagnitude, shouldOfferLogScale } from "./scale.ts";
