import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{r as u}from"./iframe-C8SDnYAp.js";import{F as V,R as W,A as k,P as z,C as B}from"./FieldWrapper-BTQq8qrf.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BeWwO2i_.js";import"./index-BYhyg5Ti.js";import"./index-twabaTmL.js";import"./index-EVyiSfz9.js";import"./index-BZzt7Uss.js";import"./index-BfZ2q5_f.js";import"./index-PHkyKt4e.js";import"./index-CoN7dpiG.js";import"./index-BCoX4Hhz.js";const G="block w-full rounded border border-border bg-surface text-content px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed",M="z-50 w-[var(--radix-popover-trigger-width)] bg-surface border border-border rounded shadow-md max-h-60 overflow-y-auto";function f({label:t,description:g,options:a,value:n,onChange:N,placeholder:E,disabled:P}){const[y,h]=u.useState(()=>{const e=a.find(o=>o.value===n);return e?e.label:n}),[_,s]=u.useState(!1);u.useEffect(()=>{const e=a.find(o=>o.value===n);h(e?e.label:n)},[n,a]);const b=a.filter(e=>e.label.toLowerCase().includes(y.toLowerCase()));function I(e){const o=e.target.value;h(o),s(o.length>0&&b.length>0)}function L(){b.length>0&&s(!0)}function R(e){h(e.label),N(e.value),s(!1)}return r.jsx(V,{label:t,description:g,children:r.jsxs(W,{open:_,onOpenChange:s,children:[r.jsx(k,{asChild:!0,children:r.jsx("input",{type:"text",value:y,onChange:I,onFocus:L,placeholder:E,disabled:P,className:`mt-1 ${G}`,autoComplete:"off"})}),r.jsx(z,{children:r.jsx(B,{align:"start",sideOffset:4,onOpenAutoFocus:e=>e.preventDefault(),className:M,children:b.map(e=>r.jsx("button",{type:"button",onMouseDown:o=>o.preventDefault(),onClick:()=>R(e),className:"w-full text-left px-3 py-2 text-sm text-content hover:bg-muted-bg cursor-pointer",children:e.label},e.value))})})]})})}f.__docgenInfo={description:`@registryCategory atomic
@registryTags field autocomplete search
@registryBind formData onChange`,methods:[],displayName:"FieldAutocomplete",props:{label:{required:!0,tsType:{name:"string"},description:""},description:{required:!1,tsType:{name:"string"},description:""},options:{required:!0,tsType:{name:"Array",elements:[{name:"FieldAutocompleteOption"}],raw:"FieldAutocompleteOption[]"},description:""},value:{required:!0,tsType:{name:"string"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},placeholder:{required:!1,tsType:{name:"string"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:""}}};const ae={title:"Form/FieldAutocomplete",component:f,parameters:{layout:"centered"}},p=[{value:"fr",label:"France"},{value:"de",label:"Germany"},{value:"es",label:"Spain"},{value:"it",label:"Italy"},{value:"pt",label:"Portugal"},{value:"nl",label:"Netherlands"},{value:"be",label:"Belgium"},{value:"ch",label:"Switzerland"}];function m(t){const[g,a]=u.useState(t.value??"");return r.jsx("div",{style:{width:320},children:r.jsx(f,{...t,value:g,onChange:a})})}const l={render:t=>r.jsx(m,{...t}),args:{label:"Country",options:p,placeholder:"Type to search..."}},i={render:t=>r.jsx(m,{...t}),args:{label:"Country",description:"Start typing to filter countries",options:p,placeholder:"Type to search..."}},c={render:t=>r.jsx(m,{...t}),args:{label:"Country",options:p,value:"de",placeholder:"Type to search..."}},d={render:t=>r.jsx(m,{...t}),args:{label:"Country",options:p,disabled:!0,placeholder:"Disabled"}},ne=["Default","WithDescription","Preselected","Disabled"];var C,x,v;l.parameters={...l.parameters,docs:{...(C=l.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: args => <Controlled {...args} />,
  args: {
    label: 'Country',
    options: countries,
    placeholder: 'Type to search...'
  }
}`,...(v=(x=l.parameters)==null?void 0:x.docs)==null?void 0:v.source}}};var T,j,w;i.parameters={...i.parameters,docs:{...(T=i.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: args => <Controlled {...args} />,
  args: {
    label: 'Country',
    description: 'Start typing to filter countries',
    options: countries,
    placeholder: 'Type to search...'
  }
}`,...(w=(j=i.parameters)==null?void 0:j.docs)==null?void 0:w.source}}};var S,D,F;c.parameters={...c.parameters,docs:{...(S=c.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: args => <Controlled {...args} />,
  args: {
    label: 'Country',
    options: countries,
    value: 'de',
    placeholder: 'Type to search...'
  }
}`,...(F=(D=c.parameters)==null?void 0:D.docs)==null?void 0:F.source}}};var A,O,q;d.parameters={...d.parameters,docs:{...(A=d.parameters)==null?void 0:A.docs,source:{originalSource:`{
  render: args => <Controlled {...args} />,
  args: {
    label: 'Country',
    options: countries,
    disabled: true,
    placeholder: 'Disabled'
  }
}`,...(q=(O=d.parameters)==null?void 0:O.docs)==null?void 0:q.source}}};export{l as Default,d as Disabled,c as Preselected,i as WithDescription,ne as __namedExportsOrder,ae as default};
