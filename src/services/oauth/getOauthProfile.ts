import type { OAuthProfileResponse } from 'src/services/oauth/types.js'

export async function getOauthProfileFromApiKey(): Promise<
  OAuthProfileResponse | undefined
> {
  return undefined
}

export async function getOauthProfileFromOauthToken(
  accessToken: string,
): Promise<OAuthProfileResponse | undefined> {
  void accessToken
  return undefined
}
