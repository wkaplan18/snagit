import { getControlCenterData } from '../data'
import BillingSectionClient from './BillingSectionClient'

export default async function BillingSectionPage() {
  const { orgs, kpis } = await getControlCenterData()
  return <BillingSectionClient orgs={orgs} kpis={kpis} />
}
