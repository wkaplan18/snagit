import { getControlCenterData } from '../data'
import OrganizationsClient from './OrganizationsClient'

export default async function OrganizationsPage() {
  const { orgs } = await getControlCenterData()
  return <OrganizationsClient orgs={orgs} />
}
