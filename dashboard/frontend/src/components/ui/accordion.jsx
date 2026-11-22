import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      'border-b border-[#111111]/20 dark:border-white/10 transition-colors',
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between py-4 text-left font-semibold text-sm sm:text-base text-[#111827] dark:text-[#F9FAFB] transition-all duration-250 hover:text-[#103B5C] dark:hover:text-[#98D9CE] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#399DBA] rounded-md [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:text-[#103B5C] dark:[&[data-state=open]]:text-[#98D9CE]',
        className
      )}
      {...props}
    >
      <span className="pr-4">{children}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-[#111111]/70 group-hover:text-[#103B5C] dark:group-hover:text-[#98D9CE] transition-transform duration-250" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm leading-relaxed text-[#25313D] dark:text-slate-300 transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn('pb-4 pt-1', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
