<!-- Example.svelte -->
<script lang="ts">
  import { Component } from '$lib';
  import type { ComponentProps } from 'svelte';

  type ComponentPropss = ComponentProps<typeof Component>;
  type NewProps = Omit<ComponentPropss, 'tag' | 'left' | 'center'> & {
    left?: ComponentPropss['left'];
    center?: ComponentPropss['center'];
    href?: string;
    label?: string;
  };

  let {
    href = '#link',
    label = 'center',
    left = 'icon',
    center = label,
    ...props
  }: NewProps = $props();
</script>

<Component {...props} tag="a" {href} {left} {center} />