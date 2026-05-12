<!-- Example.svelte -->
<script lang="ts">
  import { Component } from '$lib';
  import type { ComponentProps as SvelteComponentProps } from 'svelte';

  type BaseProps = SvelteComponentProps<typeof Component>;
  type ExampleProps = Omit<BaseProps, 'component' | 'tag'> & {
    href?: string;
    eyebrow?: string;
    label?: string;
    meta?: string;
  };

  let {
    href = '#example',
    eyebrow = 'Example',
    label = 'Open preview',
    meta = 'external',
    children = undefined,
    ...props
  }: ExampleProps = $props();
</script>

<Component
  {...props}
  {children}
  label={label}
  class="rounded-xl border border-black/10 bg-white no-underline transition hover:border-black/25"
>
  {#snippet component({ props, content, observe })}
    <a {...props} href={href} class="grid gap-2 px-4 py-3 text-left no-underline">
      <span class="text-xs uppercase tracking-[0.2em] text-black/45">{eyebrow}</span>
      <span class="text-sm leading-5">
        ↗ {@render content?.('Open preview')}
      </span>
      <span class="text-xs text-black/55">
        {meta}{#if observe} · observe{/if}
      </span>
    </a>
  {/snippet}
</Component>