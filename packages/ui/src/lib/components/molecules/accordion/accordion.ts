import AccordionRoot from "./accordion.svelte";
import AccordionContent from "./accordion-content.svelte";
import AccordionTitle from "./accordion-title.svelte";

import type { AccordionProps } from "./accordion.svelte";
import type { AccordionContentProps } from "./accordion-content.svelte";
import type { AccordionTitleProps } from "./accordion-title.svelte";

const Accordion = Object.assign(AccordionRoot, {
	Title: AccordionTitle,
	Content: AccordionContent,
}) as typeof AccordionRoot & {
	Title: typeof AccordionTitle;
	Content: typeof AccordionContent;
};

export default Accordion;

export { Accordion, AccordionContent, AccordionTitle };
export type { AccordionContentProps, AccordionProps, AccordionTitleProps };
