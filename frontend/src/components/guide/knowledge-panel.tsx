import { Lightbulb } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ExplainSparkle } from '@/components/ai/explain-sparkle'
import { moreKnowledge, type KnowledgeCard } from '@/lib/guide'

export function KnowledgePanel({ cards }: { cards: KnowledgeCard[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
        <Lightbulb className="size-4" aria-hidden="true" />
        Dla Twojej sytuacji
      </p>
      {cards.map((card) => (
        <article key={card.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            {card.title}
            {card.topicId && <ExplainSparkle topicId={card.topicId} label={card.title} />}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{card.summary}</p>
          <ul className="flex flex-col gap-1.5">
            {card.points.map((point) => (
              <li key={point} className="flex gap-2 text-sm leading-relaxed text-foreground">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        </article>
      ))}

      <div data-legal className="rounded-2xl border bg-card px-5">
        <p className="pt-4 text-sm font-semibold text-foreground">Dowiedz się więcej</p>
        <Accordion>
          {moreKnowledge.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="py-3">{item.title}</AccordionTrigger>
              <AccordionContent>
                <p className="pb-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}
