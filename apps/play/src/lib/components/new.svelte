<!-- New.svelte -->
<script lang="ts">
  import { Component } from '$lib';
  import type { ComponentProps } from 'svelte';

  type NewProps = Omit<ComponentProps<typeof Component>, 'tag'> & {
    href?: string;
    label?: string;
  };

  let {
    href = '#link',
    label = 'center',
    ...props
  }: NewProps = $props();
</script>

<Component
  {...props} 
/>