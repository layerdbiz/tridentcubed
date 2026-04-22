<script lang="ts">
  import {Root} from '$lib';
  import type {ComponentProps} from 'svelte';
  import type {SvelteHTMLElements} from 'svelte/elements';

  type RootProps = ComponentProps<typeof Root>;
  type ComponentPropsType = Omit<RootProps, 'root'> & {
    tag?: keyof SvelteHTMLElements;
  };

  let {
    tag = 'div',
    ...props
  }: ComponentPropsType = $props();
</script>

<Root {...props}>
  {#snippet root({ props, layout })}
    <svelte:element this={tag} {...props}>
      {@render layout()}
    </svelte:element>
  {/snippet}
</Root>
