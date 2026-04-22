<!-- App.svelte -->
<script lang="ts">
  import { Text } from '@layerd/ui';
  import { Component, Example } from '$lib';
</script>

<main class="grid auto-rows-auto gap-4 p-10">
  <section class="grid gap-2 rounded-lg border border-black/10 bg-white p-4">
    <Text h2="Component" />
    <Component 
      class="btn"
      tag="button"
      snippets={{
        left:   { tag: 'i' },
        center: { tag: 'span' },
        right:  { tag: 'b' }
      }}
    >
      {#snippet left()}
        left
      {/snippet}

      {#snippet center()}
        center
      {/snippet}

      {#snippet right()}
        right
      {/snippet}
    </Component>

    <Text h2="Component (debug)" />
    <Component 
      debug
      class="btn"
      tag="button"
      left="left"
      center="center"
      right="right"
      snippets={{
        left:   { tag: 'i' },
        center: { tag: 'span' },
        right:  { tag: 'b' }
      }}
    />

    <Text h2="fallbacks" />
    <Component />
    <Component label="label" />
    <Component>
      Test
    </Component>

    <Text h2="Example overrides" />
    <Example left="prop left override" center="prop center override" />

    <Example href="https://oneezy.com" target="_blank">
      {#snippet left()}
        snippet left override
      {/snippet}

      {#snippet center()}
        snippet center override
      {/snippet}
    </Example>
  </section>

  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="inline" />
    <Component
      debug
      class="rounded-md border border-black/10 bg-white px-3 py-2"
      grid="inline"
      left="left"
      center="center"
      right="right"
    />
  </section>

  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="size" />
    <Component
      debug
      class="rounded-md border border-black/10 bg-white px-3 py-2"
      left="left"
      center="center"
      right="right"
      size="100px"
    />
  </section>

  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="rows and cols" />
    <Component
      debug
      class="rounded-md border border-black/10 bg-white px-3 py-2"
      left="left"
      center="center"
      right="right"
      rows="auto 1fr auto"
      cols="200px 1fr 200px"
    />
  </section>

  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="inline with snippets" />
    <Component
      debug
      class="rounded-md border border-black/10 bg-white px-3 py-2"
      grid="inline"
      rows="auto 200px auto"
      cols="auto 1fr auto"
    >
      {#snippet left()}
        left
      {/snippet}

      {#snippet center()}
        center
      {/snippet}

      {#snippet right()}
        right
      {/snippet}
    </Component>
  </section>

  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="items and content" />
    <Component 
      class="min-h-80 rounded-md border border-black/10 bg-white px-3 py-2"
      cols="120px 120px 120px"
      items="start"
      content="center"
      left="left"
      center="center"
      right="right"
    />
  </section>
</main>