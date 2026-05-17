<script lang="ts">
	import { Text, mq } from '@layerd/ui';
</script>

<Text h1="SSR" />

{#if mq.base}
	<div class="rounded-xl bg-yellow-100 p-4 text-yellow-950">
		<p class="font-black">📄 Canonical Base/Content Projection</p>
		<p class="mt-2 text-sm">
			This is the SSR-safe canonical layout. Real semantic HTML for search engines and first load.
		</p>
	</div>
{:else if mq.sm}
	<div class="rounded-xl bg-blue-100 p-4 text-blue-950">
		<p class="font-black">📱 Mobile View (sm)</p>
		<p class="mt-2 text-sm">Content optimized for small screens after MQ is ready.</p>
	</div>
{:else if mq.md}
	<div class="rounded-xl bg-green-100 p-4 text-green-950">
		<p class="font-black">💻 Tablet View (md)</p>
		<p class="mt-2 text-sm">Content optimized for medium screens after MQ is ready.</p>
	</div>
{:else}
	<div class="rounded-xl bg-purple-100 p-4 text-purple-950">
		<p class="font-black">🖥️ Desktop View ({mq.lg ? 'lg' : mq.xl ? 'xl' : 'xxl'})</p>
		<p class="mt-2 text-sm">Content optimized for large screens after MQ is ready.</p>
	</div>
{/if}