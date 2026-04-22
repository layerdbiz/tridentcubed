<!-- App.svelte -->
<script lang="ts">
  import { Component } from '$lib';
  import { Text } from '@layerd/ui';
</script>

<main class="grid gap-4 p-10 auto-rows-auto">

  <!-- default full 
  -------------------------------------------------------------------------------->
  <section class="grid gap-2 rounded-lg border border-black/10 bg-white p-4">
    <Text h2="Component" />
    <Component class="btn">
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

    <Text h2="Component (all snippet position)" />
    <Component class="btn" debug>
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

  <!-- FIX: inline 
  -------------------------------------------------------------------------------->
  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="inline" />
    <Component debug
      class="rounded-md border border-black/10 bg-white px-3 py-2"
      grid="inline"
      left="left"
      center="center"
      right="right"
    />
  </section>

  <!-- size 
  -------------------------------------------------------------------------------->
  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="size" />
    <Component debug
      class="rounded-md border border-black/10 bg-white px-3 py-2"
      left="left"
      center="center"
      right="right"
      size="100px"
    />
  </section>

  <!-- rows and cols 
  -------------------------------------------------------------------------------->
  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="rows and cols" />
    <Component debug
      class="rounded-md border border-black/10 bg-white px-3 py-2"
      left="left"
      center="center"
      right="right"
      rows="auto 1fr auto"
      cols="200px 1fr 200px"
    />
  </section>

  <!-- FIX: inline with snippets 
  -------------------------------------------------------------------------------->
  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="inline with snippets" />
    <Component debug
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

  <!-- items and content 
  -------------------------------------------------------------------------------->
  <section class="grid gap-2 rounded-lg border border-black/10 bg-black/5 p-4">
    <Text h2="items and content" />
    <Component 
      class="rounded-md border border-black/10 bg-white px-3 py-2 min-h-80"
      cols="120px 120px 120px"
      items="start"
      content="center"
      left="left"
      center="center"
      right="right"
    />
  </section>
</main>