import { HeartHandshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const situations = [
  {
    title: 'Wcześniak lub dziecko w szpitalu',
    body: 'Przysługuje uzupełniający urlop macierzyński – do 8 tygodni (wcześniak) lub do 15 tygodni (hospitalizacja noworodka).',
  },
  {
    title: 'Hospitalizacja matki',
    body: 'Po 14 tygodniach urlopu matka w szpitalu może przekazać resztę urlopu ojcu dziecka.',
  },
  {
    title: 'Utrata dziecka',
    body: 'Masz prawo do zasiłku macierzyńskiego przez 8 tygodni po porodzie (lub 7 dni od zgonu dziecka). Nie musisz niczego załatwiać od razu.',
  },
]

const foundations = [
  { name: 'Fundacja „Wcześniak Rodzice – Rodzicom"', focus: 'Wsparcie rodziców wcześniaków' },
  { name: 'Fundacja Rodzić po Ludzku', focus: 'Prawa pacjentek i wsparcie w żałobie' },
  { name: 'Fundacja Dlaczego', focus: 'Pomoc rodzicom po stracie dziecka' },
  { name: 'Rzecznik Praw Pacjenta – 800 190 590', focus: 'Bezpłatna infolinia' },
]

export function DifficultSituationsDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" className="gap-2 self-start text-muted-foreground">
            <HeartHandshake className="size-4" aria-hidden="true" />
            Trudne sytuacje (wcześniak, hospitalizacja, utrata dziecka)
          </Button>
        }
      />
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Trudne sytuacje</DialogTitle>
          <DialogDescription>
            Spokojnie – prawo do zasiłku nie przepada. Poniżej najważniejsze informacje i miejsca, gdzie znajdziesz wsparcie.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {situations.map((situation) => (
            <div key={situation.title} className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-foreground">{situation.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{situation.body}</p>
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-xl bg-muted p-4">
            <h3 className="text-sm font-semibold text-foreground">Gdzie szukać wsparcia</h3>
            <ul className="flex flex-col gap-2">
              {foundations.map((foundation) => (
                <li key={foundation.name} className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{foundation.name}</span>
                  <span className="text-xs text-muted-foreground">{foundation.focus}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
