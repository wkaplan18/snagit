const PLATFORM_OWNER_EMAIL = 'warren@kaplan.co.za'

export function isPlatformOwner(email: string | null | undefined): boolean {
  return email?.toLowerCase() === PLATFORM_OWNER_EMAIL
}
