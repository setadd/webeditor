<script setup lang="ts">
import type {DiagramDocument, DiagramElement} from '../domain/document';
import {pageSnapshots} from '../composables/usePages';
const props=defineProps<{document:DiagramDocument;selected?:DiagramElement}>();
const emit=defineEmits<{change:[id:string,interaction:DiagramElement['interaction']]}>();
function action(value:string){
 if(!props.selected)return;
 emit('change',props.selected.id,value==='none'?undefined:value==='details'?{action:'details'}:{action:'navigate',pageId:pageSnapshots(props.document).find(p=>p.page.id!==props.document.page.id)?.page.id||props.document.page.id});
}
</script>
<template>
<section v-if="selected" style="padding:16px;border-top:1px solid #e2e8f0;font-size:12px">
 <h3>业务查看交互</h3>
 <label>点击动作 <select aria-label="点击动作" :value="selected.interaction?.action||'none'" @change="action(($event.target as HTMLSelectElement).value)"><option value="none">无动作</option><option value="details">查看详情</option><option value="navigate">跳转页面</option></select></label>
 <label v-if="selected.interaction?.action==='navigate'">跳转目标页面 <select aria-label="跳转目标页面" :value="selected.interaction.pageId" @change="emit('change',selected.id,{action:'navigate',pageId:($event.target as HTMLSelectElement).value})"><option v-for="page in pageSnapshots(document)" :key="page.page.id" :value="page.page.id">{{page.name}}</option></select></label>
</section>
</template>
