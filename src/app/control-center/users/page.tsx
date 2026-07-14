import { getControlCenterData } from '../data'
import UsersSectionClient from './UsersSectionClient'

export default async function UsersSectionPage() {
  const { orgs, orphanUsers } = await getControlCenterData()
  return <UsersSectionClient orgs={orgs} orphanUsers={orphanUsers} />
}
