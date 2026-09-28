export const parseUploadCap = (raw: string | undefined): number => {
  const cap = Number(raw?.trim() || "400");
  if (!Number.isInteger(cap) || cap < 0) {
    throw new Error("PIPELINE_UPLOAD_CAP must be a nonnegative integer");
  }
  return cap;
};
