import { DossierExplorer } from './DossierExplorer'

export function CasaDossierExplorer({ onOpenHouse, onOpenBuilding }: { onOpenHouse: () => void; onOpenBuilding: () => void }) {
  return <DossierExplorer project="casa" onOpenApartment={onOpenHouse} onOpenBuilding={onOpenBuilding} />
}
