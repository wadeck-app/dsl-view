import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{r as U}from"./iframe-C8SDnYAp.js";import{c as J}from"./index-BfZ2q5_f.js";import{P as k}from"./index-twabaTmL.js";import"./preload-helper-Dp1pzeXC.js";import"./index-EVyiSfz9.js";import"./index-BZzt7Uss.js";var Q=Object.defineProperty,n=(e,a)=>Q(e,"name",{value:a,configurable:!0}),H="Progress",V=100,[Y,ve]=J(H),[Z,ee]=Y(H),re=U.forwardRef(n(function(a,d){const{__scopeProgress:l,value:t=null,max:s,getValueLabel:p=W,...X}=a;(s||s===0)&&!h(s)&&console.error(F(`${s}`,"Progress"));const u=h(s)?s:V;t!==null&&!w(t,u)&&console.error(K(`${t}`,"Progress"));const i=w(t,u)?t:null,B=c(i)?p(i,u):void 0;return r.jsx(Z,{scope:l,value:i,max:u,children:r.jsx(k.div,{"aria-valuemax":u,"aria-valuemin":0,"aria-valuenow":c(i)?i:void 0,"aria-valuetext":B,role:"progressbar","data-state":N(i,u),"data-value":i??void 0,"data-max":u,...X,ref:d})})},"Progress")),ae="ProgressIndicator",se=U.forwardRef(n(function(a,d){const{__scopeProgress:l,...t}=a,s=ee(ae,l);return r.jsx(k.div,{"data-state":N(s.value,s.max),"data-value":s.value??void 0,"data-max":s.max,...t,ref:d})},"ProgressIndicator"));function W(e,a){return`${Math.round(e/a*100)}%`}n(W,"defaultGetValueLabel");function N(e,a){return e==null?"indeterminate":e===a?"complete":"loading"}n(N,"getProgressState");function c(e){return typeof e=="number"}n(c,"isNumber");function h(e){return c(e)&&!isNaN(e)&&e>0}n(h,"isValidMaxNumber");function w(e,a){return c(e)&&!isNaN(e)&&e<=a&&e>=0}n(w,"isValidValueNumber");function F(e,a){return`Invalid prop \`max\` of value \`${e}\` supplied to \`${a}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${V}\`.`}n(F,"getInvalidMaxError");function K(e,a){return`Invalid prop \`value\` of value \`${e}\` supplied to \`${a}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${V} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`}n(K,"getInvalidValueError");var te=re,oe=se;const ne={default:"bg-[var(--color-primary-solid)]",success:"bg-success",danger:"bg-danger"},le={sm:"h-1.5",md:"h-2.5"};function o({value:e,max:a=100,variant:d="default",label:l,showValue:t=!1,size:s="md"}){const p=Math.min(100,Math.max(0,e/a*100));return r.jsxs("div",{className:"w-full",children:[(l||t)&&r.jsxs("div",{className:"flex justify-between mb-1",children:[l&&r.jsx("span",{className:"text-sm text-content",children:l}),t&&r.jsxs("span",{className:"text-sm text-muted",children:[Math.round(p),"%"]})]}),r.jsx(te,{value:e,max:a,className:`w-full overflow-hidden rounded-full bg-muted-bg ${le[s]}`,children:r.jsx(oe,{className:`h-full transition-all duration-300 ${ne[d]}`,style:{width:`${p}%`}})})]})}o.__docgenInfo={description:`@registryCategory atomic
@registryTags progress bar loading`,methods:[],displayName:"Progress",props:{value:{required:!0,tsType:{name:"number"},description:""},max:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"100",computed:!1}},variant:{required:!1,tsType:{name:"union",raw:"'default' | 'success' | 'danger'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'success'"},{name:"literal",value:"'danger'"}]},description:"",defaultValue:{value:"'default'",computed:!1}},label:{required:!1,tsType:{name:"string"},description:""},showValue:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"}]},description:"",defaultValue:{value:"'md'",computed:!1}}}};const fe={title:"Display/Progress",component:o,parameters:{layout:"padded"},argTypes:{variant:{control:"select",options:["default","success","danger"]},size:{control:"radio",options:["sm","md"]},value:{control:{type:"range",min:0,max:100}}}},m=e=>r.jsx("div",{className:"w-80",children:e}),g={render:e=>m(r.jsx(o,{...e})),args:{value:60}},v={render:e=>m(r.jsx(o,{...e})),args:{value:45,label:"Upload progress",showValue:!0}},f={render:e=>m(r.jsx(o,{...e})),args:{value:100,variant:"success",label:"Complete",showValue:!0}},x={render:e=>m(r.jsx(o,{...e})),args:{value:80,variant:"danger",label:"Disk usage",showValue:!0}},b={render:e=>m(r.jsx(o,{...e})),args:{value:60,size:"sm"}},P={render:()=>r.jsxs("div",{className:"flex flex-col gap-4 w-80",children:[r.jsx(o,{value:60,label:"Default",showValue:!0}),r.jsx(o,{value:100,variant:"success",label:"Success",showValue:!0}),r.jsx(o,{value:80,variant:"danger",label:"Danger",showValue:!0})]})},xe=["Default","WithLabel","Success","Danger","SmSize","AllVariants"];var j,S,y;g.parameters={...g.parameters,docs:{...(j=g.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: args => wrap(<Progress {...args} />),
  args: {
    value: 60
  }
}`,...(y=(S=g.parameters)==null?void 0:S.docs)==null?void 0:y.source}}};var I,_,D;v.parameters={...v.parameters,docs:{...(I=v.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: args => wrap(<Progress {...args} />),
  args: {
    value: 45,
    label: 'Upload progress',
    showValue: true
  }
}`,...(D=(_=v.parameters)==null?void 0:_.docs)==null?void 0:D.source}}};var T,E,$;f.parameters={...f.parameters,docs:{...(T=f.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: args => wrap(<Progress {...args} />),
  args: {
    value: 100,
    variant: 'success',
    label: 'Complete',
    showValue: true
  }
}`,...($=(E=f.parameters)==null?void 0:E.docs)==null?void 0:$.source}}};var M,A,C;x.parameters={...x.parameters,docs:{...(M=x.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: args => wrap(<Progress {...args} />),
  args: {
    value: 80,
    variant: 'danger',
    label: 'Disk usage',
    showValue: true
  }
}`,...(C=(A=x.parameters)==null?void 0:A.docs)==null?void 0:C.source}}};var R,L,q;b.parameters={...b.parameters,docs:{...(R=b.parameters)==null?void 0:R.docs,source:{originalSource:`{
  render: args => wrap(<Progress {...args} />),
  args: {
    value: 60,
    size: 'sm'
  }
}`,...(q=(L=b.parameters)==null?void 0:L.docs)==null?void 0:q.source}}};var z,O,G;P.parameters={...P.parameters,docs:{...(z=P.parameters)==null?void 0:z.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4 w-80">\r
            <Progress value={60} label="Default" showValue />\r
            <Progress value={100} variant="success" label="Success" showValue />\r
            <Progress value={80} variant="danger" label="Danger" showValue />\r
        </div>
}`,...(G=(O=P.parameters)==null?void 0:O.docs)==null?void 0:G.source}}};export{P as AllVariants,x as Danger,g as Default,b as SmSize,f as Success,v as WithLabel,xe as __namedExportsOrder,fe as default};
