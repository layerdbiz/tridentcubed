<!-- New2.svelte -->
<script lang="ts">
  import { Component2 } from '$lib';
  import type { ComponentProps } from 'svelte';

  type Component2Props = ComponentProps<typeof Component2>;
  type New2Props = Omit<Component2Props, 'tag' | 'left' | 'center'> & {
    left?: Component2Props['left'];
    center?: Component2Props['center'];
    href?: string;
    label?: string;
  };

  let {
    href = '#link',
    label = 'center',
    left = 'icon',
    center = label,
    ...props
  }: New2Props = $props();
</script>

<Component2 {...props} tag="a" {href} {left} {center} />