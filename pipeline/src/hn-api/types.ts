export interface HnApiClient {
  maxItem(): Promise<number>;
  item(id: number): Promise<unknown | null>;
}
