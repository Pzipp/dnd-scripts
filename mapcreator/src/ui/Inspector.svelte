<script lang="ts">
  import ObjectList from './ObjectList.svelte';
  import Icon from './Icon.svelte';

  let { collapsed = false, ontoggle }: { collapsed?: boolean; ontoggle: () => void } = $props();
</script>

<button class="fold" title={collapsed ? 'Fold objekterne ud' : 'Fold objekterne sammen til siden'} aria-label="Fold objekter" onclick={ontoggle}>
  <Icon name={collapsed ? 'left' : 'right'} size={14} />
</button>
{#if !collapsed}
<ObjectList />
{/if}

<style>
  .fold { padding: 3px 5px; float: right; }
</style>
