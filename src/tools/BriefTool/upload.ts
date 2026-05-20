export type BriefUploadContext = {
  replBridgeEnabled: boolean
  signal?: AbortSignal
}

export async function uploadBriefAttachment(
  fullPath: string,
  size: number,
  ctx: BriefUploadContext,
): Promise<string | undefined> {
  void fullPath
  void size
  void ctx
  return undefined
}
