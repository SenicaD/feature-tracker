<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from "reka-ui";

type Props = CheckboxRootProps & { class?: HTMLAttributes["class"] };

const props = defineProps<Props>();
const emits = defineEmits<CheckboxRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <CheckboxRoot
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="forwarded"
    :class="[
      'peer h-4 w-4 shrink-0 rounded-[4px] border border-slate-700 bg-slate-950 text-slate-100',
      'shadow-sm transition-shadow outline-none',
      'focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-0',
      'data-[state=checked]:border-sky-400 data-[state=checked]:bg-sky-500 data-[state=checked]:text-slate-950',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    ]"
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="grid place-content-center text-current"
    >
      <slot v-bind="slotProps">
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none">
          <path
            d="M6 12.5l4 4 8-8"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
