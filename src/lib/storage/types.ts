export type StorageType = "local" | "s3";

export type UploadInput = {
  buffer: Buffer;
  mime: string;
  folder: string;
  hash: string;
};

export type UploadResult = {
  storage: StorageType;
  providerKey: string;
  url: string;
};

export type MoveInput = {
  providerKey: string;
  hash: string;
  fromFolder: string;
  toFolder: string;
};

export interface MediaStorageProvider {
  readonly type: StorageType;
  upload(input: UploadInput): Promise<UploadResult>;
  move(input: MoveInput): Promise<UploadResult>;
  delete(providerKey: string): Promise<void>;
  read(providerKey: string): Promise<Buffer>;
}
