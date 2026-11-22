import React from 'react';
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { cn } from '@/lib/utils';

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('not-last:border-b', className)}
      style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  style,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header style={{ display: 'flex', width: '100%', margin: 0 }}>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger relative flex flex-1 items-center justify-between py-3 text-left font-semibold outline-none cursor-pointer',
          className
        )}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          cursor: 'pointer',
          border: 'none',
          background: 'none',
          padding: '10px 0',
          gap: '12px',
          ...style,
        }}
        {...props}
      >
        <div style={{ flex: 1, textAlign: 'left' }}>{children}</div>

        {/* Zamiast zwykłej strzałki – klikalny przycisk/etykieta 'Więcej' / 'Mniej' */}
        <span className="zus-accordion-toggle" aria-hidden="true" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span className="zus-label-more">Więcej ▾</span>
          <span className="zus-label-less">Mniej ▴</span>
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      style={{ overflow: 'hidden' }}
      className={cn('text-sm', className)}
      {...props}
    >
      <div style={{ paddingTop: '8px', paddingBottom: '14px' }}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
