<script lang="ts">
	import { STATUS_COLOR, STATUS_LABEL } from '$lib/format';
	let { status }: { status: string } = $props();
</script>

<span class="badge {STATUS_COLOR[status] || 'bg-slate-100'}">{STATUS_LABEL[status] || status}</span>
