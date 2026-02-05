<script setup lang="ts">
import type { HoverCardContentProps } from "reka-ui";
import { HoverCardContent, HoverCardPortal, useForwardProps } from "reka-ui";

type Props = HoverCardContentProps & { class?: string };

const props = withDefaults(defineProps<Props>(), {
  sideOffset: 8
});
const forwarded = useForwardProps(props);
</script>

<template>
  <HoverCardPortal>
    <HoverCardContent
      data-slot="hover-card-content"
      v-bind="forwarded"
      :class="[
        'z-50 w-72 rounded-md border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 shadow-xl outline-none',
        'transition-opacity duration-150',
        props.class
      ]"
    >
      <slot />
    </HoverCardContent>
  </HoverCardPortal>
</template>
